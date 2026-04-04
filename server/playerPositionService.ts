import { eq, and, sql as drizzleSql } from "drizzle-orm";
import { db } from "./db";
import { playerPositions, mapTiles } from "../shared/schema";
import type { PlayerPosition } from "../shared/schema";
import { CANONICAL_SPAWN } from "../shared/runtimeDefaults";

const SEGMENT_WIDTH = 50;
const SEGMENT_HEIGHT = 30;

// ─── Taille minimale de masse terrestre pour un spawn viable ──────────────────
const MIN_SPAWN_LANDMASS_SIZE = 25;

// Rayon de recherche SQL initial (cases candidates autour du spawn canonique)
const SPAWN_SEARCH_RADIUS = 100;
// Nombre maximum de candidates à évaluer (par lot) avant d'élargir
const SPAWN_CANDIDATE_LIMIT = 150;

export function getActiveSpawnPoint(): { worldX: number; worldY: number } {
  return CANONICAL_SPAWN;
}

// ─── Voisinage hex canonique (colonnes paires/impaires) ───────────────────────
// Miroir exact de HexMath.getAdjacentHexes (client/src/lib/systems/HexMath.ts).
// Colonnes impaires décalées vers le bas (odd-column-down offset coords).
function hexNeighbors(x: number, y: number): Array<{ x: number; y: number }> {
  const odd = x % 2 !== 0;
  if (odd) {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];
  } else {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
    ];
  }
}

