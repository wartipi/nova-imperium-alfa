/**
 * Source unique de vérité pour les coûts de terrain hexagonal.
 * Importé par HexPathfinding.ts (client) et HexPathfindingServer.ts (serveur).
 *
 * Barème canonique décidé (BLOC 2a) :
 *   desert  = 2, swamp = 3, volcano = 8, tundra = 3.
 * Ne pas modifier ces valeurs sans décision d'équilibrage validée.
 */

export const IMPASSABLE = 999;

export const TERRAIN_COSTS: Record<string, number> = {
  fertile_land: 1,
  plains: 1,
  sacred_plains: 1,
  enchanted_meadow: 1,
  forest: 2,
  hills: 2,
  wasteland: 2,
  ancient_ruins: 2,
  desert: 2,
  caves: 3,
  tundra: 3,
  swamp: 3,
  mountains: 5,
  volcano: 8,
  shallow_water: IMPASSABLE,
  deep_water: IMPASSABLE,
};

// ─── Helpers partagés client/serveur ──────────────────────────────────────────

/**
 * Coût de déplacement brut d'un terrain.
 * Retourne 1 pour un terrain inconnu (affichage tolérant).
 */
export function getTerrainMovementCost(terrain: string): number {
  return TERRAIN_COSTS[terrain] ?? 1;
}

/**
 * Description textuelle du coût, avec le nombre de PA entre parenthèses.
 * Tranches :
 *   >= IMPASSABLE  →  "Impossible (nécessite un navire)"
 *   1              →  "Facile (1 PA)"
 *   2              →  "Modéré (2 PA)"
 *   3-4            →  "Difficile (X PA)"
 *   5-7            →  "Très difficile (X PA)"
 *   >= 8           →  "Extrêmement difficile (X PA)"
 */
export function getTerrainCostDescription(terrain: string): string {
  const cost = getTerrainMovementCost(terrain);
  if (cost >= IMPASSABLE) return 'Impossible (nécessite un navire)';
  if (cost === 1) return 'Facile (1 PA)';
  if (cost === 2) return 'Modéré (2 PA)';
  if (cost >= 3 && cost <= 4) return `Difficile (${cost} PA)`;
  if (cost >= 5 && cost <= 7) return `Très difficile (${cost} PA)`;
  return `Extrêmement difficile (${cost} PA)`;
}

/**
 * Emoji de difficulté associé au terrain.
 */
export function getTerrainDifficultyEmoji(terrain: string): string {
  const cost = getTerrainMovementCost(terrain);
  if (cost >= IMPASSABLE) return '🚫';
  if (cost === 1) return '🟢';
  if (cost === 2) return '🟡';
  if (cost >= 3 && cost <= 4) return '🟠';
  if (cost >= 5 && cost <= 7) return '🔴';
  return '⚫';
}

/**
 * Applique les réductions de coût basées sur le niveau d'exploration.
 * Extraite de HexPathfinding.ts pour être partageable client/serveur.
 * NE PAS MODIFIER les paliers sans décision d'équilibrage validée.
 */
export function applyExplorationReduction(baseCost: number, explorationLevel: number): number {
  // Pas de réduction pour l'eau (999) ou niveau 0-1
  if (baseCost >= IMPASSABLE || explorationLevel <= 1) {
    return baseCost;
  }

  // Niveau 2+ : Réduction sur terrains modérés (2-3 PA → 1-2 PA)
  if (explorationLevel >= 2 && baseCost >= 2 && baseCost <= 3) {
    return Math.max(1, baseCost - 1);
  }

  // Niveau 3+ : Réduction sur terrains difficiles (4-5 PA → 3-4 PA)
  if (explorationLevel >= 3 && baseCost >= 4 && baseCost <= 5) {
    return Math.max(1, baseCost - 1);
  }

  // Niveau 4+ : Réduction sur terrains extrêmes (>= 8 PA → moitié)
  if (explorationLevel >= 4 && baseCost >= 8) {
    return Math.max(1, Math.floor(baseCost / 2));
  }

  return baseCost;
}
