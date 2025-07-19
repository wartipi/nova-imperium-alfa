/**
 * Mathématiques hexagonales précises basées sur le système de GameEngine
 * 
 * GameEngine utilise:
 * - screenX = x * (hexSize * 1.5)
 * - screenY = y * hexHeight + (x % 2) * (hexHeight / 2)
 * 
 * C'est un système de colonnes décalées où les colonnes impaires sont décalées vers le bas
 */

export interface HexCoord {
  x: number;
  y: number;
}

export class HexMath {
  /**
   * Obtient les 6 hexagones directement adjacents à un hexagone donné
   * Utilise le système exact de GameEngine : colonnes impaires décalées vers le bas
   */
  static getAdjacentHexes(centerX: number, centerY: number): HexCoord[] {
    const isOddColumn = centerX % 2 === 1;
    
    if (isOddColumn) {
      // Colonnes impaires (1, 3, 5...) - décalées vers le bas
      return [
        { x: centerX - 1, y: centerY },     // Gauche
        { x: centerX + 1, y: centerY },     // Droite
        { x: centerX, y: centerY - 1 },     // Haut
        { x: centerX, y: centerY + 1 },     // Bas
        { x: centerX - 1, y: centerY + 1 }, // Bas-gauche
        { x: centerX + 1, y: centerY + 1 }  // Bas-droite
      ];
    } else {
      // Colonnes paires (0, 2, 4...) - position normale
      return [
        { x: centerX - 1, y: centerY },     // Gauche
        { x: centerX + 1, y: centerY },     // Droite
        { x: centerX, y: centerY - 1 },     // Haut
        { x: centerX, y: centerY + 1 },     // Bas
        { x: centerX - 1, y: centerY - 1 }, // Haut-gauche
        { x: centerX + 1, y: centerY - 1 }  // Haut-droite
      ];
    }
  }

  /**
   * Obtient tous les hexagones dans un rayon donné (incluant le centre)
   */
  static getHexesInRadius(centerX: number, centerY: number, radius: number): HexCoord[] {
    const hexes: HexCoord[] = [];
    
    // Ajouter le centre
    hexes.push({ x: centerX, y: centerY });
    
    if (radius >= 1) {
      // Ajouter les hexagones adjacents
      const adjacent = this.getAdjacentHexes(centerX, centerY);
      hexes.push(...adjacent);
    }
    
    if (radius >= 2) {
      // Rayon 2 : ajouter l'anneau extérieur (12 hexagones supplémentaires)
      const radius2Hexes = this.getRadius2Hexes(centerX, centerY);
      hexes.push(...radius2Hexes);
    }
    
    return hexes;
  }

  /**
   * Obtient les hexagones du rayon 2 (anneau extérieur)
   */
  static getRadius2Hexes(centerX: number, centerY: number): HexCoord[] {
    const isOddColumn = centerX % 2 === 1;
    
    if (isOddColumn) {
      // Colonnes impaires (1, 3, 5...) - anneau rayon 2
      return [
        { x: centerX - 2, y: centerY },     // Gauche-2
        { x: centerX + 2, y: centerY },     // Droite-2
        { x: centerX, y: centerY - 2 },     // Haut-2
        { x: centerX, y: centerY + 2 },     // Bas-2
        { x: centerX - 1, y: centerY - 1 }, // Haut-gauche
        { x: centerX + 1, y: centerY - 1 }, // Haut-droite
        { x: centerX - 2, y: centerY + 1 }, // Bas-gauche-2
        { x: centerX + 2, y: centerY + 1 }, // Bas-droite-2
        { x: centerX - 1, y: centerY + 2 }, // Bas-gauche-bas
        { x: centerX + 1, y: centerY + 2 }, // Bas-droite-bas
        { x: centerX - 2, y: centerY - 1 }, // Haut-gauche-2
        { x: centerX + 2, y: centerY - 1 }  // Haut-droite-2
      ];
    } else {
      // Colonnes paires (0, 2, 4...) - anneau rayon 2
      return [
        { x: centerX - 2, y: centerY },     // Gauche-2
        { x: centerX + 2, y: centerY },     // Droite-2
        { x: centerX, y: centerY - 2 },     // Haut-2
        { x: centerX, y: centerY + 2 },     // Bas-2
        { x: centerX - 1, y: centerY + 1 }, // Bas-gauche
        { x: centerX + 1, y: centerY + 1 }, // Bas-droite
        { x: centerX - 2, y: centerY - 1 }, // Haut-gauche-2
        { x: centerX + 2, y: centerY - 1 }, // Haut-droite-2
        { x: centerX - 1, y: centerY - 2 }, // Haut-gauche-haut
        { x: centerX + 1, y: centerY - 2 }, // Haut-droite-haut
        { x: centerX - 2, y: centerY + 1 }, // Bas-gauche-2
        { x: centerX + 2, y: centerY + 1 }  // Bas-droite-2
      ];
    }
  }

  /**
   * Vérifie si un hexagone est valide (coordonnées positives)
   */
  static isValidHex(hex: HexCoord): boolean {
    return hex.x >= 0 && hex.y >= 0;
  }

  /**
   * Filtre une liste d'hexagones pour ne garder que les valides
   */
  static filterValidHexes(hexes: HexCoord[]): HexCoord[] {
    return hexes.filter(hex => this.isValidHex(hex));
  }

  /**
   * Convertit les coordonnées monde vers hexagonales (depuis GameEngine)
   */
  static worldToHex(worldX: number, worldZ: number): HexCoord {
    const hexX = Math.round(worldX / 1.5);
    const hexY = Math.round(worldZ / (Math.sqrt(3) * 0.5));
    return { x: hexX, y: hexY };
  }

  /**
   * Convertit les coordonnées hexagonales vers monde
   */
  static hexToWorld(hexX: number, hexY: number): { x: number, z: number } {
    const worldX = hexX * 1.5;
    const worldZ = hexY * Math.sqrt(3) * 0.5;
    return { x: worldX, z: worldZ };
  }
}