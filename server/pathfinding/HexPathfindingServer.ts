/**
 * Pathfinding hexagonal A* côté serveur — autorité unique du calcul de déplacement
 *
 * Travaille en coordonnées MONDE (worldX, worldY).
 * Utilise un Map<"worldX,worldY", terrainType> construit depuis map_tiles en base.
 *
 * Règle sprint 1 : terrain inconnu = bloqué/impassable (coût 999).
 * Logique de voisinage : colonnes impaires (worldX % 2 === 1) décalées vers le bas.
 * Heuristique : distance cube-coordinate (identique à HexMath.hexDistance côté client).
 */

import type { PathStep } from "../../shared/schema";
import { TERRAIN_COSTS, IMPASSABLE, applyExplorationReduction } from "../../shared/hexTerrainConfig";

export interface ServerPathResult {
  success: boolean;
  path: PathStep[];
  totalCost: number;
  error?: string;
}

// ─── Coordonnée hexagonale ─────────────────────────────────────────────────
interface Coord {
  x: number;
  y: number;
}

// ─── Nœud A* ──────────────────────────────────────────────────────────────
interface PathNode {
  x: number;
  y: number;
  gCost: number;
  hCost: number;
  fCost: number;
  parent: PathNode | null;
  terrain: string;
  stepCost: number;
}

// ─── Conversion coordonnées offset → cube (pour heuristique précise) ───────
function offsetToCube(col: number, row: number): { x: number; y: number; z: number } {
  const x = col;
  const z = row - (col - (col & 1)) / 2;
  const y = -x - z;
  return { x, y, z };
}

function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const c1 = offsetToCube(x1, y1);
  const c2 = offsetToCube(x2, y2);
  return (Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y) + Math.abs(c1.z - c2.z)) / 2;
}

// ─── 6 voisins en coordonnées offset (colonnes impaires décalées vers le bas) ─
function getAdjacentHexes(x: number, y: number): Coord[] {
  if ((x & 1) !== 0) {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];
  } else {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
    ];
  }
}

// ─── Coût d'entrée dans une tuile ─────────────────────────────────────────
// explorationLevel : niveau de la compétence exploration du joueur (0 = aucune réduction).
// Le coût réduit est utilisé pour l'A* ; le test de destination impassable utilise le coût brut.
function getTerrainCost(worldX: number, worldY: number, tileMap: Map<string, string>, explorationLevel: number): number {
  const terrain = tileMap.get(`${worldX},${worldY}`);
  if (!terrain) return IMPASSABLE; // Terrain inconnu = bloqué
  const baseCost = TERRAIN_COSTS[terrain] ?? IMPASSABLE;
  return applyExplorationReduction(baseCost, explorationLevel);
}

// ─── Reconstruction du chemin depuis le nœud final ────────────────────────
function reconstructPath(endNode: PathNode): PathStep[] {
  const steps: PathStep[] = [];
  let current: PathNode | null = endNode;
  while (current !== null) {
    steps.unshift({
      worldX: current.x,
      worldY: current.y,
      terrain: current.terrain,
      cost: current.stepCost,
    });
    current = current.parent;
  }
  return steps;
}

// ─── Algorithme A* principal ───────────────────────────────────────────────
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileMap: Map<string, string>,
  explorationLevel: number = 0
): ServerPathResult {
  // Destination hors carte ou bloquée
  const endTerrain = tileMap.get(`${endX},${endY}`);
  if (!endTerrain) {
    return { success: false, path: [], totalCost: 0, error: "Destination hors de la carte chargée" };
  }
  if ((TERRAIN_COSTS[endTerrain] ?? IMPASSABLE) >= IMPASSABLE) {
    return { success: false, path: [], totalCost: 0, error: "Destination impassable" };
  }

  // Départ === arrivée
  if (startX === endX && startY === endY) {
    const terrain = tileMap.get(`${startX},${startY}`) ?? "plains";
    return { success: true, path: [{ worldX: startX, worldY: startY, terrain, cost: 0 }], totalCost: 0 };
  }

  const startTerrain = tileMap.get(`${startX},${startY}`) ?? "plains";
  const startNode: PathNode = {
    x: startX,
    y: startY,
    gCost: 0,
    hCost: hexDistance(startX, startY, endX, endY),
    fCost: 0,
    parent: null,
    terrain: startTerrain,
    stepCost: 0,
  };
  startNode.fCost = startNode.gCost + startNode.hCost;

  const openSet: PathNode[] = [startNode];
  const closedSet = new Set<string>();
  const openMap = new Map<string, PathNode>();
  openMap.set(`${startX},${startY}`, startNode);

  while (openSet.length > 0) {
    // Nœud avec le plus petit fCost (recherche linéaire — acceptable pour cette taille de carte)
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (
        openSet[i].fCost < openSet[bestIdx].fCost ||
        (openSet[i].fCost === openSet[bestIdx].fCost && openSet[i].hCost < openSet[bestIdx].hCost)
      ) {
        bestIdx = i;
      }
    }

    const current = openSet.splice(bestIdx, 1)[0];
    const currentKey = `${current.x},${current.y}`;
    openMap.delete(currentKey);
    closedSet.add(currentKey);

    // Destination atteinte
    if (current.x === endX && current.y === endY) {
      const path = reconstructPath(current);
      const totalCost = path.slice(1).reduce((sum, step) => sum + step.cost, 0);
      console.log(
        `[HexPathfindingServer] Chemin trouvé: ${path.length} étapes, coût total = ${totalCost} AP`
      );
      return { success: true, path, totalCost };
    }

    for (const neighbor of getAdjacentHexes(current.x, current.y)) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(neighborKey)) continue;

      const terrainCost = getTerrainCost(neighbor.x, neighbor.y, tileMap, explorationLevel);
      if (terrainCost >= IMPASSABLE) continue;

      const neighborTerrain = tileMap.get(neighborKey) ?? "unknown";
      const tentativeGCost = current.gCost + terrainCost;

      const existing = openMap.get(neighborKey);
      if (!existing) {
        const neighborNode: PathNode = {
          x: neighbor.x,
          y: neighbor.y,
          gCost: tentativeGCost,
          hCost: hexDistance(neighbor.x, neighbor.y, endX, endY),
          fCost: 0,
          parent: current,
          terrain: neighborTerrain,
          stepCost: terrainCost,
        };
        neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
        openSet.push(neighborNode);
        openMap.set(neighborKey, neighborNode);
      } else if (tentativeGCost < existing.gCost) {
        existing.gCost = tentativeGCost;
        existing.fCost = existing.gCost + existing.hCost;
        existing.parent = current;
        existing.stepCost = terrainCost;
      }
    }
  }

  return { success: false, path: [], totalCost: 0, error: "Aucun chemin disponible vers la destination" };
}
