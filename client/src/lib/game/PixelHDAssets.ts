// ─── PixelHDAssets.ts ──────────────────────────────────────────────────────
// Bloc P2 — NI-10.09 — Extraction isolée du prototype "Édition Pixel HD".
//
// Ce fichier NE DOIT PAS être importé par GameEngine.ts, MapGenerator.ts,
// mapAdapter.ts, TerrainCosts.ts, ResourceRevealSystem.ts ou GameCanvas.tsx.
// Il ne dépend d'aucune brique du jeu (pas de React, pas de GameEngine).
//
// Objectif : préparer les assets visuels Pixel HD (16 terrains, sprites
// 56×49, palettes riches, éclairage directionnel haut-gauche) pour une
// intégration future (P3+), sans brancher quoi que ce soit dans le rendu
// actuel du jeu.
//
// Usage futur prévu (non actif) :
//   const sprite = getPixelHDSprite("forest", 0, 0);
//   ctx.drawImage(sprite, sx - w / 2, sy - h / 2, w, h);
// ────────────────────────────────────────────────────────────────────────────

// ─── Terrains supportés par les assets Pixel HD ───────────────────────────
// Les 15 terrains actuels du jeu + "tundra" (présent dans le prototype,
// non actif dans le jeu — asset disponible mais non utilisé).
export type PixelHDTerrain =
  | "plains"
  | "fertile_land"
  | "sacred_plains"
  | "enchanted_meadow"
  | "forest"
  | "hills"
  | "wasteland"
  | "desert"
  | "ancient_ruins"
  | "swamp"
  | "caves"
  | "mountains"
  | "volcano"
  | "shallow_water"
  | "deep_water"
  | "tundra";

export type PixelHDFrame = 0 | 1;

export const PIXEL_HD_TERRAINS: PixelHDTerrain[] = [
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
  "tundra",
];

// ─── Géométrie des sprites — hex flat-top, T = 28 texels ──────────────────
const T = 28;
const SPR_W = 2 * T;
const SPR_H = Math.ceil(Math.sqrt(3) * T);
const CX = SPR_W / 2;
const CY = SPR_H / 2;
const SQ3 = Math.sqrt(3);

export const PIXEL_HD_SPRITE_WIDTH = SPR_W;
export const PIXEL_HD_SPRITE_HEIGHT = SPR_H;

