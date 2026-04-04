/**
 * respawnPlayersOnSafeSpawn.ts
 *
 * Force la relocalisation de tous les joueurs existants vers le safe spawn v2
 * (masse terrestre connectée ≥ MIN_SPAWN_LANDMASS_SIZE cases).
 *
 * À exécuter avec :
 *   tsx server/scripts/respawnPlayersOnSafeSpawn.ts
 *
 * Ne touche pas au seed, à la carte, à l'auth ni au gameplay.
 * Met uniquement à jour player_positions.
 */

import { sql } from "drizzle-orm";
import { db } from "../db";
import { findNearestValidGroundSpawn } from "../playerPositionService";
import { CANONICAL_SPAWN } from "../../shared/runtimeDefaults";

const SEGMENT_WIDTH = 50;
const SEGMENT_HEIGHT = 30;

async function respawnPlayersOnSafeSpawn() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  NOVA IMPERIUM — Relocalisation joueurs → safe spawn v2");
  console.log("═══════════════════════════════════════════════════════");

  // ── 1. Résolution du safe spawn v2 ──────────────────────────────────────────
  console.log(`\n[Respawn] Calcul du safe spawn v2 depuis CANONICAL_SPAWN (${CANONICAL_SPAWN.worldX},${CANONICAL_SPAWN.worldY})...`);
  const safeSpawn = await findNearestValidGroundSpawn(
    CANONICAL_SPAWN.worldX,
    CANONICAL_SPAWN.worldY
  );

  // ── 2. Calcul des coordonnées segment ───────────────────────────────────────
  const segmentX = Math.floor(safeSpawn.worldX / SEGMENT_WIDTH);
  const segmentY = Math.floor(safeSpawn.worldY / SEGMENT_HEIGHT);

  console.log(`[Respawn] Safe spawn v2 résolu :`);
  console.log(`  worldX=${safeSpawn.worldX}, worldY=${safeSpawn.worldY}`);
  console.log(`  segmentX=${segmentX}, segmentY=${segmentY}`);

  // ── 3. Mise à jour de toutes les positions joueurs ───────────────────────────
  console.log("\n[Respawn] Mise à jour de toutes les lignes player_positions...");
  const result = await db.execute(sql`
    UPDATE player_positions
    SET world_x    = ${safeSpawn.worldX},
        world_y    = ${safeSpawn.worldY},
        segment_x  = ${segmentX},
        segment_y  = ${segmentY},
        updated_at = NOW()
  `);

  const rowCount = (result as unknown as { rowCount?: number }).rowCount ?? 0;
  console.log(`  ${rowCount} joueur(s) repositionné(s).`);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`  Relocalisation terminée.`);
  console.log(`  Spawn : world=(${safeSpawn.worldX},${safeSpawn.worldY}) segment=(${segmentX},${segmentY})`);
  console.log(`  Joueurs mis à jour : ${rowCount}`);
  console.log("═══════════════════════════════════════════════════════");
}

respawnPlayersOnSafeSpawn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[respawnPlayersOnSafeSpawn] Erreur:", err);
    process.exit(1);
  });
