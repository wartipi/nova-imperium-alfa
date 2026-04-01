/**
 * Source unique de vérité pour les coûts de terrain hexagonal.
 * Importé par HexPathfinding.ts (client) et HexPathfindingServer.ts (serveur).
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
  desert: 3,
  caves: 3,
  tundra: 3,
  swamp: 4,
  mountains: 5,
  volcano: 8,
  shallow_water: 999,
  deep_water: 999,
};
