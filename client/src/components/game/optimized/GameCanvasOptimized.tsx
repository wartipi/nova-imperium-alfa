import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useMap } from "../../../lib/stores/useMap";
import { useGameState } from "../../../lib/stores/useGameState";
import { usePlayer } from "../../../lib/stores/usePlayer";
import { GameEngine } from "../../../lib/game/GameEngine";
import { useGameEngine } from "../../../lib/contexts/GameEngineContext";

// Types optimisés
interface CanvasState {
  isInitialized: boolean;
  isDragging: boolean;
  lastRenderTime: number;
}

interface MousePosition {
  x: number;
  y: number;
}

// Composant mémoïsé pour les contrôles de caméra
const CameraControlsOptimized = React.memo<{
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}>(({ onZoomIn, onZoomOut, onResetView }) => {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      <button 
        onClick={onZoomIn}
        className="bg-amber-800 hover:bg-amber-700 text-white p-2 rounded"
        aria-label="Zoom avant"
      >
        ➕
      </button>
      <button 
        onClick={onZoomOut}
        className="bg-amber-800 hover:bg-amber-700 text-white p-2 rounded"
        aria-label="Zoom arrière"
      >
        ➖
      </button>
      <button 
        onClick={onResetView}
        className="bg-amber-800 hover:bg-amber-700 text-white p-2 rounded"
        aria-label="Réinitialiser la vue"
      >
        🎯
      </button>
    </div>
  );
});

// Hook optimisé pour la gestion du canvas
const useCanvasOptimized = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  mapData: any,
  gameEngineRef: React.MutableRefObject<GameEngine | null>
) => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    isInitialized: false,
    isDragging: false,
    lastRenderTime: 0
  });

  // REFACTORISATION : Initialisation mémoïsée du moteur de jeu avec injection
  const initializeGameEngine = useCallback(() => {
    if (canvasRef.current && mapData && !canvasState.isInitialized) {
      // Création des callbacks pour l'injection des stores
      const getGameState = () => useGameState.getState();
      const getPlayerState = () => usePlayer.getState();
      
      gameEngineRef.current = new GameEngine(
        canvasRef.current, 
        mapData, 
        getGameState, 
        getPlayerState
      );
      
      // Configuration des callbacks de vision
      const { isHexVisible, isHexInCurrentVision } = usePlayer.getState();
      gameEngineRef.current.setVisionCallbacks(isHexVisible, isHexInCurrentVision);
      
      gameEngineRef.current.render();
      
      // SUPPRIMÉ : Plus d'exposition globale - architecture propre

      setCanvasState(prev => ({
        ...prev,
        isInitialized: true,
        lastRenderTime: Date.now()
      }));
    }
  }, [canvasRef, mapData, canvasState.isInitialized, gameEngineRef]);

  // Rendu optimisé avec limitation de fréquence
  const optimizedRender = useCallback(() => {
    if (gameEngineRef.current) {
      const now = Date.now();
      const timeSinceLastRender = now - canvasState.lastRenderTime;
      
      // Limiter le rendu à 60 FPS maximum
      if (timeSinceLastRender > 16) {
        gameEngineRef.current.render();
        setCanvasState(prev => ({
          ...prev,
          lastRenderTime: now
        }));
      }
    }
  }, [gameEngineRef, canvasState.lastRenderTime]);

  return {
    canvasState,
    initializeGameEngine,
    optimizedRender,
    setCanvasState
  };
};

// Composant principal optimisé
export const GameCanvasOptimized = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameEngineRef } = useGameEngine();
  const { mapData, selectedHex, setSelectedHex } = useMap();
  const { gamePhase, isGameMaster } = useGameState();
  const { avatarPosition, moveAvatarToHex } = usePlayer();
  
  const [mouseDownPos, setMouseDownPos] = useState<MousePosition | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<MousePosition>({ x: 0, y: 0 });

  // Hook personnalisé optimisé
  const { 
    canvasState, 
    initializeGameEngine, 
    optimizedRender,
    setCanvasState 
  } = useCanvasOptimized(canvasRef, mapData, gameEngineRef);

  // Initialisation du moteur de jeu
  useEffect(() => {
    initializeGameEngine();
  }, [initializeGameEngine]);

  // Re-rendu optimisé lors des changements d'état
  useEffect(() => {
    optimizedRender();
  }, [isGameMaster, selectedHex, avatarPosition, optimizedRender]);

  // Gestion optimisée des événements souris
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target === canvasRef.current) {
      setMouseDownPos({ x: event.clientX, y: event.clientY });
      setCanvasState(prev => ({ ...prev, isDragging: false }));
    }
  }, [setCanvasState]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (mouseDownPos && !canvasState.isDragging) {
      const dragDistance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPos.x, 2) + 
        Math.pow(event.clientY - mouseDownPos.y, 2)
      );
      
      if (dragDistance > 5) {
        setCanvasState(prev => ({ ...prev, isDragging: true }));
      }
    }
  }, [mouseDownPos, canvasState.isDragging, setCanvasState]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!gameEngineRef.current || !mouseDownPos || canvasState.isDragging) return;
    
    if (event.target !== canvasRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hex = gameEngineRef.current.getHexAtPosition(x, y);
    if (hex) {
      setSelectedHex(hex);
      
      // Déplacement de l'avatar si c'est un clic droit ou double-clic
      if (event.button === 2 || event.detail === 2) {
        moveAvatarToHex(hex.x, hex.y);
      }
    }

    setMouseDownPos(null);
    setCanvasState(prev => ({ ...prev, isDragging: false }));
  }, [gameEngineRef, mouseDownPos, canvasState.isDragging, setSelectedHex, moveAvatarToHex, setCanvasState]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPos({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
  }, []);

  // Contrôles de caméra mémoïsés
  const cameraControls = useMemo(() => ({
    zoomIn: () => gameEngineRef.current?.zoomIn(),
    zoomOut: () => gameEngineRef.current?.zoomOut(),
    resetView: () => gameEngineRef.current?.resetCamera()
  }), [gameEngineRef]);

  if (gamePhase === "loading" || !canvasState.isInitialized) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Chargement du moteur de jeu...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
      
      <CameraControlsOptimized
        onZoomIn={cameraControls.zoomIn}
        onZoomOut={cameraControls.zoomOut}
        onResetView={cameraControls.resetView}
      />
    </div>
  );
});

GameCanvasOptimized.displayName = 'GameCanvasOptimized';