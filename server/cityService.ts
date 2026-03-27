import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { cities, colonies, factionMembers, cityBuildings, cityProduction } from "../shared/schema";
import { applyBuildingEffects } from "./buildingEffects";

export interface CityProductionDTO {
  type:     string;
  name:     string;
  cost:     number;
  progress: number;
}

export interface CityDTO {
  id:               number;   // cities.id — PK Phase 7 (correction : was colonyId in Phase 6)
  colonyId:         number;   // colonies.id — champ distinct depuis Phase 7
  name:             string;
  displayName:      string | null;
  population:       number;
  worldX:           number;
  worldY:           number;
  factionId:        number;
  factionName:      string;
  founderName:      string;
  createdAt:        string;
  buildings:         string[];           // Phase 7 : bâtiments terminés
  currentProduction: CityProductionDTO | null; // Phase 7 : production courante
  // Phase 8 : valeurs économiques calculées serveur (base + bonus bâtiments)
  foodPerTurn:       number;
  productionPerTurn: number;
}

// ─── BUILDING_YIELDS ──────────────────────────────────────────────────────────
// Catalogue canonique des bonus économiques (food + production + gold).
// Phase 9 : gold ajouté — dépend uniquement des bâtiments (v1, sans population).
// Source de vérité unique — aucun catalogue parallèle côté client.
const BUILDING_YIELDS: Record<string, { food?: number; production?: number; gold?: number }> = {
  palace:     { gold: 1 },
  granary:    { food: 2 },
  library:    {},
  barracks:   { production: 1 },
  market:     { gold: 3 },
  temple:     {},
  courthouse: { gold: 1 },
  university: {},
  bank:       {},  // Présence détectée pour router la production vers player_bank
};

// ─── recalculateCityEconomy ───────────────────────────────────────────────────
// Recalcule et persiste food_per_turn + production_per_turn + gold_per_turn.
// Déclenché après addBuilding() — idempotent.
// Formule : base (food:2, production:1, gold:0) + somme des yields des bâtiments terminés.
// Phase 9 : gold_per_turn dépend uniquement des bâtiments (pas de la population en v1).
async function recalculateCityEconomy(cityId: number): Promise<void> {
  const buildingRows = await db
    .select({ building: cityBuildings.building })
    .from(cityBuildings)
    .where(eq(cityBuildings.cityId, cityId));

  const base = { food: 2, production: 1, gold: 0 };

  const totals = buildingRows.reduce(
    (acc, { building }) => {
      const y = BUILDING_YIELDS[building] ?? {};
      acc.food       += y.food       ?? 0;
      acc.production += y.production ?? 0;
      acc.gold       += y.gold       ?? 0;
      return acc;
    },
    { ...base },
  );

  await db
    .update(cities)
    .set({
      foodPerTurn:       totals.food,
      productionPerTurn: totals.production,
      goldPerTurn:       totals.gold,
    })
    .where(eq(cities.id, cityId));
}

function mapCity(
  city:       typeof cities.$inferSelect,
  colony:     typeof colonies.$inferSelect,
  buildings:  string[],
  production: typeof cityProduction.$inferSelect | null,
): CityDTO {
  return {
    id:                city.id,
    colonyId:          city.colonyId,
    name:              city.name,
    displayName:       city.displayName,
    population:        city.population,
    worldX:            colony.worldX,
    worldY:            colony.worldY,
    factionId:         colony.factionId,
    factionName:       colony.factionName,
    founderName:       colony.founderName,
    createdAt:         city.createdAt.toISOString(),
    buildings,
    currentProduction: production
      ? {
          type:     production.productionType,
          name:     production.productionName,
          cost:     production.productionCost,
          progress: production.productionProgress,
        }
      : null,
    // Phase 8 : valeurs économiques depuis la DB (calculées par recalculateCityEconomy)
    foodPerTurn:       city.foodPerTurn,
    productionPerTurn: city.productionPerTurn,
  };
}

// ─── checkCityAccess ──────────────────────────────────────────────────────────
// Vérifie que cityId (cities.id) appartient à la faction du joueur.
// Utilisé par toutes les routes Phase 7 qui ciblent une ville par son ID.
export async function checkCityAccess(
  playerId: string,
  cityId:   number,
): Promise<{ cityRecord: typeof cities.$inferSelect; factionId: number; worldX: number; worldY: number } | { error: string; status: number }> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) {
    return { error: "Vous n'appartenez à aucune faction", status: 403 };
  }

  const factionId = memberRows[0].factionId;

  const cityRows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(cities.id, cityId));

  if (cityRows.length === 0) {
    return { error: "Ville introuvable", status: 404 };
  }

  if (cityRows[0].colony.factionId !== factionId) {
    return { error: "Cette ville n'appartient pas à votre faction", status: 403 };
  }

  return {
    cityRecord: cityRows[0].city,
    factionId,
    worldX: cityRows[0].colony.worldX,
    worldY: cityRows[0].colony.worldY,
  };
}

// ─── getMyCities ──────────────────────────────────────────────────────────────
// Retourne les villes des colonies appartenant à la faction du joueur.
// Phase 7 : inclut les bâtiments (city_buildings) et la production courante (city_production).
export async function getMyCities(playerId: string): Promise<CityDTO[]> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) return [];

  const factionId = memberRows[0].factionId;

  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(colonies.factionId, factionId));

  if (rows.length === 0) return [];

  const cityIds = rows.map((r) => r.city.id);

  // Bâtiments construits pour toutes les villes de la faction
  const buildingRows = await db
    .select({ cityId: cityBuildings.cityId, building: cityBuildings.building })
    .from(cityBuildings)
    .where(inArray(cityBuildings.cityId, cityIds));

  // Productions en cours pour toutes les villes de la faction
  const productionRows = await db
    .select()
    .from(cityProduction)
    .where(inArray(cityProduction.cityId, cityIds));

  return rows.map((r) => {
    const cityId = r.city.id;
    const buildings = buildingRows
      .filter((b) => b.cityId === cityId)
      .map((b) => b.building);
    const production = productionRows.find((p) => p.cityId === cityId) ?? null;
    return mapCity(r.city, r.colony, buildings, production);
  });
}

