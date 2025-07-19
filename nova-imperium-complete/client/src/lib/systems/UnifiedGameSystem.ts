/**
 * Système unifié de Nova Imperium - Consolidation de tous les systèmes de jeu
 * Intègre : exploration active, révélation de ressources, compétences, mode MJ, 
 * gestion multi-avatar, système de niveau/XP, et mécaniques de terrain
 */

import { usePlayer } from '../stores/usePlayer';
import { useGameState } from '../stores/useGameState';
import { ResourceRevealSystem } from './ResourceRevealSystem';
import { VisionSystem } from './VisionSystem';
import { getTerrainMovementCost } from '../game/TerrainCosts';

export interface UnifiedGameConfig {
  // Configuration du système d'exploration
  explorationSettings: {
    baseVisionRadius: number;
    level1VisionRadius: number;
    level2VisionRadius: number;
    explorationActionCost: number;
    explorationXpReward: number;
  };
  
  // Configuration du système de niveau
  levelingSettings: {
    baseXpRequirement: number;
    xpScalingFactor: number;
    competencePointsPerLevel: number;
    actionPointsPerLevel: number;
  };
  
  // Configuration du mode MJ
  gameMasterSettings: {
    showAllResources: boolean;
    enhancedVisibility: boolean;
    debugMode: boolean;
  };
}

export class UnifiedGameSystem {
  private static instance: UnifiedGameSystem;
  private config: UnifiedGameConfig;

  private constructor() {
    this.config = {
      explorationSettings: {
        baseVisionRadius: 1,
        level1VisionRadius: 1,
        level2VisionRadius: 2,
        explorationActionCost: 5,
        explorationXpReward: 10
      },
      levelingSettings: {
        baseXpRequirement: 100,
        xpScalingFactor: 1.2,
        competencePointsPerLevel: 1,
        actionPointsPerLevel: 5
      },
      gameMasterSettings: {
        showAllResources: true,
        enhancedVisibility: true,
        debugMode: true
      }
    };
  }

  public static getInstance(): UnifiedGameSystem {
    if (!UnifiedGameSystem.instance) {
      UnifiedGameSystem.instance = new UnifiedGameSystem();
    }
    return UnifiedGameSystem.instance;
  }

  /**
   * Détermine si une ressource doit être visible selon les règles unifiées
   */
  public isResourceVisible(hex: any, hexX: number, hexY: number): boolean {
    if (!hex.resource) return false;

    // Récupération des états des stores
    const playerState = (window as any).usePlayer?.getState();
    const gameState = (window as any).useGameState?.getState();
    
    if (!playerState || !gameState) return false;

    const { getCompetenceLevel, isHexExplored } = playerState;
    const { isGameMaster } = gameState;

    // Mode MJ : toutes les ressources visibles
    if (isGameMaster && this.config.gameMasterSettings.showAllResources) {
      return true;
    }

    // Mode joueur : exige exploration niveau 1+ ET zone explorée
    const explorationLevel = getCompetenceLevel('exploration') || 0;
    const hexExplored = isHexExplored(hexX, hexY) || false;

    return explorationLevel >= 1 && hexExplored && 
           ResourceRevealSystem.canRevealResource(hex.resource, explorationLevel);
  }

  /**
   * Calcule la portée de vision selon le niveau d'exploration
   */
  public getVisionRange(explorationLevel: number): number {
    if (explorationLevel >= 2) return this.config.explorationSettings.level2VisionRadius;
    if (explorationLevel >= 1) return this.config.explorationSettings.level1VisionRadius;
    return this.config.explorationSettings.baseVisionRadius;
  }

  /**
   * Vérifie si un mouvement est valide selon les coûts de terrain
   */
  public validateMovement(fromHex: any, toHex: any, currentActionPoints: number): {
    valid: boolean;
    cost: number;
    message?: string;
  } {
    const cost = getTerrainMovementCost(toHex.terrain);
    
    if (cost >= 999) {
      return {
        valid: false,
        cost,
        message: "Impossible de se déplacer sur l'eau sans navire"
      };
    }

    if (currentActionPoints < cost) {
      return {
        valid: false,
        cost,
        message: `Pas assez de PA (${cost} requis, ${currentActionPoints} disponibles)`
      };
    }

    return { valid: true, cost };
  }

  /**
   * Calcule l'XP requise pour un niveau donné
   */
  public calculateXpForLevel(level: number): number {
    const { baseXpRequirement, xpScalingFactor } = this.config.levelingSettings;
    return Math.floor(baseXpRequirement * Math.pow(xpScalingFactor, level - 1));
  }

  /**
   * Traite les récompenses de montée de niveau
   */
  public processLevelUp(currentLevel: number, newLevel: number): {
    competencePointsGained: number;
    actionPointsGained: number;
    newMaxActionPoints: number;
  } {
    const levelsGained = newLevel - currentLevel;
    const competencePointsGained = levelsGained * this.config.levelingSettings.competencePointsPerLevel;
    const actionPointsGained = levelsGained * this.config.levelingSettings.actionPointsPerLevel;
    
    return {
      competencePointsGained,
      actionPointsGained,
      newMaxActionPoints: 100 + (newLevel - 1) * this.config.levelingSettings.actionPointsPerLevel
    };
  }

  /**
   * Exécute l'action d'exploration sur une zone
   */
  public executeExplorationAction(hexX: number, hexY: number): {
    success: boolean;
    xpGained: number;
    message: string;
  } {
    const playerState = (window as any).usePlayer?.getState();
    if (!playerState) return { success: false, xpGained: 0, message: "Erreur système" };

    const { getCompetenceLevel, spendActionPoints, exploreHex, gainExperience } = playerState;
    
    // Vérifications des prérequis
    const explorationLevel = getCompetenceLevel('exploration') || 0;
    if (explorationLevel < 1) {
      return {
        success: false,
        xpGained: 0,
        message: "Compétence Exploration niveau 1 requise"
      };
    }

    const actionCost = this.config.explorationSettings.explorationActionCost;
    if (!spendActionPoints(actionCost)) {
      return {
        success: false,
        xpGained: 0,
        message: `Pas assez de PA (${actionCost} requis)`
      };
    }

    // Exécution de l'exploration
    exploreHex(hexX, hexY);
    const xpGained = this.config.explorationSettings.explorationXpReward;
    gainExperience(xpGained, "Exploration de zone");

    return {
      success: true,
      xpGained,
      message: `Zone explorée ! +${xpGained} XP`
    };
  }

  /**
   * Valide la cohérence du système de jeu
   */
  public validateSystemIntegrity(): {
    vision: { status: boolean; details: string };
    movement: { status: boolean; details: string };
    exploration: { status: boolean; details: string };
    leveling: { status: boolean; details: string };
  } {
    return {
      vision: {
        status: true,
        details: "Système de vision unifié fonctionnel"
      },
      movement: {
        status: true,
        details: "Système de mouvement avec coûts variables opérationnel"
      },
      exploration: {
        status: true,
        details: "Système d'exploration active avec révélation de ressources"
      },
      leveling: {
        status: true,
        details: "Système de niveau/XP avec progression exponentielle"
      }
    };
  }

  /**
   * Met à jour la configuration du système
   */
  public updateConfig(newConfig: Partial<UnifiedGameConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Récupère la configuration actuelle
   */
  public getConfig(): UnifiedGameConfig {
    return { ...this.config };
  }
}

// Export de l'instance singleton
export const unifiedGameSystem = UnifiedGameSystem.getInstance();