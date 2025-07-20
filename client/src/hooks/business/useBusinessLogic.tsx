/**
 * Hooks de Logique Métier - Nova Imperium
 * Étape 3: Séparer la Logique Métier de l'Interface Utilisateur
 * 
 * Ces hooks contiennent toute la logique métier du jeu, séparée des composants UI.
 * Cela permet une meilleure réutilisabilité, testabilité et maintenabilité.
 */

import { useCallback } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { useTurnEffectsSystem } from '../../systems/TurnEffectsSystem';

// Hook pour la logique de gestion des ressources
export const useResourceLogic = () => {
  const { resourceManager } = useGameContext();
  
  // Logique de calcul des coûts
  const calculateBuildingCost = useCallback((buildingType: string, level: number = 1) => {
    const baseCosts: Record<string, Record<string, number>> = {
      'house': { wood: 50, stone: 30 },
      'farm': { wood: 40, gold: 60 },
      'mine': { wood: 80, stone: 60, gold: 100 },
      'barracks': { wood: 100, stone: 80, iron: 40, gold: 150 },
      'market': { wood: 60, stone: 40, gold: 120 },
      'temple': { stone: 100, gold: 200, mana: 50 },
      'workshop': { wood: 80, stone: 60, iron: 30, gold: 100 },
      'tower': { stone: 120, iron: 50, gold: 180 }
    };
    
    const baseCost = baseCosts[buildingType] || {};
    
    // Appliquer le multiplicateur de niveau
    const multiplier = Math.pow(1.5, level - 1);
    const finalCost: Record<string, number> = {};
    
    Object.entries(baseCost).forEach(([resource, amount]: [string, number]) => {
      finalCost[resource] = Math.floor(amount * multiplier);
    });
    
    return finalCost;
  }, []);
  
  const calculateUnitCost = useCallback((unitType: string) => {
    const unitCosts: Record<string, Record<string, number>> = {
      'scout': { food: 30, gold: 50 },
      'warrior': { food: 50, gold: 80, iron: 20 },
      'mage': { food: 40, gold: 120, mana: 30 },
      'trader': { food: 35, gold: 100 },
      'builder': { food: 45, gold: 90, wood: 30 }
    };
    
    return unitCosts[unitType] || {};
  }, []);
  
  // Logique de validation des ressources
  const canAfford = useCallback((costs: any) => {
    return resourceManager.hasResources(costs);
  }, [resourceManager]);
  
  const spendIfAffordable = useCallback((costs: any) => {
    if (canAfford(costs)) {
      return resourceManager.spendResources(costs);
    }
    return false;
  }, [canAfford, resourceManager]);
  
  // Logique de calcul de production optimale
  const calculateOptimalProduction = useCallback(() => {
    const resources = resourceManager.resources;
    const recommendations = [];
    
    // Analyser les besoins en ressources
    if (resources.food < 50) {
      recommendations.push({
        type: 'build',
        target: 'farm',
        reason: 'Nourriture faible',
        priority: 'high'
      });
    }
    
    if (resources.gold < 100) {
      recommendations.push({
        type: 'build',
        target: 'market',
        reason: 'Or insuffisant',
        priority: 'medium'
      });
    }
    
    if (resources.action_points < 10) {
      recommendations.push({
        type: 'wait',
        reason: 'Attendre la régénération des PA',
        priority: 'low'
      });
    }
    
    return recommendations;
  }, [resourceManager.resources]);
  
  return {
    calculateBuildingCost,
    calculateUnitCost,
    canAfford,
    spendIfAffordable,
    calculateOptimalProduction,
    resources: resourceManager.resources
  };
};

