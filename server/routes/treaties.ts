import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";
import {
  getMyTreaties,
  getAllTreaties,
  createTreaty,
  signTreaty,
  breakTreaty,
} from "../treatyService";

import { ACTIVE_TREATY_TYPES } from "../treatyTypes";
export { ACTIVE_TREATY_TYPES } from "../treatyTypes";
export type { TreatyType } from "../treatyTypes";

function handleError(res: Response, err: unknown) {
  const e = err as Error & { status?: number };
  const status = e.status ?? 500;
  const message = e.message ?? "Erreur serveur";
  return res.status(status).json({ error: message });
}

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Accès réservé à l'administration" });
    }
    const all = await getAllTreaties();
    res.json(all);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await getMyTreaties(req.user!.id);
    res.json(list);
  } catch (err) {
    return handleError(res, err);
  }
});

router.get("/types", (_req, res) => {
  res.json(ACTIVE_TREATY_TYPES);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, type, terms, targetFactionIds, properties } = req.body;

    if (!title || !type || !terms || !targetFactionIds) {
      return res.status(400).json({ error: "Champs requis manquants : title, type, terms, targetFactionIds" });
    }
    if (!Array.isArray(targetFactionIds) || targetFactionIds.length === 0) {
      return res.status(400).json({ error: "targetFactionIds doit être un tableau non vide" });
    }

    const factionIds = (targetFactionIds as unknown[]).map((id) => Number(id)).filter((n) => !isNaN(n));

    // ─── Bypass admin (même logique que territories.ts / playerActions.ts) ──
    const rawHeaderAdmin = req.headers['x-admin-mode'];
    const headerValueAdmin = Array.isArray(rawHeaderAdmin) ? rawHeaderAdmin[0] : rawHeaderAdmin;
    const roleAdmin = req.user!.role;
    const adminBypass =
      roleAdmin === 'admin' && (headerValueAdmin === undefined || headerValueAdmin === 'true');

    const treaty = await createTreaty(
      req.user!.id,
      title,
      type,
      terms,
      factionIds,
      properties ?? {},
      adminBypass
    );
    res.json(treaty);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post("/:id/sign", requireAuth, async (req: AuthRequest, res) => {
  try {
    const treaty = await signTreaty(req.user!.id, req.params.id);
    res.json(treaty);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post("/:id/break", requireAuth, async (req: AuthRequest, res) => {
  try {
    const treaty = await breakTreaty(req.user!.id, req.params.id);
    res.json(treaty);
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
