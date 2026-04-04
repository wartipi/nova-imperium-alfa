import { eq, and, sql as drizzleSql } from "drizzle-orm";
import { db } from "./db";
import { playerPositions, mapTiles } from "../shared/schema";
import type { PlayerPosition } from "../shared/schema";
import { CANONICAL_SPAWN } from "../shared/runtimeDefaults";

const SEGMENT_WIDTH = 50;
const SEGMENT_HEIGHT = 30;

export function getActiveSpawnPoint(): { worldX: number; worldY: number } {
  return CANONICAL_SPAWN;
}

// ─── Règle de validité de position (prototype) ────────────────────────────────
// Une position est valide ssi :
//   - la tuile existe dans map_tiles
//   - is_walkable = true
//   - terrain_type ≠ deep_water ET terrain_type ≠ shallow_water
export async function isValidPlayerPosition(
  worldX: number,
  worldY: number
): Promise<boolean> {
  const [tile] = await db
    .select({ isWalkable: mapTiles.isWalkable, terrainType: mapTiles.terrainType })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));

  if (!tile)                              return false;
  if (!tile.isWalkable)                   return false;
  if (tile.terrainType === "deep_water")  return false;
  if (tile.terrainType === "shallow_water") return false;
  return true;
}

// ─── Safe spawn : case terrestre valide la plus proche ────────────────────────
// Cherche dans un carré de ±SEARCH_RADIUS cases autour de (startWorldX, startWorldY)
// la tuile terrestre walkable la plus proche (distance Manhattan).
// Requête unique — déterministe pour une même carte.
// Retourne le point de départ si aucune tuile valide trouvée dans le rayon.
const SPAWN_SEARCH_RADIUS = 100;

export async function findNearestValidGroundSpawn(
  startWorldX: number,
  startWorldY: number
): Promise<{ worldX: number; worldY: number }> {
  const [tile] = await db
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
    .limit(1);

  if (tile) {
    console.log(
      `[PlayerPosition] Safe spawn résolu: (${tile.worldX},${tile.worldY})` +
      ` — depuis départ (${startWorldX},${startWorldY})`
    );
    return { worldX: tile.worldX, worldY: tile.worldY };
  }

  // Fallback de dernier recours (ne devrait jamais arriver sur une carte correcte)
  console.warn(
    `[PlayerPosition] Aucune case terrestre trouvée à ±${SPAWN_SEARCH_RADIUS} de (${startWorldX},${startWorldY}) — fallback sur le départ`
  );
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
      // Rafraîchir updatedAt pour que le joueur soit immédiatement visible dans le filtre de présence (10 min)
      // sans attendre son premier déplacement.
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
