/**
 * resetCurrentMatch.ts — Reset contrôlé de la partie persistante Nova Imperium
 * Usage : npx tsx scripts/resetCurrentMatch.ts
 *
 * Préserve : auth hardcodée (server/middleware/auth.ts), map_tiles, map_segments, users (vide)
 * Reset    : toutes les tables de gameplay (voir PLAN ci-dessous)
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL non défini');
  process.exit(1);
}

const SPAWN = { worldX: 25, worldY: 15, segmentX: 0, segmentY: 0 };
const PLAYER_IDS = ['admin', 'joueur1', 'maitre'];

const pool = new Pool({ connectionString: DATABASE_URL });

async function count(client: any, table: string): Promise<number> {
  const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
  return r.rows[0].n;
}

async function step(label: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${label}... `);
  await fn();
  console.log('OK');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NOVA IMPERIUM — RESET PARTIE PERSISTANTE');
  console.log('  DB :', DATABASE_URL!.replace(/:[^@]+@/, ':***@'));
  console.log('═══════════════════════════════════════════════════════');

  const client = await pool.connect();
  try {
    // ── AVANT : comptes ──────────────────────────────────────────────────────
    console.log('\n[AVANT RESET]');
    const TRACKED = [
      'territories','colonies','cities','city_buildings','city_production',
      'city_inventory','city_pending_harvest',
      'units','market_guilds','market_orders','market_trades',
      'factions','faction_members','faction_economy',
      'treaties','treaty_factions','treaty_signatures',
      'player_actions','player_bank','player_transport','player_positions','player_state',
      'marketplace_items','public_events',
    ];
    const before: Record<string, number> = {};
    for (const t of TRACKED) {
      before[t] = await count(client, t);
      console.log(`  ${before[t]}\t${t}`);
    }

    // ── TRANSACTION ──────────────────────────────────────────────────────────
    console.log('\n[RESET — début de transaction]');
    await client.query('BEGIN');

    // Ordre FK-safe : enfants en premier, parents ensuite
    // ── 1. marché ──
    await step('market_trades', async () => {
      await client.query('DELETE FROM market_trades');
    });
    await step('market_orders', async () => {
      await client.query('DELETE FROM market_orders');
    });
    await step('market_guilds', async () => {
      await client.query('DELETE FROM market_guilds');
    });

    // ── 2. unités ──
    await step('units', async () => {
      await client.query('DELETE FROM units');
    });

    // ── 3. inventaires ville (sans cascade) ──
    await step('city_inventory', async () => {
      await client.query('DELETE FROM city_inventory');
    });
    await step('city_pending_harvest', async () => {
      await client.query('DELETE FROM city_pending_harvest');
    });

    // ── 4. territoires (ref colonies + factions, nullables) ──
    await step('territories', async () => {
      await client.query('DELETE FROM territories');
    });

    // ── 5. villes (city_buildings + city_production cascadent automatiquement) ──
    await step('cities (+ city_buildings + city_production via CASCADE)', async () => {
      await client.query('DELETE FROM cities');
    });

    // ── 6. colonies ──
    await step('colonies', async () => {
      await client.query('DELETE FROM colonies');
    });

    // ── 7. économie faction ──
    await step('faction_economy', async () => {
      await client.query('DELETE FROM faction_economy');
    });

    // ── 8. traités (treaty_factions + treaty_signatures cascadent) ──
    await step('treaties (+ treaty_factions + treaty_signatures via CASCADE)', async () => {
      await client.query('DELETE FROM treaties');
    });

    // ── 9. membres faction, puis factions ──
    await step('faction_members', async () => {
      await client.query('DELETE FROM faction_members');
    });
    await step('factions', async () => {
      await client.query('DELETE FROM factions');
    });

    // ── 10. actions joueurs ──
    await step('player_actions', async () => {
      await client.query('DELETE FROM player_actions');
    });

    // ── 11. économie joueurs ──
    await step('player_bank', async () => {
      await client.query('DELETE FROM player_bank');
    });
    await step('player_transport', async () => {
      await client.query('DELETE FROM player_transport');
    });

    // ── 12. positions joueurs → respawn canonique (25,15) ──
    await step('player_positions → spawn canonique (25,15)', async () => {
      await client.query('DELETE FROM player_positions');
      for (const pid of PLAYER_IDS) {
        await client.query(
          `INSERT INTO player_positions (player_id, world_x, world_y, segment_x, segment_y, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (player_id) DO UPDATE
             SET world_x=$2, world_y=$3, segment_x=$4, segment_y=$5, updated_at=NOW()`,
          [pid, SPAWN.worldX, SPAWN.worldY, SPAWN.segmentX, SPAWN.segmentY]
        );
      }
    });

    // ── 13. état joueurs → reset aux valeurs par défaut ──
    await step('player_state → défauts (PA=25, level=1)', async () => {
      await client.query('DELETE FROM player_state');
      for (const pid of PLAYER_IDS) {
        await client.query(
          `INSERT INTO player_state
             (player_id, level, experience, total_experience,
              action_points, max_action_points, competence_points, competences, updated_at)
           VALUES ($1, 1, 0, 0, 25, 100, 3, '[]'::jsonb, NOW())
           ON CONFLICT (player_id) DO UPDATE
             SET level=1, experience=0, total_experience=0,
                 action_points=25, max_action_points=100,
                 competence_points=3, competences='[]'::jsonb, updated_at=NOW()`,
          [pid]
        );
      }
    });

    // ── 14. tables legacy / démo ──
    await step('marketplace_items (démo)', async () => {
      await client.query('DELETE FROM marketplace_items');
    });
    await step('public_events', async () => {
      await client.query('DELETE FROM public_events');
    });

    // ── 15. armées / contrats / campagnes / batailles (0 lignes mais nettoyage explicite) ──
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
    for (const t of TRACKED) {
      const n = await count(client, t);
      const status = n === 0 ? '✓' : (t === 'player_positions' || t === 'player_state' ? '✓ rempli' : '⚠️');
      console.log(`  ${status} ${n}\t${t}`);
    }

    // ── Vérifications critiques ──────────────────────────────────────────────
    console.log('\n[VÉRIFICATIONS FINALES]');
    const checks = [
      ['territories',          '0 claim'],
      ['colonies',             '0 colonie'],
      ['cities',               '0 ville'],
      ['city_buildings',       '0 bâtiment'],
      ['city_production',      '0 production active'],
      ['player_actions',       '0 action active'],
      ['units',                '0 unité'],
      ['factions',             '0 faction'],
    ];
    let allOk = true;
    for (const [t, label] of checks) {
      const n = await count(client, t);
      const ok = n === 0;
      console.log(`  ${ok ? '✓' : '✗'} ${label} : ${n}`);
      if (!ok) allOk = false;
    }

    const posRows = (await client.query('SELECT * FROM player_positions')).rows;
    console.log(`\n  Positions joueurs (doit = spawn 25,15) :`);
    for (const r of posRows) {
      const ok = r.world_x === 25 && r.world_y === 15;
      console.log(`  ${ok ? '✓' : '✗'} ${r.player_id} → (${r.world_x}, ${r.world_y})`);
      if (!ok) allOk = false;
    }

    const mapOk = await count(client, 'map_tiles');
    console.log(`\n  ✓ map_tiles intactes : ${mapOk} tuiles`);
    const segOk = await count(client, 'map_segments');
    console.log(`  ✓ map_segments intactes : ${segOk} segments`);

    console.log('\n═══════════════════════════════════════════════════════');
    if (allOk) {
      console.log('  RESET TERMINÉ AVEC SUCCÈS — partie prête pour nouveaux tests');
    } else {
      console.log('  ⚠️  RESET PARTIEL — certaines vérifications ont échoué');
      process.exitCode = 1;
    }
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
