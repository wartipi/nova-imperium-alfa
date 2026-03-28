import { eq, and, sql } from "drizzle-orm";
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
import { savePlayerPosition } from "./playerPositionService";
import type { ActorContext } from "./types/actorContext";

const HOURS_PER_AP = 5 / 3600; // 5 secondes par PA (phase test)
const MS_PER_HOUR = 3600 * 1000;

// Capacité max de transport de ressources (or + nourriture cumulés)
export const TRANSPORT_MAX_UNITS = 50;

// ─── Helpers de comportement admin ────────────────────────────────────────────
function shouldIgnoreActionTimers(context: ActorContext): boolean {
  return context.role === 'admin' && context.adminModeEnabled === true;
}

// Non branché : les PA ne sont pas déduits côté serveur pour les actions de déplacement.
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
    await savePlayerPosition(action.playerId, action.endWorldX, action.endWorldY);
    console.log(
      `[PlayerAction] Complétée id=${action.id} player=${action.playerId}` +
      ` → position (${action.endWorldX},${action.endWorldY})`
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
