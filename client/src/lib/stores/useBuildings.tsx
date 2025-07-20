import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface Building {
  id: string;
  name: string;
  type: string;
  ownerId: string; // player or AI id
  
  // Position
  x: number;
  y: number;
  
  // État
  isActive: boolean;
  constructionProgress: number; // 0-100
  isCompleted: boolean;
  health: number;
  maxHealth: number;
  
  // Production
  resourceProduction: { [resourceType: string]: number };
  unitProduction: string[]; // Types d'unités pouvant être produits
  
  // Coûts
  maintenanceCost: { [resourceType: string]: number };
  
  // Niveau et amélioration
  level: number;
  maxLevel: number;
  canUpgrade: boolean;
}

export interface BuildingType {
  id: string;
  name: string;
  description: string;
  
  // Stats de base
  baseHealth: number;
  maxLevel: number;
  
  // Coûts
  constructionCost: { [resourceType: string]: number };
  constructionTime: number;
  maintenanceCost: { [resourceType: string]: number };
  upgradeCost: { [resourceType: string]: number };
  
  // Production
  resourceProduction: { [resourceType: string]: number };
  unitProduction: string[];
  
  // Restrictions
  terrainRequirements?: string[];
  prerequisiteTechs?: string[];
  prerequisiteBuildings?: string[];
  maxPerPlayer?: number;
  
  // Capacités spéciales
  specialAbilities: string[];
}

interface BuildingsState {
  buildings: Map<string, Building>;
  buildingTypes: Map<string, BuildingType>;
  constructionQueue: Array<{
    buildingId: string;
    remainingTime: number;
  }>;
  
  // Actions de base
  addBuilding: (building: Building) => void;
  removeBuilding: (buildingId: string) => void;
  getBuilding: (buildingId: string) => Building | undefined;
  getBuildingsForPlayer: (playerId: string) => Building[];
  getBuildingAtPosition: (x: number, y: number) => Building | undefined;
  
  // Construction
  startConstruction: (typeId: string, ownerId: string, x: number, y: number) => string | null;
  completeConstruction: (buildingId: string) => void;
  cancelConstruction: (buildingId: string) => void;
  updateConstructionProgress: (buildingId: string, progress: number) => void;
  
  // Production
  processProduction: (playerId: string) => { [resourceType: string]: number };
  canProduceUnit: (buildingId: string, unitType: string) => boolean;
  startUnitProduction: (buildingId: string, unitType: string) => boolean;
  
  // Améliorations
  canUpgradeBuilding: (buildingId: string, availableResources: { [resourceType: string]: number }) => boolean;
  upgradeBuilding: (buildingId: string) => boolean;
  
  // Gestion
  repairBuilding: (buildingId: string, amount: number) => void;
  destroyBuilding: (buildingId: string) => void;
  toggleBuildingActive: (buildingId: string) => void;
  
  // Types de bâtiments
  registerBuildingType: (buildingType: BuildingType) => void;
  getBuildingType: (typeId: string) => BuildingType | undefined;
  getAvailableBuildingTypes: (playerId: string, availableTechs: string[]) => BuildingType[];
  
  // Validation
  canBuildAt: (typeId: string, x: number, y: number, terrain: string) => boolean;
  canAffordBuilding: (typeId: string, availableResources: { [resourceType: string]: number }) => boolean;
  
  // Statistiques
  getPlayerBuildingStats: (playerId: string) => {
    totalBuildings: number;
    buildingsByType: { [typeId: string]: number };
    totalProduction: { [resourceType: string]: number };
    totalMaintenanceCost: { [resourceType: string]: number };
  };
  
  // Files de construction
  getConstructionQueue: () => Array<{
    buildingId: string;
    remainingTime: number;
  }>;
  processConstructionQueue: () => void;
}