// ─── BFS flood-fill : taille de la masse terrestre connectée ─────────────────
// Démarre sur (startWorldX, startWorldY), considérée déjà valide.
// Utilise le voisinage hex canonique.
// S'arrête dès que le compte atteint MIN_SPAWN_LANDMASS_SIZE (early exit).
// Chaque round BFS = une seule requête SQL sur tous les voisins candidats.
async function computeConnectedLandmassSize(
  startWorldX: number,
  startWorldY: number
): Promise<number> {
  const visited = new Set<string>([`${startWorldX},${startWorldY}`]);
  let frontier: Array<{ x: number; y: number }> = [
    { x: startWorldX, y: startWorldY },
  ];
  let count = 1; // la tuile de départ est déjà comptée

  while (frontier.length > 0 && count < MIN_SPAWN_LANDMASS_SIZE) {
    // Collecter tous les voisins non encore visités de la frontière courante
    const candidates: Array<{ x: number; y: number }> = [];
    for (const tile of frontier) {
      for (const nb of hexNeighbors(tile.x, tile.y)) {
        const key = `${nb.x},${nb.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          candidates.push(nb);
        }
      }
    }

    if (candidates.length === 0) break;

    // Une seule requête SQL pour tous les voisins candidats
    const rows = await db
      .select({ worldX: mapTiles.worldX, worldY: mapTiles.worldY })
      .from(mapTiles)
      .where(
        drizzleSql`
          (${mapTiles.worldX}, ${mapTiles.worldY}) IN (
            ${drizzleSql.join(
              candidates.map((c) => drizzleSql`(${c.x}, ${c.y})`),
              drizzleSql`, `
            )}
          )
          AND ${mapTiles.isWalkable} = true
          AND ${mapTiles.terrainType} NOT IN ('deep_water', 'shallow_water')
        `
      );

    frontier = rows.map((r) => ({ x: r.worldX, y: r.worldY }));
    count += frontier.length;
  }

  return count;
}

// ─── Règle de validité de position ────────────────────────────────────────────
export async function isValidPlayerPosition(
  worldX: number,
  worldY: number
): Promise<boolean> {
  const [tile] = await db
    .select({ isWalkable: mapTiles.isWalkable, terrainType: mapTiles.terrainType })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));

  if (!tile)                                return false;
  if (!tile.isWalkable)                     return false;
  if (tile.terrainType === "deep_water")    return false;
  if (tile.terrainType === "shallow_water") return false;
  return true;
}

// ─── Safe spawn v2 : masse terrestre minimale ─────────────────────────────────
// 1. Récupère SPAWN_CANDIDATE_LIMIT cases terrestres ordonnées par distance Manhattan
//    dans un rayon SPAWN_SEARCH_RADIUS autour de (startWorldX, startWorldY).
// 2. Teste chaque candidat du plus proche au plus loin via computeConnectedLandmassSize.
// 3. Retourne le premier candidat dont la masse terrestre ≥ MIN_SPAWN_LANDMASS_SIZE.
// 4. Si aucun candidat ne satisfait le seuil, retourne le meilleur trouvé (fallback
//    explicitement loggé) plutôt que de revenir silencieusement sur une micro-île.
export async function findNearestValidGroundSpawn(
  startWorldX: number,
  startWorldY: number
): Promise<{ worldX: number; worldY: number }> {
  // ── Récupérer les candidats terrestres ordonnés par proximité ──────────────
  const candidates = await db
    .select({ worldX: mapTiles.worldX, worldY: mapTiles.worldY })
    .from(mapTiles)
    .where(
      drizzleSql`
        ${mapTiles.worldX} BETWEEN ${startWorldX - SPAWN_SEARCH_RADIUS} AND ${startWorldX + SPAWN_SEARCH_RADIUS}
        AND ${mapTiles.worldY} BETWEEN ${startWorldY - SPAWN_SEARCH_RADIUS} AND ${startWorldY + SPAWN_SEARCH_RADIUS}
        AND ${mapTiles.isWalkable} = true
        AND ${mapTiles.terrainType} NOT IN ('deep_water', 'shallow_water')
      `
    )
    .orderBy(
      drizzleSql`ABS(${mapTiles.worldX} - ${startWorldX}) + ABS(${mapTiles.worldY} - ${startWorldY})`
    )
    .limit(SPAWN_CANDIDATE_LIMIT);

  if (candidates.length === 0) {
    console.warn(
      `[PlayerPosition] Aucune case terrestre à ±${SPAWN_SEARCH_RADIUS} de (${startWorldX},${startWorldY}) — fallback sur départ`
    );
    return { worldX: startWorldX, worldY: startWorldY };
  }

  // ── Tester les candidats du plus proche au plus loin ──────────────────────
  let bestCandidate: { worldX: number; worldY: number } | null = null;
  let bestSize = 0;

  for (const candidate of candidates) {
    const size = await computeConnectedLandmassSize(candidate.worldX, candidate.worldY);

    if (size >= MIN_SPAWN_LANDMASS_SIZE) {
      console.log(
        `[PlayerPosition] Safe spawn v2 résolu: (${candidate.worldX},${candidate.worldY})` +
        ` — masse terrestre ≥ ${MIN_SPAWN_LANDMASS_SIZE} (comptée: ${size})` +
        ` — depuis départ (${startWorldX},${startWorldY})`
      );
      return { worldX: candidate.worldX, worldY: candidate.worldY };
    }

    // Garder trace du meilleur candidat pour le fallback
    if (size > bestSize) {
      bestSize = size;
      bestCandidate = { worldX: candidate.worldX, worldY: candidate.worldY };
    }
  }

  // ── Fallback : aucune masse ≥ seuil trouvée dans les candidats ────────────
  if (bestCandidate) {
    console.warn(
      `[PlayerPosition] FALLBACK spawn: aucune masse ≥ ${MIN_SPAWN_LANDMASS_SIZE} trouvée` +
      ` dans ${candidates.length} candidats à ±${SPAWN_SEARCH_RADIUS} de (${startWorldX},${startWorldY}).` +
      ` Meilleure masse: ${bestSize} cases → (${bestCandidate.worldX},${bestCandidate.worldY})`
    );
    return bestCandidate;
  }

  // Fallback de dernier recours (ne devrait jamais arriver si candidates.length > 0)
  console.warn(`[PlayerPosition] Fallback ultime sur départ (${startWorldX},${startWorldY})`);
  return { worldX: startWorldX, worldY: startWorldY };
}

export async function getPlayerPosition(playerId: string): Promise<PlayerPosition | null> {
  const [row] = await db
    .select()
    .from(playerPositions)
    .where(eq(playerPositions.playerId, playerId));
  return row ?? null;
}

export async function savePlayerPosition(
  playerId: string,
  worldX: number,
  worldY: number
): Promise<PlayerPosition> {
  const segmentX = Math.floor(worldX / SEGMENT_WIDTH);
  const segmentY = Math.floor(worldY / SEGMENT_HEIGHT);

  const [row] = await db
    .insert(playerPositions)
    .values({
      playerId,
      worldX,
      worldY,
      segmentX,
      segmentY,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: playerPositions.playerId,
      set: {
        worldX,
        worldY,
        segmentX,
        segmentY,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(`[PlayerPosition] Sauvegardé: player=${playerId} world=(${worldX},${worldY}) segment=(${segmentX},${segmentY})`);
  return row;
}

export async function ensurePlayerPosition(playerId: string): Promise<PlayerPosition> {
  const existing = await getPlayerPosition(playerId);

  if (existing) {
    const valid = await isValidPlayerPosition(existing.worldX, existing.worldY);
    if (valid) {
      console.log(`[PlayerPosition] Position existante valide: player=${playerId} world=(${existing.worldX},${existing.worldY}) — touch présence`);
      return savePlayerPosition(playerId, existing.worldX, existing.worldY);
    }
    const { worldX, worldY } = getActiveSpawnPoint();
    const safeSpawn = await findNearestValidGroundSpawn(worldX, worldY);
    console.log(
      `[PlayerPosition] Position invalide (${existing.worldX},${existing.worldY}) — relocalisation vers safe spawn (${safeSpawn.worldX},${safeSpawn.worldY})`
    );
    return savePlayerPosition(playerId, safeSpawn.worldX, safeSpawn.worldY);
  }

  const { worldX, worldY } = getActiveSpawnPoint();
  const safeSpawn = await findNearestValidGroundSpawn(worldX, worldY);
  console.log(`[PlayerPosition] Aucune position pour player=${playerId} — création au safe spawn (${safeSpawn.worldX},${safeSpawn.worldY})`);
  return savePlayerPosition(playerId, safeSpawn.worldX, safeSpawn.worldY);
}
