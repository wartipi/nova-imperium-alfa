import React from "react";
import { useResources } from "../../lib/stores/useResources";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";

interface BuildingCost {
  gold: number;
  stone: number;
  wood: number;
  iron?: number;
}

interface BuildingType {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: BuildingCost;
  constructionTime: number;
  yields: {
    food?: number;
    gold?: number;
    culture?: number;
    science?: number;
  };
}

const availableBuildings: BuildingType[] = [
  {
    id: 'granary',
    name: 'Grenier',
    icon: '🏪',
    description: 'Augmente la production de nourriture',
    cost: { gold: 60, stone: 30, wood: 40 },
    constructionTime: 2,
    yields: { food: 3 }
  },
  {
    id: 'market',
    name: 'Marché',
    icon: '🏬',
    description: 'Génère de l\'or par tour',
    cost: { gold: 80, stone: 50, wood: 30 },
    constructionTime: 3,
    yields: { gold: 4 }
  },
  {
    id: 'barracks',
    name: 'Caserne',
    icon: '🏰',
    description: 'Permet de recruter des unités militaires',
    cost: { gold: 100, stone: 60, wood: 40, iron: 20 },
    constructionTime: 4,
    yields: {}
  },
  {
    id: 'library',
    name: 'Bibliothèque',
    icon: '📚',
    description: 'Augmente la recherche scientifique',
    cost: { gold: 120, stone: 40, wood: 80 },
    constructionTime: 3,
    yields: { science: 3 }
  },
  {
    id: 'temple',
    name: 'Temple',
    icon: '⛪',
    description: 'Génère de la culture et améliore la satisfaction',
    cost: { gold: 150, stone: 80, wood: 60 },
    constructionTime: 4,
    yields: { culture: 3, gold: 1 }
  }
];

export function ConstructionPanelZustand() {
  const { resources, spendResources } = useResources();
  const { currentNovaImperium, buildInCity } = useNovaImperium();

  const canAfford = (cost: BuildingCost): boolean => {
    return resources.gold >= cost.gold &&
           resources.stone >= cost.stone &&
           resources.wood >= cost.wood &&
           (!cost.iron || resources.iron >= cost.iron);
  };

  const handleConstruct = (building: BuildingType) => {
    if (!currentNovaImperium?.cities?.length) {
      alert("Aucune ville disponible pour construire");
      return;
    }

    if (!canAfford(building.cost)) {
      alert(`Ressources insuffisantes pour construire ${building.name}`);
      return;
    }

    // Convertir le coût en format compatible Zustand
    const resourceCost: any = {
      gold: building.cost.gold,
      stone: building.cost.stone,
      wood: building.cost.wood
    };
    
    if (building.cost.iron) resourceCost.iron = building.cost.iron;

    // Dépenser les ressources via Zustand
    const success = spendResources(resourceCost);
    
    if (success) {
      console.log(`✅ Construction ${building.name} réussie - Ressources déduites:`, resourceCost);
      
      // Ajouter le bâtiment au système NovaImperium
      const firstCity = currentNovaImperium.cities[0];
      buildInCity(firstCity.id, building.id, resourceCost, building.constructionTime, false);
    } else {
      alert(`Erreur lors de la construction de ${building.name}`);
    }
  };

  const getYieldsText = (yields: any): string => {
    const yieldTexts: string[] = [];
    if (yields.food) yieldTexts.push(`🌾 +${yields.food} nourriture`);
    if (yields.gold) yieldTexts.push(`💰 +${yields.gold} or`);
    if (yields.culture) yieldTexts.push(`🎭 +${yields.culture} culture`);
    if (yields.science) yieldTexts.push(`🔬 +${yields.science} science`);
    return yieldTexts.join(', ') || 'Fonctionnalité spéciale';
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3 text-amber-900">Construction (Zustand)</h4>
      </div>

      {/* Ressources disponibles */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-3">
        <div className="text-center mb-2">
          <h5 className="font-bold text-amber-900 text-sm">Ressources de Construction</h5>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          <div>
            <div className="text-amber-700">💰 Or</div>
            <div className="font-bold text-amber-900">{resources.gold}</div>
          </div>
          <div>
            <div className="text-amber-700">🪨 Pierre</div>
            <div className="font-bold text-amber-900">{resources.stone}</div>
          </div>
          <div>
            <div className="text-amber-700">🪵 Bois</div>
            <div className="font-bold text-amber-900">{resources.wood}</div>
          </div>
          <div>
            <div className="text-amber-700">⚔️ Fer</div>
            <div className="font-bold text-amber-900">{resources.iron}</div>
          </div>
        </div>
      </div>

      {/* État des villes */}
      {currentNovaImperium?.cities?.length ? (
        <div className="bg-gradient-to-b from-blue-200 to-blue-300 border-2 border-blue-800 rounded-lg p-3">
          <div className="text-center mb-2">
            <h5 className="font-bold text-blue-900 text-sm">Villes Disponibles</h5>
          </div>
          {currentNovaImperium.cities.map((city, index) => (
            <div key={city.id} className="text-xs text-blue-800 text-center">
              🏘️ {city.name} (Pop: {city.population})
              {index === 0 && <span className="text-green-600"> ← Construction ici</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-red-200 border-2 border-red-600 rounded-lg p-3 text-center">
          <div className="text-red-800 font-bold text-sm">
            ⚠️ Aucune ville disponible
          </div>
          <div className="text-xs text-red-700 mt-1">
            Fondez une colonie pour commencer à construire
          </div>
        </div>
      )}

      {/* Liste des bâtiments disponibles */}
      <div className="space-y-3">
        {availableBuildings.map((building) => {
          const canAffordBuilding = canAfford(building.cost);
          const hasCity = currentNovaImperium?.cities?.length > 0;
          const canBuild = canAffordBuilding && hasCity;
          
          return (
            <div 
              key={building.id}
              className={`bg-gradient-to-b border-2 rounded-lg p-3 ${
                canBuild 
                  ? 'from-green-200 to-green-300 border-green-800'
                  : !hasCity
                  ? 'from-red-200 to-red-300 border-red-600'
                  : 'from-gray-200 to-gray-300 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{building.icon}</div>
                  <div>
                    <div className="font-bold text-amber-900">{building.name}</div>
                    <div className="text-xs text-amber-700">{building.description}</div>
                    <div className="text-xs text-green-700 mt-1">
                      Rapporte: {getYieldsText(building.yields)}
                    </div>
                    <div className="text-xs text-amber-600">
                      Temps: {building.constructionTime} tour{building.constructionTime > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {/* Coût */}
                  <div className="text-xs text-amber-700 mb-2">
                    <div>💰 {building.cost.gold} or</div>
                    <div>🪨 {building.cost.stone} pierre</div>
                    <div>🪵 {building.cost.wood} bois</div>
                    {building.cost.iron && <div>⚔️ {building.cost.iron} fer</div>}
                  </div>
                  
                  {/* Bouton de construction */}
                  <button
                    onClick={() => handleConstruct(building)}
                    disabled={!canBuild}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                      canBuild
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : !hasCity
                        ? 'bg-red-400 text-red-700'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {!hasCity ? 'Pas de ville' : canAffordBuilding ? 'Construire' : 'Insuffisant'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}