import React from 'react';

interface Tile {
  x: number;
  y: number;
  terrain: string;
  resources: string[];
}

interface MapData {
  id: string;
  name: string;
  type: string;
  quality: 'rough' | 'detailed' | 'masterwork';
  region: {
    centerX: number;
    centerY: number;
    radius: number;
    tiles: Tile[];
  };
}

interface SimpleMapViewerProps {
  mapData: MapData;
  width?: number;
  height?: number;
}

const terrainColors = {
  plains: '#90EE90',
  fertile_land: '#32CD32',
  hills: '#DEB887',
  mountains: '#8B4513',
  forest: '#228B22',
  deep_water: '#191970',
  shallow_water: '#87CEEB',
  wasteland: '#A0522D'
};

// Système de cartographie simplifié basé sur une grille régulière
export const SimpleMapViewer: React.FC<SimpleMapViewerProps> = ({ 
  mapData, 
  width = 400, 
  height = 320 
}) => {
  const [hoveredTile, setHoveredTile] = React.useState<Tile | null>(null);
  
  // Calculs simples pour une grille rectangulaire
  const cols = Math.ceil(Math.sqrt(mapData.region.tiles.length));
  const rows = Math.ceil(mapData.region.tiles.length / cols);
  const tileSize = Math.min((width - 20) / cols, (height - 60) / rows);
  
  const getTileAt = (mouseX: number, mouseY: number): Tile | null => {
    const startX = (width - cols * tileSize) / 2;
    const startY = 30;
    
    const col = Math.floor((mouseX - startX) / tileSize);
    const row = Math.floor((mouseY - startY) / tileSize);
    
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const index = row * cols + col;
      return mapData.region.tiles[index] || null;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const tile = getTileAt(mouseX, mouseY);
    setHoveredTile(tile);
  };

  const renderTiles = () => {
    const startX = (width - cols * tileSize) / 2;
    const startY = 30;
    
    return mapData.region.tiles.map((tile, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * tileSize;
      const y = startY + row * tileSize;
      
      const terrainColor = terrainColors[tile.terrain as keyof typeof terrainColors] || '#CCCCCC';
      const isHovered = hoveredTile?.x === tile.x && hoveredTile?.y === tile.y;
      
      return (
        <div
          key={`${tile.x}-${tile.y}`}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: tileSize - 2,
            height: tileSize - 2,
            backgroundColor: terrainColor,
            border: isHovered ? '2px solid #FFD700' : '1px solid #000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          {mapData.quality !== 'rough' && tile.resources.length > 0 && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#FF6B6B'
            }} />
          )}
        </div>
      );
    });
  };

  return (
    <div 
      style={{ 
        width, 
        height, 
        position: 'relative', 
        backgroundColor: '#f5f5dc',
        border: '2px solid #8B4513',
        borderRadius: '8px'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredTile(null)}
    >
      {/* Titre */}
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333'
      }}>
        {mapData.name}
      </div>
      
      {/* Tuiles */}
      {renderTiles()}
      
      {/* Qualité */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#333'
      }}>
        Qualité: {mapData.quality}
      </div>
      
      {/* Boussole */}
      <div style={{
        position: 'absolute',
        top: '25px',
        right: '15px',
        fontSize: '8px',
        color: '#666'
      }}>
        N
      </div>
      
      {/* Tooltip */}
      {hoveredTile && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          pointerEvents: 'none'
        }}>
          ({hoveredTile.x},{hoveredTile.y}) - {hoveredTile.terrain}
          {hoveredTile.resources.length > 0 && (
            <div>Ressources: {hoveredTile.resources.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleMapViewer;