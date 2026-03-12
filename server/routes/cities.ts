import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { getMyCities, getCityByColony } from "../cityService";

const router = Router();

// ─── GET /api/cities/me ──────────────────────────────────────────────────────
// Auth requise — retourne les villes des colonies de la faction du joueur.
// DOIT être déclaré avant /:colonyId pour qu'Express ne traite pas "me" comme un id.
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cities = await getMyCities(req.user!.id);
    return res.json(cities);
  } catch (err) {
    console.error("[GET /api/cities/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer les villes" });
  }
});

// ─── GET /api/cities/colony/:colonyId ────────────────────────────────────────
// Auth requise — retourne la ville d'une colonie spécifique.
// Contrôle d'accès : la colonie doit appartenir à la faction du joueur.
router.get("/colony/:colonyId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const colonyId = parseInt(req.params.colonyId, 10);
    if (isNaN(colonyId)) {
      return res.status(400).json({ error: "colonyId doit être un entier" });
    }

    const result = await getCityByColony(req.user!.id, colonyId);

    if (result === null) {
      return res.status(404).json({ error: "Ville introuvable pour cette colonie" });
    }

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json(result);
  } catch (err) {
    console.error("[GET /api/cities/colony/:colonyId] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer la ville" });
  }
});

export default router;
