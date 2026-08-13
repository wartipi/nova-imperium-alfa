import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { factionMembers, playerTransport, cityInventory, playerBank } from "../../shared/schema";
import {
  getFactionEconomy,
  aggregateFactionIncome,
  applyFactionEconomyTick,
  getOrInitPlayerBank,
  applyProductionTickPerCity,
} from "../economyService";
import {
  createTransferBankToCityAction,
  createTransferBankToPlayerAction,
  getOrInitPlayerTransport,
  msRemaining,
  TRANSPORT_MAX_UNITS,
  computeTransportUnits,
} from "../playerActionService";
import { checkCityAccess } from "../cityService";
import {
  checkAccessPoint, resolveAccessPoint, checkPlayerCity, resolvePlayerCity,
  getWarehouseInfo,
} from "../accessPointService";

const router = Router();

// ─── Résolution de la faction du joueur ───────────────────────────────────────
// Réutilise le même pattern que cityService.getMyCities et treatyService.
async function resolveFactionId(playerId: string): Promise<number | null> {
  const rows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId))
    .limit(1);
  return rows.length > 0 ? rows[0].factionId : null;
}

// ─── GET /api/economy/me ──────────────────────────────────────────────────────
// Auth requise — retourne l'état économique de la faction du joueur.
// Réponse : stocks (gold, food) + revenus agrégés (goldPerTurn, foodPerTurn).
// Initialise faction_economy si absente (première lecture).
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const factionId = await resolveFactionId(req.user!.id);

    if (factionId === null) {
      return res.status(403).json({ error: "Vous devez appartenir à une faction pour accéder à l'économie" });
    }

    const [economy, income] = await Promise.all([
      getFactionEconomy(factionId),
      aggregateFactionIncome(factionId),
    ]);

    return res.json({
      fracten:           economy.fracten,    // Bloc B V2
      food:              economy.food,
      lastProcessedTurn: economy.lastProcessedTurn,
      updatedAt:         economy.updatedAt,
      fractenPerTurn:    income.fractenPerTurn, // Bloc B V2
      foodPerTurn:       income.foodPerTurn,
    });
  } catch (err) {
    console.error("[GET /api/economy/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer l'économie de faction" });
  }
});

// ─── POST /api/economy/tick ───────────────────────────────────────────────────
// Auth requise — applique le tick économique pour la faction du joueur.
// Body : { currentTurn: number }
// Garde d'idempotence : si le tour a déjà été traité, applied=false.
router.post("/tick", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentTurn } = req.body;

    if (!Number.isInteger(currentTurn) || currentTurn < 1) {
      return res.status(400).json({ error: "currentTurn est requis (entier >= 1)" });
    }

    const factionId = await resolveFactionId(req.user!.id);

    if (factionId === null) {
      return res.status(403).json({ error: "Vous devez appartenir à une faction pour appliquer un tick économique" });
    }

    const result = await applyFactionEconomyTick(factionId, currentTurn);

    return res.json({
      applied: result.applied,
      economy: {
        fracten:           result.economy.fracten, // Bloc B V2
        food:              result.economy.food,
        lastProcessedTurn: result.economy.lastProcessedTurn,
        updatedAt:         result.economy.updatedAt,
      },
    });
  } catch (err) {
    console.error("[POST /api/economy/tick] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'appliquer le tick économique" });
  }
});

// ─── GET /api/economy/bank-access-check ──────────────────────────────────────
// Route info : retourne l'état d'accès physique du joueur à la banque.
// Pas de gate — utilisée par l'UI au montage pour afficher les options de transfert.
router.get("/bank-access-check", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";

    if (isAdmin) {
      return res.json({ allowed: true, cityId: 0, isAdmin: true });
    }

    const result = await checkAccessPoint(playerId, "bank");
    return res.json({ ...result, isAdmin: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/economy/player-bank/me ─────────────────────────────────────────
// Auth requise + gate physique banque pour les non-admins.
// Retourne 403 si le joueur n'est pas physiquement sur une case contenant une Banque.
router.get("/player-bank/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";

    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }

    const bank = await getOrInitPlayerBank(playerId);
    return res.json(bank);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("[GET /api/economy/player-bank/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire la banque du joueur" });
  }
});

