import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { playerActions, playerPositions, cityPendingHarvest, cityInventory } from "../shared/schema";
import type { PlayerAction, PathStep } from "../shared/schema";
import { savePlayerPosition } from "./playerPositionService";
import type { ActorContext } from "./types/actorContext";

const HOURS_PER_AP = 6;
const MS_PER_HOUR = 3600 * 1000;

// ─── Helpers de comportement admin ────────────────────────────────────────────
function shouldIgnoreActionTimers(context: ActorContext): boolean {
  return context.role === 'admin' && context.adminModeEnabled === true;
}

// Non branché : les PA ne sont pas déduits côté serveur pour les actions de déplacement.
// À utiliser quand une déduction server-authoritative sera implémentée.
export function shouldIgnoreActionPointCosts(context: ActorContext): boolean {
  return context.role === 'admin';
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

  const gmTag = shouldIgnoreActionTimers(context) ? ' [Admin — durée=0]' : '';
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
    .set({ status: "completed", completedAt: now, updatedAt: now })
    .where(eq(playerActions.id, action.id))
    .returning();

  if (action.type === "move") {
    // Mise à jour de la position du joueur à la destination finale.
    await savePlayerPosition(action.playerId, action.endWorldX, action.endWorldY);
    console.log(
      `[PlayerAction] Complétée id=${action.id} player=${action.playerId}` +
      ` → position (${action.endWorldX},${action.endWorldY})`
    );
  } else if (action.type === "collect_harvest") {
    // Transfert pending_harvest → city_inventory pour la ville stockée dans path[0].cityId.
    const pathData = action.path as Array<{ cityId?: number }>;
    const cityId = pathData?.[0]?.cityId;
    if (cityId) {
      await completeHarvestTransfer(cityId);
    }
    console.log(`[PlayerAction] Récolte complétée id=${action.id} player=${action.playerId} cityId=${cityId}`);
  }

  return updated;
}

// ─── completeHarvestTransfer ──────────────────────────────────────────────────
// Vide city_pending_harvest et crédite city_inventory.
async function completeHarvestTransfer(cityId: number): Promise<void> {
  const rows = await db
    .select()
    .from(cityPendingHarvest)
    .where(eq(cityPendingHarvest.cityId, cityId))
    .limit(1);

  if (!rows.length || (rows[0].gold === 0 && rows[0].food === 0)) return;

  const { gold, food } = rows[0];
  const now = new Date();

  // Crédit city_inventory (UPSERT).
  await db
    .insert(cityInventory)
    .values({ cityId, gold, food, updatedAt: now })
    .onConflictDoUpdate({
      target: cityInventory.cityId,
      set: {
        gold:      sql`${cityInventory.gold} + ${gold}`,
        food:      sql`${cityInventory.food} + ${food}`,
        updatedAt: now,
      },
    });

  // Remise à zéro du stock en attente.
  await db
    .update(cityPendingHarvest)
    .set({ gold: 0, food: 0, updatedAt: now })
    .where(eq(cityPendingHarvest.cityId, cityId));

  console.log(`[Harvest] cityId=${cityId} transfert +${gold}g +${food}f → city_inventory`);
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

// ─── createCollectHarvestAction ───────────────────────────────────────────────
// Crée une action de collecte physique pour une ville sans banque.
// Durée : 5 min + ceil((gold+food)/10) minutes. Admins : 0ms.
// Le cityId est stocké dans path[0] pour être récupéré à la complétion.
export async function createCollectHarvestAction(
  playerId:    string,
  cityId:      number,
  cityWorldX:  number,
  cityWorldY:  number,
  pendingGold: number,
  pendingFood: number,
  context:     ActorContext = { role: 'player' },
): Promise<PlayerAction> {
  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  const totalUnits = pendingGold + pendingFood;
  const durationMinutes = shouldIgnoreActionTimers(context)
    ? 0
    : Math.max(5, 5 + Math.ceil(totalUnits / 10));
  const durationMs = durationMinutes * 60 * 1000;

  const now = new Date();
  const expectedEndTime = new Date(now.getTime() + durationMs);

  const [action] = await db
    .insert(playerActions)
    .values({
      playerId,
      type: "collect_harvest",
      status: "in_progress",
      startWorldX: cityWorldX,
      startWorldY: cityWorldY,
      endWorldX:   cityWorldX,
      endWorldY:   cityWorldY,
      path: [{ cityId }] as any,
      totalCost: 0,
      startTime: now,
      expectedEndTime,
      updatedAt: now,
    })
    .returning();

  const gmTag = shouldIgnoreActionTimers(context) ? ' [Admin — durée=0]' : '';
  console.log(
    `[PlayerAction] Récolte créée id=${action.id} player=${playerId}` +
    ` cityId=${cityId} pending=${pendingGold}g+${pendingFood}f` +
    ` durée=${durationMinutes}min${gmTag}`
  );

  return action;
}

// ─── Calcul du temps restant en ms ───────────────────────────────────────────
export function msRemaining(action: PlayerAction): number {
  return Math.max(0, action.expectedEndTime.getTime() - Date.now());
}
