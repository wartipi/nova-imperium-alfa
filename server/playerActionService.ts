import { eq, and, sql, or, lt, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  playerActions,
  playerPositions,
  cityPendingHarvest,
  cityInventory,
  playerBank,
  playerTransport,
} from "../shared/schema";
import type { PlayerAction, PathStep } from "../shared/schema";
import { savePlayerPosition, getPlayerPosition } from "./playerPositionService";
import { getPlayerState, savePlayerState } from "./playerStateService";
import type { ActorContext } from "./types/actorContext";

const HOURS_PER_AP = 5 / 3600; // 5 secondes par PA (phase test)
const MS_PER_HOUR = 3600 * 1000;

// Capacité max de transport de ressources (or + nourriture cumulés)
export const TRANSPORT_MAX_UNITS = 50;

// ─── Types enrichis retournés par le service ──────────────────────────────────

export interface ResolvedAction extends PlayerAction {
  effectiveStep: number;
  effectiveWorldX: number;
  effectiveWorldY: number;
  effectiveTerrain: string;
}

export interface CancelledAction extends PlayerAction {
  cancelledAtWorldX: number | null;
  cancelledAtWorldY: number | null;
  cancelledAtStep: number | null;
}

// ─── Résolveur pur — aucun effet de bord, aucune DB ──────────────────────────
// Calcule le step effectivement atteint à l'instant `now` depuis les données
// immuables de l'action (path, startTime, expectedEndTime).

export function resolveMoveStep(
  action: PlayerAction,
  now: Date
): {
  effectiveStep: number;
  effectiveWorldX: number;
  effectiveWorldY: number;
  effectiveTerrain: string;
  isCompleted: boolean;
} {
  const path = action.path as PathStep[];

  if (!path || path.length < 2) {
    return {
      effectiveStep: 0,
      effectiveWorldX: action.startWorldX,
      effectiveWorldY: action.startWorldY,
      effectiveTerrain: path?.[0]?.terrain ?? "plains",
      isCompleted: false,
    };
  }

  const totalMs   = action.expectedEndTime.getTime() - action.startTime.getTime();
  const elapsedMs = now.getTime() - action.startTime.getTime();

  if (elapsedMs >= totalMs) {
    const last = path[path.length - 1];
    return {
      effectiveStep:   path.length - 1,
      effectiveWorldX: last.worldX,
      effectiveWorldY: last.worldY,
      effectiveTerrain: last.terrain,
      isCompleted: true,
    };
  }

  // Parcourir path[1..] en cumulant la durée de chaque step
  // Durée d'un step i = path[i].cost × HOURS_PER_AP × MS_PER_HOUR
  let effectiveStep = 0;
  let cumulative    = 0;
  for (let i = 1; i < path.length; i++) {
    const stepMs = path[i].cost * HOURS_PER_AP * MS_PER_HOUR;
    if (elapsedMs < cumulative + stepMs) break;
    cumulative   += stepMs;
    effectiveStep = i;
  }

  const step = path[effectiveStep];
  return {
    effectiveStep,
    effectiveWorldX:  step.worldX,
    effectiveWorldY:  step.worldY,
    effectiveTerrain: step.terrain,
    isCompleted: false,
  };
}

// ─── Point d'entrée central — position effective d'un joueur à un instant t ──
// Toute règle métier serveur qui a besoin de savoir où est un joueur passe ici.
// Ne dépend pas de player_positions pendant un transit actif.

export async function resolveEffectivePlayerPosition(
  playerId: string,
  now: Date
): Promise<{
  worldX: number;
  worldY: number;
  isInTransit: boolean;
  effectiveStep: number | null;
  actionId: number | null;
}> {
  const [action] = await db
    .select()
    .from(playerActions)
    .where(
      and(
        eq(playerActions.playerId, playerId),
        eq(playerActions.status, "in_progress")
      )
    )
    .limit(1);

  // Pas d'action active, ou action non-move → lire player_positions
  if (!action || action.type !== "move" || (action.path as PathStep[]).length < 2) {
    const pos = await getPlayerPosition(playerId);
    return {
      worldX:        pos?.worldX ?? 0,
      worldY:        pos?.worldY ?? 0,
      isInTransit:   false,
      effectiveStep: null,
      actionId:      action?.id ?? null,
    };
  }

  const resolved = resolveMoveStep(action, now);

  if (resolved.isCompleted) {
    return {
      worldX:        action.endWorldX,
      worldY:        action.endWorldY,
      isInTransit:   false,
      effectiveStep: resolved.effectiveStep,
      actionId:      action.id,
    };
  }

  return {
    worldX:        resolved.effectiveWorldX,
    worldY:        resolved.effectiveWorldY,
    isInTransit:   resolved.effectiveStep > 0,
    effectiveStep: resolved.effectiveStep,
    actionId:      action.id,
  };
}

