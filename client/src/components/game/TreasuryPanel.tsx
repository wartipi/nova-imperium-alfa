import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { BuildingType } from "../../lib/game/types";

// Define building costs and maintenance for economics
const buildingData: Record<BuildingType, { cost: number; maintenance: number; yields: { food?: number; production?: number; science?: number; culture?: number; gold?: number } }> = {
  palace: { cost: 0, maintenance: 0, yields: { culture: 1, gold: 1 } },
  granary: { cost: 60, maintenance: 1, yields: { food: 2 } },
  library: { cost: 90, maintenance: 1, yields: { science: 2 } },
  barracks: { cost: 80, maintenance: 1, yields: { production: 1 } },
  market: { cost: 120, maintenance: 1, yields: { gold: 3 } },
  temple: { cost: 100, maintenance: 1, yields: { culture: 2 } },
  courthouse: { cost: 150, maintenance: 2, yields: { gold: 1 } },
  university: { cost: 200, maintenance: 2, yields: { science: 4 } }
};

export function TreasuryPanel() {
  const { currentNovaImperium } = useNovaImperium();

  if (!currentNovaImperium) {
    return (
      <div className="text-center p-4">
        <div className="text-amber-900 font-bold mb-2">Chargement des données...</div>
        <div className="text-sm text-amber-700">
          Initialisation en cours...
        </div>
      </div>
    );
  }

  const resources = currentNovaImperium.resources;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Trésorerie</h4>
      </div>
      
      {/* Current Stockpile */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-amber-900">Réserves Actuelles</h5>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">💰</div>
              <div className="text-xs font-medium">Or</div>
              <div className="text-sm font-bold text-amber-900">{resources.gold}</div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">🌾</div>
              <div className="text-xs font-medium">Nourriture</div>
              <div className="text-sm font-bold text-amber-900">{resources.food}</div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">⚡</div>
              <div className="text-xs font-medium">Points d'Action</div>
              <div className="text-sm font-bold text-amber-900">{resources.action_points}</div>
            </div>
          </div>
        </div>
        
        {/* Strategic Resources */}
        <div className="mt-3 pt-3 border-t border-amber-600">
          <div className="text-center mb-2">
            <h6 className="font-bold text-xs text-amber-800">📦 Ressources Stratégiques</h6>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 border border-amber-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">⚔️</div>
                <div className="text-xs font-medium">Fer</div>
                <div className="text-sm font-bold text-amber-900">{resources.iron}</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">🪨</div>
                <div className="text-xs font-medium">Pierre</div>
                <div className="text-sm font-bold text-amber-900">{resources.stone}</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">🪵</div>
                <div className="text-xs font-medium">Bois</div>
                <div className="text-sm font-bold text-amber-900">{resources.wood}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Magical Resources */}
        <div className="mt-3 pt-3 border-t border-amber-600">
          <div className="text-center mb-2">
            <h6 className="font-bold text-xs text-purple-800">✨ Ressources Magiques</h6>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-purple-50 border border-purple-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">🔮</div>
                <div className="text-xs font-medium">Mana</div>
                <div className="text-sm font-bold text-purple-900">{resources.mana}</div>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">💎</div>
                <div className="text-xs font-medium">Cristaux</div>
                <div className="text-sm font-bold text-purple-900">{resources.crystals}</div>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">📜</div>
                <div className="text-xs font-medium">Savoir</div>
                <div className="text-sm font-bold text-purple-900">{resources.ancient_knowledge}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Information */}
      <div className="bg-gradient-to-b from-blue-200 to-blue-300 border-2 border-blue-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-blue-900">Informations sur les Ressources</h5>
        </div>
        <div className="text-sm text-blue-800 space-y-2">
          <div>• Les ressources sont collectées depuis les cases travaillées par vos villes</div>
          <div>• Chaque type de terrain produit des ressources différentes</div>
          <div>• Les ressources stratégiques et magiques sont particulièrement importantes pour Nova Imperium</div>
          <div>• Utilisez les ressources pour construire des bâtiments et recruter des unités</div>
        </div>
      </div>

      {/* Detailed City Breakdown */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-amber-900">Détail par Ville</h5>
        </div>
        <div className="space-y-3">
          {currentNovaImperium.cities.map(city => (
            <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
              <div className="font-bold text-center mb-2 text-amber-900">{city.name}</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Population: {city.population}</span>
                  <span>🏛️ Bâtiments: {city.buildings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>🌾 +{city.foodPerTurn}</span>
                  <span>🔨 +{city.productionPerTurn}</span>
                </div>
                <div className="flex justify-between">
                  <span>🔬 +{city.sciencePerTurn}</span>
                  <span>🎭 +{city.culturePerTurn}</span>
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  Bâtiments: {city.buildings.join(', ') || 'Aucun'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}