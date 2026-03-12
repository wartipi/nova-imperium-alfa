import { gt, ne, and } from "drizzle-orm";
import { db } from "./db";
import { playerPositions } from "../shared/schema";

// Fenêtre d'activité — constante unique, sans chiffre magique dispersé
const ACTIVE_PLAYER_WINDOW_MINUTES = 10;

// Hypothèse Phase 5 explicite :
// username === player_id dans ce système d'auth (Bearer base64, AUTHORIZED_USERS).
// Pas de jointure nécessaire — player_id est renvoyé directement comme userId ET username.
// Si cette hypothèse change en Phase 6+, seul ce fichier doit être modifié.

export interface ActivePlayerPosition {
  userId: string;
  username: string;
  worldX: number;
  worldY: number;
}

export async function getActivePlayerPositions(
  excludePlayerId: string
): Promise<ActivePlayerPosition[]> {
  const cutoff = new Date(Date.now() - ACTIVE_PLAYER_WINDOW_MINUTES * 60 * 1000);

  const rows = await db
    .select({
      playerId: playerPositions.playerId,
      worldX: playerPositions.worldX,
      worldY: playerPositions.worldY,
    })
    .from(playerPositions)
    .where(
      and(
        ne(playerPositions.playerId, excludePlayerId),
        gt(playerPositions.updatedAt, cutoff)
      )
    );

  return rows.map((r) => ({
    userId: r.playerId,
    username: r.playerId, // hypothèse Phase 5 : username === player_id
    worldX: r.worldX,
    worldY: r.worldY,
  }));
}
