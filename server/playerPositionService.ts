import { eq, and } from "drizzle-orm";
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
    const spawn = getActiveSpawnPoint();
    console.log(
      `[PlayerPosition] Position invalide (${existing.worldX},${existing.worldY}) — relocalisation vers spawn (${spawn.worldX},${spawn.worldY})`
    );
    return savePlayerPosition(playerId, spawn.worldX, spawn.worldY);
  }

  const spawn = getActiveSpawnPoint();
  console.log(`[PlayerPosition] Aucune position pour player=${playerId} — création au spawn (${spawn.worldX},${spawn.worldY})`);
  return savePlayerPosition(playerId, spawn.worldX, spawn.worldY);
}
