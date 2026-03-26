// ─── buildingEffects.ts ───────────────────────────────────────────────────────
// Mapping statique : bâtiment d'exploitation → matériaux Tier 1 produits par tour.
// Utilisé par :
//   1. POST /api/cities/:cityId/buildings → incrément des *PerTurn en DB
//   2. applyProductionTickPerCity → lecture des *PerTurn depuis cities
//
// Clés = buildingId côté client (ConstructionPanel.tsx).
// Valeurs = { matériau: quantité_par_tour }.
// Seuls les matériaux Tier 1 logistiques sont présents ici.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "./db";
import { cities } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

export type T1Material = 'food' | 'wood' | 'stone' | 'iron' | 'copper' | 'coal' | 'oil' | 'herbs' | 'fur';

export type BuildingProduction = Partial<Record<T1Material, number>>;

export const BUILDING_PRODUCTION: Record<string, BuildingProduction> = {
  // ── Forêt ──────────────────────────────────────────────────────────────────
  sawmill:          { wood: 2 },
  hunting_post:     { fur: 1, food: 1 },
  herbalist_house:  { herbs: 2 },

  // ── Terre fertile ──────────────────────────────────────────────────────────
  farm:             { food: 3 },
  granary:          { food: 1 },

  // ── Eau ────────────────────────────────────────────────────────────────────
  fishing_post:     { food: 2 },

  // ── Montagnes / collines / cavernes ────────────────────────────────────────
  mine:             { stone: 1, iron: 1 },
  advanced_mine:    { iron: 2, copper: 1, coal: 1 },

  // ── Désert / marais / wasteland (huile) ────────────────────────────────────
  // Réservé pour futur bâtiment d'extraction (puits, camp d'exploitation).
};

// Colonnes cities affectées pour l'incrément/décrément production.
// Ordre canonique Tier 1.
export const T1_CITY_COLUMNS: Record<T1Material, string> = {
  food:   'food_per_turn',
  wood:   'wood_per_turn',
  stone:  'stone_per_turn',
  iron:   'iron_per_turn',
  copper: 'copper_per_turn',
  coal:   'coal_per_turn',
  oil:    'oil_per_turn',
  herbs:  'herbs_per_turn',
  fur:    'fur_per_turn',
};

// ─── applyBuildingEffects ─────────────────────────────────────────────────────
// Incrémente les colonnes *PerTurn de la ville selon le bâtiment posé.
// Appeler APRÈS addBuilding() pour chaque nouveau bâtiment.
export async function applyBuildingEffects(cityId: number, buildingId: string): Promise<void> {
  const prod = BUILDING_PRODUCTION[buildingId];
  if (!prod) return;

  const updates: Record<string, unknown> = {};
  if (prod.food)   updates.foodPerTurn   = sql`${cities.foodPerTurn}   + ${prod.food}`;
  if (prod.wood)   updates.woodPerTurn   = sql`${cities.woodPerTurn}   + ${prod.wood}`;
  if (prod.stone)  updates.stonePerTurn  = sql`${cities.stonePerTurn}  + ${prod.stone}`;
  if (prod.iron)   updates.ironPerTurn   = sql`${cities.ironPerTurn}   + ${prod.iron}`;
  if (prod.copper) updates.copperPerTurn = sql`${cities.copperPerTurn} + ${prod.copper}`;
  if (prod.coal)   updates.coalPerTurn   = sql`${cities.coalPerTurn}   + ${prod.coal}`;
  if (prod.oil)    updates.oilPerTurn    = sql`${cities.oilPerTurn}    + ${prod.oil}`;
  if (prod.herbs)  updates.herbsPerTurn  = sql`${cities.herbsPerTurn}  + ${prod.herbs}`;
  if (prod.fur)    updates.furPerTurn    = sql`${cities.furPerTurn}    + ${prod.fur}`;

  if (Object.keys(updates).length === 0) return;

  await db.update(cities).set(updates as any).where(eq(cities.id, cityId));
  console.log(`[buildingEffects] cityId=${cityId} building=${buildingId} → +PerTurn`, prod);
}
