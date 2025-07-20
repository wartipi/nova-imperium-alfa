import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useMap } from '../../lib/stores/useMap';
import { useGameState } from '../../lib/stores/useGameState';
import { getTerrainMovementCost } from '../../lib/game/TerrainCosts';

interface InteractiveMapViewerProps {
  mapData: {
    id: string;
    name: string;
    region: {
      centerX: number;
      centerY: number;
      radius: number;
      tiles: { x: number; y: number; terrain: string; resources: string[] }[];
    };
    quality: 'rough' | 'detailed' | 'masterwork';
    accuracy: number;
  };
  width?: number;
  height?: number;
  onTileClick?: (tile: { x: number; y: number; terrain: string; resources: string[] }) => void;
}

const terrainColors = {
  wasteland: '#F5F5DC',        // Beige pâle
  forest: '#228B22',           // Vert foncé
  mountains: '#708090',        // Gris pierre
  fertile_land: '#90EE90',     // Vert clair
  hills: '#D2B48C',            // Brun clair
  shallow_water: '#87CEEB',    // Bleu clair
  deep_water: '#191970',       // Bleu foncé
  swamp: '#556B2F',            // Vert olive foncé
  desert: '#FFD700',           // Jaune doré
  sacred_plains: '#F0E68C',    // Blanc doré / beige lumineux
  caves: '#2F2F2F',            // Gris très foncé
  ancient_ruins: '#8B7355',    // Brun-gris
  volcano: '#B22222',          // Rouge foncé
  enchanted_meadow: '#50C878'  // Vert émeraude
};

const terrainNames = {
  wasteland: 'Terre en friche',
  forest: 'Forêt',
  mountains: 'Montagnes',
  fertile_land: 'Terre fertile',
  hills: 'Collines',
  shallow_water: 'Eau peu profonde',
  deep_water: 'Eau profonde',
  swamp: 'Marais',
  desert: 'Désert',
  sacred_plains: 'Plaines sacrées',
  caves: 'Grottes',
  ancient_ruins: 'Ruines anciennes',
  volcano: 'Volcan',
  enchanted_meadow: 'Prairie enchantée'
};

