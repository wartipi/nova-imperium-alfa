import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { BuildingType } from "../../lib/game/types";

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

  // Calculate income from cities and buildings
  const calculateIncome = () => {
    let totalIncome = {
      food: 0,
      action_points: 0,
      gold: 0,
      iron: 0,
      stone: 0,
      wood: 0,
      precious_metals: 0,
      mana: 0,
      crystals: 0,
      ancient_knowledge: 0
    };

    currentNovaImperium.cities.forEach(city => {
      // Phase 8 : foodPerTurn et productionPerTurn incluent déjà les bonus bâtiments (calculés serveur).
      totalIncome.food += city.foodPerTurn || 0;
      totalIncome.action_points += city.productionPerTurn || 0;
      totalIncome.gold += Math.floor(city.population * 0.5); // Base gold from population
      
      // Bonus bâtiments pour gold uniquement (hors périmètre Phase 8 — non recalculé serveur).
      city.buildings.forEach(building => {
        const buildingInfo = buildingData[building as BuildingType];
        if (buildingInfo?.yields) {
          totalIncome.gold += buildingInfo.yields.gold || 0;
        }
      });
    });

    // Base resource generation from terrain
    totalIncome.iron += 2;
    totalIncome.stone += 2;
    totalIncome.wood += 2;
    totalIncome.precious_metals += 1;
    totalIncome.mana += 1;
    totalIncome.crystals += 1;
    totalIncome.ancient_knowledge += 1;

    return totalIncome;
  };

  // Calculate expenses from buildings and units
  const calculateExpenses = () => {
    let totalExpenses = {
      food: 0,
      action_points: 0,
      gold: 0,
      iron: 0,
      stone: 0,
      wood: 0,
      precious_metals: 0,
      mana: 0,
      crystals: 0,
      ancient_knowledge: 0
    };

    currentNovaImperium.cities.forEach(city => {
      city.buildings.forEach(building => {
        const buildingInfo = buildingData[building as BuildingType];
        if (buildingInfo?.maintenance) {
          totalExpenses.gold += buildingInfo.maintenance;
        }
      });
    });

    // Unit maintenance costs
    currentNovaImperium.units.forEach(unit => {
      totalExpenses.gold += 1; // Base unit maintenance
      totalExpenses.food += 1; // Units consume food
    });

    return totalExpenses;
  };

  const income = calculateIncome();
  const expenses = calculateExpenses();

  // Calculate net income
  const netIncome = {
    food: income.food - expenses.food,
    action_points: income.action_points - expenses.action_points,
    gold: income.gold - expenses.gold,
    iron: income.iron - expenses.iron,
    stone: income.stone - expenses.stone,
    wood: income.wood - expenses.wood,
    precious_metals: income.precious_metals - expenses.precious_metals,
    mana: income.mana - expenses.mana,
    crystals: income.crystals - expenses.crystals,
    ancient_knowledge: income.ancient_knowledge - expenses.ancient_knowledge
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3 text-amber-900">Trésorerie</h4>
      </div>
      
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
        
        <div className="mt-3 pt-3 border-t border-amber-600">
          <div className="text-center mb-2">
            <h6 className="font-bold text-xs text-amber-800">📦 Ressources Stratégiques</h6>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
            <div className="bg-amber-50 border border-amber-700 rounded p-2">
              <div className="text-center">
                <div className="text-lg mb-1">🥇</div>
                <div className="text-xs font-medium">Métaux Précieux</div>
                <div className="text-sm font-bold text-amber-900">{resources.precious_metals}</div>
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

      {/* Income Section */}
      <div className="bg-gradient-to-b from-green-200 to-green-300 border-2 border-green-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-green-900">Revenus par Tour</h5>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>🌾 Nourriture</span>
              <span className="font-bold text-green-900">+{income.food}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>⚡ Points d'Action</span>
              <span className="font-bold text-green-900">+{income.action_points}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>💰 Or</span>
              <span className="font-bold text-green-900">+{income.gold}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>⚔️ Fer</span>
              <span className="font-bold text-green-900">+{income.iron}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>🪨 Pierre</span>
              <span className="font-bold text-green-900">+{income.stone}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>🪵 Bois</span>
              <span className="font-bold text-green-900">+{income.wood}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="bg-gradient-to-b from-red-200 to-red-300 border-2 border-red-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-red-900">Dépenses par Tour</h5>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-red-50 border border-red-700 rounded p-2">
            <div className="flex justify-between">
              <span>🌾 Nourriture</span>
              <span className="font-bold text-red-900">-{expenses.food}</span>
            </div>
          </div>
          <div className="bg-red-50 border border-red-700 rounded p-2">
            <div className="flex justify-between">
              <span>💰 Or</span>
              <span className="font-bold text-red-900">-{expenses.gold}</span>
            </div>
          </div>
          <div className="bg-red-50 border border-red-700 rounded p-2">
            <div className="flex justify-between">
              <span>🏛️ Bâtiments</span>
              <span className="font-bold text-red-900">{currentNovaImperium.cities.reduce((total, city) => total + city.buildings.length, 0)}</span>
            </div>
          </div>
          <div className="bg-red-50 border border-red-700 rounded p-2">
            <div className="flex justify-between">
              <span>⚔️ Unités</span>
              <span className="font-bold text-red-900">{currentNovaImperium.units.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Income Section */}
      <div className="bg-gradient-to-b from-blue-200 to-blue-300 border-2 border-blue-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-blue-900">Balance Nette par Tour</h5>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="flex justify-between">
              <span>🌾 Nourriture</span>
              <span className={`font-bold ${netIncome.food >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netIncome.food >= 0 ? '+' : ''}{netIncome.food}
              </span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="flex justify-between">
              <span>⚡ Points d'Action</span>
              <span className={`font-bold ${netIncome.action_points >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netIncome.action_points >= 0 ? '+' : ''}{netIncome.action_points}
              </span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="flex justify-between">
              <span>💰 Or</span>
              <span className={`font-bold ${netIncome.gold >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netIncome.gold >= 0 ? '+' : ''}{netIncome.gold}
              </span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="flex justify-between">
              <span>⚔️ Fer</span>
              <span className={`font-bold ${netIncome.iron >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netIncome.iron >= 0 ? '+' : ''}{netIncome.iron}
              </span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="flex justify-between">
              <span>🪨 Pierre</span>
              <span className={`font-bold ${netIncome.stone >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netIncome.stone >= 0 ? '+' : ''}{netIncome.stone}
              </span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="flex justify-between">
              <span>🪵 Bois</span>
              <span className={`font-bold ${netIncome.wood >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {netIncome.wood >= 0 ? '+' : ''}{netIncome.wood}
              </span>
            </div>
          </div>
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