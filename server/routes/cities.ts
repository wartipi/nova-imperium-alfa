import { Router } from "express";
import { eq, sql } from "drizzle-orm";
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

// ─── GET /api/cities/:cityId/inventory ───────────────────────────────────────
// Auth requise — retourne city_inventory (stock local physique de la ville).
// Utilisé par le panneau de construction pour vérifier disponibilité des matériaux.
router.get("/:cityId/inventory", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId doit être un entier" });

    const access = await checkCityAccess(req.user!.id, cityId);
    if ("error" in access) return res.status(access.status).json({ error: access.error });

    const [rows] = await db
      .select()
      .from(cityInventory)
      .where(eq(cityInventory.cityId, cityId))
      .limit(1);

    const inv = rows ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };
    return res.json({
      cityId,
      gold:  inv.gold,
      food:  inv.food,
      wood:  inv.wood  ?? 0,
      stone: inv.stone ?? 0,
      iron:  inv.iron  ?? 0,
    });
  } catch (err) {
    console.error("[GET /api/cities/:cityId/inventory] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire l'inventaire de ville" });
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
    const pending   = pendingRows[0]   ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };
    const inventory = inventoryRows[0] ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };

    return res.json({
      cityId,
      hasBank,
      pending: {
        gold:  pending.gold,
        food:  pending.food,
        wood:  pending.wood  ?? 0,
        stone: pending.stone ?? 0,
        iron:  pending.iron  ?? 0,
      },
      inventory: {
        gold:  inventory.gold,
        food:  inventory.food,
        wood:  inventory.wood  ?? 0,
        stone: inventory.stone ?? 0,
        iron:  inventory.iron  ?? 0,
      },
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

    // Lit le pending harvest (5 matériaux V1)
    const [pendingRow] = await db.select().from(cityPendingHarvest)
      .where(eq(cityPendingHarvest.cityId, cityId)).limit(1);
    const pendingGold  = pendingRow?.gold  ?? 0;
    const pendingFood  = pendingRow?.food  ?? 0;
    const pendingWood  = pendingRow?.wood  ?? 0;
    const pendingStone = pendingRow?.stone ?? 0;
    const pendingIron  = pendingRow?.iron  ?? 0;

    if (pendingGold === 0 && pendingFood === 0 && pendingWood === 0 && pendingStone === 0 && pendingIron === 0) {
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

    const cityWorldX = access.worldX;
    const cityWorldY = access.worldY;

    const action = await createCollectHarvestAction(
      playerId, cityId, cityWorldX, cityWorldY,
      pendingGold, pendingFood, context,
      pendingWood, pendingStone, pendingIron
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
        pendingWood,
        pendingStone,
        pendingIron,
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

// ─── POST /api/cities/:cityId/start-construction ──────────────────────────────
// Auth requise — démarre une construction avec validation city_inventory.
// Admin : construction instantanée (bypass stock).
// Joueur : vérifie et débite city_inventory, puis met en file de production.
// Body : { building, goldCost?, foodCost?, woodCost?, stoneCost?, ironCost?, constructionTime? }
router.post("/:cityId/start-construction", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId doit être un entier" });

    const {
      building,
      goldCost  = 0,
      foodCost  = 0,
      woodCost  = 0,
      stoneCost = 0,
      ironCost  = 0,
      constructionTime = 50,
    } = req.body;
    if (!building || typeof building !== "string") {
      return res.status(400).json({ error: "building est requis (string)" });
    }

    const access = await checkCityAccess(req.user!.id, cityId);
    if ("error" in access) return res.status(access.status).json({ error: access.error });

    const isAdmin = req.user!.role === 'admin';

    if (isAdmin) {
      // Mode admin : construction instantanée, pas de vérification de stock
      await addBuilding(cityId, building);
      console.log(`[start-construction] Admin — instantané ${building} cityId=${cityId}`);
      return res.status(201).json({ ok: true, mode: 'instant', building });
    }

    // Mode joueur : vérifier et débiter city_inventory
    const invRows = await db
      .select()
      .from(cityInventory)
      .where(eq(cityInventory.cityId, cityId))
      .limit(1);

    const inv = invRows[0] ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };

    const insufficient: Record<string, number> = {};
    if (inv.gold  < goldCost)  insufficient.gold  = goldCost  - inv.gold;
    if (inv.food  < foodCost)  insufficient.food  = foodCost  - inv.food;
    if (inv.wood  < woodCost)  insufficient.wood  = woodCost  - inv.wood;
    if (inv.stone < stoneCost) insufficient.stone = stoneCost - inv.stone;
    if (inv.iron  < ironCost)  insufficient.iron  = ironCost  - inv.iron;

    if (Object.keys(insufficient).length > 0) {
      return res.status(422).json({
        error: "INSUFFICIENT_CITY_INVENTORY",
        required:  { gold: goldCost, food: foodCost, wood: woodCost, stone: stoneCost, iron: ironCost },
        available: { gold: inv.gold, food: inv.food, wood: inv.wood, stone: inv.stone, iron: inv.iron },
        missing:   insufficient,
      });
    }

    const now = new Date();

    // Débit city_inventory
    if (goldCost > 0 || foodCost > 0 || woodCost > 0 || stoneCost > 0 || ironCost > 0) {
      await db
        .update(cityInventory)
        .set({
          gold:      sql`${cityInventory.gold}  - ${goldCost}`,
          food:      sql`${cityInventory.food}  - ${foodCost}`,
          wood:      sql`${cityInventory.wood}  - ${woodCost}`,
          stone:     sql`${cityInventory.stone} - ${stoneCost}`,
          iron:      sql`${cityInventory.iron}  - ${ironCost}`,
          updatedAt: now,
        })
        .where(eq(cityInventory.cityId, cityId));
    }

    // Mise en file de production
    await setProduction(cityId, {
      type:     'building',
      name:     building,
      cost:     constructionTime,
      progress: 0,
    });

    console.log(
      `[start-construction] Queued ${building} cityId=${cityId}` +
      ` -${goldCost}g-${foodCost}f-${woodCost}w-${stoneCost}s-${ironCost}i → city_inventory durée=${constructionTime} tours`
    );

    return res.status(201).json({
      ok:   true,
      mode: 'queued',
      building,
      deducted: { gold: goldCost, food: foodCost, wood: woodCost, stone: stoneCost, iron: ironCost },
    });
  } catch (err) {
    console.error("[POST /api/cities/:cityId/start-construction] Erreur:", err);
    return res.status(500).json({ error: "Impossible de démarrer la construction" });
  }
});

export default router;
