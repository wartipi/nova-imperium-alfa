import { eq, inArray, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { cities, colonies, factionMembers, cityBuildings, cityProduction, units } from "../shared/schema";
import { applyBuildingEffects } from "./buildingEffects";
import { UNIT_CATALOG } from "./unitCatalog";
import { canAccessColony } from "./ownershipService";

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
  // Phase 9 : gold par tour — calculé via recalculateCityEconomy, stocké en DB
  goldPerTurn:       number;
  // Phase 11 — Ownership canonique
  ownerType:        string;
  ownerPlayerId:    string | null;
  ownerPlayerName:  string | null;
  ownerFactionId:   number | null;
  ownerFactionName: string | null;
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
  guilde_des_marchands: {},  // Gate pour le marché des ressources (market_guilds)
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
    // Phase 9 : gold par tour (palace/market/courthouse)
    goldPerTurn:       city.goldPerTurn ?? 0,
    // Phase 11 — Ownership canonique
    ownerType:        colony.ownerType,
    ownerPlayerId:    colony.ownerPlayerId    ?? null,
    ownerPlayerName:  colony.ownerPlayerName  ?? null,
    ownerFactionId:   colony.ownerFactionId   ?? null,
    ownerFactionName: colony.ownerFactionName ?? null,
  };
}

// ─── checkCityAccess ──────────────────────────────────────────────────────────
// Phase 11 : utilise canAccessColony (ownership canonique) pour vérifier l'accès.
// ownerType='faction' → tout membre de la faction propriétaire a accès.
// ownerType='player'  → uniquement le joueur propriétaire.
export async function checkCityAccess(
  playerId: string,
  cityId:   number,
): Promise<{ cityRecord: typeof cities.$inferSelect; factionId: number; worldX: number; worldY: number } | { error: string; status: number }> {
  const cityRows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(cities.id, cityId));

  if (cityRows.length === 0) {
    return { error: "Ville introuvable", status: 404 };
  }

  const { city, colony } = cityRows[0];

  const hasAccess = await canAccessColony(playerId, colony);
  if (!hasAccess) {
    return { error: "Accès refusé à cette ville", status: 403 };
  }

  return {
    cityRecord: city,
    factionId:  colony.factionId,
    worldX:     colony.worldX,
    worldY:     colony.worldY,
  };
}

