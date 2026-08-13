// ─── server/recruitmentService.ts ────────────────────────────────────────────
// V3-D5-B — Helpers serveur passifs pour recrutement multi-ressources.
//
// Ce fichier NE BRANCHE RIEN. Il expose des helpers réutilisables pour la
// future route start-recruitment (V3-D5-C). Aucun flux de recrutement actif
// n'appelle ces fonctions.
//
// Ressources autorisées pour les coûts de recrutement prototype :
//   food, wood, stone, common_metals, common_textiles, labor_contracts, basic_equipment
// Exclues délibérément : fracten, fuel, coal, oil, herbs, common_ingredients,
//   ressources rares, ressources legacy (iron/copper/fur/gold).
// ─────────────────────────────────────────────────────────────────────────────

import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { cityInventory } from "../shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecruitmentCostResource =
  | "food"
  | "wood"
  | "stone"
  | "common_metals"
  | "common_textiles"
  | "labor_contracts"
  | "basic_equipment";

export type RecruitmentResourceCost = Partial<Record<RecruitmentCostResource, number>>;

// ─── Constante canonique ──────────────────────────────────────────────────────

export const RECRUITMENT_COST_RESOURCES: readonly RecruitmentCostResource[] = [
  "food",
  "wood",
  "stone",
  "common_metals",
  "common_textiles",
  "labor_contracts",
  "basic_equipment",
] as const;

// ─── normalizeRecruitmentCost ─────────────────────────────────────────────────
// Valide et normalise un objet de coût de recrutement.
// - Ignore les clés non autorisées (silencieux).
// - Refuse les valeurs négatives ou non entières → throw Error.
// - Retire les entrées à 0 ou undefined.
// - Retourne un objet propre.
export function normalizeRecruitmentCost(cost: unknown): RecruitmentResourceCost {
  if (typeof cost !== "object" || cost === null || Array.isArray(cost)) {
    throw new Error("[normalizeRecruitmentCost] cost doit être un objet");
  }

  const raw = cost as Record<string, unknown>;
  const result: RecruitmentResourceCost = {};

  for (const key of RECRUITMENT_COST_RESOURCES) {
    const val = raw[key];
    if (val === undefined || val === null) continue;
    if (typeof val !== "number") {
      throw new Error(
        `[normalizeRecruitmentCost] ${key}: attendu number, reçu ${typeof val}`,
      );
    }
    if (!Number.isInteger(val)) {
      throw new Error(
        `[normalizeRecruitmentCost] ${key}: valeur non entière (${val})`,
      );
    }
    if (val < 0) {
      throw new Error(
        `[normalizeRecruitmentCost] ${key}: valeur négative (${val})`,
      );
    }
    if (val === 0) continue; // ignorer les zéros
    result[key] = val;
  }

  return result;
}

// ─── CityInventorySnapshot ────────────────────────────────────────────────────
// Vue limitée de city_inventory aux ressources de recrutement.
export interface CityInventorySnapshot {
  cityId:           number;
  food:             number;
  wood:             number;
  stone:            number;
  common_metals:    number;
  common_textiles:  number;
  labor_contracts:  number;
  basic_equipment:  number;
}

// ─── getCityInventoryForRecruitment ───────────────────────────────────────────
// Lit les stocks de recrutement depuis city_inventory.
// Si aucune ligne n'existe pour cette ville, retourne des stocks à 0.
// Ne crée pas de ligne — le caller doit s'assurer que city_inventory existe.
export async function getCityInventoryForRecruitment(
  cityId: number,
): Promise<CityInventorySnapshot> {
  const rows = await db
    .select()
    .from(cityInventory)
    .where(eq(cityInventory.cityId, cityId))
    .limit(1);

  const r = rows[0] ?? null;

  return {
    cityId,
    food:            r?.food            ?? 0,
    wood:            r?.wood            ?? 0,
    stone:           r?.stone           ?? 0,
    common_metals:   r?.common_metals   ?? 0,
    common_textiles: (r as any)?.common_textiles  ?? 0,
    labor_contracts: (r as any)?.labor_contracts  ?? 0,
    basic_equipment: (r as any)?.basic_equipment  ?? 0,
  };
}

// ─── AffordabilityResult ──────────────────────────────────────────────────────

export interface ResourceShortage {
  resource:  RecruitmentCostResource;
  required:  number;
  available: number;
  shortage:  number;
}

export interface AffordabilityResult {
  ok:      boolean;
  missing: ResourceShortage[];
}

// ─── canAffordRecruitmentCost ─────────────────────────────────────────────────
// Compare stock et coût de manière synchrone (ne throw jamais pour stock insuffisant).
// Retourne { ok: true, missing: [] } si tout est disponible.
// Retourne { ok: false, missing: [...] } avec le détail de chaque manque.
export function canAffordRecruitmentCost(
  inventory: CityInventorySnapshot,
  cost: RecruitmentResourceCost,
): AffordabilityResult {
  const missing: ResourceShortage[] = [];

  for (const resource of RECRUITMENT_COST_RESOURCES) {
    const required  = cost[resource] ?? 0;
    if (required === 0) continue;
    const available = inventory[resource] ?? 0;
    if (available < required) {
      missing.push({
        resource,
        required,
        available,
        shortage: required - available,
      });
    }
  }

  return { ok: missing.length === 0, missing };
}

