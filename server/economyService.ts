import { eq, sql, and, gte, or } from "drizzle-orm";
import { db } from "./db";
import { cities, colonies, factionEconomy, cityBuildings, playerBank, cityPendingHarvest } from "../shared/schema";

// ─── Types publics ─────────────────────────────────────────────────────────────

export interface FactionIncomeDTO {
  foodPerTurn:    number;
  fractenPerTurn: number; // Bloc B V2 — remplace goldPerTurn
}

export interface FactionEconomyDTO {
  fracten:            number; // Bloc B V2 — remplace gold
  food:               number;
  lastProcessedTurn:  number;
  updatedAt:          string;
}

// ─── DebitResult ─────────────────────────────────────────────────────────────

export interface DebitResult {
  success:       boolean;
  fractenBefore: number; // Bloc B V2 — remplace goldBefore
  fractenAfter:  number; // Bloc B V2 — remplace goldAfter
  reason?:       string;
}

// ─── debitFactionGoldIfEnough ─────────────────────────────────────────────────
// Bloc B V2 : débite `amount` fracten du stock faction_economy.fracten.
// Atomique : UPDATE avec garde WHERE fracten >= amount.
// Retourne success:false si fracten insuffisant ou amount invalide.
export async function debitFactionGoldIfEnough(
  factionId: number,
  amount:    number,
): Promise<DebitResult> {
  if (amount <= 0) {
    return { success: false, fractenBefore: 0, fractenAfter: 0, reason: "Montant invalide" };
  }

  // Initialise la ligne si absente, lit l'état courant.
  const current = await getFactionEconomy(factionId);

  if (current.fracten < amount) {
    return {
      success:       false,
      fractenBefore: current.fracten,
      fractenAfter:  current.fracten,
      reason: `Fracten insuffisant. Coût: ${amount}, Disponible: ${current.fracten}`,
    };
  }

  // UPDATE conditionnel — la garde WHERE fracten >= amount empêche une double dépense concurrente.
  const updated = await db
    .update(factionEconomy)
    .set({ fracten: sql`${factionEconomy.fracten} - ${amount}`, updatedAt: new Date() })
    .where(and(eq(factionEconomy.factionId, factionId), gte(factionEconomy.fracten, amount)))
    .returning({ fracten: factionEconomy.fracten });

  if (updated.length === 0) {
    return {
      success:       false,
      fractenBefore: current.fracten,
      fractenAfter:  current.fracten,
      reason: "Fracten insuffisant (condition concurrente)",
    };
  }

  const fractenAfter = updated[0].fracten;
  console.log(
    `[debitFracten] faction=${factionId} -${amount} fracten` +
    ` (${current.fracten} → ${fractenAfter})`
  );

  return { success: true, fractenBefore: current.fracten, fractenAfter };
}

// ─── creditFactionGold ────────────────────────────────────────────────────────
// Bloc B V2 : crédite `amount` fracten sur faction_economy.fracten (remboursement ou bonus).
// Initialise la ligne si absente. Retourne le stock après crédit.
export async function creditFactionGold(
  factionId: number,
  amount:    number,
): Promise<number> {
  if (amount <= 0) return (await getFactionEconomy(factionId)).fracten;

  // Initialise si absente, puis crédite.
  await getFactionEconomy(factionId);

  const updated = await db
    .update(factionEconomy)
    .set({ fracten: sql`${factionEconomy.fracten} + ${amount}`, updatedAt: new Date() })
    .where(eq(factionEconomy.factionId, factionId))
    .returning({ fracten: factionEconomy.fracten });

  const fractenAfter = updated[0]?.fracten ?? 0;
  console.log(`[creditFracten] faction=${factionId} +${amount} fracten → ${fractenAfter}`);
  return fractenAfter;
}

// ─── aggregateFactionIncome ───────────────────────────────────────────────────
// Bloc B V2 : somme food_per_turn + fracten_per_turn sur toutes les villes
// dont l'ownerFactionId correspond à la faction (ownership canonique).
// Ne passe pas par CityDTO ni par le client.
export async function aggregateFactionIncome(factionId: number): Promise<FactionIncomeDTO> {
  const rows = await db
    .select({
      totalFood:    sql<number>`COALESCE(SUM(${cities.foodPerTurn}), 0)`,
      totalFracten: sql<number>`COALESCE(SUM(${cities.fractenPerTurn}), 0)`,
    })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(colonies.ownerFactionId, factionId));

  const row = rows[0];
  return {
    foodPerTurn:    Number(row?.totalFood    ?? 0),
    fractenPerTurn: Number(row?.totalFracten ?? 0),
  };
}

