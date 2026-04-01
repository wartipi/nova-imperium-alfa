/**
 * resetCurrentMatch.ts — Reset contrôlé de la partie persistante Nova Imperium
 * Usage : npx tsx scripts/resetCurrentMatch.ts
 *
 * Préserve : auth hardcodée (server/middleware/auth.ts), map_tiles, map_segments, users
 * Reset    : toutes les tables de gameplay listées dans TABLES_TO_BACKUP
 * Backup   : scripts/backups/backup_before_reset_<timestamp>.json (ignoré par git)
 */

import fs   from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { CANONICAL_SPAWN, PLAYER_STATE_DEFAULTS } from '../shared/runtimeDefaults';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL non défini');
  process.exit(1);
}

const PLAYER_IDS = ['admin', 'joueur1', 'maitre'];

const pool = new Pool({ connectionString: DATABASE_URL });

const TABLES_TO_BACKUP = [
  'market_trades', 'market_orders', 'market_guilds',
  'units',
  'city_inventory', 'city_pending_harvest',
  'cartography_projects', 'map_documents', 'map_regions',
  'territories',
  'cities', 'city_buildings', 'city_production',
  'colonies',
  'faction_economy',
  'treaties', 'treaty_factions', 'treaty_signatures',
  'faction_members', 'factions',
  'player_actions', 'player_bank', 'player_transport',
  'player_positions', 'player_state', 'player_discovered_tiles',
  'marketplace_items', 'public_events',
  'armies', 'marshal_contracts', 'campaigns', 'battle_events',
];

async function count(client: any, table: string): Promise<number> {
  const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
  return r.rows[0].n;
}

