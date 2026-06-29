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
  fracten:            number; // Bloc B V2 — monnaie officielle
  common_metals:      number; // Bloc C V2 — iron + copper fusionnés
  leather_fur:        number; // Bloc C V2 — fur renommé
  gold:               number; // V1 legacy
  food:               number;
  wood:               number;
  stone:              number;
  iron:               number; // V1 legacy
  copper:             number; // V1 legacy
  coal:               number;
  oil:                number;
  herbs:              number;
  fur:                number;  // V1 legacy
  lastProductionTurn: number;
  updatedAt:          string;
}

export interface CityHarvestDTO {
  cityId:   number;
  name:     string;
  hasBank:  boolean;
  pending:  {
    fracten: number; common_metals: number; leather_fur: number; // Bloc C V2
    gold: number; food: number; wood: number; stone: number; iron: number;
    copper: number; coal: number; oil: number; herbs: number; fur: number;
  };
  inventory: {
    fracten: number; common_metals: number; leather_fur: number; // Bloc C V2
    gold: number; food: number; wood: number; stone: number; iron: number;
    copper: number; coal: number; oil: number; herbs: number; fur: number;
  };
}

export interface ProductionTickResult {
  applied: boolean;
  cities:  Array<{
    cityId: number; name: string;
    fracten: number; // Bloc C V2 — remplace gold dans ce résultat
    food: number; wood: number; stone: number;
    // F4 V2 : common_metals + leather_fur remplacent iron/copper/fur
    common_metals: number; leather_fur: number;
    // V1 legacy — toujours présents à 0 pour backward-compat
    iron: number; copper: number; coal: number; oil: number; herbs: number; fur: number;
    destination: 'bank' | 'pending';
  }>;
}