// ─── getCityByColony ──────────────────────────────────────────────────────────
// Retourne la ville d'une colonie donnée (par colonies.id), si elle appartient à la faction du joueur.
export async function getCityByColony(
  playerId: string,
  colonyId: number,
): Promise<CityDTO | null | { error: string; status: number }> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) {
    return { error: "Vous n'appartenez à aucune faction", status: 403 };
  }

  const factionId = memberRows[0].factionId;

  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(cities.colonyId, colonyId));

  if (rows.length === 0) return null;

  const { city, colony } = rows[0];

  if (colony.factionId !== factionId) {
    return { error: "Cette colonie n'appartient pas à votre faction", status: 403 };
  }

  const buildingRows = await db
    .select({ building: cityBuildings.building })
    .from(cityBuildings)
    .where(eq(cityBuildings.cityId, city.id));

  const productionRows = await db
    .select()
    .from(cityProduction)
    .where(eq(cityProduction.cityId, city.id));

  return mapCity(city, colony, buildingRows.map((b) => b.building), productionRows[0] ?? null);
}

// ─── addBuilding ──────────────────────────────────────────────────────────────
// Insère un bâtiment dans city_buildings (idempotent via ON CONFLICT DO NOTHING).
// Phase 8 : déclenche un recalcul économique après l'insertion.
export async function addBuilding(cityId: number, building: string): Promise<void> {
  await db
    .insert(cityBuildings)
    .values({ cityId, building })
    .onConflictDoNothing();
  // Recalcul systématique — idempotent même si le bâtiment existait déjà.
  await recalculateCityEconomy(cityId);
}

// ─── setProduction ────────────────────────────────────────────────────────────
// UPSERT dans city_production — couvre démarrage ET mises à jour de progression.
export async function setProduction(
  cityId: number,
  data: { type: string; name: string; cost: number; progress: number },
): Promise<void> {
  await db
    .insert(cityProduction)
    .values({
      cityId,
      productionType:     data.type,
      productionName:     data.name,
      productionCost:     data.cost,
      productionProgress: data.progress,
    })
    .onConflictDoUpdate({
      target: cityProduction.cityId,
      set: {
        productionType:     data.type,
        productionName:     data.name,
        productionCost:     data.cost,
        productionProgress: data.progress,
      },
    });
}

// ─── clearProduction ──────────────────────────────────────────────────────────
// Supprime la ligne de production courante (idempotent — silencieux si absente).
export async function clearProduction(cityId: number): Promise<void> {
  await db
    .delete(cityProduction)
    .where(eq(cityProduction.cityId, cityId));
}

// ─── tickCityProduction ───────────────────────────────────────────────────────
// Avance la file de production de toutes les villes du joueur d'un tour.
// Source d'autorité unique : incrémente productionProgress côté serveur,
// complète le bâtiment ou l'unité si progress >= cost.
// Retourne un résumé structuré des complétions pour l'UI.
export interface CityProductionTickResult {
  applied: boolean;
  progressed: number[];  // cityIds dont la progression a avancé
  completedBuildings: { cityId: number; cityName: string; buildingId: string }[];
  completedUnits: { cityId: number }[];
}

export async function tickCityProduction(playerId: string): Promise<CityProductionTickResult> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) {
    return { applied: false, progressed: [], completedBuildings: [], completedUnits: [] };
  }

  const factionId = memberRows[0].factionId;

  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(colonies.factionId, factionId));

  if (rows.length === 0) {
    return { applied: true, progressed: [], completedBuildings: [], completedUnits: [] };
  }

  const cityIds = rows.map(r => r.city.id);

  const productionRows = await db
    .select()
    .from(cityProduction)
    .where(inArray(cityProduction.cityId, cityIds));

  const progressed: number[] = [];
  const completedBuildings: { cityId: number; cityName: string; buildingId: string }[] = [];
  const completedUnits: { cityId: number }[] = [];

  for (const { city } of rows) {
    const prod = productionRows.find(p => p.cityId === city.id);
    if (!prod) continue;

    const newProgress = prod.productionProgress + city.productionPerTurn;

    if (newProgress >= prod.productionCost) {
      if (prod.productionType === 'building') {
        // addBuilding : idempotent + recalcul économique inclus (foodPerTurn/productionPerTurn/goldPerTurn)
        await addBuilding(city.id, prod.productionName);
        // applyBuildingEffects : effets T1 d'exploitation (wood, stone, iron, copper, coal, oil, herbs, fur)
        await applyBuildingEffects(city.id, prod.productionName);
        await clearProduction(city.id);
        completedBuildings.push({ cityId: city.id, cityName: city.name, buildingId: prod.productionName });
        console.log(`[tickCityProduction] ${city.name} → ${prod.productionName} terminé`);
      } else {
        // Unité : juste vider la production (pas de table unit à mettre à jour ici)
        await clearProduction(city.id);
        completedUnits.push({ cityId: city.id });
        console.log(`[tickCityProduction] ${city.name} → unité ${prod.productionName} terminée`);
      }
    } else {
      await db
        .update(cityProduction)
        .set({ productionProgress: newProgress })
        .where(eq(cityProduction.cityId, city.id));
      progressed.push(city.id);
    }
  }

  return { applied: true, progressed, completedBuildings, completedUnits };
}
