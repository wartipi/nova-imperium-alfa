import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { MapGenerator } from "../game/MapGenerator";
import type { HexTile } from "../game/types";

interface MapState {
  mapData: HexTile[][] | null;
  mapWidth: number;
  mapHeight: number;
  selectedHex: HexTile | null;
  
  // Actions
  generateMap: (width: number, height: number) => void;
  setSelectedHex: (hex: HexTile | null) => void;
  getHexAt: (x: number, y: number) => HexTile | null;
}

export const useMap = create<MapState>()(
  subscribeWithSelector((set, get) => ({
    mapData: null,
    mapWidth: 0,
    mapHeight: 0,
    selectedHex: null,
    
    generateMap: (width: number, height: number) => {
      console.log(`Generating map: ${width}x${height}`);
      const mapData = MapGenerator.generateMap(width, height);
      set({ 
        mapData, 
        mapWidth: width, 
        mapHeight: height 
      });
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
