/**
 * Système de vision unifié pour Nova Imperium
 * Gère la vision actuelle, l'exploration permanente et la cartographie
 */

import { HexMath, type HexCoord } from './HexMath';

export interface HexCoordinate {
  x: number;
  y: number;
}

export interface VisionState {
  // Hexagones actuellement visibles (autour de l'avatar)
  currentVision: Set<string>;
  // Hexagones explorés de façon permanente
  exploredHexes: Set<string>;
  // Position actuelle de l'avatar
  avatarPosition: HexCoordinate;
  // Niveau d'exploration (détermine la portée de vision)
  explorationLevel: number;
}

export class VisionSystem {
  /**
   * Calcule la portée de vision basée sur le niveau d'exploration
   * Niveau 0: 1 rayon (7 cases) - vision de base
   * Niveau 1: 1 rayon (7 cases) - révèle ressources de base
   * Niveau 2: 2 rayon (19 cases) 
   * Niveau 3: 2 rayon (19 cases) - révèle ressources magiques
   * Niveau 4: 3 rayon (37 cases) - vision étendue
   */
  static getVisionRange(explorationLevel: number): number {
    if (explorationLevel >= 4) return 3; // 37 hexagones - vision étendue
    if (explorationLevel >= 2) return 2; // 19 hexagones
    return 1; // 7 hexagones - vision de base et niveau 1
  }

  /**
   * Obtient tous les hexagones visibles selon le rayon de vision
   * Utilise HexMath pour la géométrie précise
   */
  static getVisibleHexes(centerX: number, centerY: number, radius: number): HexCoordinate[] {
    const hexes = HexMath.getHexesInRadius(centerX, centerY, radius);
    const validHexes = HexMath.filterValidHexes(hexes);
    
    return validHexes.map(hex => ({ x: hex.x, y: hex.y }));
  }

  /**
   * Calcule la vision actuelle basée sur la position de l'avatar
   */
  static calculateCurrentVision(avatarX: number, avatarY: number, explorationLevel: number): Set<string> {
    const visionRange = this.getVisionRange(explorationLevel);
    const visibleHexes = this.getVisibleHexes(avatarX, avatarY, visionRange);
    
    const visionSet = new Set<string>();
    for (const hex of visibleHexes) {
      visionSet.add(`${hex.x},${hex.y}`);
    }
    
    console.log('Calculating vision:', {
      avatar: { x: avatarX, y: avatarY },
      explorationLevel,
      visionRange,
      visibleCount: visibleHexes.length,
      hexes: visibleHexes
    });
    
    return visionSet;
  }

  /**
   * Met à jour l'exploration permanente avec la vision actuelle
   */
  static updateExploredHexes(currentVision: Set<string>, exploredHexes: Set<string>): Set<string> {
    const newExploredHexes = new Set(exploredHexes);
    
    // Ajouter tous les hexagones de la vision actuelle aux hexagones explorés
    for (const hex of currentVision) {
      newExploredHexes.add(hex);
    }
    
    return newExploredHexes;
  }

  /**
   * DEPRECATED: Cette fonction a été supprimée - utilisez directement avatarHexPosition du store
   * @deprecated Utilisez usePlayer.getState().avatarHexPosition à la place
   */

  /**
   * Convertit les coordonnées hexagonales en coordonnées monde
   */
  static hexToWorld(hexX: number, hexY: number): { x: number, z: number } {
    return HexMath.hexToWorld(hexX, hexY);
  }

  /**
   * Vérifie si un hexagone est visible actuellement
   */
  static isHexInCurrentVision(hexX: number, hexY: number, currentVision: Set<string>): boolean {
    return currentVision.has(`${hexX},${hexY}`);
  }

  /**
   * Vérifie si un hexagone a été exploré
   */
  static isHexExplored(hexX: number, hexY: number, exploredHexes: Set<string>): boolean {
    return exploredHexes.has(`${hexX},${hexY}`);
  }

  /**
   * Vérifie si un hexagone est visible (exploré OU dans la vision actuelle)
   */
  static isHexVisible(hexX: number, hexY: number, currentVision: Set<string>, exploredHexes: Set<string>): boolean {
    return this.isHexInCurrentVision(hexX, hexY, currentVision) || this.isHexExplored(hexX, hexY, exploredHexes);
  }

  /**
   * Calcule l'anneau de brouillard entourant la vision directe.
   * Ce sont les tuiles à rayon+1 — visibles dans le brouillard léger (terrain révélé, couleurs atténuées).
   * Ces tuiles sont traversables visuellement mais PAS encore découvertes (non accessibles sans exploration).
   *
   * @param avatarX  coordonnée locale X de l'avatar
   * @param avatarY  coordonnée locale Y de l'avatar
   * @param explorationLevel  niveau de compétence exploration du joueur
   * @returns Set<"x,y"> en coordonnées locales
   */
  static calculateFogRing(avatarX: number, avatarY: number, explorationLevel: number): Set<string> {
    const directRadius = this.getVisionRange(explorationLevel);
    const fogRadius = directRadius + 1;

    const fogHexes = this.getVisibleHexes(avatarX, avatarY, fogRadius);
    const directHexes = this.getVisibleHexes(avatarX, avatarY, directRadius);

    const directSet = new Set<string>(directHexes.map(h => `${h.x},${h.y}`));
    const fogRingSet = new Set<string>();

    for (const hex of fogHexes) {
      const key = `${hex.x},${hex.y}`;
      if (!directSet.has(key)) {
        fogRingSet.add(key);
      }
    }

    return fogRingSet;
  }

  /**
   * Vérifie si un hexagone est dans l'anneau de brouillard
   */
  static isHexInFogRing(hexX: number, hexY: number, fogRing: Set<string>): boolean {
    return fogRing.has(`${hexX},${hexY}`);
  }
}