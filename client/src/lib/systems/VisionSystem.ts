/**
 * Système de vision unifié pour Nova Imperium
 * Gère la vision actuelle, l'exploration permanente et la cartographie
 */

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
  private static readonly HEX_SIZE = 50; // Taille des hexagones comme dans GameEngine

  /**
   * Calcule la portée de vision basée sur le niveau d'exploration
   */
  static getVisionRange(explorationLevel: number): number {
    if (explorationLevel >= 2) return 2; // 19 hexagones
    if (explorationLevel >= 1) return 1; // 7 hexagones
    return 1; // Vision de base = 7 hexagones
  }

  /**
   * Obtient les offsets des hexagones adjacents selon le système de colonnes de GameEngine
   * GameEngine utilise: x * (hexSize * 1.5) et y * hexHeight + (x % 2) * (hexHeight / 2)
   */
  static getHexOffsets(centerX: number, centerY: number, radius: number): HexCoordinate[] {
    const offsets: HexCoordinate[] = [];
    
    // Ajouter le centre
    offsets.push({ x: centerX, y: centerY });
    
    if (radius >= 1) {
      // Rayon 1: 6 hexagones adjacents
      const isOddColumn = centerX % 2 === 1;
      const adjacentOffsets = isOddColumn ? [
        // Colonnes impaires (décalées vers le bas)
        { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, 
        { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }
      ] : [
        // Colonnes paires
        { x: -1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, 
        { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }
      ];
      
      for (const offset of adjacentOffsets) {
        const x = centerX + offset.x;
        const y = centerY + offset.y;
        if (x >= 0 && y >= 0) {
          offsets.push({ x, y });
        }
      }
    }
    
    if (radius >= 2) {
      // Rayon 2: anneau extérieur (12 hexagones supplémentaires)
      const isOddColumn = centerX % 2 === 1;
      const outerOffsets = isOddColumn ? [
        // Colonnes impaires - anneau extérieur
        { x: 0, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -1 },
        { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 },
        { x: -1, y: 2 }, { x: -2, y: 1 }, { x: -2, y: 0 },
        { x: -2, y: -1 }, { x: -1, y: -2 }, { x: -1, y: -1 }
      ] : [
        // Colonnes paires - anneau extérieur  
        { x: -1, y: -2 }, { x: 0, y: -2 }, { x: 1, y: -2 },
        { x: 2, y: -1 }, { x: 2, y: 0 }, { x: 2, y: 1 },
        { x: 1, y: 2 }, { x: 0, y: 2 }, { x: -1, y: 2 },
        { x: -2, y: 1 }, { x: -2, y: 0 }, { x: -2, y: -1 }
      ];
      
      for (const offset of outerOffsets) {
        const x = centerX + offset.x;
        const y = centerY + offset.y;
        if (x >= 0 && y >= 0) {
          offsets.push({ x, y });
        }
      }
    }
    
    return offsets;
  }

  /**
   * Calcule la vision actuelle basée sur la position de l'avatar
   */
  static calculateCurrentVision(avatarX: number, avatarY: number, explorationLevel: number): Set<string> {
    const visionRange = this.getVisionRange(explorationLevel);
    const visibleHexes = this.getHexOffsets(avatarX, avatarY, visionRange);
    
    const visionSet = new Set<string>();
    for (const hex of visibleHexes) {
      visionSet.add(`${hex.x},${hex.y}`);
    }
    
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
   * Convertit les coordonnées monde de l'avatar en coordonnées hexagonales
   */
  static worldToHex(worldX: number, worldZ: number): HexCoordinate {
    // Conversion basée sur la logique de GameEngine
    const hexX = Math.round(worldX / 1.5);
    const hexY = Math.round(worldZ / (Math.sqrt(3) * 0.5));
    
    return { x: hexX, y: hexY };
  }

  /**
   * Convertit les coordonnées hexagonales en coordonnées monde
   */
  static hexToWorld(hexX: number, hexY: number): { x: number, z: number } {
    // Conversion inverse basée sur la logique de GameEngine
    const worldX = hexX * 1.5;
    const worldZ = hexY * Math.sqrt(3) * 0.5;
    
    return { x: worldX, z: worldZ };
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
}