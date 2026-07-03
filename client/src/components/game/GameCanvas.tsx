import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useMap } from "../../lib/stores/useMap";
import { useGameState } from "../../lib/stores/useGameState";
import { useAuth } from "../../lib/auth/AuthContext";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { GameEngine } from "../../lib/game/GameEngine";
import { useGameEngine } from "../../lib/contexts/GameEngineContext";
import { AvatarActionMenu } from "./AvatarActionMenu";
import { MovementConfirmationModal } from "./MovementConfirmationModal";
import { TileContextMenu } from "./TileContextMenu";
import { MovementSystem } from "../../lib/movement/MovementSystem";
import type { PathfindingResult } from "../../lib/pathfinding/HexPathfinding";
import { getTerrainMovementCost } from "../../lib/game/TerrainCosts";
import { CameraControls } from "./CameraControls";
import { UnifiedTerritorySystem } from "../../lib/systems/UnifiedTerritorySystem";
import { requestMove, fetchCurrentAction } from "../../lib/api/playerActionsApi";
import { fetchPlayerPosition } from "../../lib/api/playerApi";
import { fetchAllTerritories, fetchAllColonies } from "../../lib/api/territoriesApi";
import { usePlayerActions } from "../../lib/stores/usePlayerActions";
import { usePlayerPresence } from "../../lib/stores/usePlayerPresence";

// Improved imports - custom hooks and constants
import { useGameEngineAccess } from "../../lib/hooks/useGameEngineAccess";
import { useDoubleClick } from "../../lib/hooks/useDoubleClick";
import { useAvatarMovement } from "../../lib/hooks/useAvatarMovement";
import { TerrainHelpers } from "../../lib/constants/TerrainTypes";
import { VisionSystem } from "../../lib/systems/VisionSystem";
import { renderPixelMap } from "../../lib/game/PixelMapRenderer";

// ─── Bloc P4-B (NI-10.09) — Modes de carte : strategic / immersive ─────────
// Une seule carte logique (mêmes tuiles, mêmes coordonnées, même état de jeu).
// "strategic" (défaut) = renderer actuel. "immersive" = overlay Pixel HD.
// Persisté en localStorage. Raccourci clavier "M" pour alterner (ancien "P" P4
// conservé comme alias debug). Ne remplace jamais durablement le renderer actuel :
// fallback try/catch strict — en cas d'erreur, on reste en mode strategic.
type MapRenderMode = "strategic" | "immersive";
const MAP_RENDER_MODE_STORAGE_KEY = "nova_map_render_mode";
// Ancienne clé P4 — conservée uniquement pour migration douce (lue une seule fois).
const LEGACY_PIXEL_HD_STORAGE_KEY = "nova_pixel_hd_renderer";

function readMapRenderMode(): MapRenderMode {
  try {
    const current = localStorage.getItem(MAP_RENDER_MODE_STORAGE_KEY);
    if (current === "strategic" || current === "immersive") {
      return current;
    }
    // Migration douce : si l'ancien toggle P4 était activé, on démarre en immersive.
    const legacy = localStorage.getItem(LEGACY_PIXEL_HD_STORAGE_KEY);
    if (legacy === "on") {
      localStorage.setItem(MAP_RENDER_MODE_STORAGE_KEY, "immersive");
      return "immersive";
    }
    return "strategic";
  } catch {
    return "strategic";
  }
}