// ─── DebitResult ─────────────────────────────────────────────────────────────

export interface DebitResult {
  ok:              true;
  debited:         RecruitmentResourceCost;
  inventoryBefore: CityInventorySnapshot;
}

// ─── debitCityInventoryForRecruitment ─────────────────────────────────────────
// Débite city_inventory de manière atomique et concurrence-safe.
//
// Comportement :
//   1. Normalise et valide le coût.
//   2. Lit l'inventaire (snapshot) pour produire des erreurs lisibles.
//   3. Vérifie canAffordRecruitmentCost → throw immédiat si manque évident.
//   4. UPDATE conditionnel avec garde SQL sur chaque colonne coûtée :
//        WHERE city_id = cityId
//          AND food >= cost.food   (si cost.food > 0)
//          AND wood >= cost.wood   (si cost.wood > 0)
//          ...
//      SET food = food - cost.food, ... (expressions SQL relatives)
//   5. Si l'UPDATE affecte 0 lignes (concurrence, double clic) :
//      → relit l'inventaire frais et throw INSUFFICIENT_CITY_INVENTORY avec détails.
//   6. Retourne DebitResult.
//
// Garantie de sécurité : deux requêtes concurrentes lisant le même stock ne
// peuvent pas toutes deux réussir l'UPDATE — la seconde trouvera un stock
// insuffisant dans la garde SQL et retournera 0 lignes.
export async function debitCityInventoryForRecruitment(
  cityId: number,
  rawCost: unknown,
): Promise<DebitResult> {
  const cost = normalizeRecruitmentCost(rawCost);

  // Aucune ressource à débiter → rien à faire
  const hasAnyCost = RECRUITMENT_COST_RESOURCES.some(r => (cost[r] ?? 0) > 0);
  if (!hasAnyCost) {
    const inventoryBefore = await getCityInventoryForRecruitment(cityId);
    return { ok: true, debited: cost, inventoryBefore };
  }

  // Snapshot pour erreur lisible (early check — cas commun)
  const inventoryBefore = await getCityInventoryForRecruitment(cityId);
  const earlyCheck = canAffordRecruitmentCost(inventoryBefore, cost);
  if (!earlyCheck.ok) {
    const detail = earlyCheck.missing
      .map(m => `${m.resource}: requis=${m.required} disponible=${m.available}`)
      .join(", ");
    const err = new Error(`INSUFFICIENT_CITY_INVENTORY: ${detail}`) as any;
    err.code    = "INSUFFICIENT_CITY_INVENTORY";
    err.missing = earlyCheck.missing;
    throw err;
  }

  // ── UPDATE conditionnel atomique ─────────────────────────────────────────────
  // SET : expressions SQL relatives (r = r - cost[r])
  const updates: Record<string, any> = { updatedAt: new Date() };
  if ((cost.food            ?? 0) > 0) updates.food            = sql`${cityInventory.food}            - ${cost.food!}`;
  if ((cost.wood            ?? 0) > 0) updates.wood            = sql`${cityInventory.wood}            - ${cost.wood!}`;
  if ((cost.stone           ?? 0) > 0) updates.stone           = sql`${cityInventory.stone}           - ${cost.stone!}`;
  if ((cost.common_metals   ?? 0) > 0) updates.common_metals   = sql`${cityInventory.common_metals}   - ${cost.common_metals!}`;
  if ((cost.common_textiles ?? 0) > 0) updates.common_textiles = sql`${cityInventory.common_textiles} - ${cost.common_textiles!}`;
  if ((cost.labor_contracts ?? 0) > 0) updates.labor_contracts = sql`${cityInventory.labor_contracts} - ${cost.labor_contracts!}`;
  if ((cost.basic_equipment ?? 0) > 0) updates.basic_equipment = sql`${cityInventory.basic_equipment} - ${cost.basic_equipment!}`;

  // WHERE : garde sur chaque colonne coûtée → stock doit encore être suffisant
  const whereConditions = [eq(cityInventory.cityId, cityId)];
  if ((cost.food            ?? 0) > 0) whereConditions.push(gte(cityInventory.food,            cost.food!));
  if ((cost.wood            ?? 0) > 0) whereConditions.push(gte(cityInventory.wood,            cost.wood!));
  if ((cost.stone           ?? 0) > 0) whereConditions.push(gte(cityInventory.stone,           cost.stone!));
  if ((cost.common_metals   ?? 0) > 0) whereConditions.push(gte(cityInventory.common_metals,   cost.common_metals!));
  if ((cost.common_textiles ?? 0) > 0) whereConditions.push(gte((cityInventory as any).common_textiles, cost.common_textiles!));
  if ((cost.labor_contracts ?? 0) > 0) whereConditions.push(gte((cityInventory as any).labor_contracts, cost.labor_contracts!));
  if ((cost.basic_equipment ?? 0) > 0) whereConditions.push(gte((cityInventory as any).basic_equipment, cost.basic_equipment!));

  const updated = await db
    .update(cityInventory)
    .set(updates)
    .where(and(...whereConditions))
    .returning({ cityId: cityInventory.cityId });

  // ── 0 lignes affectées → concurrence ou stock épuisé entre la lecture et l'UPDATE
  if (updated.length === 0) {
    const freshInventory = await getCityInventoryForRecruitment(cityId);
    const freshCheck     = canAffordRecruitmentCost(freshInventory, cost);
    const detail = freshCheck.missing.length > 0
      ? freshCheck.missing
          .map(m => `${m.resource}: requis=${m.required} disponible=${m.available}`)
          .join(", ")
      : "stock modifié par une opération concurrente";
    const err = new Error(`INSUFFICIENT_CITY_INVENTORY: ${detail}`) as any;
    err.code    = "INSUFFICIENT_CITY_INVENTORY";
    err.missing = freshCheck.missing;
    throw err;
  }

  return { ok: true, debited: cost, inventoryBefore };
}