// ─── Helpers de comportement admin ────────────────────────────────────────────
function shouldIgnoreActionTimers(context: ActorContext): boolean {
  return context.role === 'admin' && context.adminModeEnabled === true;
}

export function shouldIgnoreActionPointCosts(context: ActorContext): boolean {
  return context.role === 'admin';
}

// ─── Helper interne : applique progress + débit PA par step ───────────────────
// Appliquer les steps de (lastAppliedStep+1) jusqu'à targetStep inclus.
// Débite les PA du delta de coût de ces steps, sauf si skipCostDeduction=true.
// Sauvegarde la position, met à jour lastAppliedStep. No-op si targetStep <= lastAppliedStep.
async function applyMoveProgressAndCosts(
  action: PlayerAction,
  targetStep: number,
  now: Date,
  options: { skipCostDeduction?: boolean } = {}
): Promise<{ stepsApplied: number; costDebited: number; worldX: number; worldY: number }> {
  const path = action.path as PathStep[];
  const prevStep = action.lastAppliedStep ?? -1;
  const clampedTarget = Math.min(targetStep, path.length - 1);

  if (clampedTarget <= prevStep) {
    const cur = path[Math.max(0, prevStep)] ?? path[0];
    return { stepsApplied: 0, costDebited: 0, worldX: cur.worldX, worldY: cur.worldY };
  }

  // Sommer le coût des steps nouvellement franchis : path[prevStep+1 .. clampedTarget]
  let costDelta = 0;
  const firstNew = Math.max(1, prevStep + 1);
  for (let i = firstNew; i <= clampedTarget; i++) {
    costDelta += path[i].cost;
  }

  const targetTile = path[clampedTarget];

  // Persister la position
  await savePlayerPosition(action.playerId, targetTile.worldX, targetTile.worldY);

  // Débiter les PA (sauf admin/instant)
  if (!options.skipCostDeduction && costDelta > 0) {
    const state = await getPlayerState(action.playerId);
    if (state) {
      const newAP = Math.max(0, state.actionPoints - costDelta);
      await savePlayerState(action.playerId, {
        level:            state.level,
        experience:       state.experience,
        totalExperience:  state.totalExperience,
        actionPoints:     newAP,
        maxActionPoints:  state.maxActionPoints,
        competencePoints: state.competencePoints ?? 0,
        competences:      (state.competences as { competence: string; level: number }[]) ?? [],
      });
      console.log(
        `[PlayerAction] PA step debit: player=${action.playerId}` +
        ` steps ${prevStep + 1}→${clampedTarget} -${costDelta} AP → reste ${newAP}/${state.maxActionPoints}`
      );
    }
  }

  // Mettre à jour lastAppliedStep (optimistic lock : seulement si on avance)
  await db
    .update(playerActions)
    .set({ lastAppliedStep: clampedTarget, updatedAt: now })
    .where(
      and(
        eq(playerActions.id, action.id),
        or(
          isNull(playerActions.lastAppliedStep),
          lt(playerActions.lastAppliedStep, clampedTarget)
        )
      )
    );
  action.lastAppliedStep = clampedTarget;

  return {
    stepsApplied: clampedTarget - prevStep,
    costDebited: costDelta,
    worldX: targetTile.worldX,
    worldY: targetTile.worldY,
  };
}