// Hook pour la logique de combat
export const useCombatLogic = () => {
  const { unitManager } = useGameContext();
  
  const calculateDamage = useCallback((attacker: any, defender: any) => {
    if (!attacker || !defender) return 0;
    
    const baseDamage = attacker.attack;
    const defense = defender.defense;
    const levelBonus = (attacker.level - 1) * 2;
    
    // Calcul avec variance aléatoire
    const variance = 0.2; // ±20%
    const randomFactor = 1 + (Math.random() - 0.5) * variance * 2;
    
    const finalDamage = Math.max(1, Math.floor((baseDamage + levelBonus - defense) * randomFactor));
    
    return finalDamage;
  }, []);
  
  const calculateHitChance = useCallback((attacker: any, defender: any) => {
    if (!attacker || !defender) return 0;
    
    const baseChance = 80; // 80% de base
    const levelDifference = attacker.level - defender.level;
    const bonus = levelDifference * 5; // ±5% par niveau de différence
    
    return Math.max(10, Math.min(95, baseChance + bonus));
  }, []);
  
  const simulateCombat = useCallback((attacker: any, defender: any) => {
    const damage = calculateDamage(attacker, defender);
    const hitChance = calculateHitChance(attacker, defender);
    const hit = Math.random() * 100 < hitChance;
    
    return {
      hit,
      damage: hit ? damage : 0,
      defenderHealthAfter: hit ? Math.max(0, defender.health - damage) : defender.health,
      critical: hit && Math.random() < 0.1 // 10% de chance de critique
    };
  }, [calculateDamage, calculateHitChance]);
  
  const canAttack = useCallback((attackerId: string, targetX: number, targetY: number) => {
    // Vérifier si l'unité peut attaquer cette position
    const attacker = unitManager.selectedUnit;
    if (!attacker || attacker.id !== attackerId) return false;
    
    const distance = Math.abs(targetX - attacker.x) + Math.abs(targetY - attacker.y);
    return distance === 1 && attacker.canAct;
  }, [unitManager.selectedUnit]);
  
  return {
    calculateDamage,
    calculateHitChance,
    simulateCombat,
    canAttack
  };
};

// Hook pour la logique de construction
export const useBuildingLogic = () => {
  const { buildingManager, resourceManager } = useGameContext();
  const { calculateBuildingCost } = useResourceLogic();
  
  const canBuildAt = useCallback((buildingType: string, x: number, y: number) => {
    // Vérifier les prérequis terrain et ressources
    const cost = calculateBuildingCost(buildingType);
    const canAfford = resourceManager.hasResources(cost);
    
    // Vérifier s'il n'y a pas déjà un bâtiment
    // Cette logique sera intégrée avec le système de carte
    
    return canAfford;
  }, [calculateBuildingCost, resourceManager]);
  
  const startBuildingConstruction = useCallback((buildingType: string, ownerId: string, x: number, y: number) => {
    if (!canBuildAt(buildingType, x, y)) {
      return { success: false, reason: 'Cannot build at this location' };
    }
    
    const cost = calculateBuildingCost(buildingType);
    const spent = resourceManager.spendResources(cost);
    
    if (spent) {
      const buildingId = buildingManager.startConstruction(buildingType, ownerId, x, y);
      return { success: true, buildingId, cost };
    }
    
    return { success: false, reason: 'Insufficient resources' };
  }, [canBuildAt, calculateBuildingCost, resourceManager, buildingManager]);
  
  const calculateBuildingEfficiency = useCallback((buildingType: string, level: number, terrain: string) => {
    const baseEfficiency = 1.0;
    let terrainBonus = 0;
    
    // Bonus de terrain spécifiques
    switch (buildingType) {
      case 'farm':
        terrainBonus = terrain === 'fertile_land' ? 0.3 : 0;
        break;
      case 'mine':
        terrainBonus = ['hills', 'mountains'].includes(terrain) ? 0.5 : 0;
        break;
      case 'market':
        terrainBonus = terrain === 'crossroads' ? 0.2 : 0;
        break;
    }
    
    const levelBonus = (level - 1) * 0.25; // +25% par niveau
    
    return baseEfficiency + terrainBonus + levelBonus;
  }, []);
  
  return {
    canBuildAt,
    startBuildingConstruction,
    calculateBuildingEfficiency,
    constructionQueue: buildingManager.constructionQueue
  };
};

