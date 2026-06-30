// ─── buildingEffects.ts ───────────────────────────────────────────────────────
// Mapping statique : bâtiment d'exploitation → matériaux Tier 1 produits par tour.
// Utilisé par :
//   1. POST /api/cities/:cityId/buildings → incrément des *PerTurn en DB
//   2. applyProductionTickPerCity → lecture des *PerTurn depuis cities
//
// Clés = buildingId côté client (ConstructionPanel.tsx).
// Valeurs = { matériau: quantité_par_tour }.
// Seuls les matériaux Tier 1 logistiques sont présents ici.
//
// F4 V2 : iron + copper → common_metals, fur → leather_fur
// Les colonnes V1 (iron_per_turn, copper_per_turn, fur_per_turn) sont conservées
// mais ne sont plus la source principale de production.
// ─────────────────────────────────────────────────────────────────────────────

import { db, pool } from "./db";
import { cities, mapTiles } from "../shared/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

// F4 V2 : common_metals remplace iron+copper, leather_fur remplace fur.
// Les V1 (iron, copper, fur) sont conservés comme types legacy pour backward-compat.
export type T1Material =
  | 'food' | 'wood' | 'stone' | 'coal' | 'oil' | 'herbs'
  // V2 principal F4
  | 'common_metals' | 'leather_fur'
  // V1 legacy (backward-compat uniquement — ne plus utiliser dans BUILDING_PRODUCTION)
  | 'iron' | 'copper' | 'fur';

export type BuildingProduction = Partial<Record<T1Material, number>>;

// F4 V2 : productions V2 uniquement.
// mine : stone + common_metals (remplace iron).
// advanced_mine : common_metals (remplace iron+copper) + coal.
// hunting_post : leather_fur (remplace fur) + food.
export const BUILDING_PRODUCTION: Record<string, BuildingProduction> = {
  // ── Forêt ──────────────────────────────────────────────────────────────────
  sawmill:          { wood: 2 },
  hunting_post:     { leather_fur: 1, food: 1 }, // F4 V2 : fur → leather_fur
  herbalist_house:  { herbs: 2 },

  // ── Terre fertile ──────────────────────────────────────────────────────────
  farm:             { food: 3 },
  granary:          { food: 1 },

  // ── Eau ────────────────────────────────────────────────────────────────────
  fishing_post:     { food: 2 },

  // ── Montagnes / collines / cavernes ────────────────────────────────────────
  mine:             { stone: 1, common_metals: 1 }, // F4 V2 : iron → common_metals
  advanced_mine:    { common_metals: 3, coal: 1 },  // F4 V2 : iron+copper → common_metals

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
// F4 V2 : common_metals → common_metals_per_turn, leather_fur → leather_fur_per_turn.
// V1 legacy (iron, copper, fur) conservés pour backward-compat.
export const T1_CITY_COLUMNS: Record<T1Material, string> = {
  food:          'food_per_turn',
  wood:          'wood_per_turn',
  stone:         'stone_per_turn',
  // F4 V2 principal
  common_metals: 'common_metals_per_turn',
  leather_fur:   'leather_fur_per_turn',
  coal:          'coal_per_turn',
  oil:           'oil_per_turn',
  herbs:         'herbs_per_turn',
  // V1 legacy — conservés pour bâtiments existants pré-F4
  iron:          'iron_per_turn',
  copper:        'copper_per_turn',
  fur:           'fur_per_turn',
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
// Retourne l'ensemble COMPLET des ressources présentes dans le territoire :
//   1. Lit metadata->'resources' (jsonb array) quand disponible — multi-ressource réel
//   2. Fallback sur resource_type pour les tuiles sans metadata
// Requête SQL raw pour l'expansion jsonb_array_elements_text.
export async function getCityControlledResources(
  colonyWorldX: number,
  colonyWorldY: number,
  radius: number = 5,
): Promise<Set<string>> {
  const xMin = colonyWorldX - radius;
  const xMax = colonyWorldX + radius;
  const yMin = colonyWorldY - radius;
  const yMax = colonyWorldY + radius;

  const result = await pool.query<{ resource: string }>(`
    SELECT DISTINCT resource FROM (
      -- Tuiles avec metadata.resources : on lit tous les éléments de l'array jsonb
      SELECT jsonb_array_elements_text(metadata->'resources') AS resource
      FROM map_tiles
      WHERE world_x BETWEEN $1 AND $2
        AND world_y BETWEEN $3 AND $4
        AND metadata IS NOT NULL
        AND metadata ? 'resources'
      UNION
      -- Fallback : tuiles sans metadata → resource_type primaire
      SELECT resource_type AS resource
      FROM map_tiles
      WHERE world_x BETWEEN $1 AND $2
        AND world_y BETWEEN $3 AND $4
        AND resource_type IS NOT NULL
        AND (metadata IS NULL OR NOT (metadata ? 'resources'))
    ) sub
    WHERE resource IS NOT NULL
  `, [xMin, xMax, yMin, yMax]);

  return new Set(result.rows.map(r => r.resource));
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
// F4 V2 : common_metals → cities.commonMetalsPerTurn, leather_fur → cities.leatherFurPerTurn.
// V1 legacy : iron/copper/fur conservés pour bâtiments pré-F4 seulement.
export async function applyBuildingEffects(cityId: number, buildingId: string): Promise<void> {
  const prod = BUILDING_PRODUCTION[buildingId];
  if (!prod) return;

  const updates: Record<string, unknown> = {};
  if (prod.food)          updates.foodPerTurn          = sql`${cities.foodPerTurn}          + ${prod.food}`;
  if (prod.wood)          updates.woodPerTurn          = sql`${cities.woodPerTurn}          + ${prod.wood}`;
  if (prod.stone)         updates.stonePerTurn         = sql`${cities.stonePerTurn}         + ${prod.stone}`;
  // F4 V2 principal
  if (prod.common_metals) updates.commonMetalsPerTurn  = sql`${(cities as any).commonMetalsPerTurn} + ${prod.common_metals}`;
  if (prod.leather_fur)   updates.leatherFurPerTurn    = sql`${(cities as any).leatherFurPerTurn}   + ${prod.leather_fur}`;
  if (prod.coal)          updates.coalPerTurn          = sql`${cities.coalPerTurn}          + ${prod.coal}`;
  if (prod.oil)           updates.oilPerTurn           = sql`${cities.oilPerTurn}           + ${prod.oil}`;
  if (prod.herbs)         updates.herbsPerTurn         = sql`${cities.herbsPerTurn}         + ${prod.herbs}`;
  // G4 : branches V1 iron/copper/fur supprimées — BUILDING_PRODUCTION ne contient que V2 depuis F4.
  // ironPerTurn/copperPerTurn/furPerTurn ne reçoivent plus de production.

  if (Object.keys(updates).length === 0) return;

  await db.update(cities).set(updates as any).where(eq(cities.id, cityId));
  console.log(`[buildingEffects] cityId=${cityId} building=${buildingId} → +PerTurn`, prod);
}
