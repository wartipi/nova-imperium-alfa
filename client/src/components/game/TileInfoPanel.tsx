import React from "react";
import { useMap } from "../../lib/stores/useMap";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useGameState } from "../../lib/stores/useGameState";
import { HexTile, City, Unit } from "../../lib/game/types";
import { ResourceRevealSystem } from "../../lib/systems/ResourceRevealSystem";
import { TerritorySystem } from "../../lib/systems/TerritorySystem";

// Fonction pour obtenir le symbole et nom des ressources
function getResourceInfo(resource: string) {
  const resourceData = {
    // Ressources communes
    wheat: { symbol: '🌾', name: 'Blé', color: '#FFD700' },
    cattle: { symbol: '🐄', name: 'Bétail', color: '#8B4513' },
    fish: { symbol: '🐟', name: 'Poisson', color: '#4682B4' },
    deer: { symbol: '🦌', name: 'Cerf', color: '#8B4513' },
    // Ressources stratégiques
    stone: { symbol: '🪨', name: 'Pierre', color: '#708090' },
    copper: { symbol: '🔶', name: 'Cuivre', color: '#B87333' },
    iron: { symbol: '⚒️', name: 'Fer', color: '#C0C0C0' },
    coal: { symbol: '⚫', name: 'Charbon', color: '#2F2F2F' },
    // Ressources rares
    gold: { symbol: '🥇', name: 'Or', color: '#FFD700' },
    oil: { symbol: '🛢️', name: 'Pétrole', color: '#8B4513' },
    gems: { symbol: '💎', name: 'Gemmes', color: '#00CED1' },
    // Ressources spéciales archipel
    herbs: { symbol: '🌿', name: 'Herbes', color: '#32CD32' },
    crystals: { symbol: '💠', name: 'Cristaux', color: '#9370DB' },
    crabs: { symbol: '🦀', name: 'Crabes', color: '#FF6347' },
    whales: { symbol: '🐋', name: 'Baleines', color: '#4682B4' },
    sulfur: { symbol: '🔥', name: 'Soufre', color: '#FFD700' },
    obsidian: { symbol: '⚫', name: 'Obsidienne', color: '#2F2F2F' },
    ancient_artifacts: { symbol: '📿', name: 'Artefacts anciens', color: '#DAA520' },
    sacred_stones: { symbol: '🔮', name: 'Pierres sacrées', color: '#8A2BE2' },
  };
  return resourceData[resource as keyof typeof resourceData] || { symbol: '💎', name: resource, color: '#808080' };
}

