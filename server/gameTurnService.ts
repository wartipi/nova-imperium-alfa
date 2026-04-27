import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { gameClock, type GameClock } from "../shared/schema";

const SINGLETON_ID = 1;
const ADVISORY_LOCK_KEY = 12345;

export async function ensureGameClock(): Promise<void> {
  const existing = await db.select().from(gameClock).where(eq(gameClock.id, SINGLETON_ID));
  if (existing.length > 0) {
    console.log(`[GameClock] Existant — tour ${existing[0].currentTurn}, prochain tour: ${existing[0].nextTurnAt.toISOString()}`);
    return;
  }

  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.insert(gameClock).values({
    id:                SINGLETON_ID,
    currentTurn:       1,
    turnDurationHours: 24,
    turnStartedAt:     now,
    nextTurnAt:        next,
    lastProcessedTurn: 0,
    updatedAt:         now,
  });

  console.log(`[GameClock] Initialisé — tour 1, prochain tour: ${next.toISOString()}`);
}

export async function getGameClock(): Promise<GameClock | null> {
  const rows = await db.select().from(gameClock).where(eq(gameClock.id, SINGLETON_ID));
  return rows[0] ?? null;
}

export async function processDueTurns(): Promise<void> {
  // Verrou advisory PostgreSQL — une seule instance traite les tours à la fois
  const lockResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired`
  );
  const acquired = (lockResult.rows[0] as { acquired: boolean }).acquired;
  if (!acquired) {
    console.log("[GameClock] Verrou advisory non obtenu — une autre instance traite déjà les tours.");
    return;
  }

  try {
    const clock = await getGameClock();
    if (!clock) return;

    const now = new Date();
    if (now < clock.nextTurnAt) return;

    const durationMs = clock.turnDurationHours * 60 * 60 * 1000;
    let currentTurn = clock.currentTurn;
    let turnStartedAt = new Date(clock.turnStartedAt);
    let nextTurnAt = new Date(clock.nextTurnAt);

    let processed = 0;
    while (now >= nextTurnAt) {
      currentTurn++;
      turnStartedAt = new Date(nextTurnAt);
      nextTurnAt = new Date(turnStartedAt.getTime() + durationMs);
      processed++;
    }

    if (processed === 0) return;

    await db
      .update(gameClock)
      .set({
        currentTurn,
        turnStartedAt,
        nextTurnAt,
        lastProcessedTurn: currentTurn,
        updatedAt: now,
      })
      .where(eq(gameClock.id, SINGLETON_ID));

    console.log(`[GameClock] ${processed} tour(s) traité(s) — nouveau tour: ${currentTurn}, prochain: ${nextTurnAt.toISOString()}`);
  } finally {
    // Libération explicite du verrou advisory
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`);
  }
}