// Types de bâtiments prédéfinis pour Nova Imperium
const predefinedBuildingTypes: BuildingType[] = [
  {
    id: "house",
    name: "Habitation",
    description: "Logement de base qui augmente la limite de population",
    baseHealth: 100,
    maxLevel: 3,
    constructionCost: { wood: 50, stone: 30 },
    constructionTime: 3,
    maintenanceCost: { gold: 2 },
    upgradeCost: { wood: 30, stone: 20, gold: 50 },
    resourceProduction: {},
    unitProduction: [],
    specialAbilities: ["housing"]
  },
  {
    id: "farm",
    name: "Ferme",
    description: "Produit de la nourriture en continu",
    baseHealth: 80,
    maxLevel: 4,
    constructionCost: { wood: 40, gold: 60 },
    constructionTime: 4,
    maintenanceCost: { gold: 1 },
    upgradeCost: { wood: 25, gold: 40 },
    resourceProduction: { food: 15 },
    unitProduction: [],
    terrainRequirements: ["fertile_land", "grass"],
    specialAbilities: ["food_production"]
  },
  {
    id: "mine",
    name: "Mine",
    description: "Extrait des ressources minérales du sol",
    baseHealth: 120,
    maxLevel: 3,
    constructionCost: { wood: 80, stone: 60, gold: 100 },
    constructionTime: 6,
    maintenanceCost: { gold: 5 },
    upgradeCost: { stone: 50, gold: 80 },
    resourceProduction: { stone: 10, iron: 5 },
    unitProduction: [],
    terrainRequirements: ["hills", "mountains"],
    specialAbilities: ["mining"]
  },
  {
    id: "barracks",
    name: "Caserne",
    description: "Entraîne des unités militaires",
    baseHealth: 150,
    maxLevel: 4,
    constructionCost: { wood: 100, stone: 80, iron: 40, gold: 150 },
    constructionTime: 8,
    maintenanceCost: { gold: 8 },
    upgradeCost: { stone: 60, iron: 30, gold: 100 },
    resourceProduction: {},
    unitProduction: ["warrior", "scout"],
    prerequisiteTechs: ["military"],
    specialAbilities: ["unit_training", "military_boost"]
  },
  {
    id: "market",
    name: "Marché",
    description: "Centre commercial qui génère de l'or et permet le commerce",
    baseHealth: 100,
    maxLevel: 3,
    constructionCost: { wood: 60, stone: 40, gold: 120 },
    constructionTime: 5,
    maintenanceCost: { gold: 3 },
    upgradeCost: { stone: 40, gold: 80 },
    resourceProduction: { gold: 20 },
    unitProduction: ["trader"],
    specialAbilities: ["trade_boost", "resource_exchange"]
  },
  {
    id: "temple",
    name: "Temple",
    description: "Génère du mana et permet d'entraîner des mages",
    baseHealth: 120,
    maxLevel: 5,
    constructionCost: { stone: 100, gold: 200, mana: 50 },
    constructionTime: 10,
    maintenanceCost: { gold: 10, mana: 5 },
    upgradeCost: { stone: 80, gold: 150, mana: 40 },
    resourceProduction: { mana: 25, ancient_knowledge: 3 },
    unitProduction: ["mage"],
    prerequisiteTechs: ["magic"],
    maxPerPlayer: 3,
    specialAbilities: ["mana_generation", "magic_research"]
  },
  {
    id: "workshop",
    name: "Atelier",
    description: "Produit des équipements et permet d'entraîner des constructeurs",
    baseHealth: 100,
    maxLevel: 4,
    constructionCost: { wood: 80, stone: 60, iron: 30, gold: 100 },
    constructionTime: 6,
    maintenanceCost: { gold: 5 },
    upgradeCost: { stone: 50, iron: 25, gold: 75 },
    resourceProduction: {},
    unitProduction: ["builder"],
    prerequisiteTechs: ["engineering"],
    specialAbilities: ["equipment_crafting", "building_boost"]
  },
  {
    id: "tower",
    name: "Tour de Guet",
    description: "Tour défensive qui étend la vision et protège la zone",
    baseHealth: 200,
    maxLevel: 3,
    constructionCost: { stone: 120, iron: 50, gold: 180 },
    constructionTime: 7,
    maintenanceCost: { gold: 6 },
    upgradeCost: { stone: 80, iron: 40, gold: 120 },
    resourceProduction: {},
    unitProduction: [],
    prerequisiteTechs: ["fortification"],
    specialAbilities: ["vision_boost", "defense", "ranged_attack"]
  }
];