// ─── getFactionEconomy ────────────────────────────────────────────────────────
// Lit la ligne faction_economy pour la faction donnée.
// Si absente (première lecture), crée une ligne initiale avec les stocks à 0.
// Retourne toujours un état valide — jamais null.
export async function getFactionEconomy(factionId: number): Promise<FactionEconomyDTO> {
  const rows = await db
    .select()
    .from(factionEconomy)
    .where(eq(factionEconomy.factionId, factionId))
    .limit(1);

  if (rows.length > 0) {
    const r = rows[0];
    return {
      fracten:           r.fracten,  // Bloc B V2
      food:              r.food,
      lastProcessedTurn: r.lastProcessedTurn,
      updatedAt:         r.updatedAt.toISOString(),
    };
  }

  // Initialisation paresseuse — première lecture pour cette faction.
  const [inserted] = await db
    .insert(factionEconomy)
    .values({ factionId, gold: 0, fracten: 0, food: 0, lastProcessedTurn: 0 })
    .onConflictDoNothing()
    .returning();

  // Si onConflictDoNothing a absorbé un doublon de concurrence, on relit.
  if (!inserted) {
    const [retry] = await db
      .select()
      .from(factionEconomy)
      .where(eq(factionEconomy.factionId, factionId))
      .limit(1);
    return {
      fracten:           retry.fracten,
      food:              retry.food,
      lastProcessedTurn: retry.lastProcessedTurn,
      updatedAt:         retry.updatedAt.toISOString(),
    };
  }

  return {
    fracten:           inserted.fracten,
    food:              inserted.food,
    lastProcessedTurn: inserted.lastProcessedTurn,
    updatedAt:         inserted.updatedAt.toISOString(),
  };
}

// ─── applyFactionEconomyTick ──────────────────────────────────────────────────
// Applique un tick économique pour la faction donnée.
// Garde d'idempotence : si lastProcessedTurn >= currentTurn, tick ignoré.
// v1 : revenus uniquement (food + gold) — pas de dépenses, pas d'entretien.
export async function applyFactionEconomyTick(
  factionId:   number,
  currentTurn: number,
): Promise<{ applied: boolean; economy: FactionEconomyDTO }> {
  // Lecture ou initialisation de la ligne économie.
  const current = await getFactionEconomy(factionId);

  // Garde d'idempotence : ce tour a déjà été traité.
  if (current.lastProcessedTurn >= currentTurn) {
    console.log(
      `[economyTick] faction=${factionId} tour=${currentTurn} déjà traité` +
      ` (lastProcessedTurn=${current.lastProcessedTurn}) — tick ignoré`
    );
    return { applied: false, economy: current };
  }

  // Agrégation des revenus depuis les villes de la faction.
  const income = await aggregateFactionIncome(factionId);

  // Bloc B V2 : fracten remplace gold comme monnaie de production.
  const newFracten = current.fracten + income.fractenPerTurn;
  const newFood    = current.food    + income.foodPerTurn;

  const now = new Date();

  await db
    .update(factionEconomy)
    .set({
      fracten:           newFracten,
      food:              newFood,
      lastProcessedTurn: currentTurn,
      updatedAt:         now,
    })
    .where(eq(factionEconomy.factionId, factionId));

  console.log(
    `[economyTick] faction=${factionId} tour=${currentTurn}` +
    ` +food=${income.foodPerTurn} +fracten=${income.fractenPerTurn}` +
    ` → stocks: food=${newFood} fracten=${newFracten}`
  );

  return {
    applied: true,
    economy: {
      fracten:           newFracten,
      food:              newFood,
      lastProcessedTurn: currentTurn,
      updatedAt:         now.toISOString(),
    },
  };
}

// ─── PlayerBankDTO ────────────────────────────────────────────────────────────

export interface PlayerBankDTO {
  fracten:            number; // Bloc B V2 — monnaie de production
  gold:               number; // V1 legacy — conservé pour compatibilité
  food:               number;
  wood:               number;
  stone:              number;
  iron:               number;
  copper:             number;
  coal:               number;
  oil:                number;
  herbs:              number;
  fur:                number;
  lastProductionTurn: number;
  updatedAt:          string;
}

export interface CityHarvestDTO {
  cityId:   number;
  name:     string;
  hasBank:  boolean;
  pending:  { gold: number; food: number };
  inventory: { gold: number; food: number };
}

export interface ProductionTickResult {
  applied: boolean;
  cities:  Array<{
    cityId: number; name: string;
    gold: number; food: number; wood: number; stone: number; iron: number;
    copper: number; coal: number; oil: number; herbs: number; fur: number;
    destination: 'bank' | 'pending';
  }>;
}

