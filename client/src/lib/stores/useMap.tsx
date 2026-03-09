import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { MapGenerator } from "../game/MapGenerator";
import type { HexTile } from "../game/types";
import type { DbSegment, DbTile } from "../api/mapApi";
import { fetchMapBlock } from "../api/mapApi";
import { adaptBlockToMap, buildMapFromSegments } from "../game/mapAdapter";
import { worldToSegment, getAdjacentSegmentCoords } from "../../../../shared/mapCoordinates";
import { savePlayerPosition } from "../api/playerApi";

type CachedSegment = { segment: DbSegment; tiles: DbTile[] };

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

  pendingSegmentX: number | null;
  pendingSegmentY: number | null;

  cachedSegments: Record<string, CachedSegment>;

  // Actions
  generateMap: (width: number, height: number) => void;
  loadBlockFromDB: (centerSegX?: number, centerSegY?: number) => Promise<void>;
  ensurePlayerSegmentLoaded: (hexX: number, hexY: number) => void;
  setSelectedHex: (hex: HexTile | null) => void;
  getHexAt: (x: number, y: number) => HexTile | null;
}

function segmentKey(segX: number, segY: number): string {
  return `${segX},${segY}`;
}

function getActiveKeys(centerSegX: number, centerSegY: number): Set<string> {
  return new Set(
    getAdjacentSegmentCoords(centerSegX, centerSegY).map((s) =>
      segmentKey(s.segmentX, s.segmentY)
    )
  );
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

    cachedSegments: {},

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
        cachedSegments: {},
      });
    },

    loadBlockFromDB: async (centerSegX = 0, centerSegY = 0) => {
      if (get().isLoadingFromDB) {
        console.log(`[Map] Chargement déjà en cours — (${centerSegX},${centerSegY}) mis en attente`);
        set({ pendingSegmentX: centerSegX, pendingSegmentY: centerSegY });
        return;
      }

      set({ isLoadingFromDB: true, pendingSegmentX: null, pendingSegmentY: null });

      try {
        const activeKeys = getActiveKeys(centerSegX, centerSegY);
        const { cachedSegments } = get();

        // Vérifier si tous les segments du bloc sont déjà en cache
        const allCached = Array.from(activeKeys).every((k) => k in cachedSegments);

        let newCachedSegments: Record<string, CachedSegment>;

        if (allCached) {
          console.log(`[Map] Bloc (${centerSegX},${centerSegY}) entièrement en cache — aucun fetch réseau`);
          newCachedSegments = { ...cachedSegments };
        } else {
          console.log(`[Map] Chargement bloc DB: segment central (${centerSegX}, ${centerSegY})`);
          const block = await fetchMapBlock(centerSegX, centerSegY);

          // Fusionner les nouveaux segments dans le cache
          newCachedSegments = { ...cachedSegments };
          for (const entry of block.segments) {
            const key = segmentKey(entry.segment.segmentX, entry.segment.segmentY);
            newCachedSegments[key] = entry;
          }
        }

        // Éviction — conserver uniquement les 9 segments du bloc actif
        const evicted: string[] = [];
        for (const key of Object.keys(newCachedSegments)) {
          if (!activeKeys.has(key)) {
            delete newCachedSegments[key];
            evicted.push(key);
          }
        }
        if (evicted.length > 0) {
          console.log(`[Map] Cache: ${evicted.length} segment(s) déchargé(s): ${evicted.join(", ")}`);
        }

        // Reconstruire mapData depuis les segments en cache
        const activeSegments = Array.from(activeKeys)
          .filter((k) => k in newCachedSegments)
          .map((k) => newCachedSegments[k]);

        const { mapData, width, height, originWorldX, originWorldY } =
          buildMapFromSegments(activeSegments);

        set({
          mapData,
          mapWidth: width,
          mapHeight: height,
          originWorldX,
          originWorldY,
          loadedCenterSegmentX: centerSegX,
          loadedCenterSegmentY: centerSegY,
          cachedSegments: newCachedSegments,
        });

        console.log(
          `[Map] Bloc prêt: ${width}x${height} — ${activeSegments.length} segments en cache` +
          ` — origine (${originWorldX}, ${originWorldY})`
        );
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
          cachedSegments: {},
        });
      } finally {
        set({ isLoadingFromDB: false });
      }

      // Traiter le segment en attente s'il est différent du chargé
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

      if (segmentX === loadedCenterSegmentX && segmentY === loadedCenterSegmentY) {
        console.log(`[Map] Joueur en segment (${segmentX},${segmentY}) — déjà chargé, aucun rechargement`);
        return;
      }

      if (isLoadingFromDB) {
        if (pendingSegmentX !== segmentX || pendingSegmentY !== segmentY) {
          console.log(`[Map] Chargement en cours — segment (${segmentX},${segmentY}) mis en attente`);
          set({ pendingSegmentX: segmentX, pendingSegmentY: segmentY });
        }
        return;
      }

      console.log(`[Map] Nouveau segment détecté: (${segmentX},${segmentY}) — chargement bloc 3×3`);

      // Sauvegarde secondaire — position monde avant transition de segment
      // L'origine est encore stable ici (chargement pas encore déclenché)
      savePlayerPosition(worldX, worldY).catch((err) => {
        console.warn(`[PlayerSave] Erreur sauvegarde changement segment: ${err}`);
      });
      console.log(`[PlayerSave] Changement segment → world=(${worldX},${worldY})`);

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
