import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { playerPositions, mapTiles } from "../shared/schema";
import type { PlayerPosition } from "../shared/schema";

const SEGMENT_WIDTH  = 50;
const SEGMENT_HEIGHT = 30;

// ─── Spawn fixe prototype ─────────────────────────────────────────────────────
// Coordonnée monde garantie terre marchable (plains) après la migration archipel.
// Toute position absente ou atterrie sur de l'eau est redirigée ici.
const DEFAULT_SPAWN = { worldX: 25, worldY: 15 };

export async function getPlayerPosition(playerId: string): Promise<PlayerPosition | null> {
  const [row] = await db
    .select()
    .from(playerPositions)
    .where(eq(playerPositions.playerId, playerId));
  return row ?? null;
}

// Interroge la carte persistante pour vérifier si une tuile est marchable.
// Retourne false si la tuile est absente (segment non chargé) — cas conservatif.
async function isPositionWalkable(worldX: number, worldY: number): Promise<boolean> {
  const [tile] = await db
    .select({ isWalkable: mapTiles.isWalkable })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));
  return tile?.isWalkable === true;
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
    const walkable = await isPositionWalkable(existing.worldX, existing.worldY);
    if (walkable) {
      console.log(`[PlayerPosition] Position valide: player=${playerId} world=(${existing.worldX},${existing.worldY})`);
      return existing;
    }
    // Position en eau ou tuile non-marchable — relocalisation au spawn fixe
    console.warn(
      `[PlayerPosition] Position invalide pour player=${playerId} ` +
      `world=(${existing.worldX},${existing.worldY}) — relocalisation au spawn (${DEFAULT_SPAWN.worldX},${DEFAULT_SPAWN.worldY})`
    );
    return savePlayerPosition(playerId, DEFAULT_SPAWN.worldX, DEFAULT_SPAWN.worldY);
  }

  // Première connexion — création au spawn fixe
  console.log(
    `[PlayerPosition] Aucune position pour player=${playerId} ` +
    `— création au spawn (${DEFAULT_SPAWN.worldX},${DEFAULT_SPAWN.worldY})`
  );
  return savePlayerPosition(playerId, DEFAULT_SPAWN.worldX, DEFAULT_SPAWN.worldY);
}