// ─── POST /api/economy/production-tick ───────────────────────────────────────
// Auth requise — applique le tick de production par-ville.
//   villes avec banque → player_bank
//   villes sans banque → city_pending_harvest
// Body : { currentTurn: number }
router.post("/production-tick", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentTurn } = req.body;

    if (!Number.isInteger(currentTurn) || currentTurn < 1) {
      return res.status(400).json({ error: "currentTurn est requis (entier >= 1)" });
    }

    const playerId = req.user!.id;
    const factionId = await resolveFactionId(playerId);

    // factionId peut être null — applyProductionTickPerCity gère le cas canoniquement
    const result = await applyProductionTickPerCity(playerId, factionId, currentTurn);
    return res.json(result);
  } catch (err) {
    console.error("[POST /api/economy/production-tick] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'appliquer le tick de production" });
  }
});

// ─── GET /api/economy/player-transport ───────────────────────────────────────
// Auth requise — retourne l'inventaire de transport du joueur.
router.get("/player-transport", requireAuth, async (req: AuthRequest, res) => {
  try {
    const transport = await getOrInitPlayerTransport(req.user!.id);
    const usedUnits = computeTransportUnits(transport);
    return res.json({
      ...transport,
      maxUnits: TRANSPORT_MAX_UNITS,
      usedUnits,
      freeUnits: Math.max(0, TRANSPORT_MAX_UNITS - usedUnits),
    });
  } catch (err) {
    console.error("[GET /api/economy/player-transport] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire le transport" });
  }
});

// ─── POST /api/economy/transfer-bank-to-city ─────────────────────────────────
// Auth requise — transfère matériaux de la banque joueur vers city_inventory.
// Body V2 : { cityId, fracten?, food?, wood?, stone?, common_metals?, coal?, oil?, herbs?, leather_fur? }
// Body V1 legacy : gold?, iron?, copper?, fur? acceptés comme fallback backward-compat (F2)
router.post("/transfer-bank-to-city", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";
    const {
      cityId,
      // V2 principal F2
      fracten = 0, common_metals = 0, leather_fur = 0,
      food = 0, wood = 0, stone = 0, coal = 0, oil = 0, herbs = 0,
      // V3-D2 : ressources prototype unités
      common_textiles = 0, labor_contracts = 0, basic_equipment = 0,
      // V1 legacy backward-compat
      gold = 0, iron = 0, copper = 0, fur = 0,
    } = req.body;

    if (!Number.isInteger(cityId) || cityId < 1) {
      return res.status(400).json({ error: "cityId est requis (entier > 0)" });
    }
    const matList: Array<[string, number]> = [
      ["fracten",fracten],["common_metals",common_metals],["leather_fur",leather_fur],
      ["food",food],["wood",wood],["stone",stone],["coal",coal],["oil",oil],["herbs",herbs],
      ["common_textiles",common_textiles],["labor_contracts",labor_contracts],["basic_equipment",basic_equipment], // V3-D2
      ["gold",gold],["iron",iron],["copper",copper],["fur",fur],
    ];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || v < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => v === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }

    const access = await checkCityAccess(playerId, cityId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    const { worldX, worldY } = access;
    const context = { role: req.user!.role, adminModeEnabled: req.body.adminModeEnabled === true };

    const action = await createTransferBankToCityAction(
      playerId, cityId, worldX, worldY,
      fracten, food, context,
      wood, stone, common_metals, coal, oil, herbs, leather_fur,
      common_textiles, labor_contracts, basic_equipment, // V3-D2
      gold, iron, copper, fur,
    );

    const ms  = msRemaining(action);
    const min = Math.ceil(ms / 60000);

    // G4 : rejet explicite des ressources V1 legacy — utiliser fracten/common_metals/leather_fur.
    if (gold > 0 || iron > 0 || copper > 0 || fur > 0) {
      return res.status(400).json({
        error: "LEGACY_RESOURCE_DISABLED",
        message: "Utilisez fracten, common_metals, leather_fur (V2). gold/iron/copper/fur ne sont plus acceptés.",
      });
    }

    return res.status(201).json({
      ok: true,
      action: {
        id:               action.id,
        type:             action.type,
        status:           action.status,
        msRemaining:      ms,
        minRemaining:     min,
        startWorldX:      action.startWorldX,
        startWorldY:      action.startWorldY,
        endWorldX:        action.endWorldX,
        endWorldY:        action.endWorldY,
        totalCost:        action.totalCost,
        startTime:        action.startTime.toISOString(),
        expectedEndTime:  action.expectedEndTime.toISOString(),
        completedAt:      null,
        path:             (action.path as any[]) ?? [],
        lastAppliedStep:  null,
        effectiveStep:    0,
        effectiveWorldX:  action.startWorldX,
        effectiveWorldY:  action.startWorldY,
        effectiveTerrain: "",
        // G4 V2 + V3-D2 response fields
        fracten, food, wood, stone,
        common_metals, coal, oil, herbs,
        leather_fur,
        common_textiles, labor_contracts, basic_equipment, // V3-D2
      },
    });
  } catch (err: any) {
    const msg = err.message ?? "";
    if (msg.startsWith("ACTION_ALREADY_ACTIVE"))    return res.status(409).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_BANK"))        return res.status(422).json({ error: msg });
    if (msg.startsWith("INVALID_AMOUNT"))           return res.status(400).json({ error: msg });
    if (msg.startsWith("LEGACY_RESOURCE_DISABLED")) return res.status(400).json({ error: msg });
    console.error("[POST /api/economy/transfer-bank-to-city] Erreur:", err);
    return res.status(500).json({ error: "Impossible de créer le transfert" });
  }
});

