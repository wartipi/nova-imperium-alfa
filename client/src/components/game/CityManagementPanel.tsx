import React, { useState } from 'react';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { useGameState } from '../../lib/stores/useGameState';
import { UnifiedTerritorySystem } from '../../lib/systems/UnifiedTerritorySystem';
import { ConstructionPanelZustand } from './ConstructionPanelZustand';
import { RecruitmentPanelZustand } from './RecruitmentPanelZustand';

interface CityManagementPanelProps {
  cityId: string;
  onClose: () => void;
}

export function CityManagementPanel({ cityId, onClose }: CityManagementPanelProps) {
  const { currentNovaImperium } = useNovaImperium();
  const { isGameMaster } = useGameState();
  const [activeTab, setActiveTab] = useState<'overview' | 'construction' | 'recruitment'>('overview');
  
  // MIGRATION FINALISÉE - Nouveaux systèmes Zustand activés définitivement
  const useZustandSystems = true;

  if (!currentNovaImperium) return null;

  const city = currentNovaImperium.cities.find(c => c.id === cityId);
  if (!city) return null;

  // Obtenir les territoires contrôlés par cette ville/colonie
  const colonyData = UnifiedTerritorySystem.getPlayerColoniesWithTerritories('player')
    .find(c => c.colony.x === city.x && c.colony.y === city.y);

  const availableTerrains = UnifiedTerritorySystem.getColonyAvailableTerrains(cityId);
  
  console.log('🏘️ CityManagementPanel - Debug:', {
    cityId,
    cityPosition: { x: city.x, y: city.y },
    colonyData,
    availableTerrains,
    allColonies: UnifiedTerritorySystem.getPlayerColoniesWithTerritories('player')
  });

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
              { 
                id: 'construction', 
                label: `🏗️ Construction ${useZustandSystems ? '(Nova)' : '(Legacy)'}`, 
                icon: '🏗️' 
              },
              { 
                id: 'recruitment', 
                label: `⚔️ Recrutement ${useZustandSystems ? '(Nova)' : '(Legacy)'}`, 
                icon: '⚔️' 
              }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
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

        {/* Contenu */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-amber-100 border border-amber-400 rounded p-4">
                <h3 className="font-bold mb-3">📊 Informations de la ville</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Position:</strong> ({city.x}, {city.y})
                  </div>
                  <div>
                    <strong>Joueur:</strong> {city.playerName}
                  </div>
                  <div>
                    <strong>Faction:</strong> {city.factionName}
                  </div>
                  <div>
                    <strong>Territoires contrôlés:</strong> {colonyData?.controlledTerritories.length || 0}
                  </div>
                </div>
              </div>

              <div className="bg-green-100 border border-green-400 rounded p-4">
                <h3 className="font-bold mb-3">🏞️ Terrains disponibles</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTerrains.length > 0 ? (
                    availableTerrains.map(terrain => (
                      <span key={terrain} className="bg-green-200 px-3 py-1 rounded text-sm font-medium">
                        {terrain === 'wasteland' ? 'Terre en friche' :
                         terrain === 'forest' ? 'Forêt' :
                         terrain === 'mountains' ? 'Montagnes' :
                         terrain === 'fertile_land' ? 'Terre fertile' :
                         terrain}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Aucun terrain contrôlé</span>
                  )}
                </div>
              </div>

              <div className="bg-blue-100 border border-blue-400 rounded p-4">
                <h3 className="font-bold mb-3">🏗️ Bâtiments construits</h3>
                <div className="flex flex-wrap gap-2">
                  {city.buildings && city.buildings.length > 0 ? (
                    city.buildings.map((building, index) => (
                      <span key={index} className="bg-blue-200 px-3 py-1 rounded text-sm font-medium">
                        {building}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Aucun bâtiment construit</span>
                  )}
                </div>
              </div>

              {isGameMaster && (
                <div className="bg-purple-100 border border-purple-400 rounded p-4">
                  <h3 className="font-bold mb-2 text-purple-800">🎯 Mode Maître de Jeu Actif</h3>
                  <div className="text-purple-700 text-sm space-y-1">
                    <div>• Construction et recrutement instantanés</div>
                    <div>• Coûts et restrictions ignorés</div>
                    <div>• Accès à tous les systèmes</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Construction */}
          {activeTab === 'construction' && (
            <div className="space-y-4">
              <div className="bg-blue-100 border border-blue-400 rounded p-3">
                <h3 className="font-bold mb-2">🏗️ Nouveau Système de Construction (Zustand)</h3>
                <p className="text-sm text-blue-700 mb-1">
                  Système Nova Imperium avec 18 bâtiments organisés par terrain
                </p>
                <div className="text-xs text-blue-600">
                  ✅ Migration progressive activée - Stats collaboratives en cours
                </div>
              </div>
              <ConstructionPanelZustand />
            </div>
          )}

          {/* Recrutement */}
          {activeTab === 'recruitment' && (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-400 rounded p-3">
                <h3 className="font-bold mb-2">⚔️ Nouveau Système de Recrutement (Zustand)</h3>
                <p className="text-sm text-green-700 mb-1">
                  Système Nova Imperium avec 15 unités organisées par catégorie
                </p>
                <div className="text-xs text-green-600">
                  ✅ Migration progressive activée - Stats collaboratives en cours
                </div>
              </div>
              <RecruitmentPanelZustand />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}