// ─── RNG déterministe (mulberry32, identique au prototype) ────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Utilitaires bas niveau ────────────────────────────────────────────────
function insideHex(pxl: number, pyl: number, margin?: number): boolean {
  const x = Math.abs(pxl - CX + 0.5);
  const y = Math.abs(pyl - CY + 0.5);
  const m = margin || 0;
  if (y > (SQ3 / 2) * (T + m)) return false;
  return SQ3 * x + y <= SQ3 * (T + m);
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// ─── Palettes HD (7-12 teintes par terrain) ───────────────────────────────
type PalHD = Record<string, any>;

const PAL_HD: Record<PixelHDTerrain, PalHD> = {
  forest: {
    base: ["#1b3a17", "#234a1d", "#2c5a24", "#36692c", "#417a35", "#4d8a3f", "#5a9a4a"],
    canopy: ["#0e2610", "#173a18", "#215022", "#2c662c", "#3a7d38", "#4c9346", "#63aa58", "#7fc46e", "#a2dd8e"],
    trunk: ["#2e1e0c", "#4a3218", "#66492a"],
    mushroom: "#c43b2a", mushroomDot: "#f2e6d8", light: "#bfe89a",
  },
  mountains: {
    rock: ["#33333b", "#41414a", "#50505a", "#60606a", "#71717b", "#83838d", "#9696a0", "#ababb5"],
    snow: ["#c9d6e2", "#e2ebf2", "#f4f9fd"],
    scree: "#2c2c34",
  },
  desert: {
    base: ["#7a5c1e", "#96732a", "#ad8930", "#c29d3c", "#d4b14e", "#e3c363", "#efd57e", "#f8e49c"],
    cactus: ["#2a5c26", "#3a7a33", "#54964a", "#7ab86a"],
    flower: "#f2a6c8", bone: "#fdf8e6", shade: "#5c4416",
  },
  shallow_water: {
    base: ["#1e5578", "#28648c", "#3374a0", "#3f85b2", "#4d96c2", "#5da7d0", "#70b8dd", "#86c9e8", "#a0daf0"],
    foam: ["#d8f2fb", "#ffffff"], sparkle: "#e8fbff",
  },
  deep_water: {
    base: ["#0a1c36", "#0e2442", "#132d50", "#19375e", "#20426c", "#284e7a", "#315a88"],
    foam: ["#7d9dbd", "#a8c4dd"], sparkle: "#c2dcef",
  },
  fertile_land: {
    base: ["#2c541f", "#356226", "#40722e", "#4c8237", "#599240", "#68a24c", "#79b25a"],
    soil: ["#25401a", "#3a2c14"], sprout: ["#8fd268", "#c2ee96"], wheatTip: "#e8d26a",
  },
  plains: {
    base: ["#6f823e", "#7e9148", "#8fa254", "#a0b262", "#b1c271", "#c2d181", "#d3e092"],
    tuft: ["#e2f0a8", "#f2fac4"], flowerW: "#fdfdf2", flowerY: "#f2d84a", flowerCore: "#c99a1e",
  },
  sacred_plains: {
    base: ["#8f7a3e", "#a48d4a", "#b8a058", "#ccb368", "#ddc57a", "#ecd68f", "#f8e6ab"],
    stone: ["#6b6252", "#8a8068", "#aaa085", "#cdc4a6"],
    glow: ["#fff9dd", "#ffffff"], rune: "#ffe89a",
  },
  enchanted_meadow: {
    base: ["#145238", "#1a6444", "#227752", "#2c8a60", "#389d6f", "#48b080", "#5dc492"],
    flowerP: "#f2a6d8", flowerB: "#9ac8f2", flowerW: "#fdfdfd",
    fly: "#fdf6b2", flyHalo: "#a8d88e",
  },
  hills: {
    base: ["#6b5636", "#7d663f", "#8f7749", "#a08853", "#b1995e", "#c2ab6c", "#d2bc7c"],
    top: "#e4d094", shadow: "#54431f",
    bush: ["#2c5424", "#3f7233", "#559045"],
  },
  wasteland: {
    base: ["#6e6753", "#7f785f", "#918a6c", "#a29b7a", "#b3ac88", "#c4bd98", "#d4cda8"],
    crack: ["#4a4436", "#3a3527"], bone: "#fdf9e8", boneDim: "#dcd4b4",
    shrub: ["#5c4c32", "#7a6644"],
  },
  ancient_ruins: {
    base: ["#5a523f", "#69614a", "#787056", "#877f62", "#968e6e", "#a59d7b", "#b4ac89"],
    stone: ["#7c7460", "#9a9278", "#b8b092", "#d4ccac"],
    stoneDark: "#544c3a", moss: "#4c7a34", shadow: "#3a3527",
  },
  caves: {
    base: ["#1c1c1e", "#252527", "#2e2e31", "#38383b", "#424246", "#4d4d51", "#59595d"],
    rim: ["#6d6d72", "#84848a"], mouth: "#050505",
    crystal: ["#5c3690", "#9a6bd4", "#d4b5f7"],
  },
  tundra: {
    base: ["#8ba2b0", "#9db3c0", "#b0c5d0", "#c2d6df", "#d4e5ec", "#e5f2f7", "#f4fbfe"],
    driftHi: "#ffffff", driftLo: "#9db3c0",
    rock: ["#5c5c64", "#78787f", "#94949b"],
    grass: "#c2b06a",
  },
  swamp: {
    base: ["#26301a", "#2f3c20", "#394827", "#43542e", "#4d6035", "#586c3d", "#647846"],
    pool: ["#12262a", "#1c3a3e", "#2c5258", "#4a7c80"],
    reed: ["#5c7a3a", "#7a9a4e"], cattail: "#5c3a1a", mist: "#8fa08a",
  },
  volcano: {
    base: ["#201416", "#2a1b1c", "#342223", "#3e2a2a", "#493231", "#543a38", "#5f423f"],
    cone: ["#1a1012", "#2c1c1d", "#3e2828", "#523534", "#664240"],
    lava: ["#fff2a0", "#ffc23e", "#f2811e", "#d84a14", "#8f2410"],
    smoke: ["#4a4448", "#5f5a5e", "#767176"],
  },
};

// ─── Config de base par terrain : teintes, bruit, force du dégradé ────────
interface BaseCfg {
  shades: string[];
  noise: number;
  grad: number;
}

const BASECFG: Record<PixelHDTerrain, BaseCfg> = {
  forest: { shades: PAL_HD.forest.base, noise: 0.5, grad: 0.18 },
  mountains: { shades: PAL_HD.mountains.rock.slice(1, 6), noise: 0.4, grad: 0.3 },
  desert: { shades: PAL_HD.desert.base, noise: 0.26, grad: 0.35 },
  shallow_water: { shades: PAL_HD.shallow_water.base, noise: 0.26, grad: 0.45 },
  deep_water: { shades: PAL_HD.deep_water.base, noise: 0.22, grad: 0.4 },
  fertile_land: { shades: PAL_HD.fertile_land.base, noise: 0.3, grad: 0.3 },
  plains: { shades: PAL_HD.plains.base, noise: 0.3, grad: 0.3 },
  sacred_plains: { shades: PAL_HD.sacred_plains.base, noise: 0.26, grad: 0.35 },
  enchanted_meadow: { shades: PAL_HD.enchanted_meadow.base, noise: 0.32, grad: 0.28 },
  hills: { shades: PAL_HD.hills.base, noise: 0.3, grad: 0.32 },
  wasteland: { shades: PAL_HD.wasteland.base, noise: 0.34, grad: 0.28 },
  ancient_ruins: { shades: PAL_HD.ancient_ruins.base, noise: 0.34, grad: 0.26 },
  caves: { shades: PAL_HD.caves.base, noise: 0.36, grad: 0.22 },
  tundra: { shades: PAL_HD.tundra.base, noise: 0.24, grad: 0.4 },
  swamp: { shades: PAL_HD.swamp.base, noise: 0.36, grad: 0.22 },
  volcano: { shades: PAL_HD.volcano.base, noise: 0.34, grad: 0.26 },
};

// ─── Base HD : dégradé vertical doux + éclairage haut-gauche + bruit ──────
function baseHD(
  ctx: CanvasRenderingContext2D,
  shades: string[],
  rng: () => number,
  noiseAmt: number,
  grad?: number,
): void {
  const n = shades.length;
  const g = grad === undefined ? 0.6 : grad;
  for (let y = 0; y < SPR_H; y++) {
    for (let x = 0; x < SPR_W; x++) {
      if (!insideHex(x, y, 0.45)) continue;
      const t = 0.55 + (0.5 - y / SPR_H) * g + (1 - x / SPR_W) * 0.08 + (rng() - 0.5) * noiseAmt;
      const idx = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
      px(ctx, x, y, shades[idx]);
    }
  }
}

// ─── Placement aléatoire garanti dans l'hexagone ───────────────────────────
function spotHD(
  rng: () => number,
  fn: (x: number, y: number) => void,
  n: number,
  pad?: number,
): void {
  let placed = 0;
  let tries = 0;
  while (placed < n && tries < n * 8) {
    tries++;
    const x = Math.floor(3 + rng() * (SPR_W - 6));
    const y = Math.floor(4 + rng() * (SPR_H - 8));
    if (insideHex(x, y, -(pad || 2))) {
      fn(x, y);
      placed++;
    }
  }
}

// ─── Décorateurs HD (privés — un par motif visuel) ────────────────────────

function pineHD(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, P: PalHD, rng: () => number): void {
  const c = P.canopy;
  const tr = P.trunk;
  const trunkH = Math.max(2, Math.floor(h * 0.18));
  const shW = Math.round(h * 0.16);
  for (let dx = -shW; dx <= shW + 1; dx++)
    if (dx === 0 || dx === 1 || rng() < 0.6) px(ctx, x + dx, y + 1, P.base[1]);
  for (let dy = 0; dy < trunkH; dy++) {
    px(ctx, x, y - dy, tr[1]);
    px(ctx, x + 1, y - dy, tr[0]);
  }
  const top = y - h;
  const cone = h - trunkH;
  for (let row = 0; row < cone; row++) {
    const yy = y - trunkH - row;
    const prog = row / cone;
    let half = Math.max(0, Math.round((1 - prog) * h * 0.28));
    if (row % 4 === 0 && half > 0) half += 1;
    for (let dx = -half; dx <= half; dx++) {
      if (Math.abs(dx) === half && rng() < 0.3) continue;
      let ci: number;
      if (dx < -half * 0.33) ci = 5 + Math.floor(rng() * 2);
      else if (dx > half * 0.33) ci = 1 + Math.floor(rng() * 2);
      else ci = 3 + Math.floor(rng() * 2);
      if (row % 4 === 3 && rng() < 0.5) ci = Math.max(0, ci - 2);
      px(ctx, x + dx, yy, c[ci]);
    }
  }
  px(ctx, x, top, c[8]);
  px(ctx, x, top + 1, c[6]);
  px(ctx, x - 1, top + 2, c[7]);
}

function peakHD(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  P: PalHD,
  rng: () => number,
  snowRatio: number,
): void {
  const R = P.rock;
  for (let row = 0; row <= h; row++) {
    const prog = row / h;
    const half = Math.round(w * (1 - prog));
    const yy = y - row;
    for (let dx = -half; dx <= half; dx++) {
      const snowLine = 1 - snowRatio;
      const isSnow = snowRatio > 0 && (prog > snowLine + snowRatio * 0.25 || (prog > snowLine && rng() < 0.5));
      if (isSnow) {
        px(ctx, x + dx, yy, dx <= 0 ? P.snow[2] : P.snow[1]);
        continue;
      }
      let ci: number;
      if (dx < -half * 0.12) ci = 5 + Math.floor(rng() * 2);
      else if (dx > half * 0.12) ci = 1 + Math.floor(rng() * 2);
      else ci = 7;
      px(ctx, x + dx, yy, R[ci]);
    }
  }
  let cx2 = x + Math.floor(w * 0.35);
  for (let row = Math.floor(h * 0.1); row < h * 0.6; row++) {
    const yy = y - row;
    if (rng() < 0.5) cx2 += rng() < 0.5 ? -1 : 0;
    const half = Math.round(w * (1 - row / h));
    if (cx2 > x && cx2 - x < half) px(ctx, cx2, yy, R[0]);
  }
  for (let i = 0; i < w * 1.2; i++) {
    const dx = Math.floor((rng() - 0.5) * w * 2.0);
    px(ctx, x + dx, y + 1 + Math.floor(rng() * 2), rng() < 0.5 ? P.scree : R[2]);
  }
}

function duneHD(ctx: CanvasRenderingContext2D, yBase: number, amp: number, phase: number, P: PalHD, rng: () => number): void {
  const S = P.base;
  for (let x = 2; x < SPR_W - 2; x++) {
    const yC = Math.floor(yBase + Math.sin((x + phase) * 0.28) * amp);
    if (!insideHex(x, yC, -1.5)) continue;
    px(ctx, x, yC, S[7]);
    const grads = [S[2], S[3], S[4]];
    for (let d = 1; d <= 3; d++) {
      if (!insideHex(x, yC + d, -1.5)) break;
      if (d === 1 || rng() < 0.75 - d * 0.15) px(ctx, x, yC + d, grads[d - 1]);
    }
  }
}

function cactusHD(ctx: CanvasRenderingContext2D, x: number, y: number, P: PalHD, rng: () => number): void {
  const C = P.cactus;
  const h = 8 + Math.floor(rng() * 3);
  for (let dy = 0; dy < h; dy++) {
    px(ctx, x, y - dy, C[2]);
    px(ctx, x - 1, y - dy, C[3]);
    px(ctx, x + 1, y - dy, C[1]);
  }
  const ay = y - Math.floor(h * 0.55);
  px(ctx, x - 2, ay, C[2]);
  px(ctx, x - 3, ay, C[3]);
  px(ctx, x - 3, ay - 1, C[2]);
  px(ctx, x - 3, ay - 2, C[3]);
  const by = y - Math.floor(h * 0.4);
  px(ctx, x + 2, by, C[1]);
  px(ctx, x + 3, by, C[2]);
  px(ctx, x + 3, by - 1, C[1]);
  if (rng() < 0.6) px(ctx, x, y - h, P.flower);
  for (let dx = 0; dx <= 4; dx++) px(ctx, x + 1 + dx, y + 1, P.shade);
}

function wavesHD(
  ctx: CanvasRenderingContext2D,
  P: PalHD,
  rng: () => number,
  frame: number,
  count: number,
  foamChance: number,
): void {
  const D = P.base;
  for (let i = 0; i < count; i++) {
    const y = Math.floor(5 + rng() * (SPR_H - 10));
    const x0 = Math.floor(3 + rng() * (SPR_W - 16));
    const len = 6 + Math.floor(rng() * 8);
    const off = frame === 1 ? 2 : 0;
    for (let dx = 0; dx < len; dx++) {
      const x = x0 + dx + off;
      const yy = y + Math.floor(Math.sin((dx + i) * 0.8) * 1.2);
      if (!insideHex(x, yy, -2)) continue;
      const edge = dx === 0 || dx === len - 1;
      px(ctx, x, yy, edge ? D[D.length - 3] : D[D.length - 2]);
      if (!edge && rng() < foamChance) px(ctx, x, yy - 1, P.foam[rng() < 0.4 ? 1 : 0]);
    }
  }
  for (let i = 0; i < count * 2; i++) {
    const x = Math.floor(4 + rng() * (SPR_W - 8));
    const y = Math.floor(4 + rng() * (SPR_H - 8));
    if (insideHex(x, y, -2) && rng() < 0.5) px(ctx, x, y, P.sparkle);
  }
}

function moundHD(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, P: PalHD, rng: () => number): void {
  for (let row = 0; row <= h; row++) {
    const prog = row / h;
    const half = Math.round(w * Math.sqrt(Math.max(0, 1 - prog * prog)));
    const yy = y - row;
    for (let dx = -half; dx <= half; dx++) {
      let c: string;
      if (row === h || (row === h - 1 && Math.abs(dx) < half * 0.5)) c = P.top;
      else if (dx < -half * 0.25) c = P.base[5 + (rng() < 0.4 ? 1 : 0)];
      else if (dx > half * 0.3) c = P.base[1 + (rng() < 0.4 ? 1 : 0)];
      else c = P.base[3 + Math.floor(rng() * 2)];
      px(ctx, x + dx, yy, c);
    }
  }
  for (let dx = -w; dx <= w; dx++) if (rng() < 0.7) px(ctx, x + dx, y + 1, P.shadow);
}

function crackHD(ctx: CanvasRenderingContext2D, x0: number, y0: number, len: number, P: PalHD, rng: () => number): void {
  let x = x0;
  let y = y0;
  const dirX = rng() < 0.5 ? 1 : -1;
  for (let i = 0; i < len; i++) {
    if (insideHex(x, y, -2)) {
      px(ctx, x, y, P.crack[0]);
      if (rng() < 0.3) px(ctx, x, y + 1, P.crack[1]);
    }
    x += rng() < 0.7 ? dirX : 0;
    y += rng() < 0.55 ? 1 : 0;
    if (i === Math.floor(len / 2) && rng() < 0.6) {
      let bx = x;
      let by = y;
      for (let j = 0; j < len / 2; j++) {
        bx -= dirX;
        by += rng() < 0.5 ? 1 : 0;
        if (insideHex(bx, by, -2)) px(ctx, bx, by, P.crack[1]);
      }
    }
  }
}

function columnHD(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, P: PalHD, rng: () => number): void {
  const S = P.stone;
  for (let dy = 0; dy < h; dy++) {
    const broken = dy === h - 1 && rng() < 0.8;
    px(ctx, x, y - dy, S[2]);
    px(ctx, x + 1, y - dy, S[1]);
    if (broken && rng() < 0.5) px(ctx, x + (rng() < 0.5 ? 0 : 1), y - dy, S[3]);
    if (rng() < 0.12) px(ctx, x, y - dy, P.moss);
  }
  if (h > 7) {
    px(ctx, x - 1, y - h + 1, S[3]);
    px(ctx, x + 2, y - h + 1, S[2]);
  }
  px(ctx, x - 1, y, S[1]);
  px(ctx, x + 2, y, S[0]);
  for (let dx = 1; dx <= 3; dx++) px(ctx, x + 2 + dx, y + 1, P.shadow);
}

function poolHD(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, P: PalHD, rng: () => number): void {
  const Q = P.pool;
  for (let dy = -2; dy <= 2; dy++) {
    const half = Math.round(w * Math.sqrt(Math.max(0, 1 - (dy / 2.4) * (dy / 2.4))));
    for (let dx = -half; dx <= half; dx++) {
      if (!insideHex(x + dx, y + dy, -2)) continue;
      const edge = Math.abs(dx) >= half - 1 || Math.abs(dy) === 2;
      px(ctx, x + dx, y + dy, edge ? Q[0] : Q[1]);
    }
  }
  for (let dx = -Math.floor(w * 0.4); dx <= 0; dx++) px(ctx, x + dx, y - 1, Q[3]);
  if (rng() < 0.7) px(ctx, x + 1, y, Q[2]);
}

function reedHD(ctx: CanvasRenderingContext2D, x: number, y: number, P: PalHD, rng: () => number): void {
  const h = 5 + Math.floor(rng() * 3);
  for (let dy = 0; dy < h; dy++) px(ctx, x, y - dy, dy > h * 0.5 ? P.reed[1] : P.reed[0]);
  px(ctx, x, y - h, P.cattail);
  px(ctx, x, y - h - 1, P.cattail);
  if (rng() < 0.5) px(ctx, x + 1, y - Math.floor(h * 0.6), P.reed[1]);
}

function lavaFlowHD(ctx: CanvasRenderingContext2D, x0: number, y0: number, len: number, P: PalHD, rng: () => number): void {
  const L = P.lava;
  let x = x0;
  let y = y0;
  for (let i = 0; i < len; i++) {
    const heat = i / len;
    const ci = Math.min(L.length - 1, Math.floor(heat * L.length));
    if (insideHex(x, y, -1.5)) {
      px(ctx, x, y, L[ci]);
      if (heat < 0.4 && rng() < 0.5) px(ctx, x + 1, y, L[Math.min(4, ci + 1)]);
    }
    y += 1;
    x += rng() < 0.4 ? (rng() < 0.5 ? 1 : -1) : 0;
  }
}

// ─── decorateHD — les 16 terrains ──────────────────────────────────────────
function decorateHD(
  ctx: CanvasRenderingContext2D,
  terrain: PixelHDTerrain,
  rng: () => number,
  variant: number,
  frame: PixelHDFrame,
): void {
  const P = PAL_HD[terrain];
  switch (terrain) {
    case "forest": {
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(rng() * SPR_W);
        const y = Math.floor(rng() * SPR_H);
        if (insideHex(x, y, -2) && rng() < 0.5) px(ctx, x, y, P.light);
      }
      const trees: { x: number; y: number; h: number }[] = [];
      let tries = 0;
      while (trees.length < 7 && tries < 80) {
        tries++;
        const x = Math.floor(5 + rng() * (SPR_W - 10));
        const y = Math.floor(10 + rng() * (SPR_H - 14));
        if (!insideHex(x, y, -6)) continue;
        if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 9)) continue;
        trees.push({ x, y, h: 13 + Math.floor(rng() * 7) });
      }
      trees.sort((a, b) => a.y - b.y);
      trees.forEach((t) => pineHD(ctx, t.x, t.y, t.h, P, rng));
      for (let i = 0; i < 2; i++) {
        const x = Math.floor(6 + rng() * (SPR_W - 12));
        const y = Math.floor(SPR_H * 0.6 + rng() * SPR_H * 0.3);
        if (insideHex(x, y, -3)) {
          px(ctx, x, y, P.mushroom);
          px(ctx, x + 1, y, P.mushroom);
          px(ctx, x, y - 1, P.mushroomDot);
        }
      }
      break;
    }

    case "mountains":
      peakHD(ctx, CX - 11, CY + 13, 14, 24, P, rng, 0.38);
      peakHD(ctx, CX + 13, CY + 15, 11, 19, P, rng, 0.34);
      peakHD(ctx, CX + 1, CY + 19, 10, 13, P, rng, 0.0);
      break;

    case "desert": {
      duneHD(ctx, 13, 2.0, variant * 3, P, rng);
      duneHD(ctx, 26, 2.5, variant * 3 + 9, P, rng);
      duneHD(ctx, 38, 1.8, variant * 3 + 18, P, rng);
      cactusHD(ctx, CX - 8 + Math.floor(rng() * 16), CY + 8 + Math.floor(rng() * 6), P, rng);
      const bx = Math.floor(10 + rng() * (SPR_W - 20));
      const by = Math.floor(8 + rng() * 8);
      if (insideHex(bx, by, -4)) {
        px(ctx, bx, by, P.bone);
        px(ctx, bx + 1, by, P.bone);
        px(ctx, bx + 2, by, P.bone);
        px(ctx, bx, by - 1, P.bone);
        px(ctx, bx + 3, by - 1, P.bone);
      }
      break;
    }

    case "shallow_water":
      wavesHD(ctx, P, mulberry32(0xea0 + variant * 733), frame, 7, 0.5);
      break;

    case "deep_water":
      wavesHD(ctx, P, mulberry32(0xeb0 + variant * 733), frame, 4, 0.25);
      break;

    case "fertile_land": {
      for (let row = 0; row < 5; row++) {
        const yBase = 7 + row * 8 + (variant % 2) * 2;
        for (let x = 2; x < SPR_W - 2; x++) {
          const y = Math.floor(yBase + Math.sin(x * 0.14 + row) * 1.4);
          if (!insideHex(x, y, -1.5)) continue;
          px(ctx, x, y, P.soil[0]);
          if (rng() < 0.5) px(ctx, x, y + 1, P.soil[1]);
          if (x % 3 === row % 3 && insideHex(x, y - 3, -1.5)) {
            px(ctx, x, y - 3, P.sprout[0]);
            px(ctx, x, y - 4, P.sprout[1]);
            if (rng() < 0.25) px(ctx, x, y - 5, P.wheatTip);
          }
        }
      }
      break;
    }

    case "plains": {
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.tuft[0]);
          px(ctx, x, y - 1, P.tuft[0]);
          px(ctx, x, y - 2, P.tuft[1]);
          px(ctx, x - 1, y, P.tuft[0]);
          px(ctx, x - 1, y - 1, P.tuft[1]);
          px(ctx, x + 1, y, P.tuft[0]);
          px(ctx, x + 1, y - 1, P.tuft[1]);
        },
        9,
        3,
      );
      spotHD(
        rng,
        (x, y) => {
          const c = rng() < 0.5 ? P.flowerW : P.flowerY;
          px(ctx, x, y, c);
          px(ctx, x - 1, y, c);
          px(ctx, x + 1, y, c);
          px(ctx, x, y - 1, c);
          px(ctx, x, y + 1, c);
          px(ctx, x, y, P.flowerCore);
        },
        4,
        3,
      );
      break;
    }

    case "sacred_plains": {
      const mx = CX - 6 + Math.floor(rng() * 12);
      const my = CY + 4 + Math.floor(rng() * 5);
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -5; dx <= 5; dx++) {
          if (Math.hypot(dx, dy * 1.3) < 5 && insideHex(mx + dx, my + dy, -2) && rng() < 0.3)
            px(ctx, mx + dx, my + dy, P.glow[0]);
        }
      for (let dy = 0; dy < 9; dy++) {
        const w = dy > 6 ? 0 : 1;
        for (let dx = -w; dx <= w; dx++) px(ctx, mx + dx, my - dy, dx < 0 ? P.stone[3] : P.stone[1]);
      }
      px(ctx, mx, my - 4, P.rune);
      px(ctx, mx, my - 2, P.rune);
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.glow[1]);
          px(ctx, x - 1, y, P.glow[0]);
          px(ctx, x + 1, y, P.glow[0]);
          px(ctx, x, y - 1, P.glow[0]);
          px(ctx, x, y + 1, P.glow[0]);
        },
        3,
        3,
      );
      break;
    }

    case "enchanted_meadow": {
      spotHD(
        rng,
        (x, y) => {
          const c = [P.flowerP, P.flowerB, P.flowerW][Math.floor(rng() * 3)];
          px(ctx, x, y, c);
          px(ctx, x + 1, y, c);
          px(ctx, x, y - 1, c);
          px(ctx, x - 1, y + 1, P.base[6]);
        },
        7,
        2,
      );
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.fly);
          px(ctx, x - 1, y, P.flyHalo);
          px(ctx, x + 1, y, P.flyHalo);
          px(ctx, x, y - 1, P.flyHalo);
          px(ctx, x, y + 1, P.flyHalo);
        },
        4,
        3,
      );
      break;
    }

    case "hills": {
      moundHD(ctx, CX - 10, CY + 8, 11, 8, P, rng);
      moundHD(ctx, CX + 11, CY + 12, 9, 7, P, rng);
      moundHD(ctx, CX + 1, CY + 18, 8, 5, P, rng);
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.bush[1]);
          px(ctx, x + 1, y, P.bush[0]);
          px(ctx, x - 1, y, P.bush[1]);
          px(ctx, x, y - 1, P.bush[2]);
        },
        3,
        4,
      );
      break;
    }

    case "wasteland": {
      crackHD(ctx, Math.floor(8 + rng() * 14), Math.floor(6 + rng() * 8), 14, P, rng);
      crackHD(ctx, Math.floor(SPR_W * 0.55 + rng() * 10), Math.floor(10 + rng() * 10), 12, P, rng);
      const sx = Math.floor(12 + rng() * (SPR_W - 24));
      const sy = Math.floor(SPR_H * 0.55 + rng() * 6);
      if (insideHex(sx, sy, -4)) {
        px(ctx, sx, sy, P.bone);
        px(ctx, sx + 1, sy, P.bone);
        px(ctx, sx, sy - 1, P.bone);
        px(ctx, sx + 1, sy - 1, P.boneDim);
        px(ctx, sx, sy + 1, P.boneDim);
        for (let i = 0; i < 4; i++) {
          px(ctx, sx + 3 + i * 2, sy, P.bone);
          px(ctx, sx + 3 + i * 2, sy + 1, P.boneDim);
        }
        for (let i = 0; i < 7; i++) px(ctx, sx + 3 + i, sy - 1, P.boneDim);
      }
      const dx2 = Math.floor(10 + rng() * (SPR_W - 20));
      const dy2 = Math.floor(8 + rng() * 8);
      if (insideHex(dx2, dy2, -4)) {
        px(ctx, dx2, dy2, P.shrub[0]);
        px(ctx, dx2, dy2 - 1, P.shrub[0]);
        px(ctx, dx2, dy2 - 2, P.shrub[1]);
        px(ctx, dx2 - 1, dy2 - 3, P.shrub[1]);
        px(ctx, dx2 + 1, dy2 - 3, P.shrub[0]);
        px(ctx, dx2 - 2, dy2 - 4, P.shrub[1]);
      }
      break;
    }

    case "ancient_ruins": {
      columnHD(ctx, CX - 10, CY + 4, 9, P, rng);
      columnHD(ctx, CX + 8, CY + 8, 6, P, rng);
      const fy = CY + 14;
      for (let dx = 0; dx < 10; dx++) {
        const x = CX - 5 + dx;
        if (!insideHex(x, fy, -3)) continue;
        px(ctx, x, fy - 1, P.stone[3]);
        px(ctx, x, fy, dx % 3 === 0 ? P.stoneDark : P.stone[2]);
        px(ctx, x, fy + 1, P.stone[0]);
      }
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.stone[2]);
          px(ctx, x + 1, y, P.stone[1]);
          px(ctx, x, y - 1, P.stone[3]);
          px(ctx, x + 1, y - 1, P.stone[2]);
          if (rng() < 0.5) px(ctx, x, y - 1, P.moss);
          px(ctx, x + 2, y + 1, P.shadow);
        },
        3,
        3,
      );
      break;
    }

    case "caves": {
      const mw = 9;
      const mh = 8;
      for (let dy = 0; dy <= mh; dy++) {
        const prog = dy / mh;
        const half = Math.round(mw * Math.sqrt(Math.max(0, 1 - (1 - prog) * (1 - prog))));
        for (let dx = -half; dx <= half; dx++) px(ctx, CX + dx, CY - mh + 4 + dy, P.mouth);
      }
      for (let a = 0; a <= 20; a++) {
        const ang = Math.PI * (a / 20);
        const rx = Math.round(Math.cos(ang) * (mw + 1));
        const ry = -Math.round(Math.sin(ang) * mh);
        px(ctx, CX + rx, CY + 4 + ry, a < 12 ? P.rim[1] : P.rim[0]);
      }
      px(ctx, CX - 2, CY - 2, P.base[4]);
      px(ctx, CX - 2, CY - 1, P.base[3]);
      px(ctx, CX + 3, CY + 2, P.base[4]);
      px(ctx, CX + 3, CY + 3, P.base[5]);
      px(ctx, CX + 3, CY + 4, P.base[5]);
      for (const [gx, gy] of [
        [CX - mw - 3, CY + 5],
        [CX + mw + 2, CY + 3],
      ]) {
        if (!insideHex(gx, gy, -3)) continue;
        px(ctx, gx, gy, P.crystal[1]);
        px(ctx, gx, gy - 1, P.crystal[2]);
        px(ctx, gx + 1, gy, P.crystal[0]);
      }
      break;
    }

    case "tundra": {
      for (let i = 0; i < 3; i++) {
        const yy = 10 + i * 12 + (variant % 2) * 3;
        for (let x = 2; x < SPR_W - 2; x++) {
          const y = Math.floor(yy + Math.sin((x + i * 7) * 0.22) * 1.8);
          if (!insideHex(x, y, -1.5)) continue;
          px(ctx, x, y, P.driftHi);
          if (rng() < 0.6) px(ctx, x, y + 1, P.driftLo);
        }
      }
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.rock[1]);
          px(ctx, x + 1, y, P.rock[0]);
          px(ctx, x - 1, y, P.rock[2]);
          px(ctx, x, y + 1, P.rock[0]);
          px(ctx, x, y - 1, P.driftHi);
          px(ctx, x + 1, y - 1, P.driftHi);
        },
        3,
        3,
      );
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.grass);
          px(ctx, x, y - 1, P.grass);
          px(ctx, x + 1, y, P.grass);
        },
        3,
        2,
      );
      break;
    }

    case "swamp": {
      poolHD(ctx, CX - 8, CY + 2, 7, P, rng);
      poolHD(ctx, CX + 10, CY + 10, 5, P, rng);
      reedHD(ctx, CX - 15, CY + 3, P, rng);
      reedHD(ctx, CX - 2, CY + 5, P, rng);
      reedHD(ctx, CX + 5, CY + 12, P, rng);
      reedHD(ctx, CX + 16, CY + 9, P, rng);
      spotHD(
        rng,
        (x, y) => {
          px(ctx, x, y, P.mist);
          px(ctx, x + 1, y, P.mist);
          if (rng() < 0.5) px(ctx, x + 2, y, P.mist);
        },
        4,
        2,
      );
      break;
    }

    case "volcano": {
      const vw = 15;
      const vh = 22;
      const vy = CY + 14;
      for (let row = 0; row <= vh; row++) {
        const prog = row / vh;
        const half = Math.round(vw * (1 - prog));
        const yy = vy - row;
        for (let dx = -half; dx <= half; dx++) {
          let c: string;
          if (dx < -half * 0.15) c = P.cone[3 + (rng() < 0.4 ? 1 : 0)];
          else if (dx > half * 0.15) c = P.cone[0 + (rng() < 0.4 ? 1 : 0)];
          else c = P.cone[2];
          px(ctx, CX + dx, yy, c);
        }
      }
      const cyv = vy - vh;
      px(ctx, CX - 1, cyv + 1, P.lava[1]);
      px(ctx, CX, cyv + 1, P.lava[0]);
      px(ctx, CX + 1, cyv + 1, P.lava[1]);
      px(ctx, CX, cyv + 2, P.lava[2]);
      px(ctx, CX - 2, cyv + 2, P.lava[2]);
      px(ctx, CX + 2, cyv + 2, P.lava[3]);
      lavaFlowHD(ctx, CX - 1, cyv + 3, Math.floor(vh * 0.8), P, rng);
      lavaFlowHD(ctx, CX + 2, cyv + 4, Math.floor(vh * 0.55), P, rng);
      spotHD(rng, (x, y) => px(ctx, x, y, rng() < 0.5 ? P.lava[1] : P.lava[2]), 4, 3);
      for (let i = 0; i < 5; i++) {
        const sx2 = CX + Math.floor((rng() - 0.3) * 6);
        const sy2 = cyv - 1 - i;
        if (insideHex(sx2, sy2, -1)) px(ctx, sx2, sy2, P.smoke[Math.min(2, Math.floor(i / 2))]);
      }
      break;
    }
  }
}

