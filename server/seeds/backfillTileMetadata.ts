// ─── backfillTileMetadata.ts ──────────────────────────────────────────────────
// Backfill one-shot : remplit metadata.resources pour toutes les tuiles existantes
// qui n'ont pas encore de metadata (tiles seedées avant l'ajout du multi-ressource).
//
// Logique identique à mapSeed.ts (fonctions inline — mapSeed s'auto-execute donc
// on ne peut pas l'importer directement).
// Idempotent : skip les tuiles qui ont déjà metadata IS NOT NULL.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "../db";
import { mapTiles, mapSegments } from "../../shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

// ─── Fonctions déterministes (dupliquées depuis mapSeed.ts) ───────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function hash(a: number, b: number, c: number, d: number): number {
  return a * 100003 + b * 9973 + c * 997 + d * 101;
}

const TERRAIN_RESOURCES: Partial<Record<string, string[]>> = {
  forest:           ['deer', 'fur', 'herbs'],
  mountains:        ['copper', 'iron', 'coal', 'stone'],
  fertile_land:     ['wheat', 'cattle', 'herbs'],
  hills:            ['stone', 'copper', 'iron'],
  swamp:            ['herbs', 'oil'],
  desert:           ['oil'],
  sacred_plains:    ['sacred_stones', 'herbs'],
  caves:            ['iron', 'copper', 'crystals', 'oil'],
  ancient_ruins:    ['ancient_artifacts'],
  wasteland:        ['stone', 'oil'],
  shallow_water:    ['fish'],
  deep_water:       ['fish'],
  enchanted_meadow: ['crystals', 'herbs', 'sacred_stones'],
};

const MULTI_RESOURCE_MAX: Partial<Record<string, number>> = {
  caves:     3,
  mountains: 2,
};

const RESOURCE_DENSITY = 0.25;

function pickResources(
  worldX: number,
  worldY: number,
  segX:   number,
  segY:   number,
  terrain: string,
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

// ─── backfillTileMetadata ─────────────────────────────────────────────────────
// Requête toutes les tiles sans metadata, recalcule les ressources de façon
// déterministe, écrit metadata = { resources: [...] } en lot de 200.
export async function backfillTileMetadata(): Promise<void> {
  // Compte les tiles à backfiller
  const countResult = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(mapTiles)
    .where(isNull(mapTiles.metadata));

  const toFill = Number(countResult[0]?.cnt ?? 0);
  if (toFill === 0) {
    console.log('[backfillMetadata] Toutes les tuiles ont déjà metadata — skip');
    return;
  }

  console.log(`[backfillMetadata] ${toFill} tuiles sans metadata — démarrage du backfill...`);

  // Charge toutes les tiles + leur segment pour avoir segX/segY
  const tiles = await db
    .select({
      id:          mapTiles.id,
      worldX:      mapTiles.worldX,
      worldY:      mapTiles.worldY,
      terrainType: mapTiles.terrainType,
      segX:        mapSegments.segmentX,
      segY:        mapSegments.segmentY,
    })
    .from(mapTiles)
    .innerJoin(mapSegments, eq(mapTiles.segmentId, mapSegments.id))
    .where(isNull(mapTiles.metadata));

  let updated = 0;
  const BATCH = 200;

  for (let i = 0; i < tiles.length; i += BATCH) {
    const batch = tiles.slice(i, i + BATCH);

    await Promise.all(batch.map(tile => {
      const resources = pickResources(tile.worldX, tile.worldY, tile.segX, tile.segY, tile.terrainType);
      const metadataVal = resources.length > 0
        ? { resources }
        : { resources: [] };

      return db
        .update(mapTiles)
        .set({ metadata: metadataVal as any })
        .where(eq(mapTiles.id, tile.id));
    }));

    updated += batch.length;
    if (updated % 1000 === 0 || updated === tiles.length) {
      console.log(`[backfillMetadata] ${updated}/${tiles.length} tuiles mises à jour`);
    }
  }

  console.log(`[backfillMetadata] Terminé — ${updated} tuiles mises à jour`);
}
