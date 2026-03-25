import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { cities, colonies, factionMembers, cityBuildings, cityProduction } from "../shared/schema";

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
// Catalogue canonique des bonus économiques Phase 8 (food + production uniquement).
// Source de vérité unique — remplace les catalogues locaux des composants client.
const BUILDING_YIELDS: Record<string, { food?: number; production?: number }> = {
  palace:     {},
  granary:    { food: 2 },
  library:    {},
  barracks:   { production: 1 },
  market:     {},
  temple:     {},
  courthouse: {},
  university: {},
};

// ─── recalculateCityEconomy ───────────────────────────────────────────────────
// Recalcule et persiste food_per_turn + production_per_turn d'une ville.
// Déclenché après addBuilding() et createCityForColony().
// Formule : base (2,1) + somme des yields des bâtiments terminés.
async function recalculateCityEconomy(cityId: number): Promise<void> {
  const buildingRows = await db
    .select({ building: cityBuildings.building })
    .from(cityBuildings)
    .where(eq(cityBuildings.cityId, cityId));

  const base = { food: 2, production: 1 };

  const totals = buildingRows.reduce(
    (acc, { building }) => {
      const y = BUILDING_YIELDS[building] ?? {};
      acc.food       += y.food       ?? 0;
      acc.production += y.production ?? 0;
      return acc;
    },
    { ...base },
  );

  await db
    .update(cities)
    .set({ foodPerTurn: totals.food, productionPerTurn: totals.production })
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
): Promise<{ cityRecord: typeof cities.$inferSelect; factionId: number } | { error: string; status: number }> {
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

  return { cityRecord: cityRows[0].city, factionId };
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
