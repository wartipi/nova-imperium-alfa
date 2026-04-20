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
      gold:              economy.gold,
      food:              economy.food,
      lastProcessedTurn: economy.lastProcessedTurn,
      updatedAt:         economy.updatedAt,
      goldPerTurn:       income.goldPerTurn,
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
        gold:              result.economy.gold,
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
// Body : { cityId, gold?, food?, wood?, stone?, iron? }
// Matériaux V1 : gold, food, wood, stone, iron. Durée : 5+ceil(total/10) min. Admins : 0ms.
router.post("/transfer-bank-to-city", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";
    const {
      cityId,
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    if (!Number.isInteger(cityId) || cityId < 1) {
      return res.status(400).json({ error: "cityId est requis (entier > 0)" });
    }
    const matList = [["gold",gold],["food",food],["wood",wood],["stone",stone],["iron",iron],
                     ["copper",copper],["coal",coal],["oil",oil],["herbs",herbs],["fur",fur]];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || (v as number) < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => (v as number) === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    // Gate physique banque pour les non-admins.
    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }

    const access = await checkCityAccess(playerId, cityId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    const { worldX, worldY } = access;

    const context = {
      role:             req.user!.role,
      adminModeEnabled: req.body.adminModeEnabled === true,
    };

    const action = await createTransferBankToCityAction(
      playerId, cityId, worldX, worldY, gold, food, context,
      wood, stone, iron, copper, coal, oil, herbs, fur,
    );

    const ms = msRemaining(action);
    const min = Math.ceil(ms / 60000);
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
        gold, food, wood, stone, iron, copper, coal, oil, herbs, fur,
      },
    });
  } catch (err: any) {
    const msg = err.message ?? "";
    if (msg.startsWith("ACTION_ALREADY_ACTIVE"))    return res.status(409).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_BANK"))        return res.status(422).json({ error: msg });
    if (msg.startsWith("INVALID_AMOUNT"))           return res.status(400).json({ error: msg });
    console.error("[POST /api/economy/transfer-bank-to-city] Erreur:", err);
    return res.status(500).json({ error: "Impossible de créer le transfert" });
  }
});

