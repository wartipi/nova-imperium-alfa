import { eq } from "drizzle-orm";
import { db } from "./db";
import { playerPositions } from "../shared/schema";
import type { PlayerPosition } from "../shared/schema";

const SEGMENT_WIDTH = 50;
const SEGMENT_HEIGHT = 30;

const DEFAULT_WORLD_X = 3;
const DEFAULT_WORLD_Y = 3;
const DEFAULT_SEGMENT_X = 0;
const DEFAULT_SEGMENT_Y = 0;

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
    console.log(`[PlayerPosition] Position existante: player=${playerId} world=(${existing.worldX},${existing.worldY})`);
    return existing;
  }

  console.log(`[PlayerPosition] Aucune position pour player=${playerId} — création position par défaut (${DEFAULT_WORLD_X},${DEFAULT_WORLD_Y})`);
  return savePlayerPosition(playerId, DEFAULT_WORLD_X, DEFAULT_WORLD_Y);
}
