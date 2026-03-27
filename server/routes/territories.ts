import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getAllTerritories,
  getAllColonies,
  claimTerritory,
  foundColony,
} from "../territoryService";
import { transferColonyOwnership } from "../ownershipService";

const router = Router();

// ─── GET /api/territories ─────────────────────────────────────────────────────
// Public — liste tous les territoires revendiqués
router.get("/", async (_req, res) => {
  try {
    const list = await getAllTerritories();
    res.json(list);
  } catch (err) {
    console.error("[Territories] getAllTerritories error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/territories/colonies ────────────────────────────────────────────
// Public — liste toutes les colonies
router.get("/colonies", async (_req, res) => {
  try {
    const list = await getAllColonies();
    res.json(list);
  } catch (err) {
    console.error("[Territories] getAllColonies error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/territories/claim ──────────────────────────────────────────────
// Authentifié — revendiquer une case pour le joueur ou sa faction.
// Body : { worldX, worldY, ownerType?: 'player' | 'faction' }
// Si le joueur n'a pas de faction active, ownerType est forcé à 'player'.
router.post("/claim", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { worldX, worldY, ownerType: rawOwnerType } = req.body;

    if (typeof worldX !== "number" || typeof worldY !== "number") {
      return res.status(400).json({ error: "worldX et worldY sont requis (entiers)" });
    }

    const ownerType: 'player' | 'faction' =
      rawOwnerType === 'faction' ? 'faction' : 'player';

    const playerId = req.user!.id;
    const playerName = req.user!.username;

    const result = await claimTerritory(playerId, playerName, worldX, worldY, ownerType);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(201).json(result.territory);
  } catch (err) {
    console.error("[Territories] claimTerritory error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/territories/colonies/found ─────────────────────────────────────
// Authentifié — fonder une colonie
router.post("/colonies/found", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { worldX, worldY, name } = req.body;

    if (typeof worldX !== "number" || typeof worldY !== "number") {
      return res.status(400).json({ error: "worldX et worldY sont requis (entiers)" });
    }

    const playerId = req.user!.id;
    const playerName = req.user!.username;

    const result = await foundColony(playerId, playerName, worldX, worldY, name);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(201).json(result.colony);
  } catch (err) {
    console.error("[Territories] foundColony error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/territories/colonies/:colonyId/transfer ────────────────────────
// Transfère l'ownership d'une colonie.
// Payload : { targetOwnerType: 'player', targetPlayerId } | { targetOwnerType: 'faction', targetFactionId }
// Règles : ownerType='faction' → admin uniquement. ownerType='player' → propriétaire ou admin.
// Le serveur valide la cible et hydrate le nom — le client ne fournit aucun nom.
router.post("/colonies/:colonyId/transfer", requireAuth, async (req: AuthRequest, res) => {
  try {
    const colonyId = parseInt(req.params.colonyId, 10);
    if (isNaN(colonyId)) {
      return res.status(400).json({ error: "colonyId invalide" });
    }

    const { targetOwnerType, targetPlayerId, targetFactionId } = req.body;

    if (targetOwnerType !== "player" && targetOwnerType !== "faction") {
      return res.status(400).json({ error: "targetOwnerType doit être 'player' ou 'faction'" });
    }

    if (targetOwnerType === "player" && !targetPlayerId) {
      return res.status(400).json({ error: "targetPlayerId requis pour un transfert vers un joueur" });
    }

    if (targetOwnerType === "faction" && typeof targetFactionId !== "number") {
      return res.status(400).json({ error: "targetFactionId (entier) requis pour un transfert vers une faction" });
    }

    const requestingPlayerId = req.user!.id;
    const requesterRole      = req.user!.role;

    const payload =
      targetOwnerType === "player"
        ? { targetOwnerType: "player" as const, targetPlayerId: String(targetPlayerId) }
        : { targetOwnerType: "faction" as const, targetFactionId: Number(targetFactionId) };

    const result = await transferColonyOwnership(colonyId, requestingPlayerId, requesterRole, payload);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({ success: true, colonyId });
  } catch (err) {
    console.error("[Territories] transferColonyOwnership error:", err);
    res.status(500).json({ error: "Erreur serveur lors du transfert" });
  }
});

export default router;
