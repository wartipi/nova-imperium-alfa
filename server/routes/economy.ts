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
  getOrInitPlayerBank,
  applyProductionTickPerCity,
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

// ─── GET /api/economy/player-bank/me ─────────────────────────────────────────
// Auth requise — retourne la banque personnelle du joueur.
router.get("/player-bank/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bank = await getOrInitPlayerBank(req.user!.id);
    return res.json(bank);
  } catch (err) {
    console.error("[GET /api/economy/player-bank/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire la banque du joueur" });
  }
});

// ─── POST /api/economy/production-tick ───────────────────────────────────────
// Auth requise — applique le tick de production par-ville.
//   villes avec banque → player_bank
//   villes sans banque → city_pending_harvest
// Body : { currentTurn: number }
router.post("/production-tick", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentTurn } = req.body;

    if (!Number.isInteger(currentTurn) || currentTurn < 1) {
      return res.status(400).json({ error: "currentTurn est requis (entier >= 1)" });
    }

    const playerId = req.user!.id;
    const factionId = await resolveFactionId(playerId);

    if (factionId === null) {
      // Pas de faction → tick ignoré proprement (pas d'erreur bloquante)
      return res.json({ applied: false, cities: [], reason: "no_faction" });
    }

    const result = await applyProductionTickPerCity(playerId, factionId, currentTurn);
    return res.json(result);
  } catch (err) {
    console.error("[POST /api/economy/production-tick] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'appliquer le tick de production" });
  }
});

export default router;
