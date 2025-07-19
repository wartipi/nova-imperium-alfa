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
    // EXACTEMENT la même formule que GameEngine.ts lignes 257-258
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

    // Calculer la taille des hexagones - même formule que la version originale qui marchait
    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));

    // Centre de la carte
    const centerX = width / 2;
    const centerY = height / 2;

    // Créer une grille centrée sur la région mappée
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);
    
    // Dessiner chaque tuile comme hexagone
    tiles.forEach(tile => {
      // Utiliser les coordonnées absolues puis centrer la région
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      
      // Position finale centrée sur le canvas
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);

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

  // Fonction pour vérifier si un point est dans un hexagone (géométrie exacte)
  const isPointInHexagon = (pointX: number, pointY: number, hexCenterX: number, hexCenterY: number, hexRadius: number) => {
    const dx = Math.abs(pointX - hexCenterX);
    const dy = Math.abs(pointY - hexCenterY);
    
    // Pour un hexagone pointy-top, collision précise
    const hexWidth = hexRadius * Math.sqrt(3) / 2;
    
    if (dx > hexWidth) return false;
    if (dy > hexRadius) return false;
    
    // Test diagonale pour les coins coupés
    return (dx * Math.sqrt(3) + dy <= hexRadius * Math.sqrt(3));
  };

  // Fonction pour détecter quel hexagone est sous la souris (méthode GameEngine adaptée)
  const getHexAtMouse = (mouseX: number, mouseY: number) => {
    const tiles = mapData.region.tiles;
    if (tiles.length === 0) return null;

    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));
    const hexHeight = hexRadius * Math.sqrt(3);

    const centerX = width / 2;
    const centerY = height / 2;
    
    // Centre de la région
    const regionCenterX = (minX + maxX) / 2;
    const regionCenterY = (minY + maxY) / 2;

    // Convertir position souris en coordonnées "monde" relatives au centre
    const worldX = mouseX - centerX;
    const worldY = mouseY - centerY;

    // Estimation initiale de la zone à tester (méthode GameEngine)
    let centerHexX = Math.round(worldX / (hexRadius * 1.5));
    let centerHexY = Math.round((worldY - (centerHexX % 2) * (hexHeight / 2)) / hexHeight);

    // Tester l'hexagone central et ses voisins pour gérer les cas limites
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const testHexX = centerHexX + dx;
        const testHexY = centerHexY + dy;
        
        // Chercher si cette coordonnée correspond à un tile existant
        const tile = tiles.find(t => {
          const relativeX = t.x - regionCenterX;
          const relativeY = t.y - regionCenterY;
          return Math.round(relativeX) === testHexX && Math.round(relativeY) === testHexY;
        });
        
        if (tile) {
          // Calculer la position exacte de ce hex (même formule que le rendu)
          const hexCenterX = testHexX * (hexRadius * 1.5);
          const hexCenterY = testHexY * hexHeight + (testHexX % 2) * (hexHeight / 2);
          
          // Test géométrique précis (même fonction que GameEngine)
          const dx = Math.abs(worldX - hexCenterX);
          const dy = Math.abs(worldY - hexCenterY);
          
          if (dx <= hexRadius && dy <= hexRadius * Math.sqrt(3) / 2) {
            if (dy <= hexRadius * Math.sqrt(3) / 2 - dx * Math.sqrt(3) / 3) {
              return tile;
            }
          }
        }
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