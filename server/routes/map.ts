import { Router } from "express";
import {
  getSegment,
  getTilesForSegment,
  getSegmentWithTiles,
  getNineSegmentBlock,
  getSegmentCount,
  getTileCount,
} from "../mapSegmentService";

const router = Router();

router.get("/segment/:segmentX/:segmentY", async (req, res) => {
  try {
    const segmentX = parseInt(req.params.segmentX, 10);
    const segmentY = parseInt(req.params.segmentY, 10);

    if (isNaN(segmentX) || isNaN(segmentY)) {
      return res.status(400).json({ error: "Coordonnées de segment invalides" });
    }

    const segment = await getSegment(segmentX, segmentY);

    if (!segment) {
      return res.status(404).json({ error: `Segment (${segmentX}, ${segmentY}) introuvable` });
    }

    return res.json({ segment });
  } catch (err) {
    console.error("GET /api/map/segment error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/segment/:segmentX/:segmentY/tiles", async (req, res) => {
  try {
    const segmentX = parseInt(req.params.segmentX, 10);
    const segmentY = parseInt(req.params.segmentY, 10);

    if (isNaN(segmentX) || isNaN(segmentY)) {
      return res.status(400).json({ error: "Coordonnées de segment invalides" });
    }

    const tiles = await getTilesForSegment(segmentX, segmentY);

    if (tiles.length === 0) {
      return res.status(404).json({ error: `Aucune tuile trouvée pour le segment (${segmentX}, ${segmentY})` });
    }

    return res.json({ segmentX, segmentY, count: tiles.length, tiles });
  } catch (err) {
    console.error("GET /api/map/segment/tiles error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/segment/:segmentX/:segmentY/full", async (req, res) => {
  try {
    const segmentX = parseInt(req.params.segmentX, 10);
    const segmentY = parseInt(req.params.segmentY, 10);

    if (isNaN(segmentX) || isNaN(segmentY)) {
      return res.status(400).json({ error: "Coordonnées de segment invalides" });
    }

    const result = await getSegmentWithTiles(segmentX, segmentY);

    if (!result) {
      return res.status(404).json({ error: `Segment (${segmentX}, ${segmentY}) introuvable` });
    }

    return res.json(result);
  } catch (err) {
    console.error("GET /api/map/segment/full error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/block/:segmentX/:segmentY", async (req, res) => {
  try {
    const segmentX = parseInt(req.params.segmentX, 10);
    const segmentY = parseInt(req.params.segmentY, 10);

    if (isNaN(segmentX) || isNaN(segmentY)) {
      return res.status(400).json({ error: "Coordonnées de bloc invalides" });
    }

    const block = await getNineSegmentBlock(segmentX, segmentY);

    if (block.length === 0) {
      return res.status(404).json({ error: `Aucun segment trouvé autour de (${segmentX}, ${segmentY})` });
    }

    const totalTiles = block.reduce((sum, b) => sum + b.tiles.length, 0);

    return res.json({
      centerX: segmentX,
      centerY: segmentY,
      segmentCount: block.length,
      totalTiles,
      segments: block,
    });
  } catch (err) {
    console.error("GET /api/map/block error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const [segments, tiles] = await Promise.all([getSegmentCount(), getTileCount()]);
    return res.json({ segments, tiles });
  } catch (err) {
    console.error("GET /api/map/stats error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
