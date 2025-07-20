import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface Unit {
  id: string;
  name: string;
  type: string;
  ownerId: string; // player or AI id
  
  // Position
  x: number;
  y: number;
  
  // Stats
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  movement: number;
  movementRemaining: number;
  
  // État
  canAct: boolean;
  canMove: boolean;
  isSelected: boolean;
  
  // Expérience et niveau
  experience: number;
  level: number;
  
  // Capacités spéciales
  abilities: string[];
  equipment?: string[];
}

export interface UnitType {
  id: string;
  name: string;
  description: string;
  
  // Stats de base
  baseHealth: number;
  baseAttack: number;
  baseDefense: number;
  baseMovement: number;
  
  // Coûts
  recruitmentCost: { [resourceType: string]: number };
  recruitmentTime: number;
  maintenanceCost: { [resourceType: string]: number };
  
  // Capacités
  abilities: string[];
  canBuild: boolean;
  canExplore: boolean;
  canTrade: boolean;
  
  // Restrictions
  terrainRestrictions?: string[];
  prerequisiteTechs?: string[];
}

interface UnitsState {
  units: Map<string, Unit>;
  unitTypes: Map<string, UnitType>;
  selectedUnitId: string | null;
  
  // Actions de base
  addUnit: (unit: Unit) => void;
  removeUnit: (unitId: string) => void;
  getUnit: (unitId: string) => Unit | undefined;
  getUnitsForPlayer: (playerId: string) => Unit[];
  getUnitsAtPosition: (x: number, y: number) => Unit[];
  
  // Actions de sélection
  selectUnit: (unitId: string) => void;
  deselectUnit: () => void;
  getSelectedUnit: () => Unit | undefined;
  
  // Actions de mouvement
  moveUnit: (unitId: string, targetX: number, targetY: number) => boolean;
  canMoveToPosition: (unitId: string, targetX: number, targetY: number) => boolean;
  getMovementRange: (unitId: string) => { x: number; y: number }[];
  
  // Actions de combat
  attackWithUnit: (attackerId: string, targetX: number, targetY: number) => boolean;
  canAttackPosition: (unitId: string, targetX: number, targetY: number) => boolean;
  getAttackRange: (unitId: string) => { x: number; y: number }[];
  calculateDamage: (attackerId: string, defenderId: string) => number;
  
  // Actions d'état
  refreshUnit: (unitId: string) => void; // Restaure movement et actions
  refreshAllUnits: (playerId: string) => void;
  healUnit: (unitId: string, amount: number) => void;
  giveExperience: (unitId: string, amount: number) => void;
  
  // Actions spéciales
  useAbility: (unitId: string, abilityId: string, targetX?: number, targetY?: number) => boolean;
  canUseAbility: (unitId: string, abilityId: string) => boolean;
  
  // Types d'unité
  registerUnitType: (unitType: UnitType) => void;
  getUnitType: (typeId: string) => UnitType | undefined;
  createUnit: (typeId: string, ownerId: string, x: number, y: number, name?: string) => Unit | null;
  
  // Gestion des ressources
  calculateMaintenanceCost: (playerId: string) => { [resourceType: string]: number };
  canRecruitUnit: (typeId: string, playerId: string, availableResources: { [resourceType: string]: number }) => boolean;
  
  // Statistiques
  getPlayerUnitStats: (playerId: string) => {
    totalUnits: number;
    unitsByType: { [typeId: string]: number };
    totalMaintenanceCost: { [resourceType: string]: number };
  };
}