// ─── POST /api/economy/transfer-bank-to-player ───────────────────────────────
// Auth requise — transfère matériaux de la banque vers l'inventaire de transport.
// Body : { gold?, food?, wood?, stone?, iron?, adminModeEnabled? }
// Capacité max transport : 50 unités totales (tous matériaux cumulés). Admins : 0ms.
router.post("/transfer-bank-to-player", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const isAdmin  = req.user!.role === "admin";
    const {
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    const matList = [["gold",gold],["food",food],["wood",wood],["stone",stone],["iron",iron],
                     ["copper",copper],["coal",coal],["oil",oil],["herbs",herbs],["fur",fur]];
    for (const [k, v] of matList) {
      if (!Number.isInteger(v) || (v as number) < 0) {
        return res.status(400).json({ error: `${k} doit être un entier >= 0` });
      }
    }
    if (matList.every(([, v]) => (v as number) === 0)) {
      return res.status(400).json({ error: "Montant nul — spécifiez au moins un matériau" });
    }

    // Gate physique banque pour les non-admins.
    if (!isAdmin) {
      await resolveAccessPoint(playerId, "bank");
    }

    const context = {
      role:             req.user!.role,
      adminModeEnabled: req.body.adminModeEnabled === true,
    };

    const action = await createTransferBankToPlayerAction(
      playerId, gold, food, context,
      wood, stone, iron, copper, coal, oil, herbs, fur,
    );

    const ms = msRemaining(action);
    const min = Math.ceil(ms / 60000);
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
        gold, food, wood, stone, iron, copper, coal, oil, herbs, fur,
      },
    });
  } catch (err: any) {
    const msg = err.message ?? "";
    if (msg.startsWith("ACTION_ALREADY_ACTIVE"))         return res.status(409).json({ error: msg });
    if (msg.startsWith("INSUFFICIENT_BANK"))             return res.status(422).json({ error: msg });
    if (msg.startsWith("TRANSPORT_CAPACITY_EXCEEDED"))   return res.status(422).json({ error: msg });
    if (msg.startsWith("INVALID_AMOUNT"))                return res.status(400).json({ error: msg });
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
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    // Validation des types
    const matList: Array<[string, number]> = [
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

    // ── Vérification capacité entrepôt ───────────────────────────────────────
    const [inv] = await db
      .select()
      .from(cityInventory)
      .where(eq(cityInventory.cityId, cityId))
      .limit(1);
    const currentTotal = inv
      ? (inv.gold + inv.food + inv.wood + inv.stone + inv.iron + inv.copper + inv.coal + inv.oil + inv.herbs + inv.fur)
      : 0;
    const depositTotal = gold + food + wood + stone + iron + copper + coal + oil + herbs + fur;
    if (currentTotal + depositTotal > wh.capacity) {
      return res.status(422).json({
        error: `WAREHOUSE_CAPACITY_EXCEEDED: capacité entrepôt ${wh.capacity} dépassée — stock actuel ${currentTotal}, dépôt demandé ${depositTotal}`,
      });
    }

    // Lecture du transport courant du joueur
    const transport = await getOrInitPlayerTransport(playerId);

    // Vérification des stocks
    const insufficiant: string[] = [];
    if (gold   > transport.gold)   insufficiant.push(`or (dispo: ${transport.gold})`);
    if (food   > transport.food)   insufficiant.push(`nourriture (dispo: ${transport.food})`);
    if (wood   > transport.wood)   insufficiant.push(`bois (dispo: ${transport.wood})`);
    if (stone  > transport.stone)  insufficiant.push(`pierre (dispo: ${transport.stone})`);
    if (iron   > transport.iron)   insufficiant.push(`fer (dispo: ${transport.iron})`);
    if (copper > transport.copper) insufficiant.push(`cuivre (dispo: ${transport.copper})`);
    if (coal   > transport.coal)   insufficiant.push(`charbon (dispo: ${transport.coal})`);
    if (oil    > transport.oil)    insufficiant.push(`pétrole (dispo: ${transport.oil})`);
    if (herbs  > transport.herbs)  insufficiant.push(`herbes (dispo: ${transport.herbs})`);
    if (fur    > transport.fur)    insufficiant.push(`fourrure (dispo: ${transport.fur})`);

    if (insufficiant.length > 0) {
      return res.status(422).json({
        error: `INSUFFICIENT_TRANSPORT: stocks insuffisants — ${insufficiant.join(", ")}`,
      });
    }

    const now = new Date();

    // Transaction atomique : débit transport + crédit city_inventory
    await db.transaction(async (tx) => {
      // 1. Décrémenter player_transport
      await tx
        .update(playerTransport)
        .set({
          gold:      sql`${playerTransport.gold}   - ${gold}`,
          food:      sql`${playerTransport.food}   - ${food}`,
          wood:      sql`${playerTransport.wood}   - ${wood}`,
          stone:     sql`${playerTransport.stone}  - ${stone}`,
          iron:      sql`${playerTransport.iron}   - ${iron}`,
          copper:    sql`${playerTransport.copper} - ${copper}`,
          coal:      sql`${playerTransport.coal}   - ${coal}`,
          oil:       sql`${playerTransport.oil}    - ${oil}`,
          herbs:     sql`${playerTransport.herbs}  - ${herbs}`,
          fur:       sql`${playerTransport.fur}    - ${fur}`,
          updatedAt: now,
        })
        .where(eq(playerTransport.playerId, playerId));

      // 2. Créditer city_inventory (UPSERT)
      await tx
        .insert(cityInventory)
        .values({ cityId, gold, food, wood, stone, iron, copper, coal, oil, herbs, fur, updatedAt: now })
        .onConflictDoUpdate({
          target: cityInventory.cityId,
          set: {
            gold:      sql`${cityInventory.gold}   + ${gold}`,
            food:      sql`${cityInventory.food}   + ${food}`,
            wood:      sql`${cityInventory.wood}   + ${wood}`,
            stone:     sql`${cityInventory.stone}  + ${stone}`,
            iron:      sql`${cityInventory.iron}   + ${iron}`,
            copper:    sql`${cityInventory.copper} + ${copper}`,
            coal:      sql`${cityInventory.coal}   + ${coal}`,
            oil:       sql`${cityInventory.oil}    + ${oil}`,
            herbs:     sql`${cityInventory.herbs}  + ${herbs}`,
            fur:       sql`${cityInventory.fur}    + ${fur}`,
            updatedAt: now,
          },
        });
    });

    const matLog =
      `${gold}g ${food}f ${wood}w ${stone}s ${iron}ir` +
      ` ${copper}cu ${coal}co ${oil}oil ${herbs}herbs ${fur}fur`;
    console.log(
      `[Deposit] player=${playerId} transport→city${cityId}(${cityName}) ${matLog}`
    );

    return res.json({
      ok:        true,
      cityId,
      cityName,
      deposited: { gold, food, wood, stone, iron, copper, coal, oil, herbs, fur },
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
      gold = 0, food = 0, wood = 0, stone = 0, iron = 0,
      copper = 0, coal = 0, oil = 0, herbs = 0, fur = 0,
    } = req.body;

    const matList: Array<[string, number]> = [
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

    const insuffisant: string[] = [];
    if (gold   > transport.gold)   insuffisant.push(`or (dispo: ${transport.gold})`);
    if (food   > transport.food)   insuffisant.push(`nourriture (dispo: ${transport.food})`);
    if (wood   > transport.wood)   insuffisant.push(`bois (dispo: ${transport.wood})`);
    if (stone  > transport.stone)  insuffisant.push(`pierre (dispo: ${transport.stone})`);
    if (iron   > transport.iron)   insuffisant.push(`fer (dispo: ${transport.iron})`);
    if (copper > transport.copper) insuffisant.push(`cuivre (dispo: ${transport.copper})`);
    if (coal   > transport.coal)   insuffisant.push(`charbon (dispo: ${transport.coal})`);
    if (oil    > transport.oil)    insuffisant.push(`pétrole (dispo: ${transport.oil})`);
    if (herbs  > transport.herbs)  insuffisant.push(`herbes (dispo: ${transport.herbs})`);
    if (fur    > transport.fur)    insuffisant.push(`fourrure (dispo: ${transport.fur})`);

    if (insuffisant.length > 0) {
      return res.status(422).json({
        error: `INSUFFICIENT_TRANSPORT: stocks insuffisants — ${insuffisant.join(", ")}`,
      });
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Décrémenter player_transport
      await tx
        .update(playerTransport)
        .set({
          gold:      sql`${playerTransport.gold}   - ${gold}`,
          food:      sql`${playerTransport.food}   - ${food}`,
          wood:      sql`${playerTransport.wood}   - ${wood}`,
          stone:     sql`${playerTransport.stone}  - ${stone}`,
          iron:      sql`${playerTransport.iron}   - ${iron}`,
          copper:    sql`${playerTransport.copper} - ${copper}`,
          coal:      sql`${playerTransport.coal}   - ${coal}`,
          oil:       sql`${playerTransport.oil}    - ${oil}`,
          herbs:     sql`${playerTransport.herbs}  - ${herbs}`,
          fur:       sql`${playerTransport.fur}    - ${fur}`,
          updatedAt: now,
        })
        .where(eq(playerTransport.playerId, playerId));

      // 2. Créditer player_bank (UPSERT)
      await tx
        .insert(playerBank)
        .values({ playerId, gold, food, wood, stone, iron, copper, coal, oil, herbs, fur, lastProductionTurn: 0, updatedAt: now })
        .onConflictDoUpdate({
          target: playerBank.playerId,
          set: {
            gold:      sql`${playerBank.gold}   + ${gold}`,
            food:      sql`${playerBank.food}   + ${food}`,
            wood:      sql`${playerBank.wood}   + ${wood}`,
            stone:     sql`${playerBank.stone}  + ${stone}`,
            iron:      sql`${playerBank.iron}   + ${iron}`,
            copper:    sql`${playerBank.copper} + ${copper}`,
            coal:      sql`${playerBank.coal}   + ${coal}`,
            oil:       sql`${playerBank.oil}    + ${oil}`,
            herbs:     sql`${playerBank.herbs}  + ${herbs}`,
            fur:       sql`${playerBank.fur}    + ${fur}`,
            updatedAt: now,
          },
        });
    });

    console.log(
      `[Deposit] player=${playerId} transport→bank ${gold}g ${food}f ${wood}w ${stone}s ${iron}ir` +
      ` ${copper}cu ${coal}co ${oil}oil ${herbs}herbs ${fur}fur`
    );

    return res.json({
      ok:          true,
      deposited:   { gold, food, wood, stone, iron, copper, coal, oil, herbs, fur },
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
      ? (inv.gold + inv.food + inv.wood + inv.stone + inv.iron + inv.copper + inv.coal + inv.oil + inv.herbs + inv.fur)
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
