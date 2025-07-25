/**
 * Système de déplacement unifié avec animation progressive
 * Gère le déplacement case par case avec décompte des points d'action
 */

import { HexPathfinding, type PathfindingResult } from '../pathfinding/HexPathfinding';
import { usePlayer } from '../stores/usePlayer';
import { HexMath, type HexCoord } from '../systems/HexMath';
import { VisionSystem } from '../systems/VisionSystem';

export interface MovementRequest {
  targetX: number;
  targetY: number;
  mapData: any[][];
}

export interface MovementResult {
  success: boolean;
  path: HexCoord[];
  totalCost: number;
  message: string;
}

export interface MovementAnimation {
  isAnimating: boolean;
  currentStep: number;
  totalSteps: number;
  path: HexCoord[];
  stepDuration: number; // millisecondes par étape
}

export class MovementSystem {
  private static animationState: MovementAnimation = {
    isAnimating: false,
    currentStep: 0,
    totalSteps: 0,
    path: [],
    stepDuration: 300
  };

  /**
   * Planifie et exécute un déplacement avec pathfinding
   */
  static async planAndExecuteMovement(request: MovementRequest): Promise<MovementResult> {
    const playerStore = usePlayer.getState();
    const currentPos = playerStore.getAvatarPosition();
    
    // Utiliser VisionSystem pour convertir correctement les coordonnées monde en hex
    const startHex = VisionSystem.worldToHex(currentPos.x, currentPos.z);
    
    console.log('🚶 Planning movement:', {
      from: startHex,
      to: { x: request.targetX, y: request.targetY },
      currentActionPoints: playerStore.actionPoints,
      worldPosition: currentPos
    });

    // Calculer le chemin avec pathfinding
    const pathResult = HexPathfinding.findPath(
      startHex.x,
      startHex.y,
      request.targetX,
      request.targetY,
      request.mapData
    );

    if (!pathResult.success) {
      return {
        success: false,
        path: [],
        totalCost: 0,
        message: 'Aucun chemin trouvé vers cette destination'
      };
    }

    // Vérifier si le joueur a assez de points d'action
    if (pathResult.totalCost > playerStore.actionPoints) {
      return {
        success: false,
        path: pathResult.path,
        totalCost: pathResult.totalCost,
        message: `Pas assez de Points d'Action ! Coût: ${pathResult.totalCost} PA, Disponible: ${playerStore.actionPoints} PA`
      };
    }

    // Exécuter le déplacement animé
    await this.executeAnimatedMovement(pathResult, request.mapData);

    return {
      success: true,
      path: pathResult.path,
      totalCost: pathResult.totalCost,
      message: `Déplacement réussi ! Coût total: ${pathResult.totalCost} PA`
    };
  }

  /**
   * Exécute le déplacement avec animation case par case
   */
  private static async executeAnimatedMovement(pathResult: PathfindingResult, mapData: any[][]): Promise<void> {
    const playerStore = usePlayer.getState();
    
    // Initialiser l'animation
    this.animationState = {
      isAnimating: true,
      currentStep: 0,
      totalSteps: pathResult.path.length - 1, // Exclure la position de départ
      path: pathResult.path,
      stepDuration: 300
    };

    console.log('🎬 Starting animated movement:', {
      path: pathResult.path,
      totalSteps: this.animationState.totalSteps,
      totalCost: pathResult.totalCost
    });

    // Déplacer case par case
    for (let i = 1; i < pathResult.path.length; i++) {
      const currentHex = pathResult.path[i];
      const previousHex = pathResult.path[i - 1];
      
      // Calculer le coût de cette étape
      const stepCost = this.getStepCost(currentHex.x, currentHex.y, mapData);
      
      // Décompter les points d'action pour cette étape
      if (!playerStore.spendActionPoints(stepCost)) {
        console.error('❌ Pas assez de PA pour continuer le déplacement');
        break;
      }

      // Mettre à jour la position de l'avatar
      playerStore.moveAvatarToHex(currentHex.x, currentHex.y);
      
      // Mettre à jour l'état d'animation
      this.animationState.currentStep = i;
      
      console.log('📍 Movement step:', {
        step: i,
        from: previousHex,
        to: currentHex,
        stepCost,
        remainingPA: playerStore.actionPoints
      });

      // Attendre avant la prochaine étape (sauf pour la dernière)
      if (i < pathResult.path.length - 1) {
        await this.delay(this.animationState.stepDuration);
      }
    }

    // Terminer l'animation
    this.animationState.isAnimating = false;
    console.log('✅ Movement animation completed');
  }

  /**
   * Obtient le coût de déplacement pour un hexagone spécifique
   */
  private static getStepCost(x: number, y: number, mapData: any[][]): number {
    if (y < 0 || y >= mapData.length || x < 0 || x >= mapData[0].length) {
      return 999;
    }

    const terrain = mapData[y][x]?.terrain;
    
    const terrainCosts: { [key: string]: number } = {
      'fertile_land': 1,
      'forest': 2,
      'hills': 2,
      'mountains': 5,
      'desert': 3,
      'swamp': 4,
      'wasteland': 2,
      'caves': 3,
      'volcano': 8,
      'tundra': 3,
      'shallow_water': 999,
      'deep_water': 999
    };

    return terrainCosts[terrain] || 2;
  }

  /**
   * Utilitaire pour créer un délai
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Vérifie si un déplacement est actuellement en cours
   */
  static isMoving(): boolean {
    return this.animationState.isAnimating;
  }

  /**
   * Obtient l'état actuel de l'animation
   */
  static getAnimationState(): MovementAnimation {
    return { ...this.animationState };
  }

  /**
   * Arrête l'animation en cours (pour cas d'urgence)
   */
  static stopAnimation(): void {
    this.animationState.isAnimating = false;
  }

  /**
   * Prévisualise un chemin et son coût sans l'exécuter
   */
  static previewMovement(
    targetX: number, 
    targetY: number, 
    mapData: any[][]
  ): PathfindingResult {
    const playerStore = usePlayer.getState();
    const currentPos = playerStore.getAvatarPosition();
    
    // Utiliser VisionSystem pour convertir correctement les coordonnées monde en hex
    const startHex = VisionSystem.worldToHex(currentPos.x, currentPos.z);

    console.log('🔍 Preview movement:', {
      worldPos: currentPos,
      startHex,
      target: { x: targetX, y: targetY }
    });

    return HexPathfinding.findPath(
      startHex.x,
      startHex.y,
      targetX,
      targetY,
      mapData
    );
  }
}