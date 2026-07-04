import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { getActivePlayerPositions } from "../playerPresenceService";

const router = Router();

router.get("/positions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user!.role === "admin";
    const players = await getActivePlayerPositions(req.user!.id, isAdmin);
    return res.json(players);
  } catch (err) {
    console.error("[GET /api/players/positions] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer les positions des joueurs" });
  }
});

export default router;
