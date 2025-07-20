import { useRef, useEffect, useCallback } from "react";
import { useMap } from "../../lib/stores/useMap";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { useGameEngine } from "../../lib/contexts/GameEngineContext";

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameEngineRef } = useGameEngine();
  const { mapData, selectedHex } = useMap();
  const { novaImperiums } = useNovaImperium();

  useEffect(() => {
    if (!canvasRef.current || !mapData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapWidth = mapData[0].length;
    const mapHeight = mapData.length;
    const pixelSize = 2;

    canvas.width = mapWidth * pixelSize;
    canvas.height = mapHeight * pixelSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const hex = mapData[y][x];
        ctx.fillStyle = getMinimapTerrainColor(hex.terrain);
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw nova imperiums
    novaImperiums.forEach(ni => {
      // Draw cities
      ctx.fillStyle = ni.color;
      ni.cities.forEach(city => {
        ctx.fillRect(city.x * pixelSize - 1, city.y * pixelSize - 1, pixelSize + 2, pixelSize + 2);
      });

      // Draw units
      ctx.fillStyle = ni.color;
      ni.units.forEach(unit => {
        ctx.fillRect(unit.x * pixelSize, unit.y * pixelSize, pixelSize, pixelSize);
      });
    });

    // Draw selected hex
    if (selectedHex) {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 1;
      ctx.strokeRect(selectedHex.x * pixelSize, selectedHex.y * pixelSize, pixelSize, pixelSize);
    }
  }, [mapData, novaImperiums, selectedHex]);

  const getMinimapTerrainColor = (terrain: string): string => {
    const colors = {
      grassland: '#90EE90',
      plains: '#DEB887',
      desert: '#F4A460',
      tundra: '#B0C4DE',
      snow: '#FFFAFA',
      ocean: '#4682B4',
      coast: '#87CEEB',
      hills: '#8B7355',
      mountains: '#696969',
      forest: '#228B22',
      jungle: '#006400'
    };
    return colors[terrain as keyof typeof colors] || '#808080';
  };

  // Handle minimap click to move camera
  const handleMinimapClick = useCallback((event: React.MouseEvent) => {
    if (!gameEngineRef.current || !canvasRef.current || !mapData) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Convert click coordinates to canvas coordinates
    const canvasX = (clickX / rect.width) * canvas.width;
    const canvasY = (clickY / rect.height) * canvas.height;
    
    // Convert canvas coordinates to map coordinates
    const pixelSize = 2;
    const mapX = Math.floor(canvasX / pixelSize);
    const mapY = Math.floor(canvasY / pixelSize);
    
    // Ensure coordinates are within map bounds
    const mapWidth = mapData[0].length;
    const mapHeight = mapData.length;
    
    if (mapX >= 0 && mapX < mapWidth && mapY >= 0 && mapY < mapHeight) {
      // Move camera to clicked position
      gameEngineRef.current.centerCameraOnPosition(mapX, mapY);
    }
  }, [gameEngineRef, mapData]);

  return (
    <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4">
      <div className="text-amber-900 font-bold text-sm mb-2 text-center">CARTE DU MONDE</div>
      <div className="bg-amber-50 border border-amber-700 rounded p-1">
        <canvas
          ref={canvasRef}
          className="block cursor-pointer hover:cursor-crosshair"
          style={{ 
            width: '200px', 
            height: '120px',
            imageRendering: 'pixelated'
          }}
          onClick={handleMinimapClick}
        />
      </div>
    </div>
  );
}