// ─── RUNTIME_RECRUITMENT_COSTS ────────────────────────────────────────────────
// Coûts multi-ressources temporaires pour les unités runtime actuelles
// (IDs de server/unitCatalog.ts). Ces coûts sont des valeurs de prototype
// non équilibrées — elles seront remplacées en V3-D5-E quand les LandUnitId
// du catalogue design seront branchés.
//
// Ressources autorisées : food, wood, stone, common_metals,
//   common_textiles, labor_contracts, basic_equipment.
// Exclues : fracten, coal, oil, herbs et ressources rares.
export interface RuntimeRecruitmentEntry {
  cost:     RecruitmentResourceCost;
  /** Durée de production en tours (= productionCost dans city_production). */
  duration: number;
}

export const RUNTIME_RECRUITMENT_COSTS: Record<string, RuntimeRecruitmentEntry> = {
  // ── Infanterie ─────────────────────────────────────────────────────────────
  warrior:   { duration: 2, cost: { food: 2, labor_contracts: 1, basic_equipment: 1 } },
  spearman:  { duration: 2, cost: { food: 2, wood: 1, common_metals: 1, labor_contracts: 1, basic_equipment: 1 } },
  swordsman: { duration: 3, cost: { food: 3, common_metals: 2, labor_contracts: 1, basic_equipment: 2 } },
  // ── Distance ───────────────────────────────────────────────────────────────
  archer:      { duration: 2, cost: { food: 2, wood: 1, common_textiles: 1, labor_contracts: 1 } },
  crossbowman: { duration: 3, cost: { food: 2, wood: 1, common_metals: 1, common_textiles: 1, labor_contracts: 1, basic_equipment: 1 } },
  // ── Siège ──────────────────────────────────────────────────────────────────
  catapult:  { duration: 4, cost: { wood: 4, common_metals: 3, stone: 2, labor_contracts: 2, basic_equipment: 2 } },
  trebuchet: { duration: 5, cost: { wood: 5, common_metals: 4, stone: 3, labor_contracts: 3, basic_equipment: 3 } },
  // ── Cavalerie ──────────────────────────────────────────────────────────────
  horseman: { duration: 3, cost: { food: 4, common_metals: 2, labor_contracts: 1, basic_equipment: 1 } },
  knight:   { duration: 4, cost: { food: 5, common_metals: 4, labor_contracts: 2, basic_equipment: 3 } },
  // ── Marine ─────────────────────────────────────────────────────────────────
  galley:   { duration: 3, cost: { wood: 4, common_metals: 2, food: 2, labor_contracts: 2, basic_equipment: 1 } },
  warship:  { duration: 4, cost: { wood: 6, common_metals: 4, food: 3, labor_contracts: 3, basic_equipment: 2 } },
  // ── Spécial ────────────────────────────────────────────────────────────────
  scout:    { duration: 1, cost: { food: 1, labor_contracts: 1 } },
  settler:  { duration: 3, cost: { food: 5, wood: 3, stone: 2, common_metals: 2, labor_contracts: 2 } },
  diplomat: { duration: 2, cost: { food: 2, common_textiles: 1, labor_contracts: 2 } },
  spy:      { duration: 2, cost: { food: 2, common_textiles: 1, labor_contracts: 2, basic_equipment: 1 } },
};

// ─── previewRecruitmentCostPayment ────────────────────────────────────────────
// Retourne une comparaison coût/stock sans aucun débit.
// Utile pour que la future route preview-recruitment retourne l'affordabilité
// sans modifier l'état.
export interface RecruitmentCostPreview {
  cityId:          number;
  cost:            RecruitmentResourceCost;
  inventory:       CityInventorySnapshot;
  affordability:   AffordabilityResult;
}

export async function previewRecruitmentCostPayment(
  cityId: number,
  rawCost: unknown,
): Promise<RecruitmentCostPreview> {
  const cost      = normalizeRecruitmentCost(rawCost);
  const inventory = await getCityInventoryForRecruitment(cityId);
  return {
    cityId,
    cost,
    inventory,
    affordability: canAffordRecruitmentCost(inventory, cost),
  };
}
