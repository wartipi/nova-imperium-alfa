import type { HexTile, TerrainType, ResourceType } from "./types";
import type { DbSegment, DbTile, SegmentBlock } from "../api/mapApi";

// Bloc A V2 : fracten remplace gold comme yield visuel des tuiles.
const TERRAIN_YIELDS: Record<string, { food: number; action_points: number; fracten: number }> = {
  wasteland:       { food: 0, action_points: 0, fracten: 0 },
  forest:          { food: 1, action_points: 0, fracten: 0 },
  mountains:       { food: 0, action_points: 0, fracten: 1 },
  fertile_land:    { food: 3, action_points: 0, fracten: 1 },
  hills:           { food: 1, action_points: 0, fracten: 0 },
  shallow_water:   { food: 2, action_points: 0, fracten: 1 },
  deep_water:      { food: 1, action_points: 0, fracten: 2 },
  swamp:           { food: 1, action_points: 0, fracten: 0 },
  desert:          { food: 0, action_points: 0, fracten: 1 },
  sacred_plains:   { food: 2, action_points: 0, fracten: 0 },
  caves:           { food: 0, action_points: 0, fracten: 0 },
  ancient_ruins:   { food: 0, action_points: 0, fracten: 1 },
  volcano:         { food: 0, action_points: 0, fracten: 0 },
  enchanted_meadow:{ food: 2, action_points: 0, fracten: 0 },
  plains:          { food: 2, action_points: 0, fracten: 0 },
};

const KNOWN_TERRAIN_TYPES = new Set<string>([
  "wasteland", "forest", "mountains", "fertile_land", "hills",
  "shallow_water", "deep_water", "swamp", "desert", "sacred_plains",
  "caves", "ancient_ruins", "volcano", "enchanted_meadow", "plains",
]);

function toTerrainType(raw: string): TerrainType {
  if (KNOWN_TERRAIN_TYPES.has(raw)) return raw as TerrainType;
  return "plains";
}

function toResourceType(raw: string | null): ResourceType | null {
  return raw as ResourceType | null;
}

function dbTileToHexTile(tile: DbTile, arrayX: number, arrayY: number): HexTile {
  const terrain = toTerrainType(tile.terrainType);
  const yields = TERRAIN_YIELDS[terrain] ?? { food: 0, action_points: 0, fracten: 0 };

  const meta = tile.metadata as { resources?: string[] } | null | undefined;
  const resources: string[] = Array.isArray(meta?.resources) ? meta!.resources : [];

  return {
    x: arrayX,
    y: arrayY,
    terrain,
    food: yields.food,
    action_points: yields.action_points,
    fracten: yields.fracten,
    resource: toResourceType(tile.resourceType),
    resources,
    hasRiver: false,
    hasRoad: false,
    improvement: null,
    isVisible: false,
    isExplored: false,
  };
}

export interface AdaptedBlock {
  mapData: HexTile[][];
  width: number;
  height: number;
  originWorldX: number;
  originWorldY: number;
}

const SEGMENT_COLS = 50;
const SEGMENT_ROWS = 30;

/**
 * Construit la mapData depuis un tableau de segments en cache (CachedSegment[]).
 * Déduit l'origine depuis le segment au coin supérieur-gauche (min segmentX, min segmentY).
 */
export function buildMapFromSegments(
  segments: { segment: DbSegment; tiles: DbTile[] }[]
): AdaptedBlock {
  if (segments.length === 0) {
    return {
      mapData: [],
      width: 0,
      height: 0,
      originWorldX: 0,
      originWorldY: 0,
    };
  }

  const minSegX = Math.min(...segments.map((s) => s.segment.segmentX));
  const minSegY = Math.min(...segments.map((s) => s.segment.segmentY));
  const maxSegX = Math.max(...segments.map((s) => s.segment.segmentX));
  const maxSegY = Math.max(...segments.map((s) => s.segment.segmentY));

  const gridCols = maxSegX - minSegX + 1;
  const gridRows = maxSegY - minSegY + 1;
  const totalWidth  = gridCols * SEGMENT_COLS;
  const totalHeight = gridRows * SEGMENT_ROWS;

  const originWorldX = minSegX * SEGMENT_COLS;
  const originWorldY = minSegY * SEGMENT_ROWS;

  const mapData: HexTile[][] = Array.from({ length: totalHeight }, (_, y) =>
    Array.from({ length: totalWidth }, (_, x) => ({
      x,
      y,
      terrain: "deep_water" as TerrainType,
      food: 0,
      action_points: 0,
      fracten: 0,
      resource: null,
      resources: [],
      hasRiver: false,
      hasRoad: false,
      improvement: null,
      isVisible: false,
      isExplored: false,
    }))
  );

  for (const { segment, tiles } of segments) {
    const segOffsetX = (segment.segmentX - minSegX) * SEGMENT_COLS;
    const segOffsetY = (segment.segmentY - minSegY) * SEGMENT_ROWS;

    for (const tile of tiles) {
      const arrayX = segOffsetX + tile.localX;
      const arrayY = segOffsetY + tile.localY;

      if (arrayX < 0 || arrayX >= totalWidth || arrayY < 0 || arrayY >= totalHeight) continue;

      mapData[arrayY][arrayX] = dbTileToHexTile(tile, arrayX, arrayY);
    }
  }

  return { mapData, width: totalWidth, height: totalHeight, originWorldX, originWorldY };
}

/**
 * Alias pour compatibilité — convertit un SegmentBlock (fetchMapBlock) en AdaptedBlock.
 * @deprecated Préférer buildMapFromSegments avec le cache.
 */
export function adaptBlockToMap(block: SegmentBlock): AdaptedBlock {
  return buildMapFromSegments(block.segments);
}
