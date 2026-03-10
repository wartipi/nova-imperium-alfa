import { db } from "../db";
import { mapTiles } from "../../shared/schema";
import { sql, eq } from "drizzle-orm";

// ─── Reproduction exacte de mapSeed.ts (archipel validé) ─────────────────────

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

const RESOURCE_DENSITY = 0.25;

const ISLAND_CENTERS: Array<{ cx: number; cy: number; radius: number; strength: number }> = [
  { cx: 25,  cy: 15,  radius: 30, strength: 1.5  },
  { cx: -20, cy: -5,  radius: 20, strength: 1.1  },
  { cx: 75,  cy: 35,  radius: 22, strength: 1.1  },
  { cx: 85,  cy: -5,  radius: 14, strength: 0.9  },
  { cx: -10, cy: 45,  radius: 12, strength: 0.85 },
  { cx: 50,  cy: -10, radius: 11, strength: 0.8  },
  { cx: 5,   cy: 30,  radius: 10, strength: 0.75 },
];

const ARCHIPELAGO_BASE_SCORE  = -0.3;
const ARCHIPELAGO_NOISE_AMP   =  0.25;
const SHALLOW_WATER_THRESHOLD = -0.1;

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hash(a: number, b: number, c: number, d: number): number {
  return a * 100003 + b * 9973 + c * 997 + d * 101;
}

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
  score += seededRandom(hash(worldX, worldY, 42, 17)) * ARCHIPELAGO_NOISE_AMP
         - ARCHIPELAGO_NOISE_AMP / 2;
  return score;
}

function pickTerrain(worldX: number, worldY: number, segX: number, segY: number): TerrainType {
  const landScore = computeLandScore(worldX, worldY);
  if (landScore <= 0) {
    return landScore > SHALLOW_WATER_THRESHOLD ? "shallow_water" : "deep_water";
  }
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

function pickResource(
  worldX: number,
  worldY: number,
  segX: number,
  segY: number,
  terrain: TerrainType | string
): string | null {
  const rPresence = seededRandom(hash(worldX + 7, worldY + 13, segX + 3, segY + 5));
  if (rPresence > RESOURCE_DENSITY) return null;
  const candidates = TERRAIN_RESOURCES[terrain];
  if (!candidates || candidates.length === 0) return null;
  const rChoice = seededRandom(hash(worldX + 11, worldY + 17, segX + 7, segY + 9));
  return candidates[Math.floor(rChoice * candidates.length)];
}

// ─── Migration en place ───────────────────────────────────────────────────────

const BATCH_SIZE = 500;

export async function updateTerrain(): Promise<void> {
  console.log("Démarrage de la mise à jour du terrain (archipel)...");

  // Lire toutes les tuiles : uniquement les champs nécessaires au recalcul
  const allTiles = await db
    .select({
      id:     mapTiles.id,
      worldX: mapTiles.worldX,
      worldY: mapTiles.worldY,
    })
    .from(mapTiles);

  console.log(`  ${allTiles.length} tuiles à mettre à jour`);

  let updated = 0;
  const batches = Math.ceil(allTiles.length / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batch = allTiles.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

    await db.transaction(async (tx) => {
      for (const tile of batch) {
        const segX    = Math.floor(tile.worldX / 50);
        const segY    = Math.floor(tile.worldY / 30);
        const terrain = pickTerrain(tile.worldX, tile.worldY, segX, segY);
        const resource = pickResource(tile.worldX, tile.worldY, segX, segY, terrain);

        await tx
          .update(mapTiles)
          .set({
            terrainType:  terrain,
            resourceType: resource,
            isWalkable:   TERRAIN_WALKABLE[terrain],
            movementCost: TERRAIN_MOVEMENT_COST[terrain],
          })
          .where(eq(mapTiles.id, tile.id));
      }
    });

    updated += batch.length;
    console.log(`  Batch ${b + 1}/${batches} — ${updated}/${allTiles.length} tuiles mises à jour`);
  }

  console.log(`\nMise à jour terminée. ${updated} tuiles recalculées.`);
}

updateTerrain()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erreur lors de la mise à jour:", err);
    process.exit(1);
  });