// ─── POST /api/economy/transfer-bank-to-player ───────────────────────────────
// Auth requise — transfère matériaux de la banque vers l'inventaire de transport.
// Body V2 : { fracten?, food?, wood?, stone?, common_metals?, coal?, oil?, herbs?, leather_fur?, adminModeEnabled? }
// Body V1 legacy : gold?, iron?, copper?, fur? acceptés comme fallback backward-compat (F2)
// Capacité max transport : 50 unités totales (tous matériaux cumulés). Admins : 0ms.
router.post("/transfer-bank-to-player", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";
    const {
      // V2 principal F2
      fracten = 0, common_metals = 0, leather_fur = 0,
      food = 0, wood = 0, stone = 0, coal = 0, oil = 0, herbs = 0,
      // V3-D2 : ressources prototype unités
      common_textiles = 0, labor_contracts = 0, basic_equipment = 0,
      // V1 legacy backward-compat
      gold = 0, iron = 0, copper = 0, fur = 0,
    } = req.body;

    const matList: Array<[string, number]> = [
      ["fracten",fracten],["common_metals",common_metals],["leather_fur",leather_fur],
      ["food",food],["wood",wood],["stone",stone],["coal",coal],["oil",oil],["herbs",herbs],
      ["common_textiles",common_textiles],["labor_contracts",labor_contracts],["basic_equipment",basic_equipment], // V3-D2
      ["gold",gold],["iron",iron],["copper",copper],["fur",fur],
    ];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || v < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => v === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }

    const context = { role: req.user!.role, adminModeEnabled: req.body.adminModeEnabled === true };

    const action = await createTransferBankToPlayerAction(
      playerId,
      fracten, food, context,
      wood, stone, common_metals, coal, oil, herbs, leather_fur,
      common_textiles, labor_contracts, basic_equipment, // V3-D2
      gold, iron, copper, fur,
    );

    const ms  = msRemaining(action);
    const min = Math.ceil(ms / 60000);

    // G4 : rejet explicite des ressources V1 legacy — utiliser fracten/common_metals/leather_fur.
    if (gold > 0 || iron > 0 || copper > 0 || fur > 0) {
      return res.status(400).json({
        error: "LEGACY_RESOURCE_DISABLED",
        message: "Utilisez fracten, common_metals, leather_fur (V2). gold/iron/copper/fur ne sont plus acceptés.",
      });
    }

    return res.status(201).json({
      ok: true,
      action: {
        id:               action.id,
        type:             action.type,
        status:           action.status,
        msRemaining:      ms,
        minRemaining:     min,
        startWorldX:      action.startWorldX,
        startWorldY:      action.startWorldY,
        endWorldX:        action.endWorldX,
        endWorldY:        action.endWorldY,
        totalCost:        action.totalCost,
        startTime:        action.startTime.toISOString(),
        expectedEndTime:  action.expectedEndTime.toISOString(),
        completedAt:      null,
        path:             (action.path as any[]) ?? [],
        lastAppliedStep:  null,
        effectiveStep:    0,
        effectiveWorldX:  action.startWorldX,
        effectiveWorldY:  action.startWorldY,
        effectiveTerrain: "",
        // G4 V2 + V3-D2 response fields
        fracten, food, wood, stone,
        common_metals, coal, oil, herbs,
        leather_fur,
        common_textiles, labor_contracts, basic_equipment, // V3-D2
      },
    });
  } catch (err: any) {
    const msg = err.message ?? "";
    if (msg.startsWith("ACTION_ALREADY_ACTIVE"))         return res.status(409).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_BANK"))             return res.status(422).json({ error: msg });
    if (msg.startsWith("TRANSPORT_CAPACITY_EXCEEDED"))   return res.status(422).json({ error: msg });
    if (msg.startsWith("INVALID_AMOUNT"))                return res.status(400).json({ error: msg });
    if (msg.startsWith("LEGACY_RESOURCE_DISABLED"))      return res.status(400).json({ error: msg });
    console.error("[POST /api/economy/transfer-bank-to-player] Erreur:", err);
    return res.status(500).json({ error: "Impossible de créer le transfert" });
  }
});