// Types d'unité prédéfinis pour Nova Imperium
const predefinedUnitTypes: UnitType[] = [
  {
    id: "scout",
    name: "Éclaireur",
    description: "Unité rapide spécialisée dans l'exploration",
    baseHealth: 50,
    baseAttack: 20,
    baseDefense: 10,
    baseMovement: 3,
    recruitmentCost: { food: 30, gold: 50 },
    recruitmentTime: 2,
    maintenanceCost: { food: 2 },
    abilities: ["scout", "stealth"],
    canBuild: false,
    canExplore: true,
    canTrade: false
  },
  {
    id: "warrior",
    name: "Guerrier",
    description: "Unité de combat polyvalente",
    baseHealth: 100,
    baseAttack: 40,
    baseDefense: 30,
    baseMovement: 2,
    recruitmentCost: { food: 50, gold: 80, iron: 20 },
    recruitmentTime: 3,
    maintenanceCost: { food: 3, gold: 1 },
    abilities: ["charge", "defend"],
    canBuild: false,
    canExplore: false,
    canTrade: false
  },
  {
    id: "mage",
    name: "Mage",
    description: "Unité magique avec des capacités spéciales",
    baseHealth: 60,
    baseAttack: 50,
    baseDefense: 15,
    baseMovement: 2,
    recruitmentCost: { food: 40, gold: 120, mana: 30 },
    recruitmentTime: 4,
    maintenanceCost: { food: 2, mana: 5 },
    abilities: ["fireball", "heal", "teleport"],
    canBuild: false,
    canExplore: false,
    canTrade: false,
    prerequisiteTechs: ["magic"]
  },
  {
    id: "trader",
    name: "Marchand",
    description: "Unité spécialisée dans le commerce",
    baseHealth: 70,
    baseAttack: 15,
    baseDefense: 20,
    baseMovement: 2,
    recruitmentCost: { food: 35, gold: 100 },
    recruitmentTime: 3,
    maintenanceCost: { food: 3, gold: 2 },
    abilities: ["trade", "negotiate"],
    canBuild: false,
    canExplore: false,
    canTrade: true
  },
  {
    id: "builder",
    name: "Constructeur",
    description: "Unité capable de construire des bâtiments",
    baseHealth: 80,
    baseAttack: 10,
    baseDefense: 25,
    baseMovement: 1,
    recruitmentCost: { food: 45, gold: 90, wood: 30 },
    recruitmentTime: 4,
    maintenanceCost: { food: 3, gold: 2 },
    abilities: ["build", "repair"],
    canBuild: true,
    canExplore: false,
    canTrade: false
  }
];