// ─── Lecture de l'action active (in_progress) ────────────────────────────────
export async function getActiveAction(playerId: string): Promise<ResolvedAction | null> {
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
    const completed = await completeAction(row);
    const path = row.path as PathStep[];
    const last  = path[path.length - 1];
    return {
      ...completed,
      effectiveStep:    path.length - 1,
      effectiveWorldX:  last?.worldX  ?? row.endWorldX,
      effectiveWorldY:  last?.worldY  ?? row.endWorldY,
      effectiveTerrain: last?.terrain ?? "plains",
    };
  }

  // Pour les actions move : résoudre le step effectif et persister si nécessaire
  const now = new Date();
  if (row.type === "move" && (row.path as PathStep[]).length >= 2) {
    const resolved = resolveMoveStep(row, now);

    if (resolved.effectiveStep > (row.lastAppliedStep ?? -1)) {
      const totalDur  = row.expectedEndTime.getTime() - row.startTime.getTime();
      const isInstant = totalDur === 0;
      await applyMoveProgressAndCosts(row, resolved.effectiveStep, now, { skipCostDeduction: isInstant });
    }

    return {
      ...row,
      effectiveStep:    resolved.effectiveStep,
      effectiveWorldX:  resolved.effectiveWorldX,
      effectiveWorldY:  resolved.effectiveWorldY,
      effectiveTerrain: resolved.effectiveTerrain,
    };
  }

  // Autres types d'actions : champs effectifs neutres (coords de départ)
  return {
    ...row,
    effectiveStep:    0,
    effectiveWorldX:  row.startWorldX,
    effectiveWorldY:  row.startWorldY,
    effectiveTerrain: "",
  };
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

  // ─── Vérification PA (ignorée pour admin) ────────────────────────────────────
  const stateSnapshot = !shouldIgnoreActionPointCosts(context)
    ? await getPlayerState(playerId)
    : null;

  if (!shouldIgnoreActionPointCosts(context)) {
    const available = stateSnapshot?.actionPoints ?? 0;
    if (available < totalCost) {
      throw new Error(
        `INSUFFICIENT_ACTION_POINTS: requis=${totalCost} disponibles=${available}`
      );
    }
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

  // PA : aucune déduction upfront. Les PA seront débités step par step
  // via applyMoveProgressAndCosts() depuis getActiveAction / cancelActiveAction / completeAction.

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
    const path      = action.path as PathStep[];
    const finalStep = path.length - 1;
    const totalDur  = action.expectedEndTime.getTime() - action.startTime.getTime();
    const isInstant = totalDur === 0;
    const applied   = await applyMoveProgressAndCosts(action, finalStep, now, { skipCostDeduction: isInstant });
    console.log(
      `[PlayerAction] Complétée id=${action.id} player=${action.playerId}` +
      ` → position (${applied.worldX},${applied.worldY}) costDebited=${applied.costDebited} AP`
    );
  } else if (action.type === "collect_harvest") {
    const pathData = action.path as Array<{ cityId?: number }>;
    const cityId = pathData?.[0]?.cityId;
    if (cityId) {
      await completeHarvestTransfer(cityId);
    }
    console.log(`[PlayerAction] Récolte complétée id=${action.id} player=${action.playerId} cityId=${cityId}`);
  } else if (action.type === "transfer_bank_to_city") {
    const pathData = action.path as Array<{
      cityId?: number; gold?: number; food?: number; wood?: number; stone?: number; iron?: number;
      copper?: number; coal?: number; oil?: number; herbs?: number; fur?: number;
    }>;
    const meta = pathData?.[0] ?? {};
    if (meta.cityId) {
      await completeBankToCityTransfer(
        meta.cityId, meta.gold ?? 0, meta.food ?? 0, meta.wood ?? 0, meta.stone ?? 0, meta.iron ?? 0,
        meta.copper ?? 0, meta.coal ?? 0, meta.oil ?? 0, meta.herbs ?? 0, meta.fur ?? 0,
      );
    }
    console.log(`[PlayerAction] Transfert banque→ville complété id=${action.id} player=${action.playerId}`);
  } else if (action.type === "transfer_bank_to_player") {
    const pathData = action.path as Array<{
      gold?: number; food?: number; wood?: number; stone?: number; iron?: number;
      copper?: number; coal?: number; oil?: number; herbs?: number; fur?: number;
    }>;
    const meta = pathData?.[0] ?? {};
    await completeBankToPlayerTransfer(
      action.playerId, meta.gold ?? 0, meta.food ?? 0, meta.wood ?? 0, meta.stone ?? 0, meta.iron ?? 0,
      meta.copper ?? 0, meta.coal ?? 0, meta.oil ?? 0, meta.herbs ?? 0, meta.fur ?? 0,
    );
    console.log(`[PlayerAction] Transfert banque→joueur complété id=${action.id} player=${action.playerId}`);
  }

  return updated;
}

