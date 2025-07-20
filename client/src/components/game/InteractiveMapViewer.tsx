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
    // Implémentation fonctionnelle copiée de nova-imperium-clone
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
    
    // Calculate hex radius based on number of tiles - IMPROVED CALCULATION
    const numTiles = tiles.length;
    let hexRadius;
    
    if (numTiles <= 7) {
      hexRadius = Math.min(width / 8, height / 8) * 0.98; // Réduction de 2%
    } else if (numTiles <= 19) {
      hexRadius = Math.min(width / 12, height / 12) * 0.98; // Réduction de 2%
    } else {
      // Calcul cohérent avec nova-imperium-clone
      hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));
    }
    
    // Calcul du centre et positionnement hexagonal
    const centerX = width / 2;
    const centerY = height / 2;
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);
    
    // Draw tiles avec positionnement hexagonal corrigé
    tiles.forEach((tile, index) => {
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);
      
      // Position des tuiles calculées et affichées

      const terrainColor = terrainColors[tile.terrain as keyof typeof terrainColors] || '#CCCCCC';
      
      // Base terrain color
      ctx.fillStyle = terrainColor;
      drawHexagon(ctx, x, y, hexRadius);
      ctx.fill();

      // Avatar position display removed from mini-map

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

      // Resource indicators removed - will be reimplemented with new resource system

      // Affichage des coordonnées pour le debug (optionnel)
      if (hexRadius > 15) {
        ctx.fillStyle = '#333';
        ctx.font = `${Math.max(8, hexRadius * 0.2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${tile.x},${tile.y}`, x, y);
      }

      // Hitboxes de débogage désactivées pour la production
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

  // Détection par collision simple - zone circulaire
  const isPointInCollisionZone = (px: number, py: number, centerX: number, centerY: number, radius: number): boolean => {
    // Distance euclidienne simple
    const dx = px - centerX;
    const dy = py - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Zone de collision circulaire avec rayon ajusté pour les hexagones
    return distance <= radius * 0.9;
  };

  const getHexAtMouse = (mouseX: number, mouseY: number) => {
    const tiles = mapData.region.tiles;
    if (!tiles.length) return null;

    // UTILISER EXACTEMENT LA MÊME LOGIQUE QUE drawMap()
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    
    const numTiles = tiles.length;
    let hexRadius;
    
    if (numTiles <= 7) {
      hexRadius = Math.min(width / 8, height / 8) * 0.98;
    } else if (numTiles <= 19) {
      hexRadius = Math.min(width / 12, height / 12) * 0.98;
    } else {
      // Calcul identique à drawMap pour la détection de collision
      hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));
    }

    // Utiliser exactement la même logique que drawMap - hexToPixel
    const centerX = width / 2;
    const centerY = height / 2;
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);

    // Test de collision avec les mêmes coordonnées que le dessin
    for (const tile of tiles) {
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);

      // Zone de collision circulaire simple
      if (isPointInCollisionZone(mouseX, mouseY, x, y, hexRadius)) {
        return { ...tile, screenX: x, screenY: y };
      }
    }

    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: mouseX, y: mouseY });

    const tile = getHexAtMouse(mouseX, mouseY);
    
    // Détection de la tuile sous la souris
    
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
      
      // Créer un objet HexTile compatible mais sans déplacement possible
      const hexTile = {
        x: tile.x,
        y: tile.y,
        terrain: tile.terrain as any,
        resource: (tile.resources[0] as any) || null,
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
      
      // Callback optionnel pour informer le parent (sans déplacement)
      if (onTileClick) {
        onTileClick(tile);
      }
    }
  };

  // Fonctions de déplacement supprimées - la mini-carte n'permet plus les déplacements

  return (
    <div className="border-2 border-amber-600 bg-amber-50 p-2 rounded-lg relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-amber-300 rounded cursor-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      
      {/* Debug: Hitboxes de collision circulaires */}
      <svg
        className="absolute inset-0 pointer-events-none z-30"
        viewBox={`0 0 ${width} ${height}`}
        style={{ opacity: 0.7 }}
      >
        {mapData.region.tiles.map((tile, index) => {
          // Calculs IDENTIQUES à getHexAtMouse pour la collision
          const numTiles = mapData.region.tiles.length;
          let hexRadius;
          
          if (numTiles <= 7) {
            hexRadius = Math.min(width / 8, height / 8) * 0.98;
          } else if (numTiles <= 19) {
            hexRadius = Math.min(width / 12, height / 12) * 0.98;
          } else {
            const minX = Math.min(...mapData.region.tiles.map(t => t.x));
            const maxX = Math.max(...mapData.region.tiles.map(t => t.x));
            const minY = Math.min(...mapData.region.tiles.map(t => t.y));
            const maxY = Math.max(...mapData.region.tiles.map(t => t.y));
            const mapWidth = maxX - minX + 1;
            const mapHeight = maxY - minY + 1;
            hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));
          }
          
          // Position IDENTIQUE à getHexAtMouse
          const centerX = width / 2;
          const centerY = height / 2;
          const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);
          const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
          const tileX = centerX + (hexPos.x - regionCenterPos.x);
          const tileY = centerY + (hexPos.y - regionCenterPos.y);
          
          // Zone de collision circulaire (même que isPointInCollisionZone)
          const collisionRadius = hexRadius * 0.9;
          const isHovered = hoveredTile?.x === tile.x && hoveredTile?.y === tile.y;
          
          return (
            <g key={`hitbox-${index}`}>
              {/* Cercle de collision */}
              <circle
                cx={tileX}
                cy={tileY}
                r={collisionRadius}
                fill={isHovered ? "rgba(255, 0, 0, 0.4)" : "rgba(0, 255, 0, 0.3)"}
                stroke={isHovered ? "#ff0000" : "#00ff00"}
                strokeWidth="2"
                strokeDasharray="4,4"
              />
              {/* Point central */}
              <circle
                cx={tileX}
                cy={tileY}
                r="2"
                fill={isHovered ? "#ff0000" : "#007700"}
              />
              {/* Coordonnées */}
              <text
                x={tileX}
                y={tileY + 4}
                fontSize="8"
                textAnchor="middle"
                fill="#333"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {tile.x},{tile.y}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Curseur précis pour minimap */}
      {mousePos && (
        <div 
          className="absolute z-40 pointer-events-none"
          style={{
            left: mousePos.x - 6,
            top: mousePos.y - 6,
            width: '12px',
            height: '12px'
          }}
        >
          {/* Croix de précision */}
          <div className="absolute inset-0">
            <div className="absolute w-full h-0.5 bg-red-500 top-1/2 transform -translate-y-1/2"></div>
            <div className="absolute h-full w-0.5 bg-red-500 left-1/2 transform -translate-x-1/2"></div>
          </div>
          {/* Point central */}
          <div className="absolute w-2 h-2 bg-red-600 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      )}

      {/* Hover tooltip - positioning intelligent */}
      {hoveredTile && mousePos && (
        <div 
          className="absolute bg-gray-900 bg-opacity-95 text-white p-2 rounded-lg text-xs z-50 pointer-events-none shadow-xl border border-gray-500"
          style={{
            left: mousePos.x + 15 > width - 160 ? mousePos.x - 170 : mousePos.x + 15,
            top: mousePos.y - 15 < 70 ? mousePos.y + 15 : mousePos.y - 70,
            width: '155px'
          }}
        >
          <div className="font-medium text-amber-300 mb-1">
            🗺️ ({hoveredTile.x}, {hoveredTile.y})
          </div>
          <div className="text-gray-100 text-xs">
            {terrainNames[hoveredTile.terrain as keyof typeof terrainNames] || hoveredTile.terrain}
          </div>
          {hoveredTile.resources && hoveredTile.resources.length > 0 && (
            <div className="text-green-300 text-xs mt-1">
              💎 {hoveredTile.resources.join(', ')}
            </div>
          )}
          <div className="text-cyan-300 text-xs mt-1 border-t border-gray-600 pt-1">
            Mouse: ({mousePos.x.toFixed(0)}, {mousePos.y.toFixed(0)})
          </div>
        </div>
      )}

      {/* Mini-carte affichage uniquement - pas de déplacement */}
      
      {/* Map info */}
      <div className="mt-2 text-xs text-amber-800">
        <div>Précision: {mapData.accuracy}% | PA: {actionPoints}</div>
        <div>Région: {mapData.region.tiles.length} tuiles</div>
        {selectedTile && (
          <div>Case sélectionnée: ({selectedTile.x}, {selectedTile.y}) - {terrainNames[selectedTile.terrain as keyof typeof terrainNames]}</div>
        )}
      </div>
    </div>
  );
}