import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface HexTile {
  x: number;
  y: number;
  terrain: string;
  height: number;
  isVisible: boolean;
  isExplored: boolean;
  hasResource: boolean;
  resourceType?: string;
  resourceAmount?: number;
  isOccupied: boolean;
  occupiedBy?: string; // player id
  building?: string;
  unit?: string;
}

export interface MapRegion {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
  discoveredBy: string;
  tiles: HexTile[];
  biome: string;
  dangerLevel: number;
}

interface MapState {
  // État de la carte
  mapWidth: number;
  mapHeight: number;
  isLargeMap: boolean; // Pour cartes > 1000x1000
  tiles: Map<string, HexTile>;
  regions: Map<string, MapRegion>;
  
  // Vision et exploration
  visibleTiles: Set<string>;
  exploredTiles: Set<string>;
  fogOfWar: boolean;
  
  // Interaction avec la carte
  selectedTile: HexTile | null;
  hoveredTile: HexTile | null;
  cameraPosition: { x: number; y: number; zoom: number };
  
  // Actions de base
  initializeMap: (width: number, height: number) => void;
  getTile: (x: number, y: number) => HexTile | undefined;
  setTile: (x: number, y: number, tile: Partial<HexTile>) => void;
  getTileKey: (x: number, y: number) => string;
  
  // Actions de vision
  revealTile: (x: number, y: number) => void;
  exploreTile: (x: number, y: number) => void;
  updateVisibleTiles: (centerX: number, centerY: number, visionRange: number) => void;
  toggleFogOfWar: () => void;
  
  // Actions d'interaction
  selectTile: (x: number, y: number) => void;
  hoverTile: (x: number, y: number) => void;
  clearSelection: () => void;
  clearHover: () => void;
  
  // Actions de caméra
  setCameraPosition: (x: number, y: number, zoom?: number) => void;
  centerCameraOnTile: (x: number, y: number) => void;
  
  // Actions de région
  addRegion: (region: MapRegion) => void;
  getRegionsInArea: (centerX: number, centerY: number, radius: number) => MapRegion[];
  
  // Actions de ressources
  addResourceToTile: (x: number, y: number, resourceType: string, amount: number) => void;
  harvestResource: (x: number, y: number) => { resourceType: string; amount: number } | null;
  
  // Actions de construction
  placeBuildingOnTile: (x: number, y: number, buildingType: string, playerId: string) => boolean;
  removeBuildingFromTile: (x: number, y: number) => void;
  
  // Actions d'unité
  placeUnitOnTile: (x: number, y: number, unitId: string, playerId: string) => boolean;
  removeUnitFromTile: (x: number, y: number) => void;
  moveUnit: (fromX: number, fromY: number, toX: number, toY: number) => boolean;
  
  // Utilitaires
  getNeighborTiles: (x: number, y: number) => HexTile[];
  getTilesInRange: (centerX: number, centerY: number, range: number) => HexTile[];
  calculateDistance: (x1: number, y1: number, x2: number, y2: number) => number;
  isValidPosition: (x: number, y: number) => boolean;
  
  // Analyse et statistiques
  getMapStatistics: () => {
    totalTiles: number;
    exploredTiles: number;
    visibleTiles: number;
    resourceTiles: number;
    occupiedTiles: number;
  };
  
  // Persistance
  exportMapData: () => string;
  importMapData: (data: string) => boolean;
}

