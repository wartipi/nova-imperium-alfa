import React from 'react';
import { TerritorySystem } from '../../lib/systems/TerritorySystem';
import { useFactions } from '../../lib/stores/useFactions';
import { useGameState } from '../../lib/stores/useGameState';
import { useMap } from '../../lib/stores/useMap';

export function TerritoryListPanel() {
  const { playerFaction } = useFactions();
  const { isGameMaster } = useGameState();
  const { setSelectedHex } = useMap();
  
  // Debug - afficher les informations
  React.useEffect(() => {
    console.log('TerritoryListPanel - Mode MJ:', isGameMaster);
    console.log('TerritoryListPanel - Faction du joueur:', playerFaction);
  }, [isGameMaster, playerFaction]);

  // Obtenir les territoires selon le mode
  const territories = isGameMaster ? 
    TerritorySystem.getAllTerritories() : 
    TerritorySystem.getTerritoriesByFaction(playerFaction || '');
    
  // Debug - afficher les territoires
  React.useEffect(() => {
    console.log('TerritoryListPanel - Territoires trouvés:', territories.length);
    console.log('TerritoryListPanel - Territoires:', territories);
  }, [territories]);

  const handleTerritoryClick = (territory: any) => {
    // Naviguer vers le territoire
    setSelectedHex({ x: territory.x, y: territory.y });
    
    // Centrer la caméra (si GameEngine est disponible)
    if ((window as any).gameEngine) {
      (window as any).gameEngine.centerCameraOnHex(territory.x, territory.y);
    }
  };

  const getTerrainIcon = (x: number, y: number) => {
    // Obtenir le terrain depuis la carte (si disponible)
    const gameEngine = (window as any).gameEngine;
    if (gameEngine && gameEngine.map) {
      const terrain = gameEngine.map.getHex(x, y)?.terrain;
      switch(terrain) {
        case 'fertile_land': return '🌾';
        case 'forest': return '🌲';
        case 'hills': return '⛰️';
        case 'mountains': return '🏔️';
        case 'desert': return '🏜️';
        case 'swamp': return '🏞️';
        case 'shallow_water': return '🌊';
        case 'deep_water': return '🌀';
        case 'wasteland': return '💀';
        case 'caves': return '🕳️';
        case 'volcano': return '🌋';
        case 'sacred_plains': return '✨';
        case 'ancient_ruins': return '🏛️';
        case 'enchanted_meadow': return '🧚';
        default: return '🗺️';
      }
    }
    return '🗺️';
  };

  if (territories.length === 0) {
    return (
      <div className="text-amber-800">
        <div className="bg-yellow-50 border border-yellow-400 rounded p-3 mb-4">
          <div className="text-yellow-800 text-sm font-semibold">
            {isGameMaster ? '📊 Aucun territoire revendiqué sur la carte' : '📊 Aucun territoire revendiqué'}
          </div>
          <div className="text-yellow-700 text-xs mt-1">
            {isGameMaster ? 
              'Utilisez le gestionnaire de territoire pour revendiquer des hexagones.' :
              'Rejoignez une faction et revendiquez votre premier territoire !'
            }
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => {
              const event = new CustomEvent('openTerritoryPanel');
              window.dispatchEvent(event);
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            🗺️ Ouvrir le gestionnaire de territoire
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-amber-800">
      <div className="bg-blue-50 border border-blue-400 rounded p-3 mb-3">
        <div className="text-blue-800 text-sm font-semibold mb-2">
          {isGameMaster ? `🗺️ Tous les Territoires (${territories.length})` : `🗺️ Mes Territoires (${territories.length})`}
        </div>
        
        <div className="max-h-48 overflow-y-auto space-y-2">
          {territories.map((territory, index) => (
            <div
              key={`${territory.x}-${territory.y}`}
              onClick={() => handleTerritoryClick(territory)}
              className="bg-white border border-blue-300 rounded p-2 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getTerrainIcon(territory.x, territory.y)}</span>
                  <div>
                    <div className="text-xs font-medium text-blue-900">
                      ({territory.x}, {territory.y})
                    </div>
                    {isGameMaster && (
                      <div className="text-xs text-blue-700">
                        {territory.factionName} - {territory.claimedByName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-blue-600">
                  📍 Cliquer pour voir
                </div>
              </div>
              
              <div className="text-xs text-blue-600 mt-1">
                Revendiqué le {new Date(territory.claimedDate).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={() => {
            const event = new CustomEvent('openTerritoryPanel');
            window.dispatchEvent(event);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
        >
          🗺️ Gestionnaire de territoire
        </button>
        
        {territories.length > 0 && (
          <div className="bg-amber-50 border border-amber-400 rounded p-2">
            <div className="text-xs text-amber-700">
              💡 <strong>Navigation :</strong> Cliquez sur un territoire pour centrer la caméra et sélectionner l'hexagone.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}