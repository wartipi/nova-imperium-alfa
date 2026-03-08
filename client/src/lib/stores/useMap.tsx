import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { MapGenerator } from "../game/MapGenerator";
import type { HexTile } from "../game/types";
import { fetchMapBlock } from "../api/mapApi";
import { adaptBlockToMap } from "../game/mapAdapter";

interface MapState {
  mapData: HexTile[][] | null;
  mapWidth: number;
  mapHeight: number;
  selectedHex: HexTile | null;
  isLoadingFromDB: boolean;
  
  // Actions
  generateMap: (width: number, height: number) => void;
  loadBlockFromDB: (centerSegX?: number, centerSegY?: number) => Promise<void>;
  setSelectedHex: (hex: HexTile | null) => void;
  getHexAt: (x: number, y: number) => HexTile | null;
}

export const useMap = create<MapState>()(
  subscribeWithSelector((set, get) => ({
    mapData: null,
    mapWidth: 0,
    mapHeight: 0,
    selectedHex: null,
    isLoadingFromDB: false,
    
    generateMap: (width: number, height: number) => {
      console.log(`Generating map: ${width}x${height}`);
      const mapData = MapGenerator.generateMap(width, height);
      set({ 
        mapData, 
        mapWidth: width, 
        mapHeight: height 
      });
    },

    loadBlockFromDB: async (centerSegX = 0, centerSegY = 0) => {
      set({ isLoadingFromDB: true });
      try {
        console.log(`Loading map block from DB: center segment (${centerSegX}, ${centerSegY})`);
        const block = await fetchMapBlock(centerSegX, centerSegY);
        const { mapData, width, height } = adaptBlockToMap(block);
        set({ mapData, mapWidth: width, mapHeight: height });
        console.log(`Map loaded from DB: ${width}x${height} (${block.totalTiles} tiles)`);
      } catch (err) {
        console.error("Failed to load map from DB, falling back to procedural generation:", err);
        const mapData = MapGenerator.generateMap(150, 90);
        set({ mapData, mapWidth: 150, mapHeight: 90 });
      } finally {
        set({ isLoadingFromDB: false });
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