// ─── GET /api/economy/player-current-city ────────────────────────────────────
// Auth requise — indique si le joueur est physiquement sur une ville.
// Retourne { cityId, cityName, worldX, worldY } ou { cityId: null }.
// Pas de filtre bâtiment — toute ville à la position du joueur est acceptée.
router.get("/player-current-city", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await checkPlayerCity(req.user!.id);
    if (result.allowed) {
      return res.json({
        cityId:   result.city.cityId,
        cityName: result.city.cityName,
        worldX:   result.city.worldX,
        worldY:   result.city.worldY,
      });
    }
    return res.json({ cityId: null, cityName: null, worldX: null, worldY: null, reason: result.reason });
  } catch (err) {
    console.error("[GET /api/economy/player-current-city] Erreur:", err);
    return res.status(500).json({ error: "Impossible de déterminer la ville courante" });
  }
});

// ─── POST /api/economy/deposit-transport-to-city ──────────────────────────────
// Auth requise — dépôt atomique depuis player_transport vers city_inventory.
// La ville cible est déterminée depuis la position DB du joueur — pas de cityId client.
// Body : { gold?, food?, wood?, stone?, iron?, copper?, coal?, oil?, herbs?, fur? }
// Règles :
//   1. Le joueur doit être physiquement sur une ville valide.
//   2. Au moins un matériau doit être > 0.
//   3. Les quantités demandées doivent exister dans player_transport.
//   4. Transaction atomique : décrémenter transport + incrémenter city_inventory.
router.post("/deposit-transport-to-city", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const {
      // Bloc C V2 — ressources V2
      fracten = 0, common_metals = 0, leather_fur = 0,
      // V3-D2 : ressources prototype unités
      common_textiles = 0, labor_contracts = 0, basic_equipment = 0,
      // V1 legacy
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    // Validation des types (V2 + V3-D2 + V1)
    const matList: Array<[string, number]> = [
      ["fracten",fracten],["common_metals",common_metals],["leather_fur",leather_fur],
      ["common_textiles",common_textiles],["labor_contracts",labor_contracts],["basic_equipment",basic_equipment], // V3-D2
      ["gold",gold],["food",food],["wood",wood],["stone",stone],["iron",iron],
      ["copper",copper],["coal",coal],["oil",oil],["herbs",herbs],["fur",fur],
    ];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || v < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => v === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    // Résolution physique de la ville — source de vérité serveur
    const cityInfo = await resolvePlayerCity(playerId);
    const { cityId, cityName } = cityInfo;

    // ── Vérification entrepôt ────────────────────────────────────────────────
    const wh = await getWarehouseInfo(cityId);
    if (!wh.hasWarehouse) {
      return res.status(403).json({
        error: `WAREHOUSE_REQUIRED: la ville "${cityName}" n'a pas d'entrepôt — construisez-en un avant de déposer des ressources`,
      });
    }

    // ── Vérification capacité entrepôt (V2 + V1) ─────────────────────────────
    const [inv] = await db
      .select()
      .from(cityInventory)
      .where(eq(cityInventory.cityId, cityId))
      .limit(1);
    const currentTotal = inv
      ? ((inv as any).fracten ?? 0) + ((inv as any).common_metals ?? 0) + ((inv as any).leather_fur ?? 0)
        + inv.food + inv.wood + inv.stone + inv.coal + inv.oil + inv.herbs
        + ((inv as any).common_textiles ?? 0) + ((inv as any).labor_contracts ?? 0) + ((inv as any).basic_equipment ?? 0) // V3-D2
      : 0;
    const depositTotal = fracten + common_metals + leather_fur
      + common_textiles + labor_contracts + basic_equipment // V3-D2
      + gold + food + wood + stone + iron + copper + coal + oil + herbs + fur;
    if (currentTotal + depositTotal > wh.capacity) {
      return res.status(422).json({
        error: `WAREHOUSE_CAPACITY_EXCEEDED: capacité entrepôt ${wh.capacity} dépassée — stock actuel ${currentTotal}, dépôt demandé ${depositTotal}`,
      });
    }

    // Lecture du transport courant du joueur
    const transport = await getOrInitPlayerTransport(playerId);

    // G4 : rejet explicite des ressources V1 legacy.
    if (gold > 0 || iron > 0 || copper > 0 || fur > 0) {
      return res.status(400).json({
        error: "LEGACY_RESOURCE_DISABLED",
        message: "Utilisez fracten, common_metals, leather_fur (V2). gold/iron/copper/fur ne sont plus acceptés.",
      });
    }

    // Vérification des stocks (V2 uniquement)
    const insufficiant: string[] = [];
    if (fracten          > ((transport as any).fracten          ?? 0)) insufficiant.push(`fracten (dispo: ${(transport as any).fracten ?? 0})`);
    if (common_metals    > ((transport as any).common_metals    ?? 0)) insufficiant.push(`métaux communs (dispo: ${(transport as any).common_metals ?? 0})`);
    if (leather_fur      > ((transport as any).leather_fur      ?? 0)) insufficiant.push(`cuir/fourrure (dispo: ${(transport as any).leather_fur ?? 0})`);
    if (food   > transport.food)   insufficiant.push(`nourriture (dispo: ${transport.food})`);
    if (wood   > transport.wood)   insufficiant.push(`bois (dispo: ${transport.wood})`);
    if (stone  > transport.stone)  insufficiant.push(`pierre (dispo: ${transport.stone})`);
    if (coal   > transport.coal)   insufficiant.push(`charbon (dispo: ${transport.coal})`);
    if (oil    > transport.oil)    insufficiant.push(`pétrole (dispo: ${transport.oil})`);
    if (herbs  > transport.herbs)  insufficiant.push(`herbes (dispo: ${transport.herbs})`);
    // V3-D2
    if (common_textiles  > ((transport as any).common_textiles  ?? 0)) insufficiant.push(`textiles communs (dispo: ${(transport as any).common_textiles ?? 0})`);
    if (labor_contracts  > ((transport as any).labor_contracts  ?? 0)) insufficiant.push(`contrats de travail (dispo: ${(transport as any).labor_contracts ?? 0})`);
    if (basic_equipment  > ((transport as any).basic_equipment  ?? 0)) insufficiant.push(`équipement basique (dispo: ${(transport as any).basic_equipment ?? 0})`);

    if (insufficiant.length > 0) {
      return res.status(422).json({
        error: `INSUFFICIENT_TRANSPORT: stocks insuffisants — ${insufficiant.join(", ")}`,
      });
    }

    const now = new Date();

    // G4 : Transaction V2 uniquement — gold/iron/copper/fur non débités/crédités.
    await db.transaction(async (tx) => {
      // 1. Décrémenter player_transport (V2 uniquement)
      await tx
        .update(playerTransport)
        .set({
          fracten:          sql`${(playerTransport as any).fracten}          - ${fracten}`,
          common_metals:    sql`${(playerTransport as any).common_metals}    - ${common_metals}`,
          leather_fur:      sql`${(playerTransport as any).leather_fur}      - ${leather_fur}`,
          food:             sql`${playerTransport.food}    - ${food}`,
          wood:             sql`${playerTransport.wood}    - ${wood}`,
          stone:            sql`${playerTransport.stone}   - ${stone}`,
          coal:             sql`${playerTransport.coal}    - ${coal}`,
          oil:              sql`${playerTransport.oil}     - ${oil}`,
          herbs:            sql`${playerTransport.herbs}   - ${herbs}`,
          // V3-D2
          common_textiles:  sql`${(playerTransport as any).common_textiles}  - ${common_textiles}`,
          labor_contracts:  sql`${(playerTransport as any).labor_contracts}  - ${labor_contracts}`,
          basic_equipment:  sql`${(playerTransport as any).basic_equipment}  - ${basic_equipment}`,
          updatedAt: now,
        } as any)
        .where(eq(playerTransport.playerId, playerId));

      // 2. Créditer city_inventory (UPSERT) — V2 + V3-D2
      await tx
        .insert(cityInventory)
        .values({ cityId,
          fracten, common_metals, leather_fur,
          food, wood, stone, coal, oil, herbs,
          common_textiles, labor_contracts, basic_equipment, // V3-D2
          updatedAt: now } as any)
        .onConflictDoUpdate({
          target: cityInventory.cityId,
          set: {
            fracten:          sql`${(cityInventory as any).fracten}          + ${fracten}`,
            common_metals:    sql`${(cityInventory as any).common_metals}    + ${common_metals}`,
            leather_fur:      sql`${(cityInventory as any).leather_fur}      + ${leather_fur}`,
            food:             sql`${cityInventory.food}    + ${food}`,
            wood:             sql`${cityInventory.wood}    + ${wood}`,
            stone:            sql`${cityInventory.stone}   + ${stone}`,
            coal:             sql`${cityInventory.coal}    + ${coal}`,
            oil:              sql`${cityInventory.oil}     + ${oil}`,
            herbs:            sql`${cityInventory.herbs}   + ${herbs}`,
            // V3-D2
            common_textiles:  sql`${(cityInventory as any).common_textiles}  + ${common_textiles}`,
            labor_contracts:  sql`${(cityInventory as any).labor_contracts}  + ${labor_contracts}`,
            basic_equipment:  sql`${(cityInventory as any).basic_equipment}  + ${basic_equipment}`,
            updatedAt: now,
          },
        });
    });

    console.log(
      `[Deposit] player=${playerId} transport→city${cityId}(${cityName})` +
      ` fr${fracten} cm${common_metals} lf${leather_fur} ${food}f ${wood}w ${stone}s ${coal}co ${oil}oil ${herbs}herbs`
    );

    return res.json({
      ok:        true,
      cityId,
      cityName,
      deposited: { fracten, common_metals, leather_fur, food, wood, stone, coal, oil, herbs,
                   common_textiles, labor_contracts, basic_equipment }, // V3-D2
    });

  } catch (err: any) {
    const msg = err.message ?? "";
    if (err.status === 403) return res.status(403).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_TRANSPORT"))    return res.status(422).json({ error: msg });
    if (msg.startsWith("WAREHOUSE_CAPACITY_EXCEEDED")) return res.status(422).json({ error: msg });
    if (msg.startsWith("WAREHOUSE_REQUIRED"))        return res.status(403).json({ error: msg });
    console.error("[POST /api/economy/deposit-transport-to-city] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'effectuer le dépôt" });
  }
});

