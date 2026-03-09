import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  ensurePlayerPosition,
  savePlayerPosition,
} from "../playerPositionService";

const router = Router();

router.get("/position", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const position = await ensurePlayerPosition(playerId);
    return res.json(position);
  } catch (err) {
    console.error("[GET /api/player/position] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer la position joueur" });
  }
});

router.post("/position", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const { worldX, worldY } = req.body;

    if (typeof worldX !== "number" || typeof worldY !== "number") {
      return res.status(400).json({ error: "worldX et worldY doivent être des nombres" });
    }

    if (!Number.isInteger(worldX) || !Number.isInteger(worldY)) {
      return res.status(400).json({ error: "worldX et worldY doivent être des entiers" });
    }

    const position = await savePlayerPosition(playerId, worldX, worldY);
    return res.json({ ok: true, position });
  } catch (err) {
    console.error("[POST /api/player/position] Erreur:", err);
    return res.status(500).json({ error: "Impossible de sauvegarder la position joueur" });
  }
});

export default router;
