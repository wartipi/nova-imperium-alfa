import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getMarketInfo,
  getOpenOrders,
  getTradeHistory,
  placeOrder,
  cancelOrder,
  fillOrder,
  updateFee,
} from "../marketService";
import { checkAccessPoint, resolveAccessPoint } from "../accessPointService";
import { db } from "../db";
import { factionMembers } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// ─── GET /access-check ────────────────────────────────────────────────────────
// Route info : retourne l'état d'accès physique du joueur au marché.
// Pas de gate — utilisée par l'UI au montage pour afficher marché ou blocage.
router.get("/access-check", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";

    if (isAdmin) {
      // Admin : toujours accès, cityId = 0 (placeholder, requêtes globales)
      return res.json({ allowed: true, cityId: 0, hasGuild: false, feeBps: 0, isAdmin: true });
    }

    const result = await checkAccessPoint(playerId, "market");
    return res.json({ ...result, isAdmin: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /:cityId/guild ────────────────────────────────────────────────────────
// Info uniquement — pas de gate physique.
router.get("/:cityId/guild", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });
    const info = await getMarketInfo(cityId);
    res.json(info);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /:cityId/orders ───────────────────────────────────────────────────────
// Gate physique pour les non-admins — carnet global.
router.get("/:cityId/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId  = parseInt(req.params.cityId, 10);
    const isAdmin = req.user!.role === "admin";

    if (!isAdmin) {
      await resolveAccessPoint(req.user!.id, "market");
    }

    const orders = await getOpenOrders(isNaN(cityId) ? 0 : cityId);
    res.json(orders);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /:cityId/trades ──────────────────────────────────────────────────────
// Gate physique pour les non-admins — historique global.
router.get("/:cityId/trades", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId  = parseInt(req.params.cityId, 10);
    const isAdmin = req.user!.role === "admin";

    if (!isAdmin) {
      await resolveAccessPoint(req.user!.id, "market");
    }

    const trades = await getTradeHistory(isNaN(cityId) ? 0 : cityId);
    res.json(trades);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /:cityId/orders ──────────────────────────────────────────────────────
// Gate physique — cityId de la route ignoré pour les non-admins (remplacé par position réelle).
router.post("/:cityId/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const urlCityId = parseInt(req.params.cityId, 10);
    const isAdmin   = req.user!.role === "admin";
    const playerId  = req.user!.id;
    const playerName = req.user!.username;

    const { side, resourceType, pricePerUnit, quantity } = req.body;
    if (!side || !resourceType || pricePerUnit == null || quantity == null)
      return res.status(400).json({ error: "Champs requis : side, resourceType, pricePerUnit, quantity" });

    // Résolution du cityId réel — position physique pour non-admin.
    let cityId: number;
    if (isAdmin) {
      if (isNaN(urlCityId)) return res.status(400).json({ error: "cityId invalide" });
      cityId = urlCityId;
    } else {
      const access = await resolveAccessPoint(playerId, "market");
      cityId = access.cityId;
    }

    const result = await placeOrder(
      cityId, playerId, playerName, side, resourceType,
      Number(pricePerUnit), Number(quantity),
    );
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── DELETE /:cityId/orders/:orderId ──────────────────────────────────────────
// Gate physique pour les non-admins.
router.delete("/:cityId/orders/:orderId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: "orderId invalide" });

    const isAdmin  = req.user!.role === "admin";
    const playerId = req.user!.id;

    if (!isAdmin) {
      await resolveAccessPoint(playerId, "market");
    }

    await cancelOrder(orderId, playerId, isAdmin);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /:cityId/orders/:orderId/fill ───────────────────────────────────────
// Gate physique pour les non-admins.
router.post("/:cityId/orders/:orderId/fill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: "orderId invalide" });

    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ error: "quantity requis" });

    const isAdmin    = req.user!.role === "admin";
    const fillerId   = req.user!.id;
    const fillerName = req.user!.username;

    if (!isAdmin) {
      await resolveAccessPoint(fillerId, "market");
    }

    const result = await fillOrder(orderId, fillerId, fillerName, Number(quantity));
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── PATCH /:cityId/guild/fee ─────────────────────────────────────────────────
// Gate physique pour les non-admins + guilde requise dans marketService.
router.patch("/:cityId/guild/fee", requireAuth, async (req: AuthRequest, res) => {
  try {
    const urlCityId = parseInt(req.params.cityId, 10);
    const isAdmin   = req.user!.role === "admin";
    const playerId  = req.user!.id;

    const { feeBps } = req.body;
    if (feeBps == null) return res.status(400).json({ error: "feeBps requis" });

    let cityId: number;
    if (isAdmin) {
      if (isNaN(urlCityId)) return res.status(400).json({ error: "cityId invalide" });
      cityId = urlCityId;
    } else {
      const access = await resolveAccessPoint(playerId, "market");
      cityId = access.cityId;
    }

    let requesterFactionId: number | undefined;
    if (!isAdmin) {
      const [mem] = await db
        .select({ factionId: factionMembers.factionId })
        .from(factionMembers)
        .where(eq(factionMembers.playerId, playerId))
        .limit(1);
      requesterFactionId = mem?.factionId;
    }

    await updateFee(cityId, Number(feeBps), playerId, isAdmin, requesterFactionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
