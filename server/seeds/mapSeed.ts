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
// ─── RÈGLE DESIGN TIER 1 ────────────────────────────────────────────────────
// - Gold n'est plus une ressource brute native de case (retiré de toutes les entrées)
// - Les cavernes peuvent contenir plusieurs minerais + huile (multi-ressources)
// - Une case peut avoir 0 à N ressources (metadata.resources = string[])
// - resourceType = ressource primaire (backward-compat), null si aucune
const TERRAIN_RESOURCES: Partial<Record<TerrainType | string, string[]>> = {
  forest:          ["deer", "fur", "herbs"],
  mountains:       ["copper", "iron", "coal", "stone"],  // gold retiré
  fertile_land:    ["wheat", "cattle", "herbs"],
  hills:           ["stone", "copper", "iron"],
  swamp:           ["herbs", "oil"],
  desert:          ["oil"],                              // gold retiré
  sacred_plains:   ["sacred_stones", "herbs"],
  caves:           ["iron", "copper", "crystals", "oil"], // oil ajouté
  ancient_ruins:   ["ancient_artifacts"],                // gold retiré
  wasteland:       ["stone", "oil"],
  shallow_water:   ["fish"],
  deep_water:      ["fish"],
  enchanted_meadow:["crystals", "herbs", "sacred_stones"],
};

// Terrains multi-ressources : max de ressources distinctes par case
const MULTI_RESOURCE_MAX: Partial<Record<string, number>> = {
  caves:     3,
  mountains: 2,
};

const RESOURCE_DENSITY = 0.25; // 25% des tuiles ont au moins une ressource

// ─── pickResources ────────────────────────────────────────────────────────────
// Génération déterministe de 0 à N ressources par case.
// Retourne [] si la tuile n'a pas de ressource.
// Pour les terrains multi-ressources, peut retourner plusieurs éléments distincts.
function pickResources(
  worldX: number,
  worldY: number,
  segX: number,
  segY: number,
  terrain: TerrainType | string
): string[] {
  // Seed A : décide si la tuile a une ressource
  const rPresence = seededRandom(hash(worldX + 7, worldY + 13, segX + 3, segY + 5));
  if (rPresence > RESOURCE_DENSITY) return [];

  const candidates = TERRAIN_RESOURCES[terrain];
  if (!candidates || candidates.length === 0) return [];

  const maxCount = MULTI_RESOURCE_MAX[terrain] ?? 1;

  // Seed B : choisit la première ressource
  const rChoice = seededRandom(hash(worldX + 11, worldY + 17, segX + 7, segY + 9));
  const first = candidates[Math.floor(rChoice * candidates.length)];
  const result = [first];

  // Pour terrains multi-ressources : décide d'ajouter des ressources supplémentaires
  for (let i = 1; i < maxCount; i++) {
    const rExtra = seededRandom(hash(worldX + 23 + i, worldY + 31 + i, segX + 11, segY + 13));
    if (rExtra > 0.55) break; // ~45% de chance d'avoir une ressource de plus

    const rExtraChoice = seededRandom(hash(worldX + 37 + i, worldY + 41 + i, segX + 17, segY + 19));
    const remaining = candidates.filter(c => !result.includes(c));
    if (remaining.length === 0) break;
    result.push(remaining[Math.floor(rExtraChoice * remaining.length)]);
  }

  return result;
}

// Wrapper backward-compat : retourne la ressource primaire (ou null)
function pickResource(
  worldX: number,
  worldY: number,
  segX: number,
  segY: number,
  terrain: TerrainType | string
): string | null {
  const resources = pickResources(worldX, worldY, segX, segY, terrain);
  return resources.length > 0 ? resources[0] : null;
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

const ARCHIPELAGO_BASE_SCORE   = -0.3;  // score de départ (océan) — archipel validé
const ARCHIPELAGO_NOISE_AMP    = 0.25;  // amplitude du bruit côtier (±0.125)
const SHALLOW_WATER_THRESHOLD  = -0.1;  // au-dessous → deep_water (côtes resserrées)

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

      const resources = pickResources(worldX, worldY, segX, segY, terrain);
      const primaryResource = resources.length > 0 ? resources[0] : null;
      const metadataVal = resources.length > 1
        ? { resources }
        : (primaryResource ? { resources: [primaryResource] } : null);

      tiles.push({
        localX,
        localY,
        worldX,
        worldY,
        terrainType: terrain,
        resourceType: primaryResource,
        elevation,
        isWalkable: TERRAIN_WALKABLE[terrain],
        movementCost: TERRAIN_MOVEMENT_COST[terrain],
        metadata: metadataVal as any,
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
