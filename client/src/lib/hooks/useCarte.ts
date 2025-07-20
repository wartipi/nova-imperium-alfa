import { useCallback, useMemo } from 'react';
import { useMap } from '../stores/useMap';
import { useCentralizedGameState } from '../stores/useCentralizedGameState';
import { usePlayer } from '../stores/usePlayer';
import type { HexTile } from '../game/types';

/**
 * Hook personnalisé pour gérer toute la logique liée à la carte
 * Gère la création, mise à jour des tuiles, gestion des clics sur les tuiles
 */
export function useCarte() {
  const { mapData, selectedHex, setSelectedHex } = useMap();
  const { generateMap, getHexAt } = useGameState();
  const { getAvatarPosition } = usePlayer();

  // Position actuelle de l'avatar
  const avatarPosition = getAvatarPosition();

  // Obtenir les données de la carte
  const getMapData = useCallback(() => {
    return mapData;
  }, [mapData]);

  // Obtenir une tuile spécifique
  const getTile = useCallback((x: number, y: number): HexTile | null => {
    if (!mapData || y < 0 || y >= mapData.length || x < 0 || x >= mapData[y].length) {
      return null;
    }
    return mapData[y][x];
  }, [mapData]);

  // Obtenir les tuiles adjacentes à une position
  const getAdjacentTiles = useCallback((x: number, y: number): HexTile[] => {
    if (!mapData) return [];
    
    const adjacent: HexTile[] = [];
    const neighbors = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: -1 }, { dx: 1, dy: 1 }
    ];

    neighbors.forEach(({ dx, dy }) => {
      const tile = getTile(x + dx, y + dy);
      if (tile) {
        adjacent.push(tile);
      }
    });

    return adjacent;
  }, [getTile]);

  // Obtenir les tuiles dans un rayon donné
  const getTilesInRadius = useCallback((centerX: number, centerY: number, radius: number): HexTile[] => {
    if (!mapData) return [];
    
    const tiles: HexTile[] = [];
    
    for (let y = Math.max(0, centerY - radius); y <= Math.min(mapData.length - 1, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(mapData[y].length - 1, centerX + radius); x++) {
        const distance = Math.abs(centerX - x) + Math.abs(centerY - y);
        if (distance <= radius) {
          const tile = getTile(x, y);
          if (tile) {
            tiles.push(tile);
          }
        }
      }
    }
    
    return tiles;
  }, [getTile, mapData]);

  // Sélectionner une tuile
  const selectTile = useCallback((x: number, y: number) => {
    const tile = getTile(x, y);
    if (tile) {
      setSelectedHex(tile);
    }
  }, [getTile, setSelectedHex]);

  // Désélectionner la tuile actuelle
  const clearSelection = useCallback(() => {
    setSelectedHex(null);
  }, [setSelectedHex]);

  // Vérifier si une tuile est sélectionnée
  const isTileSelected = useCallback((x: number, y: number) => {
    return selectedHex?.x === x && selectedHex?.y === y;
  }, [selectedHex]);

  // Obtenir les informations sur la tuile sélectionnée
  const getSelectedTileInfo = useCallback(() => {
    if (!selectedHex) return null;
    
    return {
      tile: selectedHex,
      isAvatarPosition: selectedHex.x === avatarPosition.x && selectedHex.y === avatarPosition.y,
      adjacentTiles: getAdjacentTiles(selectedHex.x, selectedHex.y),
      distanceFromAvatar: Math.abs(selectedHex.x - avatarPosition.x) + Math.abs(selectedHex.y - avatarPosition.y)
    };
  }, [selectedHex, avatarPosition, getAdjacentTiles]);

  // Générer une nouvelle carte
  const createMap = useCallback((width: number, height: number) => {
    generateMap(width, height);
  }, [generateMap]);

  // Obtenir les statistiques de la carte
  const getMapStats = useMemo(() => {
    if (!mapData) return null;
    
    const stats = {
      totalTiles: mapData.length * mapData[0].length,
      terrainCount: {} as Record<string, number>,
      resourceCount: {} as Record<string, number>,
      exploredTiles: 0,
      visibleTiles: 0
    };

    mapData.forEach(row => {
      row.forEach(tile => {
        // Compter les types de terrain
        stats.terrainCount[tile.terrain] = (stats.terrainCount[tile.terrain] || 0) + 1;
        
        // Compter les ressources
        if (tile.resource) {
          stats.resourceCount[tile.resource] = (stats.resourceCount[tile.resource] || 0) + 1;
        }
        
        // Compter les tuiles explorées et visibles
        if (tile.isExplored) stats.exploredTiles++;
        if (tile.isVisible) stats.visibleTiles++;
      });
    });

    return stats;
  }, [mapData]);

  // Trouver des tuiles par critères
  const findTiles = useCallback((predicate: (tile: HexTile) => boolean): HexTile[] => {
    if (!mapData) return [];
    
    const result: HexTile[] = [];
    mapData.forEach(row => {
      row.forEach(tile => {
        if (predicate(tile)) {
          result.push(tile);
        }
      });
    });
    
    return result;
  }, [mapData]);

  // Trouver des tuiles par type de terrain
  const findTilesByTerrain = useCallback((terrain: string): HexTile[] => {
    return findTiles(tile => tile.terrain === terrain);
  }, [findTiles]);

  // Trouver des tuiles avec des ressources spécifiques
  const findTilesByResource = useCallback((resource: string): HexTile[] => {
    return findTiles(tile => tile.resource === resource);
  }, [findTiles]);

  return {
    // État de la carte
    mapData,
    selectedHex,
    avatarPosition,
    mapStats: getMapStats,
    
    // Actions sur la carte
    selectTile,
    clearSelection,
    createMap,
    
    // Requêtes sur les tuiles
    getTile,
    getAdjacentTiles,
    getTilesInRadius,
    findTiles,
    findTilesByTerrain,
    findTilesByResource,
    
    // Informations utiles
    isTileSelected,
    getSelectedTileInfo,
    
    // Utilitaires
    getMapData
  };
}

export default useCarte;