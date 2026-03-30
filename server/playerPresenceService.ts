import { gt, ne, and, eq } from "drizzle-orm";
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
  // Étape 0 : timestamp unique pour toute la résolution
  const now = new Date();
  const cutoff = new Date(now.getTime() - ACTIVE_PLAYER_WINDOW_MINUTES * 60 * 1000);

  // Étape 1 : joueurs actifs dans la fenêtre de présence standard (filtre 10 min — conservé)
  const presenceRows = await db
    .select({
      playerId: playerPositions.playerId,
      worldX:   playerPositions.worldX,
      worldY:   playerPositions.worldY,
    })
    .from(playerPositions)
    .where(
      and(
        ne(playerPositions.playerId, excludePlayerId),
        gt(playerPositions.updatedAt, cutoff)
      )
    );

  // Étape 3 : joueurs en transit actif côté serveur (indépendant du updatedAt)
  // Critère server-authoritative : status='in_progress' + type='move' + expectedEndTime > now
  const transitActions = await db
    .select()
    .from(playerActions)
    .where(
      and(
        ne(playerActions.playerId, excludePlayerId),
        eq(playerActions.status, "in_progress"),
        eq(playerActions.type, "move"),
        gt(playerActions.expectedEndTime, now)
      )
    );

  // Étape 4 : retour immédiat uniquement si les DEUX sets sont vides
  if (presenceRows.length === 0 && transitActions.length === 0) return [];

  // Étape 5 : structures de lookup O(1)
  const presenceIds      = new Set(presenceRows.map((r) => r.playerId));
  const transitActionMap = new Map(transitActions.map((a) => [a.playerId, a]));

  const result: ActivePlayerPosition[] = [];

  // Étape 6 — Passage A : joueurs de presenceRows
  // Si action move active → position calculée par resolveMoveStep()
  // Sinon → position issue de player_positions
  for (const row of presenceRows) {
    const action = transitActionMap.get(row.playerId);
    let worldX = row.worldX;
    let worldY  = row.worldY;

    if (action && (action.path as PathStep[]).length >= 2) {
      const resolved = resolveMoveStep(action, now);
      worldX = resolved.effectiveWorldX;
      worldY  = resolved.effectiveWorldY;
    }

    result.push({
      userId:   row.playerId,
      username: row.playerId, // hypothèse Phase 5 : username === player_id
      worldX,
      worldY,
    });
  }

  // Étape 6 — Passage B : joueurs transit-only
  // Présents dans player_actions mais absents de player_positions (updatedAt > 10 min)
  // Position calculée par resolveMoveStep() uniquement — pas de query player_positions
  for (const [playerId, action] of transitActionMap) {
    if (presenceIds.has(playerId)) continue; // déjà traité au Passage A

    const path = action.path as PathStep[];
    if (path.length < 2) continue;

    const resolved = resolveMoveStep(action, now);
    result.push({
      userId:   playerId,
      username: playerId, // hypothèse Phase 5 : username === player_id
      worldX:   resolved.effectiveWorldX,
      worldY:   resolved.effectiveWorldY,
    });
  }

  return result;
}
