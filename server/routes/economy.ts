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
import {
  createTransferBankToCityAction,
  createTransferBankToPlayerAction,
  getOrInitPlayerTransport,
  msRemaining,
  TRANSPORT_MAX_UNITS,
} from "../playerActionService";
import { checkCityAccess } from "../cityService";

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

// ─── GET /api/economy/player-transport ───────────────────────────────────────
// Auth requise — retourne l'inventaire de transport du joueur.
router.get("/player-transport", requireAuth, async (req: AuthRequest, res) => {
  try {
    const transport = await getOrInitPlayerTransport(req.user!.id);
    const usedUnits = transport.gold + transport.food + transport.wood + transport.stone + transport.iron
                    + (transport.copper ?? 0) + (transport.coal ?? 0) + (transport.oil ?? 0)
                    + (transport.herbs ?? 0) + (transport.fur ?? 0);
    return res.json({
      ...transport,
      maxUnits: TRANSPORT_MAX_UNITS,
      usedUnits,
      freeUnits: Math.max(0, TRANSPORT_MAX_UNITS - usedUnits),
    });
  } catch (err) {
    console.error("[GET /api/economy/player-transport] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire le transport" });
  }
});

// ─── POST /api/economy/transfer-bank-to-city ─────────────────────────────────
// Auth requise — transfère matériaux de la banque joueur vers city_inventory.
// Body : { cityId, gold?, food?, wood?, stone?, iron? }
// Matériaux V1 : gold, food, wood, stone, iron. Durée : 5+ceil(total/10) min. Admins : 0ms.
router.post("/transfer-bank-to-city", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const {
      cityId,
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    if (!Number.isInteger(cityId) || cityId < 1) {
      return res.status(400).json({ error: "cityId est requis (entier > 0)" });
    }
    const matList = [["gold",gold],["food",food],["wood",wood],["stone",stone],["iron",iron],
                     ["copper",copper],["coal",coal],["oil",oil],["herbs",herbs],["fur",fur]];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || (v as number) < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => (v as number) === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    const access = await checkCityAccess(playerId, cityId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    const { worldX, worldY } = access;

    const context = {
      role:             req.user!.role,
      adminModeEnabled: req.body.adminModeEnabled === true,
    };

    const action = await createTransferBankToCityAction(
      playerId, cityId, worldX, worldY, gold, food, context,
      wood, stone, iron, copper, coal, oil, herbs, fur,
    );

    const ms = msRemaining(action);
    const min = Math.ceil(ms / 60000);
    return res.status(201).json({
      ok: true,
      action: {
        id:           action.id,
        type:         action.type,
        status:       action.status,
        msRemaining:  ms,
        minRemaining: min,
        gold, food, wood, stone, iron, copper, coal, oil, herbs, fur,
      },
    });
  } catch (err: any) {
    const msg = err.message ?? "";
    if (msg.startsWith("ACTION_ALREADY_ACTIVE"))    return res.status(409).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_BANK"))        return res.status(422).json({ error: msg });
    if (msg.startsWith("INVALID_AMOUNT"))           return res.status(400).json({ error: msg });
    console.error("[POST /api/economy/transfer-bank-to-city] Erreur:", err);
    return res.status(500).json({ error: "Impossible de créer le transfert" });
  }
});

// ─── POST /api/economy/transfer-bank-to-player ───────────────────────────────
// Auth requise — transfère matériaux de la banque vers l'inventaire de transport.
// Body : { gold?, food?, wood?, stone?, iron?, adminModeEnabled? }
// Capacité max transport : 50 unités totales (tous matériaux cumulés). Admins : 0ms.
router.post("/transfer-bank-to-player", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const {
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    const matList = [["gold",gold],["food",food],["wood",wood],["stone",stone],["iron",iron],
                     ["copper",copper],["coal",coal],["oil",oil],["herbs",herbs],["fur",fur]];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || (v as number) < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => (v as number) === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    const context = {
      role:             req.user!.role,
      adminModeEnabled: req.body.adminModeEnabled === true,
    };

    const action = await createTransferBankToPlayerAction(
      playerId, gold, food, context,
      wood, stone, iron, copper, coal, oil, herbs, fur,
    );

    const ms = msRemaining(action);
    const min = Math.ceil(ms / 60000);
    return res.status(201).json({
      ok: true,
      action: {
        id:           action.id,
        type:         action.type,
        status:       action.status,
        msRemaining:  ms,
        minRemaining: min,
        gold, food, wood, stone, iron, copper, coal, oil, herbs, fur,
      },
    });
  } catch (err: any) {
    const msg = err.message ?? "";
    if (msg.startsWith("ACTION_ALREADY_ACTIVE"))         return res.status(409).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_BANK"))             return res.status(422).json({ error: msg });
    if (msg.startsWith("TRANSPORT_CAPACITY_EXCEEDED"))   return res.status(422).json({ error: msg });
    if (msg.startsWith("INVALID_AMOUNT"))                return res.status(400).json({ error: msg });
    console.error("[POST /api/economy/transfer-bank-to-player] Erreur:", err);
    return res.status(500).json({ error: "Impossible de créer le transfert" });
  }
});

export default router;
