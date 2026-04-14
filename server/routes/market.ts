import { Router } from "express";
import { requireAuth, getUserFromBearerToken } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getMarketInfo,
  getOpenOrders,
  getTradeHistory,
  placeOrder,
  cancelOrder,
  fillOrder,
  updateFee,
  getMarketBox,
  claimMarketBoxToTransport,
  claimMarketBoxToBank,
  getFeeBox,
  collectFeeBox,
  deriveMarketOwner,
} from "../marketService";
import { checkAccessPoint, resolveAccessPoint } from "../accessPointService";
import { db } from "../db";
import { factionMembers } from "../../shared/schema";
import { eq } from "drizzle-orm";
import {
  addMarketSubscriber,
  removeMarketSubscriber,
  broadcastMarketInvalidation,
} from "../marketEvents";

const router = Router();

// ─── GET /access-check ────────────────────────────────────────────────────────
// Route info : retourne l'état d'accès physique du joueur au marché.
// Règle uniforme — admin et joueur normal passent par checkAccessPoint.
router.get("/access-check", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const result = await checkAccessPoint(playerId, "market");
    return res.json({ ...result, isAdmin: req.user!.role === "admin" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /stream ──────────────────────────────────────────────────────────────
// Flux SSE marché — notifie les clients connectés d'une invalidation du carnet.
// Auth via query param ?token=... (EventSource ne supporte pas les headers custom).
// Seul un signal d'invalidation est diffusé — jamais les ordres complets.
// Les clients rechargent via les routes REST existantes.
router.get("/stream", async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    return res.status(401).json({ error: "Token requis" });
  }
  const user = getUserFromBearerToken(token);
  if (!user) {
    return res.status(401).json({ error: "Token invalide" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Signal initial de connexion établie
  res.write(`event: connected\ndata: {"ts":${Date.now()}}\n\n`);

  addMarketSubscriber(res);

  req.on("close", () => {
    removeMarketSubscriber(res);
  });
});

// ─── GET /:cityId/guild ────────────────────────────────────────────────────────
// Gate physique pour tous — retourne 403 si pas de guilde_des_marchands à la position.
router.get("/:cityId/guild", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const cityId   = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });

    await resolveAccessPoint(playerId, "market");

    const info = await getMarketInfo(cityId);
    res.json(info);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /:cityId/orders ───────────────────────────────────────────────────────
// Gate physique pour tous — carnet global.
router.get("/:cityId/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);

    await resolveAccessPoint(req.user!.id, "market");

    const orders = await getOpenOrders(isNaN(cityId) ? 0 : cityId);
    res.json(orders);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /:cityId/trades ──────────────────────────────────────────────────────
// Gate physique pour tous — historique global.
router.get("/:cityId/trades", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);

    await resolveAccessPoint(req.user!.id, "market");

    const trades = await getTradeHistory(isNaN(cityId) ? 0 : cityId);
    res.json(trades);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /:cityId/orders ──────────────────────────────────────────────────────
// Gate physique pour tous — cityId résolu depuis la position réelle du joueur.
router.post("/:cityId/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId   = req.user!.id;
    const playerName = req.user!.username;

    const { side, resourceType, pricePerUnit, quantity } = req.body;
    if (!side || !resourceType || pricePerUnit == null || quantity == null)
      return res.status(400).json({ error: "Champs requis : side, resourceType, pricePerUnit, quantity" });

    const access = await resolveAccessPoint(playerId, "market");
    const cityId = access.cityId;

    const result = await placeOrder(
      cityId, playerId, playerName, side, resourceType,
      Number(pricePerUnit), Number(quantity),
    );
    res.json(result);
    broadcastMarketInvalidation("order_created");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── DELETE /:cityId/orders/:orderId ──────────────────────────────────────────
// Gate physique pour tous. Annulation propriétaire ou admin (métier inchangé).
router.delete("/:cityId/orders/:orderId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: "orderId invalide" });

    const isAdmin  = req.user!.role === "admin";
    const playerId = req.user!.id;

    await resolveAccessPoint(playerId, "market");

    await cancelOrder(orderId, playerId, isAdmin);
    res.json({ success: true });
    broadcastMarketInvalidation("order_cancelled");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /:cityId/orders/:orderId/fill ───────────────────────────────────────
// Gate physique pour tous.
router.post("/:cityId/orders/:orderId/fill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: "orderId invalide" });

    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ error: "quantity requis" });

    const fillerId   = req.user!.id;
    const fillerName = req.user!.username;

    await resolveAccessPoint(fillerId, "market");

    const result = await fillOrder(orderId, fillerId, fillerName, Number(quantity));
    res.json(result);
    broadcastMarketInvalidation("order_filled");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── PATCH /:cityId/guild/fee ─────────────────────────────────────────────────
// Gate physique pour tous. Ownership et cooldown vérifiés dans updateFee (métier inchangé).
router.patch("/:cityId/guild/fee", requireAuth, async (req: AuthRequest, res) => {
  try {
    const isAdmin   = req.user!.role === "admin";
    const playerId  = req.user!.id;

    const { feeBps } = req.body;
    if (feeBps == null) return res.status(400).json({ error: "feeBps requis" });

    const access = await resolveAccessPoint(playerId, "market");
    const cityId = access.cityId;

    const [mem] = await db
      .select({ factionId: factionMembers.factionId })
      .from(factionMembers)
      .where(eq(factionMembers.playerId, playerId))
      .limit(1);
    const requesterFactionId = mem?.factionId;

    await updateFee(cityId, Number(feeBps), playerId, isAdmin, requesterFactionId);
    res.json({ success: true });
    broadcastMarketInvalidation("fee_updated");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /box ─────────────────────────────────────────────────────────────────
// Lit la boîte de règlement du joueur. Pas de gate physique (accessible partout).
router.get("/box", requireAuth, async (req: AuthRequest, res) => {
  try {
    const box = await getMarketBox(req.user!.id);
    res.json(box);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /box/collect-transport ──────────────────────────────────────────────
// Transfère la boîte de règlement → transport du joueur. Vérifie la capacité.
router.post("/box/collect-transport", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await claimMarketBoxToTransport(req.user!.id);
    res.json(result);
    broadcastMarketInvalidation("box_collected");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /box/collect-bank ───────────────────────────────────────────────────
// Transfère la boîte de règlement → banque du joueur.
// Gate physique banque requis (même logique que /api/economy/player-bank/me).
router.post("/box/collect-bank", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";
    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }
    const result = await claimMarketBoxToBank(playerId);
    res.json(result);
    broadcastMarketInvalidation("box_collected");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /fee-box/:cityId ──────────────────────────────────────────────────────
// Lit la caisse locale de commission + canCollect (calculé côté serveur).
router.get("/fee-box/:cityId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId  = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });
    const isAdmin  = req.user!.role === "admin";
    const playerId = req.user!.id;

    const [feeBox, owner] = await Promise.all([
      getFeeBox(cityId),
      deriveMarketOwner(cityId),
    ]);

    let canCollect = isAdmin;
    if (!canCollect && owner) {
      if (owner.ownerType === "player" && owner.ownerPlayerId === playerId) {
        canCollect = true;
      } else if (owner.ownerType === "faction" && owner.ownerFactionId != null) {
        const [mem] = await db
          .select({ factionId: factionMembers.factionId })
          .from(factionMembers)
          .where(eq(factionMembers.playerId, playerId))
          .limit(1);
        canCollect = mem?.factionId === owner.ownerFactionId;
      }
    }

    res.json({ ...feeBox, canCollect });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /fee-box/:cityId/collect ────────────────────────────────────────────
// Collecte la caisse locale → compte propriétaire. Autorisé : owner ou admin.
router.post("/fee-box/:cityId/collect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });
    const isAdmin = req.user!.role === "admin";
    const result = await collectFeeBox(cityId, req.user!.id, isAdmin);
    res.json(result);
    broadcastMarketInvalidation("fee_collected");
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
