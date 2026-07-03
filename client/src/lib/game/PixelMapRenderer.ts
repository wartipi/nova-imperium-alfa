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
// Bloc P6 — Ajout des couches colonies/bâtiments (voir PixelColonyMarker et
// PixelBuildingMarker). Ces marqueurs ne viennent PAS de mapData (aucun champ
// cityId/buildingType réel côté client) mais de sources déjà chargées :
// useNovaImperium (cities) et UnifiedTerritorySystem (exploitationBuildingType).
// Rendu purement visuel, aucune logique de jeu, colonie ou construction
// modifiée ou dupliquée.
//
// Bloc P7 — Ajout de la couche ressources de tuile (`tile.resource`, champ déjà
// présent dans HexTile/PixelMapTile). La règle de découverte n'est PAS
// recalculée ici : elle est entièrement déléguée au callback
// `shouldShowTileResource` fourni par GameCanvas.tsx, qui réutilise
// exactement la même logique que GameEngine.ts (isAdminMode OU
// (explorationLevel>=1 ET usePlayer.isResourceDiscovered(x,y))). Sans ce
// callback, aucune ressource n'est jamais dessinée (sécurité anti-fuite).
// Couleurs réutilisées depuis ResourceRevealSystem (V2) et ResourceIcons.ts
// (legacy V1, ex. fish/iron/fur encore présents dans certaines tuiles
// persistées en base avant migration V2) — aucune nouvelle donnée inventée.
//
// Bloc P8 — Ajout de l'ownership visuel (voile intérieur + frontières entre
// owners différents). Aucune donnée nouvelle : tout provient de
// UnifiedTerritorySystem.getTerritory(x,y) déjà chargé côté GameCanvas.tsx
// (mêmes champs ownerType/ownerPlayerId/ownerFactionId que GameEngine.ts
// strategic). Ce module ne connaît PAS UnifiedTerritorySystem directement :
// GameCanvas.tsx fournit `getTileOwner`/`getOwnerColor`, réutilisant
// exactement les mêmes couleurs (bleu joueur / vert faction) et la même
// convention de voisins hex (colonnes décalées) que `drawTerritoryBorders`
// de GameEngine.ts. Sans callback fourni, rien n'est dessiné.
//
// Bloc P9 — Ajout de la couche unités. Aucune donnée nouvelle : les unités
// proviennent de useNovaImperium.getState().novaImperiums[].units (et
// .civilizations[].units), la même source EXACTE que GameEngine.renderCivilizations()
// / drawUnit() en mode strategic. Ce module ne connaît PAS useNovaImperium
// directement : GameCanvas.tsx construit la liste `units` (avec la couleur
// `ni.color`/`civ.color` déjà utilisée en strategic) et la transmet ici en
// lecture seule. Aucune règle de mouvement/combat/sélection n'est dupliquée :
// `selectedUnitId` ne sert qu'à dessiner un contour, jamais à changer un état.
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
import { ResourceRevealSystem } from "../systems/ResourceRevealSystem";
import { RESOURCE_ICONS } from "../shared/ResourceIcons";

// ─── Types publics ─────────────────────────────────────────────────────────

export interface PixelMapTile {
  x?: number;
  y?: number;
  terrain: string;
  resource?: string | null;
  discovered?: boolean;
  explored?: boolean;
  ownerId?: string | number | null;
  ownerType?: string | null;
  factionId?: string | number | null;
  cityId?: string | number | null;
  buildingType?: string | null;
  buildingId?: string | number | null;
}

// ─── Bloc P6 — Marqueurs colonies / bâtiments ──────────────────────────────
// Ces marqueurs ne sont PAS lus depuis mapData (HexTile n'a pas de cityId ni
// de buildingType côté client — vérifié en audit P6). Ils proviennent de
// sources déjà chargées ailleurs dans le jeu (mêmes données que le rendu
// strategic) et sont transmis séparément par l'appelant :
//   - colonies  : useNovaImperium.getState().novaImperiums[].cities (x, y locaux)
//   - buildings : UnifiedTerritorySystem.getAllTerritories() → exploitationBuildingType
// Coordonnées x/y en repère local (identique à mapData[y][x]).
export interface PixelColonyMarker {
  x: number;
  y: number;
  name?: string;
}

