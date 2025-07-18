/**
 * Validateur de systèmes de jeu pour Nova Imperium
 * Vérifie que toutes les mécaniques demandées sont en place et fonctionnelles
 */

import { VisionSystem } from './VisionSystem';
import { HexMath } from './HexMath';
import { getTerrainMovementCost } from '../game/TerrainCosts';
import { usePlayer } from '../stores/usePlayer';
import { useMap } from '../stores/useMap';

export class GameSystemValidator {
  
  /**
   * Vérifie tous les systèmes implémentés selon les consignes utilisateur
   */
  static validateAllSystems(): ValidationReport {
    const report: ValidationReport = {
      vision: this.validateVisionSystem(),
      movement: this.validateMovementSystem(),
      terrain: this.validateTerrainSystem(),
      avatar: this.validateAvatarSystem(),
      competences: this.validateCompetenceSystem(),
      overall: true
    };
    
    report.overall = Object.values(report).every(r => typeof r === 'boolean' ? r : r.status);
    
    console.log('🔍 Validation des systèmes de jeu:', report);
    return report;
  }

  /**
   * 1. SYSTÈME DE VISION
   */
  static validateVisionSystem(): SystemStatus {
    try {
      const player = usePlayer.getState();
      
      // Vérifier vision de base (7 hexagones)
      const baseVision = VisionSystem.getVisionRange(0);
      const level1Vision = VisionSystem.getVisionRange(1);
      const level2Vision = VisionSystem.getVisionRange(2);
      
      // Vérifier géométrie hexagonale
      const adjacentHexes = HexMath.getAdjacentHexes(3, 3);
      const radius2Hexes = HexMath.getHexesInRadius(3, 3, 2);
      
      const checks = [
        { name: 'Vision de base = 1', result: baseVision === 1 },
        { name: 'Vision niveau 1 = 1', result: level1Vision === 1 },
        { name: 'Vision niveau 2 = 2', result: level2Vision === 2 },
        { name: '6 hexagones adjacents', result: adjacentHexes.length === 6 },
        { name: '19 hexagones rayon 2', result: radius2Hexes.length === 19 },
        { name: 'Store vision initialisé', result: player.currentVision instanceof Set },
        { name: 'Store exploration initialisé', result: player.exploredHexes instanceof Set }
      ];
      
      const failedChecks = checks.filter(c => !c.result);
      
      return {
        status: failedChecks.length === 0,
        details: failedChecks.length === 0 ? 'Système de vision fonctionnel' : 
                `Problèmes: ${failedChecks.map(c => c.name).join(', ')}`,
        checks
      };
    } catch (error) {
      return {
        status: false,
        details: `Erreur système vision: ${error}`,
        checks: []
      };
    }
  }

  /**
   * 2. SYSTÈME DE DÉPLACEMENT
   */
  static validateMovementSystem(): SystemStatus {
    try {
      const player = usePlayer.getState();
      
      // Vérifier coûts de terrain
      const terrainCosts = {
        fertile_land: getTerrainMovementCost('fertile_land'),
        forest: getTerrainMovementCost('forest'),
        mountains: getTerrainMovementCost('mountains'),
        shallow_water: getTerrainMovementCost('shallow_water'),
        deep_water: getTerrainMovementCost('deep_water')
      };
      
      const checks = [
        { name: 'Terrain facile = 1 PA', result: terrainCosts.fertile_land === 1 },
        { name: 'Forêt = 2 PA', result: terrainCosts.forest === 2 },
        { name: 'Montagnes = 5 PA', result: terrainCosts.mountains === 5 },
        { name: 'Eau peu profonde bloquée', result: terrainCosts.shallow_water === 999 },
        { name: 'Eau profonde bloquée', result: terrainCosts.deep_water === 999 },
        { name: 'Mouvement en attente géré', result: typeof player.pendingMovement !== 'undefined' },
        { name: 'Mode mouvement géré', result: typeof player.isMovementMode === 'boolean' },
        { name: 'Position avatar valide', result: typeof player.avatarPosition.x === 'number' }
      ];
      
      const failedChecks = checks.filter(c => !c.result);
      
      return {
        status: failedChecks.length === 0,
        details: failedChecks.length === 0 ? 'Système de déplacement fonctionnel' : 
                `Problèmes: ${failedChecks.map(c => c.name).join(', ')}`,
        checks
      };
    } catch (error) {
      return {
        status: false,
        details: `Erreur système déplacement: ${error}`,
        checks: []
      };
    }
  }

