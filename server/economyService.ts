import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { cities, colonies, factionEconomy } from "../shared/schema";

// ─── Types publics ─────────────────────────────────────────────────────────────

export interface FactionIncomeDTO {
  foodPerTurn: number;
  goldPerTurn: number;
}

export interface FactionEconomyDTO {
  gold:               number;
  food:               number;
  lastProcessedTurn:  number;
  updatedAt:          string;
}

// ─── aggregateFactionIncome ───────────────────────────────────────────────────
// Somme food_per_turn + gold_per_turn sur toutes les villes de la faction.
// Jointure directe DB : cities → colonies (factionId).
// Ne passe pas par CityDTO ni par le client.
export async function aggregateFactionIncome(factionId: number): Promise<FactionIncomeDTO> {
  const rows = await db
    .select({
      totalFood: sql<number>`COALESCE(SUM(${cities.foodPerTurn}), 0)`,
      totalGold: sql<number>`COALESCE(SUM(${cities.goldPerTurn}), 0)`,
    })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(colonies.factionId, factionId));

  const row = rows[0];
  return {
    foodPerTurn: Number(row?.totalFood ?? 0),
    goldPerTurn: Number(row?.totalGold ?? 0),
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
      gold:              r.gold,
      food:              r.food,
      lastProcessedTurn: r.lastProcessedTurn,
      updatedAt:         r.updatedAt.toISOString(),
    };
  }

  // Initialisation paresseuse — première lecture pour cette faction.
  const [inserted] = await db
    .insert(factionEconomy)
    .values({ factionId, gold: 0, food: 0, lastProcessedTurn: 0 })
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
      gold:              retry.gold,
      food:              retry.food,
      lastProcessedTurn: retry.lastProcessedTurn,
      updatedAt:         retry.updatedAt.toISOString(),
    };
  }

  return {
    gold:              inserted.gold,
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

  // Application des revenus — v1 sans dépenses.
  const newGold = current.gold + income.goldPerTurn;
  const newFood = current.food + income.foodPerTurn;

  const now = new Date();

  await db
    .update(factionEconomy)
    .set({
      gold:              newGold,
      food:              newFood,
      lastProcessedTurn: currentTurn,
      updatedAt:         now,
    })
    .where(eq(factionEconomy.factionId, factionId));

  console.log(
    `[economyTick] faction=${factionId} tour=${currentTurn}` +
    ` +food=${income.foodPerTurn} +gold=${income.goldPerTurn}` +
    ` → stocks: food=${newFood} gold=${newGold}`
  );

  return {
    applied: true,
    economy: {
      gold:              newGold,
      food:              newFood,
      lastProcessedTurn: currentTurn,
      updatedAt:         now.toISOString(),
    },
  };
}
