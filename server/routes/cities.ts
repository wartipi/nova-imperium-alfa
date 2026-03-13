import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getMyCities,
  getCityByColony,
  checkCityAccess,
  addBuilding,
  setProduction,
  clearProduction,
} from "../cityService";

const router = Router();

// ─── GET /api/cities/me ───────────────────────────────────────────────────────
// Auth requise — retourne les villes des colonies de la faction du joueur.
// Phase 7 : inclut buildings[] et currentProduction dans la réponse.
// DOIT être déclaré avant /:cityId pour qu'Express ne traite pas "me" comme un id.
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cities = await getMyCities(req.user!.id);
    return res.json(cities);
  } catch (err) {
    console.error("[GET /api/cities/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer les villes" });
  }
});

// ─── GET /api/cities/colony/:colonyId ─────────────────────────────────────────
// Auth requise — retourne la ville d'une colonie spécifique (par colonies.id).
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

// ─── POST /api/cities/:cityId/buildings ───────────────────────────────────────
// Auth requise — enregistre un bâtiment construit dans city_buildings.
// Idempotent : ON CONFLICT DO NOTHING (double appel sans effet secondaire).
// Utilisé par : buildInCity(isAdmin=true), processTurn() à complétion bâtiment.
router.post("/:cityId/buildings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) {
      return res.status(400).json({ error: "cityId doit être un entier" });
    }

    const { building } = req.body;
    if (!building || typeof building !== "string") {
      return res.status(400).json({ error: "building est requis (string)" });
    }

    const access = await checkCityAccess(req.user!.id, cityId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    await addBuilding(cityId, building);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[POST /api/cities/:cityId/buildings] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'enregistrer le bâtiment" });
  }
});

// ─── PUT /api/cities/:cityId/production ───────────────────────────────────────
// Auth requise — UPSERT la production courante dans city_production.
// Couvre : démarrage, mises à jour de progression (processTurn), changement de file.
router.put("/:cityId/production", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) {
      return res.status(400).json({ error: "cityId doit être un entier" });
    }

    const { type, name, cost, progress } = req.body;
    if (!type || !name || typeof cost !== "number" || typeof progress !== "number") {
      return res
        .status(400)
        .json({ error: "type, name (string), cost et progress (number) sont requis" });
    }

    const access = await checkCityAccess(req.user!.id, cityId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    await setProduction(cityId, { type, name, cost, progress });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/cities/:cityId/production] Erreur:", err);
    return res.status(500).json({ error: "Impossible de mettre à jour la production" });
  }
});

// ─── DELETE /api/cities/:cityId/production ────────────────────────────────────
// Auth requise — supprime la production courante.
// Idempotent : silencieux si aucune ligne n'existe.
// Utilisé par : complétion de production (après POST building), annulation.
router.delete("/:cityId/production", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) {
      return res.status(400).json({ error: "cityId doit être un entier" });
    }

    const access = await checkCityAccess(req.user!.id, cityId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    await clearProduction(cityId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/cities/:cityId/production] Erreur:", err);
    return res.status(500).json({ error: "Impossible de supprimer la production" });
  }
});

export default router;
