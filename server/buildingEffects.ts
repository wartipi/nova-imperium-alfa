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
import { cities, mapTiles } from "../shared/schema";
import { eq, sql, and, gte, lte, isNotNull } from "drizzle-orm";

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
  oil_camp:         { oil: 2 },
};

// ─── BUILDING_TERRAIN_PREREQS ─────────────────────────────────────────────────
// Terrains requis par bâtiment (au moins 1 case de ce terrain dans le territoire).
// Seuls les bâtiments dont le terrain conditionne réellement l'exploitation.
// sawmill et granary : validés uniquement par terrain (pas de resource_type "wood").
export const BUILDING_TERRAIN_PREREQS: Record<string, string[]> = {
  sawmill:          ['forest'],
  hunting_post:     ['forest'],
  herbalist_house:  ['forest', 'enchanted_meadow', 'fertile_land', 'swamp', 'sacred_plains'],
  farm:             ['fertile_land'],
  granary:          ['fertile_land'],
  fishing_post:     ['shallow_water'],
  mine:             ['mountains', 'hills'],
  advanced_mine:    ['caves'],
  oil_camp:         ['swamp', 'desert', 'wasteland'],
};

// ─── BUILDING_RESOURCE_PREREQS ────────────────────────────────────────────────
// Ressources réelles (resource_type dans map_tiles) requises en plus du terrain.
// Bâtiments sans entrée ici : terrain seul suffit (ex : sawmill → forest).
// Note : "wood" n'existe pas comme resource_type en DB — sawmill validé par terrain uniquement.
export const BUILDING_RESOURCE_PREREQS: Record<string, string[]> = {
  hunting_post:     ['deer', 'fur'],
  herbalist_house:  ['herbs'],
  farm:             ['wheat', 'cattle'],
  fishing_post:     ['fish'],
  mine:             ['stone', 'iron', 'copper', 'coal'],
  advanced_mine:    ['iron', 'copper', 'coal'],
  oil_camp:         ['oil'],
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

// ─── getCityControlledTerrains ────────────────────────────────────────────────
// Retourne les terrainType distincts dans un rayon AABB autour de la colonie.
export async function getCityControlledTerrains(
  colonyWorldX: number,
  colonyWorldY: number,
  radius: number = 5,
): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ terrainType: mapTiles.terrainType })
    .from(mapTiles)
    .where(
      and(
        gte(mapTiles.worldX, colonyWorldX - radius),
        lte(mapTiles.worldX, colonyWorldX + radius),
        gte(mapTiles.worldY, colonyWorldY - radius),
        lte(mapTiles.worldY, colonyWorldY + radius),
      )
    );
  return new Set(rows.map(r => r.terrainType));
}

// ─── getCityControlledResources ───────────────────────────────────────────────
// Retourne les resource_type distincts (non nuls) dans un rayon AABB autour
// de la colonie. Lit la colonne resource_type de map_tiles (colonne directe,
// pas metadata — metadata est NULL en production actuelle).
export async function getCityControlledResources(
  colonyWorldX: number,
  colonyWorldY: number,
  radius: number = 5,
): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ resourceType: mapTiles.resourceType })
    .from(mapTiles)
    .where(
      and(
        gte(mapTiles.worldX, colonyWorldX - radius),
        lte(mapTiles.worldX, colonyWorldX + radius),
        gte(mapTiles.worldY, colonyWorldY - radius),
        lte(mapTiles.worldY, colonyWorldY + radius),
        isNotNull(mapTiles.resourceType),
      )
    );
  return new Set(rows.map(r => r.resourceType as string));
}

// ─── checkBuildingTerrainPrereq ───────────────────────────────────────────────
// null   → pas de prérequis terrain pour ce bâtiment (toujours OK)
// ok     → au moins 1 terrain compatible trouvé
// !ok    → terrain manquant
export function checkBuildingTerrainPrereq(
  buildingId: string,
  terrains:   Set<string>,
): { ok: true } | { ok: false; required: string[]; available: string[] } | null {
  const prereqs = BUILDING_TERRAIN_PREREQS[buildingId];
  if (!prereqs) return null;
  if (prereqs.some(t => terrains.has(t))) return { ok: true };
  return { ok: false, required: prereqs, available: [...terrains] };
}

// ─── checkBuildingResourcePrereq ──────────────────────────────────────────────
// null   → pas de prérequis ressource pour ce bâtiment (ex : sawmill)
// ok     → au moins 1 resource_type compatible dans le territoire
// !ok    → ressource absente
export function checkBuildingResourcePrereq(
  buildingId: string,
  resources:  Set<string>,
): { ok: true } | { ok: false; required: string[]; available: string[] } | null {
  const prereqs = BUILDING_RESOURCE_PREREQS[buildingId];
  if (!prereqs) return null;
  if (prereqs.some(r => resources.has(r))) return { ok: true };
  return { ok: false, required: prereqs, available: [...resources] };
}

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
