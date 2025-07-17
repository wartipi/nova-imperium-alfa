import { useEffect, useRef, useCallback } from "react";
import { useMap } from "../../lib/stores/useMap";
import { useGameState } from "../../lib/stores/useGameState";
import { useCivilizations } from "../../lib/stores/useCivilizations";
import { GameEngine } from "../../lib/game/GameEngine";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const { mapData, selectedHex, setSelectedHex } = useMap();
  const { gamePhase } = useGameState();
  const { civilizations, selectedUnit, moveUnit } = useCivilizations();

  // Initialize game engine
  useEffect(() => {
    if (canvasRef.current && mapData) {
      gameEngineRef.current = new GameEngine(canvasRef.current, mapData);
      gameEngineRef.current.render();
    }
  }, [mapData]);

  // Handle canvas clicks
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!gameEngineRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hex = gameEngineRef.current.getHexAtPosition(x, y);
    if (hex) {
      setSelectedHex(hex);
      
      // Handle unit movement
      if (selectedUnit && hex.x !== selectedUnit.x && hex.y !== selectedUnit.y) {
        moveUnit(selectedUnit.id, hex.x, hex.y);
      }
    }
  }, [selectedUnit, setSelectedHex, moveUnit]);

  // Update rendering when game state changes
  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateCivilizations(civilizations);
      gameEngineRef.current.setSelectedHex(selectedHex);
      gameEngineRef.current.render();
    }
  }, [civilizations, selectedHex]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      onClick={handleCanvasClick}
      className="block cursor-pointer"
      style={{ touchAction: 'none' }}
    />
  );
}