export const useBuildings = create<BuildingsState>()(
  subscribeWithSelector((set, get) => {
    // Initialiser avec les types prédéfinis
    const initialBuildingTypes = new Map<string, BuildingType>();
    predefinedBuildingTypes.forEach(type => {
      initialBuildingTypes.set(type.id, type);
    });
    
    return {
      buildings: new Map(),
      buildingTypes: initialBuildingTypes,
      constructionQueue: [],
      
      // Actions de base
      addBuilding: (building) => {
        set((state) => {
          const newBuildings = new Map(state.buildings);
          newBuildings.set(building.id, building);
          return { buildings: newBuildings };
        });
      },
      
      removeBuilding: (buildingId) => {
        set((state) => {
          const newBuildings = new Map(state.buildings);
          newBuildings.delete(buildingId);
          
          // Supprimer aussi de la file de construction si nécessaire
          const newQueue = state.constructionQueue.filter(item => item.buildingId !== buildingId);
          
          return { buildings: newBuildings, constructionQueue: newQueue };
        });
      },
      
      getBuilding: (buildingId) => {
        return get().buildings.get(buildingId);
      },
      
      getBuildingsForPlayer: (playerId) => {
        return Array.from(get().buildings.values()).filter(building => building.ownerId === playerId);
      },
      
      getBuildingAtPosition: (x, y) => {
        return Array.from(get().buildings.values()).find(building => building.x === x && building.y === y);
      },
      
      // Construction
      startConstruction: (typeId, ownerId, x, y) => {
        const buildingType = get().getBuildingType(typeId);
        if (!buildingType) return null;
        
        const building: Building = {
          id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: buildingType.name,
          type: typeId,
          ownerId,
          x,
          y,
          isActive: false,
          constructionProgress: 0,
          isCompleted: false,
          health: buildingType.baseHealth,
          maxHealth: buildingType.baseHealth,
          resourceProduction: { ...buildingType.resourceProduction },
          unitProduction: [...buildingType.unitProduction],
          maintenanceCost: { ...buildingType.maintenanceCost },
          level: 1,
          maxLevel: buildingType.maxLevel,
          canUpgrade: false
        };
        
        get().addBuilding(building);
        
        // Ajouter à la file de construction
        set((state) => ({
          constructionQueue: [
            ...state.constructionQueue,
            {
              buildingId: building.id,
              remainingTime: buildingType.constructionTime
            }
          ]
        }));
        
        return building.id;
      },
      
      completeConstruction: (buildingId) => {
        const building = get().getBuilding(buildingId);
        if (building) {
          set((state) => {
            const newBuildings = new Map(state.buildings);
            const completedBuilding = {
              ...building,
              isCompleted: true,
              isActive: true,
              constructionProgress: 100,
              canUpgrade: building.level < building.maxLevel
            };
            newBuildings.set(buildingId, completedBuilding);
            
            // Retirer de la file de construction
            const newQueue = state.constructionQueue.filter(item => item.buildingId !== buildingId);
            
            return { buildings: newBuildings, constructionQueue: newQueue };
          });
        }
      },
      
      cancelConstruction: (buildingId) => {
        get().removeBuilding(buildingId);
      },
      
      updateConstructionProgress: (buildingId, progress) => {
        const building = get().getBuilding(buildingId);
        if (building) {
          set((state) => {
            const newBuildings = new Map(state.buildings);
            const updatedBuilding = {
              ...building,
              constructionProgress: Math.min(100, Math.max(0, progress))
            };
            newBuildings.set(buildingId, updatedBuilding);
            return { buildings: newBuildings };
          });
          
          // Compléter automatiquement si 100%
          if (progress >= 100) {
            get().completeConstruction(buildingId);
          }
        }
      },
      
      // Production
      processProduction: (playerId) => {
        const playerBuildings = get().getBuildingsForPlayer(playerId);
        const totalProduction: { [resourceType: string]: number } = {};
        
        playerBuildings
          .filter(building => building.isCompleted && building.isActive)
          .forEach(building => {
            Object.entries(building.resourceProduction).forEach(([resource, amount]) => {
              // Appliquer les bonus de niveau
              const levelBonus = (building.level - 1) * 0.25; // +25% par niveau
              const finalAmount = Math.floor(amount * (1 + levelBonus));
              
              totalProduction[resource] = (totalProduction[resource] || 0) + finalAmount;
            });
          });
        
        return totalProduction;
      },
      
      canProduceUnit: (buildingId, unitType) => {
        const building = get().getBuilding(buildingId);
        return building ? building.isCompleted && building.isActive && building.unitProduction.includes(unitType) : false;
      },
      
      startUnitProduction: (buildingId, unitType) => {
        if (get().canProduceUnit(buildingId, unitType)) {
          // Cette logique sera intégrée avec le système d'unités
          console.log(`Starting production of ${unitType} in building ${buildingId}`);
          return true;
        }
        return false;
      },
      
      // Améliorations
      canUpgradeBuilding: (buildingId, availableResources) => {
        const building = get().getBuilding(buildingId);
        if (!building || !building.canUpgrade || building.level >= building.maxLevel) {
          return false;
        }
        
        const buildingType = get().getBuildingType(building.type);
        if (!buildingType) return false;
        
        return Object.entries(buildingType.upgradeCost).every(([resource, cost]) => {
          const totalCost = cost * building.level; // Coût croissant
          return (availableResources[resource] || 0) >= totalCost;
        });
      },
      
      upgradeBuilding: (buildingId) => {
        const building = get().getBuilding(buildingId);
        if (!building || building.level >= building.maxLevel) return false;
        
        set((state) => {
          const newBuildings = new Map(state.buildings);
          const upgradedBuilding = {
            ...building,
            level: building.level + 1,
            canUpgrade: building.level + 1 < building.maxLevel,
            health: building.maxHealth * 1.2, // +20% HP par niveau
            maxHealth: building.maxHealth * 1.2
          };
          
          // Améliorer la production
          Object.keys(upgradedBuilding.resourceProduction).forEach(resource => {
            upgradedBuilding.resourceProduction[resource] = Math.floor(
              upgradedBuilding.resourceProduction[resource] * 1.25 // +25% par niveau
            );
          });
          
          newBuildings.set(buildingId, upgradedBuilding);
          return { buildings: newBuildings };
        });
        
        return true;
      },
      
      // Gestion
      repairBuilding: (buildingId, amount) => {
        const building = get().getBuilding(buildingId);
        if (building) {
          set((state) => {
            const newBuildings = new Map(state.buildings);
            const repairedBuilding = {
              ...building,
              health: Math.min(building.maxHealth, building.health + amount)
            };
            newBuildings.set(buildingId, repairedBuilding);
            return { buildings: newBuildings };
          });
        }
      },
      
      destroyBuilding: (buildingId) => {
        get().removeBuilding(buildingId);
      },
      
      toggleBuildingActive: (buildingId) => {
        const building = get().getBuilding(buildingId);
        if (building && building.isCompleted) {
          set((state) => {
            const newBuildings = new Map(state.buildings);
            const toggledBuilding = {
              ...building,
              isActive: !building.isActive
            };
            newBuildings.set(buildingId, toggledBuilding);
            return { buildings: newBuildings };
          });
        }
      },
      
      // Types de bâtiments
      registerBuildingType: (buildingType) => {
        set((state) => {
          const newBuildingTypes = new Map(state.buildingTypes);
          newBuildingTypes.set(buildingType.id, buildingType);
          return { buildingTypes: newBuildingTypes };
        });
      },
      
      getBuildingType: (typeId) => {
        return get().buildingTypes.get(typeId);
      },
      
      getAvailableBuildingTypes: (playerId, availableTechs) => {
        const buildingTypes = Array.from(get().buildingTypes.values());
        
        return buildingTypes.filter(type => {
          // Vérifier les prérequis technologiques
          if (type.prerequisiteTechs) {
            const hasAllTechs = type.prerequisiteTechs.every(tech => availableTechs.includes(tech));
            if (!hasAllTechs) return false;
          }
          
          // Vérifier la limite par joueur
          if (type.maxPerPlayer) {
            const playerBuildings = get().getBuildingsForPlayer(playerId);
            const countOfType = playerBuildings.filter(building => building.type === type.id).length;
            if (countOfType >= type.maxPerPlayer) return false;
          }
          
          return true;
        });
      },
      
      // Validation
      canBuildAt: (typeId, x, y, terrain) => {
        const buildingType = get().getBuildingType(typeId);
        if (!buildingType) return false;
        
        // Vérifier s'il y a déjà un bâtiment ici
        const existingBuilding = get().getBuildingAtPosition(x, y);
        if (existingBuilding) return false;
        
        // Vérifier les exigences de terrain
        if (buildingType.terrainRequirements) {
          return buildingType.terrainRequirements.includes(terrain);
        }
        
        return true;
      },
      
      canAffordBuilding: (typeId, availableResources) => {
        const buildingType = get().getBuildingType(typeId);
        if (!buildingType) return false;
        
        return Object.entries(buildingType.constructionCost).every(([resource, cost]) => {
          return (availableResources[resource] || 0) >= cost;
        });
      },
      
      // Statistiques
      getPlayerBuildingStats: (playerId) => {
        const playerBuildings = get().getBuildingsForPlayer(playerId);
        const buildingsByType: { [typeId: string]: number } = {};
        const totalProduction: { [resourceType: string]: number } = {};
        const totalMaintenanceCost: { [resourceType: string]: number } = {};
        
        playerBuildings.forEach(building => {
          buildingsByType[building.type] = (buildingsByType[building.type] || 0) + 1;
          
          if (building.isCompleted && building.isActive) {
            Object.entries(building.resourceProduction).forEach(([resource, amount]) => {
              totalProduction[resource] = (totalProduction[resource] || 0) + amount;
            });
            
            Object.entries(building.maintenanceCost).forEach(([resource, cost]) => {
              totalMaintenanceCost[resource] = (totalMaintenanceCost[resource] || 0) + cost;
            });
          }
        });
        
        return {
          totalBuildings: playerBuildings.length,
          buildingsByType,
          totalProduction,
          totalMaintenanceCost
        };
      },
      
      // Files de construction
      getConstructionQueue: () => {
        return get().constructionQueue;
      },
      
      processConstructionQueue: () => {
        set((state) => {
          const newQueue = state.constructionQueue.map(item => ({
            ...item,
            remainingTime: Math.max(0, item.remainingTime - 1)
          }));
          
          // Compléter les bâtiments dont la construction est terminée
          newQueue.forEach(item => {
            if (item.remainingTime <= 0) {
              get().completeConstruction(item.buildingId);
            }
          });
          
          return {
            constructionQueue: newQueue.filter(item => item.remainingTime > 0)
          };
        });
      }
    };
  })
);