export const useUnits = create<UnitsState>()(
  subscribeWithSelector((set, get) => {
    // Initialiser avec les types prédéfinis
    const initialUnitTypes = new Map<string, UnitType>();
    predefinedUnitTypes.forEach(type => {
      initialUnitTypes.set(type.id, type);
    });
    
    return {
      units: new Map(),
      unitTypes: initialUnitTypes,
      selectedUnitId: null,
      
      // Actions de base
      addUnit: (unit) => {
        set((state) => {
          const newUnits = new Map(state.units);
          newUnits.set(unit.id, unit);
          return { units: newUnits };
        });
      },
      
      removeUnit: (unitId) => {
        set((state) => {
          const newUnits = new Map(state.units);
          newUnits.delete(unitId);
          
          // Désélectionner si c'était l'unité sélectionnée
          const newSelectedUnitId = state.selectedUnitId === unitId ? null : state.selectedUnitId;
          
          return { units: newUnits, selectedUnitId: newSelectedUnitId };
        });
      },
      
      getUnit: (unitId) => {
        return get().units.get(unitId);
      },
      
      getUnitsForPlayer: (playerId) => {
        return Array.from(get().units.values()).filter(unit => unit.ownerId === playerId);
      },
      
      getUnitsAtPosition: (x, y) => {
        return Array.from(get().units.values()).filter(unit => unit.x === x && unit.y === y);
      },
      
      // Sélection
      selectUnit: (unitId) => {
        const unit = get().getUnit(unitId);
        if (unit) {
          // Désélectionner toutes les autres unités
          set((state) => {
            const newUnits = new Map(state.units);
            newUnits.forEach((u, id) => {
              newUnits.set(id, { ...u, isSelected: id === unitId });
            });
            return { units: newUnits, selectedUnitId: unitId };
          });
        }
      },
      
      deselectUnit: () => {
        set((state) => {
          const newUnits = new Map(state.units);
          newUnits.forEach((unit, id) => {
            newUnits.set(id, { ...unit, isSelected: false });
          });
          return { units: newUnits, selectedUnitId: null };
        });
      },
      
      getSelectedUnit: () => {
        const selectedId = get().selectedUnitId;
        return selectedId ? get().getUnit(selectedId) : undefined;
      },
      
      // Mouvement
      moveUnit: (unitId, targetX, targetY) => {
        const unit = get().getUnit(unitId);
        if (!unit || !get().canMoveToPosition(unitId, targetX, targetY)) {
          return false;
        }
        
        const distance = Math.abs(targetX - unit.x) + Math.abs(targetY - unit.y);
        if (distance > unit.movementRemaining) {
          return false;
        }
        
        set((state) => {
          const newUnits = new Map(state.units);
          const updatedUnit = {
            ...unit,
            x: targetX,
            y: targetY,
            movementRemaining: Math.max(0, unit.movementRemaining - distance),
            canMove: unit.movementRemaining - distance > 0
          };
          newUnits.set(unitId, updatedUnit);
          return { units: newUnits };
        });
        
        return true;
      },
      
      canMoveToPosition: (unitId, targetX, targetY) => {
        const unit = get().getUnit(unitId);
        if (!unit || !unit.canMove) return false;
        
        // Vérifier s'il y a déjà une unité ennemie à cette position
        const unitsAtTarget = get().getUnitsAtPosition(targetX, targetY);
        const enemyUnit = unitsAtTarget.find(u => u.ownerId !== unit.ownerId);
        
        return !enemyUnit; // Peut bouger s'il n'y a pas d'unité ennemie
      },
      
      getMovementRange: (unitId) => {
        const unit = get().getUnit(unitId);
        if (!unit) return [];
        
        const positions: { x: number; y: number }[] = [];
        const range = unit.movementRemaining;
        
        for (let dx = -range; dx <= range; dx++) {
          for (let dy = -range; dy <= range; dy++) {
            if (Math.abs(dx) + Math.abs(dy) <= range) {
              const targetX = unit.x + dx;
              const targetY = unit.y + dy;
              if (get().canMoveToPosition(unitId, targetX, targetY)) {
                positions.push({ x: targetX, y: targetY });
              }
            }
          }
        }
        
        return positions;
      },
      
      // Combat
      attackWithUnit: (attackerId, targetX, targetY) => {
        const attacker = get().getUnit(attackerId);
        if (!attacker || !get().canAttackPosition(attackerId, targetX, targetY)) {
          return false;
        }
        
        const defenders = get().getUnitsAtPosition(targetX, targetY)
          .filter(unit => unit.ownerId !== attacker.ownerId);
        
        if (defenders.length === 0) return false;
        
        const defender = defenders[0]; // Attaquer la première unité trouvée
        const damage = get().calculateDamage(attackerId, defender.id);
        
        set((state) => {
          const newUnits = new Map(state.units);
          
          // Appliquer les dégâts
          const damagedDefender = {
            ...defender,
            health: Math.max(0, defender.health - damage)
          };
          
          // Marquer l'attaquant comme ayant agi
          const usedAttacker = {
            ...attacker,
            canAct: false
          };
          
          newUnits.set(defender.id, damagedDefender);
          newUnits.set(attackerId, usedAttacker);
          
          // Supprimer l'unité si elle est morte
          if (damagedDefender.health <= 0) {
            newUnits.delete(defender.id);
          }
          
          return { units: newUnits };
        });
        
        return true;
      },
      
      canAttackPosition: (unitId, targetX, targetY) => {
        const unit = get().getUnit(unitId);
        if (!unit || !unit.canAct) return false;
        
        const distance = Math.abs(targetX - unit.x) + Math.abs(targetY - unit.y);
        return distance === 1; // Attaque au corps à corps seulement
      },
      
      getAttackRange: (unitId) => {
        const unit = get().getUnit(unitId);
        if (!unit) return [];
        
        const positions: { x: number; y: number }[] = [];
        const directions = [
          [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]
        ];
        
        directions.forEach(([dx, dy]) => {
          const targetX = unit.x + dx;
          const targetY = unit.y + dy;
          const enemyUnits = get().getUnitsAtPosition(targetX, targetY)
            .filter(u => u.ownerId !== unit.ownerId);
          
          if (enemyUnits.length > 0) {
            positions.push({ x: targetX, y: targetY });
          }
        });
        
        return positions;
      },
      
      calculateDamage: (attackerId, defenderId) => {
        const attacker = get().getUnit(attackerId);
        const defender = get().getUnit(defenderId);
        
        if (!attacker || !defender) return 0;
        
        const baseDamage = attacker.attack;
        const defense = defender.defense;
        const finalDamage = Math.max(1, baseDamage - defense);
        
        // Ajouter un peu de randomisation
        return Math.floor(finalDamage * (0.8 + Math.random() * 0.4));
      },
      
      // État
      refreshUnit: (unitId) => {
        const unit = get().getUnit(unitId);
        if (unit) {
          set((state) => {
            const newUnits = new Map(state.units);
            const refreshedUnit = {
              ...unit,
              canAct: true,
              canMove: true,
              movementRemaining: unit.movement
            };
            newUnits.set(unitId, refreshedUnit);
            return { units: newUnits };
          });
        }
      },
      
      refreshAllUnits: (playerId) => {
        const playerUnits = get().getUnitsForPlayer(playerId);
        playerUnits.forEach(unit => {
          get().refreshUnit(unit.id);
        });
      },
      
      healUnit: (unitId, amount) => {
        const unit = get().getUnit(unitId);
        if (unit) {
          set((state) => {
            const newUnits = new Map(state.units);
            const healedUnit = {
              ...unit,
              health: Math.min(unit.maxHealth, unit.health + amount)
            };
            newUnits.set(unitId, healedUnit);
            return { units: newUnits };
          });
        }
      },
      
      giveExperience: (unitId, amount) => {
        const unit = get().getUnit(unitId);
        if (unit) {
          set((state) => {
            const newUnits = new Map(state.units);
            let newExp = unit.experience + amount;
            let newLevel = unit.level;
            
            // Système de niveau simple: 100 XP par niveau
            while (newExp >= newLevel * 100) {
              newExp -= newLevel * 100;
              newLevel++;
            }
            
            const leveledUnit = {
              ...unit,
              experience: newExp,
              level: newLevel
            };
            
            // Améliorer les stats si niveau augmenté
            if (newLevel > unit.level) {
              const statIncrease = newLevel - unit.level;
              leveledUnit.maxHealth += statIncrease * 10;
              leveledUnit.health = leveledUnit.maxHealth; // Heal complet au niveau up
              leveledUnit.attack += statIncrease * 2;
              leveledUnit.defense += statIncrease;
            }
            
            newUnits.set(unitId, leveledUnit);
            return { units: newUnits };
          });
        }
      },
      
      // Capacités spéciales
      useAbility: (unitId, abilityId, targetX, targetY) => {
        const unit = get().getUnit(unitId);
        if (!unit || !get().canUseAbility(unitId, abilityId)) {
          return false;
        }
        
        // Implémenter les capacités spécifiques
        switch (abilityId) {
          case "heal":
            if (targetX !== undefined && targetY !== undefined) {
              const targetUnits = get().getUnitsAtPosition(targetX, targetY)
                .filter(u => u.ownerId === unit.ownerId);
              targetUnits.forEach(target => {
                get().healUnit(target.id, 30);
              });
            }
            break;
            
          case "scout":
            // Révéler une zone plus large
            // Cette logique sera intégrée avec le système de vision
            break;
            
          default:
            return false;
        }
        
        // Marquer l'unité comme ayant utilisé sa capacité
        set((state) => {
          const newUnits = new Map(state.units);
          const usedUnit = { ...unit, canAct: false };
          newUnits.set(unitId, usedUnit);
          return { units: newUnits };
        });
        
        return true;
      },
      
      canUseAbility: (unitId, abilityId) => {
        const unit = get().getUnit(unitId);
        return unit ? unit.canAct && unit.abilities.includes(abilityId) : false;
      },
      
      // Types d'unité
      registerUnitType: (unitType) => {
        set((state) => {
          const newUnitTypes = new Map(state.unitTypes);
          newUnitTypes.set(unitType.id, unitType);
          return { unitTypes: newUnitTypes };
        });
      },
      
      getUnitType: (typeId) => {
        return get().unitTypes.get(typeId);
      },
      
      createUnit: (typeId, ownerId, x, y, name) => {
        const unitType = get().getUnitType(typeId);
        if (!unitType) return null;
        
        const unit: Unit = {
          id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: name || unitType.name,
          type: typeId,
          ownerId,
          x,
          y,
          health: unitType.baseHealth,
          maxHealth: unitType.baseHealth,
          attack: unitType.baseAttack,
          defense: unitType.baseDefense,
          movement: unitType.baseMovement,
          movementRemaining: unitType.baseMovement,
          canAct: true,
          canMove: true,
          isSelected: false,
          experience: 0,
          level: 1,
          abilities: [...unitType.abilities]
        };
        
        get().addUnit(unit);
        return unit;
      },
      
      // Ressources
      calculateMaintenanceCost: (playerId) => {
        const playerUnits = get().getUnitsForPlayer(playerId);
        const totalCost: { [resourceType: string]: number } = {};
        
        playerUnits.forEach(unit => {
          const unitType = get().getUnitType(unit.type);
          if (unitType) {
            Object.entries(unitType.maintenanceCost).forEach(([resource, cost]) => {
              totalCost[resource] = (totalCost[resource] || 0) + cost;
            });
          }
        });
        
        return totalCost;
      },
      
      canRecruitUnit: (typeId, playerId, availableResources) => {
        const unitType = get().getUnitType(typeId);
        if (!unitType) return false;
        
        return Object.entries(unitType.recruitmentCost).every(([resource, cost]) => {
          return (availableResources[resource] || 0) >= cost;
        });
      },
      
      // Statistiques
      getPlayerUnitStats: (playerId) => {
        const playerUnits = get().getUnitsForPlayer(playerId);
        const unitsByType: { [typeId: string]: number } = {};
        const totalMaintenanceCost: { [resourceType: string]: number } = {};
        
        playerUnits.forEach(unit => {
          unitsByType[unit.type] = (unitsByType[unit.type] || 0) + 1;
          
          const unitType = get().getUnitType(unit.type);
          if (unitType) {
            Object.entries(unitType.maintenanceCost).forEach(([resource, cost]) => {
              totalMaintenanceCost[resource] = (totalMaintenanceCost[resource] || 0) + cost;
            });
          }
        });
        
        return {
          totalUnits: playerUnits.length,
          unitsByType,
          totalMaintenanceCost
        };
      }
    };
  })
);