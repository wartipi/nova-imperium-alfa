import React, { useState } from 'react';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useGameState } from '../../lib/stores/useGameState';
import { UnifiedTerritorySystem } from '../../lib/systems/UnifiedTerritorySystem';
import { getBuildingCost, canAffordAction } from '../../lib/game/ActionPointsCosts';
import { Resources } from '../../lib/game/types';

interface CityManagementPanelProps {
  cityId: string;
  onClose: () => void;
}

export function CityManagementPanel({ cityId, onClose }: CityManagementPanelProps) {
  const { currentNovaImperium, buildInCity, recruitUnit } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const { isGameMaster } = useGameState();
  const [activeTab, setActiveTab] = useState<'overview' | 'construction' | 'recruitment'>('overview');

  if (!currentNovaImperium) return null;

  const city = currentNovaImperium.cities.find(c => c.id === cityId);
  if (!city) return null;

  // Obtenir les territoires contrôlés par cette ville/colonie
  const colonyData = UnifiedTerritorySystem.getPlayerColoniesWithTerritories('player')
    .find(c => c.colony.x === city.x && c.colony.y === city.y);

  const availableTerrains = colonyData?.availableTerrains || [];

  // Bâtiments disponibles pour cette ville basés sur ses terrains
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
      description: 'Extraction de ressources minérales', 
      icon: '⛏️', 
      category: 'Production',
      requiredTerrain: ['mountains'],
      actionPointCost: 20
    },
    // === UNIVERSEL (any terrain) ===
    { 
      id: 'barracks', 
      name: 'Caserne', 
      cost: { wood: 15, stone: 10, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Formation et entraînement des unités militaires', 
      icon: '🏭', 
      category: 'Militaire',
      requiredTerrain: ['any'],
      actionPointCost: 25
    }
  ];

  // Unités disponibles pour le recrutement
  const units = [
    {
      id: 'warrior',
      name: 'Guerrier',
      cost: { gold: 50, action_points: 15 },
      description: 'Fantassin de base avec épée et bouclier',
      icon: '⚔️',
      category: 'Infanterie',
      attack: 4,
      defense: 3,
      health: 25,
      movement: 2
    },
    {
      id: 'archer',
      name: 'Archer',
      cost: { gold: 60, wood: 10, action_points: 18 },
      description: 'Unité de distance avec arc et flèches',
      icon: '🏹',
      category: 'Distance',
      attack: 5,
      defense: 2,
      health: 20,
      movement: 2
    },
    {
      id: 'knight',
      name: 'Chevalier',
      cost: { gold: 120, iron: 15, action_points: 30 },
      description: 'Cavalerie lourde en armure',
      icon: '🐎',
      category: 'Cavalerie',
      attack: 7,
      defense: 6,
      health: 40,
      movement: 3,
      requiredBuilding: 'barracks'
    }
  ];

  // Filtrer les bâtiments selon les terrains disponibles
  const availableBuildings = buildings.filter(building => 
    building.requiredTerrain.includes('any') || 
    building.requiredTerrain.some(terrain => availableTerrains.includes(terrain))
  );

  // Filtrer les unités selon les bâtiments construits
  const availableUnits = units.filter(unit => 
    !unit.requiredBuilding || city.buildings.includes(unit.requiredBuilding as any)
  );

  const handleBuild = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    if (!isGameMaster) {
      if (actionPoints < building.actionPointCost) {
        alert(`Pas assez de Points d'Action (${building.actionPointCost} PA requis)`);
        return;
      }
      spendActionPoints(building.actionPointCost);
    }

    buildInCity(cityId, buildingId as any);
    alert(`${building.name} en construction dans ${city.name} !`);
  };

  const handleRecruit = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    if (!isGameMaster) {
      if (actionPoints < (unit.cost.action_points || 0)) {
        alert(`Pas assez de Points d'Action (${unit.cost.action_points} PA requis)`);
        return;
      }
      spendActionPoints(unit.cost.action_points || 0);
    }

    recruitUnit(cityId, unitId as any);
    alert(`${unit.name} recruté dans ${city.name} !`);
  };

  const formatResourceCost = (cost: Resources) => {
    return Object.entries(cost)
      .filter(([key, value]) => key !== 'action_points' && value > 0)
      .map(([key, value]) => {
        const icons: { [key: string]: string } = {
          gold: '💰',
          wood: '🌲',
          stone: '🪨',
          iron: '⚒️',
          food: '🌾'
        };
        return `${icons[key] || '❓'} ${value}`;
      })
      .join(', ');
  };

  const getTerrainName = (terrain: string) => {
    const names: { [key: string]: string } = {
      fertile_land: 'Terre fertile',
      forest: 'Forêt',
      mountains: 'Montagnes',
      wasteland: 'Terre en friche',
      hills: 'Collines',
      any: 'Universel'
    };
    return names[terrain] || terrain;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-amber-50 border-4 border-amber-800 rounded-lg w-full max-w-4xl h-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* En-tête */}
        <div className="bg-amber-700 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">🏘️ Gestion de {city.name}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-amber-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Onglets */}
        <div className="bg-amber-100 border-b border-amber-400 p-2">
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: '📊 Vue d\'ensemble', icon: '📊' },
              { id: 'construction', label: '🏗️ Construction', icon: '🏗️' },
              { id: 'recruitment', label: '⚔️ Recrutement', icon: '⚔️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded font-medium ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white border border-amber-400 rounded p-4">
                <h3 className="font-bold text-lg mb-3">🏘️ Informations de la ville</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Position:</strong> ({city.x}, {city.y})</div>
                    <div><strong>Population:</strong> {city.population}</div>
                    <div><strong>Bâtiments:</strong> {city.buildings.length}</div>
                  </div>
                  <div>
                    <div><strong>Territoires contrôlés:</strong> {colonyData?.controlledTerritories.length || 1}</div>
                    <div><strong>Terrains disponibles:</strong> {availableTerrains.length}</div>
                    {city.currentProduction && (
                      <div><strong>En construction:</strong> {city.currentProduction}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Terrains disponibles */}
              <div className="bg-green-50 border border-green-400 rounded p-4">
                <h4 className="font-bold mb-2">🌍 Terrains contrôlés</h4>
                <div className="flex flex-wrap gap-2">
                  {availableTerrains.map(terrain => (
                    <span key={terrain} className="bg-green-200 px-3 py-1 rounded text-sm">
                      {getTerrainName(terrain)}
                    </span>
                  ))}
                  {availableTerrains.length === 0 && (
                    <span className="text-gray-500 text-sm">Aucun terrain spécialisé détecté</span>
                  )}
                </div>
              </div>

              {/* Bâtiments construits */}
              <div className="bg-blue-50 border border-blue-400 rounded p-4">
                <h4 className="font-bold mb-2">🏗️ Bâtiments construits</h4>
                <div className="grid grid-cols-2 gap-2">
                  {city.buildings.map(building => (
                    <div key={building} className="bg-blue-200 px-3 py-2 rounded text-sm">
                      {buildings.find(b => b.id === building)?.name || building}
                    </div>
                  ))}
                  {city.buildings.length === 0 && (
                    <span className="text-gray-500 text-sm col-span-2">Aucun bâtiment construit</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Construction */}
          {activeTab === 'construction' && (
            <div className="space-y-4">
              <div className="bg-amber-100 border border-amber-400 rounded p-3">
                <h3 className="font-bold mb-2">🏗️ Bâtiments disponibles</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Construisez des bâtiments en fonction des terrains contrôlés par votre ville.
                </p>
                {isGameMaster && (
                  <div className="bg-purple-100 border border-purple-400 rounded p-2 mb-3">
                    <div className="text-purple-800 text-sm font-semibold">🎯 Mode Maître de Jeu</div>
                    <div className="text-purple-700 text-xs">Construction instantanée et gratuite</div>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {availableBuildings.length === 0 ? (
                  <div className="text-center py-8 text-amber-700">
                    <div className="text-lg mb-2">🚫 Aucun bâtiment disponible</div>
                    <div className="text-sm">
                      Étendez le territoire de votre ville pour débloquer plus de constructions
                    </div>
                  </div>
                ) : (
                  availableBuildings.map(building => (
                    <div key={building.id} className="bg-white border border-amber-400 rounded p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{building.icon}</span>
                            <h4 className="font-bold">{building.name}</h4>
                            <span className="bg-amber-200 px-2 py-1 rounded text-xs">{building.category}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{building.description}</p>
                          <div className="text-xs space-y-1">
                            <div><strong>Coût:</strong> {formatResourceCost(building.cost)}</div>
                            <div><strong>Points d'Action:</strong> {isGameMaster ? '0 (Mode MJ)' : `${building.actionPointCost} PA`}</div>
                            <div><strong>Temps:</strong> {building.constructionTime} tours</div>
                            <div><strong>Terrain requis:</strong> {building.requiredTerrain.map(getTerrainName).join(' ou ')}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBuild(building.id)}
                          disabled={
                            city.currentProduction !== null || 
                            city.buildings.includes(building.id as any)
                          }
                          className="ml-4 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {city.buildings.includes(building.id as any) ? 'Construit' : 
                           city.currentProduction !== null ? 'En construction' : 'Construire'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Recrutement */}
          {activeTab === 'recruitment' && (
            <div className="space-y-4">
              <div className="bg-red-100 border border-red-400 rounded p-3">
                <h3 className="font-bold mb-2">⚔️ Unités disponibles</h3>
                <p className="text-sm text-red-700 mb-3">
                  Recrutez des unités pour défendre vos territoires et conquérir de nouvelles terres.
                </p>
                {isGameMaster && (
                  <div className="bg-purple-100 border border-purple-400 rounded p-2 mb-3">
                    <div className="text-purple-800 text-sm font-semibold">🎯 Mode Maître de Jeu</div>
                    <div className="text-purple-700 text-xs">Recrutement instantané et gratuit</div>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {availableUnits.length === 0 ? (
                  <div className="text-center py-8 text-red-700">
                    <div className="text-lg mb-2">🚫 Aucune unité disponible</div>
                    <div className="text-sm">
                      Construisez une caserne pour débloquer le recrutement
                    </div>
                  </div>
                ) : (
                  availableUnits.map(unit => (
                    <div key={unit.id} className="bg-white border border-red-400 rounded p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{unit.icon}</span>
                            <h4 className="font-bold">{unit.name}</h4>
                            <span className="bg-red-200 px-2 py-1 rounded text-xs">{unit.category}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{unit.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div><strong>Coût:</strong> {formatResourceCost(unit.cost)}</div>
                              <div><strong>Points d'Action:</strong> {isGameMaster ? '0 (Mode MJ)' : `${unit.cost.action_points || 0} PA`}</div>
                            </div>
                            <div>
                              <div><strong>Attaque:</strong> {unit.attack} | <strong>Défense:</strong> {unit.defense}</div>
                              <div><strong>Santé:</strong> {unit.health} | <strong>Mouvement:</strong> {unit.movement}</div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRecruit(unit.id)}
                          className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Recruter
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}