// ─── getOrInitPlayerBank ──────────────────────────────────────────────────────
// Lit ou initialise la banque du joueur. Retourne toujours un état valide.
export async function getOrInitPlayerBank(playerId: string): Promise<PlayerBankDTO> {
  const rows = await db.select().from(playerBank).where(eq(playerBank.playerId, playerId)).limit(1);
  function rowToDTO(r: typeof playerBank.$inferSelect): PlayerBankDTO {
    return {
      fracten: r.fracten, // Bloc B V2
      gold: r.gold, food: r.food,
      wood: r.wood ?? 0, stone: r.stone ?? 0, iron: r.iron ?? 0,
      copper: r.copper ?? 0, coal: r.coal ?? 0, oil: r.oil ?? 0,
      herbs: r.herbs ?? 0, fur: r.fur ?? 0,
      lastProductionTurn: r.lastProductionTurn, updatedAt: r.updatedAt.toISOString(),
    };
  }
  if (rows.length > 0) return rowToDTO(rows[0]);
  const [ins] = await db
    .insert(playerBank)
    .values({ playerId, gold: 0, fracten: 0, food: 0, wood: 0, stone: 0, iron: 0,
              copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0, lastProductionTurn: 0 })
    .onConflictDoNothing()
    .returning();
  if (!ins) {
    const [r] = await db.select().from(playerBank).where(eq(playerBank.playerId, playerId)).limit(1);
    return rowToDTO(r);
  }
  return rowToDTO(ins);
}

