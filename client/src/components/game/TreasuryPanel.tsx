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
  
  // Calculate income from cities and buildings
  const calculateIncome = () => {
    let income = {
      food: 0,
      production: 0,
      science: 0,
      culture: 0,
      gold: 0
    };

    currentNovaImperium.cities.forEach(city => {
      // Base city yields
      income.food += city.foodPerTurn;
      income.production += city.productionPerTurn;
      income.science += city.sciencePerTurn;
      income.culture += city.culturePerTurn;
      income.gold += Math.floor(city.population * 0.5); // Base gold from population
      
      // Building yields
      city.buildings.forEach(buildingType => {
        const building = buildingData[buildingType];
        if (building) {
          income.food += building.yields.food || 0;
          income.production += building.yields.production || 0;
          income.science += building.yields.science || 0;
          income.culture += building.yields.culture || 0;
          income.gold += building.yields.gold || 0;
        }
      });
    });

    return income;
  };

  // Calculate expenses
  const calculateExpenses = () => {
    let expenses = {
      buildingMaintenance: 0,
      unitMaintenance: 0,
      total: 0
    };

    // Building maintenance
    currentNovaImperium.cities.forEach(city => {
      city.buildings.forEach(buildingType => {
        const building = buildingData[buildingType];
        if (building) {
          expenses.buildingMaintenance += building.maintenance;
        }
      });
    });

    // Unit maintenance (1 gold per unit after first 2 units)
    expenses.unitMaintenance = Math.max(0, currentNovaImperium.units.length - 2);

    expenses.total = expenses.buildingMaintenance + expenses.unitMaintenance;
    return expenses;
  };

  const income = calculateIncome();
  const expenses = calculateExpenses();
  const netIncome = {
    food: income.food,
    production: income.production,
    science: income.science,
    culture: income.culture,
    gold: income.gold - expenses.total
  };

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
              <div className="text-xl mb-1">🔨</div>
              <div className="text-xs font-medium">Production</div>
              <div className="text-sm font-bold text-amber-900">{resources.production}</div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">🔬</div>
              <div className="text-xs font-medium">Science</div>
              <div className="text-sm font-bold text-amber-900">{resources.science}</div>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">🎭</div>
              <div className="text-xs font-medium">Culture</div>
              <div className="text-sm font-bold text-amber-900">{resources.culture}</div>
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

      {/* Income Per Turn */}
      <div className="bg-gradient-to-b from-green-200 to-green-300 border-2 border-green-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-green-900">Revenus par Tour</h5>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">💰 Or:</span>
            <span className="text-sm font-bold text-green-800">+{income.gold}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🌾 Nourriture:</span>
            <span className="text-sm font-bold text-green-800">+{income.food}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🔨 Production:</span>
            <span className="text-sm font-bold text-green-800">+{income.production}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🔬 Science:</span>
            <span className="text-sm font-bold text-green-800">+{income.science}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🎭 Culture:</span>
            <span className="text-sm font-bold text-green-800">+{income.culture}</span>
          </div>
        </div>
      </div>

      {/* Expenses Per Turn */}
      <div className="bg-gradient-to-b from-red-200 to-red-300 border-2 border-red-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-red-900">Dépenses par Tour</h5>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">🏛️ Maintenance Bâtiments:</span>
            <span className="text-sm font-bold text-red-800">-{expenses.buildingMaintenance}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">⚔️ Maintenance Unités:</span>
            <span className="text-sm font-bold text-red-800">-{expenses.unitMaintenance}</span>
          </div>
          <div className="border-t border-red-600 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Total Dépenses:</span>
              <span className="text-sm font-bold text-red-800">-{expenses.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Income */}
      <div className="bg-gradient-to-b from-blue-200 to-blue-300 border-2 border-blue-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-blue-900">Revenus Nets par Tour</h5>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">💰 Or Net:</span>
            <span className={`text-sm font-bold ${netIncome.gold >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              {netIncome.gold >= 0 ? '+' : ''}{netIncome.gold}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🌾 Nourriture Net:</span>
            <span className="text-sm font-bold text-green-800">+{netIncome.food}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🔨 Production Net:</span>
            <span className="text-sm font-bold text-green-800">+{netIncome.production}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🔬 Science Net:</span>
            <span className="text-sm font-bold text-green-800">+{netIncome.science}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">🎭 Culture Net:</span>
            <span className="text-sm font-bold text-green-800">+{netIncome.culture}</span>
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