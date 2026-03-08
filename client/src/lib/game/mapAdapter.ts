import type { HexTile, TerrainType, ResourceType } from "./types";
import type { DbTile, SegmentBlock } from "../api/mapApi";

const TERRAIN_YIELDS: Record<string, { food: number; action_points: number; gold: number }> = {
  wasteland:       { food: 0, action_points: 0, gold: 0 },
  forest:          { food: 1, action_points: 0, gold: 0 },
  mountains:       { food: 0, action_points: 0, gold: 1 },
  fertile_land:    { food: 3, action_points: 0, gold: 1 },
  hills:           { food: 1, action_points: 0, gold: 0 },
  shallow_water:   { food: 2, action_points: 0, gold: 1 },
  deep_water:      { food: 1, action_points: 0, gold: 2 },
  swamp:           { food: 1, action_points: 0, gold: 0 },
  desert:          { food: 0, action_points: 0, gold: 1 },
  sacred_plains:   { food: 2, action_points: 0, gold: 0 },
  caves:           { food: 0, action_points: 0, gold: 0 },
  ancient_ruins:   { food: 0, action_points: 0, gold: 1 },
  volcano:         { food: 0, action_points: 0, gold: 0 },
  enchanted_meadow:{ food: 2, action_points: 0, gold: 0 },
  plains:          { food: 2, action_points: 0, gold: 0 },
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
  const yields = TERRAIN_YIELDS[terrain] ?? { food: 0, action_points: 0, gold: 0 };

  return {
    x: arrayX,
    y: arrayY,
    terrain,
    food: yields.food,
    action_points: yields.action_points,
    gold: yields.gold,
    resource: toResourceType(tile.resourceType),
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

export function adaptBlockToMap(block: SegmentBlock): AdaptedBlock {
  const allTiles = block.segments.flatMap((s) => s.tiles);

  if (allTiles.length === 0) {
    return { mapData: [], width: 0, height: 0, originWorldX: 0, originWorldY: 0 };
  }

  const minWorldX = Math.min(...allTiles.map((t) => t.worldX));
  const maxWorldX = Math.max(...allTiles.map((t) => t.worldX));
  const minWorldY = Math.min(...allTiles.map((t) => t.worldY));
  const maxWorldY = Math.max(...allTiles.map((t) => t.worldY));

  const width = maxWorldX - minWorldX + 1;
  const height = maxWorldY - minWorldY + 1;

  const mapData: HexTile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      terrain: "deep_water" as TerrainType,
      food: 1,
      action_points: 0,
      gold: 2,
      resource: null,
      hasRiver: false,
      hasRoad: false,
      improvement: null,
      isVisible: false,
      isExplored: false,
    }))
  );

  for (const tile of allTiles) {
    const arrayX = tile.worldX - minWorldX;
    const arrayY = tile.worldY - minWorldY;
    if (arrayY >= 0 && arrayY < height && arrayX >= 0 && arrayX < width) {
      mapData[arrayY][arrayX] = dbTileToHexTile(tile, arrayX, arrayY);
    }
  }

  return { mapData, width, height, originWorldX: minWorldX, originWorldY: minWorldY };
}
