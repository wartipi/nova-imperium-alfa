import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getAllFactions,
  getPlayerFaction,
  createFaction,
  joinFaction,
  leaveFaction,
} from "../factionService";

const router = Router();

// ─── GET /api/factions ───────────────────────────────────────────────────────
// Public — liste toutes les factions actives avec leurs membres
router.get("/", async (_req, res) => {
  try {
    const factionList = await getAllFactions();
    res.json(factionList);
  } catch (err) {
    console.error("[Factions] getAllFactions error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/factions/me ─────────────────────────────────────────────────────
// Authentifié — faction du joueur courant
// DOIT être déclaré avant /:factionId pour éviter qu'Express match "me" comme id
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const result = await getPlayerFaction(playerId);
    if (!result) {
      return res.json({ faction: null, memberRole: null });
    }
    res.json({ faction: result.faction, memberRole: result.memberRole });
  } catch (err) {
    console.error("[Factions] getPlayerFaction error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/factions ───────────────────────────────────────────────────────
// Authentifié — créer une faction
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description, charter, emblem, structure, type, recruitment, color, banner, motto } =
      req.body;

    if (!name || !description || !charter || !emblem || !structure || !type) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const result = await createFaction(req.user!.id, req.user!.username, {
      name,
      description,
      charter,
      emblem,
      structure,
      type,
      recruitment: recruitment || "open",
      color: color || "#888888",
      banner: banner || emblem,
      motto: motto || "",
    });

    if (result.error === "ALREADY_IN_FACTION") {
      return res.status(409).json({ error: "Vous appartenez déjà à une faction" });
    }
    if (result.error === "NAME_TAKEN") {
      return res.status(409).json({ error: "Ce nom de faction est déjà utilisé" });
    }

    res.status(201).json(result.faction);
  } catch (err) {
    console.error("[Factions] createFaction error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/factions/:factionId/join ──────────────────────────────────────
// Authentifié — rejoindre une faction
router.post("/:factionId/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const factionId = parseInt(req.params.factionId, 10);
    if (isNaN(factionId)) {
      return res.status(400).json({ error: "Id de faction invalide" });
    }

    const result = await joinFaction(req.user!.id, req.user!.username, factionId);

    if (result.error === "ALREADY_IN_FACTION") {
      return res.status(409).json({ error: "Vous appartenez déjà à une faction" });
    }
    if (result.error === "FACTION_NOT_FOUND") {
      return res.status(404).json({ error: "Faction introuvable ou inactive" });
    }
    if (result.error === "FACTION_RESTRICTED") {
      return res.status(403).json({ error: "Cette faction est en recrutement restreint" });
    }

    res.json({ success: true, faction: result.faction });
  } catch (err) {
    console.error("[Factions] joinFaction error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/factions/:factionId/leave ─────────────────────────────────────
// Authentifié — quitter une faction
router.post("/:factionId/leave", requireAuth, async (req: AuthRequest, res) => {
  try {
    const factionId = parseInt(req.params.factionId, 10);
    if (isNaN(factionId)) {
      return res.status(400).json({ error: "Id de faction invalide" });
    }

    const result = await leaveFaction(req.user!.id, factionId);

    if (result.error === "NOT_A_MEMBER") {
      return res.status(404).json({ error: "Vous n'êtes pas membre de cette faction" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[Factions] leaveFaction error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
