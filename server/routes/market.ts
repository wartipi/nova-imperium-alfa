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
import { db } from "../db";
import { factionMembers } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Toutes les routes requièrent auth + gate guilde (levé dans chaque fonction service)

// ─── GET /:cityId/guild ────────────────────────────────────────────────────────
router.get("/:cityId/guild", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });
    const { guild, owner } = await getMarketInfo(cityId);
    res.json({ guild, owner });
  } catch (err: any) {
    const status = err.status ?? 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── GET /:cityId/orders ───────────────────────────────────────────────────────
router.get("/:cityId/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });
    const orders = await getOpenOrders(cityId);
    res.json(orders);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /:cityId/orders ──────────────────────────────────────────────────────
router.post("/:cityId/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });

    const { side, resourceType, pricePerUnit, quantity } = req.body;
    const playerId   = req.user!.id;
    const playerName = req.user!.username;

    if (!side || !resourceType || pricePerUnit == null || quantity == null)
      return res.status(400).json({ error: "Champs requis : side, resourceType, pricePerUnit, quantity" });

    const result = await placeOrder(
      cityId,
      playerId,
      playerName,
      side,
      resourceType,
      Number(pricePerUnit),
      Number(quantity),
    );
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── DELETE /:cityId/orders/:orderId ──────────────────────────────────────────
router.delete("/:cityId/orders/:orderId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId  = parseInt(req.params.cityId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(cityId) || isNaN(orderId)) return res.status(400).json({ error: "Paramètres invalides" });

    const isAdmin = req.user!.role === "admin";
    await cancelOrder(orderId, req.user!.id, isAdmin);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /:cityId/orders/:orderId/fill ───────────────────────────────────────
router.post("/:cityId/orders/:orderId/fill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId  = parseInt(req.params.cityId, 10);
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(cityId) || isNaN(orderId)) return res.status(400).json({ error: "Paramètres invalides" });

    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ error: "quantity requis" });

    const fillerId   = req.user!.id;
    const fillerName = req.user!.username;

    const result = await fillOrder(orderId, fillerId, fillerName, Number(quantity));
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /:cityId/trades ──────────────────────────────────────────────────────
router.get("/:cityId/trades", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });
    const trades = await getTradeHistory(cityId);
    res.json(trades);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── PATCH /:cityId/guild/fee ─────────────────────────────────────────────────
router.patch("/:cityId/guild/fee", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });

    const { feeBps } = req.body;
    if (feeBps == null) return res.status(400).json({ error: "feeBps requis" });

    const requesterId = req.user!.id;
    const isAdmin     = req.user!.role === "admin";

    // Récupérer la factionId du joueur pour la vérification d'ownership faction
    let requesterFactionId: number | undefined;
    if (!isAdmin) {
      const [mem] = await db
        .select({ factionId: factionMembers.factionId })
        .from(factionMembers)
        .where(eq(factionMembers.playerId, requesterId))
        .limit(1);
      requesterFactionId = mem?.factionId;
    }

    await updateFee(cityId, Number(feeBps), requesterId, isAdmin, requesterFactionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
