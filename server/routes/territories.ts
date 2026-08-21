import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getAllTerritories,
  getAllColonies,
  claimTerritory,
  checkClaimTerritory,
  foundColony,
  setColonyGovernor,
  exploitTerritory,
} from "../territoryService";
import { transferColonyOwnership } from "../ownershipService";
import { getPlayerState, savePlayerState } from "../playerStateService";
import { getActionCost } from "../../shared/ActionPointsCosts";

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

// ─── GET /api/territories/claim-check ────────────────────────────────────────
// Check non destructif — retourne { allowed, reason? } sans écriture en base.
// Query params : worldX (int), worldY (int), ownerType ('player' | 'faction')
router.get("/claim-check", requireAuth, async (req: AuthRequest, res) => {
  try {
    const worldX = parseInt(req.query.worldX as string, 10);
    const worldY = parseInt(req.query.worldY as string, 10);
    if (isNaN(worldX) || isNaN(worldY)) {
      return res.status(400).json({ allowed: false, reason: "worldX et worldY sont requis" });
    }
    const ownerType: 'player' | 'faction' =
      req.query.ownerType === 'faction' ? 'faction' : 'player';
    const playerId = req.user!.id;
    const result = await checkClaimTerritory(playerId, worldX, worldY, ownerType);
    return res.json(result);
  } catch (err) {
    console.error("[Territories] checkClaimTerritory error:", err);
    res.status(500).json({ allowed: false, reason: "Erreur serveur" });
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

    // ─── Bypass admin (même logique que playerActions.ts lignes 160-170) ──────
    const rawHeaderAdmin = req.headers['x-admin-mode'];
    const headerValueAdmin = Array.isArray(rawHeaderAdmin) ? rawHeaderAdmin[0] : rawHeaderAdmin;
    const roleAdmin = req.user!.role;
    const adminBypass =
      roleAdmin === 'admin' && (headerValueAdmin === undefined || headerValueAdmin === 'true');

    const CLAIM_COST = getActionCost('claim_territory');

    // ─── Vérification PA (sauf admin bypass) ─────────────────────────────────
    if (!adminBypass) {
      const state = await getPlayerState(playerId);
      const currentAP = state?.actionPoints ?? 0;
      if (currentAP < CLAIM_COST) {
        return res.status(400).json({
          error: "INSUFFICIENT_ACTION_POINTS",
          message: `Points d'action insuffisants : ${CLAIM_COST} requis, ${currentAP} disponibles`,
          required: CLAIM_COST,
          available: currentAP,
        });
      }
    }

    const result = await claimTerritory(playerId, playerName, worldX, worldY, ownerType);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    // ─── Débit PA après succès du claim (sauf admin bypass) ──────────────────
    if (!adminBypass) {
      const state = await getPlayerState(playerId);
      if (state) {
        await savePlayerState(playerId, {
          level:            state.level,
          experience:       state.experience,
          totalExperience:  state.totalExperience,
          actionPoints:     Math.max(0, state.actionPoints - CLAIM_COST),
          maxActionPoints:  state.maxActionPoints,
          competencePoints: state.competencePoints ?? 0,
          competences:      (state.competences as { competence: string; level: number }[]) ?? [],
        });
        console.log(
          `[Territories] PA debit claim_territory: player=${playerId}` +
          ` -${CLAIM_COST} AP → reste ${Math.max(0, state.actionPoints - CLAIM_COST)}/${state.maxActionPoints}`
        );
      }
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

// ─── PATCH /api/territories/colonies/:colonyId/governor ───────────────────────
// Phase 13 — Attribuer un gouverneur à une colonie de faction.
// Authentifié. Autorisé seulement au chef de la faction propriétaire.
// Payload : { newGovernorUserId: string }
router.patch("/colonies/:colonyId/governor", requireAuth, async (req: AuthRequest, res) => {
  try {
    const colonyId = parseInt(req.params.colonyId, 10);
    if (isNaN(colonyId)) {
      return res.status(400).json({ error: "colonyId invalide" });
    }

    const { newGovernorUserId } = req.body;
    if (typeof newGovernorUserId !== "string" || !newGovernorUserId.trim()) {
      return res.status(400).json({ error: "newGovernorUserId est requis" });
    }

    const requestingPlayerId = req.user!.id;
    const result = await setColonyGovernor(colonyId, requestingPlayerId, newGovernorUserId.trim());

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Territories] setColonyGovernor error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/territories/:territoryId/exploit ───────────────────────────────
// Phase Exploitation V1 — Exploiter un territoire depuis une colonie.
// Body : { colonyId: number, buildingType: "exploitation_post" }
// Validation complète côté serveur (Règle A).
router.post("/:territoryId/exploit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const territoryId = parseInt(req.params.territoryId, 10);
    if (isNaN(territoryId)) {
      return res.status(400).json({ error: "territoryId invalide" });
    }

    const { colonyId, buildingType } = req.body;

    if (typeof colonyId !== "number" || isNaN(colonyId)) {
      return res.status(400).json({ error: "colonyId (entier) est requis" });
    }

    if (typeof buildingType !== "string" || !buildingType.trim()) {
      return res.status(400).json({ error: "buildingType est requis" });
    }

    const requestingPlayerId = req.user!.id;

    const result = await exploitTerritory(territoryId, colonyId, buildingType.trim(), requestingPlayerId);

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json(result.territory);
  } catch (err) {
    console.error("[Territories] exploitTerritory error:", err);
    res.status(500).json({ error: "Erreur serveur lors de l'exploitation" });
  }
});

export default router;
