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

// Capacité max de transport (unités canoniques : or compressé 1/250, autres ressources 1 chacune)
export const TRANSPORT_MAX_UNITS = 50;
// Stack de compression de l'or (V1 legacy) : 1 unité = 250 pièces.
export const GOLD_TRANSPORT_STACK_SIZE = 250;
// Bloc C V2 : fracten — même compression que gold : 1 unité = 250 fracten.
export const FRACTEN_TRANSPORT_STACK_SIZE = 250;

// ─── Helper canonique de calcul des unités transport ─────────────────────────
// Règle V2 : fracten = ceil(fracten / 250), common_metals = 1u chacun, leather_fur = 1u chacun.
// G6-B1 : fallbacks V1 (gold/iron/copper/fur) retirés — valeurs toujours = 0.
// Source de vérité unique — utilisée partout où on calcule usedUnits / currentTotal.
export function computeTransportUnits(t: {
  food:           number;
  wood:           number;
  stone:          number;
  gold?:          number | null; // V1 legacy — ignoré G6-B1
  iron?:          number | null; // V1 legacy — ignoré G6-B1
  copper?:        number | null; // V1 legacy — ignoré G6-B1
  fur?:           number | null; // V1 legacy — ignoré G6-B1
  coal?:             number | null;
  oil?:              number | null;
  herbs?:            number | null;
  fracten?:          number | null;
  common_metals?:    number | null;
  leather_fur?:      number | null;
  // V3-D2 : ressources prototype unités — 1 unité de transport chacune
  common_textiles?:  number | null;
  labor_contracts?:  number | null;
  basic_equipment?:  number | null;
}): number {
  const fracten          = t.fracten          ?? 0;
  const common_metals    = t.common_metals    ?? 0;
  const leather_fur      = t.leather_fur      ?? 0;
  const common_textiles  = t.common_textiles  ?? 0;
  const labor_contracts  = t.labor_contracts  ?? 0;
  const basic_equipment  = t.basic_equipment  ?? 0;

  return Math.ceil(fracten / FRACTEN_TRANSPORT_STACK_SIZE)
       + common_metals
       + leather_fur
       + t.food
       + t.wood
       + t.stone
       + (t.coal  ?? 0)
       + (t.oil   ?? 0)
       + (t.herbs ?? 0)
       + common_textiles   // V3-D2
       + labor_contracts   // V3-D2
       + basic_equipment;  // V3-D2
}

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

  // ─── Vérification PA ─────────────────────────────────────────────────────────
  const stateSnapshot = await getPlayerState(playerId);
  const available = stateSnapshot?.actionPoints ?? 0;
  if (available < totalCost) {
    throw new Error(
      `INSUFFICIENT_ACTION_POINTS: requis=${totalCost} disponibles=${available}`
    );
  }

  const now = new Date();
  const durationMs = totalCost * HOURS_PER_AP * MS_PER_HOUR;
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

  console.log(
    `[PlayerAction] Créée id=${action.id} player=${playerId}` +
    ` (${startWorldX},${startWorldY}) → (${endWorldX},${endWorldY})` +
    ` coût=${totalCost} AP durée=${durationMs / MS_PER_HOUR}h` +
    ` fin=${expectedEndTime.toISOString()}`
  );

  return action;
}