// ─── getMyCities ──────────────────────────────────────────────────────────────
// Phase 11 : retourne les villes dont l'owner canonique est la faction du joueur
// OU dont l'ownerPlayerId est le joueur lui-même.
export async function getMyCities(playerId: string): Promise<CityDTO[]> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  const factionId = memberRows.length > 0 ? memberRows[0].factionId : null;

  const whereClause = factionId
    ? or(
        eq(colonies.ownerFactionId, factionId),
        eq(colonies.ownerPlayerId, playerId),
      )
    : eq(colonies.ownerPlayerId, playerId);

  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(whereClause);

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
// Phase 11 : utilise canAccessColony (ownership canonique) pour vérifier l'accès.
export async function getCityByColony(
  playerId: string,
  colonyId: number,
): Promise<CityDTO | null | { error: string; status: number }> {
  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(cities.colonyId, colonyId));

  if (rows.length === 0) return null;

  const { city, colony } = rows[0];

  const hasAccess = await canAccessColony(playerId, colony);
  if (!hasAccess) {
    return { error: "Accès refusé à cette colonie", status: 403 };
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

// ─── ensureUnitsTable ─────────────────────────────────────────────────────────
// Bootstrap idempotent : crée la table units si absente et ajoute la colonne
// queued_by_player_id à city_production si absente (compat pré-migration).
export async function ensureUnitsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS units (
      id                 SERIAL PRIMARY KEY,
      owner_player_id    TEXT NOT NULL,
      city_id            INTEGER NOT NULL REFERENCES cities(id),
      unit_type          TEXT NOT NULL,
      name               TEXT NOT NULL,
      world_x            INTEGER NOT NULL,
      world_y            INTEGER NOT NULL,
      attack             INTEGER NOT NULL,
      defense            INTEGER NOT NULL,
      health             INTEGER NOT NULL,
      max_health         INTEGER NOT NULL,
      movement           INTEGER NOT NULL,
      movement_remaining INTEGER NOT NULL,
      experience         INTEGER NOT NULL DEFAULT 0,
      created_at         TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    ALTER TABLE city_production
    ADD COLUMN IF NOT EXISTS queued_by_player_id TEXT
  `);
}

// ─── setProduction ────────────────────────────────────────────────────────────
// UPSERT dans city_production — couvre démarrage ET mises à jour de progression.
export async function setProduction(
  cityId: number,
  data: { type: string; name: string; cost: number; progress: number },
  queuedByPlayerId?: string,
): Promise<void> {
  await db
    .insert(cityProduction)
    .values({
      cityId,
      productionType:     data.type,
      productionName:     data.name,
      productionCost:     data.cost,
      productionProgress: data.progress,
      queuedByPlayerId:   queuedByPlayerId ?? null,
    })
    .onConflictDoUpdate({
      target: cityProduction.cityId,
      set: {
        productionType:     data.type,
        productionName:     data.name,
        productionCost:     data.cost,
        productionProgress: data.progress,
        queuedByPlayerId:   queuedByPlayerId ?? null,
      },
    });
}

// ─── createProducedUnit ───────────────────────────────────────────────────────
// Crée une unité persistée à partir de la production complétée.
// Les stats viennent du catalogue serveur. strength n'est pas persisté.
export async function createProducedUnit(
  ownerPlayerId: string,
  cityId: number,
  cityWorldX: number,
  cityWorldY: number,
  unitType: string,
): Promise<number> {
  const stats = UNIT_CATALOG[unitType];
  if (!stats) throw new Error(`[createProducedUnit] Type inconnu : ${unitType}`);

  const [row] = await db
    .insert(units)
    .values({
      ownerPlayerId,
      cityId,
      unitType,
      name:              stats.name,
      worldX:            cityWorldX,
      worldY:            cityWorldY,
      attack:            stats.attack,
      defense:           stats.defense,
      health:            stats.health,
      maxHealth:         stats.health,
      movement:          stats.movement,
      movementRemaining: stats.movement,
      experience:        0,
    })
    .returning({ id: units.id });

  return row.id;
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
  completedUnits: { cityId: number; cityName: string; unitId: number; unitType: string; unitName: string }[];
}

export async function tickCityProduction(playerId: string): Promise<CityProductionTickResult> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  const factionId = memberRows.length > 0 ? memberRows[0].factionId : null;

  if (!factionId) {
    return { applied: false, progressed: [], completedBuildings: [], completedUnits: [] };
  }

  const whereClause = or(
    eq(colonies.ownerFactionId, factionId),
    eq(colonies.ownerPlayerId, playerId),
  );

  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(whereClause);

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
  const completedUnits: { cityId: number; cityName: string; unitId: number; unitType: string; unitName: string }[] = [];

  for (const { city, colony } of rows) {
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
        // Unité : résoudre le propriétaire, créer l'unité persistée, vider la file après succès.
        const owner = prod.queuedByPlayerId ?? playerId;
        if (!prod.queuedByPlayerId) {
          console.warn(`[tickCityProduction] queuedByPlayerId absent sur ${city.name}/${prod.productionName} — fallback transitoire sur playerId (ligne pré-migration)`);
        }
        const stats = UNIT_CATALOG[prod.productionName];
        if (!stats) {
          console.warn(`[tickCityProduction] Type d'unité inconnu : ${prod.productionName} — production ignorée`);
          await clearProduction(city.id);
        } else {
          const unitId = await createProducedUnit(owner, city.id, colony.worldX, colony.worldY, prod.productionName);
          await clearProduction(city.id);
          completedUnits.push({
            cityId:   city.id,
            cityName: city.name,
            unitId,
            unitType: prod.productionName,
            unitName: stats.name,
          });
          console.log(`[tickCityProduction] ${city.name} → ${stats.name} (id=${unitId}) créé pour ${owner}`);
        }
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
