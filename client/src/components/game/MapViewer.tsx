import React, { useRef, useEffect } from 'react';

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

  // Conversion hexagonale pour alignement parfait avec le rendu
  const hexToPixel = (hexX: number, hexY: number, hexRadius: number) => {
    const hexHeight = hexRadius * Math.sqrt(3);
    
    // Système offset: colonnes impaires décalées vers le bas
    const x = hexX * (hexRadius * 1.5);
    const y = hexY * hexHeight + (hexX % 2) * (hexHeight / 2);
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    const tiles = mapData.region.tiles;
    if (!tiles.length) return;

    // Calculer les limites de la région
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    // Calculer la taille optimale des hexagones
    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min(
      (width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2),
      (height - 40) / (mapHeight * 1.5 + 0.5)
    );

    // Centre de l'affichage
    const centerX = width / 2;
    const centerY = height / 2;

    // Centre de la région
    const regionCenterX = (minX + maxX) / 2;
    const regionCenterY = (minY + maxY) / 2;
    const regionCenterPos = hexToPixel(regionCenterX, regionCenterY, hexRadius);

    // Dessiner chaque tuile
    tiles.forEach(tile => {
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);

      // Couleur du terrain
      const color = terrainColors[tile.terrain as keyof typeof terrainColors] || '#DDD';
      
      // Dessiner l'hexagone
      drawHexagon(ctx, x, y, hexRadius * 0.9);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#B8860B'; // Doré
      ctx.lineWidth = 2;
      ctx.stroke();

      // Afficher les ressources avec de petits points
      if (tile.resources.length > 0) {
        tile.resources.forEach((resource, index) => {
          const angle = (index * 2 * Math.PI) / tile.resources.length;
          const resourceX = x + (hexRadius * 0.4) * Math.cos(angle);
          const resourceY = y + (hexRadius * 0.4) * Math.sin(angle);
          
          ctx.beginPath();
          ctx.arc(resourceX, resourceY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#000';
          ctx.fill();
        });
      }
    });
  }, [mapData, width, height]);

  return (
    <div className="border-2 border-amber-600 bg-amber-50 p-2 rounded-lg relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-amber-300 rounded"
      />
      
      <div className="mt-2 text-xs text-amber-800">
        <div>Précision: {mapData.accuracy}%</div>
        <div>Région: {mapData.region.tiles.length} tuiles</div>
      </div>
    </div>
  );
}