// ─── Complétion d'une action (délai écoulé) ───────────────────────────────────
async function completeAction(action: PlayerAction): Promise<PlayerAction> {
  const now = new Date();

  // ─── Actions financières : transaction atomique + garde d'idempotence ─────────
  // Ordre : UPDATE status=completed PUIS effets de bord, tous dans la même transaction.
  // Si un effet de bord échoue → rollback complet → action reste in_progress → retry possible.
  // La garde WHERE status='in_progress' prévient les doubles complétions concurrentes.
  if (
    action.type === "collect_harvest"      ||
    action.type === "transfer_bank_to_city" ||
    action.type === "transfer_bank_to_player"
  ) {
    return await db.transaction(async (tx) => {
      // 1. Marquer completed — seulement si encore in_progress (idempotence)
      const rows = await tx
        .update(playerActions)
        .set({ status: "completed", completedAt: now, updatedAt: now })
        .where(and(eq(playerActions.id, action.id), eq(playerActions.status, "in_progress")))
        .returning();

      if (rows.length === 0) {
        // Déjà complétée par un appel concurrent — retourner l'état actuel sans double effet
        console.warn(`[PlayerAction] completeAction id=${action.id} : déjà completed (garde idempotence)`);
        const [current] = await tx
          .select()
          .from(playerActions)
          .where(eq(playerActions.id, action.id))
          .limit(1);
        return current!;
      }

      const updated = rows[0];

      // 2. Effets de bord financiers dans la même transaction
      if (action.type === "collect_harvest") {
        const pathData = action.path as Array<{ cityId?: number }>;
        const cityId = pathData?.[0]?.cityId;
        if (cityId) {
          await completeHarvestTransfer(cityId, tx);
        }
        console.log(`[PlayerAction] Récolte complétée id=${action.id} player=${action.playerId} cityId=${cityId}`);
      } else if (action.type === "transfer_bank_to_city") {
        // F2 V2 — path stocké en V2 (fracten/common_metals/leather_fur)
        const pathData = action.path as Array<{
          cityId?: number;
          fracten?: number; food?: number; wood?: number; stone?: number;
          common_metals?: number; coal?: number; oil?: number; herbs?: number;
          leather_fur?: number;
          // V3-D2
          common_textiles?: number; labor_contracts?: number; basic_equipment?: number;
        }>;
        const meta = pathData?.[0] ?? {};
        if (meta.cityId) {
          await completeBankToCityTransfer(
            meta.cityId,
            meta.fracten ?? 0, meta.food ?? 0, meta.wood ?? 0, meta.stone ?? 0,
            meta.common_metals ?? 0, meta.coal ?? 0, meta.oil ?? 0, meta.herbs ?? 0,
            meta.leather_fur ?? 0,
            meta.common_textiles ?? 0, meta.labor_contracts ?? 0, meta.basic_equipment ?? 0, // V3-D2
            tx,
          );
        }
        console.log(`[PlayerAction] Transfert banque→ville complété id=${action.id} player=${action.playerId}`);
      } else if (action.type === "transfer_bank_to_player") {
        // F2 V2 — path stocké en V2 (fracten/common_metals/leather_fur)
        const pathData = action.path as Array<{
          fracten?: number; food?: number; wood?: number; stone?: number;
          common_metals?: number; coal?: number; oil?: number; herbs?: number;
          leather_fur?: number;
          // V3-D2
          common_textiles?: number; labor_contracts?: number; basic_equipment?: number;
        }>;
        const meta = pathData?.[0] ?? {};
        await completeBankToPlayerTransfer(
          action.playerId,
          meta.fracten ?? 0, meta.food ?? 0, meta.wood ?? 0, meta.stone ?? 0,
          meta.common_metals ?? 0, meta.coal ?? 0, meta.oil ?? 0, meta.herbs ?? 0,
          meta.leather_fur ?? 0,
          meta.common_textiles ?? 0, meta.labor_contracts ?? 0, meta.basic_equipment ?? 0, // V3-D2
          tx,
        );
        console.log(`[PlayerAction] Transfert banque→joueur complété id=${action.id} player=${action.playerId}`);
      }

      return updated;
    });
  }

  // ─── Actions non-financières (move) : comportement existant ──────────────────
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
  }

  return updated;
}

// ─── completeHarvestTransfer ──────────────────────────────────────────────────
async function completeHarvestTransfer(cityId: number, tx: any = db): Promise<void> {
  const rows = await tx
    .select()
    .from(cityPendingHarvest)
    .where(eq(cityPendingHarvest.cityId, cityId))
    .limit(1);

  if (!rows.length) return;
  const row = rows[0];

  // Champs V2 — lus via cast any car Drizzle peut ne pas les exposer typiquement
  const fracten          = (row as any).fracten          ?? 0;
  const common_metals    = (row as any).common_metals    ?? 0;
  const leather_fur      = (row as any).leather_fur      ?? 0;
  // V3-D2 : ressources prototype unités
  const common_textiles  = (row as any).common_textiles  ?? 0;
  const labor_contracts  = (row as any).labor_contracts  ?? 0;
  const basic_equipment  = (row as any).basic_equipment  ?? 0;
  // Champs communs V2 (food/wood/stone/coal/oil/herbs conservés)
  const { food, wood, stone, coal, oil, herbs } = row;

  // Vérification vide : V2 + V3-D2 — G6-B1 : gold/iron/copper/fur retirés
  if (fracten === 0 && common_metals === 0 && leather_fur === 0
      && food === 0 && wood === 0 && stone === 0
      && coal === 0 && oil === 0 && herbs === 0
      && common_textiles === 0 && labor_contracts === 0 && basic_equipment === 0) return;

  const now = new Date();

  // Crédit city_inventory — V2 + V3-D2 (INSERT initial + UPSERT)
  await tx
    .insert(cityInventory)
    .values({ cityId,
      fracten, common_metals, leather_fur,
      food, wood, stone, coal, oil, herbs,
      common_textiles, labor_contracts, basic_equipment, // V3-D2
      updatedAt: now } as any)
    .onConflictDoUpdate({
      target: cityInventory.cityId,
      set: {
        fracten:          sql`${(cityInventory as any).fracten}          + ${fracten}`,
        common_metals:    sql`${(cityInventory as any).common_metals}    + ${common_metals}`,
        leather_fur:      sql`${(cityInventory as any).leather_fur}      + ${leather_fur}`,
        food:             sql`${cityInventory.food}    + ${food}`,
        wood:             sql`${cityInventory.wood}    + ${wood}`,
        stone:            sql`${cityInventory.stone}   + ${stone}`,
        coal:             sql`${cityInventory.coal}    + ${coal}`,
        oil:              sql`${cityInventory.oil}     + ${oil}`,
        herbs:            sql`${cityInventory.herbs}   + ${herbs}`,
        // V3-D2
        common_textiles:  sql`${(cityInventory as any).common_textiles}  + ${common_textiles}`,
        labor_contracts:  sql`${(cityInventory as any).labor_contracts}  + ${labor_contracts}`,
        basic_equipment:  sql`${(cityInventory as any).basic_equipment}  + ${basic_equipment}`,
        updatedAt: now,
      },
    });

  // Remise à zéro pending — V2 + V3-D2 — G6-B1 : gold/iron/copper/fur retirés
  await tx
    .update(cityPendingHarvest)
    .set({
      fracten: 0, common_metals: 0, leather_fur: 0,
      food: 0, wood: 0, stone: 0,
      coal: 0, oil: 0, herbs: 0,
      common_textiles: 0, labor_contracts: 0, basic_equipment: 0, // V3-D2
      updatedAt: now,
    } as any)
    .where(eq(cityPendingHarvest.cityId, cityId));

  console.log(
    `[Harvest] cityId=${cityId} transfert fr${fracten}+cm${common_metals}+lf${leather_fur}` +
    `+ct${common_textiles}+lc${labor_contracts}+be${basic_equipment}` +
    `+${food}f+${wood}w+${stone}s+${coal}co+${oil}oil+${herbs}herbs → city_inventory`
  );
}

// ─── completeBankToCityTransfer ───────────────────────────────────────────────
// Crédite city_inventory du montant stocké dans le path de l'action.
// F2 V2 : fracten/common_metals/leather_fur comme ressources principales.
async function completeBankToCityTransfer(
  cityId: number,
  fracten: number,
  food: number,
  wood = 0, stone = 0,
  commonMetals = 0,
  coal = 0, oil = 0, herbs = 0,
  leatherFur = 0,
  // V3-D2
  commonTextiles = 0, laborContracts = 0, basicEquipment = 0,
  tx: any = db,
): Promise<void> {
  if (fracten === 0 && food === 0 && wood === 0 && stone === 0 && commonMetals === 0
      && coal === 0 && oil === 0 && herbs === 0 && leatherFur === 0
      && commonTextiles === 0 && laborContracts === 0 && basicEquipment === 0) return;
  const now = new Date();

  await tx
    .insert(cityInventory)
    .values({
      cityId,
      fracten, food, wood, stone,
      common_metals: commonMetals,
      coal, oil, herbs,
      leather_fur: leatherFur,
      common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment, // V3-D2
      updatedAt: now,
    } as any)
    .onConflictDoUpdate({
      target: cityInventory.cityId,
      set: {
        fracten:          sql`${(cityInventory as any).fracten}          + ${fracten}`,
        food:             sql`${cityInventory.food}                      + ${food}`,
        wood:             sql`${cityInventory.wood}                      + ${wood}`,
        stone:            sql`${cityInventory.stone}                     + ${stone}`,
        common_metals:    sql`${(cityInventory as any).common_metals}    + ${commonMetals}`,
        coal:             sql`${cityInventory.coal}                      + ${coal}`,
        oil:              sql`${cityInventory.oil}                       + ${oil}`,
        herbs:            sql`${cityInventory.herbs}                     + ${herbs}`,
        leather_fur:      sql`${(cityInventory as any).leather_fur}      + ${leatherFur}`,
        // V3-D2
        common_textiles:  sql`${(cityInventory as any).common_textiles}  + ${commonTextiles}`,
        labor_contracts:  sql`${(cityInventory as any).labor_contracts}  + ${laborContracts}`,
        basic_equipment:  sql`${(cityInventory as any).basic_equipment}  + ${basicEquipment}`,
        updatedAt: now,
      },
    });

  console.log(
    `[Transfer] banque→ville cityId=${cityId} V2+V3-D2` +
    ` +${fracten}fr+${food}f+${wood}w+${stone}s+${commonMetals}cm` +
    `+${coal}co+${oil}oil+${herbs}herbs+${leatherFur}lf` +
    `+${commonTextiles}ct+${laborContracts}lc+${basicEquipment}be → city_inventory`
  );
}