// ─── completeHarvestTransfer ──────────────────────────────────────────────────
async function completeHarvestTransfer(cityId: number): Promise<void> {
  const rows = await db
    .select()
    .from(cityPendingHarvest)
    .where(eq(cityPendingHarvest.cityId, cityId))
    .limit(1);

  if (!rows.length) return;
  const { gold, food, wood, stone, iron, copper, coal, oil, herbs, fur } = rows[0];
  if (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0
      && copper === 0 && coal === 0 && oil === 0 && herbs === 0 && fur === 0) return;

  const now = new Date();

  await db
    .insert(cityInventory)
    .values({ cityId, gold, food, wood, stone, iron, copper, coal, oil, herbs, fur, updatedAt: now })
    .onConflictDoUpdate({
      target: cityInventory.cityId,
      set: {
        gold:      sql`${cityInventory.gold}   + ${gold}`,
        food:      sql`${cityInventory.food}   + ${food}`,
        wood:      sql`${cityInventory.wood}   + ${wood}`,
        stone:     sql`${cityInventory.stone}  + ${stone}`,
        iron:      sql`${cityInventory.iron}   + ${iron}`,
        copper:    sql`${cityInventory.copper} + ${copper}`,
        coal:      sql`${cityInventory.coal}   + ${coal}`,
        oil:       sql`${cityInventory.oil}    + ${oil}`,
        herbs:     sql`${cityInventory.herbs}  + ${herbs}`,
        fur:       sql`${cityInventory.fur}    + ${fur}`,
        updatedAt: now,
      },
    });

  await db
    .update(cityPendingHarvest)
    .set({ gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
           copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0, updatedAt: now })
    .where(eq(cityPendingHarvest.cityId, cityId));

  console.log(
    `[Harvest] cityId=${cityId} transfert +${gold}g+${food}f+${wood}w+${stone}s+${iron}i` +
    `+${copper}cu+${coal}co+${oil}oil+${herbs}herbs+${fur}fur → city_inventory`
  );
}

// ─── completeBankToCityTransfer ───────────────────────────────────────────────
// Crédite city_inventory du montant stocké dans le path de l'action.
// Matériaux V1 : gold, food, wood, stone, iron.
async function completeBankToCityTransfer(
  cityId: number, gold: number, food: number,
  wood = 0, stone = 0, iron = 0,
  copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
): Promise<void> {
  if (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0
      && copper === 0 && coal === 0 && oil === 0 && herbs === 0 && fur === 0) return;
  const now = new Date();

  await db
    .insert(cityInventory)
    .values({ cityId, gold, food, wood, stone, iron, copper, coal, oil, herbs, fur, updatedAt: now })
    .onConflictDoUpdate({
      target: cityInventory.cityId,
      set: {
        gold:      sql`${cityInventory.gold}   + ${gold}`,
        food:      sql`${cityInventory.food}   + ${food}`,
        wood:      sql`${cityInventory.wood}   + ${wood}`,
        stone:     sql`${cityInventory.stone}  + ${stone}`,
        iron:      sql`${cityInventory.iron}   + ${iron}`,
        copper:    sql`${cityInventory.copper} + ${copper}`,
        coal:      sql`${cityInventory.coal}   + ${coal}`,
        oil:       sql`${cityInventory.oil}    + ${oil}`,
        herbs:     sql`${cityInventory.herbs}  + ${herbs}`,
        fur:       sql`${cityInventory.fur}    + ${fur}`,
        updatedAt: now,
      },
    });

  console.log(
    `[Transfer] banque→ville cityId=${cityId} +${gold}g+${food}f+${wood}w+${stone}s+${iron}i` +
    `+${copper}cu+${coal}co+${oil}oil+${herbs}herbs+${fur}fur → city_inventory`
  );
}

