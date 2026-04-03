import { Router } from "express";
import { eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { playerBank, playerTransport, cityInventory, cities, colonies } from "../../shared/schema";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

const TEST_AMOUNT = 2;

const RESOURCE_FIELDS = ["gold", "food", "wood", "stone", "iron", "copper", "coal", "oil", "herbs", "fur"] as const;

function buildResourceDefaults(): Record<string, number> {
  const obj: Record<string, number> = {};
  for (const r of RESOURCE_FIELDS) obj[r] = TEST_AMOUNT;
  return obj;
}

function buildResourceIncrements(table: typeof playerBank | typeof playerTransport | typeof cityInventory) {
  const obj: Record<string, any> = {};
  for (const r of RESOURCE_FIELDS) {
    obj[r] = sql`${(table as any)[r]} + ${TEST_AMOUNT}`;
  }
  return obj;
}

// POST /api/debug/grant-test-resources
// Ajoute TEST_AMOUNT de chaque ressource dans player_bank, player_transport et city_inventory.
router.post("/grant-test-resources", requireAuth, async (req: AuthRequest, res) => {
  const playerId = req.user!.id;

  try {
    // 1. player_bank
    await db
      .insert(playerBank)
      .values({ playerId, ...buildResourceDefaults(), lastProductionTurn: 0, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: playerBank.playerId,
        set: { ...buildResourceIncrements(playerBank), updatedAt: new Date() },
      });

    // 2. player_transport
    await db
      .insert(playerTransport)
      .values({ playerId, ...buildResourceDefaults(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: playerTransport.playerId,
        set: { ...buildResourceIncrements(playerTransport), updatedAt: new Date() },
      });

    // 3. city_inventory — première ville du joueur
    const cityRows = await db
      .select({ cityId: cities.id })
      .from(cities)
      .innerJoin(colonies, eq(cities.colonyId, colonies.id))
      .where(or(eq(colonies.ownerPlayerId, playerId), eq(colonies.founderId, playerId)))
      .limit(1);

    if (cityRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: `Aucune ville trouvée pour le joueur ${playerId}`,
        bankUpdated: true,
        transportUpdated: true,
        cityUpdated: false,
      });
    }

    const cityId = cityRows[0].cityId;

    await db
      .insert(cityInventory)
      .values({ cityId, ...buildResourceDefaults(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: cityInventory.cityId,
        set: { ...buildResourceIncrements(cityInventory), updatedAt: new Date() },
      });

    res.json({
      ok: true,
      playerId,
      cityId,
      added: TEST_AMOUNT,
      resources: RESOURCE_FIELDS,
      inventories: ["player_bank", "player_transport", "city_inventory"],
    });
  } catch (err: any) {
    console.error("[debug/grant-test-resources] Erreur:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
