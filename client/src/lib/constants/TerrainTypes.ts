/**
 * Centralised terrain type definitions to avoid string duplication
 * and improve maintainability
 */
export const TerrainTypes = {
  // Water terrains
  SHALLOW_WATER: 'shallow_water',
  DEEP_WATER: 'deep_water',
  
  // Land terrains
  GRASSLAND: 'grassland',
  FOREST: 'forest',
  HILLS: 'hills',
  MOUNTAINS: 'mountains',
  DESERT: 'desert',
  WASTELAND: 'wasteland',
  FERTILE_LAND: 'fertile_land',
  ANCIENT_RUINS: 'ancient_ruins',
  VOLCANIC: 'volcanic',
  TUNDRA: 'tundra',
  SWAMP: 'swamp',
  OASIS: 'oasis'
} as const;

export type TerrainType = typeof TerrainTypes[keyof typeof TerrainTypes];

/**
 * Helper functions for terrain classification
 */
export const TerrainHelpers = {
  isWaterTerrain: (terrain: string): boolean => {
    return terrain === TerrainTypes.SHALLOW_WATER || terrain === TerrainTypes.DEEP_WATER;
  },
  
  isLandTerrain: (terrain: string): boolean => {
    return !TerrainHelpers.isWaterTerrain(terrain);
  },
  
  isWalkable: (terrain: string): boolean => {
    return TerrainHelpers.isLandTerrain(terrain);
  },
  
  getMovementCost: (terrain: string): number => {
    switch (terrain) {
      case TerrainTypes.GRASSLAND:
      case TerrainTypes.FERTILE_LAND:
      case TerrainTypes.OASIS:
        return 1;
      case TerrainTypes.FOREST:
      case TerrainTypes.HILLS:
      case TerrainTypes.SWAMP:
        return 2;
      case TerrainTypes.DESERT:
      case TerrainTypes.WASTELAND:
      case TerrainTypes.TUNDRA:
        return 3;
      case TerrainTypes.MOUNTAINS:
      case TerrainTypes.VOLCANIC:
        return 5;
      case TerrainTypes.ANCIENT_RUINS:
        return 2;
      case TerrainTypes.SHALLOW_WATER:
      case TerrainTypes.DEEP_WATER:
        return Number.MAX_SAFE_INTEGER; // Not walkable
      default:
        return 1;
    }
  }
};