// ─── completeBankToPlayerTransfer ────────────────────────────────────────────
// Crédite player_transport du montant stocké dans le path de l'action.
async function completeBankToPlayerTransfer(
  playerId: string, gold: number, food: number,
  wood = 0, stone = 0, iron = 0,
  copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
): Promise<void> {
  if (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0
      && copper === 0 && coal === 0 && oil === 0 && herbs === 0 && fur === 0) return;
  const now = new Date();

  await db
    .insert(playerTransport)
    .values({ playerId, gold, food, wood, stone, iron, copper, coal, oil, herbs, fur, updatedAt: now })
    .onConflictDoUpdate({
      target: playerTransport.playerId,
      set: {
        gold:      sql`${playerTransport.gold}   + ${gold}`,
        food:      sql`${playerTransport.food}   + ${food}`,
        wood:      sql`${playerTransport.wood}   + ${wood}`,
        stone:     sql`${playerTransport.stone}  + ${stone}`,
        iron:      sql`${playerTransport.iron}   + ${iron}`,
        copper:    sql`${playerTransport.copper} + ${copper}`,
        coal:      sql`${playerTransport.coal}   + ${coal}`,
        oil:       sql`${playerTransport.oil}    + ${oil}`,
        herbs:     sql`${playerTransport.herbs}  + ${herbs}`,
        fur:       sql`${playerTransport.fur}    + ${fur}`,
        updatedAt: now,
      },
    });

  console.log(
    `[Transfer] banque→joueur playerId=${playerId} +${gold}g+${food}f+${wood}w+${stone}s+${iron}i` +
    `+${copper}cu+${coal}co+${oil}oil+${herbs}herbs+${fur}fur → player_transport`
  );
}

// ─── Annulation d'une action active ──────────────────────────────────────────
export async function cancelActiveAction(playerId: string): Promise<CancelledAction | null> {
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
  const action = active[0];

  // Pour les actions move : sauvegarder la position effective courante avant annulation
  // Règle : le joueur reste au dernier step entièrement franchi — jamais de position interpolée
  let cancelledAtWorldX: number | null = null;
  let cancelledAtWorldY: number | null = null;
  let cancelledAtStep:   number | null = null;

  if (action.type === "move" && (action.path as PathStep[]).length >= 2) {
    const resolved  = resolveMoveStep(action, now);
    const totalDur  = action.expectedEndTime.getTime() - action.startTime.getTime();
    const isInstant = totalDur === 0;
    const applied   = await applyMoveProgressAndCosts(action, resolved.effectiveStep, now, { skipCostDeduction: isInstant });
    cancelledAtWorldX = applied.worldX;
    cancelledAtWorldY = applied.worldY;
    cancelledAtStep   = resolved.effectiveStep;
    console.log(
      `[PlayerAction] Annulation move — player=${playerId}` +
      ` step=${resolved.effectiveStep} world=(${applied.worldX},${applied.worldY})` +
      ` costDebited=${applied.costDebited} AP`
    );
  }

  const [cancelled] = await db
    .update(playerActions)
    .set({
      status:           "cancelled",
      lastAppliedStep:  cancelledAtStep ?? action.lastAppliedStep,
      updatedAt:        now,
    })
    .where(eq(playerActions.id, action.id))
    .returning();

  console.log(`[PlayerAction] Annulée id=${cancelled.id} player=${playerId}`);
  return { ...cancelled, cancelledAtWorldX, cancelledAtWorldY, cancelledAtStep };
}