function writeMapRenderMode(mode: MapRenderMode): void {
  try {
    localStorage.setItem(MAP_RENDER_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage indisponible — pas bloquant, le mode reste en mémoire seulement
  }
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameEngineRef } = useGameEngine();
  const { mapData, selectedHex, setSelectedHex, originWorldX, originWorldY } = useMap();
  const { gamePhase } = useGameState();
  const { isAdmin, adminModeEnabled, isAuthenticated } = useAuth();
  const { novaImperiums, selectedUnit, moveUnit } = useNovaImperium();
  const { avatarPosition, avatarHexPosition, travelVisualHexPosition, setTravelVisualHexPosition, clearTravelVisualHexPosition, avatarRotation, isMoving, selectedCharacter, moveAvatarToHex, isHexVisible, isHexInCurrentVision, isHexInFogRing, pendingMovement, setPendingMovement } = usePlayer();
  const { activeAction } = usePlayerActions();

  // ─── Source unifiée du trajet à afficher sur la carte + prop modale ─────────
  // pendingPathResult : PathfindingResult complet pour la modale (calculé une seule fois ici)
  // previewPathHexes : tuiles intermédiaires dérivées pour le rendu carte
  // Priorité 1 : pendingMovement → preview pathfinder avant confirmation
  // Priorité 2 : activeAction move in_progress → trajet restant côté serveur
  // Priorité 3 : rien
  const [pendingPathResult, setPendingPathResult] = useState<PathfindingResult | null>(null);
  const [previewPathHexes, setPreviewPathHexes] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    // Priorité 1 — preview avant confirmation (source unique pour carte ET modale)
    if (pendingMovement && mapData) {
      const result = MovementSystem.previewMovement(pendingMovement.x, pendingMovement.y, mapData);
      setPendingPathResult(result);
      if (result.success && result.path.length > 2) {
        setPreviewPathHexes(result.path.slice(1, result.path.length - 1).map(h => ({ x: h.x, y: h.y })));
      } else {
        setPreviewPathHexes([]);
      }
      return;
    }
    // Pas de pendingMovement → pas de résultat pour la modale
    setPendingPathResult(null);
    // Priorité 2 — action move in_progress : trajet restant depuis activeAction.path
    if (activeAction && activeAction.type === 'move' && activeAction.status === 'in_progress' && activeAction.path.length > 1) {
      const remaining = activeAction.path.slice(activeAction.effectiveStep + 1, activeAction.path.length - 1);
      setPreviewPathHexes(remaining.map(step => ({
        x: step.worldX - originWorldX,
        y: step.worldY - originWorldY,
      })));
      return;
    }
    // Priorité 3 — aucun trajet
    setPreviewPathHexes([]);
  }, [pendingMovement, mapData, activeAction, originWorldX, originWorldY]);

  // ─── Refs pour sync finale de position (résistants au cleanup de l'effet de polling) ──
  // finalSyncTimerRef : stocke le setTimeout de sync finale — ne doit PAS être annulé
  //   par le cleanup de l'effet de polling quand activeAction devient null.
  // finalSyncedRef : flag "sync finale déjà effectuée" — partagé entre pollServer et endTimer.
  const finalSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalSyncedRef    = useRef(false);

  // Nettoyage uniquement au démontage du composant
  useEffect(() => {
    return () => {
      if (finalSyncTimerRef.current !== null) clearTimeout(finalSyncTimerRef.current);
    };
  }, []);

  // State management - reduced manual state
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ x: 0, y: 0 });

  // ─── Bloc P4-B (NI-10.09) — État du mode de carte (strategic/immersive) ───
  const [mapRenderMode, setMapRenderMode] = useState<MapRenderMode>(() => readMapRenderMode());
  // failureRef évite de renvoyer un log console à chaque frame en cas d'échec répété.
  const pixelHDFailLoggedRef = useRef(false);

  const toggleMapRenderMode = useCallback(() => {
    setMapRenderMode((prev) => {
      const next: MapRenderMode = prev === "strategic" ? "immersive" : "strategic";
      writeMapRenderMode(next);
      pixelHDFailLoggedRef.current = false;
      console.log(`[MapRenderMode] Map render mode: ${next}`);
      gameEngineRef.current?.render();
      return next;
    });
  }, [gameEngineRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si focus dans un champ texte (évite les collisions avec la saisie)
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }
      // "M" = raccourci officiel. "P" conservé comme alias debug hérité de P4.
      if (e.key === "m" || e.key === "M" || e.key === "p" || e.key === "P") {
        toggleMapRenderMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMapRenderMode]);

  // ─── Bloc P4-B — Overlay Pixel HD (mode immersive) après le rendu actuel ──
  // Appelé après chaque gameEngineRef.current.render(). N'affecte jamais
  // la carte réelle (mapData), ni le renderer actuel : purement un overlay
  // canvas optionnel, encadré par try/catch. En cas d'erreur, on reste
  // visuellement en mode strategic (le rendu actuel déjà dessiné persiste).
  //
  // Bloc P5 — Audit géométrie confirmé : effectiveHexSize/effectiveCameraX/Y
  // ci-dessous reproduisent exactement la transformation caméra appliquée par
  // GameEngine.render() (ctx.translate(centre) → scale(zoom) → translate(-camera)),
  // vérifié par calcul algébrique. Aucun double-zoom, aucune divergence avec
  // le rendu strategic sous-jacent.
  const renderPixelHDOverlay = useCallback(() => {
    if (mapRenderMode !== "immersive") return;
    const engine = gameEngineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas || !mapData) return;

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x: cameraX, y: cameraY } = engine.getCameraPosition();
      const zoom = engine.getZoom();
      const hexSize = engine.getHexSize();
      const effectiveHexSize = hexSize * zoom;
      const effectiveCameraX = cameraX * zoom - canvas.width / 2;
      const effectiveCameraY = cameraY * zoom - canvas.height / 2;

      // Bloc P6 — Colonies : même source que le rendu strategic (GameEngine.renderCivilizations()),
      // aucune nouvelle donnée ni appel API. Coordonnées locales identiques à mapData[y][x].
      const colonies = useNovaImperium
        .getState()
        .novaImperiums.flatMap((ni) =>
          ni.cities.map((city) => ({ x: city.x, y: city.y, name: city.displayName || city.name })),
        );

      // Bloc P6 — Bâtiments : seule donnée bâtiment déjà positionnée par tuile et déjà chargée
      // côté client (UnifiedTerritorySystem, alimenté par loadFromServer() — aucun fetch ajouté).
      const buildings = UnifiedTerritorySystem.getAllTerritories()
        .filter((t) => t.exploitationBuildingType != null)
        .map((t) => ({ x: t.x, y: t.y, buildingType: t.exploitationBuildingType as string }));

      // Bloc P7 — Ressources de tuile : réutilise EXACTEMENT la même règle de découverte
      // que GameEngine.ts (drawHex) : isAdmin OU (explorationLevel>=1 ET ressource découverte).
      // Aucune nouvelle logique, aucun nouveau fetch — lecture directe de usePlayer.getState().
      const shouldShowTileResource = (
        x: number,
        y: number,
        resource: string | null | undefined,
      ): boolean => {
        if (!resource) return false;
        const playerState = usePlayer.getState();
        const explorationLevel = playerState.getCompetenceLevel("exploration") || 0;
        const hexResourceDiscovered = playerState.isResourceDiscovered?.(x, y) || false;
        return isAdmin || (explorationLevel >= 1 && hexResourceDiscovered);
      };

      renderPixelMap({
        ctx,
        mapData,
        width: canvas.width,
        height: canvas.height,
        cameraX: effectiveCameraX,
        cameraY: effectiveCameraY,
        hexSize: effectiveHexSize,
        showGrid: false,
        selected: selectedHex ? { x: selectedHex.x, y: selectedHex.y } : null,
        // hovered : non disponible sans modifier lourdement GameEngine (limite connue documentée depuis P4)
        hovered: null,
        isHexVisible: isHexVisible ?? undefined,
        isHexInFogRing: isHexInFogRing ?? undefined,
        colonies,
        buildings,
        showResources: true,
        shouldShowTileResource,
      });
      pixelHDFailLoggedRef.current = false;
    } catch (err) {
      if (!pixelHDFailLoggedRef.current) {
        console.error("[MapRenderMode] Immersive renderer failed, falling back to strategic view", err);
        pixelHDFailLoggedRef.current = true;
      }
      // Pas de re-throw : le rendu strategic (déjà dessiné par engine.render()) reste affiché.
    }
  }, [mapRenderMode, gameEngineRef, mapData, selectedHex, isHexVisible, isHexInFogRing, isAdmin]);

  // ─── Menu contextuel de case (clic droit) ─────────────────────────────────
  const [tileContextMenu, setTileContextMenu] = useState<{
    screenX:      number;
    screenY:      number;
    hexX:         number;
    hexY:         number;
    locationName: string | null;
    canMove:      boolean;  // "Se déplacer ici" visible si true
  } | null>(null);

  // Custom hooks for improved architecture  
  const { renderEngine, updateEngineStores } = useGameEngineAccess();

  // ─── Double clic gauche → pendingMovement ──────────────────────────────────
  // lastClickedHexRef : conserve l'objet hex (avec terrain) du dernier clic
  // pour que onDoubleClick puisse lire terrain sans recalcul.
  const lastClickedHexRef = useRef<{ x: number; y: number; terrain: string } | null>(null);

  const { handleClick: detectDoubleClick } = useDoubleClick({
    onDoubleClick: ({ x, y }) => {
      const hex = lastClickedHexRef.current;
      if (!hex || hex.x !== x || hex.y !== y) return;

      // Garde 1 : pas d'unité sélectionnée (son flux est distinct)
      const { selectedUnit: su } = useNovaImperium.getState();
      if (su) return;

      // Garde 2 : pas d'action active en cours
      const { activeAction: aa } = usePlayerActions.getState();
      if (aa) return;

      // Garde 3 : terrain walkable
      if (!TerrainHelpers.isWalkable(hex.terrain)) return;

      // Garde 4 : case accessible (explorée ou admin)
      const { isHexExplored: checkExplored, avatarHexPosition: currentHex } = usePlayer.getState();
      if (!checkExplored(x, y) && !isAdmin) return;

      // Garde 5 : case ≠ position actuelle
      if (x === currentHex.x && y === currentHex.y) return;

      setPendingMovement({ x, y });
    },
  });

  // REFACTORISATION : Initialize game engine avec injection des stores
  useEffect(() => {
    if (canvasRef.current && mapData) {
      // Création des callbacks pour l'injection des stores
      const getGameState = () => useGameState.getState();
      const getPlayerState = () => usePlayer.getState();
      
      gameEngineRef.current = new GameEngine(
        canvasRef.current, 
        mapData, 
        getGameState, 
        getPlayerState
      );
      
      // Rendu initial SANS callbacks vision : les callbacks vides rendraient tout en noir
      // pour les joueurs non-admin (exploredHexes encore vide à ce stade).
      // Le fallback dans renderMap (isHexVisible === null → true) affiche tout normalement.
      // Les callbacks sont appliqués après le chargement des tuiles découvertes ci-dessous.
      gameEngineRef.current.render();
      renderPixelHDOverlay();

      // Phase 6 + vision villes : hydratation villes et tuiles découvertes en parallèle.
      // Vision avatar + villes + ressources découvertes appliquées ensuite dans l'ordre.
      const engine = gameEngineRef.current;
      const { isHexVisible, isHexInCurrentVision, isHexInFogRing, loadDiscoveredTiles } = usePlayer.getState();
      Promise.all([
        useNovaImperium.getState().hydrateCitiesFromServer(),
        loadDiscoveredTiles(),
      ]).then(() => {
        // Reconstruire les ressources découvertes depuis exploredHexes + mapData
        usePlayer.getState().reconstructResourcesDiscovered();
        // Vision passive des villes owned (rayon 2) → fusionnée dans exploredHexes
        const cities = useNovaImperium.getState().currentNovaImperium?.cities ?? [];
        usePlayer.getState().addCityVision(cities.map(c => ({ x: c.x, y: c.y })));
        // Vision active de l'avatar
        usePlayer.getState().updateVision();
        // Enregistrer les callbacks et forcer un rendu final
        engine?.setVisionCallbacks(isHexVisible, isHexInCurrentVision, isHexInFogRing);
        engine?.render();
        renderPixelHDOverlay();
      });
    }
  }, [mapData]);

  // Inject admin mode into GameEngine when isAdmin changes
  useEffect(() => {
    if (!gameEngineRef.current) return;
    gameEngineRef.current.setAdminMode(isAdmin);
    renderEngine();
    renderPixelHDOverlay();
  }, [isAdmin, gameEngineRef, renderEngine, renderPixelHDOverlay]);

  // IMPROVED: Memoized mouse down handler
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Only handle mouse events if they're actually on the canvas (not on HUD elements)
    if (event.target === canvasRef.current) {
      setMouseDownPos({ x: event.clientX, y: event.clientY });
    }
  }, []);

  // ─── Clic droit — menu contextuel de case ─────────────────────────────────
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    if (event.target !== canvasRef.current) return;
    event.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !gameEngineRef.current) return;

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // ── Clic droit sur l'avatar → ouvrir AvatarActionMenu ────────────────────
    if (gameEngineRef.current.isClickOnAvatar(canvasX, canvasY)) {
      setTileContextMenu(null);
      const avatarScreenPos = gameEngineRef.current.getAvatarScreenPosition();
      setAvatarMenuPosition(avatarScreenPos);
      setShowAvatarMenu(true);
      return;
    }

    // Fermer d'éventuels menus déjà ouverts
    setShowAvatarMenu(false);
    setTileContextMenu(null);

    const hex = gameEngineRef.current.getHexAtPosition(canvasX, canvasY);
    if (!hex) return;

    const { isHexExplored: isHexExploredCtx } = usePlayer.getState();
    const isAccessibleCtx = isHexExploredCtx(hex.x, hex.y) || isAdmin;

    // ── Clic droit → TileContextMenu ─────────────────────────────────────────
    const { avatarHexPosition: currentHex } = usePlayer.getState();
    const canMove =
      isAccessibleCtx &&
      TerrainHelpers.isWalkable(hex.terrain) &&
      !(hex.x === currentHex.x && hex.y === currentHex.y);

    // Nom de la ville sur cette case (si présente)
    const { novaImperiums: nis } = useNovaImperium.getState();
    const cityAtHex = nis.flatMap((ni) => ni.cities).find((c) => c.x === hex.x && c.y === hex.y);
    const locationName = cityAtHex?.name ?? null;

    setTileContextMenu({
      screenX:      event.clientX,
      screenY:      event.clientY,
      hexX:         hex.x,
      hexY:         hex.y,
      locationName,
      canMove,
    });
    console.log(`[GameCanvas] Clic droit → TileContextMenu hex(${hex.x},${hex.y}) canMove=${canMove}`);
  }, [gameEngineRef, isAdmin, setSelectedHex]);

  // Handle canvas clicks (only if not dragging)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!gameEngineRef.current || !mouseDownPos) return;
    
    // Only handle clicks if they're actually on the canvas (not on HUD elements)
    if (event.target !== canvasRef.current) return;

    // Fermer le menu contextuel de case si ouvert
    setTileContextMenu(null);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Check if this was a drag or a click
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - mouseDownPos.x, 2) + 
      Math.pow(event.clientY - mouseDownPos.y, 2)
    );

    // Only handle as click if mouse didn't move much
    if (dragDistance < 5) {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const hex = gameEngineRef.current.getHexAtPosition(x, y);
      if (hex) {
        // Stocker le hex pour onDoubleClick (terrain inclus)
        lastClickedHexRef.current = { x: hex.x, y: hex.y, terrain: hex.terrain };

        // Déplacement d'unité sélectionnée (flux distinct du déplacement avatar)
        if (selectedUnit && (hex.x !== selectedUnit.x || hex.y !== selectedUnit.y)) {
          if (TerrainHelpers.isWalkable(hex.terrain)) {
            moveUnit(selectedUnit.id, hex.x, hex.y);
          } else {
            console.log('Cannot move unit to water terrain:', hex.terrain);
          }
        }

        // Double clic gauche → déclenche pendingMovement si walkable (via useDoubleClick)
        detectDoubleClick({ x: hex.x, y: hex.y });
      }
    }
    
    setMouseDownPos(null);
  }, [selectedUnit, moveUnit, mouseDownPos, detectDoubleClick, isAdmin]);

  // Update rendering when game state changes
  useEffect(() => {
    if (gameEngineRef.current) {
      // Update vision callbacks with latest state
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision, isHexInFogRing);

      // Position visuelle : travelVisualHexPosition pendant le trajet, avatarPosition sinon
      let visualAvatarPosition = avatarPosition;
      if (travelVisualHexPosition !== null) {
        const wc = VisionSystem.hexToWorld(travelVisualHexPosition.x, travelVisualHexPosition.y);
        visualAvatarPosition = { x: wc.x, y: 0, z: wc.z };
      }

      // Destination visuelle : pendingMovement en priorité, sinon destination de l'action active
      const visualPendingMovement = pendingMovement
        ?? (activeAction?.type === 'move' && activeAction.status === 'in_progress'
          ? { x: activeAction.endWorldX - originWorldX, y: activeAction.endWorldY - originWorldY }
          : null);

      gameEngineRef.current.updateCivilizations(novaImperiums);
      gameEngineRef.current.setSelectedHex(selectedHex);
      gameEngineRef.current.updateAvatar(visualAvatarPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, visualPendingMovement, previewPathHexes, isHexInFogRing);
      gameEngineRef.current.render();
      renderPixelHDOverlay();
      
      // Plus de centrage automatique - caméra libre
    }
  }, [novaImperiums, selectedHex, avatarPosition, travelVisualHexPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, isHexInFogRing, pendingMovement, previewPathHexes, activeAction, originWorldX, originWorldY, renderPixelHDOverlay]);

  // Phase 5 — polling présence multijoueur
  // Dépendance unique : isAuthenticated — l'intervalle n'est pas recréé à chaque rendu
  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = async () => {
      const { loadPlayers } = usePlayerPresence.getState();
      await loadPlayers();
      const { players } = usePlayerPresence.getState();
      if (!gameEngineRef.current) return;
      const { originWorldX, originWorldY } = useMap.getState();
      const converted = players.map((p) => ({
        userId: p.userId,
        username: p.username,
        hexX: p.worldX - originWorldX,
        hexY: p.worldY - originWorldY,
      }));
      gameEngineRef.current.updateOtherPlayers(converted);
      gameEngineRef.current.render();
      renderPixelHDOverlay();
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, renderPixelHDOverlay]);

  // R2 — polling territoire automatique : synchronise claims / fondations / exploitations entre clients
  // Fréquence : 10s — indépendant du panneau territoire (toujours actif)
  // Dépendance unique : isAuthenticated — l'intervalle n'est pas recréé à chaque rendu
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollTerritories = async () => {
      try {
        const [territories, colonies] = await Promise.all([
          fetchAllTerritories(),
          fetchAllColonies(),
        ]);
        const { originWorldX, originWorldY } = useMap.getState();
        UnifiedTerritorySystem.loadFromServer(territories, colonies, originWorldX, originWorldY);
        gameEngineRef.current?.render();
        renderPixelHDOverlay();
      } catch {
        // Échec silencieux — pas de crash si réseau indisponible
      }
    };

    pollTerritories();
    const territoryInterval = setInterval(pollTerritories, 10000);
    return () => clearInterval(territoryInterval);
  }, [isAuthenticated, renderPixelHDOverlay]);

  // Hydratation au montage — reprend une action déjà en cours si rechargement de page
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCurrentAction().then(({ action }) => {
      if (action?.status === "in_progress" && !usePlayerActions.getState().isActionActive()) {
        usePlayerActions.getState().setActiveAction(action);
        console.log(`[GameCanvas] Action reprise au montage: id=${action.id} type=${action.type} msRemaining=${action.msRemaining}`);
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  // Phase 4 — Déplacement serveur-authoritative : le step confirmé est l'unique moteur.
  // Option A : travelVisualHexPosition non utilisé — avatarPosition / moveAvatarToHex pilotent tout.
  // Aucun calcul local depuis elapsedMs ne peut décider d'un changement de case.
  useEffect(() => {
    if (!activeAction || activeAction.type !== "move" || activeAction.status !== "in_progress") return;
    if (!activeAction.path || activeAction.path.length < 2) return;

    // Nouvelle action : réinitialiser le flag et annuler tout timer résiduel d'une action précédente.
    finalSyncedRef.current = false;
    if (finalSyncTimerRef.current !== null) {
      clearTimeout(finalSyncTimerRef.current);
      finalSyncTimerRef.current = null;
    }

    let lastServerStep = activeAction.effectiveStep ?? 0;

    // Option A : travelVisualHexPosition = null → rendu utilise avatarPosition directement.
    clearTravelVisualHexPosition();

    // ─── Sync finale authoritative ─────────────────────────────────────────────
    // Stockée dans un ref de composant (finalSyncTimerRef) pour survivre au cleanup
    // de l'effet de polling. Si ActiveActionWidget appelle setActiveAction(null),
    // le cleanup annule pollInterval mais pas ce timer — la sync finale a lieu quand même.
    const doFinalSync = async () => {
      if (finalSyncedRef.current) return;
      try {
        // 1. Vérifier que l'action est réellement terminée côté serveur.
        //    Le timer peut se déclencher avant que le serveur ait appliqué le dernier step.
        const { action } = await fetchCurrentAction();
        if (action && action.status === "in_progress") {
          // Pas encore finalisée — replanifier dans 500ms sans activer le verrou
          finalSyncTimerRef.current = setTimeout(doFinalSync, 500);
          return;
        }
        // 2. Action null ou completed → position finale disponible côté serveur
        finalSyncedRef.current = true;
        const serverPos = await fetchPlayerPosition();
        const { originWorldX: ox, originWorldY: oy } = useMap.getState();
        moveAvatarToHex(serverPos.worldX - ox, serverPos.worldY - oy);
        console.log(`[GameCanvas] Sync finale → world=(${serverPos.worldX},${serverPos.worldY})`);
      } catch (_e) { /* non bloquant */ }
    };

    // Seul moteur du passage d'une case à l'autre.
    const pollServer = async () => {
      try {
        const { action } = await fetchCurrentAction();

        if (!action || action.status === "completed" || action.status === "cancelled") {
          // Action terminée — déléguer à doFinalSync (idempotent via finalSyncedRef)
          doFinalSync();
          return;
        }

        if (action.status === "in_progress") {
          const serverStep = action.effectiveStep ?? 0;
          if (serverStep > lastServerStep) {
            lastServerStep = serverStep;
            const { originWorldX, originWorldY } = useMap.getState();
            moveAvatarToHex(action.effectiveWorldX - originWorldX, action.effectiveWorldY - originWorldY);
            console.log(`[GameCanvas] Step confirmé: step=${serverStep} → world=(${action.effectiveWorldX},${action.effectiveWorldY})`);
            window.dispatchEvent(new CustomEvent('nova:step-progress', { detail: { effectiveStep: serverStep } }));
            window.dispatchEvent(new CustomEvent('nova:ap-refresh'));
          }
        }
      } catch (_e) { /* non bloquant — prochain poll dans 1500ms */ }
    };

    // Timer de sync finale stocké dans finalSyncTimerRef (ref composant).
    // Ce timer NE sera PAS annulé par le cleanup de cet effet — il survit si
    // activeAction devient null via setActiveAction(null) du widget de complétion.
    const msToEnd = new Date(activeAction.expectedEndTime).getTime() - Date.now();
    if (msToEnd > 0) {
      finalSyncTimerRef.current = setTimeout(doFinalSync, msToEnd + 300);
    }

    pollServer(); // Poll immédiat : applique effectiveStep courant si reprise en plein trajet
    const pollInterval = setInterval(pollServer, 1500);

    return () => {
      clearInterval(pollInterval);
      // NE PAS annuler finalSyncTimerRef ici — le timer de sync finale doit survivre
      // même si activeAction passe à null (cleanup déclenché par setActiveAction(null)).
    };
  }, [activeAction, moveAvatarToHex, clearTravelVisualHexPosition]);

  // IMPROVED: Memoized terrain check using centralized helper
  const isTerrainWalkable = useCallback((terrain: string): boolean => {
    return TerrainHelpers.isWalkable(terrain);
  }, []);

  const handleMovementConfirm = async () => {
    if (!pendingMovement || !mapData) return;

    // Bloquer si une action serveur est déjà en cours
    if (usePlayerActions.getState().isActionActive()) {
      alert('Un déplacement est déjà en cours. Attendez qu\'il se termine.');
      setPendingMovement(null);
      return;
    }

    // LOT 2 — Garde défensive : annuler si la destination est la case actuelle du joueur.
    // Filet de sécurité au cas où pendingMovement aurait reçu la case actuelle malgré LOT 1.
    {
      const { avatarHexPosition: currentHex } = usePlayer.getState();
      if (pendingMovement.x === currentHex.x && pendingMovement.y === currentHex.y) {
        console.log('[GameCanvas] Déplacement défensif annulé — destination = case actuelle');
        setPendingMovement(null);
        return;
      }
    }

    // Vérification terrain locale (UX uniquement — le serveur valide aussi)
    const targetTile = mapData[pendingMovement.y]?.[pendingMovement.x];
    if (targetTile && !TerrainHelpers.isWalkable(targetTile.terrain)) {
      alert('Impossible de se déplacer sur l\'eau sans navire !');
      setPendingMovement(null);
      return;
    }

    // Garde fog-of-war — la destination doit être découverte (bypass admin)
    if (!adminModeEnabled) {
      const { isHexExplored: isExplored } = usePlayer.getState();
      if (!isExplored(pendingMovement.x, pendingMovement.y)) {
        alert('Impossible de se déplacer vers une case non découverte. Explorez d\'abord cette zone !');
        setPendingMovement(null);
        return;
      }
    }

    // Conversion coordonnées locales → monde
    const { originWorldX, originWorldY } = useMap.getState();
    const destinationWorldX = pendingMovement.x + originWorldX;
    const destinationWorldY = pendingMovement.y + originWorldY;

    setPendingMovement(null);

    try {
      const response = await requestMove(destinationWorldX, destinationWorldY, adminModeEnabled);
      if (response.action.msRemaining === 0) {
        // Action déjà expirée à la création (cas MJ ou durée=0) : récupérer l'état réel
        const { action: confirmed } = await fetchCurrentAction();
        usePlayerActions.getState().setActiveAction(
          confirmed?.status === "in_progress" ? confirmed : null
        );
        // Resynchronisation position via source de vérité serveur
        const serverPos = await fetchPlayerPosition();
        const { originWorldX, originWorldY } = useMap.getState();
        moveAvatarToHex(serverPos.worldX - originWorldX, serverPos.worldY - originWorldY);
      } else {
        usePlayerActions.getState().setActiveAction(response.action);
      }
      console.log(
        `[GameCanvas] Déplacement soumis → monde (${destinationWorldX},${destinationWorldY})` +
        ` | coût=${response.action.totalCost}AP` +
        ` | fin=${new Date(response.action.expectedEndTime).toLocaleString()}`
      );
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === 'ACTION_ALREADY_ACTIVE') {
        alert('Un déplacement est déjà en cours sur le serveur.');
      } else {
        console.error('[GameCanvas] Erreur soumission move:', err);
        alert(error.message ?? 'Erreur lors de la soumission du déplacement');
      }
    }
  };

  const handleMovementCancel = () => {
    setPendingMovement(null);
  };

  return (
    <>
      <CameraControls />

      {/* ─── Bloc P4-B (NI-10.09) — Bouton discret de bascule mode de carte ───
          Strategic (défaut, renderer actuel) / Immersive (Pixel HD, expérimental).
          Ne remplace pas MedievalHUD, pas de panneau — bouton unique et compact. */}
      <button
        onClick={toggleMapRenderMode}
        title="Basculer entre vue stratégique et vue immersive (raccourci : M)"
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          zIndex: 40,
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.03em',
          color: '#e8d9a0',
          background: 'rgba(20, 12, 8, 0.75)',
          border: '1px solid #6b4f2a',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        {mapRenderMode === 'strategic' ? 'Vue stratégique' : 'Vue immersive'}
      </button>

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasContextMenu}
        className="block cursor-pointer"
        style={{ touchAction: 'none', pointerEvents: 'auto' }}
      />
      

      
      {showAvatarMenu && (
        <AvatarActionMenu
          position={avatarMenuPosition}
          onClose={() => setShowAvatarMenu(false)}
        />
      )}

      {pendingMovement && (
        <MovementConfirmationModal
          targetHex={pendingMovement}
          pathResult={pendingPathResult}
          onConfirm={handleMovementConfirm}
          onCancel={handleMovementCancel}
        />
      )}

      {tileContextMenu && (
        <TileContextMenu
          screenX={tileContextMenu.screenX}
          screenY={tileContextMenu.screenY}
          hexX={tileContextMenu.hexX}
          hexY={tileContextMenu.hexY}
          locationName={tileContextMenu.locationName}
          onOpenInfo={() => {
            const foundHex = mapData?.[tileContextMenu.hexY]?.[tileContextMenu.hexX] ?? null;
            if (foundHex) setSelectedHex(foundHex);
            setTileContextMenu(null);
          }}
          onMove={tileContextMenu.canMove
            ? () => {
                setPendingMovement({ x: tileContextMenu.hexX, y: tileContextMenu.hexY });
                setTileContextMenu(null);
              }
            : null}
          onClose={() => setTileContextMenu(null)}
        />
      )}

    </>
  );
}
