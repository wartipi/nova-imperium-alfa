import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, MapPin, Mountain, Droplets, Trees, Zap } from 'lucide-react';

interface HexTile {
  x: number;
  y: number;
  terrain: string;
  resources: string[];
}

interface MapData {
  region: {
    centerX: number;
    centerY: number;
    radius: number;
    tiles: HexTile[];
  };
}

interface InteractiveMapViewerProps {
  mapData: MapData;
  onClose: () => void;
  title?: string;
}

interface TooltipInfo {
  x: number;
  y: number;
  tile: HexTile;
  visible: boolean;
}

const InteractiveMapViewer: React.FC<InteractiveMapViewerProps> = ({ 
  mapData, 
  onClose, 
  title = "Carte Interactive" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo>({ x: 0, y: 0, tile: { x: 0, y: 0, terrain: '', resources: [] }, visible: false });
  
  // Configuration hexagonale simplifiée
  const HEX_SIZE = 25;
  const HEX_WIDTH = HEX_SIZE * 2;
  const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);
  
  // Couleurs des terrains
  const getTerrainColor = (terrain: string): string => {
    const colors: { [key: string]: string } = {
      'plains': '#90EE90',
      'forest': '#228B22',
      'mountains': '#8B4513',
      'desert': '#F4A460',
      'swamp': '#556B2F',
      'shallow_water': '#87CEEB',
      'deep_water': '#4682B4',
      'wasteland': '#A0522D',
      'hills': '#DEB887',
      'fertile_land': '#32CD32',
      'volcanic': '#FF4500',
      'frozen': '#B0E0E6',
      'coastal': '#20B2AA'
    };
    return colors[terrain] || '#D3D3D3';
  };

  // Icône des ressources
  const getResourceIcon = (resource: string): string => {
    const icons: { [key: string]: string } = {
      'wood': '🌲',
      'stone': '🪨',
      'iron': '⚙️',
      'copper': '🔶',
      'gold': '💰',
      'fish': '🐟',
      'whales': '🐋',
      'crabs': '🦀',
      'wheat': '🌾',
      'herbs': '🌿',
      'oil': '🛢️',
      'gems': '💎',
      'coal': '⚫'
    };
    return icons[resource] || '📦';
  };

  // Conversion coordonnées hexagonales vers pixel - version simplifiée
  const hexToPixel = useCallback((hexX: number, hexY: number): { x: number, y: number } => {
    // Algorithme classique pour les hexagones pointy-top
    const x = HEX_SIZE * 3/2 * hexX;
    const y = HEX_SIZE * Math.sqrt(3) * (hexY + hexX/2);
    return { x, y };
  }, []);

  // Dessiner un hexagone
  const drawHexagon = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, color: string) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = centerX + HEX_SIZE * Math.cos(angle);
      const y = centerY + HEX_SIZE * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Dessiner la carte - version complètement refaite
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculer les limites de la grille
    const tiles = mapData.region.tiles;
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    console.log('Limites carte:', { minX, maxX, minY, maxY });

    // Dimensionner le canvas généreusement
    canvas.width = 600;
    canvas.height = 500;

    // Effacer
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculer offset pour centrer
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    // Dessiner chaque tuile
    tiles.forEach(tile => {
      // Convertir les coordonnées du jeu en position relative au centre
      const relX = tile.x - mapData.region.centerX;
      const relY = tile.y - mapData.region.centerY;
      
      // Calculer la position pixel
      const pixelPos = hexToPixel(relX, relY);
      const centerX = pixelPos.x + offsetX;
      const centerY = pixelPos.y + offsetY;

      // Dessiner l'hexagone
      drawHexagon(ctx, centerX, centerY, getTerrainColor(tile.terrain));

      // Afficher les coordonnées
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${tile.x},${tile.y}`, centerX, centerY - 5);

      // Afficher les ressources
      if (tile.resources.length > 0) {
        ctx.font = '14px Arial';
        tile.resources.forEach((resource, index) => {
          const icon = getResourceIcon(resource);
          ctx.fillText(icon, centerX - 8 + (index * 16), centerY + 8);
        });
      }
    });

    console.log('Carte dessinée avec', tiles.length, 'tuiles');
  }, [mapData, hexToPixel, drawHexagon, getTerrainColor, getResourceIcon]);

  // Détection simplifiée basée sur la distance au centre de chaque hexagone
  const findTileAtPosition = useCallback((pixelX: number, pixelY: number): HexTile | null => {
    if (!mapData) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = pixelX - rect.left;
    const mouseY = pixelY - rect.top;

    // Utiliser le même système de coordonnées que drawMap
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    let closestTile: HexTile | null = null;
    let closestDistance = Infinity;

    mapData.region.tiles.forEach(tile => {
      // Même calcul que dans drawMap
      const relX = tile.x - mapData.region.centerX;
      const relY = tile.y - mapData.region.centerY;
      
      const pixelPos = hexToPixel(relX, relY);
      const hexCenterX = pixelPos.x + offsetX;
      const hexCenterY = pixelPos.y + offsetY;

      const distance = Math.sqrt((mouseX - hexCenterX) ** 2 + (mouseY - hexCenterY) ** 2);
      
      // Zone de détection généreuse
      if (distance < HEX_SIZE * 1.5 && distance < closestDistance) {
        closestDistance = distance;
        closestTile = tile;
      }
    });

    return closestTile;
  }, [mapData, hexToPixel]);

  // Gestion du survol avec debug
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const tile = findTileAtPosition(event.clientX, event.clientY);
    
    // Debug léger pour voir la détection
    if (tile) {
      console.log('Tuile détectée:', tile.x, tile.y, tile.terrain);
    }
    
    if (tile) {
      setTooltip({
        x: event.clientX + 10,
        y: event.clientY - 10,
        tile,
        visible: true
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [findTileAtPosition]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Redessiner quand les données changent
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Traduction des terrains
  const getTerrainName = (terrain: string): string => {
    const names: { [key: string]: string } = {
      'plains': 'Plaines',
      'forest': 'Forêt',
      'mountains': 'Montagnes',
      'desert': 'Désert',
      'swamp': 'Marécage',
      'shallow_water': 'Eau peu profonde',
      'deep_water': 'Eau profonde',
      'wasteland': 'Terres désolées',
      'hills': 'Collines',
      'fertile_land': 'Terre fertile',
      'volcanic': 'Volcanique',
      'frozen': 'Gelé',
      'coastal': 'Côtier'
    };
    return names[terrain] || terrain;
  };

  const getResourceName = (resource: string): string => {
    const names: { [key: string]: string } = {
      'wood': 'Bois',
      'stone': 'Pierre',
      'iron': 'Fer',
      'copper': 'Cuivre',
      'gold': 'Or',
      'fish': 'Poisson',
      'whales': 'Baleines',
      'crabs': 'Crabes',
      'wheat': 'Blé',
      'herbs': 'Herbes',
      'oil': 'Pétrole',
      'gems': 'Gemmes',
      'coal': 'Charbon'
    };
    return names[resource] || resource;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" ref={containerRef}>
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto relative">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Informations de la région */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            <MapPin className="inline w-4 h-4 mr-1" />
            Région centrée sur ({mapData.region.centerX}, {mapData.region.centerY}) - 
            Rayon: {mapData.region.radius} - 
            {mapData.region.tiles.length} hexagones
          </p>
        </div>

        {/* Canvas de la carte */}
        <div className="relative border border-gray-300 rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair"
          />
        </div>

        {/* Légende */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Survolez les hexagones pour voir les détails. Coordonnées et ressources affichées sur chaque case.</p>
        </div>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="fixed bg-gray-800 text-white p-2 rounded shadow-lg pointer-events-none z-60"
            style={{
              left: Math.min(tooltip.x, window.innerWidth - 200),
              top: Math.max(tooltip.y, 10)
            }}
          >
            <div className="text-sm font-bold">
              Hexagone ({tooltip.tile.x}, {tooltip.tile.y})
            </div>
            <div className="text-xs">
              Terrain: {getTerrainName(tooltip.tile.terrain)}
            </div>
            {tooltip.tile.resources.length > 0 && (
              <div className="text-xs">
                Ressources: {tooltip.tile.resources.map(r => getResourceName(r)).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveMapViewer;