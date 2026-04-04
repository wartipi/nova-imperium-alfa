/**
 * resetWorld.ts — Script de reset complet de la partie + reseed 20×20
 *
 * Tables RESETÉES (monde / partie courante) :
 *   market_trades, market_orders, market_guilds
 *   city_production, city_pending_harvest, city_inventory, city_buildings
 *   units, cities, territories, colonies
 *   player_discovered_tiles, player_actions
 *   cartography_projects, map_documents, map_regions
 *   map_tiles, map_segments
 *   player_bank (remis à 0), player_transport (remis à 0)
 *   faction_economy (remis à 0)
 *   player_positions → repositionnés sur le safe spawn résolu (case terrestre la plus proche de CANONICAL_SPAWN)
 *
 * Tables CONSERVÉES :
 *   users, player_state, factions, faction_members
 *   treaties, treaty_factions, treaty_signatures
 *   armies, marshal_contracts, campaigns, battle_events
 *   public_events, game_clock
 *
 * Usage : tsx server/scripts/resetWorld.ts
 */

import { db } from "../db";
import {
  marketTrades,
  marketOrders,
  marketGuilds,
  cityProduction,
  cityPendingHarvest,
  cityInventory,
  cityBuildings,
  units,
  cities,
  territories,
  colonies,
  playerDiscoveredTiles,
  playerActions,
  cartographyProjects,
  mapDocuments,
  mapRegions,
  mapTiles,
  mapSegments,
  playerBank,
  playerTransport,
  factionEconomy,
  playerPositions,
} from "../../shared/schema";
import { sql } from "drizzle-orm";
import { seedMap } from "../seeds/mapSeed";
import { findNearestValidGroundSpawn } from "../playerPositionService";
import { CANONICAL_SPAWN } from "../../shared/runtimeDefaults";

