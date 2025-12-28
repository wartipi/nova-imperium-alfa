import { sql } from "drizzle-orm";
import { db } from "../db";

export async function createDatabaseIndexes(): Promise<void> {
  console.log('📊 Création des index de base de données...');

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trade_rooms_participants 
      ON trade_rooms USING GIN (participants);
    `);
    console.log('  ✅ Index GIN créé sur trade_rooms.participants');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_campaigns_participating_armies 
      ON campaigns USING GIN (participating_armies);
    `);
    console.log('  ✅ Index GIN créé sur campaigns.participating_armies');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_public_events_participants 
      ON public_events USING GIN (participants);
    `);
    console.log('  ✅ Index GIN créé sur public_events.participants');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_map_regions_center_x 
      ON map_regions (center_x);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_map_regions_center_y 
      ON map_regions (center_y);
    `);
    console.log('  ✅ Index B-tree créés sur map_regions.center_x et center_y');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_armies_owner_id 
      ON armies (owner_id);
    `);
    console.log('  ✅ Index B-tree créé sur armies.owner_id');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_marshal_contracts_army_id 
      ON marshal_contracts (army_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_marshal_contracts_status 
      ON marshal_contracts (status);
    `);
    console.log('  ✅ Index B-tree créés sur marshal_contracts');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_exchange_offers_status 
      ON exchange_offers (status);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_exchange_offers_from_player 
      ON exchange_offers (from_player);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_exchange_offers_to_player 
      ON exchange_offers (to_player);
    `);
    console.log('  ✅ Index B-tree créés sur exchange_offers');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_unique_items_owner_id 
      ON unique_items (owner_id);
    `);
    console.log('  ✅ Index B-tree créé sur unique_items.owner_id');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_player_resources_player_id 
      ON player_resources (player_id);
    `);
    console.log('  ✅ Index B-tree créé sur player_resources.player_id');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cartography_projects_player_id 
      ON cartography_projects (player_id);
    `);
    console.log('  ✅ Index B-tree créé sur cartography_projects.player_id');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_map_documents_cartographer 
      ON map_documents (cartographer);
    `);
    console.log('  ✅ Index B-tree créé sur map_documents.cartographer');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_public_events_turn 
      ON public_events (turn);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_public_events_type 
      ON public_events (type);
    `);
    console.log('  ✅ Index B-tree créés sur public_events');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_battle_events_campaign_id 
      ON battle_events (campaign_id);
    `);
    console.log('  ✅ Index B-tree créé sur battle_events.campaign_id');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_player_skills_player_id 
      ON player_skills (player_id);
    `);
    console.log('  ✅ Index B-tree créé sur player_skills.player_id');

    console.log('📊 Tous les index ont été créés avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création des index:', error);
    throw error;
  }
}

export async function dropAllIndexes(): Promise<void> {
  console.log('🗑️ Suppression des index personnalisés...');

  const indexes = [
    'idx_trade_rooms_participants',
    'idx_campaigns_participating_armies',
    'idx_public_events_participants',
    'idx_map_regions_center_x',
    'idx_map_regions_center_y',
    'idx_armies_owner_id',
    'idx_marshal_contracts_army_id',
    'idx_marshal_contracts_status',
    'idx_exchange_offers_status',
    'idx_exchange_offers_from_player',
    'idx_exchange_offers_to_player',
    'idx_unique_items_owner_id',
    'idx_player_resources_player_id',
    'idx_cartography_projects_player_id',
    'idx_map_documents_cartographer',
    'idx_public_events_turn',
    'idx_public_events_type',
    'idx_battle_events_campaign_id',
    'idx_player_skills_player_id'
  ];

  for (const indexName of indexes) {
    try {
      await db.execute(sql.raw(`DROP INDEX IF EXISTS ${indexName}`));
      console.log(`  ✅ Index supprimé: ${indexName}`);
    } catch (error) {
      console.warn(`  ⚠️ Impossible de supprimer l'index ${indexName}:`, error);
    }
  }

  console.log('🗑️ Suppression des index terminée');
}
