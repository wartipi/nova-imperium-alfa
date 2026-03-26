import { Router } from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { cityPendingHarvest, cityInventory, cityBuildings } from "../../shared/schema";
import {
  getMyCities,
  getCityByColony,
  checkCityAccess,
  addBuilding,
  setProduction,
  clearProduction,
} from "../cityService";
import { createCollectHarvestAction, getActiveAction, msRemaining } from "../playerActionService";

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

// ─── GET /api/cities/:cityId/harvest ─────────────────────────────────────────
// Auth requise — retourne pending_harvest + city_inventory + présence banque.
router.get("/:cityId/harvest", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId doit être un entier" });

    const access = await checkCityAccess(req.user!.id, cityId);
    if ("error" in access) return res.status(access.status).json({ error: access.error });

    const [pendingRows, inventoryRows, buildingRows] = await Promise.all([
      db.select().from(cityPendingHarvest).where(eq(cityPendingHarvest.cityId, cityId)).limit(1),
      db.select().from(cityInventory).where(eq(cityInventory.cityId, cityId)).limit(1),
      db.select({ building: cityBuildings.building }).from(cityBuildings)
        .where(eq(cityBuildings.cityId, cityId)),
    ]);

    const hasBank = buildingRows.some(b => b.building === 'bank');
    const pending   = pendingRows[0]   ?? { gold: 0, food: 0 };
    const inventory = inventoryRows[0] ?? { gold: 0, food: 0 };

    return res.json({
      cityId,
      hasBank,
      pending:   { gold: pending.gold,   food: pending.food },
      inventory: { gold: inventory.gold, food: inventory.food },
    });
  } catch (err) {
    console.error("[GET /api/cities/:cityId/harvest] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire le harvest" });
  }
});

// ─── POST /api/cities/:cityId/collect-harvest ─────────────────────────────────
// Auth requise — lance une action de collecte physique.
// Refuse si pending = 0, si une action est déjà active, ou si la ville a une banque.
router.post("/:cityId/collect-harvest", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId doit être un entier" });

    const playerId = req.user!.id;
    const { role, adminModeEnabled } = req.body;

    const access = await checkCityAccess(playerId, cityId);
    if ("error" in access) return res.status(access.status).json({ error: access.error });

    // Vérifie présence de banque (collecte non nécessaire si banque présente)
    const buildingRows = await db
      .select({ building: cityBuildings.building })
      .from(cityBuildings)
      .where(eq(cityBuildings.cityId, cityId));
    const hasBank = buildingRows.some(b => b.building === 'bank');
    if (hasBank) {
      return res.status(400).json({ error: "Cette ville a une banque — la production est versée automatiquement" });
    }

    // Lit le pending harvest
    const [pendingRow] = await db.select().from(cityPendingHarvest)
      .where(eq(cityPendingHarvest.cityId, cityId)).limit(1);
    const pendingGold = pendingRow?.gold ?? 0;
    const pendingFood = pendingRow?.food ?? 0;

    if (pendingGold === 0 && pendingFood === 0) {
      return res.status(400).json({ error: "Aucune récolte en attente pour cette ville" });
    }

    // Vérifie action déjà active
    const existing = await getActiveAction(playerId);
    if (existing && existing.status === "in_progress") {
      return res.status(409).json({
        error: "ACTION_ALREADY_ACTIVE",
        message: "Une action est déjà en cours",
        action: { id: existing.id, type: existing.type, msRemaining: msRemaining(existing) },
      });
    }

    const context = {
      role: (role === 'admin' ? 'admin' : 'player') as 'admin' | 'player',
      adminModeEnabled: adminModeEnabled === true,
    };

    // Récupère la position de la ville (cityRecord est la ligne cities.*)
    const cityWorldX = (access as any).cityRecord?.worldX ?? 0;
    const cityWorldY = (access as any).cityRecord?.worldY ?? 0;

    const action = await createCollectHarvestAction(
      playerId, cityId, cityWorldX, cityWorldY, pendingGold, pendingFood, context
    );

    return res.status(201).json({
      ok: true,
      action: {
        id:              action.id,
        type:            action.type,
        status:          action.status,
        msRemaining:     msRemaining(action),
        expectedEndTime: action.expectedEndTime,
        pendingGold,
        pendingFood,
      },
    });
  } catch (err: any) {
    if (err?.message?.startsWith("ACTION_ALREADY_ACTIVE")) {
      return res.status(409).json({ error: err.message });
    }
    console.error("[POST /api/cities/:cityId/collect-harvest] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lancer la collecte" });
  }
});

export default router;