// ─── POST /api/economy/deposit-transport-to-bank ─────────────────────────────
// Auth requise — dépôt immédiat depuis player_transport vers player_bank.
// Gate physique banque pour les non-admins (même logique que player-bank/me).
// Body : { gold?, food?, wood?, stone?, iron?, copper?, coal?, oil?, herbs?, fur? }
// Règles :
//   1. Non-admin : doit être physiquement sur une case banque.
//   2. Au moins un montant > 0.
//   3. Les quantités demandées doivent exister dans player_transport.
//   4. Transaction atomique : décrémenter transport + incrémenter player_bank.
router.post("/deposit-transport-to-bank", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";

    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }

    const {
      // Bloc C V2
      fracten = 0, common_metals = 0, leather_fur = 0,
      // V3-D2 : ressources prototype unités
      common_textiles = 0, labor_contracts = 0, basic_equipment = 0,
      // V1 legacy
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    const matList: Array<[string, number]> = [
      ["fracten",fracten],["common_metals",common_metals],["leather_fur",leather_fur],
      ["common_textiles",common_textiles],["labor_contracts",labor_contracts],["basic_equipment",basic_equipment], // V3-D2
      ["gold",gold],["food",food],["wood",wood],["stone",stone],["iron",iron],
      ["copper",copper],["coal",coal],["oil",oil],["herbs",herbs],["fur",fur],
    ];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || v < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => v === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins une ressource" });
    }

    const transport = await getOrInitPlayerTransport(playerId);

    // G4 : rejet explicite des ressources V1 legacy.
    if (gold > 0 || iron > 0 || copper > 0 || fur > 0) {
      return res.status(400).json({
        error: "LEGACY_RESOURCE_DISABLED",
        message: "Utilisez fracten, common_metals, leather_fur (V2). gold/iron/copper/fur ne sont plus acceptés.",
      });
    }

    // Vérification des stocks (V2 uniquement)
    const insuffisant: string[] = [];
    if (fracten          > ((transport as any).fracten          ?? 0)) insuffisant.push(`fracten (dispo: ${(transport as any).fracten ?? 0})`);
    if (common_metals    > ((transport as any).common_metals    ?? 0)) insuffisant.push(`métaux communs (dispo: ${(transport as any).common_metals ?? 0})`);
    if (leather_fur      > ((transport as any).leather_fur      ?? 0)) insuffisant.push(`cuir/fourrure (dispo: ${(transport as any).leather_fur ?? 0})`);
    if (food   > transport.food)   insuffisant.push(`nourriture (dispo: ${transport.food})`);
    if (wood   > transport.wood)   insuffisant.push(`bois (dispo: ${transport.wood})`);
    if (stone  > transport.stone)  insuffisant.push(`pierre (dispo: ${transport.stone})`);
    if (coal   > transport.coal)   insuffisant.push(`charbon (dispo: ${transport.coal})`);
    if (oil    > transport.oil)    insuffisant.push(`pétrole (dispo: ${transport.oil})`);
    if (herbs  > transport.herbs)  insuffisant.push(`herbes (dispo: ${transport.herbs})`);
    // V3-D2
    if (common_textiles  > ((transport as any).common_textiles  ?? 0)) insuffisant.push(`textiles communs (dispo: ${(transport as any).common_textiles ?? 0})`);
    if (labor_contracts  > ((transport as any).labor_contracts  ?? 0)) insuffisant.push(`contrats de travail (dispo: ${(transport as any).labor_contracts ?? 0})`);
    if (basic_equipment  > ((transport as any).basic_equipment  ?? 0)) insuffisant.push(`équipement basique (dispo: ${(transport as any).basic_equipment ?? 0})`);

    if (insuffisant.length > 0) {
      return res.status(422).json({
        error: `INSUFFICIENT_TRANSPORT: stocks insuffisants — ${insuffisant.join(", ")}`,
      });
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Décrémenter player_transport (V2 uniquement — G4)
      await tx
        .update(playerTransport)
        .set({
          fracten:          sql`${(playerTransport as any).fracten}          - ${fracten}`,
          common_metals:    sql`${(playerTransport as any).common_metals}    - ${common_metals}`,
          leather_fur:      sql`${(playerTransport as any).leather_fur}      - ${leather_fur}`,
          food:             sql`${playerTransport.food}    - ${food}`,
          wood:             sql`${playerTransport.wood}    - ${wood}`,
          stone:            sql`${playerTransport.stone}   - ${stone}`,
          coal:             sql`${playerTransport.coal}    - ${coal}`,
          oil:              sql`${playerTransport.oil}     - ${oil}`,
          herbs:            sql`${playerTransport.herbs}   - ${herbs}`,
          // V3-D2
          common_textiles:  sql`${(playerTransport as any).common_textiles}  - ${common_textiles}`,
          labor_contracts:  sql`${(playerTransport as any).labor_contracts}  - ${labor_contracts}`,
          basic_equipment:  sql`${(playerTransport as any).basic_equipment}  - ${basic_equipment}`,
          updatedAt: now,
        } as any)
        .where(eq(playerTransport.playerId, playerId));

      // 2. Créditer player_bank (UPSERT) — V2 + V3-D2 (G4)
      await tx
        .insert(playerBank)
        .values({ playerId,
          fracten, common_metals, leather_fur,
          food, wood, stone, coal, oil, herbs,
          common_textiles, labor_contracts, basic_equipment, // V3-D2
          lastProductionTurn: 0, updatedAt: now } as any)
        .onConflictDoUpdate({
          target: playerBank.playerId,
          set: {
            fracten:          sql`${(playerBank as any).fracten}          + ${fracten}`,
            common_metals:    sql`${(playerBank as any).common_metals}    + ${common_metals}`,
            leather_fur:      sql`${(playerBank as any).leather_fur}      + ${leather_fur}`,
            food:             sql`${playerBank.food}    + ${food}`,
            wood:             sql`${playerBank.wood}    + ${wood}`,
            stone:            sql`${playerBank.stone}   + ${stone}`,
            coal:             sql`${playerBank.coal}    + ${coal}`,
            oil:              sql`${playerBank.oil}     + ${oil}`,
            herbs:            sql`${playerBank.herbs}   + ${herbs}`,
            // V3-D2
            common_textiles:  sql`${(playerBank as any).common_textiles}  + ${common_textiles}`,
            labor_contracts:  sql`${(playerBank as any).labor_contracts}  + ${labor_contracts}`,
            basic_equipment:  sql`${(playerBank as any).basic_equipment}  + ${basic_equipment}`,
            updatedAt: now,
          },
        });
    });

    console.log(
      `[Deposit] player=${playerId} transport→bank fr${fracten} cm${common_metals} lf${leather_fur}` +
      ` ${food}f ${wood}w ${stone}s ${coal}co ${oil}oil ${herbs}herbs`
    );

    return res.json({
      ok:          true,
      deposited:   { fracten, common_metals, leather_fur, food, wood, stone, coal, oil, herbs,
                     common_textiles, labor_contracts, basic_equipment }, // V3-D2
      destination: "player_bank",
    });

  } catch (err: any) {
    const msg = err.message ?? "";
    if (err.status === 403) return res.status(403).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_TRANSPORT")) return res.status(422).json({ error: msg });
    console.error("[POST /api/economy/deposit-transport-to-bank] Erreur:", err);
    return res.status(500).json({ error: "Impossible d'effectuer le dépôt" });
  }
});

