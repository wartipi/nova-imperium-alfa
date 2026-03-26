/**
 * server/seeds/updateResources.ts
 *
 * Met à jour resource_type ET metadata.resources sur toutes les tuiles existantes
 * en utilisant la même logique déterministe que mapSeed.ts (pickResources).
 *
 * ─ Ne crée aucune tuile ni segment
 * ─ Idempotent : relancer le script produit exactement les mêmes valeurs
 * ─ Optimisé : un seul UPDATE par lot de 500 tuiles
 * ─ Tier 1 : gold retiré des ressources brutes, oil ajouté aux cavernes
 * ─ Multi-ressources : caves et mountains peuvent avoir plusieurs ressources
 */

import { db } from "../db";
import { mapTiles } from "../../shared/schema";
import { sql } from "drizzle-orm";

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hash(a: number, b: number, c: number, d: number): number {
  return a * 100003 + b * 9973 + c * 997 + d * 101;
}

const TERRAIN_RESOURCES: Record<string, string[]> = {
  forest:          ["deer", "fur", "herbs"],
  mountains:       ["copper", "iron", "coal", "stone"],
  fertile_land:    ["wheat", "cattle", "herbs"],
  hills:           ["stone", "copper", "iron"],
  swamp:           ["herbs", "oil"],
  desert:          ["oil"],
  sacred_plains:   ["sacred_stones", "herbs"],
  caves:           ["iron", "copper", "crystals", "oil"],
  ancient_ruins:   ["ancient_artifacts"],
  wasteland:       ["stone", "oil"],
  shallow_water:   ["fish"],
  deep_water:      ["fish"],
  enchanted_meadow:["crystals", "herbs", "sacred_stones"],
};

const MULTI_RESOURCE_MAX: Record<string, number> = {
  caves:     3,
  mountains: 2,
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

function pickResources(
  worldX: number,
  worldY: number,
  segX: number,
  segY: number,
  terrain: string
): string[] {
  const rPresence = seededRandom(hash(worldX + 7, worldY + 13, segX + 3, segY + 5));
  if (rPresence > RESOURCE_DENSITY) return [];

  const candidates = TERRAIN_RESOURCES[terrain];
  if (!candidates || candidates.length === 0) return [];

  const maxCount = MULTI_RESOURCE_MAX[terrain] ?? 1;

  const rChoice = seededRandom(hash(worldX + 11, worldY + 17, segX + 7, segY + 9));
  const first = candidates[Math.floor(rChoice * candidates.length)];
  const result = [first];

  for (let i = 1; i < maxCount; i++) {
    const rExtra = seededRandom(hash(worldX + 23 + i, worldY + 31 + i, segX + 11, segY + 13));
    if (rExtra > 0.55) break;

    const rExtraChoice = seededRandom(hash(worldX + 37 + i, worldY + 41 + i, segX + 17, segY + 19));
    const remaining = candidates.filter(c => !result.includes(c));
    if (remaining.length === 0) break;
    result.push(remaining[Math.floor(rExtraChoice * remaining.length)]);
  }

  return result;
}

const BATCH_SIZE = 500;

async function updateBatch(
  batch: Array<{ id: number; resources: string[] }>
): Promise<void> {
  if (batch.length === 0) return;

  const ids = batch.map(({ id }) => id).join(",");

  const primaryCase = batch
    .map(({ id, resources }) =>
      resources.length > 0 ? `WHEN ${id} THEN '${resources[0]}'` : `WHEN ${id} THEN NULL`
    )
    .join(" ");

  const metaCase = batch
    .map(({ id, resources }) => {
      const json = JSON.stringify({ resources: resources.length > 0 ? resources : [] });
      const escaped = json.replace(/'/g, "''");
      return `WHEN ${id} THEN '${escaped}'::jsonb`;
    })
    .join(" ");

  await db.execute(
    sql.raw(
      `UPDATE map_tiles
       SET resource_type = CASE id ${primaryCase} END,
           metadata      = CASE id ${metaCase} END,
           updated_at    = NOW()
       WHERE id IN (${ids})`
    )
  );
}

async function updateResources(): Promise<void> {
  console.log("Démarrage de la mise à jour des ressources (Tier 1 / multi-resource)...");

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

  let withResource = 0;
  let withMulti = 0;
  let withoutResource = 0;
  let processed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const slice = allTiles.slice(i, i + BATCH_SIZE);

    const batch = slice.map((tile) => {
      const { segX, segY } = segmentCoordsFromWorld(tile.worldX, tile.worldY);
      const resources = pickResources(tile.worldX, tile.worldY, segX, segY, tile.terrainType);
      if (resources.length > 1) withMulti++;
      else if (resources.length === 1) withResource++;
      else withoutResource++;
      return { id: tile.id, resources };
    });

    await updateBatch(batch);

    processed += slice.length;
    const pct = Math.round(processed / total * 100);
    console.log(`  Progression : ${processed}/${total} (${pct}%)`);
  }

  console.log("");
  console.log("=== Rapport de mise à jour ===");
  console.log(`  Tuiles mises à jour      : ${processed}`);
  console.log(`  Multi-ressources         : ${withMulti}`);
  console.log(`  Ressource unique         : ${withResource}`);
  console.log(`  Sans ressource           : ${withoutResource}`);
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
