import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useMap } from "../../lib/stores/useMap";
import { useGameState } from "../../lib/stores/useGameState";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { GameEngine } from "../../lib/game/GameEngine";
import { useGameEngine } from "../../lib/contexts/GameEngineContext";
import { AvatarActionMenu } from "./AvatarActionMenu";
import { MovementConfirmationModal } from "./MovementConfirmationModal";
import { getTerrainMovementCost } from "../../lib/game/TerrainCosts";
import { CameraControls } from "./CameraControls";
import { CityManagementPanel } from "./CityManagementPanel";
import { UnifiedTerritorySystem } from "../../lib/systems/UnifiedTerritorySystem";
import { MovementSystem } from "../../lib/movement/MovementSystem";

// Improved imports - custom hooks and constants
import { useGameEngineAccess } from "../../lib/hooks/useGameEngineAccess";
import { useDoubleClick } from "../../lib/hooks/useDoubleClick";
import { useAvatarMovement } from "../../lib/hooks/useAvatarMovement";
import { useCitySelection } from "../../lib/hooks/useCitySelection";
import { TerrainHelpers } from "../../lib/constants/TerrainTypes";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameEngineRef } = useGameEngine();
  const { mapData, selectedHex, setSelectedHex } = useMap();
  const { gamePhase, isGameMaster } = useGameState();
  const { novaImperiums, selectedUnit, moveUnit } = useNovaImperium();
  const { avatarPosition, avatarRotation, isMoving, selectedCharacter, moveAvatarToHex, isHexVisible, isHexInCurrentVision, pendingMovement, setPendingMovement } = usePlayer();
  
  // State management - reduced manual state
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  // Custom hooks for improved architecture  
  const { renderEngine, updateEngineStores } = useGameEngineAccess();
  const { selectCity } = useCitySelection();

  // Initialize game engine - IMPROVED: No more window exposure
  useEffect(() => {
    if (canvasRef.current && mapData) {
      gameEngineRef.current = new GameEngine(canvasRef.current, mapData);
      
      // Set vision callbacks immediately
      const { isHexVisible, isHexInCurrentVision } = usePlayer.getState();
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision);
      
      gameEngineRef.current.render();
      
      // ARCHITECTURAL IMPROVEMENT: Removed window exposure
      // Controlled access now available through useGameEngineAccess hook
    }
  }, [mapData]);

  // Re-render when Game Master mode changes - IMPROVED: Using renderEngine hook
  useEffect(() => {
    console.log('Mode MJ changé, re-render de la carte:', isGameMaster);
    renderEngine(); // Uses the improved hook instead of direct window access
  }, [isGameMaster, renderEngine]);

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
        // IMPROVED: Use dedicated city selection hook
        const { city, cityId } = selectCity(hex.x, hex.y);
        if (city) {
          setSelectedCityId(cityId);
          setMouseDownPos(null);
          return;
        }

        // Vérifier si la case est explorée avant de permettre la sélection
        const { isHexExplored } = usePlayer.getState();
        const { isGameMaster } = useGameState.getState();
        const isAccessible = isHexExplored(hex.x, hex.y) || isGameMaster;
        
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
  }, [selectedUnit, setSelectedHex, moveUnit, mouseDownPos, selectCity, setPendingMovement]);

  // Update rendering when game state changes
  useEffect(() => {
    if (gameEngineRef.current) {
      // Update vision callbacks with latest state
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision);
      
      gameEngineRef.current.updateCivilizations(novaImperiums);
      gameEngineRef.current.setSelectedHex(selectedHex);
      gameEngineRef.current.updateAvatar(avatarPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, pendingMovement);
      gameEngineRef.current.render();
      
      // Plus de centrage automatique - caméra libre
    }
  }, [novaImperiums, selectedHex, avatarPosition, avatarRotation, isMoving, selectedCharacter, isHexVisible, isHexInCurrentVision, pendingMovement]);

  // IMPROVED: Memoized terrain check using centralized helper
  const isTerrainWalkable = useCallback((terrain: string): boolean => {
    return TerrainHelpers.isWalkable(terrain);
  }, []);

  const handleMovementConfirm = async () => {
    if (pendingMovement && mapData) {
      // Vérifier si un déplacement est déjà en cours
      if (MovementSystem.isMoving()) {
        alert('Un déplacement est déjà en cours !');
        return;
      }

      const targetTile = mapData[pendingMovement.y] && mapData[pendingMovement.y][pendingMovement.x];
      
      if (targetTile) {
        // IMPROVED: Use terrain helper for consistency
        if (!TerrainHelpers.isWalkable(targetTile.terrain)) {
          alert('Impossible de se déplacer sur l\'eau sans navire !');
          setPendingMovement(null);
          return;
        }

        try {
          // Utiliser le nouveau système de pathfinding
          const result = await MovementSystem.planAndExecuteMovement({
            targetX: pendingMovement.x,
            targetY: pendingMovement.y,
            mapData: mapData
          });

          if (result.success) {
            console.log('✅ Movement completed:', {
              path: result.path,
              totalCost: result.totalCost,
              message: result.message
            });
          } else {
            alert(result.message);
          }
        } catch (error) {
          console.error('❌ Movement error:', error);
          alert('Erreur lors du déplacement');
        }

        setPendingMovement(null);
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

      {selectedCityId && (
        <CityManagementPanel
          cityId={selectedCityId}
          onClose={() => setSelectedCityId(null)}
        />
      )}
    </>
  );
}