export const useMapState = create<MapState>()(
  subscribeWithSelector((set, get) => ({
    // État initial - configuré pour cartes massives
    mapWidth: 10000,
    mapHeight: 3000,
    isLargeMap: true,
    tiles: new Map(),
    regions: new Map(),
    visibleTiles: new Set(),
    exploredTiles: new Set(),
    fogOfWar: true,
    selectedTile: null,
    hoveredTile: null,
    cameraPosition: { x: 0, y: 0, zoom: 1 },
    
    // Initialisation
    initializeMap: (width, height) => {
      const isLargeMap = width > 1000 || height > 1000;
      console.log(`🗺️ Initialisation carte: ${width}x${height} ${isLargeMap ? '(MASSIVE)' : '(normale)'}`);
      
      set({
        mapWidth: width,
        mapHeight: height,
        isLargeMap,
        tiles: new Map(),
        regions: new Map(),
        visibleTiles: new Set(),
        exploredTiles: new Set(),
        selectedTile: null,
        hoveredTile: null
      });
    },
    
    getTile: (x, y) => {
      const key = get().getTileKey(x, y);
      return get().tiles.get(key);
    },
    
    setTile: (x, y, updates) => {
      const key = get().getTileKey(x, y);
      const currentTile = get().tiles.get(key);
      
      if (currentTile) {
        const updatedTile = { ...currentTile, ...updates };
        set((state) => {
          const newTiles = new Map(state.tiles);
          newTiles.set(key, updatedTile);
          return { tiles: newTiles };
        });
      }
    },
    
    getTileKey: (x, y) => `${x},${y}`,
    
    // Vision
    revealTile: (x, y) => {
      const key = get().getTileKey(x, y);
      set((state) => ({
        visibleTiles: new Set([...state.visibleTiles, key])
      }));
      
      get().setTile(x, y, { isVisible: true });
    },
    
    exploreTile: (x, y) => {
      const key = get().getTileKey(x, y);
      set((state) => ({
        exploredTiles: new Set([...state.exploredTiles, key])
      }));
      
      get().setTile(x, y, { isExplored: true });
      get().revealTile(x, y);
    },
    
    updateVisibleTiles: (centerX, centerY, visionRange) => {
      const tilesInRange = get().getTilesInRange(centerX, centerY, visionRange);
      const visibleKeys = tilesInRange.map(tile => get().getTileKey(tile.x, tile.y));
      
      set({
        visibleTiles: new Set(visibleKeys)
      });
      
      // Mettre à jour l'état visible de chaque tuile
      tilesInRange.forEach(tile => {
        get().setTile(tile.x, tile.y, { isVisible: true });
      });
    },
    
    toggleFogOfWar: () => {
      set((state) => ({ fogOfWar: !state.fogOfWar }));
    },
    
    // Interaction
    selectTile: (x, y) => {
      const tile = get().getTile(x, y);
      if (tile) {
        set({ selectedTile: tile });
      }
    },
    
    hoverTile: (x, y) => {
      const tile = get().getTile(x, y);
      set({ hoveredTile: tile || null });
    },
    
    clearSelection: () => {
      set({ selectedTile: null });
    },
    
    clearHover: () => {
      set({ hoveredTile: null });
    },
    
    // Caméra
    setCameraPosition: (x, y, zoom = 1) => {
      set({ cameraPosition: { x, y, zoom } });
    },
    
    centerCameraOnTile: (x, y) => {
      get().setCameraPosition(x, y);
    },
    
    // Régions
    addRegion: (region) => {
      set((state) => {
        const newRegions = new Map(state.regions);
        newRegions.set(region.id, region);
        return { regions: newRegions };
      });
    },
    
    getRegionsInArea: (centerX, centerY, radius) => {
      const regions = Array.from(get().regions.values());
      return regions.filter(region => {
        const distance = get().calculateDistance(centerX, centerY, region.centerX, region.centerY);
        return distance <= radius + region.radius;
      });
    },
    
    // Ressources
    addResourceToTile: (x, y, resourceType, amount) => {
      get().setTile(x, y, {
        hasResource: true,
        resourceType,
        resourceAmount: amount
      });
    },
    
    harvestResource: (x, y) => {
      const tile = get().getTile(x, y);
      if (tile && tile.hasResource && tile.resourceType && tile.resourceAmount) {
        const result = {
          resourceType: tile.resourceType,
          amount: tile.resourceAmount
        };
        
        get().setTile(x, y, {
          hasResource: false,
          resourceType: undefined,
          resourceAmount: undefined
        });
        
        return result;
      }
      return null;
    },
    
    // Construction
    placeBuildingOnTile: (x, y, buildingType, playerId) => {
      const tile = get().getTile(x, y);
      if (tile && !tile.building && !tile.unit) {
        get().setTile(x, y, {
          building: buildingType,
          isOccupied: true,
          occupiedBy: playerId
        });
        return true;
      }
      return false;
    },
    
    removeBuildingFromTile: (x, y) => {
      get().setTile(x, y, {
        building: undefined,
        isOccupied: false,
        occupiedBy: undefined
      });
    },
    
    // Unités
    placeUnitOnTile: (x, y, unitId, playerId) => {
      const tile = get().getTile(x, y);
      if (tile && !tile.unit) {
        get().setTile(x, y, {
          unit: unitId,
          isOccupied: true,
          occupiedBy: playerId
        });
        return true;
      }
      return false;
    },
    
    removeUnitFromTile: (x, y) => {
      get().setTile(x, y, {
        unit: undefined,
        isOccupied: false,
        occupiedBy: undefined
      });
    },
    
    moveUnit: (fromX, fromY, toX, toY) => {
      const fromTile = get().getTile(fromX, fromY);
      const toTile = get().getTile(toX, toY);
      
      if (fromTile && toTile && fromTile.unit && !toTile.unit) {
        const unitId = fromTile.unit;
        const playerId = fromTile.occupiedBy!;
        
        get().removeUnitFromTile(fromX, fromY);
        get().placeUnitOnTile(toX, toY, unitId, playerId);
        return true;
      }
      return false;
    },
    
    // Utilitaires
    getNeighborTiles: (x, y) => {
      const neighbors: HexTile[] = [];
      const directions = [
        [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
      ];
      
      directions.forEach(([dx, dy]) => {
        const tile = get().getTile(x + dx, y + dy);
        if (tile) neighbors.push(tile);
      });
      
      return neighbors;
    },
    
    getTilesInRange: (centerX, centerY, range) => {
      const tiles: HexTile[] = [];
      
      for (let x = centerX - range; x <= centerX + range; x++) {
        for (let y = centerY - range; y <= centerY + range; y++) {
          if (get().calculateDistance(centerX, centerY, x, y) <= range) {
            const tile = get().getTile(x, y);
            if (tile) tiles.push(tile);
          }
        }
      }
      
      return tiles;
    },
    
    calculateDistance: (x1, y1, x2, y2) => {
      return Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(x1 - x2 + y1 - y2);
    },
    
    isValidPosition: (x, y) => {
      const state = get();
      return x >= 0 && x < state.mapWidth && y >= 0 && y < state.mapHeight;
    },
    
    // Statistiques
    getMapStatistics: () => {
      const state = get();
      return {
        totalTiles: state.tiles.size,
        exploredTiles: state.exploredTiles.size,
        visibleTiles: state.visibleTiles.size,
        resourceTiles: Array.from(state.tiles.values()).filter(tile => tile.hasResource).length,
        occupiedTiles: Array.from(state.tiles.values()).filter(tile => tile.isOccupied).length
      };
    },
    
    // Persistance
    exportMapData: () => {
      const state = get();
      const mapData = {
        mapWidth: state.mapWidth,
        mapHeight: state.mapHeight,
        tiles: Array.from(state.tiles.entries()),
        regions: Array.from(state.regions.entries()),
        exploredTiles: Array.from(state.exploredTiles),
        visibleTiles: Array.from(state.visibleTiles)
      };
      return JSON.stringify(mapData);
    },
    
    importMapData: (data) => {
      try {
        const mapData = JSON.parse(data);
        
        set({
          mapWidth: mapData.mapWidth,
          mapHeight: mapData.mapHeight,
          tiles: new Map(mapData.tiles),
          regions: new Map(mapData.regions),
          exploredTiles: new Set(mapData.exploredTiles),
          visibleTiles: new Set(mapData.visibleTiles)
        });
        
        return true;
      } catch (error) {
        console.error('Failed to import map data:', error);
        return false;
      }
    }
  }))
);