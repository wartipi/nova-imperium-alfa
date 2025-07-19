import React, { useRef, useEffect, useState } from 'react';

interface MapViewerProps {
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

export function MapViewer({ mapData, width = 400, height = 300 }: MapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number; terrain: string; resources: string[] } | null>(null);

  // Fonction pour dessiner un hexagone (pointy-top comme dans GameEngine)
  const drawHexagon = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3; // EXACTEMENT comme GameEngine.ts ligne 290
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

  // Fonction pour convertir les coordonnées hex en coordonnées pixel (EXACTEMENT comme GameEngine.ts)
  const hexToPixel = (hexX: number, hexY: number, hexRadius: number) => {
    // Utiliser la même formule que GameEngine.ts
    // Dans GameEngine: screenX = (x * hexSize * 1.5) - cameraX + canvas.width / 2;
    // Dans GameEngine: screenY = (y * hexHeight + (x % 2) * (hexHeight / 2)) - cameraY + canvas.height / 2;
    const hexHeight = hexRadius * Math.sqrt(3);
    
    const x = hexX * (hexRadius * 1.5);
    const y = hexY * hexHeight + (hexX % 2) * (hexHeight / 2);
    
    return { x, y };
  };

  // Fonction pour convertir les coordonnées pixel en coordonnées hex (EXACTEMENT comme GameEngine.ts)
  const pixelToHex = (pixelX: number, pixelY: number, hexRadius: number, offsetX: number, offsetY: number) => {
    const hexHeight = hexRadius * Math.sqrt(3);
    
    // Ajuster pour l'offset de la carte
    const adjustedX = pixelX - offsetX;
    const adjustedY = pixelY - offsetY;
    
    // Conversion inverse
    const q = (adjustedX * 2/3) / hexRadius;
    const r = (-adjustedX / 3 + adjustedY * Math.sqrt(3)/3) / hexRadius;
    
    // Arrondir aux coordonnées hex
    const x = Math.round(q);
    const y = Math.round(r - (x % 2) * 0.5);
    
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    // Fond beige de la carte
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, width, height);

    // Calculer les limites de la région
    const tiles = mapData.region.tiles;
    if (tiles.length === 0) return;

    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    // Calculer la taille des hexagones
    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));

    // Centre de la carte
    const centerX = width / 2;
    const centerY = height / 2;

    // Dessiner chaque tuile comme hexagone
    tiles.forEach(tile => {
      // Utiliser des coordonnées relatives au centre de la carte
      const relativeX = tile.x - mapData.region.centerX;
      const relativeY = tile.y - mapData.region.centerY;
      
      // Convertir en position pixel relative
      const hexPos = hexToPixel(relativeX, relativeY, hexRadius);
      
      // Position finale centrée sur le canvas
      const x = centerX + hexPos.x;
      const y = centerY + hexPos.y;

      // Couleur du terrain avec vérification
      const terrainColor = terrainColors[tile.terrain as keyof typeof terrainColors];
      if (!terrainColor) {
        console.warn('Couleur terrain inconnue:', tile.terrain);
      }
      ctx.fillStyle = terrainColor || '#CCCCCC';
      drawHexagon(ctx, x, y, hexRadius * 0.9);
      ctx.fill();

      // Contour noir mince pour toutes les tuiles
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      drawHexagon(ctx, x, y, hexRadius * 0.9);
      ctx.stroke();

      // Bordure supplémentaire pour la qualité de la carte
      if (mapData.quality === 'masterwork') {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        drawHexagon(ctx, x, y, hexRadius * 0.85);
        ctx.stroke();
      } else if (mapData.quality === 'detailed') {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        drawHexagon(ctx, x, y, hexRadius * 0.85);
        ctx.stroke();
      }

      // Ressources (pour les cartes détaillées)
      if (mapData.quality !== 'rough' && tile.resources.length > 0) {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Titre de la carte
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mapData.name, width / 2, 15);

    // Qualité de la carte
    ctx.font = '10px Arial';
    ctx.fillText(`Qualité: ${mapData.quality}`, width / 2, height - 5);

    // Boussole simple
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - 25, 25);
    ctx.lineTo(width - 25, 15);
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', width - 25, 12);

  }, [mapData, width, height]);

  // Fonction pour détecter quel hexagone est sous la souris
  const getHexAtMouse = (mouseX: number, mouseY: number) => {
    const tiles = mapData.region.tiles;
    if (tiles.length === 0) return null;

    // Calculer les limites de la région (exactement comme dans le useEffect)
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    // Calculer la taille des hexagones (exactement comme dans le useEffect)
    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));

    const centerX = width / 2;
    const centerY = height / 2;

    // Trouver l'hexagone le plus proche
    let closestTile = null;
    let closestDistance = Infinity;

    for (const tile of tiles) {
      // Utiliser des coordonnées relatives au centre de la carte
      const relativeX = tile.x - mapData.region.centerX;
      const relativeY = tile.y - mapData.region.centerY;
      
      // Convertir en position pixel relative
      const hexPos = hexToPixel(relativeX, relativeY, hexRadius);
      
      // Position finale centrée sur le canvas
      const x = centerX + hexPos.x;
      const y = centerY + hexPos.y;

      // Distance du centre de l'hexagone
      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      
      // Debug pour voir les positions
      if (distance <= hexRadius * 1.2) { // Zone plus large pour debug
        console.log(`🔍 Tile (${tile.x},${tile.y}): relative=(${relativeX},${relativeY}), distance=${distance.toFixed(1)}, hexPos=(${hexPos.x.toFixed(1)},${hexPos.y.toFixed(1)}), screen=(${x.toFixed(1)},${y.toFixed(1)}), mouse=(${mouseX},${mouseY})`);
      }
      
      if (distance <= hexRadius * 0.9 && distance < closestDistance) {
        closestDistance = distance;
        closestTile = tile;
      }
    }
    return closestTile;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: mouseX, y: mouseY });

    const tile = getHexAtMouse(mouseX, mouseY);
    if (tile) {
      console.log('🎯 Hexagone détecté:', tile.x, tile.y, 'terrain:', tile.terrain);
    }
    setHoveredTile(tile);
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredTile(null);
  };

  return (
    <div className="border-2 border-amber-600 bg-amber-50 p-2 rounded-lg relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-amber-300 rounded"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Tooltip au survol */}
      {hoveredTile && mousePos && (
        <div 
          className="absolute bg-black text-white p-2 rounded text-xs z-10 pointer-events-none"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 50,
            minWidth: '120px'
          }}
        >
          <div><strong>Position:</strong> ({hoveredTile.x}, {hoveredTile.y})</div>
          <div><strong>Terrain:</strong> {hoveredTile.terrain === 'wasteland' ? 'Terre en friche' : hoveredTile.terrain}</div>
          {hoveredTile.resources.length > 0 && (
            <div><strong>Ressources:</strong> {hoveredTile.resources.join(', ')}</div>
          )}
        </div>
      )}
      
      <div className="mt-2 text-xs text-amber-800">
        <div>Précision: {mapData.accuracy}%</div>
        <div>Région: {mapData.region.tiles.length} tuiles</div>
      </div>
    </div>
  );
}