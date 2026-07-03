// ─── PixelMapRenderer.ts ───────────────────────────────────────────────────
// Bloc P3 — NI-10.09 — Renderer expérimental isolé pour la carte Pixel HD.
//
// Bloc P4/P4-B : ce fichier est importé UNIQUEMENT par GameCanvas.tsx, utilisé
// en mode carte "immersive" (localStorage "nova_map_render_mode"). Le mode
// "strategic" (défaut) n'appelle jamais ce fichier. Ne pas importer depuis
// GameEngine.ts.
//
// Bloc P5 — Audit de stabilisation effectué : convention mapData[y][x]
// confirmée partout, géométrie hexToScreen() vérifiée mathématiquement
// équivalente à la transformation caméra du GameEngine (aucun double-zoom),
// mapping des 15 terrains réels confirmé contre MapGenerator.ts (aucun
// terrain fictif type "tundra" généré en jeu — asset gardé en réserve dans
// PixelHDAssets.ts uniquement).
//
// mapData suit la convention du reste du jeu : mapData[y][x] (ligne-major).
//
// Usage :
//   renderPixelMap({ ctx, mapData, width, height, cameraX, cameraY, hexSize });
// ────────────────────────────────────────────────────────────────────────────

import {
  type PixelHDTerrain,
  getPixelHDSprite,
  getPixelHDFogSprite,
  PIXEL_HD_SPRITE_WIDTH,
  PIXEL_HD_SPRITE_HEIGHT,
} from "./PixelHDAssets";

// ─── Types publics ─────────────────────────────────────────────────────────

export interface PixelMapTile {
  x?: number;
  y?: number;
  terrain: string;
  resource?: string | null;
  discovered?: boolean;
  explored?: boolean;
  ownerId?: string | number | null;
  cityId?: string | number | null;
}

// ─── Étape P5 — Responsabilité du zoom (audité, clarifié) ──────────────────
// Ce module ne recalcule JAMAIS le zoom lui-même. L'appelant (GameCanvas.tsx)
// doit transmettre des valeurs déjà "finales" :
//   hexSize  = hexSize brut du GameEngine × zoom
//   cameraX  = cameraX brut × zoom - largeur canvas / 2
//   cameraY  = cameraY brut × zoom - hauteur canvas / 2
// Vérifié mathématiquement équivalent à la transformation caméra du
// GameEngine (ctx.translate → scale(zoom) → translate(-camera)) — voir P5.
// Le champ `zoom` ci-dessous est conservé pour compatibilité de signature
// mais n'est PAS utilisé dans renderPixelMap (aucun risque de double-zoom).
export interface PixelMapRenderOptions {
  ctx: CanvasRenderingContext2D;
  mapData: PixelMapTile[][];
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  hexSize: number;
  /** @deprecated non utilisé — le zoom doit déjà être appliqué à hexSize/cameraX/cameraY par l'appelant */
  zoom?: number;
  showGrid?: boolean;
  animateWater?: boolean;
  waterFrame?: 0 | 1;
  selected?: { x: number; y: number } | null;
  hovered?: { x: number; y: number } | null;
  isHexVisible?: (x: number, y: number) => boolean;
  isHexInFogRing?: (x: number, y: number) => boolean;
}

// ─── Constantes internes ───────────────────────────────────────────────────

const SQ3 = Math.sqrt(3);
const FALLBACK_COLOR = "#4a4436";
const FALLBACK_STROKE = "rgba(0,0,0,0.35)";
const BACKGROUND_COLOR = "#0c0a08";

const WATER_TERRAINS_HD = new Set<PixelHDTerrain>(["shallow_water", "deep_water"]);

const KNOWN_TERRAINS = new Set<PixelHDTerrain>([
  "plains",
  "fertile_land",
  "sacred_plains",
  "enchanted_meadow",
  "forest",
  "hills",
  "wasteland",
  "desert",
  "ancient_ruins",
  "swamp",
  "caves",
  "mountains",
  "volcano",
  "shallow_water",
  "deep_water",
]);

// ─── Étape 3 — Terrain mapping ──────────────────────────────────────────────
// Mapping direct pour les 15 terrains actuels du jeu.
// "tundra" est un asset Pixel HD valide mais n'est jamais généré/mappé ici
// (pas de terrain "tundra" dans la logique de jeu actuelle).
function toPixelHDTerrain(terrain: string): PixelHDTerrain | null {
  if (KNOWN_TERRAINS.has(terrain as PixelHDTerrain)) {
    return terrain as PixelHDTerrain;
  }
  return null;
}

// ─── Étape 4 — Fonctions géométrie (identiques à GameEngine) ──────────────

function hexToScreen(
  x: number,
  y: number,
  hexSize: number,
  cameraX: number,
  cameraY: number,
): { sx: number; sy: number } {
  const hexHeight = hexSize * SQ3;
  return {
    sx: x * hexSize * 1.5 - cameraX,
    sy: y * hexHeight + (x % 2) * (hexHeight / 2) - cameraY,
  };
}

function drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, hexSize: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const hx = cx + hexSize * Math.cos(a);
    const hy = cy + hexSize * Math.sin(a);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
}

// Convention identique à GameEngine/GameCanvas : mapData[y][x] (ligne-major).
function getVisibleBounds(
  mapData: PixelMapTile[][],
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
  hexSize: number,
): { x0: number; x1: number; y0: number; y1: number } {
  const mapH = mapData.length > 0 ? mapData.length : 0;
  const mapW = mapH > 0 ? mapData[0].length : 0;
  const hexHeight = hexSize * SQ3;

  const x0 = Math.max(0, Math.floor(cameraX / (hexSize * 1.5)) - 1);
  const x1 = Math.min(mapW - 1, Math.ceil((cameraX + width) / (hexSize * 1.5)) + 1);
  const y0 = Math.max(0, Math.floor(cameraY / hexHeight) - 1);
  const y1 = Math.min(mapH - 1, Math.ceil((cameraY + height) / hexHeight) + 1);

  return { x0, x1, y0, y1 };
}

// ─── Étape 6 — Variant déterministe (hash simple, pas de Math.random) ─────

function getTileVariant(x: number, y: number): number {
  const h = (x * 374761393 + y * 668265263) ^ ((x << 13) + (y << 7));
  const positive = h >>> 0;
  return positive % 4;
}

// ─── Fallback pour terrain non supporté ────────────────────────────────────

function drawFallbackHex(ctx: CanvasRenderingContext2D, sx: number, sy: number, hexSize: number): void {
  drawHexPath(ctx, sx, sy, hexSize);
  ctx.fillStyle = FALLBACK_COLOR;
  ctx.fill();
  ctx.strokeStyle = FALLBACK_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─── Étape 5 — Fonction principale ─────────────────────────────────────────

export function renderPixelMap(options: PixelMapRenderOptions): void {
  const {
    ctx,
    mapData,
    width,
    height,
    cameraX,
    cameraY,
    hexSize,
    showGrid,
    animateWater,
    waterFrame,
    selected,
    hovered,
    isHexVisible,
    isHexInFogRing,
  } = options;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  if (!mapData || mapData.length === 0 || mapData[0].length === 0) {
    return;
  }

  const { x0, x1, y0, y1 } = getVisibleBounds(mapData, width, height, cameraX, cameraY, hexSize);

  const sprW = hexSize * 2;
  const sprH = PIXEL_HD_SPRITE_HEIGHT * ((hexSize * 2) / PIXEL_HD_SPRITE_WIDTH);

  for (let y = y0; y <= y1; y++) {
    const row = mapData[y];
    if (!row) continue;
    for (let x = x0; x <= x1; x++) {
      const tile = row[x];
      if (!tile) continue;

      const { sx, sy } = hexToScreen(x, y, hexSize, cameraX, cameraY);

      // Étape 8 — Fog : case non visible → sprite de brouillard uniquement
      if (isHexVisible && !isHexVisible(x, y)) {
        ctx.drawImage(getPixelHDFogSprite(), sx - sprW / 2, sy - sprH / 2, sprW, sprH);
        continue;
      }

      const hdTerrain = toPixelHDTerrain(tile.terrain);
      const variant = getTileVariant(x, y);

      if (hdTerrain) {
        const frame: 0 | 1 = animateWater && WATER_TERRAINS_HD.has(hdTerrain) ? waterFrame ?? 0 : 0;
        const sprite = getPixelHDSprite(hdTerrain, variant, frame);
        ctx.drawImage(sprite, sx - sprW / 2, sy - sprH / 2, sprW, sprH);
      } else {
        // Étape 9 — fallback terrain inconnu
        drawFallbackHex(ctx, sx, sy, hexSize);
      }

      // Étape 8 — voile fog ring (case révélée mais hors vision directe)
      if (isHexInFogRing && isHexInFogRing(x, y)) {
        drawHexPath(ctx, sx, sy, hexSize + 0.5);
        ctx.fillStyle = "rgba(12, 10, 8, 0.62)";
        ctx.fill();
      }
    }
  }

  // Grille optionnelle
  if (showGrid) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!mapData[y] || !mapData[y][x]) continue;
        const { sx, sy } = hexToScreen(x, y, hexSize, cameraX, cameraY);
        drawHexPath(ctx, sx, sy, hexSize);
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Survol
  if (hovered) {
    const { sx, sy } = hexToScreen(hovered.x, hovered.y, hexSize, cameraX, cameraY);
    drawHexPath(ctx, sx, sy, hexSize - 1);
    ctx.strokeStyle = "rgba(232, 178, 58, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Sélection
  if (selected) {
    const { sx, sy } = hexToScreen(selected.x, selected.y, hexSize, cameraX, cameraY);
    drawHexPath(ctx, sx, sy, hexSize - 1);
    ctx.strokeStyle = "#e8b23a";
    ctx.lineWidth = 3;
    ctx.stroke();
    drawHexPath(ctx, sx, sy, hexSize + 2);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
