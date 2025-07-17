// Action Points cost system for Nova Imperium
// This file defines the cost in Action Points for various game actions

export interface ActionPointsCosts {
  // Construction costs
  buildings: Record<string, number>;
  
  // Unit movement costs (per tile)
  unitMovement: Record<string, number>;
  
  // Special actions
  exploration: number;
  diplomacy: number;
  research: number;
  
  // Distance-based costs
  calculateMovementCost: (distance: number, unitType: string) => number;
}

export const ACTION_COSTS: ActionPointsCosts = {
  // Building construction costs
  buildings: {
    // Transport/Commercial - Lower cost for trade infrastructure
    'port': 8,
    'market': 6,
    'road': 4,
    'shipyard': 10,
    
    // Agriculture/Nature - Moderate cost for basic infrastructure
    'farm': 5,
    'sawmill': 7,
    'garden': 4,
    
    // Defense/Military - Higher cost for strategic value
    'fortress': 15,
    'watchtower': 8,
    'fortifications': 12,
    
    // Culture/Knowledge - Moderate to high cost for advanced buildings
    'library': 10,
    'temple': 8,
    'sanctuary': 12,
    'obelisk': 6,
    
    // Magic/Special - Very high cost for powerful buildings
    'mystic_portal': 20,
    'legendary_forge': 25,
    'laboratory': 18,
    
    // Ancient/Ruins - High cost for mysterious structures
    'ancient_hall': 15,
    'underground_base': 20,
    'cave_dwelling': 10
  },
  
  // Unit movement costs per tile
  unitMovement: {
    'warrior': 2,
    'archer': 2,
    'settler': 3,
    'scout': 1,
    'spearman': 2,
    'swordsman': 3,
    'catapult': 4
  },
  
  // Special action costs
  exploration: 5,
  diplomacy: 3,
  research: 8,
  
  // Calculate movement cost based on distance and unit type
  calculateMovementCost: (distance: number, unitType: string): number => {
    const baseCost = ACTION_COSTS.unitMovement[unitType] || 2;
    const maxCost = baseCost * 5; // Maximum cost is 5x base cost
    return Math.min(baseCost * distance, maxCost);
  }
};

// Helper function to check if player has enough Action Points
export const canAffordAction = (currentAP: number, cost: number): boolean => {
  return currentAP >= cost;
};

// Helper function to get building cost
export const getBuildingCost = (buildingType: string): number => {
  return ACTION_COSTS.buildings[buildingType] || 10;
};

// Helper function to get unit movement cost
export const getUnitMovementCost = (unitType: string, distance: number): number => {
  return ACTION_COSTS.calculateMovementCost(distance, unitType);
};