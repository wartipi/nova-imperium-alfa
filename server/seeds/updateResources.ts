/**
 * server/seeds/updateResources.ts
 *
 * Met à jour resource_type sur toutes les tuiles existantes
 * en utilisant la même logique déterministe que mapSeed.ts (pickResource).
 *
 * ─ Ne crée aucune tuile ni segment
 * ─ Ne touche à aucun autre champ
 * ─ Idempotent : relancer le script produit exactement les mêmes valeurs
 * ─ Optimisé : un seul UPDATE par lot de 500 tuiles (UPDATE … WHERE id = ANY(?))
 */

import { db } from "../db";
import { mapTiles } from "../../shared/schema";
import { sql } from "drizzle-orm";

// ─── Fonctions déterministes (identiques à mapSeed.ts) ───────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hash(a: number, b: number, c: number, d: number): number {
  return a * 100003 + b * 9973 + c * 997 + d * 101;
}

const TERRAIN_RESOURCES: Record<string, string[]> = {
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
const SEGMENT_WIDTH  = 50;
const SEGMENT_HEIGHT = 30;

function segmentCoordsFromWorld(worldX: number, worldY: number) {
  return {
    segX: Math.floor(worldX / SEGMENT_WIDTH),
    segY: Math.floor(worldY / SEGMENT_HEIGHT),
  };
}

function pickResource(
  worldX: number,
  worldY: number,
  segX: number,
  segY: number,
  terrain: string
): string | null {
  const rPresence = seededRandom(hash(worldX + 7,  worldY + 13, segX + 3, segY + 5));
  if (rPresence > RESOURCE_DENSITY) return null;

  const candidates = TERRAIN_RESOURCES[terrain];
  if (!candidates || candidates.length === 0) return null;

  const rChoice = seededRandom(hash(worldX + 11, worldY + 17, segX + 7, segY + 9));
  return candidates[Math.floor(rChoice * candidates.length)];
}

// ─── Mise à jour groupée via UPDATE … CASE WHEN ──────────────────────────────
// Envoie un seul UPDATE par lot pour minimiser les aller-retours réseau

const BATCH_SIZE = 500;

async function updateBatch(
  batch: Array<{ id: number; resource: string | null }>
): Promise<void> {
  if (batch.length === 0) return;

  // Construit : UPDATE map_tiles
  //   SET resource_type = CASE id WHEN 1 THEN 'deer' WHEN 2 THEN null … END
  //   WHERE id = ANY(ARRAY[1,2,...])
  const caseExpression = batch
    .map(({ id, resource }) =>
      resource !== null
        ? `WHEN ${id} THEN '${resource}'`
        : `WHEN ${id} THEN NULL`
    )
    .join(" ");

  const ids = batch.map(({ id }) => id).join(",");

  await db.execute(
    sql.raw(
      `UPDATE map_tiles
       SET resource_type = CASE id ${caseExpression} END,
           updated_at = NOW()
       WHERE id IN (${ids})`
    )
  );
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function updateResources(): Promise<void> {
  console.log("Démarrage de la mise à jour des ressources...");

  // 1. Lire toutes les tuiles (champs minimaux)
  const allTiles = await db
    .select({
      id:          mapTiles.id,
      worldX:      mapTiles.worldX,
      worldY:      mapTiles.worldY,
      terrainType: mapTiles.terrainType,
    })
    .from(mapTiles)
    .orderBy(mapTiles.id);

  const total = allTiles.length;
  console.log(`  Tuiles lues depuis la DB : ${total}`);

  // 2. Calculer les ressources + préparer les lots
  let withResource = 0;
  let withoutResource = 0;
  let processed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const slice = allTiles.slice(i, i + BATCH_SIZE);

    const batch = slice.map((tile) => {
      const { segX, segY } = segmentCoordsFromWorld(tile.worldX, tile.worldY);
      const resource = pickResource(tile.worldX, tile.worldY, segX, segY, tile.terrainType);
      if (resource) withResource++; else withoutResource++;
      return { id: tile.id, resource };
    });

    await updateBatch(batch);

    processed += slice.length;
    const pct = Math.round(processed / total * 100);
    console.log(`  Progression : ${processed}/${total} (${pct}%)`);
  }

  // 3. Rapport final
  console.log("");
  console.log("=== Rapport de mise à jour ===");
  console.log(`  Tuiles mises à jour : ${processed}`);
  console.log(`  Avec ressource      : ${withResource} (${(withResource / total * 100).toFixed(1)}%)`);
  console.log(`  Sans ressource      : ${withoutResource} (${(withoutResource / total * 100).toFixed(1)}%)`);
}

updateResources()
  .then(() => {
    console.log("Mise à jour terminée.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erreur lors de la mise à jour:", err);
    process.exit(1);
  });
