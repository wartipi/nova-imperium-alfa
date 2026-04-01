/**
 * Routes /api/player/discovered-tiles
 * Lecture et écriture des tuiles découvertes par joueur (coordonnées MONDE).
 */

import { Router } from "express";
import { between, eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { playerDiscoveredTiles } from "../../shared/schema";

const router = Router();

// ─── GET /api/player/discovered-tiles ────────────────────────────────────────
// Retourne toutes les tuiles découvertes du joueur connecté.
router.get("/discovered-tiles", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const rows = await db
      .select({
        worldX: playerDiscoveredTiles.worldX,
        worldY: playerDiscoveredTiles.worldY,
      })
      .from(playerDiscoveredTiles)
      .where(eq(playerDiscoveredTiles.playerId, playerId));

    return res.json({ tiles: rows });
  } catch (err) {
    console.error("[DiscoveredTiles/GET]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/player/discovered-tiles ───────────────────────────────────────
// Enregistre par lot les nouvelles tuiles découvertes.
// Body : { tiles: [{ worldX: number, worldY: number }] }
// Idempotent : ON CONFLICT DO NOTHING.
router.post("/discovered-tiles", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const { tiles } = req.body;

    if (!Array.isArray(tiles) || tiles.length === 0) {
      return res.status(400).json({ error: "tiles[] requis (non vide)" });
    }

    for (const t of tiles) {
      if (typeof t.worldX !== "number" || typeof t.worldY !== "number") {
        return res.status(400).json({ error: "Chaque tile doit avoir worldX et worldY (entiers)" });
      }
    }

    const values = tiles.map((t: { worldX: number; worldY: number }) => ({
      playerId,
      worldX: t.worldX,
      worldY: t.worldY,
    }));

    await db
      .insert(playerDiscoveredTiles)
      .values(values)
      .onConflictDoNothing();

    return res.json({ ok: true, count: values.length });
  } catch (err) {
    console.error("[DiscoveredTiles/POST]", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
