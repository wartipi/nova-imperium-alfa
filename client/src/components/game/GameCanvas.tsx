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

  // ─── Menu contextuel de case (clic droit) ─────────────────────────────────
  const [tileContextMenu, setTileContextMenu] = useState<{
    screenX:      number;
    screenY:      number;
    hexX:         number;
    hexY:         number;
    hasMarket:    boolean;
    hasBank:      boolean;
    locationName: string | null;
    canMove:      boolean;  // "Se déplacer ici" visible si true
  } | null>(null);

  // Custom hooks for improved architecture  
  const { renderEngine, updateEngineStores } = useGameEngineAccess();

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

      // Phase 6 : hydratation des villes depuis le serveur.
      // Appelée ici car l'origine (originWorldX/Y) est disponible après le chargement de la carte.
      useNovaImperium.getState().hydrateCitiesFromServer();

      // Fog of war — chargement des tuiles découvertes depuis le serveur, puis application
      // des callbacks vision + rendu final avec brouillard correctement initialisé.
      const engine = gameEngineRef.current;
      const { isHexVisible, isHexInCurrentVision, isHexInFogRing, loadDiscoveredTiles } = usePlayer.getState();
      loadDiscoveredTiles().then(() => {
        usePlayer.getState().updateVision();
        // Enregistrer les callbacks vision maintenant que les tuiles sont chargées
        // et forcer un rendu : exploredHexes et currentVision contiennent les bonnes données.
        engine?.setVisionCallbacks(isHexVisible, isHexInCurrentVision, isHexInFogRing);
        engine?.render();
      });
    }
  }, [mapData]);

  // Inject admin mode into GameEngine when isAdmin changes
  useEffect(() => {
    if (!gameEngineRef.current) return;
    gameEngineRef.current.setAdminMode(isAdmin);
    renderEngine();
  }, [isAdmin, gameEngineRef, renderEngine]);

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

    // Fermer d'éventuels menus déjà ouverts
    setShowAvatarMenu(false);
    setTileContextMenu(null);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !gameEngineRef.current) return;

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const hex = gameEngineRef.current.getHexAtPosition(canvasX, canvasY);
    if (!hex) return;

    // ── Résolution des services réels sur la case ─────────────────────────────
    //
    // Priorité 1 : ville du joueur dans novaImperiums — buildings exacts connus
    //   (coords locales = worldX - originWorldX via hydrateCitiesFromServer)
    // Priorité 2 : colonie tierce — hasMarket/hasBank viennent du DTO serveur
    //   (getAllColonies() batch-query city_buildings — aucune approximation)
    // Priorité 3 : terrain sans colonie → hasMarket=false, hasBank=false
    // ─────────────────────────────────────────────────────────────────────────

    const allOwnCities = novaImperiums.flatMap((ni) => ni.cities);
    const ownCity = allOwnCities.find((c) => c.x === hex.x && c.y === hex.y);

    let hasMarket    = false;
    let hasBank      = false;
    let locationName: string | null = null;

    if (ownCity) {
      const buildings = ownCity.buildings as string[];
      hasMarket    = buildings.includes("guilde_des_marchands");
      hasBank      = buildings.includes("bank");
      locationName = ownCity.name ?? null;
      console.log(
        `[GameCanvas] Clic droit → hex(${hex.x},${hex.y}) ownCity="${ownCity.name}" ` +
        `buildings=[${buildings.join(",")}] hasMarket=${hasMarket} hasBank=${hasBank}`
      );
    } else {
      const territory = UnifiedTerritorySystem.getTerritory(hex.x, hex.y);
      locationName = territory?.colonyName ?? null;
      if (territory?.colonyId) {
        hasMarket = territory.hasMarket ?? false;
        hasBank   = territory.hasBank   ?? false;
        console.log(
          `[GameCanvas] Clic droit → hex(${hex.x},${hex.y}) colonie="${locationName}" ` +
          `hasMarket=${hasMarket} hasBank=${hasBank}`
        );
      } else {
        console.log(`[GameCanvas] Clic droit → hex(${hex.x},${hex.y}) terrain`);
      }
    }

    // ── "Se déplacer ici" — mêmes gardes que le clic gauche (LOT A/C) ─────────
    // Réutilise exactement les conditions de handleCanvasClick :
    //   1. Pas d'unité sélectionnée (le déplacement d'unité a son propre flux)
    //   2. Terrain walkable
    //   3. Case ≠ position actuelle du joueur
    //   4. Case accessible (explorée ou admin)
    const { isHexExplored: isHexExploredCtx, avatarHexPosition: ctxCurrentHex } = usePlayer.getState();
    const isAccessibleCtx = isHexExploredCtx(hex.x, hex.y) || isAdmin;
    const canMove = (
      !selectedUnit &&
      TerrainHelpers.isWalkable(hex.terrain) &&
      !(hex.x === ctxCurrentHex.x && hex.y === ctxCurrentHex.y) &&
      isAccessibleCtx
    );
    console.log(
      `[GameCanvas] Clic droit → hex(${hex.x},${hex.y}) ` +
      `canMove=${canMove} terrain=${hex.terrain}`
    );

    setTileContextMenu({
      screenX: event.clientX,
      screenY: event.clientY,
      hexX:    hex.x,
      hexY:    hex.y,
      hasMarket,
      hasBank,
      locationName,
      canMove,
    });
  }, [gameEngineRef, novaImperiums, selectedUnit, isAdmin]);

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

      // Check if click is on avatar first
      if (gameEngineRef.current.isClickOnAvatar(x, y)) {
        const avatarScreenPos = gameEngineRef.current.getAvatarScreenPosition();
        setAvatarMenuPosition(avatarScreenPos);
        setShowAvatarMenu(true);
        setMouseDownPos(null);
        return;
      }

      const hex = gameEngineRef.current.getHexAtPosition(x, y);
      if (hex) {
        // Vérifier si la case est explorée avant de permettre la sélection
        const { isHexExplored } = usePlayer.getState();
        const isAccessible = isHexExplored(hex.x, hex.y) || isAdmin;
        
        // Ne permettre la sélection que si la case est accessible
        if (isAccessible) {
          setSelectedHex(hex);
        } else {
          // Aucune action pour les cases non explorées
          console.log('Case non explorée - aucune action possible');
        }
        
        // Déplacement d'unité sélectionnée (flux distinct du déplacement avatar)
        if (selectedUnit && (hex.x !== selectedUnit.x || hex.y !== selectedUnit.y)) {
          if (TerrainHelpers.isWalkable(hex.terrain)) {
            moveUnit(selectedUnit.id, hex.x, hex.y);
          } else {
            console.log('Cannot move unit to water terrain:', hex.terrain);
          }
        }

        // NOTE: Le déplacement avatar est désormais déclenché uniquement via
        // le menu contextuel de case (clic droit → "Se déplacer ici").
        // Ce clic gauche ne lance plus la modale de déplacement.
      }
    }
    
    setMouseDownPos(null);
  }, [selectedUnit, setSelectedHex, moveUnit, mouseDownPos]);

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
      
      // Plus de centrage automatique - caméra libre
    }
  }, [novaImperiums, selectedHex, avatarPosition, travelVisualHexPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, isHexInFogRing, pendingMovement, previewPathHexes, activeAction, originWorldX, originWorldY]);

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
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
      } catch {
        // Échec silencieux — pas de crash si réseau indisponible
      }
    };

    pollTerritories();
    const territoryInterval = setInterval(pollTerritories, 10000);
    return () => clearInterval(territoryInterval);
  }, [isAuthenticated]);

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
      finalSyncedRef.current = true;
      try {
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
          onMoveRequest={() => {}} // Plus besoin de mode mouvement
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
          hasMarket={tileContextMenu.hasMarket}
          hasBank={tileContextMenu.hasBank}
          locationName={tileContextMenu.locationName}
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
