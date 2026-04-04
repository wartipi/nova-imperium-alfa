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

// ─── Générateur temporaire de test — Archipel 20×20 ──────────────────────────
//
// Ce générateur est TEMPORAIRE pour la phase de test à l'échelle 20×20 segments.
// Il n'a pas vocation à être le générateur final de la campagne.
// Le pipeline terrain (computeLandScore → pickTerrain) peut être remplacé
// ultérieurement sans toucher au reste du seed ni à la persistance.
//
// Monde 20×20 : worldX [-500..+499], worldY [-300..+299]
//
// Stratégie :
//   Découpage en macro-cellules de 100×100 cases monde (2×2 segments).
//   Grille : 10 colonnes × 6 lignes = 60 macro-cellules.
//   Environ 40 % des macro-cellules contiennent 1 ou 2 archipels.
//   Position, rayon et force sont totalement déterministes via seededRandom/hash.
//
function generateIslandCenters(): Array<{ cx: number; cy: number; radius: number; strength: number }> {
  const centers: Array<{ cx: number; cy: number; radius: number; strength: number }> = [];

  const MACRO_SIZE    = 100;   // taille d'une macro-cellule en cases monde
  const X_MIN         = -500;  // bord gauche du monde
  const X_CELLS       = 10;    // colonnes de macro-cellules
  const Y_MIN         = -300;  // bord haut du monde
  const Y_CELLS       = 6;     // lignes de macro-cellules

  const ACTIVE_RATE   = 0.40;  // 40 % des cellules ont un archipel
  const DUAL_RATE     = 0.45;  // 45 % des cellules actives ont 2 centres (sinon 1)

  const JITTER_RANGE  = 60;    // décalage max ±30 unités autour du centre de cellule
  const RADIUS_MIN    = 18;
  const RADIUS_RANGE  = 27;    // radius dans [18, 45]
  const STR_MIN       = 0.80;
  const STR_RANGE     = 1.00;  // strength dans [0.80, 1.80]

  for (let row = 0; row < Y_CELLS; row++) {
    for (let col = 0; col < X_CELLS; col++) {
      const mcX = X_MIN + col * MACRO_SIZE; // coin gauche de la cellule
      const mcY = Y_MIN + row * MACRO_SIZE; // coin haut de la cellule

      // Décision : cette cellule est-elle active ?
      const rActive = seededRandom(hash(mcX, mcY, 99, 77));
      if (rActive > ACTIVE_RATE) continue;

      // Nombre de centres dans cette cellule
      const rDual   = seededRandom(hash(mcX, mcY, 11, 33));
      const nCenters = rDual < DUAL_RATE ? 2 : 1;

      for (let i = 0; i < nCenters; i++) {
        const cellCX = mcX + MACRO_SIZE / 2; // centre géométrique de la cellule
        const cellCY = mcY + MACRO_SIZE / 2;

        // Jitter déterministe (décalage ±JITTER_RANGE/2)
        const jX = (seededRandom(hash(mcX, mcY, 13, i * 7 + 1)) - 0.5) * JITTER_RANGE;
        const jY = (seededRandom(hash(mcX, mcY, 17, i * 7 + 2)) - 0.5) * JITTER_RANGE;

        const radius   = RADIUS_MIN + seededRandom(hash(mcX, mcY, 23, i * 7 + 3)) * RADIUS_RANGE;
        const strength = STR_MIN    + seededRandom(hash(mcX, mcY, 31, i * 7 + 4)) * STR_RANGE;

        centers.push({
          cx:       Math.round(cellCX + jX),
          cy:       Math.round(cellCY + jY),
          radius:   Math.round(radius),
          strength: parseFloat(strength.toFixed(2)),
        });
      }
    }
  }

  return centers;
}

// Centres d'îles — générés de façon déterministe à l'échelle du monde 20×20
const ISLAND_CENTERS = generateIslandCenters();

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

// ─── Grille monde 20×20 segments ─────────────────────────────────────────────
// segmentX : -10 à +9 (inclus)
// segmentY : -10 à +9 (inclus)
// Monde monde : worldX de -500 à +499, worldY de -300 à +299
// Centre géométrique : (0, 0) dans l'espace segment → worldX=0, worldY=0
function getWorldGrid20x20(): Array<{ segmentX: number; segmentY: number }> {
  const coords: Array<{ segmentX: number; segmentY: number }> = [];
  for (let sy = -10; sy <= 9; sy++) {
    for (let sx = -10; sx <= 9; sx++) {
      coords.push({ segmentX: sx, segmentY: sy });
    }
  }
  return coords;
}

export async function seedMap(): Promise<void> {
  console.log("Démarrage du seed de la carte segmentée (20×20 segments)...");
  console.log("  Grille : segmentX [-10, +9] × segmentY [-10, +9]");

  const coords = getWorldGrid20x20();
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
  console.log(`  Segments créés cette exécution : ${segmentsCreated} / 400`);
  console.log(`  Tuiles créées cette exécution  : ${tilesCreated}`);
  console.log(`  Total segments en base         : ${totalSegments}`);
  console.log(`  Total tuiles en base           : ${totalTiles}`);
}

// Exécution directe uniquement (tsx server/seeds/mapSeed.ts)
// Lorsque ce module est importé par resetWorld.ts, ce bloc ne s'exécute pas.
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("seeds/mapSeed")) {
  seedMap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Erreur lors du seed:", err);
      process.exit(1);
    });
}