async function step(label: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${label}... `);
  await fn();
  console.log('OK');
}

async function generateBackup(client: any): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `backup_before_reset_${ts}.json`);

  const snapshot: Record<string, { count: number; rows: unknown[] }> = {};
  for (const t of TABLES_TO_BACKUP) {
    const r = await client.query(`SELECT row_to_json(row) FROM (SELECT * FROM "${t}") row`);
    snapshot[t] = { count: r.rows.length, rows: r.rows.map((x: any) => x.row_to_json) };
  }

  const doc = {
    timestamp: new Date().toISOString(),
    db: DATABASE_URL!.replace(/:[^@]+@/, ':***@'),
    tables: snapshot,
  };
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  return backupPath;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NOVA IMPERIUM — RESET PARTIE PERSISTANTE');
  console.log('  DB :', DATABASE_URL!.replace(/:[^@]+@/, ':***@'));
  console.log(`  Spawn canonique : (${CANONICAL_SPAWN.worldX}, ${CANONICAL_SPAWN.worldY})`);
  console.log('═══════════════════════════════════════════════════════');

  const client = await pool.connect();
  try {
    // ── AVANT : comptes ──────────────────────────────────────────────────────
    console.log('\n[AVANT RESET]');
    const before: Record<string, number> = {};
    for (const t of TABLES_TO_BACKUP) {
      before[t] = await count(client, t);
      console.log(`  ${before[t]}\t${t}`);
    }

    // ── BACKUP AVANT TOUTE SUPPRESSION ───────────────────────────────────────
    console.log('\n[BACKUP]');
    const backupPath = await generateBackup(client);
    console.log(`  ✓ Backup écrit : ${backupPath}`);

    // ── TRANSACTION ──────────────────────────────────────────────────────────
    console.log('\n[RESET — début de transaction]');
    await client.query('BEGIN');

    // ── 1. marché ──
    await step('market_trades', async () => { await client.query('DELETE FROM market_trades'); });
    await step('market_orders', async () => { await client.query('DELETE FROM market_orders'); });
    await step('market_guilds', async () => { await client.query('DELETE FROM market_guilds'); });

    // ── 2. unités ──
    await step('units', async () => { await client.query('DELETE FROM units'); });

    // ── 3. inventaires ville (pas de cascade) ──
    await step('city_inventory',        async () => { await client.query('DELETE FROM city_inventory'); });
    await step('city_pending_harvest',  async () => { await client.query('DELETE FROM city_pending_harvest'); });

    // ── 4. cartographie / exploration (indépendantes, 0 FK gameplay bloquante) ──
    await step('cartography_projects', async () => { await client.query('DELETE FROM cartography_projects'); });
    await step('map_documents',        async () => { await client.query('DELETE FROM map_documents'); });
    await step('map_regions',          async () => { await client.query('DELETE FROM map_regions'); });

    // ── 5. territoires (réf. colonies + factions, colonnes nullables) ──
    await step('territories', async () => { await client.query('DELETE FROM territories'); });

    // ── 6. villes (city_buildings + city_production cascadent) ──
    await step('cities (+ city_buildings + city_production via CASCADE)',
      async () => { await client.query('DELETE FROM cities'); });

    // ── 7. colonies ──
    await step('colonies', async () => { await client.query('DELETE FROM colonies'); });

    // ── 8. économie faction ──
    await step('faction_economy', async () => { await client.query('DELETE FROM faction_economy'); });

    // ── 9. traités (treaty_factions + treaty_signatures cascadent) ──
    await step('treaties (+ treaty_factions + treaty_signatures via CASCADE)',
      async () => { await client.query('DELETE FROM treaties'); });

    // ── 10. membres faction, puis factions ──
    await step('faction_members', async () => { await client.query('DELETE FROM faction_members'); });
    await step('factions',        async () => { await client.query('DELETE FROM factions'); });

    // ── 11. actions joueurs ──
    await step('player_actions', async () => { await client.query('DELETE FROM player_actions'); });

    // ── 12. économie joueurs ──
    await step('player_bank',      async () => { await client.query('DELETE FROM player_bank'); });
    await step('player_transport', async () => { await client.query('DELETE FROM player_transport'); });

    // ── 12b. fog-of-war découvertes ──
    await step('player_discovered_tiles', async () => { await client.query('DELETE FROM player_discovered_tiles'); });

    // ── 13. positions joueurs → spawn canonique via shared/runtimeDefaults ──
    await step(`player_positions → spawn canonique (${CANONICAL_SPAWN.worldX},${CANONICAL_SPAWN.worldY})`,
      async () => {
        await client.query('DELETE FROM player_positions');
        for (const pid of PLAYER_IDS) {
          await client.query(
            `INSERT INTO player_positions (player_id, world_x, world_y, segment_x, segment_y, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (player_id) DO UPDATE
               SET world_x=$2, world_y=$3, segment_x=$4, segment_y=$5, updated_at=NOW()`,
            [pid, CANONICAL_SPAWN.worldX, CANONICAL_SPAWN.worldY,
                  CANONICAL_SPAWN.segmentX, CANONICAL_SPAWN.segmentY]
          );
        }
      }
    );

    // ── 14. état joueurs → défauts via shared/runtimeDefaults ──
    await step('player_state → défauts canoniques',
      async () => {
        await client.query('DELETE FROM player_state');
        for (const pid of PLAYER_IDS) {
          await client.query(
            `INSERT INTO player_state
               (player_id, level, experience, total_experience,
                action_points, max_action_points, competence_points, competences, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
             ON CONFLICT (player_id) DO UPDATE
               SET level=$2, experience=$3, total_experience=$4,
                   action_points=$5, max_action_points=$6,
                   competence_points=$7, competences=$8::jsonb, updated_at=NOW()`,
            [
              pid,
              PLAYER_STATE_DEFAULTS.level,
              PLAYER_STATE_DEFAULTS.experience,
              PLAYER_STATE_DEFAULTS.totalExperience,
              PLAYER_STATE_DEFAULTS.actionPoints,
              PLAYER_STATE_DEFAULTS.maxActionPoints,
              PLAYER_STATE_DEFAULTS.competencePoints,
              JSON.stringify(PLAYER_STATE_DEFAULTS.competences),
            ]
          );
        }
      }
    );

    // ── 15. tables legacy / démo ──
    await step('marketplace_items (démo)', async () => { await client.query('DELETE FROM marketplace_items'); });
    await step('public_events',           async () => { await client.query('DELETE FROM public_events'); });

    // ── 16. armées / contrats / campagnes / batailles (0 lignes — nettoyage explicite) ──
    await step('armies / marshal_contracts / campaigns / battle_events', async () => {
      await client.query('DELETE FROM armies');
      await client.query('DELETE FROM marshal_contracts');
      await client.query('DELETE FROM campaigns');
      await client.query('DELETE FROM battle_events');
    });

    await client.query('COMMIT');
    console.log('\n[RESET — transaction COMMIT OK]');

    // ── APRÈS : comptes ──────────────────────────────────────────────────────
    console.log('\n[APRÈS RESET]');
    for (const t of TABLES_TO_BACKUP) {
      const n = await count(client, t);
      const isPlayerTable = t === 'player_positions' || t === 'player_state';
      const status = n === 0 ? '✓' : (isPlayerTable ? '✓ rempli' : '⚠️');
      console.log(`  ${status} ${n}\t${t}`);
    }

    // ── Vérifications critiques ──────────────────────────────────────────────
    console.log('\n[VÉRIFICATIONS FINALES]');
    const checks: [string, string][] = [
      ['territories',         '0 claim'],
      ['colonies',            '0 colonie'],
      ['cities',              '0 ville'],
      ['city_buildings',      '0 bâtiment'],
      ['city_production',     '0 production active'],
      ['player_actions',      '0 action active'],
      ['units',               '0 unité'],
      ['factions',            '0 faction'],
      ['map_regions',         '0 map_region'],
      ['map_documents',       '0 map_document'],
      ['cartography_projects','0 cartography_project'],
    ];
    let allOk = true;
    for (const [t, label] of checks) {
      const n = await count(client, t);
      const ok = n === 0;
      console.log(`  ${ok ? '✓' : '✗'} ${label} : ${n}`);
      if (!ok) allOk = false;
    }

    const posRows = (await client.query('SELECT * FROM player_positions')).rows;
    console.log(`\n  Positions joueurs (spawn canonique ${CANONICAL_SPAWN.worldX},${CANONICAL_SPAWN.worldY}) :`);
    for (const r of posRows) {
      const ok = r.world_x === CANONICAL_SPAWN.worldX && r.world_y === CANONICAL_SPAWN.worldY;
      console.log(`  ${ok ? '✓' : '✗'} ${r.player_id} → (${r.world_x}, ${r.world_y})`);
      if (!ok) allOk = false;
    }

    const mapTileCount = await count(client, 'map_tiles');
    const mapSegCount  = await count(client, 'map_segments');
    console.log(`\n  ✓ map_tiles intactes   : ${mapTileCount} tuiles`);
    console.log(`  ✓ map_segments intacts : ${mapSegCount} segments`);

    console.log('\n═══════════════════════════════════════════════════════');
    if (allOk) {
      console.log('  RESET TERMINÉ AVEC SUCCÈS — partie prête pour nouveaux tests');
    } else {
      console.log('  ⚠️  RESET PARTIEL — certaines vérifications ont échoué');
      process.exitCode = 1;
    }
    console.log(`  Backup : ${backupPath}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n[ERREUR] — ROLLBACK');
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
