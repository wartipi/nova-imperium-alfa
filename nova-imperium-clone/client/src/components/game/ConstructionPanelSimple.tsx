import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useFactions } from "../../lib/stores/useFactions";
import { useGameState } from "../../lib/stores/useGameState";
import { Button } from "../ui/button";
import { getBuildingCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { getBuildingAPGeneration, getBuildingMaxAPIncrease } from "../../lib/game/ActionPointsGeneration";
import { Resources } from "../../lib/game/types";
import { UnifiedTerritorySystem } from "../../lib/systems/UnifiedTerritorySystem";
import { useMap } from "../../lib/stores/useMap";
import { useState } from "react";

export function ConstructionPanel() {
  const { currentNovaImperium, buildInCity, addCity } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const { playerFaction, getFactionById } = useFactions();
  const { isGameMaster } = useGameState();
  const { selectedHex } = useMap();
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!currentNovaImperium) return null;

  // Obtenir les colonies du joueur avec leurs territoires contrôlés depuis UnifiedTerritorySystem
  const playerColoniesWithTerritories = UnifiedTerritorySystem.getPlayerColoniesWithTerritories('player');
  const currentFaction = playerFaction ? getFactionById(playerFaction) : null;
  const hasColonies = playerColoniesWithTerritories.length > 0;

  // Afficher les informations sur les colonies existantes avec leurs terrains
  console.log('🏰', playerColoniesWithTerritories.length, 'colonies:', 
    playerColoniesWithTerritories.map(c => `${c.colony.colonyName} (${c.colony.x},${c.colony.y}) - ${c.controlledTerritories.length} cases - terrains: ${c.availableTerrains.join(', ')}`)
  );

  const buildings = [
    // === TERRE EN FRICHE (wasteland) ===
    { 
      id: 'outpost', 
      name: 'Avant-poste', 
      cost: { wood: 5, stone: 3, action_points: 8 }, 
      constructionTime: 2, 
      description: 'Structure d\'observation et de défense basique', 
      icon: '🏗️', 
      category: 'Basique',
      requiredTerrain: ['wasteland'],
      actionPointCost: 8
    },
    // === TERRE FERTILE (fertile_land) ===
    { 
      id: 'farm', 
      name: 'Ferme', 
      cost: { wood: 8, stone: 2, action_points: 10 }, 
      constructionTime: 3, 
      description: 'Production agricole intensive', 
      icon: '🚜', 
      category: 'Production',
      requiredTerrain: ['fertile_land'],
      actionPointCost: 10
    },
    // === FORÊT (forest) ===
    { 
      id: 'lumber_mill', 
      name: 'Scierie', 
      cost: { wood: 12, stone: 6, action_points: 15 }, 
      constructionTime: 4, 
      description: 'Production de bois optimisée', 
      icon: '🪚', 
      category: 'Production',
      requiredTerrain: ['forest'],
      actionPointCost: 15
    },
    // === MONTAGNES (mountains) ===
    { 
      id: 'mine', 
      name: 'Mine', 
      cost: { wood: 10, stone: 8, action_points: 20 }, 
      constructionTime: 5, 
      description: 'Extraction de minerais précieux', 
      icon: '⛏️', 
      category: 'Production',
      requiredTerrain: ['mountains'],
      actionPointCost: 20
    },
  ];

  // Fonctions utilitaires
  const formatResourceCost = (cost: Resources) => {
    return Object.entries(cost)
      .filter(([key]) => key !== 'action_points')
      .map(([key, value]) => `${value} ${getResourceIcon(key)}`)
      .join(', ');
  };

  const getResourceIcon = (resource: string) => {
    const icons: { [key: string]: string } = {
      food: '🌾',
      gold: '💰',
      wood: '🪵',
      stone: '🪨',
      iron: '⚙️',
      precious_metals: '💎',
      mana: '✨',
      crystals: '💎',
      ancient_knowledge: '📜'
    };
    return icons[resource] || resource;
  };

  const getTerrainName = (terrain: string) => {
    const names: { [key: string]: string } = {
      fertile_land: 'Terre fertile',
      forest: 'Forêt',
      mountains: 'Montagnes',
      wasteland: 'Terre en friche',
      hills: 'Collines',
      desert: 'Désert',
      swamp: 'Marécage',
      caves: 'Grottes',
      volcano: 'Volcan',
      sacred_plains: 'Plaines sacrées',
      enchanted_meadow: 'Prairie enchantée',
      ancient_ruins: 'Ruines antiques',
      shallow_water: 'Eau peu profonde',
      deep_water: 'Eau profonde'
    };
    return names[terrain] || terrain;
  };

  const canAffordBuilding = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return false;
    
    if (isGameMaster) return true;
    
    // Vérifier les ressources
    const resources = currentNovaImperium.resources;
    return Object.entries(building.cost).every(([resource, cost]) => {
      if (resource === 'action_points') return actionPoints >= cost;
      return (resources as any)[resource] >= cost;
    });
  };

  const handleBuild = (buildingId: string, cityId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const actionCost = building.actionPointCost;
    
    if (canAffordBuilding(buildingId) || isGameMaster) {
      if (isGameMaster) {
        buildInCity(cityId, buildingId, {}, building.constructionTime, true);
        console.log(`[MODE MJ] Construction instantanée de ${buildingId} (ressources infinies, pas d'attente)`);
      } else {
        const success = spendActionPoints(actionCost);
        if (success) {
          buildInCity(cityId, buildingId, building.cost, building.constructionTime, false);
          console.log(`Construction de ${buildingId} lancée pour ${building.constructionTime} tours, ${actionCost} PA et ressources déduites`);
        }
      }
    } else {
      console.log(`Ressources insuffisantes pour construire ${buildingId}`);
    }
  };

  const handleMouseEnter = (buildingId: string, event: React.MouseEvent) => {
    setHoveredBuilding(buildingId);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredBuilding(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Projets de Construction</h4>
        {isGameMaster && (
          <div className="bg-purple-100 border border-purple-400 rounded p-2 mb-3">
            <div className="text-purple-800 text-sm font-semibold">🎯 Mode Maître de Jeu</div>
            <div className="text-purple-700 text-xs">
              Accès illimité : toutes constructions disponibles, ressources infinies, construction instantanée
            </div>
          </div>
        )}
      </div>

      {/* Information sur les colonies existantes */}
      {hasColonies && (
        <div className="bg-green-50 border border-green-400 rounded p-3 mb-4">
          <div className="font-medium text-sm mb-2 text-green-800">
            🏘️ Colonies fondées ({playerColoniesWithTerritories.length})
          </div>
          <div className="space-y-1">
            {playerColoniesWithTerritories.map(colonyData => (
              <div key={colonyData.colony.colonyId} className="text-xs text-green-700">
                📍 {colonyData.colony.colonyName} en ({colonyData.colony.x}, {colonyData.colony.y})
                <div className="text-xs text-blue-600 ml-4">
                  🗺️ {colonyData.controlledTerritories.length} case{colonyData.controlledTerritories.length > 1 ? 's' : ''} contrôlée{colonyData.controlledTerritories.length > 1 ? 's' : ''}
                </div>
                {colonyData.availableTerrains.length > 0 && (
                  <div className="text-xs text-purple-600 ml-4">
                    🌍 Terrains: {colonyData.availableTerrains.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-green-600 mt-2">
            💡 Utilisez le menu "GESTION DE TERRITOIRE" pour fonder de nouvelles colonies
          </div>
        </div>
      )}

      {/* Message d'état si pas de colonies (seulement pour joueurs normaux) */}
      {!isGameMaster && !hasColonies && (
        <div className="bg-yellow-50 border border-yellow-400 rounded p-3 mb-4">
          <div className="text-yellow-800 text-sm font-semibold">⚠️ Aucune colonie fondée</div>
          <div className="text-yellow-700 text-xs mb-2">
            Les bâtiments ci-dessous nécessitent d'avoir fondé une colonie pour être construits.
          </div>
          <div className="text-yellow-600 text-xs">
            💡 Workflow: Revendiquez un territoire → Fondez une colonie → Construisez des bâtiments
          </div>
          <div className="text-yellow-600 text-xs">
            📍 Utilisez le menu "GESTION DE TERRITOIRE" pour commencer
          </div>
        </div>
      )}

      {/* Constructions par colonie */}
      {hasColonies ? playerColoniesWithTerritories.map(colonyData => {
        // Trouver la ville correspondante dans le système Nova Imperium
        const city = currentNovaImperium.cities.find(c => c.x === colonyData.colony.x && c.y === colonyData.colony.y) || {
          id: colonyData.colony.colonyId!,
          name: colonyData.colony.colonyName!,
          population: 1,
          buildings: [],
          currentProduction: null,
          productionProgress: 0,
          x: colonyData.colony.x,
          y: colonyData.colony.y
        };
        
        // Filtrer les bâtiments selon les terrains disponibles dans cette colonie
        const availableBuildings = buildings.filter(building => 
          building.requiredTerrain.includes('any') || 
          building.requiredTerrain.some(terrain => colonyData.availableTerrains.includes(terrain))
        );
        
        return (
          <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
            <div className="font-medium text-sm mb-2">
              🏘️ {city.name} ({colonyData.controlledTerritories.length} case{colonyData.controlledTerritories.length > 1 ? 's' : ''})
            </div>
            <div className="text-xs text-purple-600 mb-3">
              🌍 Terrains disponibles: {colonyData.availableTerrains.length > 0 ? colonyData.availableTerrains.join(', ') : 'Aucun'}
            </div>

            {availableBuildings.length === 0 ? (
              <div className="text-center py-4 text-amber-700">
                🚫 Aucun bâtiment disponible avec les terrains actuels
                <div className="text-xs mt-1">
                  Étendez le territoire de votre colonie pour débloquer plus de constructions
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableBuildings.map(building => (
                  <div 
                    key={building.id} 
                    className="flex items-center justify-between bg-white p-2 rounded border"
                    onMouseEnter={(e) => handleMouseEnter(building.id, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{building.icon}</span>
                      <div>
                        <div className="text-xs font-medium">{building.name}</div>
                        <div className="text-xs text-amber-700">
                          {formatResourceCost(building.cost)}
                        </div>
                        <div className="text-xs text-blue-600">
                          ⚡ {isGameMaster ? '∞ PA (Mode MJ)' : `${building.actionPointCost} PA`} | 🕐 {building.constructionTime} tours
                        </div>
                        <div className="text-xs text-green-600">
                          📍 {building.requiredTerrain.map(terrain => getTerrainName(terrain)).join(' ou ')}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleBuild(building.id, city.id)}
                      disabled={
                        city.currentProduction !== null || 
                        city.buildings.includes(building.id as any) || 
                        !canAffordBuilding(building.id)
                      }
                      className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    >
                      {city.buildings.includes(building.id as any) ? 'Construit' : 
                       !canAffordBuilding(building.id) ? 'Ressources insuffisantes' : 'Construire'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }) : !isGameMaster && (
        <div className="bg-amber-50 border border-amber-700 rounded p-3 opacity-50">
          <div className="font-medium text-sm mb-2">Construction (nécessite une colonie)</div>
          <div className="text-amber-700 text-xs">
            Fondez d'abord une colonie via "GESTION DE TERRITOIRE"
          </div>
        </div>
      )}
    </div>
  );
}