import React, { useMemo, useState, useEffect } from "react";
import { useMap } from "../../lib/stores/useMap";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useAuth } from "../../lib/auth/AuthContext";
import { HexTile, City, Unit } from "../../lib/game/types";
import { CityManagementPanel } from "./CityManagementPanel";
import { ResourceRevealSystem } from "../../lib/systems/ResourceRevealSystem";
import { UnifiedTerritorySystem } from "../../lib/systems/UnifiedTerritorySystem";
import { HexPathfinding } from "../../lib/pathfinding/HexPathfinding";
import { HexMath } from "../../lib/systems/HexMath";
import { fetchAllTerritories, fetchAllColonies } from "../../lib/api/territoriesApi";
import { TERRAIN_COSTS, IMPASSABLE } from '../../../../shared/hexTerrainConfig';

// Fonction pour obtenir les informations de coût de déplacement
// Les coûts sont lus depuis shared/hexTerrainConfig (source unique).
// Les libellés, couleurs et niveaux de difficulté restent ici (présentation uniquement).
function getMovementCostInfo(terrain: string) {
  const terrainMeta: Record<string, { name: string; color: string; difficulty: string }> = {
    'fertile_land':    { name: 'Terres fertiles',   color: '#10B981', difficulty: 'Facile' },
    'plains':          { name: 'Plaines',            color: '#86EFAC', difficulty: 'Facile' },
    'sacred_plains':   { name: 'Plaine sacrée',      color: '#F0E68C', difficulty: 'Facile' },
    'enchanted_meadow':{ name: 'Prairie enchantée',  color: '#50C878', difficulty: 'Facile' },
    'forest':          { name: 'Forêt',              color: '#059669', difficulty: 'Modéré' },
    'hills':           { name: 'Collines',           color: '#7C3AED', difficulty: 'Modéré' },
    'wasteland':       { name: 'Terres désolées',    color: '#6B7280', difficulty: 'Modéré' },
    'ancient_ruins':   { name: 'Ruines anciennes',   color: '#8B7355', difficulty: 'Modéré' },
    'desert':          { name: 'Désert',             color: '#F59E0B', difficulty: 'Modéré' },
    'caves':           { name: 'Grottes',            color: '#374151', difficulty: 'Modéré' },
    'tundra':          { name: 'Toundra',            color: '#0EA5E9', difficulty: 'Modéré' },
    'swamp':           { name: 'Marécages',          color: '#059669', difficulty: 'Difficile' },
    'mountains':       { name: 'Montagnes',          color: '#9333EA', difficulty: 'Difficile' },
    'volcano':         { name: 'Volcan',             color: '#DC2626', difficulty: 'Extrême' },
    'shallow_water':   { name: 'Eau peu profonde',   color: '#3B82F6', difficulty: 'Bloqué' },
    'deep_water':      { name: 'Eau profonde',       color: '#1D4ED8', difficulty: 'Bloqué' },
  };
  const cost = TERRAIN_COSTS[terrain] ?? IMPASSABLE;
  const meta = terrainMeta[terrain] ?? { name: terrain, color: '#6B7280', difficulty: 'Inconnu' };
  return { cost, ...meta };
}