export interface PixelBuildingMarker {
  x: number;
  y: number;
  buildingType: string;
}

// ─── Bloc P9 — Marqueur unité ───────────────────────────────────────────────
// Champs volontairement souples (tous optionnels sauf id/x/y) : la structure
// exacte de `Unit` (client/src/lib/game/types.ts) ne comporte pas tous ces
// champs (pas d'ownerId/playerId/factionId/selected par ex., l'appartenance
// étant portée par le NovaImperium/civilization parent, pas par l'unité
// elle-même) — GameCanvas.tsx complète ce qui est disponible sans jamais
// inventer de valeur.
export interface PixelMapUnit {
  id: string | number;
  type?: string | null;
  name?: string | null;
  x: number;
  y: number;
  ownerId?: string | number | null;
  playerId?: string | number | null;
  factionId?: string | number | null;
  /** Couleur d'owner déjà utilisée en strategic (ni.color / civ.color) — évite de redériver une couleur. */
  color?: string | null;
  health?: number | null;
  maxHealth?: number | null;
  movement?: number | null;
  maxMovement?: number | null;
  selected?: boolean;
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
  // ─── Bloc P6 — Colonies / bâtiments ────────────────────────────────────
  colonies?: PixelColonyMarker[];
  buildings?: PixelBuildingMarker[];
  /** Défaut : true */
  showColonies?: boolean;
  /** Défaut : true (n'a d'effet que si `buildings` est fourni) */
  showBuildings?: boolean;
  // ─── Bloc P7 — Ressources de tuile ──────────────────────────────────────
  /** Défaut : true */
  showResources?: boolean;
  /**
   * Décide si la ressource d'une tuile doit être affichée. DOIT réutiliser la
   * logique de découverte existante (isAdminMode / getCompetenceLevel /
   * isResourceDiscovered côté usePlayer) — jamais recalculée ici. Si ce
   * callback n'est pas fourni, aucune ressource n'est dessinée (sécurité
   * anti-fuite, cf. règle P7 étape 2).
   */
  shouldShowTileResource?: (x: number, y: number, resource: string | null | undefined) => boolean;
  // ─── Bloc P8 — Ownership / frontières ──────────────────────────────────
  /** Défaut : true */
  showOwnership?: boolean;
  /** Défaut : true */
  showBorders?: boolean;
  /**
   * Retourne un identifiant d'owner stable pour la tuile (x,y), ou
   * null/undefined si non revendiquée. DOIT réutiliser une donnée déjà
   * chargée côté GameCanvas.tsx (UnifiedTerritorySystem) — jamais de
   * nouveau fetch ni de nouvelle logique d'ownership ici.
   */
  getTileOwner?: (x: number, y: number, tile: PixelMapTile) => string | number | null | undefined;
  /**
   * Retourne la couleur de base (overlay + bordure) pour un ownerId donné.
   * Si absent, un mapping déterministe local (hash → hsl) est utilisé.
   */
  getOwnerColor?: (ownerId: string | number | null | undefined) => string | null;
  /**
   * Indique si deux tuiles voisines partagent le même owner (permet de
   * réutiliser exactement la logique d'égalité ownerType/ownerPlayerId/
   * ownerFactionId de GameEngine.ts plutôt que de comparer seulement
   * getTileOwner, qui pourrait produire de faux-négatifs). Si absent,
   * repli sur une comparaison stricte des ownerId retournés par getTileOwner.
   */
  isSameOwner?: (
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ) => boolean;
  // ─── Bloc P9 — Unités ────────────────────────────────────────────────────
  units?: PixelMapUnit[];
  /** Défaut : true */
  showUnits?: boolean;
  selectedUnitId?: string | number | null;
  /**
   * Décide si une unité doit être affichée sur la tuile où elle se trouve.
   * DOIT réutiliser la logique de visibilité déjà existante côté
   * GameCanvas.tsx (isHexVisible / isAdmin) — jamais recalculée ici. Si
   * absent, seul `isHexVisible` (déjà transmis à renderPixelMap) fait foi.
   */
  shouldShowUnit?: (unit: PixelMapUnit) => boolean;
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

// Dessine un seul côté (segment) de l'hexagone — identique à
// GameEngine.drawHexSide (même convention d'angle 0=SE...5=NE).
function drawHexSidePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, hexSize: number, sideIndex: number): void {
  const angle1 = (sideIndex * Math.PI) / 3;
  const angle2 = ((sideIndex + 1) * Math.PI) / 3;
  const x1 = cx + hexSize * Math.cos(angle1);
  const y1 = cy + hexSize * Math.sin(angle1);
  const x2 = cx + hexSize * Math.cos(angle2);
  const y2 = cy + hexSize * Math.sin(angle2);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ─── Bloc P8 — Étape 4 : voisins hex, convention IDENTIQUE à
// GameEngine.drawTerritoryBorders (colonnes décalées, 0=SE...5=NE) ─────────
const HEX_NEIGHBOR_SIDES = (hexX: number) => [
  { dx: 1, dy: hexX % 2 === 0 ? 0 : 1 }, // 0 = SE
  { dx: 0, dy: 1 }, // 1 = S
  { dx: -1, dy: hexX % 2 === 0 ? 0 : 1 }, // 2 = SW
  { dx: -1, dy: hexX % 2 === 0 ? -1 : 0 }, // 3 = NW
  { dx: 0, dy: -1 }, // 4 = N
  { dx: 1, dy: hexX % 2 === 0 ? -1 : 0 }, // 5 = NE
];

// ─── Bloc P8 — Étape 8 : couleur déterministe de repli (si getOwnerColor
// n'est pas fourni par l'appelant) — hash simple, pas de Math.random. ──────
function hashOwnerIdToColor(ownerId: string | number): string {
  const str = String(ownerId);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

function resolveOwnerColor(
  ownerId: string | number,
  getOwnerColor: PixelMapRenderOptions["getOwnerColor"],
): string {
  if (getOwnerColor) {
    const custom = getOwnerColor(ownerId);
    if (custom) return custom;
  }
  return hashOwnerIdToColor(ownerId);
}

// ─── Bloc P8 — Étape 3 : voile intérieur discret (alpha faible) ───────────
function drawOwnershipOverlay(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hexSize: number,
  color: string,
): void {
  drawHexPath(ctx, sx, sy, hexSize);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ─── Bloc P8 — Étape 3/4 : frontières (segments entre owners différents) ──
function drawTileBorders(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
  hexSize: number,
  color: string,
  isSameOwnerFn: (nx: number, ny: number) => boolean,
): void {
  const sides = HEX_NEIGHBOR_SIDES(x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  for (let i = 0; i < 6; i++) {
    const side = sides[i];
    const nx = x + side.dx;
    const ny = y + side.dy;
    if (!isSameOwnerFn(nx, ny)) {
      drawHexSidePath(ctx, sx, sy, hexSize, i);
    }
  }
  ctx.restore();
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

// ─── Bloc P6 — Étape 3 : rendu simple d'une colonie ────────────────────────
// Symbole village médiéval minimal : base sombre + toit brun/ocre + contour
// clair + point discret. Pas d'emoji, pas d'image externe, pas de texte
// massif (aucun label de nom pour rester lisible même à zoom moyen).
function drawColonyMarker(ctx: CanvasRenderingContext2D, sx: number, sy: number, hexSize: number): void {
  const w = hexSize * 0.9;
  const h = hexSize * 0.7;
  const baseW = w * 0.55;
  const baseH = h * 0.4;
  const baseTop = sy - baseH * 0.1;

  // Base sombre
  ctx.fillStyle = "#2b2420";
  ctx.fillRect(sx - baseW / 2, baseTop, baseW, baseH);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(sx - baseW / 2, baseTop, baseW, baseH);

  // Toit brun/ocre
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, baseTop + 1);
  ctx.lineTo(sx + w / 2, baseTop + 1);
  ctx.lineTo(sx, sy - h * 0.55);
  ctx.closePath();
  ctx.fillStyle = "#8a5a2b";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 235, 200, 0.85)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Point discret (drapeau symbolique)
  ctx.beginPath();
  ctx.arc(sx, sy - h * 0.6, Math.max(1, hexSize * 0.05), 0, Math.PI * 2);
  ctx.fillStyle = "#e8b23a";
  ctx.fill();
}

// ─── Bloc P6 — Étape 4 : rendu simple d'un bâtiment (marqueur secondaire) ──
// Seul type de bâtiment réellement présent dans les données actuelles :
// `exploitation_post` (territoryService.ts — ALLOWED_BUILDING_TYPES).
// Rendu générique volontairement neutre pour ne pas inventer de sous-types
// (ferme/mine/port/marché) qui n'existent pas encore dans les données.
function drawBuildingMarker(ctx: CanvasRenderingContext2D, sx: number, sy: number, hexSize: number): void {
  const s = hexSize * 0.4;
  const top = sy + hexSize * 0.15;

  ctx.fillStyle = "#3a2f22";
  ctx.fillRect(sx - s / 2, top, s, s * 0.6);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(sx - s / 2, top, s, s * 0.6);

  ctx.beginPath();
  ctx.moveTo(sx - s / 2 - 1, top);
  ctx.lineTo(sx, top - s * 0.35);
  ctx.lineTo(sx + s / 2 + 1, top);
  ctx.strokeStyle = "#c98a3c";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ─── Bloc P7 — Étape 4 : couleur d'une ressource (V2 en priorité, legacy en repli) ──
// Réutilise exclusivement des données déjà centralisées ailleurs dans le jeu :
// ResourceRevealSystem (liste officielle V2) et RESOURCE_ICONS (legacy V1,
// ex. fish/iron/fur/gold encore présents sur certaines tuiles persistées avant
// la migration V2 — cf. replit.md "Resources V2 migration"). Aucune couleur
// inventée ici.
function getResourceVisualColor(resource: string): string {
  const v2Info = ResourceRevealSystem.getResourceDisplayInfo(resource as any);
  if (v2Info) return v2Info.color;
  const legacy = RESOURCE_ICONS[resource];
  if (legacy) return legacy.color;
  return "#9a9a9a";
}

// Ressources communes V2 avec une forme dédiée (recommandation spec P7 étape 5).
// Toutes les autres valeurs (rares/magiques V2 ou legacy V1 type fish/iron/fur)
// utilisent le marqueur générique (losange coloré via getResourceVisualColor).
const COMMON_RESOURCE_SHAPES = new Set([
  "food",
  "wood",
  "stone",
  "common_metals",
  "coal",
  "oil",
  "herbs",
  "leather_fur",
]);

// ─── Bloc P7 — Étape 5 : rendu d'une ressource de tuile ────────────────────
// Marqueur discret positionné au coin haut-droit de l'hex (ne recouvre pas le
// centre où sont dessinés colonie/bâtiment). Formes canvas simples, pas
// d'emoji, pas d'image externe, pas de texte.
function drawResourceMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hexSize: number,
  resource: string,
): void {
  const mx = sx + hexSize * 0.45;
  const my = sy - hexSize * 0.45;
  const s = Math.max(3, hexSize * 0.22);
  const color = getResourceVisualColor(resource);

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;

  switch (COMMON_RESOURCE_SHAPES.has(resource) ? resource : "generic") {
    case "food":
      ctx.beginPath();
      ctx.arc(mx, my, s * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#e8c93a";
      ctx.fill();
      ctx.stroke();
      break;
    case "wood":
      ctx.fillStyle = "#6b4423";
      ctx.fillRect(mx - s * 0.2, my - s * 0.5, s * 0.4, s);
      ctx.strokeRect(mx - s * 0.2, my - s * 0.5, s * 0.4, s);
      break;
    case "stone":
      ctx.beginPath();
      ctx.ellipse(mx, my, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8a8a86";
      ctx.fill();
      ctx.stroke();
      break;
    case "common_metals":
      ctx.fillStyle = "#b0b0b0";
      ctx.fillRect(mx - s * 0.5, my - s * 0.3, s, s * 0.6);
      ctx.strokeRect(mx - s * 0.5, my - s * 0.3, s, s * 0.6);
      break;
    case "coal":
      ctx.fillStyle = "#1c1c1c";
      ctx.fillRect(mx - s * 0.4, my - s * 0.4, s * 0.8, s * 0.8);
      ctx.strokeRect(mx - s * 0.4, my - s * 0.4, s * 0.8, s * 0.8);
      break;
    case "oil":
      ctx.beginPath();
      ctx.moveTo(mx, my - s * 0.55);
      ctx.quadraticCurveTo(mx + s * 0.5, my + s * 0.15, mx, my + s * 0.55);
      ctx.quadraticCurveTo(mx - s * 0.5, my + s * 0.15, mx, my - s * 0.55);
      ctx.closePath();
      ctx.fillStyle = "#241a12";
      ctx.fill();
      ctx.stroke();
      break;
    case "herbs":
      ctx.beginPath();
      ctx.ellipse(mx, my, s * 0.55, s * 0.3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "#3f9142";
      ctx.fill();
      ctx.stroke();
      break;
    case "leather_fur":
      ctx.beginPath();
      ctx.ellipse(mx, my, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8a5a34";
      ctx.fill();
      ctx.stroke();
      break;
    default:
      // Générique : rares/magiques V2 et legacy V1 (fish/iron/fur/gold/etc.)
      ctx.beginPath();
      ctx.moveTo(mx, my - s * 0.55);
      ctx.lineTo(mx + s * 0.55, my);
      ctx.lineTo(mx, my + s * 0.55);
      ctx.lineTo(mx - s * 0.55, my);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.restore();
}

// ─── Bloc P9 — Étape 3 : forme selon type d'unité ──────────────────────────
// worker/settler/civilian → petit losange clair. soldier/military → petit
// bouclier. scout → petit triangle. Type inconnu → pion rond (fallback).
// Pas d'emoji, pas d'image externe — formes canvas simples uniquement.
const WORKER_LIKE_TYPES = new Set(["worker", "settler", "civilian", "diplomat"]);
const SOLDIER_LIKE_TYPES = new Set([
  "warrior",
  "spearman",
  "swordsman",
  "archer",
  "crossbowman",
  "catapult",
  "trebuchet",
  "horseman",
  "knight",
  "galley",
  "warship",
  "soldier",
  "military",
]);
const SCOUT_LIKE_TYPES = new Set(["scout", "spy"]);

function drawUnitMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hexSize: number,
  type: string | null | undefined,
  color: string,
  isSelected: boolean,
): void {
  const s = Math.max(4, hexSize * 0.32);
  const normalizedType = (type || "").toLowerCase();

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1.5;
  ctx.fillStyle = color;

  if (WORKER_LIKE_TYPES.has(normalizedType)) {
    // Petit losange clair
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s * 0.75, sy);
    ctx.lineTo(sx, sy + s);
    ctx.lineTo(sx - s * 0.75, sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (SOLDIER_LIKE_TYPES.has(normalizedType)) {
    // Petit bouclier
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.65, sy - s * 0.7);
    ctx.lineTo(sx + s * 0.65, sy - s * 0.7);
    ctx.lineTo(sx + s * 0.65, sy + s * 0.15);
    ctx.quadraticCurveTo(sx + s * 0.65, sy + s, sx, sy + s * 1.05);
    ctx.quadraticCurveTo(sx - s * 0.65, sy + s, sx - s * 0.65, sy + s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (SCOUT_LIKE_TYPES.has(normalizedType)) {
    // Petit triangle
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s * 0.85, sy + s * 0.75);
    ctx.lineTo(sx - s * 0.85, sy + s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Fallback : pion rond
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  if (isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, s * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "#e8b23a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
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
    colonies,
    buildings,
    showColonies,
    showBuildings,
    showResources,
    shouldShowTileResource,
    showOwnership,
    showBorders,
    getTileOwner,
    getOwnerColor,
    isSameOwner,
    units,
    showUnits,
    selectedUnitId,
    shouldShowUnit,
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

      // ─── Bloc P8 — Étape 3 : voile ownership intérieur (tuile visible uniquement) ──
      // Le fog total a déjà fait `continue` plus haut : cette ligne ne peut
      // jamais s'exécuter sur une tuile masquée — aucun owner caché ne fuite.
      if (showOwnership !== false && getTileOwner) {
        const ownerId = getTileOwner(x, y, tile);
        if (ownerId !== null && ownerId !== undefined) {
          const color = resolveOwnerColor(ownerId, getOwnerColor);
          drawOwnershipOverlay(ctx, sx, sy, hexSize, color);
        }
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

  // ─── Bloc P8 — Étape 3/4 : frontières ownership (après grille, avant ressources) ──
  // Une frontière n'est tracée que si la tuile A (visible) a un owner et que
  // le voisin B est soit absent, soit d'un owner différent. Le fog total du
  // voisin n'est PAS interrogé pour son identité — seule la présence/absence
  // d'un owner différent compte, jamais son détail (cf. étape 4 de la spec :
  // "ne pas exposer l'identité du voisin caché", ce qui est garanti ici car
  // isSameOwnerFn ne renvoie qu'un booléen, jamais l'ownerId du voisin).
  if (showBorders !== false && getTileOwner) {
    for (let y = y0; y <= y1; y++) {
      const row = mapData[y];
      if (!row) continue;
      for (let x = x0; x <= x1; x++) {
        const tile = row[x];
        if (!tile) continue;
        if (isHexVisible && !isHexVisible(x, y)) continue;
        const ownerId = getTileOwner(x, y, tile);
        if (ownerId === null || ownerId === undefined) continue;

        const isSameOwnerFn = (nx: number, ny: number): boolean => {
          if (isSameOwner) return isSameOwner(x, y, nx, ny);
          const neighborRow = mapData[ny];
          const neighborTile = neighborRow ? neighborRow[nx] : undefined;
          if (!neighborTile) return false;
          const neighborOwnerId = getTileOwner(nx, ny, neighborTile);
          if (neighborOwnerId === null || neighborOwnerId === undefined) return false;
          return neighborOwnerId === ownerId;
        };

        const color = resolveOwnerColor(ownerId, getOwnerColor);
        const { sx, sy } = hexToScreen(x, y, hexSize, cameraX, cameraY);
        drawTileBorders(ctx, x, y, sx, sy, hexSize, color, isSameOwnerFn);
      }
    }
  }

  // ─── Bloc P7 — Étape 6 : couche ressources de tuile (après grille, avant colonies) ──
  // Double garde : fog total (isHexVisible) ET règle de découverte de la
  // ressource (shouldShowTileResource). Sans callback fourni, rien n'est
  // dessiné — jamais de fuite d'information par défaut.
  if (showResources !== false && shouldShowTileResource) {
    for (let y = y0; y <= y1; y++) {
      const row = mapData[y];
      if (!row) continue;
      for (let x = x0; x <= x1; x++) {
        const tile = row[x];
        if (!tile || !tile.resource) continue;
        if (isHexVisible && !isHexVisible(x, y)) continue;
        if (!shouldShowTileResource(x, y, tile.resource)) continue;
        const { sx, sy } = hexToScreen(x, y, hexSize, cameraX, cameraY);
        drawResourceMarker(ctx, sx, sy, hexSize, tile.resource);
      }
    }
  }

  // ─── Bloc P6 — Étape 6 : couche colonies (après grille, avant sélection) ──
  // Une colonie n'est jamais dessinée sur une case en fog total (isHexVisible
  // false) — cohérent avec l'étape 3 du bloc P6 et le fog déjà appliqué plus
  // haut sur le terrain.
  if (showColonies !== false && colonies && colonies.length > 0) {
    for (const colony of colonies) {
      if (isHexVisible && !isHexVisible(colony.x, colony.y)) continue;
      const { sx, sy } = hexToScreen(colony.x, colony.y, hexSize, cameraX, cameraY);
      drawColonyMarker(ctx, sx, sy, hexSize);
    }
  }

  // ─── Bloc P6 — Étape 6 : couche bâtiments (après colonies, avant sélection) ─
  if (showBuildings !== false && buildings && buildings.length > 0) {
    for (const building of buildings) {
      if (isHexVisible && !isHexVisible(building.x, building.y)) continue;
      const { sx, sy } = hexToScreen(building.x, building.y, hexSize, cameraX, cameraY);
      drawBuildingMarker(ctx, sx, sy, hexSize);
    }
  }

  // ─── Bloc P9 — Étape 3/4/5 : couche unités (après bâtiments, avant sélection) ──
  // Une unité n'est jamais dessinée sur une case en fog total (isHexVisible
  // false) — même garde que colonies/bâtiments. `shouldShowUnit`, si fourni,
  // s'ajoute à cette garde (jamais à sa place) pour permettre à l'appelant de
  // réutiliser une règle de visibilité déjà existante côté GameCanvas.tsx.
  if (showUnits !== false && units && units.length > 0) {
    // Regroupement par tuile pour un léger offset déterministe (stacking) —
    // aucune logique de stacking de jeu n'est modifiée, purement visuel.
    const unitsByTile = new Map<string, PixelMapUnit[]>();
    for (const unit of units) {
      const key = `${unit.x},${unit.y}`;
      const list = unitsByTile.get(key);
      if (list) list.push(unit);
      else unitsByTile.set(key, [unit]);
    }

    for (const tileUnits of Array.from(unitsByTile.values())) {
      const first = tileUnits[0];
      if (isHexVisible && !isHexVisible(first.x, first.y)) continue;

      for (let i = 0; i < tileUnits.length; i++) {
        const unit = tileUnits[i];
        if (shouldShowUnit && !shouldShowUnit(unit)) continue;

        const { sx, sy } = hexToScreen(unit.x, unit.y, hexSize, cameraX, cameraY);
        // Offset déterministe par index (petit cercle autour du centre) si
        // plusieurs unités partagent la même case — pas de Math.random().
        const offsetRadius = i === 0 ? 0 : hexSize * 0.22;
        const angle = (i * (Math.PI * 2)) / Math.max(1, tileUnits.length);
        const ox = sx + Math.cos(angle) * offsetRadius;
        const oy = sy + Math.sin(angle) * offsetRadius;

        const color = unit.color || resolveOwnerColor(unit.ownerId ?? unit.playerId ?? unit.factionId ?? unit.id, getOwnerColor);
        const isSelected = unit.selected === true || (selectedUnitId != null && selectedUnitId === unit.id);
        drawUnitMarker(ctx, ox, oy, hexSize, unit.type, color, isSelected);
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
