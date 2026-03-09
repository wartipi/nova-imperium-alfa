import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { ensurePlayerState, savePlayerState } from "../playerStateService";

const router = Router();

router.get("/state", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const state = await ensurePlayerState(playerId);
    return res.json(state);
  } catch (err) {
    console.error("[GET /api/player/state] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer l'état joueur" });
  }
});

router.post("/state", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const {
      level,
      experience,
      totalExperience,
      actionPoints,
      maxActionPoints,
      competencePoints,
      competences,
    } = req.body;

    if (
      typeof level !== "number" ||
      typeof experience !== "number" ||
      typeof totalExperience !== "number" ||
      typeof actionPoints !== "number" ||
      typeof maxActionPoints !== "number" ||
      typeof competencePoints !== "number"
    ) {
      return res.status(400).json({ error: "Champs numériques invalides" });
    }

    if (!Array.isArray(competences)) {
      return res.status(400).json({ error: "competences doit être un tableau" });
    }

    const saved = await savePlayerState(playerId, {
      level,
      experience,
      totalExperience,
      actionPoints,
      maxActionPoints,
      competencePoints,
      competences,
    });

    return res.json({ ok: true, state: saved });
  } catch (err) {
    console.error("[POST /api/player/state] Erreur:", err);
    return res.status(500).json({ error: "Impossible de sauvegarder l'état joueur" });
  }
});

export default router;
