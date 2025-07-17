import { useCivilizations } from "../../lib/stores/useCivilizations";

export function TreasuryPanel() {
  const { currentCivilization } = useCivilizations();

  if (!currentCivilization) return null;

  const resources = currentCivilization.resources;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">État des Finances</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-sm font-medium">Or</div>
            <div className="text-lg font-bold">{resources.gold}</div>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-center">
            <div className="text-2xl mb-1">🌾</div>
            <div className="text-sm font-medium">Nourriture</div>
            <div className="text-lg font-bold">{resources.food}</div>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-center">
            <div className="text-2xl mb-1">🔨</div>
            <div className="text-sm font-medium">Production</div>
            <div className="text-lg font-bold">{resources.production}</div>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-center">
            <div className="text-2xl mb-1">🔬</div>
            <div className="text-sm font-medium">Science</div>
            <div className="text-lg font-bold">{resources.science}</div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-center">
          <div className="text-2xl mb-1">🎭</div>
          <div className="text-sm font-medium">Culture</div>
          <div className="text-lg font-bold">{resources.culture}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-sm">
          <div className="font-medium mb-2">Revenus par Tour:</div>
          <div className="space-y-1">
            <div>• Or: +{currentCivilization.cities.reduce((sum, city) => sum + city.populationCap, 0)}</div>
            <div>• Nourriture: +{currentCivilization.cities.reduce((sum, city) => sum + city.foodPerTurn, 0)}</div>
            <div>• Production: +{currentCivilization.cities.reduce((sum, city) => sum + city.productionPerTurn, 0)}</div>
            <div>• Science: +{currentCivilization.cities.reduce((sum, city) => sum + city.sciencePerTurn, 0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}