// ─── applyProductionTickPerCity ───────────────────────────────────────────────
// Tick de production résolu ville par ville :
//   - ville avec banque → player_bank
//   - ville sans banque → city_pending_harvest
// Garde d'idempotence : lastProductionTurn stocké dans player_bank.
// Ne touche PAS à faction_economy.
export async function applyProductionTickPerCity(
  playerId:    string,
  factionId:   number | null,
  currentTurn: number,
): Promise<ProductionTickResult> {
  // Initialise + lit l'état de la banque.
  const bank = await getOrInitPlayerBank(playerId);

  // Garde d'idempotence.
  if (bank.lastProductionTurn >= currentTurn) {
    console.log(`[productionTick] player=${playerId} tour=${currentTurn} déjà traité — ignoré`);
    return { applied: false, cities: [] };
  }

  // Sélection canonique — même règle que getMyCities() et tickCityProduction() :
  //   • si faction : ownerFactionId === factionId OU ownerPlayerId === playerId
  //   • si pas de faction : ownerPlayerId === playerId uniquement
  const ownerWhere = factionId !== null
    ? or(eq(colonies.ownerFactionId, factionId), eq(colonies.ownerPlayerId, playerId))
    : eq(colonies.ownerPlayerId, playerId);

  const cityRows = await db
    .select({
      cityId:          cities.id,
      name:            cities.name,
      fractenPerTurn:  cities.fractenPerTurn, // Bloc B V2
      foodPerTurn:     cities.foodPerTurn,
      woodPerTurn:   cities.woodPerTurn,
      stonePerTurn:  cities.stonePerTurn,
      ironPerTurn:   cities.ironPerTurn,
      copperPerTurn: cities.copperPerTurn,
      coalPerTurn:   cities.coalPerTurn,
      oilPerTurn:    cities.oilPerTurn,
      herbsPerTurn:  cities.herbsPerTurn,
      furPerTurn:    cities.furPerTurn,
    })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(ownerWhere);

  // Détection de banque par ville.
  const cityIds = cityRows.map(c => c.cityId);
  const buildingRows = cityIds.length > 0
    ? await db
        .select({ cityId: cityBuildings.cityId, building: cityBuildings.building })
        .from(cityBuildings)
        .where(sql`${cityBuildings.cityId} = ANY(ARRAY[${sql.join(cityIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];

  const cityHasBank = new Map<number, boolean>();
  for (const r of buildingRows) {
    if (r.building === 'bank') cityHasBank.set(r.cityId, true);
  }

  const results: ProductionTickResult['cities'] = [];
  // Accumulateurs banque pour toutes les villes-avec-banque de la faction
  let bankFractenDelta = 0; // Bloc B V2 — remplace bankGoldDelta
  let bankFoodDelta   = 0;
  let bankWoodDelta   = 0;
  let bankStoneDelta  = 0;
  let bankIronDelta   = 0;
  let bankCopperDelta = 0;
  let bankCoalDelta   = 0;
  let bankOilDelta    = 0;
  let bankHerbsDelta  = 0;
  let bankFurDelta    = 0;
  const now = new Date();

  for (const city of cityRows) {
    const g      = Number(city.fractenPerTurn ?? 0); // Bloc B V2 — fractenPerTurn
    const f      = Number(city.foodPerTurn    ?? 0);
    const w      = Number(city.woodPerTurn    ?? 0);
    const s      = Number(city.stonePerTurn   ?? 0);
    const ir     = Number(city.ironPerTurn    ?? 0);
    const cu     = Number(city.copperPerTurn  ?? 0);
    const co     = Number(city.coalPerTurn    ?? 0);
    const oil    = Number(city.oilPerTurn     ?? 0);
    const herbs  = Number(city.herbsPerTurn   ?? 0);
    const fur    = Number(city.furPerTurn     ?? 0);

    if (g === 0 && f === 0 && w === 0 && s === 0 && ir === 0
        && cu === 0 && co === 0 && oil === 0 && herbs === 0 && fur === 0) continue;

    const hasBank = cityHasBank.get(city.cityId) === true;

    if (hasBank) {
      bankFractenDelta += g; // Bloc B V2
      bankFoodDelta   += f;
      bankWoodDelta   += w;
      bankStoneDelta  += s;
      bankIronDelta   += ir;
      bankCopperDelta += cu;
      bankCoalDelta   += co;
      bankOilDelta    += oil;
      bankHerbsDelta  += herbs;
      bankFurDelta    += fur;
      results.push({ cityId: city.cityId, name: city.name, gold: g, food: f, wood: w, stone: s, iron: ir, copper: cu, coal: co, oil, herbs, fur, destination: 'bank' });
    } else {
      // Accumulation dans pending_harvest (UPSERT) — Bloc B V2 : fracten remplace gold.
      await db
        .insert(cityPendingHarvest)
        .values({
          cityId: city.cityId,
          gold: 0, fracten: g, food: f, wood: w, stone: s, iron: ir,
          copper: cu, coal: co, oil, herbs, fur,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: cityPendingHarvest.cityId,
          set: {
            fracten:   sql`${cityPendingHarvest.fracten} + ${g}`, // Bloc B V2
            food:      sql`${cityPendingHarvest.food}   + ${f}`,
            wood:      sql`${cityPendingHarvest.wood}   + ${w}`,
            stone:     sql`${cityPendingHarvest.stone}  + ${s}`,
            iron:      sql`${cityPendingHarvest.iron}   + ${ir}`,
            copper:    sql`${cityPendingHarvest.copper} + ${cu}`,
            coal:      sql`${cityPendingHarvest.coal}   + ${co}`,
            oil:       sql`${cityPendingHarvest.oil}    + ${oil}`,
            herbs:     sql`${cityPendingHarvest.herbs}  + ${herbs}`,
            fur:       sql`${cityPendingHarvest.fur}    + ${fur}`,
            updatedAt: now,
          },
        });
      results.push({ cityId: city.cityId, name: city.name, gold: g, food: f, wood: w, stone: s, iron: ir, copper: cu, coal: co, oil, herbs, fur, destination: 'pending' });
    }
  }

  // Crédit banque joueur groupé + mise à jour garde de tour.
  // Bloc B V2 : fracten crédité dans playerBank.fracten, gold reste à 0 (V1 legacy).
  await db
    .insert(playerBank)
    .values({
      playerId,
      gold: 0, fracten: bankFractenDelta, food: bankFoodDelta, wood: bankWoodDelta,
      stone: bankStoneDelta, iron: bankIronDelta, copper: bankCopperDelta,
      coal: bankCoalDelta, oil: bankOilDelta, herbs: bankHerbsDelta,
      fur: bankFurDelta, lastProductionTurn: currentTurn, updatedAt: now,
    })
    .onConflictDoUpdate({
      target: playerBank.playerId,
      set: {
        fracten:            sql`${playerBank.fracten} + ${bankFractenDelta}`, // V2
        food:               sql`${playerBank.food}   + ${bankFoodDelta}`,
        wood:               sql`${playerBank.wood}   + ${bankWoodDelta}`,
        stone:              sql`${playerBank.stone}  + ${bankStoneDelta}`,
        iron:               sql`${playerBank.iron}   + ${bankIronDelta}`,
        copper:             sql`${playerBank.copper} + ${bankCopperDelta}`,
        coal:               sql`${playerBank.coal}   + ${bankCoalDelta}`,
        oil:                sql`${playerBank.oil}    + ${bankOilDelta}`,
        herbs:              sql`${playerBank.herbs}  + ${bankHerbsDelta}`,
        fur:                sql`${playerBank.fur}    + ${bankFurDelta}`,
        lastProductionTurn: currentTurn,
        updatedAt:          now,
      },
    });

  const matLog = `+${bankFractenDelta}fr+${bankFoodDelta}f+${bankWoodDelta}w+${bankStoneDelta}s`
               + `+${bankIronDelta}ir+${bankCopperDelta}cu+${bankCoalDelta}co`
               + `+${bankOilDelta}oil+${bankHerbsDelta}herbs+${bankFurDelta}fur`;
  console.log(
    `[productionTick] player=${playerId} faction=${factionId ?? 'aucune'} tour=${currentTurn}` +
    ` villes=${cityRows.length} bank${matLog}` +
    ` pending=${results.filter(r => r.destination === 'pending').length} villes`
  );

  return { applied: true, cities: results };
}
