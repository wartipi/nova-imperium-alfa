// Action Points generation system for buildings
// This system defines how buildings generate Action Points over time

export interface BuildingActionPointsGeneration {
  // Action Points generated per turn by each building type
  buildingGeneration: Record<string, number>;
  
  // Calculate total AP generation from all buildings
  calculateTotalGeneration: (buildings: string[]) => number;
  
  // Special buildings that increase max Action Points
  maxActionPointsIncrease: Record<string, number>;
}

export const AP_GENERATION: BuildingActionPointsGeneration = {
  // Action Points generated per turn by each building type
  buildingGeneration: {
    // Transport/Commercial buildings - Generate AP through trade and logistics
    'port': 3,
    'market': 2,
    'road': 1,
    'shipyard': 2,
    
    // Agriculture/Nature buildings - Generate AP through efficient resource management
    'farm': 1,
    'sawmill': 1,
    'garden': 1,
    
    // Defense/Military buildings - Generate AP through military organization
    'fortress': 4,
    'watchtower': 2,
    'fortifications': 3,
    
    // Culture/Knowledge buildings - Generate AP through strategic planning
    'library': 5,
    'temple': 3,
    'sanctuary': 4,
    'obelisk': 2,
    
    // Magic/Special buildings - Generate significant AP through magical means
    'mystic_portal': 8,
    'legendary_forge': 6,
    'laboratory': 7,
    
    // Ancient/Ruins buildings - Generate AP through ancient knowledge
    'ancient_hall': 5,
    'underground_base': 4,
    'cave_dwelling': 2
  },
  
  // Buildings that increase maximum Action Points capacity
  maxActionPointsIncrease: {
    'library': 10,
    'ancient_hall': 15,
    'mystic_portal': 20,
    'legendary_forge': 15,
    'laboratory': 12,
    'sanctuary': 8
  },
  
  // Calculate total AP generation from all buildings
  calculateTotalGeneration: (buildings: string[]): number => {
    return buildings.reduce((total, building) => {
      return total + (AP_GENERATION.buildingGeneration[building] || 0);
    }, 0);
  }
};

// Helper function to get AP generation for a specific building
export const getBuildingAPGeneration = (buildingType: string): number => {
  return AP_GENERATION.buildingGeneration[buildingType] || 0;
};

// Helper function to get max AP increase for a building
export const getBuildingMaxAPIncrease = (buildingType: string): number => {
  return AP_GENERATION.maxActionPointsIncrease[buildingType] || 0;
};

// Helper function to calculate total max AP increase from buildings
export const calculateMaxAPIncrease = (buildings: string[]): number => {
  return buildings.reduce((total, building) => {
    return total + getBuildingMaxAPIncrease(building);
  }, 0);
};