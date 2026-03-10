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

// ─── Table terrain → ressources possibles ────────────────────────────────────
// Calquée sur MapGenerator.getSuitableResources() côté client
const TERRAIN_RESOURCES: Partial<Record<TerrainType | string, string[]>> = {
  forest:          ["deer", "fur", "herbs"],
  mountains:       ["copper", "iron", "gold", "coal", "stone"],
  fertile_land:    ["wheat", "cattle", "herbs"],
  hills:           ["stone", "copper", "iron"],
  swamp:           ["herbs", "oil"],
  desert:          ["oil", "gold"],
  sacred_plains:   ["sacred_stones", "herbs"],
  caves:           ["iron", "copper", "crystals"],
  ancient_ruins:   ["ancient_artifacts", "gold"],
  wasteland:       ["stone", "oil"],
  shallow_water:   ["fish"],
  deep_water:      ["fish"],
  enchanted_meadow:["crystals", "herbs", "sacred_stones"],
};

const RESOURCE_DENSITY = 0.25; // 25% des tuiles ont une ressource

// ─── Génération déterministe de ressource ────────────────────────────────────
// Utilise des seeds différents de pickTerrain pour éviter la corrélation
function pickResource(
  worldX: number,
  worldY: number,
  segX: number,
  segY: number,
  terrain: TerrainType | string
): string | null {
  // Seed A : décide si la tuile a une ressource
  const rPresence = seededRandom(hash(worldX + 7,  worldY + 13, segX + 3, segY + 5));
  if (rPresence > RESOURCE_DENSITY) return null;

  const candidates = TERRAIN_RESOURCES[terrain];
  if (!candidates || candidates.length === 0) return null;

  // Seed B : choisit laquelle parmi les candidates
  const rChoice = seededRandom(hash(worldX + 11, worldY + 17, segX + 7, segY + 9));
  return candidates[Math.floor(rChoice * candidates.length)];
}

// ─── Centres d'îles de l'archipel (déterministes, codés en dur) ─────────────
// Carte monde : X de -50 à +99, Y de -30 à +59, centre géométrique (25, 15)
const ISLAND_CENTERS: Array<{ cx: number; cy: number; radius: number; strength: number }> = [
  // Grande île centrale
  { cx: 25,  cy: 15,  radius: 30, strength: 1.5  },
  // Îles moyennes
  { cx: -20, cy: -5,  radius: 20, strength: 1.1  },
  { cx: 75,  cy: 35,  radius: 22, strength: 1.1  },
  // Petites îles
  { cx: 85,  cy: -5,  radius: 14, strength: 0.9  },
  { cx: -10, cy: 45,  radius: 12, strength: 0.85 },
  { cx: 50,  cy: -10, radius: 11, strength: 0.8  },
  { cx: 5,   cy: 30,  radius: 10, strength: 0.75 },
];

const ARCHIPELAGO_BASE_SCORE   = -0.5;  // score de départ (océan)
const ARCHIPELAGO_NOISE_AMP    = 0.25;  // amplitude du bruit côtier (±0.125)
const SHALLOW_WATER_THRESHOLD  = -0.25; // au-dessous → deep_water

// Calcule le score terre/eau d'une tuile (> 0 = terre, ≤ 0 = eau)
function computeLandScore(worldX: number, worldY: number): number {
  let score = ARCHIPELAGO_BASE_SCORE;

  for (const center of ISLAND_CENTERS) {
    const dx   = worldX - center.cx;
    const dy   = worldY - center.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < center.radius) {
      score += center.strength * (1 - dist / center.radius);
    }
  }

  // Bruit déterministe pour des côtes organiques (seeds distincts de pickTerrain)
  const noise = seededRandom(hash(worldX, worldY, 42, 17)) * ARCHIPELAGO_NOISE_AMP
              - ARCHIPELAGO_NOISE_AMP / 2;
  score += noise;

  return score;
}

function pickTerrain(worldX: number, worldY: number, segX: number, segY: number): TerrainType {
  const landScore = computeLandScore(worldX, worldY);

  // ─── Décision eau ────────────────────────────────────────────────────────
  if (landScore <= 0) {
    return landScore > SHALLOW_WATER_THRESHOLD ? "shallow_water" : "deep_water";
  }

  // ─── Décision terre → type de terrain ────────────────────────────────────
  // Seuils identiques à l'algorithme original (aucun rebalancement des biomes)
  const r1 = seededRandom(hash(worldX, worldY, segX, segY));

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
        resourceType: pickResource(worldX, worldY, segX, segY, terrain),
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
