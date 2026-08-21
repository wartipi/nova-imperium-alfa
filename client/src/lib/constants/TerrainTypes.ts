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
  
};