// ─── getOrInitPlayerBank ──────────────────────────────────────────────────────
// Lit ou initialise la banque du joueur. Retourne toujours un état valide.
export async function getOrInitPlayerBank(playerId: string): Promise<PlayerBankDTO> {
  const rows = await db.select().from(playerBank).where(eq(playerBank.playerId, playerId)).limit(1);
  function rowToDTO(r: typeof playerBank.$inferSelect): PlayerBankDTO {
    return {
      fracten:       r.fracten,            // Bloc B V2
      common_metals: r.common_metals ?? 0, // Bloc C V2
      leather_fur:   r.leather_fur   ?? 0, // Bloc C V2
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
              copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0,
              common_metals: 0, leather_fur: 0, // Bloc C V2
              lastProductionTurn: 0 })
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
      cityId:              cities.id,
      name:                cities.name,
      fractenPerTurn:      cities.fractenPerTurn,      // Bloc B V2
      foodPerTurn:         cities.foodPerTurn,
      woodPerTurn:         cities.woodPerTurn,
      stonePerTurn:        cities.stonePerTurn,
      // F4 V2 principal
      commonMetalsPerTurn: (cities as any).commonMetalsPerTurn,
      leatherFurPerTurn:   (cities as any).leatherFurPerTurn,
      // V1 legacy — fallback si V2 absent ou 0
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
  let bankFractenDelta      = 0; // Bloc B V2 — remplace bankGoldDelta
  let bankFoodDelta         = 0;
  let bankWoodDelta         = 0;
  let bankStoneDelta        = 0;
  // F4 V2 : common_metals + leather_fur remplacent iron/copper/fur comme production principale
  let bankCommonMetalsDelta = 0;
  let bankLeatherFurDelta   = 0;
  // Non-V2 restants (coal/oil/herbs inchangés)
  let bankCoalDelta         = 0;
  let bankOilDelta          = 0;
  let bankHerbsDelta        = 0;
  const now = new Date();

  for (const city of cityRows) {
    const g   = Number(city.fractenPerTurn ?? 0); // Bloc B V2 — fractenPerTurn
    const f   = Number(city.foodPerTurn    ?? 0);
    const w   = Number(city.woodPerTurn    ?? 0);
    const s   = Number(city.stonePerTurn   ?? 0);
    const co  = Number(city.coalPerTurn    ?? 0);
    const oil = Number(city.oilPerTurn     ?? 0);
    const herbs = Number(city.herbsPerTurn ?? 0);

    // F4 V2 : lire V2 en priorité, fallback V1 si V2 absent ou 0 (anti-double-comptage).
    const cmV2 = Number((city as any).commonMetalsPerTurn ?? 0);
    const lfV2 = Number((city as any).leatherFurPerTurn   ?? 0);
    const irV1 = Number(city.ironPerTurn   ?? 0);
    const cuV1 = Number(city.copperPerTurn ?? 0);
    const furV1 = Number(city.furPerTurn   ?? 0);

    // Anti-double-comptage : V2 prioritaire, V1 fallback exclusif
    const cm = cmV2 > 0 ? cmV2 : (irV1 + cuV1); // common_metals effectif
    const lf = lfV2 > 0 ? lfV2 : furV1;          // leather_fur effectif

    if (g === 0 && f === 0 && w === 0 && s === 0 && cm === 0
        && lf === 0 && co === 0 && oil === 0 && herbs === 0) continue;

    const hasBank = cityHasBank.get(city.cityId) === true;

    if (hasBank) {
      bankFractenDelta      += g; // Bloc B V2
      bankFoodDelta         += f;
      bankWoodDelta         += w;
      bankStoneDelta        += s;
      bankCommonMetalsDelta += cm; // F4 V2
      bankLeatherFurDelta   += lf; // F4 V2
      bankCoalDelta         += co;
      bankOilDelta          += oil;
      bankHerbsDelta        += herbs;
      results.push({ cityId: city.cityId, name: city.name, fracten: g, food: f, wood: w, stone: s,
        iron: 0, copper: 0, coal: co, oil, herbs, fur: 0,
        common_metals: cm, leather_fur: lf, destination: 'bank' }); // F4 V2
    } else {
      // Accumulation dans pending_harvest (UPSERT) — F4 V2 : common_metals + leather_fur.
      await db
        .insert(cityPendingHarvest)
        .values({
          cityId: city.cityId,
          gold: 0, fracten: g, food: f, wood: w, stone: s,
          iron: 0, copper: 0,
          common_metals: cm, leather_fur: lf,
          coal: co, oil, herbs, fur: 0,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({
          target: cityPendingHarvest.cityId,
          set: {
            fracten:       sql`${cityPendingHarvest.fracten} + ${g}`, // Bloc B V2
            food:          sql`${cityPendingHarvest.food}    + ${f}`,
            wood:          sql`${cityPendingHarvest.wood}    + ${w}`,
            stone:         sql`${cityPendingHarvest.stone}   + ${s}`,
            // F4 V2 : common_metals + leather_fur (ne plus écrire iron/copper/fur)
            common_metals: sql`${(cityPendingHarvest as any).common_metals} + ${cm}`,
            leather_fur:   sql`${(cityPendingHarvest as any).leather_fur}   + ${lf}`,
            coal:          sql`${cityPendingHarvest.coal}    + ${co}`,
            oil:           sql`${cityPendingHarvest.oil}     + ${oil}`,
            herbs:         sql`${cityPendingHarvest.herbs}   + ${herbs}`,
            updatedAt: now,
          } as any,
        });
      results.push({ cityId: city.cityId, name: city.name, fracten: g, food: f, wood: w, stone: s,
        iron: 0, copper: 0, coal: co, oil, herbs, fur: 0,
        common_metals: cm, leather_fur: lf, destination: 'pending' }); // F4 V2
    }
  }

  // Crédit banque joueur groupé + mise à jour garde de tour.
  // Bloc B V2 : fracten crédité dans playerBank.fracten, gold reste à 0 (V1 legacy).
  // F4 V2 : common_metals + leather_fur remplacent iron/copper/fur dans la banque.
  await db
    .insert(playerBank)
    .values({
      playerId,
      gold: 0, fracten: bankFractenDelta, food: bankFoodDelta, wood: bankWoodDelta,
      stone: bankStoneDelta, iron: 0, copper: 0,
      common_metals: bankCommonMetalsDelta, leather_fur: bankLeatherFurDelta,
      coal: bankCoalDelta, oil: bankOilDelta, herbs: bankHerbsDelta,
      fur: 0, lastProductionTurn: currentTurn, updatedAt: now,
    })
    .onConflictDoUpdate({
      target: playerBank.playerId,
      set: {
        fracten:            sql`${playerBank.fracten} + ${bankFractenDelta}`, // Bloc B V2
        food:               sql`${playerBank.food}   + ${bankFoodDelta}`,
        wood:               sql`${playerBank.wood}   + ${bankWoodDelta}`,
        stone:              sql`${playerBank.stone}  + ${bankStoneDelta}`,
        // F4 V2 : common_metals + leather_fur ; iron/copper/fur ne reçoivent plus de production
        common_metals:      sql`${(playerBank as any).common_metals} + ${bankCommonMetalsDelta}`,
        leather_fur:        sql`${(playerBank as any).leather_fur}   + ${bankLeatherFurDelta}`,
        coal:               sql`${playerBank.coal}   + ${bankCoalDelta}`,
        oil:                sql`${playerBank.oil}    + ${bankOilDelta}`,
        herbs:              sql`${playerBank.herbs}  + ${bankHerbsDelta}`,
        lastProductionTurn: currentTurn,
        updatedAt:          now,
      } as any,
    });

  const matLog = `+${bankFractenDelta}fr+${bankFoodDelta}f+${bankWoodDelta}w+${bankStoneDelta}s`
               + `+${bankCommonMetalsDelta}cm+${bankLeatherFurDelta}lf+${bankCoalDelta}co`
               + `+${bankOilDelta}oil+${bankHerbsDelta}herbs`;
  console.log(
    `[productionTick] player=${playerId} faction=${factionId ?? 'aucune'} tour=${currentTurn}` +
    ` villes=${cityRows.length} bank${matLog}` +
    ` pending=${results.filter(r => r.destination === 'pending').length} villes`
  );

  return { applied: true, cities: results };
}
