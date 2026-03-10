import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { playerPositions, mapTiles } from "../shared/schema";
import type { PlayerPosition } from "../shared/schema";

const SEGMENT_WIDTH = 50;
const SEGMENT_HEIGHT = 30;

// Spawn par défaut : centre de l'île principale (plains, walkable)
const DEFAULT_WORLD_X = 25;
const DEFAULT_WORLD_Y = 15;
const DEFAULT_SEGMENT_X = 0;
const DEFAULT_SEGMENT_Y = 0;

// Vérifie que la position est sur une tuile marchable non-océanique.
// Si la tuile est introuvable ou non marchable, retourne la position sûre par défaut.
async function sanitizePosition(
  worldX: number,
  worldY: number
): Promise<{ worldX: number; worldY: number }> {
  const [tile] = await db
    .select({ isWalkable: mapTiles.isWalkable, terrainType: mapTiles.terrainType })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));

  if (!tile || !tile.isWalkable || tile.terrainType === "deep_water") {
    console.log(`[PlayerPosition] Position (${worldX},${worldY}) invalide (terrain=${tile?.terrainType ?? "inconnu"}) — redirection vers (${DEFAULT_WORLD_X},${DEFAULT_WORLD_Y})`);
    return { worldX: DEFAULT_WORLD_X, worldY: DEFAULT_WORLD_Y };
  }

  return { worldX, worldY };
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
    // Valide que la tuile persistée est toujours marchable (résiste aux migrations de terrain)
    const safe = await sanitizePosition(existing.worldX, existing.worldY);
    if (safe.worldX !== existing.worldX || safe.worldY !== existing.worldY) {
      // La tuile persistée est devenue de l'eau — on corrige en base et on retourne la position sûre
      console.log(`[PlayerPosition] Correction automatique: player=${playerId} (${existing.worldX},${existing.worldY}) → (${safe.worldX},${safe.worldY})`);
      return savePlayerPosition(playerId, safe.worldX, safe.worldY);
    }
    console.log(`[PlayerPosition] Position existante: player=${playerId} world=(${existing.worldX},${existing.worldY})`);
    return existing;
  }

  console.log(`[PlayerPosition] Aucune position pour player=${playerId} — création position par défaut (${DEFAULT_WORLD_X},${DEFAULT_WORLD_Y})`);
  return savePlayerPosition(playerId, DEFAULT_WORLD_X, DEFAULT_WORLD_Y);
}