// ─── Cache de sprites (mémoire uniquement, non persistant) ────────────────
const spriteCache = new Map<string, HTMLCanvasElement>();

// ─── API publique ──────────────────────────────────────────────────────────

/**
 * Retourne un sprite Pixel HD déterministe pour un terrain donné.
 * Même terrain + même variant + même frame = même rendu (garanti par RNG seedé).
 *
 * NON UTILISÉ dans le rendu actuel du jeu — préparé pour une intégration future (P3+).
 */
export function getPixelHDSprite(
  terrain: PixelHDTerrain,
  variant: number = 0,
  frame: PixelHDFrame = 0,
): HTMLCanvasElement {
  const key = `${terrain}|${variant}|${frame}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const c = document.createElement("canvas");
  c.width = SPR_W;
  c.height = SPR_H;
  const ctx = c.getContext("2d")!;
  const cfg = BASECFG[terrain];
  const rng = mulberry32(0x4d5a + variant * 1409 + terrain.charCodeAt(0) * 257 + terrain.length * 61);
  baseHD(ctx, cfg.shades, rng, cfg.noise, cfg.grad);
  decorateHD(ctx, terrain, rng, variant, frame);
  spriteCache.set(key, c);
  return c;
}

/**
 * Retourne le sprite de brouillard (case non explorée) Pixel HD.
 * NON UTILISÉ dans le rendu actuel du jeu.
 */
export function getPixelHDFogSprite(): HTMLCanvasElement {
  const key = "__fog";
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const c = document.createElement("canvas");
  c.width = SPR_W;
  c.height = SPR_H;
  const ctx = c.getContext("2d")!;
  const rng = mulberry32(0xf06);
  for (let y = 0; y < SPR_H; y++)
    for (let x = 0; x < SPR_W; x++)
      if (insideHex(x, y, 0.45)) px(ctx, x, y, rng() < 0.12 ? "#1c1a16" : "#100e0b");
  spriteCache.set(key, c);
  return c;
}

/**
 * Vide le cache de sprites en mémoire (utile pour libérer la mémoire ou forcer
 * une régénération, ex: changement de seed). Non appelé automatiquement.
 */
export function clearPixelHDCache(): void {
  spriteCache.clear();
}
