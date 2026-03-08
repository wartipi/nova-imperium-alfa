import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { MapGenerator } from "../game/MapGenerator";
import type { HexTile } from "../game/types";
import { fetchMapBlock } from "../api/mapApi";
import { adaptBlockToMap } from "../game/mapAdapter";
import { worldToSegment } from "../../../../shared/mapCoordinates";

interface MapState {
  mapData: HexTile[][] | null;
  mapWidth: number;
  mapHeight: number;
  selectedHex: HexTile | null;
  isLoadingFromDB: boolean;

  loadedCenterSegmentX: number | null;
  loadedCenterSegmentY: number | null;
  originWorldX: number;
  originWorldY: number;

  // Actions
  generateMap: (width: number, height: number) => void;
  loadBlockFromDB: (centerSegX?: number, centerSegY?: number) => Promise<void>;
  ensurePlayerSegmentLoaded: (hexX: number, hexY: number) => void;
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

    loadedCenterSegmentX: null,
    loadedCenterSegmentY: null,
    originWorldX: 0,
    originWorldY: 0,

    generateMap: (width: number, height: number) => {
      console.log(`Generating map: ${width}x${height}`);
      const mapData = MapGenerator.generateMap(width, height);
      set({
        mapData,
        mapWidth: width,
        mapHeight: height,
        originWorldX: 0,
        originWorldY: 0,
        loadedCenterSegmentX: null,
        loadedCenterSegmentY: null,
      });
    },

    loadBlockFromDB: async (centerSegX = 0, centerSegY = 0) => {
      const { isLoadingFromDB } = get();
      if (isLoadingFromDB) {
        console.log(`[Map] Chargement déjà en cours — requête (${centerSegX},${centerSegY}) ignorée`);
        return;
      }

      set({ isLoadingFromDB: true });
      try {
        console.log(`[Map] Chargement bloc DB: segment central (${centerSegX}, ${centerSegY})`);
        const block = await fetchMapBlock(centerSegX, centerSegY);
        const { mapData, width, height, originWorldX, originWorldY } = adaptBlockToMap(block);
        set({
          mapData,
          mapWidth: width,
          mapHeight: height,
          originWorldX,
          originWorldY,
          loadedCenterSegmentX: centerSegX,
          loadedCenterSegmentY: centerSegY,
        });
        console.log(`[Map] Bloc chargé: ${width}x${height} (${block.totalTiles} tuiles) — origine monde (${originWorldX}, ${originWorldY})`);
      } catch (err) {
        console.error("[Map] Échec chargement DB, fallback procédural:", err);
        const mapData = MapGenerator.generateMap(150, 90);
        set({
          mapData,
          mapWidth: 150,
          mapHeight: 90,
          originWorldX: 0,
          originWorldY: 0,
          loadedCenterSegmentX: null,
          loadedCenterSegmentY: null,
        });
      } finally {
        set({ isLoadingFromDB: false });
      }
    },

    ensurePlayerSegmentLoaded: (hexX: number, hexY: number) => {
      const {
        originWorldX,
        originWorldY,
        loadedCenterSegmentX,
        loadedCenterSegmentY,
        isLoadingFromDB,
        loadBlockFromDB,
      } = get();

      if (isLoadingFromDB) {
        console.log(`[Map] Chargement en cours — détection segment ignorée pour (${hexX}, ${hexY})`);
        return;
      }

      const worldX = hexX + originWorldX;
      const worldY = hexY + originWorldY;
      const { segmentX, segmentY } = worldToSegment(worldX, worldY);

      if (segmentX === loadedCenterSegmentX && segmentY === loadedCenterSegmentY) {
        console.log(`[Map] Joueur en segment (${segmentX},${segmentY}) — déjà chargé, aucun rechargement`);
        return;
      }

      console.log(`[Map] Nouveau segment détecté: (${segmentX},${segmentY}) — chargement bloc 3×3`);
      loadBlockFromDB(segmentX, segmentY);
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
    },
  }))
);
