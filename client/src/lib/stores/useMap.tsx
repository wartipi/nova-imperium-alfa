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

  // Risque 1 — segment en attente si un chargement est déjà en cours
  pendingSegmentX: number | null;
  pendingSegmentY: number | null;

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

    pendingSegmentX: null,
    pendingSegmentY: null,

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
        pendingSegmentX: null,
        pendingSegmentY: null,
      });
    },

    loadBlockFromDB: async (centerSegX = 0, centerSegY = 0) => {
      if (get().isLoadingFromDB) {
        console.log(`[Map] Chargement déjà en cours — requête (${centerSegX},${centerSegY}) mise en attente`);
        set({ pendingSegmentX: centerSegX, pendingSegmentY: centerSegY });
        return;
      }

      set({ isLoadingFromDB: true, pendingSegmentX: null, pendingSegmentY: null });
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

      // Risque 1 — après chargement, traiter le segment en attente s'il est différent du chargé
      const { pendingSegmentX, pendingSegmentY, loadedCenterSegmentX, loadedCenterSegmentY } = get();
      if (
        pendingSegmentX !== null &&
        pendingSegmentY !== null &&
        (pendingSegmentX !== loadedCenterSegmentX || pendingSegmentY !== loadedCenterSegmentY)
      ) {
        console.log(`[Map] Traitement du segment en attente: (${pendingSegmentX},${pendingSegmentY})`);
        set({ pendingSegmentX: null, pendingSegmentY: null });
        get().loadBlockFromDB(pendingSegmentX, pendingSegmentY);
      }
    },

    ensurePlayerSegmentLoaded: (hexX: number, hexY: number) => {
      const {
        originWorldX,
        originWorldY,
        loadedCenterSegmentX,
        loadedCenterSegmentY,
        isLoadingFromDB,
        pendingSegmentX,
        pendingSegmentY,
      } = get();

      const worldX = hexX + originWorldX;
      const worldY = hexY + originWorldY;
      const { segmentX, segmentY } = worldToSegment(worldX, worldY);

      // Déjà chargé ou en cours de chargement vers ce même segment
      if (segmentX === loadedCenterSegmentX && segmentY === loadedCenterSegmentY) {
        console.log(`[Map] Joueur en segment (${segmentX},${segmentY}) — déjà chargé, aucun rechargement`);
        return;
      }

      if (isLoadingFromDB) {
        // Risque 1 — mémoriser le segment cible même si un chargement est en cours
        if (pendingSegmentX !== segmentX || pendingSegmentY !== segmentY) {
          console.log(`[Map] Chargement en cours — segment (${segmentX},${segmentY}) mis en attente`);
          set({ pendingSegmentX: segmentX, pendingSegmentY: segmentY });
        }
        return;
      }

      console.log(`[Map] Nouveau segment détecté: (${segmentX},${segmentY}) — chargement bloc 3×3`);
      get().loadBlockFromDB(segmentX, segmentY);
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