export function InteractiveMapViewer({ mapData, width = 400, height = 300, onTileClick }: InteractiveMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number; terrain: string; resources: string[]; screenX: number; screenY: number } | null>(null);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number; terrain: string; resources: string[] } | null>(null);
  const [pendingMovement, setPendingMovement] = useState<{ x: number; y: number; terrain: string; resources: string[] } | null>(null);
  
  // Game state hooks
  const { actionPoints, spendActionPoints, moveAvatarToHex, getAvatarPosition, exploreCurrentLocation } = usePlayer();
  const { setSelectedHex } = useMap();
  const avatarPosition = getAvatarPosition();

  const drawHexagon = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  };

  const hexToPixel = (hexX: number, hexY: number, hexRadius: number) => {
    const hexHeight = hexRadius * Math.sqrt(3);
    const x = hexX * (hexRadius * 1.5);
    const y = hexY * hexHeight + (hexX % 2) * (hexHeight / 2);
    return { x, y };
  };

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, width, height);

    const tiles = mapData.region.tiles;
    if (tiles.length === 0) return;

    // Calculate map bounds
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    
    // Calculate hex radius based on number of tiles
    const numTiles = tiles.length;
    let hexRadius;
    
    if (numTiles <= 7) {
      hexRadius = Math.min(width / 8, height / 8);
    } else if (numTiles <= 19) {
      hexRadius = Math.min(width / 12, height / 12);
    } else {
      hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);
    
    // Draw tiles
    tiles.forEach(tile => {
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);

      const terrainColor = terrainColors[tile.terrain as keyof typeof terrainColors] || '#CCCCCC';
      
      // Base terrain color
      ctx.fillStyle = terrainColor;
      drawHexagon(ctx, x, y, hexRadius);
      ctx.fill();

      // Avatar position highlight
      if (avatarPosition.x === tile.x && avatarPosition.y === tile.y) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)'; // Gold overlay for avatar
        drawHexagon(ctx, x, y, hexRadius);
        ctx.fill();
        
        // Avatar icon
        ctx.fillStyle = '#000';
        ctx.font = `${hexRadius * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚶', x, y);
      }

      // Selected tile highlight
      if (selectedTile && selectedTile.x === tile.x && selectedTile.y === tile.y) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        drawHexagon(ctx, x, y, hexRadius);
        ctx.stroke();
      }

      // Pending movement highlight
      if (pendingMovement && pendingMovement.x === tile.x && pendingMovement.y === tile.y) {
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        drawHexagon(ctx, x, y, hexRadius);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hovered tile highlight
      if (hoveredTile && hoveredTile.x === tile.x && hoveredTile.y === tile.y) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        drawHexagon(ctx, x, y, hexRadius);
        ctx.stroke();
      }

      // Basic border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      drawHexagon(ctx, x, y, hexRadius);
      ctx.stroke();

      // Quality indicators
      if (mapData.quality === 'masterwork') {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        drawHexagon(ctx, x, y, hexRadius * 0.95);
        ctx.stroke();
      } else if (mapData.quality === 'detailed') {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        drawHexagon(ctx, x, y, hexRadius * 0.95);
        ctx.stroke();
      }

      // Resource indicators
      if (mapData.quality !== 'rough' && tile.resources.length > 0) {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(x + hexRadius * 0.5, y - hexRadius * 0.5, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Resource count
        if (tile.resources.length > 1) {
          ctx.fillStyle = '#FFF';
          ctx.font = '8px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile.resources.length.toString(), x + hexRadius * 0.5, y - hexRadius * 0.5);
        }
      }

      // Movement cost indicator (for adjacent tiles)
      if (Math.abs(tile.x - avatarPosition.x) <= 1 && Math.abs(tile.y - avatarPosition.y) <= 1 && 
          !(tile.x === avatarPosition.x && tile.y === avatarPosition.y)) {
        const movementCost = getTerrainMovementCost(tile.terrain as any);
        if (movementCost < 999) {
          ctx.fillStyle = movementCost <= actionPoints ? '#00FF00' : '#FF0000';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(movementCost.toString(), x, y + hexRadius * 0.7);
        } else {
          // Water - show blocked
          ctx.fillStyle = '#FF0000';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✕', x, y + hexRadius * 0.7);
        }
      }
    });

    // Map title and info
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mapData.name, width / 2, 15);

    ctx.font = '10px Arial';
    ctx.fillText(`Qualité: ${mapData.quality} | PA: ${actionPoints}`, width / 2, height - 5);

    // North indicator
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - 25, 25);
    ctx.lineTo(width - 25, 15);
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.font = '8px Arial';
    ctx.fillText('N', width - 25, 12);
  }, [mapData, width, height, avatarPosition, selectedTile, hoveredTile, pendingMovement, actionPoints]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const getHexAtMouse = (mouseX: number, mouseY: number) => {
    const tiles = mapData.region.tiles;
    if (!tiles.length) return null;

    // Use same calculation logic as drawing
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    
    const numTiles = tiles.length;
    let hexRadius;
    
    if (numTiles <= 7) {
      hexRadius = Math.min(width / 8, height / 8);
    } else if (numTiles <= 19) {
      hexRadius = Math.min(width / 12, height / 12);
    } else {
      hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);

    // Find closest tile
    let bestTile = null;
    let bestDistance = Infinity;
    let bestScreenPos = { x: 0, y: 0 };

    for (const tile of tiles) {
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);

      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      
      const captureRadius = numTiles <= 7 ? hexRadius * 1.5 : hexRadius * 1.2;
      if (distance <= captureRadius && distance < bestDistance) {
        bestDistance = distance;
        bestTile = tile;
        bestScreenPos = { x, y };
      }
    }

    return bestTile ? { ...bestTile, screenX: bestScreenPos.x, screenY: bestScreenPos.y } : null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: mouseX, y: mouseY });

    const tile = getHexAtMouse(mouseX, mouseY);
    setHoveredTile(tile);
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredTile(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const tile = getHexAtMouse(mouseX, mouseY);
    
    if (tile) {
      setSelectedTile(tile);
      // Create a proper HexTile object for setSelectedHex
      const hexTile = {
        x: tile.x,
        y: tile.y,
        terrain: tile.terrain as any,
        resource: tile.resources[0] || null,
        resources: tile.resources,
        food: 0,
        action_points: 0,
        gold: 0,
        iron: 0,
        wood: 0,
        stone: 0,
        hasRiver: false,
        hasRoad: false,
        improvement: null,
        isVisible: true,
        isExplored: true
      };
      setSelectedHex(hexTile);
      
      // Handle movement
      if (tile.x !== avatarPosition.x || tile.y !== avatarPosition.y) {
        const isAdjacent = Math.abs(tile.x - avatarPosition.x) <= 1 && Math.abs(tile.y - avatarPosition.y) <= 1;
        
        if (isAdjacent) {
          const movementCost = getTerrainMovementCost(tile.terrain as any);
          
          // Check if water terrain
          if (tile.terrain === 'shallow_water' || tile.terrain === 'deep_water') {
            alert('Impossible de se déplacer sur l\'eau sans navire !');
            return;
          }
          
          if (movementCost < 999 && actionPoints >= movementCost) {
            setPendingMovement(tile);
          } else if (movementCost >= 999) {
            alert('Terrain inaccessible !');
          } else {
            alert(`Pas assez de Points d'Action ! Coût: ${movementCost} PA (Disponibles: ${actionPoints} PA)`);
          }
        } else {
          alert('Cette case est trop éloignée ! Vous ne pouvez vous déplacer que sur les cases adjacentes.');
        }
      }
      
      if (onTileClick) {
        onTileClick(tile);
      }
    }
  };

  const confirmMovement = () => {
    if (pendingMovement) {
      const movementCost = getTerrainMovementCost(pendingMovement.terrain as any);
      if (spendActionPoints(movementCost)) {
        moveAvatarToHex(pendingMovement.x, pendingMovement.y);
        console.log('Movement confirmed:', { to: pendingMovement, cost: movementCost });
      }
      setPendingMovement(null);
    }
  };

  const cancelMovement = () => {
    setPendingMovement(null);
  };

  const handleExploreZone = () => {
    if (actionPoints >= 5) {
      if (spendActionPoints(5)) {
        exploreCurrentLocation();
        alert('Zone explorée ! Les ressources dans votre vision ont été révélées.');
      }
    } else {
      alert('Pas assez de Points d\'Action ! (Coût: 5 PA)');
    }
  };

  return (
    <div className="border-2 border-amber-600 bg-amber-50 p-2 rounded-lg relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-amber-300 rounded cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      
      {/* Hover tooltip */}
      {hoveredTile && mousePos && (
        <div 
          className="absolute bg-black text-white p-2 rounded text-xs z-10 pointer-events-none"
          style={{
            left: Math.min(mousePos.x + 10, width - 160),
            top: Math.max(mousePos.y - 80, 10),
            minWidth: '150px'
          }}
        >
          <div><strong>Position:</strong> ({hoveredTile.x}, {hoveredTile.y})</div>
          <div><strong>Terrain:</strong> {terrainNames[hoveredTile.terrain as keyof typeof terrainNames] || hoveredTile.terrain}</div>
          {hoveredTile.x !== avatarPosition.x || hoveredTile.y !== avatarPosition.y ? (
            <div><strong>Coût déplacement:</strong> {getTerrainMovementCost(hoveredTile.terrain as any)} PA</div>
          ) : (
            <div><strong>Position actuelle</strong></div>
          )}
          {hoveredTile.resources.length > 0 && (
            <div><strong>Ressources:</strong> {hoveredTile.resources.join(', ')}</div>
          )}
        </div>
      )}

      {/* Movement confirmation modal */}
      {pendingMovement && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="font-bold mb-2">Confirmer le déplacement</h3>
            <p>Aller vers ({pendingMovement.x}, {pendingMovement.y})</p>
            <p><strong>Terrain:</strong> {terrainNames[pendingMovement.terrain as keyof typeof terrainNames]}</p>
            <p><strong>Coût:</strong> {getTerrainMovementCost(pendingMovement.terrain as any)} PA</p>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={confirmMovement}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Confirmer
              </button>
              <button 
                onClick={cancelMovement}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Action panel */}
      <div className="mt-2 flex gap-2 flex-wrap">
        <button 
          onClick={handleExploreZone}
          disabled={actionPoints < 5}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-xs"
        >
          Explorer (5 PA)
        </button>
      </div>
      
      {/* Map info */}
      <div className="mt-2 text-xs text-amber-800">
        <div>Précision: {mapData.accuracy}% | PA: {actionPoints}</div>
        <div>Région: {mapData.region.tiles.length} tuiles | Position: ({avatarPosition.x}, {avatarPosition.y})</div>
        {selectedTile && (
          <div>Case sélectionnée: ({selectedTile.x}, {selectedTile.y}) - {terrainNames[selectedTile.terrain as keyof typeof terrainNames]}</div>
        )}
      </div>
    </div>
  );
}