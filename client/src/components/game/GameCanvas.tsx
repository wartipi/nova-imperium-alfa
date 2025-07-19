import { useEffect, useRef, useCallback, useState } from "react";
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

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameEngineRef } = useGameEngine();
  const { mapData, selectedHex, setSelectedHex } = useMap();
  const { gamePhase, isGameMaster } = useGameState();
  const { novaImperiums, selectedUnit, moveUnit } = useNovaImperium();
  const { avatarPosition, avatarRotation, isMoving, selectedCharacter, moveAvatarToHex, isHexVisible, isHexInCurrentVision, pendingMovement, setPendingMovement } = usePlayer();
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ x: 0, y: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickPosition, setLastClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  // Initialize game engine
  useEffect(() => {
    if (canvasRef.current && mapData) {
      gameEngineRef.current = new GameEngine(canvasRef.current, mapData);
      
      // Set vision callbacks immediately
      const { isHexVisible, isHexInCurrentVision } = usePlayer.getState();
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision);
      
      gameEngineRef.current.render();
      
      // Expose game engine to window for cartography access and vision updates
      (window as any).gameEngine = gameEngineRef.current;
      
      // Expose stores to window for GameEngine access
      (window as any).gameState = useGameState.getState();
      (window as any).playerState = usePlayer.getState();
    }
  }, [mapData]);

  // Re-render when Game Master mode changes
  useEffect(() => {
    if (gameEngineRef.current) {
      console.log('Mode MJ changé, re-render de la carte:', isGameMaster);
      
      // Update window stores before rendering
      (window as any).gameState = useGameState.getState();
      (window as any).playerState = usePlayer.getState();
      
      gameEngineRef.current.render();
    }
  }, [isGameMaster]);

  // Handle mouse down to track drag vs click
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
        // Vérifier s'il y a une colonie sur cette case
        const { currentNovaImperium } = useNovaImperium.getState();
        if (currentNovaImperium) {
          const city = currentNovaImperium.cities.find(c => c.x === hex.x && c.y === hex.y);
          if (city) {
            console.log('🏘️ Clic sur la colonie:', city.name, 'à', hex.x, hex.y);
            setSelectedCityId(city.id);
            setMouseDownPos(null);
            return;
          }
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
        
        // Handle unit movement - check if terrain is walkable
        if (selectedUnit && (hex.x !== selectedUnit.x || hex.y !== selectedUnit.y)) {
          // Check if terrain is walkable for land units
          if (isTerrainWalkable(hex.terrain)) {
            moveUnit(selectedUnit.id, hex.x, hex.y);
          } else {
            console.log('Cannot move unit to water terrain:', hex.terrain);
          }
        }
        
        // Handle avatar movement - double click movement
        if (!selectedUnit && !showAvatarMenu) {
          const gameEngine = gameEngineRef.current;
          const currentAvatar = gameEngine?.avatarPosition;
          const currentTime = Date.now();
          
          // Vérifier si c'est un double-clic (dans les 500ms et sur la même position)
          const isDoubleClick = lastClickTime && 
                               (currentTime - lastClickTime) < 500 && 
                               lastClickPosition &&
                               lastClickPosition.x === hex.x && 
                               lastClickPosition.y === hex.y;
          
          if (isDoubleClick && currentAvatar && (hex.x !== currentAvatar.x || hex.y !== currentAvatar.y)) {
            if (isTerrainWalkable(hex.terrain)) {
              setPendingMovement({ x: hex.x, y: hex.y });
              console.log('Double-clic détecté - Déplacement proposé vers:', hex.x, hex.y, 'terrain:', hex.terrain);
              // Reset pour éviter les triple-clics
              setLastClickTime(0);
              setLastClickPosition(null);
            } else {
              console.log('Cannot move avatar to water terrain:', hex.terrain);
              alert('Impossible de se déplacer sur l\'eau sans navire !');
            }
          } else {
            // Premier clic - enregistrer le temps et la position
            setLastClickTime(currentTime);
            setLastClickPosition({ x: hex.x, y: hex.y });
            console.log('Premier clic enregistré sur:', hex.x, hex.y, '- Double-cliquez pour vous déplacer');
          }
        }
      }
    }
    
    setMouseDownPos(null);
  }, [selectedUnit, setSelectedHex, moveUnit, mouseDownPos, moveAvatarToHex, avatarPosition, setPendingMovement, lastClickTime, lastClickPosition]);

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

  // Check if terrain is walkable for land units
  const isTerrainWalkable = (terrain: string): boolean => {
    const waterTerrains = ['shallow_water', 'deep_water'];
    return !waterTerrains.includes(terrain);
  };

  const handleMovementConfirm = () => {
    if (pendingMovement && mapData) {
      const { spendActionPoints } = usePlayer.getState();
      const targetTile = mapData[pendingMovement.y] && mapData[pendingMovement.y][pendingMovement.x];
      
      if (targetTile) {
        const movementCost = getTerrainMovementCost(targetTile.terrain as any);
        
        // Prevent movement to water terrain
        if (targetTile.terrain === 'shallow_water' || targetTile.terrain === 'deep_water') {
          alert('Impossible de se déplacer sur l\'eau sans navire !');
          setPendingMovement(null);
          return;
        }
        
        if (movementCost < 999 && spendActionPoints(movementCost)) {
          moveAvatarToHex(pendingMovement.x, pendingMovement.y);
          setPendingMovement(null);
          console.log('Movement confirmed:', { 
            to: pendingMovement, 
            terrain: targetTile.terrain, 
            cost: movementCost 
          });
        } else {
          alert(`Pas assez de Points d'Action ! Coût: ${movementCost} PA`);
          setPendingMovement(null);
        }
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
