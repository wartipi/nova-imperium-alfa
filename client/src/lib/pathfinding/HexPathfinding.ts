/**
 * Système de pathfinding hexagonal utilisant l'algorithme A*
 * Gère le calcul de chemins optimaux et le coût en points d'action
 */

import { HexMath, type HexCoord } from '../systems/HexMath';
import { TERRAIN_COSTS, IMPASSABLE } from '../../../../shared/hexTerrainConfig';

export interface PathNode {
  x: number;
  y: number;
  gCost: number; // Coût depuis le début
  hCost: number; // Heuristique vers la fin
  fCost: number; // gCost + hCost
  parent: PathNode | null;
}

export interface PathfindingResult {
  path: HexCoord[];
  totalCost: number;
  success: boolean;
}

export interface TerrainCostMap {
  [terrain: string]: number;
}

export class HexPathfinding {

  /**
   * Trouve le chemin le plus court entre deux hexagones
   */
  static findPath(
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number,
    mapData: any[][],
    explorationLevel: number = 0
  ): PathfindingResult {
    console.log('🗺️ Pathfinding Debug:', {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      mapSize: mapData ? [mapData.length, mapData[0]?.length] : 'null',
      startTerrain: this.isValidHex(startX, startY, mapData) ? mapData[startY][startX].terrain : 'invalid',
      endTerrain: this.isValidHex(endX, endY, mapData) ? mapData[endY][endX].terrain : 'invalid'
    });
    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();

    // Nœud de départ
    const startNode: PathNode = {
      x: startX,
      y: startY,
      gCost: 0,
      hCost: HexMath.hexDistance(startX, startY, endX, endY),
      fCost: 0,
      parent: null
    };
    startNode.fCost = startNode.gCost + startNode.hCost;

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Trouver le nœud avec le plus petit fCost
      let currentNode = openSet[0];
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].fCost < currentNode.fCost || 
           (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)) {
          currentNode = openSet[i];
        }
      }

      // Retirer le nœud actuel de l'ensemble ouvert
      const index = openSet.indexOf(currentNode);
      openSet.splice(index, 1);
      closedSet.add(`${currentNode.x},${currentNode.y}`);

      // Destination atteinte
      if (currentNode.x === endX && currentNode.y === endY) {
        return this.reconstructPath(currentNode);
      }

      // Explorer les voisins
      const neighbors = HexMath.getAdjacentHexes(currentNode.x, currentNode.y);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        // Vérifier les limites de la carte
        if (!this.isValidHex(neighbor.x, neighbor.y, mapData)) {
          continue;
        }

        // Ignorer si déjà traité
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculer le coût du terrain avec réductions d'exploration
        const terrainCost = this.getTerrainCost(neighbor.x, neighbor.y, mapData, explorationLevel);
        
        // Terrain bloqué (eau)
        if (terrainCost >= IMPASSABLE) {
          continue;
        }

        const tentativeGCost = currentNode.gCost + terrainCost;

        // Chercher si ce voisin est déjà dans l'ensemble ouvert
        let neighborNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
        
        if (!neighborNode) {
          // Nouveau nœud
          neighborNode = {
            x: neighbor.x,
            y: neighbor.y,
            gCost: tentativeGCost,
            hCost: HexMath.hexDistance(neighbor.x, neighbor.y, endX, endY),
            fCost: 0,
            parent: currentNode
          };
          neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
          openSet.push(neighborNode);
        } else if (tentativeGCost < neighborNode.gCost) {
          // Chemin plus court trouvé
          neighborNode.gCost = tentativeGCost;
          neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
          neighborNode.parent = currentNode;
        }
      }
    }

    // Aucun chemin trouvé
    return {
      path: [],
      totalCost: 0,
      success: false
    };
  }

  /**
   * Reconstruit le chemin depuis le nœud de destination
   */
  private static reconstructPath(endNode: PathNode): PathfindingResult {
    const path: HexCoord[] = [];
    let totalCost = 0;
    let currentNode: PathNode | null = endNode;

    while (currentNode !== null) {
      path.unshift({ x: currentNode.x, y: currentNode.y });
      if (currentNode.parent !== null) {
        totalCost += currentNode.gCost - currentNode.parent.gCost;
      }
      currentNode = currentNode.parent;
    }

    return {
      path,
      totalCost: endNode.gCost,
      success: true
    };
  }

  /**
   * Vérifie si un hexagone est valide sur la carte
   */
  private static isValidHex(x: number, y: number, mapData: any[][]): boolean {
    const isValid = y >= 0 && y < mapData.length && 
           x >= 0 && x < mapData[0].length &&
           mapData[y] && mapData[y][x];
    

    
    return isValid;
  }

  /**
   * Obtient le coût de déplacement pour un terrain avec réductions d'exploration
   */
  static getTerrainCost(x: number, y: number, mapData: any[][], explorationLevel: number = 0): number {
    if (!this.isValidHex(x, y, mapData)) {
      return IMPASSABLE;
    }

    const terrain = mapData[y][x].terrain;
    const baseCost = TERRAIN_COSTS[terrain] || 2;
    
    // Appliquer les réductions d'exploration par type de terrain
    return this.applyExplorationReduction(baseCost, explorationLevel);
  }

  /**
   * Applique les réductions de coût basées sur le niveau d'exploration
   */
  private static applyExplorationReduction(baseCost: number, explorationLevel: number): number {
    // Pas de réduction pour l'eau (999) ou niveau 0-1
    if (baseCost >= IMPASSABLE || explorationLevel <= 1) {
      return baseCost;
    }

    // Niveau 2+ : Réduction sur terrains modérés (2-3 PA → 1-2 PA)
    if (explorationLevel >= 2 && baseCost >= 2 && baseCost <= 3) {
      return Math.max(1, baseCost - 1);
    }

    // Niveau 3+ : Réduction sur terrains difficiles (4-5 PA → 3-4 PA)
    if (explorationLevel >= 3 && baseCost >= 4 && baseCost <= 5) {
      return Math.max(1, baseCost - 1);
    }

    // Niveau 4+ : Réduction sur terrains extrêmes (8 PA → 4 PA)
    if (explorationLevel >= 4 && baseCost >= 8) {
      return Math.max(1, Math.floor(baseCost / 2));
    }

    return baseCost;
  }

  /**
   * Calcule le coût total d'un chemin donné
   */
  static calculatePathCost(path: HexCoord[], mapData: any[][], explorationLevel: number = 0): number {
    let totalCost = 0;
    
    for (let i = 1; i < path.length; i++) {
      const hex = path[i];
      totalCost += this.getTerrainCost(hex.x, hex.y, mapData, explorationLevel);
    }
    
    return totalCost;
  }

  /**
   * Vérifie si un chemin est valide (toutes les cases sont traversables)
   */
  static isPathValid(path: HexCoord[], mapData: any[][]): boolean {
    for (const hex of path) {
      if (!this.isValidHex(hex.x, hex.y, mapData) || 
          this.getTerrainCost(hex.x, hex.y, mapData) >= IMPASSABLE) {
        return false;
      }
    }
    return true;
  }
}