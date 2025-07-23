import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { MapGenerator } from "../game/MapGenerator";
import { LargeMapManager, LargeMapConfig } from "../game/LargeMapManager";
import type { HexTile } from "../game/types";

interface MapState {
  mapData: HexTile[][] | null;
  mapWidth: number;
  mapHeight: number;
  selectedHex: HexTile | null;
  isLargeMap: boolean;
  largeMapManager: LargeMapManager | null;
  
  // Actions
  generateMap: (width: number, height: number) => void;
  setSelectedHex: (hex: HexTile | null) => void;
  getHexAt: (x: number, y: number) => HexTile | null;
  initializeLargeMapManager: (canvas: HTMLCanvasElement) => void;
}

export const useMap = create<MapState>()(
  subscribeWithSelector((set, get) => ({
    mapData: null,
    mapWidth: 0,
    mapHeight: 0,
    selectedHex: null,
    isLargeMap: false,
    largeMapManager: null,
    
    generateMap: (width: number, height: number) => {
      console.log(`Generating map: ${width}x${height}`);
      const isLargeMap = width > 1000 || height > 1000;
      const mapData = MapGenerator.generateMap(width, height);
      
      set({ 
        mapData, 
        mapWidth: width, 
        mapHeight: height,
        isLargeMap
      });
    },

    initializeLargeMapManager: (canvas: HTMLCanvasElement) => {
      const { mapWidth, mapHeight, isLargeMap } = get();
      
      if (isLargeMap) {
        const config: LargeMapConfig = {
          width: mapWidth,
          height: mapHeight,
          enableChunkLoading: true,
          enableLODRendering: true,
          preloadRadius: 3,
          maxCachedChunks: 50
        };
        
        const manager = new LargeMapManager(canvas, config);
        set({ largeMapManager: manager });
        
        // Initialiser au centre de la carte
        manager.initialize(Math.floor(mapWidth / 2), Math.floor(mapHeight / 2));
        
        console.log(`🎮 LargeMapManager initialisé pour carte ${mapWidth}x${mapHeight}`);
      }
    },
    
    setSelectedHex: (hex: HexTile | null) => {
      set({ selectedHex: hex });
    },
    
    getHexAt: (x: number, y: number) => {
      const { mapData } = get();
      if (!mapData || y < 0 || y >= mapData.length || x < 0 || x >= mapData[y].length) {
        return null;
      }
      return mapData[y][x];
    }
  }))
);