  /**
   * 3. SYSTÈME DE TERRAIN
   */
  static validateTerrainSystem(): SystemStatus {
    try {
      // Vérifier tous les 14 types de terrain
      const terrainTypes = [
        'wasteland', 'forest', 'mountains', 'fertile_land', 'hills',
        'shallow_water', 'deep_water', 'swamp', 'desert', 'sacred_plains',
        'caves', 'ancient_ruins', 'volcano', 'enchanted_meadow'
      ];
      
      const checks = terrainTypes.map(terrain => ({
        name: `Terrain ${terrain} défini`,
        result: getTerrainMovementCost(terrain as any) > 0
      }));
      
      // Vérifier catégories de coût
      checks.push(
        { name: 'Terrains faciles (1 PA)', result: getTerrainMovementCost('fertile_land') === 1 },
        { name: 'Terrains moyens (2 PA)', result: getTerrainMovementCost('forest') === 2 },
        { name: 'Terrains difficiles (3 PA)', result: getTerrainMovementCost('swamp') === 3 },
        { name: 'Terrains extrêmes (5 PA)', result: getTerrainMovementCost('mountains') === 5 },
        { name: 'Eau impossible (999 PA)', result: getTerrainMovementCost('deep_water') === 999 }
      );
      
      const failedChecks = checks.filter(c => !c.result);
      
      return {
        status: failedChecks.length === 0,
        details: failedChecks.length === 0 ? 'Système de terrain fonctionnel' : 
                `Problèmes: ${failedChecks.map(c => c.name).join(', ')}`,
        checks
      };
    } catch (error) {
      return {
        status: false,
        details: `Erreur système terrain: ${error}`,
        checks: []
      };
    }
  }

  /**
   * 4. SYSTÈME AVATAR
   */
  static validateAvatarSystem(): SystemStatus {
    try {
      const player = usePlayer.getState();
      
      const checks = [
        { name: 'Avatar position définie', result: player.avatarPosition !== null },
        { name: 'Avatar rotation définie', result: player.avatarRotation !== null },
        { name: 'État mouvement géré', result: typeof player.isMoving === 'boolean' },
        { name: 'Vitesse mouvement définie', result: typeof player.movementSpeed === 'number' },
        { name: 'Personnage sélectionné', result: player.selectedCharacter !== null },
        { name: 'Mode Game Master géré', result: typeof player.isGameMaster === 'boolean' }
      ];
      
      const failedChecks = checks.filter(c => !c.result);
      
      return {
        status: failedChecks.length === 0,
        details: failedChecks.length === 0 ? 'Système avatar fonctionnel' : 
                `Problèmes: ${failedChecks.map(c => c.name).join(', ')}`,
        checks
      };
    } catch (error) {
      return {
        status: false,
        details: `Erreur système avatar: ${error}`,
        checks: []
      };
    }
  }

  /**
   * 5. SYSTÈME COMPÉTENCES
   */
  static validateCompetenceSystem(): SystemStatus {
    try {
      const player = usePlayer.getState();
      
      const checks = [
        { name: 'Points de compétence définis', result: typeof player.competencePoints === 'number' },
        { name: 'Liste compétences initialisée', result: Array.isArray(player.competences) },
        { name: 'Fonction apprentissage', result: typeof player.learnCompetence === 'function' },
        { name: 'Fonction amélioration', result: typeof player.upgradeCompetence === 'function' },
        { name: 'Fonction niveau', result: typeof player.getCompetenceLevel === 'function' },
        { name: 'Points d\'action définis', result: typeof player.actionPoints === 'number' },
        { name: 'Maximum PA défini', result: typeof player.maxActionPoints === 'number' }
      ];
      
      const failedChecks = checks.filter(c => !c.result);
      
      return {
        status: failedChecks.length === 0,
        details: failedChecks.length === 0 ? 'Système compétences fonctionnel' : 
                `Problèmes: ${failedChecks.map(c => c.name).join(', ')}`,
        checks
      };
    } catch (error) {
      return {
        status: false,
        details: `Erreur système compétences: ${error}`,
        checks: []
      };
    }
  }
}

interface ValidationReport {
  vision: SystemStatus;
  movement: SystemStatus;
  terrain: SystemStatus;
  avatar: SystemStatus;
  competences: SystemStatus;
  overall: boolean;
}

interface SystemStatus {
  status: boolean;
  details: string;
  checks: { name: string; result: boolean; }[];
}