// ─── completeBankToPlayerTransfer ────────────────────────────────────────────
// Crédite player_transport du montant stocké dans le path de l'action.
// F2 V2 : fracten/common_metals/leather_fur comme ressources principales.
async function completeBankToPlayerTransfer(
  playerId: string,
  fracten: number,
  food: number,
  wood = 0, stone = 0,
  commonMetals = 0,
  coal = 0, oil = 0, herbs = 0,
  leatherFur = 0,
  // V3-D2
  commonTextiles = 0, laborContracts = 0, basicEquipment = 0,
  tx: any = db,
): Promise<void> {
  if (fracten === 0 && food === 0 && wood === 0 && stone === 0 && commonMetals === 0
      && coal === 0 && oil === 0 && herbs === 0 && leatherFur === 0
      && commonTextiles === 0 && laborContracts === 0 && basicEquipment === 0) return;
  const now = new Date();

  await tx
    .insert(playerTransport)
    .values({
      playerId,
      fracten, food, wood, stone,
      common_metals: commonMetals,
      coal, oil, herbs,
      leather_fur: leatherFur,
      common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment, // V3-D2
      updatedAt: now,
    } as any)
    .onConflictDoUpdate({
      target: playerTransport.playerId,
      set: {
        fracten:          sql`${(playerTransport as any).fracten}          + ${fracten}`,
        food:             sql`${playerTransport.food}                      + ${food}`,
        wood:             sql`${playerTransport.wood}                      + ${wood}`,
        stone:            sql`${playerTransport.stone}                     + ${stone}`,
        common_metals:    sql`${(playerTransport as any).common_metals}    + ${commonMetals}`,
        coal:             sql`${playerTransport.coal}                      + ${coal}`,
        oil:              sql`${playerTransport.oil}                       + ${oil}`,
        herbs:            sql`${playerTransport.herbs}                     + ${herbs}`,
        leather_fur:      sql`${(playerTransport as any).leather_fur}      + ${leatherFur}`,
        // V3-D2
        common_textiles:  sql`${(playerTransport as any).common_textiles}  + ${commonTextiles}`,
        labor_contracts:  sql`${(playerTransport as any).labor_contracts}  + ${laborContracts}`,
        basic_equipment:  sql`${(playerTransport as any).basic_equipment}  + ${basicEquipment}`,
        updatedAt: now,
      },
    });

  console.log(
    `[Transfer] banque→joueur playerId=${playerId} V2+V3-D2` +
    ` +${fracten}fr+${food}f+${wood}w+${stone}s+${commonMetals}cm` +
    `+${coal}co+${oil}oil+${herbs}herbs+${leatherFur}lf` +
    `+${commonTextiles}ct+${laborContracts}lc+${basicEquipment}be → player_transport`
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
  pendingFracten:      number,
  pendingFood:         number,
  context:             ActorContext = { role: 'player' },
  pendingWood:         number = 0,
  pendingStone:        number = 0,
  pendingCommonMetals: number = 0,
  pendingCoal:         number = 0,
  pendingOil:          number = 0,
  pendingHerbs:        number = 0,
  pendingLeatherFur:   number = 0,
): Promise<PlayerAction> {
  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  // G6-B2 : V2 complet — pendingGold/Iron/Copper/Fur retirés de la signature
  const totalUnits = computeTransportUnits({
    fracten:       pendingFracten,
    food:          pendingFood,
    wood:          pendingWood,
    stone:         pendingStone,
    common_metals: pendingCommonMetals,
    coal:          pendingCoal,
    oil:           pendingOil,
    herbs:         pendingHerbs,
    leather_fur:   pendingLeatherFur,
  });
  const durationMinutes = Math.max(5, 5 + Math.ceil(totalUnits / 10));
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

  console.log(
    `[PlayerAction] Récolte créée id=${action.id} player=${playerId}` +
    ` cityId=${cityId} pending=${pendingFracten}fr+${pendingFood}f+${pendingWood}w+${pendingStone}s` +
    `+${pendingCommonMetals}cm+${pendingLeatherFur}lf` +
    ` durée=${durationMinutes}min`
  );

  return action;
}

// ─── createTransferBankToCityAction ──────────────────────────────────────────
// Débite player_bank et crée une action transfer_bank_to_city.
// À complétion : crédite city_inventory.
// F2 V2 : fracten/commonMetals/leatherFur comme ressources principales.
// V1 legacy : gold/iron/copper/fur en fallback backward-compat.
export async function createTransferBankToCityAction(
  playerId:   string,
  cityId:     number,
  cityWorldX: number,
  cityWorldY: number,
  // V2 principal F2
  fracten:      number,
  food:         number,
  context:      ActorContext = { role: 'player' },
  wood        = 0, stone       = 0,
  commonMetals = 0,
  coal        = 0, oil         = 0, herbs     = 0,
  leatherFur  = 0,
  // V3-D2 : ressources prototype unités
  commonTextiles = 0, laborContracts = 0, basicEquipment = 0,
  // V1 legacy — conservé dans la signature pour backward-compat DTO, rejeté si > 0 (G4)
  gold        = 0, iron        = 0, copper    = 0, fur = 0,
): Promise<PlayerAction> {
  // G4 : rejet explicite des ressources V1 legacy.
  if (gold > 0 || iron > 0 || copper > 0 || fur > 0) {
    throw new Error("LEGACY_RESOURCE_DISABLED: utilisez fracten, common_metals, leather_fur (V2)");
  }

  // G4 : V2 + V3-D2 uniquement — plus de fallback V1.
  const effectiveFracten      = fracten;
  const effectiveCommonMetals = commonMetals;
  const effectiveLeatherFur   = leatherFur;

  if (effectiveFracten < 0 || food < 0 || wood < 0 || stone < 0
      || effectiveCommonMetals < 0 || coal < 0 || oil < 0 || herbs < 0 || effectiveLeatherFur < 0
      || commonTextiles < 0 || laborContracts < 0 || basicEquipment < 0
      || (effectiveFracten === 0 && food === 0 && wood === 0 && stone === 0
          && effectiveCommonMetals === 0 && coal === 0 && oil === 0 && herbs === 0 && effectiveLeatherFur === 0
          && commonTextiles === 0 && laborContracts === 0 && basicEquipment === 0)) {
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

  const bank = bankRows[0] ?? {
    fracten: 0, food: 0, wood: 0, stone: 0,
    common_metals: 0, coal: 0, oil: 0, herbs: 0, leather_fur: 0,
    common_textiles: 0, labor_contracts: 0, basic_equipment: 0,
  };

  // G4 : checks V2 + V3-D2 — branches V1 fallback supprimées.
  if ((bank.fracten ?? 0) < fracten)
    throw new Error(`INSUFFICIENT_BANK_FRACTEN: banque=${bank.fracten} requis=${fracten}`);
  if (bank.food   < food)  throw new Error(`INSUFFICIENT_BANK_FOOD: banque=${bank.food} requis=${food}`);
  if (bank.wood   < wood)  throw new Error(`INSUFFICIENT_BANK_WOOD: banque=${bank.wood} requis=${wood}`);
  if (bank.stone  < stone) throw new Error(`INSUFFICIENT_BANK_STONE: banque=${bank.stone} requis=${stone}`);
  if ((bank.common_metals ?? 0) < commonMetals)
    throw new Error(`INSUFFICIENT_BANK_COMMON_METALS: banque=${bank.common_metals} requis=${commonMetals}`);
  if ((bank.coal  ?? 0) < coal)  throw new Error(`INSUFFICIENT_BANK_COAL: banque=${bank.coal} requis=${coal}`);
  if ((bank.oil   ?? 0) < oil)   throw new Error(`INSUFFICIENT_BANK_OIL: banque=${bank.oil} requis=${oil}`);
  if ((bank.herbs ?? 0) < herbs) throw new Error(`INSUFFICIENT_BANK_HERBS: banque=${bank.herbs} requis=${herbs}`);
  if ((bank.leather_fur ?? 0) < leatherFur)
    throw new Error(`INSUFFICIENT_BANK_LEATHER_FUR: banque=${bank.leather_fur} requis=${leatherFur}`);
  // V3-D2
  if (((bank as any).common_textiles ?? 0) < commonTextiles)
    throw new Error(`INSUFFICIENT_BANK_COMMON_TEXTILES: banque=${(bank as any).common_textiles} requis=${commonTextiles}`);
  if (((bank as any).labor_contracts ?? 0) < laborContracts)
    throw new Error(`INSUFFICIENT_BANK_LABOR_CONTRACTS: banque=${(bank as any).labor_contracts} requis=${laborContracts}`);
  if (((bank as any).basic_equipment ?? 0) < basicEquipment)
    throw new Error(`INSUFFICIENT_BANK_BASIC_EQUIPMENT: banque=${(bank as any).basic_equipment} requis=${basicEquipment}`);

  const now = new Date();

  // Durée via effective amounts V2 + V3-D2
  const totalUnits = computeTransportUnits({
    fracten: effectiveFracten, food, wood, stone,
    common_metals: effectiveCommonMetals, coal, oil, herbs,
    leather_fur: effectiveLeatherFur,
    common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment,
  });
  const durationSeconds = totalUnits * 5;
  const expectedEndTime = new Date(now.getTime() + durationSeconds * 1000);

  // Débit banque + création action dans la même transaction.
  const [action] = await db.transaction(async (tx) => {
    await tx
      .update(playerBank)
      .set({
        fracten:          sql`${(playerBank as any).fracten}          - ${fracten}`,
        food:             sql`${playerBank.food}                      - ${food}`,
        wood:             sql`${playerBank.wood}                      - ${wood}`,
        stone:            sql`${playerBank.stone}                     - ${stone}`,
        common_metals:    sql`${(playerBank as any).common_metals}    - ${commonMetals}`,
        coal:             sql`${playerBank.coal}                      - ${coal}`,
        oil:              sql`${playerBank.oil}                       - ${oil}`,
        herbs:            sql`${playerBank.herbs}                     - ${herbs}`,
        leather_fur:      sql`${(playerBank as any).leather_fur}      - ${leatherFur}`,
        // V3-D2
        common_textiles:  sql`${(playerBank as any).common_textiles}  - ${commonTextiles}`,
        labor_contracts:  sql`${(playerBank as any).labor_contracts}  - ${laborContracts}`,
        basic_equipment:  sql`${(playerBank as any).basic_equipment}  - ${basicEquipment}`,
        updatedAt: now,
      } as any)
      .where(eq(playerBank.playerId, playerId));

    return tx
      .insert(playerActions)
      .values({
        playerId,
        type: "transfer_bank_to_city",
        status: "in_progress",
        startWorldX: cityWorldX,
        startWorldY: cityWorldY,
        endWorldX:   cityWorldX,
        endWorldY:   cityWorldY,
        // Path V2 + V3-D2 — stocke les effective amounts
        path: [{
          cityId,
          fracten: effectiveFracten, food, wood, stone,
          common_metals: effectiveCommonMetals, coal, oil, herbs,
          leather_fur: effectiveLeatherFur,
          common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment,
        }] as any,
        totalCost: 0,
        startTime: now,
        expectedEndTime,
        updatedAt: now,
      })
      .returning();
  });

  console.log(
    `[PlayerAction] Transfert banque→ville créé id=${action.id} player=${playerId}` +
    ` cityId=${cityId} V2+V3-D2 ${effectiveFracten}fr+${food}f+${wood}w+${stone}s` +
    `+${effectiveCommonMetals}cm+${coal}co+${oil}oil+${herbs}herbs+${effectiveLeatherFur}lf` +
    `+${commonTextiles}ct+${laborContracts}lc+${basicEquipment}be` +
    ` totalUnits=${totalUnits} durée=${durationSeconds}s`
  );

  return action;
}

// ─── createTransferBankToPlayerAction ────────────────────────────────────────
// Débite player_bank et crée une action transfer_bank_to_player.
// À complétion : crédite player_transport.
// Capacité max transport : TRANSPORT_MAX_UNITS (50) unités totales (tous matériaux).
// F2 V2 : fracten/commonMetals/leatherFur comme ressources principales.
// V1 legacy : gold/iron/copper/fur en fallback backward-compat.
export async function createTransferBankToPlayerAction(
  playerId:    string,
  // V2 principal F2
  fracten:     number,
  food:        number,
  context:     ActorContext = { role: 'player' },
  wood        = 0, stone        = 0,
  commonMetals = 0,
  coal        = 0, oil          = 0, herbs      = 0,
  leatherFur  = 0,
  // V3-D2 : ressources prototype unités
  commonTextiles = 0, laborContracts = 0, basicEquipment = 0,
  // V1 legacy — conservé dans la signature pour backward-compat DTO, rejeté si > 0 (G4)
  gold        = 0, iron         = 0, copper     = 0, fur = 0,
): Promise<PlayerAction> {
  // G4 : rejet explicite des ressources V1 legacy.
  if (gold > 0 || iron > 0 || copper > 0 || fur > 0) {
    throw new Error("LEGACY_RESOURCE_DISABLED: utilisez fracten, common_metals, leather_fur (V2)");
  }

  // G4 : V2 + V3-D2 uniquement — plus de fallback V1.
  const effectiveFracten      = fracten;
  const effectiveCommonMetals = commonMetals;
  const effectiveLeatherFur   = leatherFur;

  if (effectiveFracten < 0 || food < 0 || wood < 0 || stone < 0
      || effectiveCommonMetals < 0 || coal < 0 || oil < 0 || herbs < 0 || effectiveLeatherFur < 0
      || commonTextiles < 0 || laborContracts < 0 || basicEquipment < 0
      || (effectiveFracten === 0 && food === 0 && wood === 0 && stone === 0
          && effectiveCommonMetals === 0 && coal === 0 && oil === 0 && herbs === 0 && effectiveLeatherFur === 0
          && commonTextiles === 0 && laborContracts === 0 && basicEquipment === 0)) {
    throw new Error("INVALID_AMOUNT: les montants doivent être positifs et non nuls");
  }

  const existing = await getActiveAction(playerId);
  if (existing && existing.status === "in_progress") {
    throw new Error(`ACTION_ALREADY_ACTIVE: joueur ${playerId} a déjà une action en cours (id=${existing.id})`);
  }

  // Vérifier capacité de transport via effective amounts V2 + V3-D2
  const transportRows = await db
    .select()
    .from(playerTransport)
    .where(eq(playerTransport.playerId, playerId))
    .limit(1);

  const current = transportRows[0] ?? {
    fracten: 0, food: 0, wood: 0, stone: 0,
    common_metals: 0, coal: 0, oil: 0, herbs: 0, leather_fur: 0,
    common_textiles: 0, labor_contracts: 0, basic_equipment: 0,
  };
  const currentTotal = computeTransportUnits(current as any);
  const addTotal     = computeTransportUnits({
    fracten: effectiveFracten, food, wood, stone,
    common_metals: effectiveCommonMetals, coal, oil, herbs,
    leather_fur: effectiveLeatherFur,
    common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment,
  });

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

  const bank = bankRows[0] ?? {
    fracten: 0, food: 0, wood: 0, stone: 0,
    common_metals: 0, coal: 0, oil: 0, herbs: 0, leather_fur: 0,
    common_textiles: 0, labor_contracts: 0, basic_equipment: 0,
  };

  // G4 : checks V2 + V3-D2 — branches V1 fallback supprimées.
  if ((bank.fracten ?? 0) < fracten)
    throw new Error(`INSUFFICIENT_BANK_FRACTEN: banque=${bank.fracten} requis=${fracten}`);
  if (bank.food   < food)  throw new Error(`INSUFFICIENT_BANK_FOOD: banque=${bank.food} requis=${food}`);
  if (bank.wood   < wood)  throw new Error(`INSUFFICIENT_BANK_WOOD: banque=${bank.wood} requis=${wood}`);
  if (bank.stone  < stone) throw new Error(`INSUFFICIENT_BANK_STONE: banque=${bank.stone} requis=${stone}`);
  if ((bank.common_metals ?? 0) < commonMetals)
    throw new Error(`INSUFFICIENT_BANK_COMMON_METALS: banque=${bank.common_metals} requis=${commonMetals}`);
  if ((bank.coal  ?? 0) < coal)  throw new Error(`INSUFFICIENT_BANK_COAL: banque=${bank.coal} requis=${coal}`);
  if ((bank.oil   ?? 0) < oil)   throw new Error(`INSUFFICIENT_BANK_OIL: banque=${bank.oil} requis=${oil}`);
  if ((bank.herbs ?? 0) < herbs) throw new Error(`INSUFFICIENT_BANK_HERBS: banque=${bank.herbs} requis=${herbs}`);
  if ((bank.leather_fur ?? 0) < leatherFur)
    throw new Error(`INSUFFICIENT_BANK_LEATHER_FUR: banque=${bank.leather_fur} requis=${leatherFur}`);
  // V3-D2
  if (((bank as any).common_textiles ?? 0) < commonTextiles)
    throw new Error(`INSUFFICIENT_BANK_COMMON_TEXTILES: banque=${(bank as any).common_textiles} requis=${commonTextiles}`);
  if (((bank as any).labor_contracts ?? 0) < laborContracts)
    throw new Error(`INSUFFICIENT_BANK_LABOR_CONTRACTS: banque=${(bank as any).labor_contracts} requis=${laborContracts}`);
  if (((bank as any).basic_equipment ?? 0) < basicEquipment)
    throw new Error(`INSUFFICIENT_BANK_BASIC_EQUIPMENT: banque=${(bank as any).basic_equipment} requis=${basicEquipment}`);

  const now = new Date();

  // Durée via effective amounts V2 + V3-D2
  const totalUnits = computeTransportUnits({
    fracten: effectiveFracten, food, wood, stone,
    common_metals: effectiveCommonMetals, coal, oil, herbs,
    leather_fur: effectiveLeatherFur,
    common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment,
  });
  const durationSeconds = totalUnits * 5;
  const expectedEndTime = new Date(now.getTime() + durationSeconds * 1000);

  // G4 : Débit V2 + V3-D2 — colonnes gold/iron/copper/fur non débitées.
  const [action] = await db.transaction(async (tx) => {
    await tx
      .update(playerBank)
      .set({
        fracten:          sql`${(playerBank as any).fracten}          - ${fracten}`,
        food:             sql`${playerBank.food}                      - ${food}`,
        wood:             sql`${playerBank.wood}                      - ${wood}`,
        stone:            sql`${playerBank.stone}                     - ${stone}`,
        common_metals:    sql`${(playerBank as any).common_metals}    - ${commonMetals}`,
        coal:             sql`${playerBank.coal}                      - ${coal}`,
        oil:              sql`${playerBank.oil}                       - ${oil}`,
        herbs:            sql`${playerBank.herbs}                     - ${herbs}`,
        leather_fur:      sql`${(playerBank as any).leather_fur}      - ${leatherFur}`,
        // V3-D2
        common_textiles:  sql`${(playerBank as any).common_textiles}  - ${commonTextiles}`,
        labor_contracts:  sql`${(playerBank as any).labor_contracts}  - ${laborContracts}`,
        basic_equipment:  sql`${(playerBank as any).basic_equipment}  - ${basicEquipment}`,
        updatedAt: now,
      } as any)
      .where(eq(playerBank.playerId, playerId));

    return tx
      .insert(playerActions)
      .values({
        playerId,
        type: "transfer_bank_to_player",
        status: "in_progress",
        startWorldX: 0,
        startWorldY: 0,
        endWorldX:   0,
        endWorldY:   0,
        // Path V2 + V3-D2 — stocke les effective amounts
        path: [{
          fracten: effectiveFracten, food, wood, stone,
          common_metals: effectiveCommonMetals, coal, oil, herbs,
          leather_fur: effectiveLeatherFur,
          common_textiles: commonTextiles, labor_contracts: laborContracts, basic_equipment: basicEquipment,
        }] as any,
        totalCost: 0,
        startTime: now,
        expectedEndTime,
        updatedAt: now,
      })
      .returning();
  });

  console.log(
    `[PlayerAction] Transfert banque→joueur créé id=${action.id} player=${playerId}` +
    ` V2+V3-D2 ${effectiveFracten}fr+${food}f+${wood}w+${stone}s` +
    `+${effectiveCommonMetals}cm+${coal}co+${oil}oil+${herbs}herbs+${effectiveLeatherFur}lf` +
    `+${commonTextiles}ct+${laborContracts}lc+${basicEquipment}be` +
    ` totalUnits=${totalUnits} durée=${durationSeconds}s`
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
    .values({ playerId, fracten: 0, food: 0, wood: 0, stone: 0,
              coal: 0, oil: 0, herbs: 0,
              common_metals: 0, leather_fur: 0,
              common_textiles: 0, labor_contracts: 0, basic_equipment: 0, // V3-D2
              updatedAt: now } as any)
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
