import React from "react";
import { useResources } from "../../lib/stores/useResources";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";

export function TreasuryPanelZustand() {
  const { resources } = useResources();
  const { currentNovaImperium } = useNovaImperium();

  // Calcul des revenus (basé sur l'ancien système mais adapté)
  const calculateIncome = () => {
    let totalIncome = {
      food: 0,
      action_points: 10, // Régénération base
      gold: 0,
      iron: 2,
      stone: 2,
      wood: 2,
      precious_metals: 1,
      mana: 1,
      crystals: 1,
      ancient_knowledge: 1
    };

    // Revenus des villes si disponibles
    if (currentNovaImperium?.cities) {
      currentNovaImperium.cities.forEach(city => {
        totalIncome.food += city.foodPerTurn || 0;
        totalIncome.action_points += city.productionPerTurn || 0;
        totalIncome.gold += Math.floor(city.population * 0.5);
      });
    }

    return totalIncome;
  };

  const calculateExpenses = () => {
    return {
      food: 0,
      gold: 0,
      action_points: 0
    };
  };

  const income = calculateIncome();
  const expenses = calculateExpenses();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3 text-amber-900">Trésorerie (Zustand)</h4>
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
      </div>

      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-3">
        <div className="text-center mb-2">
          <h5 className="font-bold text-amber-900 text-sm">Ressources Stratégiques</h5>
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
              <div className="text-lg mb-1">💎</div>
              <div className="text-xs font-medium">Métaux Précieux</div>
              <div className="text-sm font-bold text-amber-900">{resources.precious_metals}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-purple-200 to-purple-300 border-2 border-purple-800 rounded-lg p-3">
        <div className="text-center mb-2">
          <h5 className="font-bold text-purple-900 text-sm">Ressources Magiques</h5>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-purple-50 border border-purple-700 rounded p-1">
            <div className="text-center">
              <div className="text-sm mb-1">🔮</div>
              <div className="text-xs font-medium">Mana</div>
              <div className="text-sm font-bold text-purple-900">{resources.mana}</div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-700 rounded p-1">
            <div className="text-center">
              <div className="text-sm mb-1">💠</div>
              <div className="text-xs font-medium">Cristaux</div>
              <div className="text-sm font-bold text-purple-900">{resources.crystals}</div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-700 rounded p-1">
            <div className="text-center">
              <div className="text-sm mb-1">📜</div>
              <div className="text-xs font-medium">Savoir</div>
              <div className="text-sm font-bold text-purple-900">{resources.ancient_knowledge}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-green-200 to-green-300 border-2 border-green-800 rounded-lg p-3">
        <div className="text-center mb-2">
          <h5 className="font-bold text-green-900 text-sm">Production par Tour</h5>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-700">💰 Or: +{income.gold}</div>
          </div>
          <div className="text-center">
            <div className="text-green-700">🌾 Nourriture: +{income.food}</div>
          </div>
          <div className="text-center">
            <div className="text-green-700">⚡ PA: +{income.action_points}</div>
          </div>
        </div>
      </div>
    </div>
  );
}