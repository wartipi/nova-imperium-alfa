import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { cityPendingHarvest, cityInventory, cityBuildings, cities, colonies } from "../../shared/schema";
import {
  getMyCities,
  getCityByColony,
  checkCityAccess,
  addBuilding,
  setProduction,
  clearProduction,
} from "../cityService";
import { createCollectHarvestAction, getActiveAction, msRemaining } from "../playerActionService";
import {
  applyBuildingEffects,
  getCityControlledTerrains,
  getCityControlledResources,
  checkBuildingTerrainPrereq,
  checkBuildingResourcePrereq,
  BUILDING_TERRAIN_PREREQS,
  BUILDING_RESOURCE_PREREQS,
  BUILDING_PRODUCTION,
} from "../buildingEffects";

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

// ─── GET /api/cities/:cityId/exploitation-context ─────────────────────────────
// Expose le contexte réel d'exploitation pour une ville :
//   - terrains contrôlés (via map_tiles dans le territoire)
//   - ressources contrôlées (via metadata.resources / resource_type)
//   - bâtiments d'exploitation avec leur statut terrain/ressource
//   - production réelle par tour (depuis BUILDING_PRODUCTION serveur)
// Source de vérité canonique — ne pas dupliquer côté client.
router.get("/:cityId/exploitation-context", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId doit être un entier" });

    const isAdmin = req.user!.role === 'admin';

    let worldX: number;
    let worldY: number;
    let cityName: string;

    if (isAdmin) {
      // Bypass faction — admin peut consulter n'importe quelle ville
      const cityRows = await db
        .select({ city: cities, colony: colonies })
        .from(cities)
        .innerJoin(colonies, eq(cities.colonyId, colonies.id))
        .where(eq(cities.id, cityId));
      if (cityRows.length === 0) return res.status(404).json({ error: "Ville introuvable" });
      worldX = cityRows[0].colony.worldX;
      worldY = cityRows[0].colony.worldY;
      cityName = cityRows[0].city.displayName ?? cityRows[0].city.name;
    } else {
      const access = await checkCityAccess(req.user!.id, cityId);
      if ("error" in access) return res.status(access.status).json({ error: access.error });
      worldX = access.worldX;
      worldY = access.worldY;
      cityName = access.cityRecord.displayName ?? access.cityRecord.name;
    }

    const [controlledTerrainsSet, controlledResourcesSet] = await Promise.all([
      getCityControlledTerrains(worldX, worldY),
      getCityControlledResources(worldX, worldY),
    ]);

    const controlledTerrains = Array.from(controlledTerrainsSet);
    const controlledResources = Array.from(controlledResourcesSet);

    // Bâtiments avec prérequis terrain — ce sont les bâtiments d'exploitation Tier 1
    const exploitations = Object.keys(BUILDING_TERRAIN_PREREQS).map(buildingId => {
      const terrainResult = checkBuildingTerrainPrereq(buildingId, controlledTerrainsSet);
      const resourceResult = checkBuildingResourcePrereq(buildingId, controlledResourcesSet);

      const terrainOk = terrainResult === null || terrainResult.ok;
      const resourceOk = resourceResult === null ? null : resourceResult.ok;

      const missingTerrains = (!terrainOk && terrainResult && !terrainResult.ok)
        ? terrainResult.required
        : [];
      const missingResources = (resourceOk === false && resourceResult && !resourceResult.ok)
        ? resourceResult.required
        : [];

      const canBuild = terrainOk && (resourceOk === null || resourceOk === true);

      return {
        buildingId,
        terrainOk,
        resourceOk,
        canBuild,
        production: BUILDING_PRODUCTION[buildingId] ?? {},
        missingTerrains,
        missingResources,
      };
    });

    return res.json({
      cityId,
      cityName,
      worldX,
      worldY,
      controlledTerrains,
      controlledResources,
      exploitations,
    });
  } catch (err) {
    console.error("[GET /api/cities/:cityId/exploitation-context] Erreur:", err);
    return res.status(500).json({ error: "Impossible de calculer le contexte d'exploitation" });
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
    await applyBuildingEffects(cityId, building);
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

    const inv = rows ?? {};
    return res.json({
      cityId,
      gold:   (inv as any).gold   ?? 0,
      food:   (inv as any).food   ?? 0,
      wood:   (inv as any).wood   ?? 0,
      stone:  (inv as any).stone  ?? 0,
      iron:   (inv as any).iron   ?? 0,
      copper: (inv as any).copper ?? 0,
      coal:   (inv as any).coal   ?? 0,
      oil:    (inv as any).oil    ?? 0,
      herbs:  (inv as any).herbs  ?? 0,
      fur:    (inv as any).fur    ?? 0,
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
    const pending   = pendingRows[0]   ?? {};
    const inventory = inventoryRows[0] ?? {};

    return res.json({
      cityId,
      hasBank,
      pending: {
        gold:   (pending as any).gold   ?? 0,
        food:   (pending as any).food   ?? 0,
        wood:   (pending as any).wood   ?? 0,
        stone:  (pending as any).stone  ?? 0,
        iron:   (pending as any).iron   ?? 0,
        copper: (pending as any).copper ?? 0,
        coal:   (pending as any).coal   ?? 0,
        oil:    (pending as any).oil    ?? 0,
        herbs:  (pending as any).herbs  ?? 0,
        fur:    (pending as any).fur    ?? 0,
      },
      inventory: {
        gold:   (inventory as any).gold   ?? 0,
        food:   (inventory as any).food   ?? 0,
        wood:   (inventory as any).wood   ?? 0,
        stone:  (inventory as any).stone  ?? 0,
        iron:   (inventory as any).iron   ?? 0,
        copper: (inventory as any).copper ?? 0,
        coal:   (inventory as any).coal   ?? 0,
        oil:    (inventory as any).oil    ?? 0,
        herbs:  (inventory as any).herbs  ?? 0,
        fur:    (inventory as any).fur    ?? 0,
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

    // Lit le pending harvest (10 matériaux Tier 1)
    const [pendingRow] = await db.select().from(cityPendingHarvest)
      .where(eq(cityPendingHarvest.cityId, cityId)).limit(1);
    const pendingGold   = pendingRow?.gold   ?? 0;
    const pendingFood   = pendingRow?.food   ?? 0;
    const pendingWood   = pendingRow?.wood   ?? 0;
    const pendingStone  = pendingRow?.stone  ?? 0;
    const pendingIron   = pendingRow?.iron   ?? 0;
    const pendingCopper = (pendingRow as any)?.copper ?? 0;
    const pendingCoal   = (pendingRow as any)?.coal   ?? 0;
    const pendingOil    = (pendingRow as any)?.oil    ?? 0;
    const pendingHerbs  = (pendingRow as any)?.herbs  ?? 0;
    const pendingFur    = (pendingRow as any)?.fur    ?? 0;

    if (pendingGold === 0 && pendingFood === 0 && pendingWood === 0 && pendingStone === 0 && pendingIron === 0
        && pendingCopper === 0 && pendingCoal === 0 && pendingOil === 0 && pendingHerbs === 0 && pendingFur === 0) {
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
      pendingWood, pendingStone, pendingIron,
      pendingCopper, pendingCoal, pendingOil, pendingHerbs, pendingFur,
    );

    return res.status(201).json({
      ok: true,
      action: {
        id:              action.id,
        type:            action.type,
        status:          action.status,
        msRemaining:     msRemaining(action),
        expectedEndTime: action.expectedEndTime,
        pendingGold, pendingFood, pendingWood, pendingStone, pendingIron,
        pendingCopper, pendingCoal, pendingOil, pendingHerbs, pendingFur,
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
      goldCost   = 0,
      foodCost   = 0,
      woodCost   = 0,
      stoneCost  = 0,
      ironCost   = 0,
      copperCost = 0,
      coalCost   = 0,
      oilCost    = 0,
      herbsCost  = 0,
      furCost    = 0,
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
      await applyBuildingEffects(cityId, building);
      console.log(`[start-construction] Admin — instantané ${building} cityId=${cityId}`);
      return res.status(201).json({ ok: true, mode: 'instant', building });
    }

    // Mode joueur : validation terrain + ressources réelles des cases contrôlées
    {
      const [terrains, resources] = await Promise.all([
        getCityControlledTerrains(access.worldX, access.worldY, 5),
        getCityControlledResources(access.worldX, access.worldY, 5),
      ]);

      const terrainCheck = checkBuildingTerrainPrereq(building, terrains);
      if (terrainCheck !== null && !terrainCheck.ok) {
        console.log(
          `[start-construction] Terrain insuffisant — cityId=${cityId} building=${building}` +
          ` requis=${terrainCheck.required.join('/')} disponible=${terrainCheck.available.join(',')}`
        );
        return res.status(422).json({
          error:     'TERRAIN_PREREQUISITE_NOT_MET',
          required:  terrainCheck.required,
          available: terrainCheck.available,
        });
      }

      const resourceCheck = checkBuildingResourcePrereq(building, resources);
      if (resourceCheck !== null && !resourceCheck.ok) {
        console.log(
          `[start-construction] Ressource absente — cityId=${cityId} building=${building}` +
          ` requis=${resourceCheck.required.join('/')} disponible=${resourceCheck.available.join(',')}`
        );
        return res.status(422).json({
          error:     'RESOURCE_PREREQUISITE_NOT_MET',
          required:  resourceCheck.required,
          available: resourceCheck.available,
        });
      }

      console.log(
        `[start-construction] Prérequis OK — cityId=${cityId} building=${building}` +
        ` terrains=[${[...terrains].join(',')}] resources=[${[...resources].join(',')}]`
      );
    }

    // Mode joueur : vérifier et débiter city_inventory
    const invRows = await db
      .select()
      .from(cityInventory)
      .where(eq(cityInventory.cityId, cityId))
      .limit(1);

    const invRow = invRows[0] ?? {};
    const inv = {
      gold:   (invRow as any).gold   ?? 0,
      food:   (invRow as any).food   ?? 0,
      wood:   (invRow as any).wood   ?? 0,
      stone:  (invRow as any).stone  ?? 0,
      iron:   (invRow as any).iron   ?? 0,
      copper: (invRow as any).copper ?? 0,
      coal:   (invRow as any).coal   ?? 0,
      oil:    (invRow as any).oil    ?? 0,
      herbs:  (invRow as any).herbs  ?? 0,
      fur:    (invRow as any).fur    ?? 0,
    };

    const insufficient: Record<string, number> = {};
    if (inv.gold   < goldCost)   insufficient.gold   = goldCost   - inv.gold;
    if (inv.food   < foodCost)   insufficient.food   = foodCost   - inv.food;
    if (inv.wood   < woodCost)   insufficient.wood   = woodCost   - inv.wood;
    if (inv.stone  < stoneCost)  insufficient.stone  = stoneCost  - inv.stone;
    if (inv.iron   < ironCost)   insufficient.iron   = ironCost   - inv.iron;
    if (inv.copper < copperCost) insufficient.copper = copperCost - inv.copper;
    if (inv.coal   < coalCost)   insufficient.coal   = coalCost   - inv.coal;
    if (inv.oil    < oilCost)    insufficient.oil    = oilCost    - inv.oil;
    if (inv.herbs  < herbsCost)  insufficient.herbs  = herbsCost  - inv.herbs;
    if (inv.fur    < furCost)    insufficient.fur    = furCost    - inv.fur;

    if (Object.keys(insufficient).length > 0) {
      return res.status(422).json({
        error:     "INSUFFICIENT_CITY_INVENTORY",
        required:  { gold: goldCost, food: foodCost, wood: woodCost, stone: stoneCost, iron: ironCost, copper: copperCost, coal: coalCost, oil: oilCost, herbs: herbsCost, fur: furCost },
        available: inv,
        missing:   insufficient,
      });
    }

    const now = new Date();

    // Débit city_inventory (10 matériaux Tier 1)
    if (goldCost > 0 || foodCost > 0 || woodCost > 0 || stoneCost > 0 || ironCost > 0
        || copperCost > 0 || coalCost > 0 || oilCost > 0 || herbsCost > 0 || furCost > 0) {
      await db
        .update(cityInventory)
        .set({
          gold:      sql`${cityInventory.gold}   - ${goldCost}`,
          food:      sql`${cityInventory.food}   - ${foodCost}`,
          wood:      sql`${cityInventory.wood}   - ${woodCost}`,
          stone:     sql`${cityInventory.stone}  - ${stoneCost}`,
          iron:      sql`${cityInventory.iron}   - ${ironCost}`,
          copper:    sql`${cityInventory.copper} - ${copperCost}`,
          coal:      sql`${cityInventory.coal}   - ${coalCost}`,
          oil:       sql`${cityInventory.oil}    - ${oilCost}`,
          herbs:     sql`${cityInventory.herbs}  - ${herbsCost}`,
          fur:       sql`${cityInventory.fur}    - ${furCost}`,
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
      ` -${goldCost}g-${foodCost}f-${woodCost}w-${stoneCost}s-${ironCost}i-${copperCost}cu-${coalCost}co-${oilCost}oil-${herbsCost}h-${furCost}fur` +
      ` → city_inventory durée=${constructionTime} tours`
    );

    return res.status(201).json({
      ok:   true,
      mode: 'queued',
      building,
      deducted: { gold: goldCost, food: foodCost, wood: woodCost, stone: stoneCost, iron: ironCost, copper: copperCost, coal: coalCost, oil: oilCost, herbs: herbsCost, fur: furCost },
    });
  } catch (err) {
    console.error("[POST /api/cities/:cityId/start-construction] Erreur:", err);
    return res.status(500).json({ error: "Impossible de démarrer la construction" });
  }
});

export default router;
