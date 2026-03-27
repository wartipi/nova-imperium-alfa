import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { units } from "../../shared/schema";
import { UNIT_CATALOG } from "../unitCatalog";

const router = Router();

// ─── GET /api/units/me ────────────────────────────────────────────────────────
// Retourne toutes les unités du joueur connecté sous forme de DTO hydratable.
// strength est calculé côté serveur depuis UNIT_CATALOG — non persisté en DB.
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const playerId = req.user!.id;

    const rows = await db
      .select()
      .from(units)
      .where(eq(units.ownerPlayerId, playerId));

    const dtos = rows.map(unit => {
      const catalog = UNIT_CATALOG[unit.unitType];
      return {
        id:          unit.id.toString(),
        type:        unit.unitType,
        name:        unit.name,
        x:           unit.worldX,
        y:           unit.worldY,
        strength:    catalog?.strength ?? 0,
        attack:      unit.attack,
        defense:     unit.defense,
        health:      unit.health,
        maxHealth:   unit.maxHealth,
        movement:    unit.movementRemaining,
        maxMovement: unit.movement,
        experience:  unit.experience,
        abilities:   [] as string[],
      };
    });

    return res.json(dtos);
  } catch (err) {
    console.error("[GET /api/units/me] Erreur:", err);
    return res.status(500).json({ error: "Impossible de récupérer les unités" });
  }
});

export default router;
