import { Router } from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { factionMembers } from "../../shared/schema";
import {
  getFactionEconomy,
  aggregateFactionIncome,
  applyFactionEconomyTick,
} from "../economyService";

const router = Router();

// ─── Résolution de la faction du joueur ───────────────────────────────────────
// Réutilise le même pattern que cityService.getMyCities et treatyService.
async function resolveFactionId(playerId: string): Promise<number | null> {
  const rows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId))
    .limit(1);
  return rows.length > 0 ? rows[0].factionId : null;
}

// ─── GET /api/economy/me ──────────────────────────────────────────────────────
// Auth requise — retourne l'état économique de la faction du joueur.
// Réponse : stocks (gold, food) + revenus agrégés (goldPerTurn, foodPerTurn).
// Initialise faction_economy si absente (première lecture).
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const factionId = await resolveFactionId(req.user!.id);

    if (factionId === null) {
      return res.status(403).json({ error: "Vous devez appartenir à une faction pour accéder à l'économie" });
    }

    const [economy, income] = await Promise.all([
      getFactionEconomy(factionId),
      aggregateFactionIncome(factionId),
    ]);

    return res.json({
      gold:              economy.gold,
      food:              economy.food,
      lastProcessedTurn: economy.lastProcessedTurn,
      updatedAt:         economy.updatedAt,
      goldPerTurn:       income.goldPerTurn,
      foodPerTurn:       income.foodPerTurn,
    });
  } catch (err) {
    console.error("[GET /api/economy/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer l'économie de faction" });
  }
});

// ─── POST /api/economy/tick ───────────────────────────────────────────────────
// Auth requise — applique le tick économique pour la faction du joueur.
// Body : { currentTurn: number }
// Garde d'idempotence : si le tour a déjà été traité, applied=false.
router.post("/tick", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentTurn } = req.body;

    if (!Number.isInteger(currentTurn) || currentTurn < 1) {
      return res.status(400).json({ error: "currentTurn est requis (entier >= 1)" });
    }

    const factionId = await resolveFactionId(req.user!.id);

    if (factionId === null) {
      return res.status(403).json({ error: "Vous devez appartenir à une faction pour appliquer un tick économique" });
    }

    const result = await applyFactionEconomyTick(factionId, currentTurn);

    return res.json({
      applied: result.applied,
      economy: {
        gold:              result.economy.gold,
        food:              result.economy.food,
        lastProcessedTurn: result.economy.lastProcessedTurn,
        updatedAt:         result.economy.updatedAt,
      },
    });
  } catch (err) {
    console.error("[POST /api/economy/tick] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'appliquer le tick économique" });
  }
});

export default router;
