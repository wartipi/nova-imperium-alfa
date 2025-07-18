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
  fertile_land: '#8BC34A',
  forest: '#4CAF50',
  mountains: '#795548',
  desert: '#FFC107',
  wasteland: '#607D8B',
  hills: '#8D6E63',
  swamp: '#2E7D32',
  sacred_plains: '#E8F5E8',
  ancient_ruins: '#9E9E9E',
  volcano: '#FF5722',
  caves: '#424242',
  enchanted_meadow: '#C8E6C9',
  shallow_water: '#4FC3F7',
  deep_water: '#1976D2'
};

export function MapViewer({ mapData, width = 400, height = 300 }: MapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fonction pour dessiner un hexagone
  const drawHexagon = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
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

  // Fonction pour convertir les coordonnées hex en coordonnées pixel
  const hexToPixel = (hexX: number, hexY: number, hexRadius: number) => {
    const width = hexRadius * 2;
    const height = hexRadius * Math.sqrt(3);
    
    let x = hexRadius * 3/2 * hexX;
    let y = height * (hexY + 0.5 * (hexX & 1));
    
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    // Fond de la carte
    ctx.fillStyle = '#e8f4f8';
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
    const hexRadius = Math.min((width - 40) / (mapWidth * 1.5 + 0.5), (height - 40) / (mapHeight * Math.sqrt(3) + Math.sqrt(3)));

    // Centre de la carte
    const centerX = width / 2;
    const centerY = height / 2;

    // Dessiner chaque tuile comme hexagone
    tiles.forEach(tile => {
      const relativeX = tile.x - minX - mapWidth / 2;
      const relativeY = tile.y - minY - mapHeight / 2;
      
      const hexPos = hexToPixel(relativeX, relativeY, hexRadius);
      const x = centerX + hexPos.x;
      const y = centerY + hexPos.y;

      // Couleur du terrain
      ctx.fillStyle = terrainColors[tile.terrain as keyof typeof terrainColors] || '#CCCCCC';
      drawHexagon(ctx, x, y, hexRadius * 0.9);
      ctx.fill();

      // Bordure pour la qualité de la carte
      if (mapData.quality === 'masterwork') {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
      } else if (mapData.quality === 'detailed') {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 0.5;
      }
      drawHexagon(ctx, x, y, hexRadius * 0.9);
      ctx.stroke();

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

  return (
    <div className="border-2 border-amber-600 bg-amber-50 p-2 rounded-lg">
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