// ─── GET /api/economy/city-warehouse-info/:cityId ──────────────────────────
// Retourne le statut entrepôt d'une ville + total actuel city_inventory.
// Auth requise. Utilisé par l'UI pour afficher capacité / état entrepôt.
router.get("/city-warehouse-info/:cityId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cityId = parseInt(req.params.cityId, 10);
    if (isNaN(cityId)) return res.status(400).json({ error: "cityId invalide" });

    const wh = await getWarehouseInfo(cityId);

    const [inv] = await db
      .select()
      .from(cityInventory)
      .where(eq(cityInventory.cityId, cityId))
      .limit(1);

    const currentTotal = inv
      ? ((inv as any).fracten ?? 0) + ((inv as any).common_metals ?? 0) + ((inv as any).leather_fur ?? 0)
        + inv.food + inv.wood + inv.stone + inv.coal + inv.oil + inv.herbs
      : 0;

    return res.json({
      cityId,
      hasWarehouse: wh.hasWarehouse,
      level:        wh.level,
      capacity:     wh.capacity,
      currentTotal,
    });
  } catch (err: any) {
    console.error("[GET /api/economy/city-warehouse-info] Erreur:", err);
    return res.status(500).json({ error: "Impossible de lire l'état de l'entrepôt" });
  }
});

export default router;
