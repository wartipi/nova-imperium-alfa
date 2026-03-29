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
import { getTerrainMovementCost } from "../../lib/game/TerrainCosts";
import { CameraControls } from "./CameraControls";
import { UnifiedTerritorySystem } from "../../lib/systems/UnifiedTerritorySystem";
import { requestMove, fetchCurrentAction } from "../../lib/api/playerActionsApi";
import { fetchPlayerPosition } from "../../lib/api/playerApi";
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
  const { mapData, selectedHex, setSelectedHex } = useMap();
  const { gamePhase } = useGameState();
  const { isAdmin, adminModeEnabled, isAuthenticated } = useAuth();
  const { novaImperiums, selectedUnit, moveUnit } = useNovaImperium();
  const { avatarPosition, avatarHexPosition, travelVisualHexPosition, setTravelVisualHexPosition, clearTravelVisualHexPosition, avatarRotation, isMoving, selectedCharacter, moveAvatarToHex, isHexVisible, isHexInCurrentVision, pendingMovement, setPendingMovement } = usePlayer();
  const { activeAction } = usePlayerActions();

  // State management - reduced manual state
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ x: 0, y: 0 });
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
      
      // Set vision callbacks immediately
      const { isHexVisible, isHexInCurrentVision } = usePlayer.getState();
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision);
      
      gameEngineRef.current.render();

      // Phase 6 : hydratation des villes depuis le serveur.
      // Appelée ici car l'origine (originWorldX/Y) est disponible après le chargement de la carte.
      useNovaImperium.getState().hydrateCitiesFromServer();
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

  // Handle canvas clicks (only if not dragging)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!gameEngineRef.current || !mouseDownPos) return;
    
    // Only handle clicks if they're actually on the canvas (not on HUD elements)
    if (event.target !== canvasRef.current) return;

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
        
        // IMPROVED: Handle unit movement with terrain helper
        if (selectedUnit && (hex.x !== selectedUnit.x || hex.y !== selectedUnit.y)) {
          if (TerrainHelpers.isWalkable(hex.terrain)) {
            moveUnit(selectedUnit.id, hex.x, hex.y);
          } else {
            console.log('Cannot move unit to water terrain:', hex.terrain);
          }
        }
        
        // IMPROVED: Handle avatar movement - simplified for now
        if (!selectedUnit && !showAvatarMenu) {
          // Temporary direct approach to avoid hook ordering issues
          if (TerrainHelpers.isWalkable(hex.terrain)) {
            setPendingMovement({ x: hex.x, y: hex.y });
            console.log('Déplacement proposé vers:', hex.x, hex.y, 'terrain:', hex.terrain);
          } else {
            console.log('Cannot move avatar to water terrain:', hex.terrain);
            alert('Impossible de se déplacer sur l\'eau sans navire !');
          }
        }
      }
    }
    
    setMouseDownPos(null);
  }, [selectedUnit, setSelectedHex, moveUnit, mouseDownPos, setPendingMovement]);

  // Update rendering when game state changes
  useEffect(() => {
    if (gameEngineRef.current) {
      // Update vision callbacks with latest state
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision);

      // Position visuelle : travelVisualHexPosition pendant le trajet, avatarPosition sinon
      let visualAvatarPosition = avatarPosition;
      if (travelVisualHexPosition !== null) {
        const wc = VisionSystem.hexToWorld(travelVisualHexPosition.x, travelVisualHexPosition.y);
        visualAvatarPosition = { x: wc.x, y: 0, z: wc.z };
      }

      gameEngineRef.current.updateCivilizations(novaImperiums);
      gameEngineRef.current.setSelectedHex(selectedHex);
      gameEngineRef.current.updateAvatar(visualAvatarPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, pendingMovement);
      gameEngineRef.current.render();
      
      // Plus de centrage automatique - caméra libre
    }
  }, [novaImperiums, selectedHex, avatarPosition, travelVisualHexPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, pendingMovement]);

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

  // Mouvement case-par-case — step serveur comme ancre canonique, tick visuel comme habillage
  useEffect(() => {
    if (!activeAction || activeAction.type !== "move" || activeAction.status !== "in_progress") return;
    const path = activeAction.path;
    if (!path || path.length < 2) return;

    const startMs   = new Date(activeAction.startTime).getTime();
    const totalMs   = new Date(activeAction.expectedEndTime).getTime() - startMs;
    let finalSynced = false;

    // Dernier step confirmé par le serveur — initialisé depuis effectiveStep de l'action hydratée.
    // Permet de ne pas régresser si l'action est reprise en plein trajet (reload, montage tardif).
    let lastServerStep = activeAction.effectiveStep ?? 0;

    // LOT 4 — Hydratation travelVisualHexPosition depuis la case serveur confirmée.
    // Évite un flash depuis path[0] si le joueur est déjà sur un step > 0 au montage.
    {
      const { originWorldX, originWorldY } = useMap.getState();
      const initStep = Math.min(lastServerStep, path.length - 1);
      const initHex  = path[initStep];
      setTravelVisualHexPosition({ x: initHex.worldX - originWorldX, y: initHex.worldY - originWorldY });
    }

    // LOT 3 — Tick visuel local (500ms) — Règle A, interpolation locale.
    // Rôle : habillage visuel entre les confirmations serveur. N'appelle pas moveAvatarToHex.
    const tick = () => {
      const elapsedMs = Date.now() - startMs;
      const { originWorldX, originWorldY } = useMap.getState();

      // Règle A — départ temporisé : réplique exacte de resolveMoveStep serveur.
      // À t=0 : effectiveStep=0 → path[0]. Progression case par case au rythme du coût.
      let effectiveStep = 0;
      let cumulative    = 0;
      for (let i = 1; i < path.length; i++) {
        const stepMs = path[i].cost * 5000;
        if (elapsedMs < cumulative + stepMs) break;
        cumulative   += stepMs;
        effectiveStep = i;
      }
      const currentHex = path[effectiveStep];

      setTravelVisualHexPosition({ x: currentHex.worldX - originWorldX, y: currentHex.worldY - originWorldY });
      console.log(`[GameCanvas] Tick visuel → hex=(${currentHex.worldX - originWorldX},${currentHex.worldY - originWorldY})`);

      // LOT 5 — Sync finale : déclenche la complétion lazy serveur puis ancre sur la position DB finale.
      if (elapsedMs >= totalMs && !finalSynced) {
        finalSynced = true;
        fetchCurrentAction()
          .then(() => fetchPlayerPosition())
          .then(serverPos => {
            const { originWorldX: ox, originWorldY: oy } = useMap.getState();
            clearTravelVisualHexPosition();
            moveAvatarToHex(serverPos.worldX - ox, serverPos.worldY - oy);
            console.log(`[GameCanvas] Sync finale (${serverPos.worldX},${serverPos.worldY}) — moveAvatarToHex`);
          }).catch(() => {});
      }
    };

    tick();
    const tickInterval = setInterval(tick, 500);

    // LOT 3 — Polling serveur (1500ms) — step confirmé → moveAvatarToHex (vision + carte).
    // moveAvatarToHex est protégé contre l'écriture DB pendant une action active.
    // Seul ce bloc met à jour la position canonique locale ; le tick visuel ci-dessus reste un habillage.
    const pollServer = async () => {
      try {
        const { action } = await fetchCurrentAction();
        if (!action || action.status !== "in_progress") return;
        const serverStep = action.effectiveStep ?? 0;
        if (serverStep > lastServerStep) {
          lastServerStep = serverStep;
          const { originWorldX, originWorldY } = useMap.getState();
          moveAvatarToHex(action.effectiveWorldX - originWorldX, action.effectiveWorldY - originWorldY);
          console.log(`[GameCanvas] Step serveur avancé: step=${serverStep} → world=(${action.effectiveWorldX},${action.effectiveWorldY})`);
        }
      } catch (_e) { /* non bloquant */ }
    };

    const pollInterval = setInterval(pollServer, 1500);

    return () => {
      clearInterval(tickInterval);
      clearInterval(pollInterval);
      clearTravelVisualHexPosition();
    };
  }, [activeAction, moveAvatarToHex, setTravelVisualHexPosition, clearTravelVisualHexPosition]);

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

    // Vérification terrain locale (UX uniquement — le serveur valide aussi)
    const targetTile = mapData[pendingMovement.y]?.[pendingMovement.x];
    if (targetTile && !TerrainHelpers.isWalkable(targetTile.terrain)) {
      alert('Impossible de se déplacer sur l\'eau sans navire !');
      setPendingMovement(null);
      return;
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
          onConfirm={handleMovementConfirm}
          onCancel={handleMovementCancel}
        />
      )}

    </>
  );
}
