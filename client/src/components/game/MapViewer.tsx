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

    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));

    const centerX = width / 2;
    const centerY = height / 2;
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);
    
    tiles.forEach(tile => {
      const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
      const x = centerX + (hexPos.x - regionCenterPos.x);
      const y = centerY + (hexPos.y - regionCenterPos.y);

      const terrainColor = terrainColors[tile.terrain as keyof typeof terrainColors] || '#CCCCCC';
      ctx.fillStyle = terrainColor;
      drawHexagon(ctx, x, y, hexRadius);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      drawHexagon(ctx, x, y, hexRadius);
      ctx.stroke();

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

      if (mapData.quality !== 'rough' && tile.resources.length > 0) {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mapData.name, width / 2, 15);

    ctx.font = '10px Arial';
    ctx.fillText(`Qualité: ${mapData.quality}`, width / 2, height - 5);

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - 25, 25);
    ctx.lineTo(width - 25, 15);
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.font = '8px Arial';
    ctx.fillText('N', width - 25, 12);

  }, [mapData, width, height]);

  // Système de détection optimisé utilisant la géométrie hexagonale précise
  const getHexAtMouse = (mouseX: number, mouseY: number) => {
    const tiles = mapData.region.tiles;
    if (!tiles.length) return null;

    // Utiliser les mêmes calculs que le rendu
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const hexRadius = Math.min((width - 40) / (mapWidth * Math.sqrt(3) + Math.sqrt(3)/2), (height - 40) / (mapHeight * 1.5 + 0.5));

    // Facteur d'ajustement basé sur la taille de la carte
    const tileCount = tiles.length;
    let toleranceFactor = 1.15; // Base pour cartes moyennes
    
    if (tileCount <= 7) {
      // Petites cartes (7 tuiles) - tolérance plus large car hexagones plus grands
      toleranceFactor = 1.3;
    } else if (tileCount >= 19) {
      // Grandes cartes (19+ tuiles) - tolérance plus précise car hexagones plus petits
      toleranceFactor = 1.1;
    }
    
    console.log(`🎯 MapViewer détection: ${tileCount} tuiles, tolérance: ${toleranceFactor}, rayon: ${hexRadius.toFixed(1)}`);

    const centerX = width / 2;
    const centerY = height / 2;
    const regionCenterPos = hexToPixel(mapData.region.centerX, mapData.region.centerY, hexRadius);

    // Optimisation : tester d'abord les hexagones proches du point de clic
    // Conversion inverse approximative pour trouver l'hexagone candidat
    const relativeX = mouseX - centerX + regionCenterPos.x;
    const relativeY = mouseY - centerY + regionCenterPos.y;
    
    // Estimation initiale basée sur la géométrie hexagonale
    const hexHeight = hexRadius * Math.sqrt(3);
    const estimatedHexX = Math.round(relativeX / (hexRadius * 1.5));
    const estimatedHexY = Math.round((relativeY - (estimatedHexX % 2) * (hexHeight / 2)) / hexHeight);

    // Chercher la tuile correspondante dans les données
    let bestTile = null;
    let bestDistance = Infinity;
    
    // D'abord, vérifier l'hexagone estimé et ses voisins immédiats
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const testX = estimatedHexX + dx + mapData.region.centerX;
        const testY = estimatedHexY + dy + mapData.region.centerY;
        
        const candidateTile = tiles.find(t => t.x === testX && t.y === testY);
        if (candidateTile) {
          const hexPos = hexToPixel(candidateTile.x, candidateTile.y, hexRadius);
          const screenX = centerX + (hexPos.x - regionCenterPos.x);
          const screenY = centerY + (hexPos.y - regionCenterPos.y);
          
          const distance = Math.sqrt((mouseX - screenX) ** 2 + (mouseY - screenY) ** 2);
          
          if (distance <= hexRadius * toleranceFactor && distance < bestDistance) {
            bestDistance = distance;
            bestTile = candidateTile;
          }
        }
      }
    }
    
    // Si aucune tuile trouvée avec la méthode optimisée, fallback vers la méthode complète
    if (!bestTile) {
      console.log(`🔄 Fallback: test de ${tiles.length} tuiles avec tolérance ${(toleranceFactor + 0.05).toFixed(2)}`);
      console.log(`📊 Paramètres: centerX=${centerX}, centerY=${centerY}, regionCenter=(${regionCenterPos.x.toFixed(1)}, ${regionCenterPos.y.toFixed(1)})`);
      
      // Reset bestDistance pour le fallback
      bestDistance = Infinity;
      
      for (const tile of tiles) {
        const hexPos = hexToPixel(tile.x, tile.y, hexRadius);
        const x = centerX + (hexPos.x - regionCenterPos.x);
        const y = centerY + (hexPos.y - regionCenterPos.y);

        const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        const tolerance = hexRadius * (toleranceFactor + 0.05);
        
        // Garder la trace de la plus proche même si elle dépasse la tolérance
        if (distance < bestDistance) {
          bestDistance = distance;
        }
        
        if (distance <= tolerance) {
          bestTile = tile;
          console.log(`✅ Tuile trouvée: (${tile.x},${tile.y}), distance: ${distance.toFixed(1)}, tolérance: ${tolerance.toFixed(1)}`);
          break; // Prendre la première tuile dans la tolérance
        }
      }
      
      if (!bestTile) {
        console.log(`❌ Aucune tuile dans la tolérance. Plus proche: ${bestDistance.toFixed(1)} vs max ${(hexRadius * (toleranceFactor + 0.05)).toFixed(1)}`);
        console.log(`🎯 Position souris: (${mouseX}, ${mouseY})`);
      }
    }

    return bestTile;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: mouseX, y: mouseY });

    const tile = getHexAtMouse(mouseX, mouseY);
    setHoveredTile(tile);
    
    // Debug réactivé pour diagnostiquer le problème
    if (!tile) {
      console.log('❌ Aucune tuile détectée:', { mouseX, mouseY, tileCount: mapData.region.tiles.length });
    } else {
      console.log('✅ Tuile détectée:', { x: tile.x, y: tile.y, terrain: tile.terrain });
    }
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