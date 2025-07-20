/**
 * Système unifié pour Nova Imperium
 * 
 * Ce système centralise toutes les mécaniques pour éviter les conflits entre composants
 * et assurer une cohérence dans le développement futur du jeu.
 */

import { HexMath, type HexCoord } from '../systems/HexMath';
import { VisionSystem } from '../systems/VisionSystem';
import { type GameEngine } from '../game/GameEngine';
import { usePlayer } from '../stores/usePlayer';
import { useGameEngine } from '../contexts/GameEngineContext';

export class UnifiedGameSystem {
  
  /**
   * PROCÉDURE D'UNIFICATION
   * 
   * Cette classe doit être utilisée chaque fois qu'on ajoute une nouvelle mécanique
   * pour s'assurer qu'elle s'intègre correctement avec l'existant.
   */
  
  /**
   * 1. SYSTÈME DE VISION UNIFIÉ
   */
  static updatePlayerVision(avatarX: number, avatarY: number, explorationLevel: number) {
    const playerStore = usePlayer.getState();
    
    // Calculer la nouvelle vision avec le système unifié
    const currentVision = VisionSystem.calculateCurrentVision(avatarX, avatarY, explorationLevel);
    const exploredHexes = VisionSystem.updateExploredHexes(currentVision, playerStore.exploredHexes);
    
    // Mettre à jour le store
    playerStore.currentVision = currentVision;
    playerStore.exploredHexes = exploredHexes;
    
    console.log('Unified Vision Update:', {
      avatar: { x: avatarX, y: avatarY },
      explorationLevel,
      visionRange: VisionSystem.getVisionRange(explorationLevel),
      currentVisionCount: currentVision.size,
      exploredCount: exploredHexes.size
    });
  }

  /**
   * 2. SYSTÈME DE MOUVEMENT UNIFIÉ
   */
  static moveAvatarToHex(hexX: number, hexY: number, gameEngine?: GameEngine) {
    const playerStore = usePlayer.getState();
    
    // Convertir en coordonnées monde
    const worldCoords = HexMath.hexToWorld(hexX, hexY);
    
    // Mettre à jour la position de l'avatar
    playerStore.setAvatarPosition({ x: worldCoords.x, y: 0, z: worldCoords.z });
    
    // Centrer la caméra sur l'avatar
    if (gameEngine) {
      gameEngine.centerCameraOnAvatar();
    }
    
    // Mettre à jour la vision
    const explorationLevel = playerStore.getCompetenceLevel('exploration');
    this.updatePlayerVision(hexX, hexY, explorationLevel);
    
    console.log('Unified Avatar Movement:', {
      hexCoords: { x: hexX, y: hexY },
      worldCoords,
      explorationLevel
    });
  }

  /**
   * 3. SYSTÈME DE COMPÉTENCES UNIFIÉ
   */
  static upgradeCompetence(competence: string): boolean {
    const playerStore = usePlayer.getState();
    const success = playerStore.upgradeCompetence(competence);
    
    // Si c'est une compétence d'exploration, mettre à jour la vision
    if (success && competence === 'exploration') {
      const avatarPosition = VisionSystem.worldToHex(
        playerStore.avatarPosition.x, 
        playerStore.avatarPosition.z
      );
      const newExplorationLevel = playerStore.getCompetenceLevel('exploration');
      
      this.updatePlayerVision(avatarPosition.x, avatarPosition.y, newExplorationLevel);
      
      console.log('Unified Competence Upgrade:', {
        competence,
        newLevel: newExplorationLevel,
        newVisionRange: VisionSystem.getVisionRange(newExplorationLevel)
      });
    }
    
    return success;
  }

  /**
   * 4. VALIDATION ET COHÉRENCE
   */
  static validateGameState(): boolean {
    const playerStore = usePlayer.getState();
    
    // Vérifier que la position de l'avatar est cohérente
    const avatarHex = VisionSystem.worldToHex(
      playerStore.avatarPosition.x,
      playerStore.avatarPosition.z
    );
    
    // Vérifier que la vision est cohérente avec le niveau d'exploration
    const explorationLevel = playerStore.getCompetenceLevel('exploration');
    const expectedVisionRange = VisionSystem.getVisionRange(explorationLevel);
    
    console.log('Game State Validation:', {
      avatarHex,
      explorationLevel,
      expectedVisionRange,
      currentVisionSize: playerStore.currentVision.size,
      exploredSize: playerStore.exploredHexes.size
    });
    
    return true;
  }

  /**
   * 5. PROCÉDURE D'INITIALISATION UNIFIÉE
   */
  static initializeGameSystems(gameEngine: GameEngine) {
    const playerStore = usePlayer.getState();
    
    // Initialiser la position de l'avatar
    const avatarHex = VisionSystem.worldToHex(
      playerStore.avatarPosition.x,
      playerStore.avatarPosition.z
    );
    
    // Initialiser la vision
    const explorationLevel = playerStore.getCompetenceLevel('exploration');
    this.updatePlayerVision(avatarHex.x, avatarHex.y, explorationLevel);
    
    // Centrer la caméra
    gameEngine.centerCameraOnAvatar();
    
    // Configurer les callbacks de vision dans GameEngine
    gameEngine.setVisionCallbacks(
      playerStore.isHexVisible,
      playerStore.isHexInCurrentVision
    );
    
    console.log('Unified Game Systems Initialized');
  }

  /**
   * 6. PROCÉDURE POUR NOUVELLES MÉCANIQUES
   * 
   * Quand on ajoute une nouvelle mécanique:
   * 1. L'ajouter ici comme méthode statique
   * 2. S'assurer qu'elle utilise les systèmes existants (HexMath, VisionSystem, etc.)
   * 3. Mettre à jour cette documentation
   * 4. Tester avec validateGameState()
   */
  
  /**
   * EXEMPLE pour une future mécanique de combat:
   * 
   * static initiateCombat(attackerHex: HexCoord, defenderHex: HexCoord) {
   *   // Utiliser HexMath pour vérifier la distance
   *   // Utiliser VisionSystem pour vérifier la visibilité
   *   // Mettre à jour les stores concernés
   *   // Valider l'état du jeu
   * }
   */
}