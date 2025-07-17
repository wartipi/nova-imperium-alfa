import { useCivilizations } from "../../lib/stores/useCivilizations";
import { Button } from "../ui/button";

export function ConstructionPanel() {
  const { currentCivilization, buildInCity } = useCivilizations();

  if (!currentCivilization) return null;

  const buildings = [
    { id: 'granary', name: 'Grenier', cost: 60, description: 'Augmente la production de nourriture', icon: '🌾' },
    { id: 'library', name: 'Bibliothèque', cost: 90, description: 'Augmente la recherche scientifique', icon: '📚' },
    { id: 'barracks', name: 'Caserne', cost: 80, description: 'Améliore l\'entraînement militaire', icon: '🏰' },
    { id: 'market', name: 'Marché', cost: 100, description: 'Augmente les revenus commerciaux', icon: '🏪' },
    { id: 'temple', name: 'Temple', cost: 120, description: 'Améliore la culture et le moral', icon: '⛪' },
    { id: 'courthouse', name: 'Tribunal', cost: 150, description: 'Réduit la corruption', icon: '⚖️' }
  ];

  const handleBuild = (buildingId: string, cityId: string) => {
    buildInCity(cityId, buildingId);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Projets de Construction</h4>
      </div>

      {currentCivilization.cities.map(city => (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">{city.name}</div>
          <div className="text-xs text-amber-700 mb-2">
            Production: {city.productionPerTurn}/tour
          </div>
          
          {city.currentProduction ? (
            <div className="mb-3">
              <div className="text-xs text-amber-700">En cours:</div>
              <div className="text-sm font-medium">{city.currentProduction.name}</div>
              <div className="w-full bg-amber-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (city.productionProgress / city.currentProduction.cost) * 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-amber-700 mt-1">
                {city.productionProgress}/{city.currentProduction.cost} 
                ({Math.ceil((city.currentProduction.cost - city.productionProgress) / city.productionPerTurn)} tours)
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 mb-3">Aucune construction en cours</div>
          )}

          <div className="space-y-1">
            {buildings.map(building => (
              <div key={building.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{building.icon}</span>
                  <div>
                    <div className="text-xs font-medium">{building.name}</div>
                    <div className="text-xs text-amber-700">
                      {building.cost} 🔨 - {building.description}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleBuild(building.id, city.id)}
                  disabled={city.currentProduction !== null || city.buildings.includes(building.id as any)}
                  className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  {city.buildings.includes(building.id as any) ? 'Construit' : 'Construire'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}