import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getAllTerritories,
  getAllColonies,
  claimTerritory,
  foundColony,
} from "../territoryService";

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
// Authentifié — revendiquer une case
router.post("/claim", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { worldX, worldY } = req.body;

    if (typeof worldX !== "number" || typeof worldY !== "number") {
      return res.status(400).json({ error: "worldX et worldY sont requis (entiers)" });
    }

    const playerId = req.user!.id;
    const playerName = req.user!.username;

    const result = await claimTerritory(playerId, playerName, worldX, worldY);

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

export default router;
