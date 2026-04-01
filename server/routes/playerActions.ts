import { Router } from "express";
import { and, between, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { mapTiles, playerDiscoveredTiles } from "../../shared/schema";
import { getPlayerPosition } from "../playerPositionService";
import { createMoveAction, getActiveAction, cancelActiveAction, msRemaining } from "../playerActionService";
import { findPath } from "../pathfinding/HexPathfindingServer";
import type { ActorContext } from "../types/actorContext";

const router = Router();

const PATHFINDING_PADDING = 10; // tuiles de marge autour du trajet pour l'A*

// ─── Charge les tuiles d'une zone en Map<"x,y", terrainType> ─────────────────
async function loadTileMap(
  minX: number, maxX: number,
  minY: number, maxY: number
): Promise<Map<string, string>> {
  const tiles = await db
    .select({ worldX: mapTiles.worldX, worldY: mapTiles.worldY, terrain: mapTiles.terrainType })
    .from(mapTiles)
    .where(
      and(
        between(mapTiles.worldX, minX, maxX),
        between(mapTiles.worldY, minY, maxY)
      )
    );

  const tileMap = new Map<string, string>();
  for (const t of tiles) {
    tileMap.set(`${t.worldX},${t.worldY}`, t.terrain);
  }
  return tileMap;
}

// ─── POST /api/player/actions/move ───────────────────────────────────────────
router.post("/actions/move", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const { destinationWorldX, destinationWorldY } = req.body;

    if (typeof destinationWorldX !== "number" || typeof destinationWorldY !== "number") {
      return res.status(400).json({ error: "destinationWorldX et destinationWorldY sont requis (entiers)" });
    }

    // Refus immédiat si action déjà en cours
    const existing = await getActiveAction(playerId);
    if (existing && existing.status === "in_progress") {
      return res.status(409).json({
        error: "ACTION_ALREADY_ACTIVE",
        message: "Une action est déjà en cours. Attendez qu'elle se termine ou annulez-la.",
        action: {
          id: existing.id,
          type: existing.type,
          msRemaining: msRemaining(existing),
          expectedEndTime: existing.expectedEndTime,
        },
      });
    }

    // Position actuelle du joueur (source de vérité serveur)
    const position = await getPlayerPosition(playerId);
    if (!position) {
      return res.status(404).json({ error: "Position joueur introuvable" });
    }

    const { worldX: startX, worldY: startY } = position;
    const destX = Math.round(destinationWorldX);
    const destY = Math.round(destinationWorldY);

    // Déplacement nul
    if (startX === destX && startY === destY) {
      return res.status(400).json({ error: "La destination est identique à la position actuelle" });
    }

    // Chargement des tuiles (bounding box avec marge)
    const minX = Math.min(startX, destX) - PATHFINDING_PADDING;
    const maxX = Math.max(startX, destX) + PATHFINDING_PADDING;
    const minY = Math.min(startY, destY) - PATHFINDING_PADDING;
    const maxY = Math.max(startY, destY) + PATHFINDING_PADDING;

    const tileMap = await loadTileMap(minX, maxX, minY, maxY);

    if (tileMap.size === 0) {
      return res.status(422).json({ error: "Aucune tuile chargée dans cette zone — carte non générée" });
    }

    console.log(
      `[Actions/Move] player=${playerId} (${startX},${startY}) → (${destX},${destY})` +
      ` | zone=[${minX}..${maxX}, ${minY}..${maxY}] | tuiles=${tileMap.size}`
    );

    // Pathfinding serveur
    const result = findPath(startX, startY, destX, destY, tileMap);

    if (!result.success) {
      return res.status(422).json({
        error: "PATHFINDING_FAILED",
        message: result.error ?? "Aucun chemin disponible vers la destination",
      });
    }

    // ─── Garde fog-of-war : destination et chemin doivent être découverts ────
    // Bypass pour admin (adminModeEnabled déterminé plus bas, on doit d'abord le calculer).
    const rawHeaderFow = req.headers['x-admin-mode'];
    const headerValueFow = Array.isArray(rawHeaderFow) ? rawHeaderFow[0] : rawHeaderFow;
    const roleFow = req.user!.role;
    const adminBypass =
      roleFow === 'admin' && (headerValueFow === undefined || headerValueFow === 'true');

    if (!adminBypass) {
      // Charger les tuiles découvertes dans la bounding box du trajet
      const discoveredRows = await db
        .select({
          worldX: playerDiscoveredTiles.worldX,
          worldY: playerDiscoveredTiles.worldY,
        })
        .from(playerDiscoveredTiles)
        .where(
          and(
            eq(playerDiscoveredTiles.playerId, playerId),
            between(playerDiscoveredTiles.worldX, minX, maxX),
            between(playerDiscoveredTiles.worldY, minY, maxY)
          )
        );

      const discoveredSet = new Set<string>(
        discoveredRows.map(r => `${r.worldX},${r.worldY}`)
      );

      // Vérifier la destination
      if (!discoveredSet.has(`${destX},${destY}`)) {
        return res.status(403).json({
          error:   "DESTINATION_NOT_DISCOVERED",
          message: "Impossible de se déplacer vers une case non découverte.",
        });
      }

      // Vérifier chaque étape du chemin
      for (const step of result.path) {
        if (!discoveredSet.has(`${step.worldX},${step.worldY}`)) {
          return res.status(403).json({
            error:   "PATH_NOT_DISCOVERED",
            message: "Le chemin emprunte une case non découverte.",
          });
        }
      }
    }

    // Création de l'action persistante
    const role = req.user!.role;
    const rawHeader = req.headers['x-admin-mode'];
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    let adminModeEnabled: boolean;
    if (role !== 'admin') {
      adminModeEnabled = false;
    } else if (headerValue === undefined) {
      adminModeEnabled = true;
    } else {
      adminModeEnabled = headerValue === 'true';
    }
    const actorContext: ActorContext = { role, adminModeEnabled };
    const action = await createMoveAction(
      playerId,
      startX, startY,
      destX, destY,
      result.path,
      result.totalCost,
      actorContext
    );

    return res.status(201).json({
      ok: true,
      action: {
        id: action.id,
        type: action.type,
        status: action.status,
        startWorldX: action.startWorldX,
        startWorldY: action.startWorldY,
        endWorldX: action.endWorldX,
        endWorldY: action.endWorldY,
        totalCost: action.totalCost,
        startTime: action.startTime,
        expectedEndTime: action.expectedEndTime,
        msRemaining: msRemaining(action),
        path: action.path,
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("ACTION_ALREADY_ACTIVE")) {
      return res.status(409).json({ error: msg });
    }
    if (msg.startsWith("INSUFFICIENT_ACTION_POINTS")) {
      // Extraire requis= et disponibles= du message si présents
      const reqMatch  = msg.match(/requis=(\d+)/);
      const availMatch = msg.match(/disponibles=(\d+)/);
      return res.status(400).json({
        error:     "INSUFFICIENT_ACTION_POINTS",
        message:   "Points d'action insuffisants pour ce déplacement.",
        required:  reqMatch  ? Number(reqMatch[1])  : undefined,
        available: availMatch ? Number(availMatch[1]) : undefined,
      });
    }
    console.error("[Actions/Move] Erreur:", err);
    return res.status(500).json({ error: "Erreur serveur lors de la création de l'action" });
  }
});

// ─── GET /api/player/actions/current ─────────────────────────────────────────
router.get("/actions/current", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const action = await getActiveAction(playerId);

    if (!action) {
      return res.json({ action: null });
    }

    return res.json({
      action: {
        id: action.id,
        type: action.type,
        status: action.status,
        startWorldX: action.startWorldX,
        startWorldY: action.startWorldY,
        endWorldX: action.endWorldX,
        endWorldY: action.endWorldY,
        totalCost: action.totalCost,
        startTime: action.startTime,
        expectedEndTime: action.expectedEndTime,
        completedAt: action.completedAt,
        msRemaining: action.status === "in_progress" ? msRemaining(action) : 0,
        path: action.path,
        lastAppliedStep:  action.lastAppliedStep  ?? null,
        effectiveStep:    action.effectiveStep,
        effectiveWorldX:  action.effectiveWorldX,
        effectiveWorldY:  action.effectiveWorldY,
        effectiveTerrain: action.effectiveTerrain,
      },
    });
  } catch (err) {
    console.error("[Actions/Current] Erreur:", err);
    return res.status(500).json({ error: "Erreur serveur lors de la lecture de l'action" });
  }
});

// ─── DELETE /api/player/actions/current ──────────────────────────────────────
router.delete("/actions/current", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;
    const cancelled = await cancelActiveAction(playerId);

    if (!cancelled) {
      return res.status(404).json({ error: "Aucune action active à annuler" });
    }

    return res.json({
      ok: true,
      action: {
        id:               cancelled.id,
        status:           cancelled.status,
        cancelledAtWorldX: cancelled.cancelledAtWorldX ?? null,
        cancelledAtWorldY: cancelled.cancelledAtWorldY ?? null,
        cancelledAtStep:   cancelled.cancelledAtStep   ?? null,
      },
    });
  } catch (err) {
    console.error("[Actions/Cancel] Erreur:", err);
    return res.status(500).json({ error: "Erreur serveur lors de l'annulation" });
  }
});

export default router;