// ─── createCollectHarvestAction ───────────────────────────────────────────────
export async function createCollectHarvestAction(
  playerId:      string,
  cityId:        number,
  cityWorldX:    number,
  cityWorldY:    number,
  pendingGold:   number,
  pendingFood:   number,
  context:       ActorContext = { role: 'player' },
  pendingWood:   number = 0,
  pendingStone:  number = 0,
  pendingIron:   number = 0,
  pendingCopper: number = 0,
  pendingCoal:   number = 0,
  pendingOil:    number = 0,
  pendingHerbs:  number = 0,
  pendingFur:    number = 0,
): Promise<PlayerAction> {
  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  const totalUnits = pendingGold + pendingFood + pendingWood + pendingStone + pendingIron
                   + pendingCopper + pendingCoal + pendingOil + pendingHerbs + pendingFur;
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
    ` cityId=${cityId} pending=${pendingGold}g+${pendingFood}f+${pendingWood}w+${pendingStone}s+${pendingIron}i` +
    ` durée=${durationMinutes}min${gmTag}`
  );

  return action;
}

// ─── createTransferBankToCityAction ──────────────────────────────────────────
// Débite player_bank et crée une action transfer_bank_to_city.
// À complétion : crédite city_inventory.
// Matériaux V1 : gold, food, wood, stone, iron.
export async function createTransferBankToCityAction(
  playerId:  string,
  cityId:    number,
  cityWorldX: number,
  cityWorldY: number,
  gold:      number,
  food:      number,
  context:   ActorContext = { role: 'player' },
  wood   = 0, stone  = 0, iron   = 0,
  copper = 0, coal   = 0, oil    = 0, herbs = 0, fur = 0,
): Promise<PlayerAction> {
  if (gold < 0 || food < 0 || wood < 0 || stone < 0 || iron < 0
      || copper < 0 || coal < 0 || oil < 0 || herbs < 0 || fur < 0
      || (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0
          && copper === 0 && coal === 0 && oil === 0 && herbs === 0 && fur === 0)) {
    throw new Error("INVALID_AMOUNT: les montants doivent être positifs et non nuls");
  }

  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  // Vérifier et débiter la banque
  const bankRows = await db
    .select()
    .from(playerBank)
    .where(eq(playerBank.playerId, playerId))
    .limit(1);

  const bank = bankRows[0] ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0 };
  if (bank.gold   < gold)   throw new Error(`INSUFFICIENT_BANK_GOLD: banque=${bank.gold} requis=${gold}`);
  if (bank.food   < food)   throw new Error(`INSUFFICIENT_BANK_FOOD: banque=${bank.food} requis=${food}`);
  if (bank.wood   < wood)   throw new Error(`INSUFFICIENT_BANK_WOOD: banque=${bank.wood} requis=${wood}`);
  if (bank.stone  < stone)  throw new Error(`INSUFFICIENT_BANK_STONE: banque=${bank.stone} requis=${stone}`);
  if (bank.iron   < iron)   throw new Error(`INSUFFICIENT_BANK_IRON: banque=${bank.iron} requis=${iron}`);
  if ((bank.copper ?? 0) < copper) throw new Error(`INSUFFICIENT_BANK_COPPER: banque=${bank.copper} requis=${copper}`);
  if ((bank.coal   ?? 0) < coal)   throw new Error(`INSUFFICIENT_BANK_COAL: banque=${bank.coal} requis=${coal}`);
  if ((bank.oil    ?? 0) < oil)    throw new Error(`INSUFFICIENT_BANK_OIL: banque=${bank.oil} requis=${oil}`);
  if ((bank.herbs  ?? 0) < herbs)  throw new Error(`INSUFFICIENT_BANK_HERBS: banque=${bank.herbs} requis=${herbs}`);
  if ((bank.fur    ?? 0) < fur)    throw new Error(`INSUFFICIENT_BANK_FUR: banque=${bank.fur} requis=${fur}`);

  const now = new Date();

  await db
    .update(playerBank)
    .set({
      gold:      sql`${playerBank.gold}   - ${gold}`,
      food:      sql`${playerBank.food}   - ${food}`,
      wood:      sql`${playerBank.wood}   - ${wood}`,
      stone:     sql`${playerBank.stone}  - ${stone}`,
      iron:      sql`${playerBank.iron}   - ${iron}`,
      copper:    sql`${playerBank.copper} - ${copper}`,
      coal:      sql`${playerBank.coal}   - ${coal}`,
      oil:       sql`${playerBank.oil}    - ${oil}`,
      herbs:     sql`${playerBank.herbs}  - ${herbs}`,
      fur:       sql`${playerBank.fur}    - ${fur}`,
      updatedAt: now,
    })
    .where(eq(playerBank.playerId, playerId));

  const totalUnits = gold + food + wood + stone + iron + copper + coal + oil + herbs + fur;
  const durationMinutes = shouldIgnoreActionTimers(context)
    ? 0
    : Math.max(5, 5 + Math.ceil(totalUnits / 10));
  const durationMs = durationMinutes * 60 * 1000;
  const expectedEndTime = new Date(now.getTime() + durationMs);

  const [action] = await db
    .insert(playerActions)
    .values({
      playerId,
      type: "transfer_bank_to_city",
      status: "in_progress",
      startWorldX: cityWorldX,
      startWorldY: cityWorldY,
      endWorldX:   cityWorldX,
      endWorldY:   cityWorldY,
      path: [{ cityId, gold, food, wood, stone, iron, copper, coal, oil, herbs, fur }] as any,
      totalCost: 0,
      startTime: now,
      expectedEndTime,
      updatedAt: now,
    })
    .returning();

  const gmTag = shouldIgnoreActionTimers(context) ? ' [Admin — durée=0]' : '';
  console.log(
    `[PlayerAction] Transfert banque→ville créé id=${action.id} player=${playerId}` +
    ` cityId=${cityId} ${gold}g+${food}f+${wood}w+${stone}s+${iron}i` +
    `+${copper}cu+${coal}co+${oil}oil+${herbs}herbs+${fur}fur durée=${durationMinutes}min${gmTag}`
  );

  return action;
}

