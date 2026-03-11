import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { playerActions, playerPositions } from "../shared/schema";
import type { PlayerAction, PathStep } from "../shared/schema";
import { savePlayerPosition } from "./playerPositionService";
import type { ActorContext } from "./types/actorContext";

const HOURS_PER_AP = 6;
const MS_PER_HOUR = 3600 * 1000;

// ─── Helpers de comportement MJ ───────────────────────────────────────────────
function shouldIgnoreActionTimers(context: ActorContext): boolean {
  return context.role === 'gm';
}

// ─── Lecture de l'action active (in_progress) ────────────────────────────────
export async function getActiveAction(playerId: string): Promise<PlayerAction | null> {
  const [row] = await db
    .select()
    .from(playerActions)
    .where(
      and(
        eq(playerActions.playerId, playerId),
        eq(playerActions.status, "in_progress")
      )
    )
    .limit(1);

  if (!row) return null;

  // Complétion lazy : si le délai est écoulé, on finalise maintenant
  if (row.expectedEndTime <= new Date()) {
    return completeAction(row);
  }

  return row;
}

// ─── Création d'une action move ───────────────────────────────────────────────
export async function createMoveAction(
  playerId: string,
  startWorldX: number,
  startWorldY: number,
  endWorldX: number,
  endWorldY: number,
  path: PathStep[],
  totalCost: number,
  context: ActorContext = { role: 'player' }
): Promise<PlayerAction> {
  // Refus si une action est déjà en cours
  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  const now = new Date();
  const durationMs = shouldIgnoreActionTimers(context)
    ? 0
    : totalCost * HOURS_PER_AP * MS_PER_HOUR;
  const expectedEndTime = new Date(now.getTime() + durationMs);

  const [action] = await db
    .insert(playerActions)
    .values({
      playerId,
      type: "move",
      status: "in_progress",
      startWorldX,
      startWorldY,
      endWorldX,
      endWorldY,
      path,
      totalCost,
      startTime: now,
      expectedEndTime,
      updatedAt: now,
    })
    .returning();

  const gmTag = shouldIgnoreActionTimers(context) ? ' [MODE MJ — durée=0]' : '';
  console.log(
    `[PlayerAction] Créée id=${action.id} player=${playerId}` +
    ` (${startWorldX},${startWorldY}) → (${endWorldX},${endWorldY})` +
    ` coût=${totalCost} AP durée=${durationMs / MS_PER_HOUR}h` +
    ` fin=${expectedEndTime.toISOString()}${gmTag}`
  );

  return action;
}

// ─── Complétion d'une action (délai écoulé) ───────────────────────────────────
async function completeAction(action: PlayerAction): Promise<PlayerAction> {
  const now = new Date();

  const [updated] = await db
    .update(playerActions)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(playerActions.id, action.id))
    .returning();

  // Mise à jour de la position du joueur à la destination finale
  await savePlayerPosition(action.playerId, action.endWorldX, action.endWorldY);

  console.log(
    `[PlayerAction] Complétée id=${action.id} player=${action.playerId}` +
    ` → position monde (${action.endWorldX},${action.endWorldY})`
  );

  return updated;
}

// ─── Annulation d'une action active ──────────────────────────────────────────
export async function cancelActiveAction(playerId: string): Promise<PlayerAction | null> {
  const active = await db
    .select()
    .from(playerActions)
    .where(
      and(
        eq(playerActions.playerId, playerId),
        eq(playerActions.status, "in_progress")
      )
    )
    .limit(1);

  if (!active[0]) return null;

  const now = new Date();
  const [cancelled] = await db
    .update(playerActions)
    .set({ status: "cancelled", updatedAt: now })
    .where(eq(playerActions.id, active[0].id))
    .returning();

  console.log(`[PlayerAction] Annulée id=${cancelled.id} player=${playerId}`);
  return cancelled;
}

// ─── Calcul du temps restant en ms ───────────────────────────────────────────
export function msRemaining(action: PlayerAction): number {
  return Math.max(0, action.expectedEndTime.getTime() - Date.now());
}
