import React from "react";
import { useResources } from "../../lib/stores/useResources";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";

interface UnitCost {
  gold: number;
  food: number;
  iron?: number;
  wood?: number;
}

interface UnitType {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: UnitCost;
  recruitmentTime: number;
}

const availableUnits: UnitType[] = [
  {
    id: 'scout',
    name: 'Éclaireur',
    icon: '🕵️',
    description: 'Unité rapide pour exploration et reconnaissance',
    cost: { gold: 30, food: 20 },
    recruitmentTime: 1
  },
  {
    id: 'warrior',
    name: 'Guerrier',
    icon: '⚔️',
    description: 'Unité de combat de base, polyvalente',
    cost: { gold: 50, food: 30, iron: 15 },
    recruitmentTime: 2
  },
  {
    id: 'archer',
    name: 'Archer',
    icon: '🏹',
    description: 'Unité à distance, efficace contre infanterie',
    cost: { gold: 45, food: 25, wood: 20 },
    recruitmentTime: 2
  },
  {
    id: 'mage',
    name: 'Mage',
    icon: '🧙',
    description: 'Unité magique puissante, coûteuse à maintenir',
    cost: { gold: 80, food: 20 },
    recruitmentTime: 3
  }
];

export function RecruitmentPanelZustand() {
  const { resources, spendResources } = useResources();
  const { currentNovaImperium, trainUnit } = useNovaImperium();

  const canAfford = (cost: UnitCost): boolean => {
    return resources.gold >= cost.gold &&
           resources.food >= cost.food &&
           (!cost.iron || resources.iron >= cost.iron) &&
           (!cost.wood || resources.wood >= cost.wood);
  };

  const handleRecruit = (unit: UnitType) => {
    if (!canAfford(unit.cost)) {
      alert(`Ressources insuffisantes pour recruter ${unit.name}`);
      return;
    }

    // Convertir le coût en format compatible Zustand
    const resourceCost: any = {
      gold: unit.cost.gold,
      food: unit.cost.food
    };
    
    if (unit.cost.iron) resourceCost.iron = unit.cost.iron;
    if (unit.cost.wood) resourceCost.wood = unit.cost.wood;

    // Dépenser les ressources via Zustand
    const success = spendResources(resourceCost);
    
    if (success) {
      console.log(`✅ Recrutement ${unit.name} réussi - Ressources déduites:`, resourceCost);
      
      // Optionnel: Ajouter l'unité au système NovaImperium si disponible
      if (currentNovaImperium?.cities?.length > 0) {
        trainUnit(currentNovaImperium.cities[0].id, unit.id, resourceCost, unit.recruitmentTime);
      }
    } else {
      alert(`Erreur lors du recrutement de ${unit.name}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3 text-amber-900">Recrutement (Zustand)</h4>
      </div>

      {/* Ressources disponibles */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-3">
        <div className="text-center mb-2">
          <h5 className="font-bold text-amber-900 text-sm">Ressources Disponibles</h5>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          <div>
            <div className="text-amber-700">💰 Or</div>
            <div className="font-bold text-amber-900">{resources.gold}</div>
          </div>
          <div>
            <div className="text-amber-700">🌾 Nourriture</div>
            <div className="font-bold text-amber-900">{resources.food}</div>
          </div>
          <div>
            <div className="text-amber-700">⚔️ Fer</div>
            <div className="font-bold text-amber-900">{resources.iron}</div>
          </div>
          <div>
            <div className="text-amber-700">🪵 Bois</div>
            <div className="font-bold text-amber-900">{resources.wood}</div>
          </div>
        </div>
      </div>

      {/* Liste des unités disponibles */}
      <div className="space-y-3">
        {availableUnits.map((unit) => {
          const canAffordUnit = canAfford(unit.cost);
          
          return (
            <div 
              key={unit.id}
              className={`bg-gradient-to-b border-2 rounded-lg p-3 ${
                canAffordUnit 
                  ? 'from-green-200 to-green-300 border-green-800' 
                  : 'from-gray-200 to-gray-300 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{unit.icon}</div>
                  <div>
                    <div className="font-bold text-amber-900">{unit.name}</div>
                    <div className="text-xs text-amber-700">{unit.description}</div>
                    <div className="text-xs text-amber-600 mt-1">
                      Temps: {unit.recruitmentTime} tour{unit.recruitmentTime > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {/* Coût */}
                  <div className="text-xs text-amber-700 mb-2">
                    <div>💰 {unit.cost.gold} or</div>
                    <div>🌾 {unit.cost.food} nourriture</div>
                    {unit.cost.iron && <div>⚔️ {unit.cost.iron} fer</div>}
                    {unit.cost.wood && <div>🪵 {unit.cost.wood} bois</div>}
                  </div>
                  
                  {/* Bouton de recrutement */}
                  <button
                    onClick={() => handleRecruit(unit)}
                    disabled={!canAffordUnit}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                      canAffordUnit
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {canAffordUnit ? 'Recruter' : 'Insuffisant'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentNovaImperium?.cities?.length === 0 && (
        <div className="bg-yellow-200 border-2 border-yellow-600 rounded-lg p-3 text-center">
          <div className="text-yellow-800 font-bold text-sm">
            ⚠️ Aucune ville disponible
          </div>
          <div className="text-xs text-yellow-700 mt-1">
            Fondez une colonie pour recruter des unités
          </div>
        </div>
      )}
    </div>
  );
}