// Composant pour les informations de colonie
function ColonyInfoSection({ selectedHex }: { selectedHex: HexTile }) {
  const { novaImperiums } = useNovaImperium();
  
  // Chercher une colonie à cette position
  const colony = novaImperiums.flatMap(ni => ni.cities).find(city => city.x === selectedHex.x && city.y === selectedHex.y);
  
  if (!colony) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-700 rounded p-2 mb-3">
      <div className="text-blue-900 font-semibold mb-2">🏘️ Colonie: {colony.name}</div>
      <div className="text-blue-800 text-sm space-y-1">
        <div>Population: {colony.population}/{colony.populationCap}</div>
        <div>Production/tour: {colony.foodPerTurn} nourriture, {colony.productionPerTurn} production</div>
        <div className="font-medium">Bâtiments:</div>
        <div className="ml-2">
          {colony.buildings.map((building, index) => (
            <div key={index} className="text-xs">• {building}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant séparé pour éviter les problèmes de hooks
function ResourceInfoSection({ selectedHex }: { selectedHex: HexTile }) {
  const { getCompetenceLevel, isResourceDiscovered } = usePlayer();
  const { isGameMaster } = useGameState();
  
  const explorationLevel = getCompetenceLevel('exploration');
  const isMasterMode = isGameMaster || false;
  const hexResourceDiscovered = isResourceDiscovered(selectedHex.x, selectedHex.y);
  
  // En mode MJ : toujours afficher les ressources
  // En mode joueur : afficher si exploration niveau 1+ ET zone explorée
  const shouldShowResource = isMasterMode || (explorationLevel >= 1 && hexResourceDiscovered);
  
  console.log(`🔍 Debug ressources: MJ=${isMasterMode}, resource=${selectedHex.resource}, exploration=${explorationLevel}, discovered=${hexResourceDiscovered}, shouldShow=${shouldShowResource}`);
  
  return (
    <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
      <div className="text-amber-900 font-semibold mb-2">💎 Ressources</div>
      <div>
        <div className="text-amber-800 text-sm mb-2">
          <span className="font-medium">Niveau d'exploration: </span>
          <span className={`px-2 py-1 rounded text-xs ${
            explorationLevel >= 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {explorationLevel >= 1 ? `Niveau ${explorationLevel}` : 'Aucun'}
          </span>
          {isMasterMode && (
            <span className="ml-2 px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
              Mode MJ
            </span>
          )}
        </div>
        
        <div className="text-amber-700">
          {selectedHex.resource ? (
            shouldShowResource ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getResourceInfo(selectedHex.resource).symbol}
                </span>
                <span className="font-medium">{getResourceInfo(selectedHex.resource).name}</span>
                {isMasterMode && (
                  <span className="text-xs text-purple-600">
                    ({hexResourceDiscovered ? 'découverte' : 'visible en mode MJ'})
                  </span>
                )}
              </div>
            ) : (
              <div className="text-amber-600 text-sm italic">
                {explorationLevel >= 1 
                  ? 'Zone non explorée - utilisez "Explorer la Zone"'
                  : 'Exploration requise pour révéler les ressources'
                }
              </div>
            )
          ) : (
            <div className="text-amber-600 text-sm italic">
              {shouldShowResource || isMasterMode 
                ? 'Aucune ressource sur cette case'
                : (explorationLevel >= 1 
                    ? 'Zone non explorée - utilisez "Explorer la Zone"'
                    : 'Exploration requise pour révéler les ressources')
              }
            </div>
          )}
        </div>
        
        {/* Debug en mode MJ */}
        {isMasterMode && (
          <div className="mt-2 text-xs text-purple-700 bg-purple-50 p-1 rounded">
            Debug MJ: resource="{selectedHex.resource || 'null'}", discovered={hexResourceDiscovered ? 'oui' : 'non'}
          </div>
        )}
        
        {!isMasterMode && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            💡 <strong>Astuce:</strong> 
            {explorationLevel === 0 
              ? "Apprenez la compétence 'Exploration' niveau 1 puis utilisez l'action 'Explorer la Zone' pour révéler les ressources !"
              : !hexResourceDiscovered 
                ? "Cliquez sur votre avatar et utilisez l'action 'Explorer la Zone' pour révéler les ressources dans votre champ de vision !"
                : "Cette zone a été explorée - les ressources sont visibles si présentes."
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Composant pour l'affichage des informations de territoire
function TerritoryInfoSection({ selectedHex }: { selectedHex: HexTile }) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Force le rafraîchissement toutes les 2 secondes pour détecter les changements
  React.useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // S'assurer que les coordonnées sont des entiers pour la vérification
  const intX = Math.round(selectedHex.x);
  const intY = Math.round(selectedHex.y);
  const territoryInfo = TerritorySystem.isTerritoryClaimed(intX, intY);
  
  console.log(`🏰 Vérification territoire (${intX},${intY}):`, territoryInfo);
  
  if (territoryInfo) {
    return (
      <div className="bg-blue-50 border border-blue-700 rounded p-2 mb-3">
        <div className="text-blue-900 font-semibold mb-2">🏰 Territoire Revendiqué</div>
        <div className="space-y-1 text-sm">
          <div className="text-blue-800">
            <span className="font-medium">Faction:</span> {territoryInfo.factionName}
          </div>
          <div className="text-blue-800">
            <span className="font-medium">Revendiqué par:</span> {territoryInfo.claimedByName}
          </div>
          <div className="text-blue-800">
            <span className="font-medium">Date:</span> {new Date(territoryInfo.claimedDate).toLocaleDateString('fr-FR')}
          </div>
          {territoryInfo.colonyId && (
            <div className="text-blue-800 font-medium">
              🏘️ <span className="font-medium">Colonie établie:</span> {territoryInfo.colonyId}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className="bg-gray-50 border border-gray-300 rounded p-2 mb-3">
        <div className="text-gray-700 font-semibold mb-1">🌍 Territoire Libre</div>
        <div className="text-gray-600 text-sm">
          Ce territoire n'est revendiqué par aucune faction
        </div>
      </div>
    );
  }
}

export function TileInfoPanel() {
  const { selectedHex, setSelectedHex } = useMap();
  const { novaImperiums } = useNovaImperium();
  const { isHexExplored } = usePlayer();
  const { isGameMaster } = useGameState();
  const [forceRefresh, setForceRefresh] = React.useState(0);
  
  // Force un rafraîchissement toutes les 3 secondes pour détecter les changements de territoire
  React.useEffect(() => {
    const interval = setInterval(() => {
      setForceRefresh(prev => prev + 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  if (!selectedHex) return null;

  // Vérifier si la case est explorée ou si on est en mode MJ
  const isHexAccessible = isHexExplored(selectedHex.x, selectedHex.y) || isGameMaster;
  
  // Si la case n'est pas accessible, ne rien afficher du tout
  if (!isHexAccessible) {
    return null;
  }

  const handleClose = () => {
    setSelectedHex(null);
  };

  // Find units on this tile
  const unitsOnTile = novaImperiums.flatMap(ni => 
    ni.units.filter(unit => unit.x === selectedHex.x && unit.y === selectedHex.y)
      .map(unit => ({ ...unit, civColor: ni.color, civName: ni.name }))
  );

  // Find cities on this tile
  const cityOnTile = novaImperiums.flatMap(ni => 
    ni.cities.filter(city => city.x === selectedHex.x && city.y === selectedHex.y)
      .map(city => ({ ...city, civColor: ni.color, civName: ni.name }))
  )[0];

  // Get terrain color for display
  const getTerrainColor = (terrain: string): string => {
    const colors = {
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
    return colors[terrain as keyof typeof colors] || '#808080';
  };

  // Get terrain display name
  const getTerrainName = (terrain: string): string => {
    const names = {
      wasteland: 'Terre en friche',
      forest: 'Forêt',
      mountains: 'Montagne',
      fertile_land: 'Terre fertile',
      hills: 'Colline',
      shallow_water: 'Eau peu profonde',
      deep_water: 'Eau profonde',
      swamp: 'Marais',
      desert: 'Désert',
      sacred_plains: 'Plaine sacrée',
      caves: 'Grotte/Souterrain',
      ancient_ruins: 'Ruines anciennes',
      volcano: 'Volcan',
      enchanted_meadow: 'Prairie enchantée'
    };
    return names[terrain as keyof typeof names] || terrain;
  };

  // Get resource display name
  const getResourceName = (resource: string): string => {
    const names = {
      // Basic resources
      gold: 'Or',
      iron: 'Fer',
      copper: 'Cuivre',
      stone: 'Pierre',
      coal: 'Charbon',
      oil: 'Pétrole',
      wheat: 'Blé',
      cattle: 'Bétail',
      fish: 'Poisson',
      deer: 'Cerf',
      fur: 'Fourrure',
      // Special resources for archipelago world
      herbs: 'Herbes',
      crystals: 'Cristaux',
      sacred_stones: 'Pierres sacrées',
      ancient_artifacts: 'Artefacts anciens',
      sulfur: 'Soufre',
      obsidian: 'Obsidienne',
      crabs: 'Crabes',
      whales: 'Baleines'
    };
    return names[resource as keyof typeof names] || resource;
  };

  // Get terrain symbol/icon
  const getTerrainSymbol = (terrain: string): string => {
    const symbols = {
      wasteland: '⚪',
      forest: '🌲',
      mountains: '⛰️',
      fertile_land: '🌾',
      hills: '🟫',
      shallow_water: '🌊',
      deep_water: '⚓',
      swamp: '🐸',
      desert: '🏜️',
      sacred_plains: '✨',
      caves: '🕳️',
      ancient_ruins: '🏚️',
      volcano: '🌋',
      enchanted_meadow: '🌸'
    };
    return symbols[terrain as keyof typeof symbols] || '⬢';
  };

  return (
    <div className="absolute top-64 right-4 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto pointer-events-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="text-amber-900 font-bold text-lg">
          INFORMATIONS DE LA CASE
          {isGameMaster && (
            <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded">MJ</span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-amber-800 hover:text-amber-900 text-xl font-bold px-2 py-1 rounded hover:bg-amber-300 transition-colors"
          type="button"
        >
          ✕
        </button>
      </div>
      
      {/* Coordinates */}
      <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
        <div className="text-amber-800 font-semibold text-sm">
          Coordonnées: ({selectedHex.x}, {selectedHex.y})
        </div>
      </div>

      {/* Colony Information */}
      <ColonyInfoSection selectedHex={selectedHex} />

      {/* Territory Information */}
      <TerritoryInfoSection selectedHex={selectedHex} />

      {/* Terrain Information */}
      <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
        <div className="text-amber-900 font-semibold mb-2">🌍 Terrain</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg border-2 border-amber-700 flex items-center justify-center text-lg" 
              style={{ backgroundColor: getTerrainColor(selectedHex.terrain) }}
            >
              {getTerrainSymbol(selectedHex.terrain)}
            </div>
            <div>
              <div className="text-amber-800 font-medium">
                {getTerrainName(selectedHex.terrain)}
              </div>
              <div className="text-amber-600 text-xs">
                Type #{(() => {
                  const terrainTypes = {
                    wasteland: 1, forest: 2, mountains: 3, fertile_land: 4, hills: 5, 
                    shallow_water: 6, deep_water: 7, swamp: 8, desert: 9, sacred_plains: 10,
                    caves: 11, ancient_ruins: 12, volcano: 13, enchanted_meadow: 14
                  };
                  return terrainTypes[selectedHex.terrain as keyof typeof terrainTypes] || '?';
                })()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Production Values */}
        <div className="mt-3 text-xs">
          <div className="text-amber-800 font-medium mb-1">📈 Rendements</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center gap-1">
              <span className="text-green-600">🌾</span>
              <span className="text-amber-700">Nourriture: {selectedHex.food}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-orange-600">⚡</span>
              <span className="text-amber-700">Points d'Action: {selectedHex.action_points}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-600">💰</span>
              <span className="text-amber-700">Or: {selectedHex.gold}</span>
            </div>

          </div>
        </div>
        
        {/* River */}
        {selectedHex.hasRiver && (
          <div className="text-amber-700 text-sm mt-2 flex items-center gap-1">
            <span className="text-blue-600">🌊</span>
            <span>Rivière présente</span>
          </div>
        )}
      </div>

      <ResourceInfoSection selectedHex={selectedHex} />

      {/* City Information */}
      {cityOnTile && (
        <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
          <div className="text-amber-900 font-semibold mb-2">🏛️ Ville</div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full border border-amber-700" 
              style={{ backgroundColor: cityOnTile.civColor }}
            />
            <span className="text-amber-800 font-medium">{cityOnTile.name}</span>
          </div>
          <div className="text-amber-700 text-sm">
            Population: {cityOnTile.population}
          </div>
          <div className="text-amber-700 text-sm">
            Civilisation: {cityOnTile.civName}
          </div>
          
          {/* Buildings */}
          {cityOnTile.buildings && cityOnTile.buildings.length > 0 && (
            <div className="mt-2">
              <div className="text-amber-800 font-medium text-sm mb-1">Bâtiments:</div>
              <div className="space-y-1">
                {cityOnTile.buildings.map((building, index) => (
                  <div key={index} className="text-amber-700 text-xs">
                    • {building.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Units Information */}
      {unitsOnTile.length > 0 && (
        <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
          <div className="text-amber-900 font-semibold mb-2">
            ⚔️ Unités ({unitsOnTile.length})
          </div>
          <div className="space-y-2">
            {unitsOnTile.map((unit, index) => (
              <div key={index} className="border-b border-amber-300 pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full border border-amber-700" 
                    style={{ backgroundColor: unit.civColor }}
                  />
                  <span className="text-amber-800 font-medium capitalize">{unit.type}</span>
                </div>
                <div className="text-amber-700 text-sm">
                  Force: {unit.attack}/{unit.defense}
                </div>
                <div className="text-amber-700 text-sm">
                  Santé: {unit.health}/{unit.maxHealth}
                </div>
                <div className="text-amber-700 text-sm">
                  Mouvement: {unit.movement}/{unit.maxMovement}
                </div>
                <div className="text-amber-700 text-sm">
                  Civilisation: {unit.civName}
                </div>
                {unit.experience > 0 && (
                  <div className="text-amber-700 text-sm">
                    Expérience: {unit.experience}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode MJ - Informations techniques complètes */}
      {isGameMaster && (
        <div className="bg-purple-50 border border-purple-700 rounded p-2 mb-3">
          <div className="text-purple-900 font-semibold mb-2">🔧 Informations techniques (MJ)</div>
          <div className="text-xs text-purple-800 space-y-2">
            
            {/* Coordonnées et identifiants */}
            <div className="bg-purple-100 p-2 rounded">
              <div className="font-medium mb-1">Identifiants système:</div>
              <div>• <strong>Position:</strong> x={selectedHex.x}, y={selectedHex.y}</div>
              <div>• <strong>Index carte:</strong> [{selectedHex.x}][{selectedHex.y}]</div>
              <div>• <strong>ID hexagone:</strong> hex_{selectedHex.x}_{selectedHex.y}</div>
            </div>

            {/* Données terrain */}
            <div className="bg-purple-100 p-2 rounded">
              <div className="font-medium mb-1">Données terrain:</div>
              <div>• <strong>Type:</strong> {selectedHex.terrain}</div>
              <div>• <strong>Rivière:</strong> {selectedHex.river ? 'Présente' : 'Absente'}</div>
              <div>• <strong>Ressource:</strong> {selectedHex.resource || 'Aucune'}</div>
            </div>

            {/* Rendements complets */}
            <div className="bg-purple-100 p-2 rounded">
              <div className="font-medium mb-1">Rendements détaillés:</div>
              <div>• <strong>Nourriture:</strong> {selectedHex.food}</div>
              <div>• <strong>Points d'Action:</strong> {selectedHex.actionPoints || selectedHex.action_points || 0}</div>
              <div>• <strong>Or:</strong> {selectedHex.gold}</div>
              <div>• <strong>Commerce:</strong> {selectedHex.commerce || 0}</div>
            </div>

            {/* État exploration */}
            <div className="bg-purple-100 p-2 rounded">
              <div className="font-medium mb-1">État exploration:</div>
              <div>• <strong>Exploré:</strong> {isHexExplored(selectedHex.x, selectedHex.y) ? 'Oui' : 'Non'}</div>
              <div>• <strong>Visible:</strong> {isHexAccessible ? 'Oui' : 'Non'}</div>
            </div>

            {/* Données JSON complètes */}
            <div className="bg-purple-100 p-2 rounded">
              <div className="font-medium mb-1">Structure JSON complète:</div>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify({
                  position: { x: selectedHex.x, y: selectedHex.y },
                  terrain: selectedHex.terrain,
                  resource: selectedHex.resource,
                  river: selectedHex.river,
                  yields: {
                    food: selectedHex.food,
                    actionPoints: selectedHex.actionPoints || selectedHex.action_points || 0,
                    gold: selectedHex.gold,
                    commerce: selectedHex.commerce || 0
                  },
                  exploration: {
                    explored: isHexExplored(selectedHex.x, selectedHex.y),
                    accessible: isHexAccessible
                  },
                  entities: {
                    hasCity: !!cityOnTile,
                    unitCount: unitsOnTile.length,
                    cityData: cityOnTile ? {
                      id: cityOnTile.id,
                      name: cityOnTile.name,
                      population: cityOnTile.population,
                      buildings: cityOnTile.buildings?.length || 0
                    } : null,
                    unitsData: unitsOnTile.map(u => ({
                      type: u.type,
                      health: `${u.health}/${u.maxHealth}`,
                      attack: u.attack,
                      defense: u.defense
                    }))
                  }
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}