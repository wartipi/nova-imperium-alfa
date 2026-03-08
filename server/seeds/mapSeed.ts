import { createSegment, createTilesForSegment, getSegmentCount, getTileCount } from "../mapSegmentService";
import { getAdjacentSegmentCoords, localToWorld, SEGMENT_WIDTH, SEGMENT_HEIGHT } from "../../shared/mapCoordinates";
import type { InsertMapTile } from "../../shared/schema";

type TerrainType =
  | "deep_water" | "shallow_water" | "plains" | "fertile_land"
  | "forest" | "hills" | "mountains" | "desert"
  | "swamp" | "wasteland" | "sacred_plains" | "caves" | "ancient_ruins";

const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
  deep_water:    999,
  shallow_water: 2,
  plains:        1,
  fertile_land:  1,
  forest:        2,
  hills:         2,
  mountains:     3,
  desert:        2,
  swamp:         3,
  wasteland:     2,
  sacred_plains: 1,
  caves:         2,
  ancient_ruins: 1,
};

const TERRAIN_WALKABLE: Record<TerrainType, boolean> = {
  deep_water:    false,
  shallow_water: true,
  plains:        true,
  fertile_land:  true,
  forest:        true,
  hills:         true,
  mountains:     true,
  desert:        true,
  swamp:         true,
  wasteland:     true,
  sacred_plains: true,
  caves:         true,
  ancient_ruins: true,
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hash(a: number, b: number, c: number, d: number): number {
  return a * 100003 + b * 9973 + c * 997 + d * 101;
}

function pickTerrain(worldX: number, worldY: number, segX: number, segY: number): TerrainType {
  const r1 = seededRandom(hash(worldX, worldY, segX, segY));
  const r2 = seededRandom(hash(worldY, worldX, segX + 1, segY + 1));

  const distFromCenter = Math.sqrt(worldX * worldX + worldY * worldY);

  if (distFromCenter > 90) return r1 < 0.7 ? "deep_water" : "shallow_water";
  if (distFromCenter > 70) return r1 < 0.5 ? "shallow_water" : "deep_water";

  if (r1 < 0.04) return "ancient_ruins";
  if (r1 < 0.08) return "sacred_plains";
  if (r1 < 0.12) return "caves";
  if (r1 < 0.20) return "mountains";
  if (r1 < 0.30) return "forest";
  if (r1 < 0.38) return "hills";
  if (r1 < 0.44) return "swamp";
  if (r1 < 0.50) return "desert";
  if (r1 < 0.55) return "wasteland";
  if (r1 < 0.62) return "fertile_land";
  if (r2 < 0.15) return "shallow_water";

  return "plains";
}

function generateTilesForSegment(
  segmentId: number,
  segX: number,
  segY: number
): Omit<InsertMapTile, "segmentId">[] {
  const tiles: Omit<InsertMapTile, "segmentId">[] = [];

  for (let localY = 0; localY < SEGMENT_HEIGHT; localY++) {
    for (let localX = 0; localX < SEGMENT_WIDTH; localX++) {
      const { worldX, worldY } = localToWorld(segX, segY, localX, localY);
      const terrain = pickTerrain(worldX, worldY, segX, segY);
      const elevation = parseFloat((seededRandom(hash(worldX, worldY, segX + 2, segY + 2)) * 100).toFixed(1));

      tiles.push({
        localX,
        localY,
        worldX,
        worldY,
        terrainType: terrain,
        resourceType: null,
        elevation,
        isWalkable: TERRAIN_WALKABLE[terrain],
        movementCost: TERRAIN_MOVEMENT_COST[terrain],
        metadata: null,
      });
    }
  }

  return tiles;
}

export async function seedMap(): Promise<void> {
  console.log("Démarrage du seed de la carte segmentée...");

  const coords = getAdjacentSegmentCoords(0, 0);
  let segmentsCreated = 0;
  let tilesCreated = 0;

  for (const { segmentX, segmentY } of coords) {
    const label = `(${segmentX}, ${segmentY})`;
    const segment = await createSegment(segmentX, segmentY, SEGMENT_WIDTH, SEGMENT_HEIGHT);

    const tileDefinitions = generateTilesForSegment(segment.id, segmentX, segmentY);
    const inserted = await createTilesForSegment(segment.id, tileDefinitions);

    if (inserted.length > 0) {
      tilesCreated += inserted.length;
      segmentsCreated++;
      console.log(`  Segment ${label} — ${inserted.length} tuiles créées`);
    } else {
      console.log(`  Segment ${label} — déjà présent, ignoré`);
    }
  }

  const totalSegments = await getSegmentCount();
  const totalTiles = await getTileCount();

  console.log(`Seed terminé.`);
  console.log(`  Segments créés cette exécution : ${segmentsCreated}`);
  console.log(`  Tuiles créées cette exécution  : ${tilesCreated}`);
  console.log(`  Total segments en base         : ${totalSegments}`);
  console.log(`  Total tuiles en base           : ${totalTiles}`);
}

seedMap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erreur lors du seed:", err);
    process.exit(1);
  });