// Fonction pour obtenir le symbole et nom des ressources
// V2 : fracten + ressources officielles en tête. V1 legacy conservées avec suffixe.
function getResourceInfo(resource: string) {
  const resourceData = {
    // ─── V2 monnaie ───────────────────────────────────────────────────────────
    fracten:            { symbol: '🪙', name: 'Fracten', color: '#FFD700' },
    // ─── V2 ressources de base ────────────────────────────────────────────────
    food:               { symbol: '🌾', name: 'Nourriture', color: '#7CFC00' },
    wood:               { symbol: '🪵', name: 'Bois', color: '#8B4513' },
    stone:              { symbol: '🪨', name: 'Pierre', color: '#708090' },
    coal:               { symbol: '⚫', name: 'Charbon', color: '#2F2F2F' },
    oil:                { symbol: '🛢️', name: 'Pétrole', color: '#8B4513' },
    herbs:              { symbol: '🌿', name: 'Herbes', color: '#32CD32' },
    common_metals:      { symbol: '⚙️', name: 'Métaux communs', color: '#A8A8A8' },
    leather_fur:        { symbol: '🦊', name: 'Cuir & fourrure', color: '#8B4513' },
    // ─── V2 ressources rares ──────────────────────────────────────────────────
    rare_metals_alloys: { symbol: '🔩', name: 'Métaux & alliages rares', color: '#DAA520' },
    textiles:           { symbol: '🧵', name: 'Textiles', color: '#DDA0DD' },
    spices:             { symbol: '🌶️', name: 'Épices', color: '#FF4500' },
    precious_stones:    { symbol: '💎', name: 'Pierres précieuses', color: '#00CED1' },
    crystals:           { symbol: '🔮', name: 'Cristaux', color: '#9370DB' },
    sacred_stones:      { symbol: '🗿', name: 'Pierres sacrées', color: '#8A2BE2' },
    ancient_artifacts:  { symbol: '🏺', name: 'Artefacts anciens', color: '#DAA520' },
    enchanted_wood:     { symbol: '🌳', name: 'Bois enchanté', color: '#228B22' },
    mana_crystals:      { symbol: '✨', name: 'Cristaux de mana', color: '#9400D3' },
    arcane_stones:      { symbol: '🌀', name: 'Pierres arcaniques', color: '#483D8B' },
    elemental_essence:  { symbol: '🔥', name: 'Essence élémentaire', color: '#FF4500' },
    spirit_stones:      { symbol: '👻', name: 'Pierres spirituelles', color: '#F0F8FF' },
    void_shards:        { symbol: '🌌', name: 'Éclats du vide', color: '#4B0082' },
    // ─── Ressources naturelles (carte/exploration) ────────────────────────────
    deer:               { symbol: '🦌', name: 'Cerf', color: '#8B4513' },
    crabs:              { symbol: '🦀', name: 'Crabes', color: '#FF6347' },
    whales:             { symbol: '🐋', name: 'Baleines', color: '#4682B4' },
    sulfur:             { symbol: '🟡', name: 'Soufre', color: '#FFFF00' },
    obsidian:           { symbol: '⚫', name: 'Obsidienne', color: '#2F2F2F' },
    // ─── V1 legacy — stocks existants uniquement ──────────────────────────────
    wheat:              { symbol: '🌾', name: 'Blé (legacy)', color: '#FFD700' },
    cattle:             { symbol: '🐄', name: 'Bétail (legacy)', color: '#8B4513' },
    fish:               { symbol: '🐟', name: 'Poisson (legacy)', color: '#4682B4' },
    fur:                { symbol: '🧥', name: 'Fourrure (legacy)', color: '#654321' },
    copper:             { symbol: '🔶', name: 'Cuivre (legacy)', color: '#B87333' },
    iron:               { symbol: '⚒️', name: 'Fer (legacy)', color: '#C0C0C0' },
    gold:               { symbol: '🥇', name: 'Or (legacy)', color: '#FFD700' },
    gems:               { symbol: '💠', name: 'Gemmes (legacy)', color: '#00CED1' },
  };
  return resourceData[resource as keyof typeof resourceData] || { symbol: '❓', name: resource, color: '#808080' };
}

// Composant pour les informations de colonie
function ColonyInfoSection({
  selectedHex,
  onManageCity,
}: {
  selectedHex: HexTile;
  onManageCity?: (cityId: string) => void;
}) {
  const { novaImperiums, currentNovaImperium } = useNovaImperium();
  
  // Chercher une colonie à cette position
  const colony = novaImperiums.flatMap(ni => ni.cities).find(city => city.x === selectedHex.x && city.y === selectedHex.y);
  
  if (!colony) return null;

  // Le bouton "Gérer" n'est actif que si la ville appartient au joueur courant
  const isOwnCity = currentNovaImperium?.cities.some(c => c.id === colony.id) ?? false;
  const barracksLevel = colony.buildingLevels?.barracks ?? 0;
  
  return (
    <div className="bg-blue-50 border border-blue-700 rounded p-2 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div className="text-blue-900 font-semibold">🏘️ Colonie: {colony.displayName || colony.name}</div>
        {isOwnCity && onManageCity && (
          <button
            onClick={() => onManageCity(colony.id)}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded font-medium ml-2 flex-shrink-0"
          >
            ⚙️ Gérer la ville
          </button>
        )}
      </div>
      <div className="text-blue-800 text-sm space-y-1">
        <div>Population: {colony.population}/{colony.populationCap}</div>
        <div>Production/tour: {colony.foodPerTurn} 🌾, {colony.productionPerTurn} ⚙️</div>
        <div>
          🏗️ Caserne :{' '}
          {barracksLevel > 0 ? `Nv.${barracksLevel}` : 'absente'}
        </div>
        {colony.currentProduction && (
          <div className="text-green-700">⚙️ En production : {colony.currentProduction.name}</div>
        )}
        {colony.buildings.length > 0 && (
          <>
            <div className="font-medium">Bâtiments ({colony.buildings.length}) :</div>
            <div className="ml-2">
              {colony.buildings.map((building, index) => {
                const lvl = colony.buildingLevels?.[building];
                return (
                  <div key={index} className="text-xs">
                    • {building}{lvl != null && lvl > 0 ? ` Nv.${lvl}` : ''}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Composant séparé pour éviter les problèmes de hooks
function ResourceInfoSection({ selectedHex }: { selectedHex: HexTile }) {
  const { getCompetenceLevel, isResourceDiscovered } = usePlayer();
  const { isAdmin, role } = useAuth();
  
  const explorationLevel = getCompetenceLevel('exploration');
  const hexResourceDiscovered = isResourceDiscovered(selectedHex.x, selectedHex.y);
  
  // Admin : toujours afficher les ressources
  // Joueur : afficher si exploration niveau 1+ ET zone explorée
  const shouldShowResource = isAdmin || (explorationLevel >= 1 && hexResourceDiscovered);
  
  console.log(`🔍 Debug ressources: admin=${isAdmin}, resource=${selectedHex.resource}, exploration=${explorationLevel}, discovered=${hexResourceDiscovered}, shouldShow=${shouldShowResource}`);
  
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
          {isAdmin && (
            <span className="ml-2 px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
              Admin
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
                {isAdmin && (
                  <span className="text-xs text-purple-600">
                    ({hexResourceDiscovered ? 'découverte' : 'visible (admin)'})
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
              {shouldShowResource 
                ? 'Aucune ressource sur cette case'
                : (explorationLevel >= 1 
                    ? 'Zone non explorée - utilisez "Explorer la Zone"'
                    : 'Exploration requise pour révéler les ressources')
              }
            </div>
          )}
        </div>
        
        {/* Debug admin */}
        {role === 'admin' && (
          <div className="mt-2 text-xs text-purple-700 bg-purple-50 p-1 rounded">
            Debug Admin: resource="{selectedHex.resource || 'null'}", discovered={hexResourceDiscovered ? 'oui' : 'non'}
          </div>
        )}
        
        {!isAdmin && (
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

// Composant pour les informations de déplacement
function MovementInfoSection({ selectedHex }: { selectedHex: HexTile }) {
  const player = usePlayer();
  const { getAvatarPosition, actionPoints } = player;
  const { mapData } = useMap();
  
  const avatarPos = getAvatarPosition();
  const explorationLevel = player.explorationLevel || 0;
  const baseCost = getMovementCostInfo(selectedHex.terrain).cost;
  
  // Calculer le coût réduit avec exploration
  const reducedCost = useMemo(() => {
    if (!mapData) return baseCost;
    return HexPathfinding.getTerrainCost(selectedHex.x, selectedHex.y, mapData, explorationLevel);
  }, [selectedHex, mapData, explorationLevel, baseCost]);
  
  const movementInfo = {
    ...getMovementCostInfo(selectedHex.terrain),
    cost: reducedCost
  };
  
  // Calculer la distance depuis la position actuelle
  const distance = HexMath.hexDistance(avatarPos.x, avatarPos.y, selectedHex.x, selectedHex.y);
  
  // Calculer le coût total du trajet si possible
  let totalCost = 0;
  let pathFound = false;
  
  if (distance > 0 && mapData && mapData.length > 0) {
    try {
      const pathResult = HexPathfinding.findPath(
        avatarPos.x,
        avatarPos.y, 
        selectedHex.x,
        selectedHex.y,
        mapData,
        explorationLevel
      );
      if (pathResult.success) {
        totalCost = pathResult.totalCost;
        pathFound = true;
      }
    } catch (error) {
      // En cas d'erreur de pathfinding, utiliser une estimation
      totalCost = distance * reducedCost;
    }
  }
  
  const isCurrentPosition = distance === 0;
  const canAfford = totalCost <= actionPoints;
  
  return (
    <div className="bg-green-50 border border-green-700 rounded p-2 mb-3">
      <div className="text-green-900 font-semibold mb-2">🚶 Déplacement</div>
      
      <div className="space-y-2 text-sm">
        {/* Coût de terrain */}
        <div className="flex items-center justify-between">
          <span className="text-green-800">Coût du terrain:</span>
          <div className="flex items-center gap-2">
            {baseCost !== reducedCost && baseCost < 999 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 line-through">{baseCost} PA</span>
                <span 
                  className="px-2 py-1 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: '#059669' }}
                >
                  {reducedCost} PA
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  (-{baseCost - reducedCost} Exploration Lv.{explorationLevel})
                </span>
              </div>
            ) : (
              <span 
                className={`px-2 py-1 rounded text-xs font-medium text-white`}
                style={{ backgroundColor: movementInfo.color }}
              >
                {movementInfo.cost === 999 ? 'Bloqué' : `${movementInfo.cost} PA`}
              </span>
            )}
            <span className="text-xs text-gray-600">({movementInfo.difficulty})</span>
          </div>
        </div>
        
        {/* Distance et coût total */}
        {isCurrentPosition ? (
          <div className="text-green-600 text-sm italic font-medium">
            📍 Position actuelle
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-green-800">Distance:</span>
              <span className="font-medium">{distance} hexagone{distance > 1 ? 's' : ''}</span>
            </div>
            
            {pathFound ? (
              <div className="flex items-center justify-between">
                <span className="text-green-800">Coût total trajet:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${canAfford ? 'text-green-700' : 'text-red-600'}`}>
                    {totalCost} PA
                  </span>
                  {!canAfford && (
                    <span className="text-xs text-red-600">(Insuffisant)</span>
                  )}
                </div>
              </div>
            ) : movementInfo.cost < 999 && (
              <div className="flex items-center justify-between">
                <span className="text-green-800">Coût estimé:</span>
                <span className="font-medium text-gray-600">~{distance * movementInfo.cost} PA</span>
              </div>
            )}
            
            {/* Points d'action actuels */}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-green-800">PA disponibles:</span>
              <span className="font-bold text-blue-600">{actionPoints} PA</span>
            </div>
            
            {/* Statut de faisabilité */}
            {movementInfo.cost === 999 ? (
              <div className="bg-red-100 text-red-800 text-xs p-2 rounded">
                ❌ Terrain inaccessible
              </div>
            ) : !pathFound && distance > 0 ? (
              <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded">
                ⚠️ Chemin non calculable - terrain bloqué
              </div>
            ) : canAfford && distance > 0 ? (
              <div className="bg-green-100 text-green-800 text-xs p-2 rounded">
                ✅ Déplacement possible
              </div>
            ) : distance > 0 ? (
              <div className="bg-red-100 text-red-800 text-xs p-2 rounded">
                ❌ Points d'action insuffisants
              </div>
            ) : null}
          </>
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

  // Listener nova:logistic-refresh → recharge la façade locale depuis le serveur
  React.useEffect(() => {
    const handler = async () => {
      try {
        const { originWorldX, originWorldY } = useMap.getState();
        const [serverTerritories, serverColonies] = await Promise.all([
          fetchAllTerritories(),
          fetchAllColonies(),
        ]);
        UnifiedTerritorySystem.loadFromServer(serverTerritories, serverColonies, originWorldX, originWorldY);
        setRefreshKey(prev => prev + 1);
      } catch (e) {
        // silencieux — le polling 2s prendra le relais
      }
    };
    window.addEventListener('nova:logistic-refresh', handler);
    return () => window.removeEventListener('nova:logistic-refresh', handler);
  }, []);
  
  // S'assurer que les coordonnées sont des entiers pour la vérification
  const intX = Math.round(selectedHex.x);
  const intY = Math.round(selectedHex.y);
  const territoryInfo = UnifiedTerritorySystem.getTerritory(intX, intY);
  
  console.log(`🏰 Vérification territoire (${intX},${intY}):`, territoryInfo);
  
  if (territoryInfo) {
    const ownerLabel =
      territoryInfo.ownerType === 'player'
        ? (territoryInfo.ownerPlayerName ?? territoryInfo.playerName ?? '—')
        : (territoryInfo.ownerFactionName ?? territoryInfo.factionName ?? '—');
    const ownerKind = territoryInfo.ownerType === 'player' ? 'Joueur' : 'Faction';

    return (
      <div className="bg-blue-50 border border-blue-700 rounded p-2 mb-3">
        <div className="text-blue-900 font-semibold mb-2">🏰 Territoire Revendiqué</div>
        <div className="space-y-1 text-sm">
          <div className="text-blue-800">
            <span className="font-medium">{ownerKind} :</span> {ownerLabel}
          </div>
          <div className="text-blue-800">
            <span className="font-medium">Date :</span> {new Date(territoryInfo.claimedDate).toLocaleDateString('fr-FR')}
          </div>
          {territoryInfo.colonyName && (
            <div className="text-blue-800 font-medium">
              🏘️ <span className="font-medium">Colonie :</span> {territoryInfo.colonyName}
            </div>
          )}
          {territoryInfo.managingColonyName ? (
            <div className="text-blue-800">
              🏛️ <span className="font-medium">Ville gestionnaire :</span> {territoryInfo.managingColonyName}
            </div>
          ) : (
            <div className="text-blue-600 italic text-xs">
              Territoire non assigné à une ville
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
          Ce territoire n'est revendiqué par aucun joueur ni faction
        </div>
      </div>
    );
  }
}

export function TileInfoPanel() {
  const { selectedHex, setSelectedHex } = useMap();
  const { novaImperiums } = useNovaImperium();
  const { isHexExplored } = usePlayer();
  const { isAdmin, role } = useAuth();
  // Gérer la ville depuis la carte
  const [managedCityId, setManagedCityId] = useState<string | null>(null);

  // Raccourci clic droit carte → ouvrir gestion de ville
  useEffect(() => {
    const handler = (e: Event) => {
      const cityId = (e as CustomEvent<{ cityId: string }>).detail?.cityId;
      if (cityId) setManagedCityId(cityId);
    };
    window.addEventListener('nova:manage-city', handler);
    return () => window.removeEventListener('nova:manage-city', handler);
  }, []);

  if (!selectedHex) return null;

  // Vérifier si la case est explorée ou si on est en mode MJ
  const isHexAccessible = isHexExplored(selectedHex.x, selectedHex.y) || isAdmin;
  
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

  // Get resource display name — V2 officielles en principal, V1 legacy avec suffixe
  const getResourceName = (resource: string): string => {
    const names = {
      // V2 monnaie + ressources officielles
      fracten:            'Fracten',
      food:               'Nourriture',
      wood:               'Bois',
      stone:              'Pierre',
      coal:               'Charbon',
      oil:                'Pétrole',
      herbs:              'Herbes',
      common_metals:      'Métaux communs',
      leather_fur:        'Cuir & fourrure',
      rare_metals_alloys: 'Métaux & alliages rares',
      textiles:           'Textiles',
      spices:             'Épices',
      precious_stones:    'Pierres précieuses',
      crystals:           'Cristaux',
      sacred_stones:      'Pierres sacrées',
      ancient_artifacts:  'Artefacts anciens',
      enchanted_wood:     'Bois enchanté',
      mana_crystals:      'Cristaux de mana',
      arcane_stones:      'Pierres arcaniques',
      elemental_essence:  'Essence élémentaire',
      spirit_stones:      'Pierres spirituelles',
      void_shards:        'Éclats du vide',
      // Ressources naturelles (carte/exploration)
      deer:               'Cerf',
      sulfur:             'Soufre',
      obsidian:           'Obsidienne',
      crabs:              'Crabes',
      whales:             'Baleines',
      // V1 legacy
      gold:               'Or (legacy)',
      iron:               'Fer (legacy)',
      copper:             'Cuivre (legacy)',
      wheat:              'Blé (legacy)',
      cattle:             'Bétail (legacy)',
      fish:               'Poisson (legacy)',
      fur:                'Fourrure (legacy)',
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
    <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-64 max-h-[60vh] overflow-y-auto pointer-events-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="text-amber-900 font-bold text-lg">
          INFORMATIONS DE LA CASE
          {role === 'admin' && (
            <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded">Admin</span>
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
      <ColonyInfoSection selectedHex={selectedHex} onManageCity={setManagedCityId} />

      {/* Territory Information */}
      <TerritoryInfoSection selectedHex={selectedHex} />

      {/* Movement Information */}
      <MovementInfoSection selectedHex={selectedHex} />


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
              <span className="text-amber-700">Fracten: {selectedHex.fracten}</span>
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

      {/* Informations techniques (Admin) */}
      {role === 'admin' && (
        <div className="bg-purple-50 border border-purple-700 rounded p-2 mb-3">
          <div className="text-purple-900 font-semibold mb-2">🔧 Informations techniques (Admin)</div>
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
              <div>• <strong>Fracten:</strong> {selectedHex.fracten}</div>
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
                    fracten: selectedHex.fracten,
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

      {/* Panneau de gestion de ville déclenché depuis la carte */}
      {managedCityId && (
        <CityManagementPanel
          cityId={managedCityId}
          onClose={() => setManagedCityId(null)}
        />
      )}

    </div>
  );
}