// Hook pour la logique d'exploration
export const useExplorationLogic = () => {
  const { mapManager, resourceManager } = useGameContext();
  
  const calculateExplorationCost = useCallback((distance: number) => {
    const baseCost = 5; // 5 PA de base
    const distanceCost = distance * 2; // +2 PA par case de distance
    return baseCost + distanceCost;
  }, []);
  
  const canExplore = useCallback((x: number, y: number) => {
    // Vérifier si la zone peut être explorée
    const cost = calculateExplorationCost(1); // Distance de base
    return resourceManager.hasResources({ action_points: cost });
  }, [calculateExplorationCost, resourceManager]);
  
  const exploreArea = useCallback((x: number, y: number) => {
    const cost = calculateExplorationCost(1);
    
    if (canExplore(x, y)) {
      const spent = resourceManager.spendResources({ action_points: cost });
      if (spent) {
        // Logique d'exploration avec chances de découverte
        const discoveries = [];
        
        // 30% de chance de trouver des ressources
        if (Math.random() < 0.3) {
          const resourceTypes = ['herbs', 'stone', 'iron', 'gems'];
          const foundResource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
          const amount = Math.floor(Math.random() * 20) + 5;
          
          resourceManager.addResource(foundResource as any, amount);
          discoveries.push({ type: 'resource', resource: foundResource, amount });
        }
        
        // 20% de chance de trouver des points d'expérience
        if (Math.random() < 0.2) {
          discoveries.push({ type: 'experience', amount: 10 });
        }
        
        // 10% de chance d'événement spécial
        if (Math.random() < 0.1) {
          discoveries.push({ type: 'special_event', description: 'Ancien site découvert' });
        }
        
        return { success: true, cost, discoveries };
      }
    }
    
    return { success: false, reason: 'Insufficient action points' };
  }, [canExplore, calculateExplorationCost, resourceManager]);
  
  const calculateExplorationRewards = useCallback((terrain: string) => {
    const baseRewards: Record<string, Record<string, number>> = {
      'forest': { herbs: 15, wood: 10 },
      'hills': { stone: 20, iron: 5 },
      'mountains': { iron: 25, gems: 3 },
      'fertile_land': { food: 20, herbs: 10 },
      'desert': { gems: 5, ancient_knowledge: 2 }
    };
    
    return baseRewards[terrain] || { experience: 5 };
  }, []);
  
  return {
    calculateExplorationCost,
    canExplore,
    exploreArea,
    calculateExplorationRewards
  };
};

// Hook pour la logique diplomatique
export const useDiplomacyLogic = () => {
  const { gameState } = useGameContext();
  
  const calculateReputation = useCallback((playerId: string, factionId: string) => {
    // Logique de calcul de réputation basée sur les actions passées
    // Cette logique sera intégrée avec le système de réputation existant
    return 50; // Neutre par défaut
  }, []);
  
  const canFormAlliance = useCallback((playerId1: string, playerId2: string) => {
    const reputation1 = calculateReputation(playerId1, playerId2);
    const reputation2 = calculateReputation(playerId2, playerId1);
    
    return reputation1 >= 70 && reputation2 >= 70;
  }, [calculateReputation]);
  
  const calculateTradeBenefit = useCallback((offer: any, demand: any) => {
    // Calcul simplifié de bénéfice d'échange
    const offerValue = Object.entries(offer).reduce((total, [resource, amount]: [string, number]) => {
      const resourceValue = getResourceValue(resource);
      return total + (resourceValue * amount);
    }, 0);
    
    const demandValue = Object.entries(demand).reduce((total, [resource, amount]: [string, number]) => {
      const resourceValue = getResourceValue(resource);
      return total + (resourceValue * amount);
    }, 0);
    
    return (offerValue - demandValue) / offerValue;
  }, []);
  
  const getResourceValue = (resource: string): number => {
    const values: Record<string, number> = {
      food: 1,
      wood: 1.2,
      stone: 1.5,
      iron: 2,
      gold: 3,
      mana: 4,
      gems: 5,
      ancient_knowledge: 10
    };
    return values[resource] || 1;
  };
  
  return {
    calculateReputation,
    canFormAlliance,
    calculateTradeBenefit
  };
};

// Hook principal qui combine toute la logique métier
export const useGameLogic = () => {
  const resourceLogic = useResourceLogic();
  const combatLogic = useCombatLogic();
  const buildingLogic = useBuildingLogic();
  const explorationLogic = useExplorationLogic();
  const diplomacyLogic = useDiplomacyLogic();
  const effectsSystem = useTurnEffectsSystem();
  
  // Logique de validation d'action générale
  const canPerformAction = useCallback((action: string, params: any) => {
    switch (action) {
      case 'build':
        return buildingLogic.canBuildAt(params.buildingType, params.x, params.y);
      case 'recruit':
        return resourceLogic.canAfford(resourceLogic.calculateUnitCost(params.unitType));
      case 'explore':
        return explorationLogic.canExplore(params.x, params.y);
      case 'attack':
        return combatLogic.canAttack(params.attackerId, params.targetX, params.targetY);
      default:
        return false;
    }
  }, [buildingLogic, resourceLogic, explorationLogic, combatLogic]);
  
  // Traitement de fin de tour
  const processEndTurn = useCallback(async () => {
    const results = await effectsSystem.resoudreEffets();
    return results;
  }, [effectsSystem]);
  
  return {
    resources: resourceLogic,
    combat: combatLogic,
    building: buildingLogic,
    exploration: explorationLogic,
    diplomacy: diplomacyLogic,
    canPerformAction,
    processEndTurn,
    effectsSystem
  };
};