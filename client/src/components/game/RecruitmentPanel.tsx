import { useCivilizations } from "../../lib/stores/useCivilizations";
import { Button } from "../ui/button";

export function RecruitmentPanel() {
  const { currentCivilization, trainUnit } = useCivilizations();

  if (!currentCivilization) return null;

  const units = [
    { id: 'warrior', name: 'Guerrier', cost: 40, description: 'Unité de base au corps à corps', icon: '⚔️', strength: 4 },
    { id: 'archer', name: 'Archer', cost: 50, description: 'Unité de tir à distance', icon: '🏹', strength: 3 },
    { id: 'spearman', name: 'Lancier', cost: 60, description: 'Unité défensive contre la cavalerie', icon: '🗡️', strength: 5 },
    { id: 'scout', name: 'Éclaireur', cost: 30, description: 'Unité d\'exploration rapide', icon: '🔍', strength: 2 },
    { id: 'settler', name: 'Colon', cost: 100, description: 'Fonde de nouvelles villes', icon: '🏕️', strength: 0 }
  ];

  const handleRecruit = (unitType: string, cityId: string) => {
    trainUnit(cityId, unitType);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Recrutement d'Unités</h4>
      </div>

      {currentCivilization.cities.map(city => (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">{city.name}</div>
          <div className="text-xs text-amber-700 mb-2">
            Production: {city.productionPerTurn}/tour
          </div>
          
          {city.currentProduction && city.currentProduction.type === 'unit' ? (
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
            <div className="text-xs text-amber-700 mb-3">Aucun recrutement en cours</div>
          )}

          <div className="space-y-1">
            {units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{unit.icon}</span>
                  <div>
                    <div className="text-xs font-medium">{unit.name}</div>
                    <div className="text-xs text-amber-700">
                      {unit.cost} 🔨 | Force: {unit.strength} | {unit.description}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleRecruit(unit.id, city.id)}
                  disabled={city.currentProduction !== null}
                  className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  Recruter
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-sm">
          <div className="font-medium mb-2">Armée Actuelle:</div>
          <div className="space-y-1">
            {currentCivilization.units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {unit.type === 'warrior' ? '⚔️' : 
                     unit.type === 'archer' ? '🏹' : 
                     unit.type === 'settler' ? '🏕️' : 
                     unit.type === 'scout' ? '🔍' : '👤'}
                  </span>
                  <div>
                    <div className="text-xs font-medium">{unit.name}</div>
                    <div className="text-xs text-amber-700">
                      Pos: ({unit.x}, {unit.y}) | Santé: {unit.health}/{unit.maxHealth}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-amber-700">
                  Exp: {unit.experience}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}