import { gt, ne, and, inArray, eq } from "drizzle-orm";
import { db } from "./db";
import { playerPositions, playerActions } from "../shared/schema";
import type { PathStep } from "../shared/schema";
import { resolveMoveStep } from "./playerActionService";

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
  // Étape 1 : joueurs actifs dans la fenêtre de présence (filtre 10 min — inchangé)
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

  // Étape 2 : aucun joueur actif → retour immédiat
  if (rows.length === 0) return [];

  // Étape 3 : playerIds retenus par le filtre de présence
  const playerIds = rows.map((r) => r.playerId);

  // Étape 4 : actions move actives pour ces joueurs uniquement — query bulk (0 N+1)
  const activeActions = await db
    .select()
    .from(playerActions)
    .where(
      and(
        inArray(playerActions.playerId, playerIds),
        eq(playerActions.status, "in_progress"),
        eq(playerActions.type, "move")
      )
    );

  // Étape 5 : map playerId → action pour lookup O(1)
  const actionMap = new Map(activeActions.map((a) => [a.playerId, a]));

  // Étape 6 : résolution serveur — un seul now pour toute la boucle
  const now = new Date();

  return rows.map((r) => {
    const action = actionMap.get(r.playerId);
    let worldX = r.worldX;
    let worldY  = r.worldY;

    if (action && (action.path as PathStep[]).length >= 2) {
      const resolved = resolveMoveStep(action, now);
      worldX = resolved.effectiveWorldX;
      worldY  = resolved.effectiveWorldY;
    }

    return {
      userId:   r.playerId,
      username: r.playerId, // hypothèse Phase 5 : username === player_id
      worldX,
      worldY,
    };
  });
}