// ─── createTransferBankToPlayerAction ────────────────────────────────────────
// Débite player_bank et crée une action transfer_bank_to_player.
// À complétion : crédite player_transport.
// Capacité max transport : TRANSPORT_MAX_UNITS (50) unités totales (tous matériaux).
// Matériaux V1 : gold, food, wood, stone, iron.
export async function createTransferBankToPlayerAction(
  playerId:  string,
  gold:      number,
  food:      number,
  context:   ActorContext = { role: 'player' },
  wood   = 0, stone  = 0, iron   = 0,
  copper = 0, coal   = 0, oil    = 0, herbs = 0, fur = 0,
): Promise<PlayerAction> {
  if (gold < 0 || food < 0 || wood < 0 || stone < 0 || iron < 0
      || copper < 0 || coal < 0 || oil < 0 || herbs < 0 || fur < 0
      || (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0
          && copper === 0 && coal === 0 && oil === 0 && herbs === 0 && fur === 0)) {
    throw new Error("INVALID_AMOUNT: les montants doivent être positifs et non nuls");
  }

  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  // Vérifier capacité de transport (tous matériaux cumulés — 10 Tier 1)
  const transportRows = await db
    .select()
    .from(playerTransport)
    .where(eq(playerTransport.playerId, playerId))
    .limit(1);

  const current = transportRows[0] ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0 };
  const currentTotal = current.gold + current.food + current.wood + current.stone + current.iron
                     + (current.copper ?? 0) + (current.coal ?? 0) + (current.oil ?? 0)
                     + (current.herbs ?? 0) + (current.fur ?? 0);
  const addTotal = gold + food + wood + stone + iron + copper + coal + oil + herbs + fur;

  if (currentTotal + addTotal > TRANSPORT_MAX_UNITS) {
    throw new Error(
      `TRANSPORT_CAPACITY_EXCEEDED: capacité=${TRANSPORT_MAX_UNITS} actuel=${currentTotal} ajout=${addTotal} libre=${TRANSPORT_MAX_UNITS - currentTotal}`
    );
  }

  // Vérifier et débiter la banque
  const bankRows = await db
    .select()
    .from(playerBank)
    .where(eq(playerBank.playerId, playerId))
    .limit(1);

  const bank = bankRows[0] ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0 };
  if (bank.gold   < gold)   throw new Error(`INSUFFICIENT_BANK_GOLD: banque=${bank.gold} requis=${gold}`);
  if (bank.food   < food)   throw new Error(`INSUFFICIENT_BANK_FOOD: banque=${bank.food} requis=${food}`);
  if (bank.wood   < wood)   throw new Error(`INSUFFICIENT_BANK_WOOD: banque=${bank.wood} requis=${wood}`);
  if (bank.stone  < stone)  throw new Error(`INSUFFICIENT_BANK_STONE: banque=${bank.stone} requis=${stone}`);
  if (bank.iron   < iron)   throw new Error(`INSUFFICIENT_BANK_IRON: banque=${bank.iron} requis=${iron}`);
  if ((bank.copper ?? 0) < copper) throw new Error(`INSUFFICIENT_BANK_COPPER: banque=${bank.copper} requis=${copper}`);
  if ((bank.coal   ?? 0) < coal)   throw new Error(`INSUFFICIENT_BANK_COAL: banque=${bank.coal} requis=${coal}`);
  if ((bank.oil    ?? 0) < oil)    throw new Error(`INSUFFICIENT_BANK_OIL: banque=${bank.oil} requis=${oil}`);
  if ((bank.herbs  ?? 0) < herbs)  throw new Error(`INSUFFICIENT_BANK_HERBS: banque=${bank.herbs} requis=${herbs}`);
  if ((bank.fur    ?? 0) < fur)    throw new Error(`INSUFFICIENT_BANK_FUR: banque=${bank.fur} requis=${fur}`);

  const now = new Date();

  await db
    .update(playerBank)
    .set({
      gold:      sql`${playerBank.gold}   - ${gold}`,
      food:      sql`${playerBank.food}   - ${food}`,
      wood:      sql`${playerBank.wood}   - ${wood}`,
      stone:     sql`${playerBank.stone}  - ${stone}`,
      iron:      sql`${playerBank.iron}   - ${iron}`,
      copper:    sql`${playerBank.copper} - ${copper}`,
      coal:      sql`${playerBank.coal}   - ${coal}`,
      oil:       sql`${playerBank.oil}    - ${oil}`,
      herbs:     sql`${playerBank.herbs}  - ${herbs}`,
      fur:       sql`${playerBank.fur}    - ${fur}`,
      updatedAt: now,
    })
    .where(eq(playerBank.playerId, playerId));

  const totalUnits = gold + food + wood + stone + iron + copper + coal + oil + herbs + fur;
  const durationMinutes = shouldIgnoreActionTimers(context)
    ? 0
    : Math.max(5, 5 + Math.ceil(totalUnits / 10));
  const durationMs = durationMinutes * 60 * 1000;
  const expectedEndTime = new Date(now.getTime() + durationMs);

  const [action] = await db
    .insert(playerActions)
    .values({
      playerId,
      type: "transfer_bank_to_player",
      status: "in_progress",
      startWorldX: 0,
      startWorldY: 0,
      endWorldX:   0,
      endWorldY:   0,
      path: [{ gold, food, wood, stone, iron, copper, coal, oil, herbs, fur }] as any,
      totalCost: 0,
      startTime: now,
      expectedEndTime,
      updatedAt: now,
    })
    .returning();

  const gmTag = shouldIgnoreActionTimers(context) ? ' [Admin — durée=0]' : '';
  console.log(
    `[PlayerAction] Transfert banque→joueur créé id=${action.id} player=${playerId}` +
    ` ${gold}g+${food}f+${wood}w+${stone}s+${iron}i+${copper}cu+${coal}co+${oil}oil+${herbs}herbs+${fur}fur durée=${durationMinutes}min${gmTag}`
  );

  return action;
}

// ─── getOrInitPlayerTransport ─────────────────────────────────────────────────
export async function getOrInitPlayerTransport(playerId: string) {
  const rows = await db
    .select()
    .from(playerTransport)
    .where(eq(playerTransport.playerId, playerId))
    .limit(1);

  if (rows.length > 0) return rows[0];

  const now = new Date();
  const [row] = await db
    .insert(playerTransport)
    .values({ playerId, gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
              copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0, updatedAt: now })
    .onConflictDoUpdate({
      target: playerTransport.playerId,
      set: { updatedAt: now },
    })
    .returning();

  return row;
}

// ─── Calcul du temps restant en ms ───────────────────────────────────────────
export function msRemaining(action: PlayerAction): number {
  return Math.max(0, action.expectedEndTime.getTime() - Date.now());
}