async function resetWorld(): Promise<void> {
  console.log("═══════════════════════════════════════════════════");
  console.log("  NOVA IMPERIUM — Reset monde + reseed 20×20");
  console.log("═══════════════════════════════════════════════════");

  // ── 1. Tables de marché ────────────────────────────────────────────────────
  console.log("\n[Reset] Marché...");
  const delTrades  = await db.delete(marketTrades).returning({ id: marketTrades.id });
  const delOrders  = await db.delete(marketOrders).returning({ id: marketOrders.id });
  const delGuilds  = await db.delete(marketGuilds).returning({ cityId: marketGuilds.cityId });
  console.log(`  market_trades: ${delTrades.length} ligne(s) supprimée(s)`);
  console.log(`  market_orders: ${delOrders.length} ligne(s) supprimée(s)`);
  console.log(`  market_guilds: ${delGuilds.length} ligne(s) supprimée(s)`);

  // ── 2. Production / inventaires villes ─────────────────────────────────────
  console.log("[Reset] Production et inventaires villes...");
  const delProd    = await db.delete(cityProduction).returning({ id: cityProduction.id });
  const delHarvest = await db.delete(cityPendingHarvest).returning({ cityId: cityPendingHarvest.cityId });
  const delInv     = await db.delete(cityInventory).returning({ cityId: cityInventory.cityId });
  const delBldg    = await db.delete(cityBuildings).returning({ id: cityBuildings.id });
  console.log(`  city_production:      ${delProd.length}`);
  console.log(`  city_pending_harvest: ${delHarvest.length}`);
  console.log(`  city_inventory:       ${delInv.length}`);
  console.log(`  city_buildings:       ${delBldg.length}`);

  // ── 3. Unités ──────────────────────────────────────────────────────────────
  console.log("[Reset] Unités...");
  const delUnits = await db.delete(units).returning({ id: units.id });
  console.log(`  units: ${delUnits.length}`);

  // ── 4. Villes ──────────────────────────────────────────────────────────────
  console.log("[Reset] Villes...");
  const delCities = await db.delete(cities).returning({ id: cities.id });
  console.log(`  cities: ${delCities.length}`);

  // ── 5. Territoires et colonies ─────────────────────────────────────────────
  console.log("[Reset] Territoires et colonies...");
  const delTerr = await db.delete(territories).returning({ id: territories.id });
  const delCol  = await db.delete(colonies).returning({ id: colonies.id });
  console.log(`  territories: ${delTerr.length}`);
  console.log(`  colonies:    ${delCol.length}`);

  // ── 6. Exploration joueur + actions ────────────────────────────────────────
  console.log("[Reset] Exploration et actions joueur...");
  const delDisc = await db.delete(playerDiscoveredTiles).returning({ id: playerDiscoveredTiles.id });
  const delAct  = await db.delete(playerActions).returning({ id: playerActions.id });
  console.log(`  player_discovered_tiles: ${delDisc.length}`);
  console.log(`  player_actions:          ${delAct.length}`);

  // ── 7. Cartographie legacy ─────────────────────────────────────────────────
  console.log("[Reset] Cartographie legacy...");
  const delCarto = await db.delete(cartographyProjects).returning({ id: cartographyProjects.id });
  const delDocs  = await db.delete(mapDocuments).returning({ id: mapDocuments.id });
  const delReg   = await db.delete(mapRegions).returning({ id: mapRegions.id });
  console.log(`  cartography_projects: ${delCarto.length}`);
  console.log(`  map_documents:        ${delDocs.length}`);
  console.log(`  map_regions:          ${delReg.length}`);

  // ── 8. Carte monde segmentée ───────────────────────────────────────────────
  console.log("[Reset] Carte monde (tuiles + segments)...");
  const delTiles = await db.delete(mapTiles).returning({ id: mapTiles.id });
  const delSegs  = await db.delete(mapSegments).returning({ id: mapSegments.id });
  console.log(`  map_tiles:    ${delTiles.length}`);
  console.log(`  map_segments: ${delSegs.length}`);

  // ── 9. Reset économique joueur → 0 ────────────────────────────────────────
  console.log("[Reset] Économie joueur (banque, transport)...");
  await db.execute(sql`
    UPDATE player_bank
    SET gold=0, food=0, wood=0, stone=0, iron=0,
        copper=0, coal=0, oil=0, herbs=0, fur=0,
        last_production_turn=0, updated_at=NOW()
  `);
  await db.execute(sql`
    UPDATE player_transport
    SET gold=0, food=0, wood=0, stone=0, iron=0,
        copper=0, coal=0, oil=0, herbs=0, fur=0,
        updated_at=NOW()
  `);
  console.log("  player_bank et player_transport remis à 0");

  // ── 10. Reset économie faction → 0 ────────────────────────────────────────
  console.log("[Reset] Économie factions...");
  await db.execute(sql`
    UPDATE faction_economy
    SET gold=0, food=0, last_processed_turn=0, updated_at=NOW()
  `);
  console.log("  faction_economy remise à 0");

  // ── 11. Reseed 20×20 (avant repositionnement — la carte doit exister pour le safe spawn)
  console.log("\n[Reseed] Génération de la carte 20×20...");
  await seedMap();

  // ── 12. Repositionnement joueurs → safe spawn sur terre ───────────────────
  // Résolution après reseed : la carte doit exister pour que findNearestValidGroundSpawn
  // puisse interroger map_tiles. La référence est CANONICAL_SPAWN, même logique
  // qu'ensurePlayerPosition() au runtime.
  console.log("[Reset] Résolution du safe spawn pour repositionnement joueurs...");
  const safeSpawn = await findNearestValidGroundSpawn(
    CANONICAL_SPAWN.worldX,
    CANONICAL_SPAWN.worldY
  );
  const spawnSegX = Math.floor(safeSpawn.worldX / 50);
  const spawnSegY = Math.floor(safeSpawn.worldY / 30);
  await db.execute(sql`
    UPDATE player_positions
    SET world_x=${safeSpawn.worldX},
        world_y=${safeSpawn.worldY},
        segment_x=${spawnSegX},
        segment_y=${spawnSegY},
        updated_at=NOW()
  `);
  console.log(
    `  Joueurs repositionnés sur safe spawn worldX=${safeSpawn.worldX}, worldY=${safeSpawn.worldY}` +
    ` — segment (${spawnSegX},${spawnSegY})`
  );

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Reset et reseed terminés avec succès.");
  console.log(`  Safe spawn résolu : worldX=${safeSpawn.worldX}, worldY=${safeSpawn.worldY}`);
  console.log("═══════════════════════════════════════════════════");
}

resetWorld()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[resetWorld] Erreur:", err);
    process.exit(1);
  });
