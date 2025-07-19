import React from 'react';
import { usePlayer } from '../../lib/stores/usePlayer';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ACTION_COSTS, getBuildingCost, getUnitMovementCost, canAffordAction } from '../../lib/game/ActionPointsCosts';
import { AP_GENERATION, getBuildingAPGeneration, getBuildingMaxAPIncrease } from '../../lib/game/ActionPointsGeneration';

interface ActionPointsPanelProps {
  onClose: () => void;
}

export function ActionPointsPanel({ onClose }: ActionPointsPanelProps) {
  const { actionPoints, maxActionPoints, spendActionPoints, addActionPoints, increaseMaxActionPoints } = usePlayer();

  const handleSpendPoints = (amount: number, actionName: string) => {
    if (canAffordAction(actionPoints, amount)) {
      const success = spendActionPoints(amount);
      if (success) {
        console.log(`${actionName} executed for ${amount} AP`);
      }
    } else {
      console.log(`Not enough Action Points for ${actionName}`);
    }
  };

  const handleAddPoints = (amount: number) => {
    addActionPoints(amount);
    console.log(`Added ${amount} Action Points`);
  };

  return (
    <div className="absolute top-20 left-4 pointer-events-auto z-20">
      <Card className="w-96 max-h-[600px] overflow-y-auto bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-800 shadow-lg">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-amber-900">⚡ Gestion des Points d'Action</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-amber-600 text-amber-600 hover:bg-amber-200"
            >
              ✕
            </Button>
          </div>

          {/* Current Action Points Status */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-300 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-blue-700">POINTS D'ACTION ACTUELS</div>
              <div className="text-2xl font-bold text-blue-900">{actionPoints}/{maxActionPoints}</div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(actionPoints / maxActionPoints) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Points Sources */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-amber-800 mb-2">🎯 Sources de Points d'Action</h4>
            <div className="space-y-2 text-xs text-amber-700">
              <div>• Victoires stratégiques lors des événements GN</div>
              <div>• Exploration réussie de nouveaux territoires</div>
              <div>• Livraisons et missions accomplies</div>
              <div>• Bâtiments spécialisés (génération passive)</div>
              <div>• Récompenses d'événements narratifs</div>
            </div>
          </div>

          {/* Building Generation */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-amber-800 mb-2">🏗️ Génération par Bâtiments</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="font-medium text-amber-700">Forte génération</div>
                <div>Portail mystique: {getBuildingAPGeneration('mystic_portal')} PA/tour</div>
                <div>Laboratoire: {getBuildingAPGeneration('laboratory')} PA/tour</div>
                <div>Forge légendaire: {getBuildingAPGeneration('legendary_forge')} PA/tour</div>
                <div>Bibliothèque: {getBuildingAPGeneration('library')} PA/tour</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-amber-700">Génération standard</div>
                <div>Forteresse: {getBuildingAPGeneration('fortress')} PA/tour</div>
                <div>Port: {getBuildingAPGeneration('port')} PA/tour</div>
                <div>Temple: {getBuildingAPGeneration('temple')} PA/tour</div>
                <div>Marché: {getBuildingAPGeneration('market')} PA/tour</div>
              </div>
            </div>
          </div>

          {/* Building Construction Costs */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-amber-800 mb-2">🏗️ Coûts de Construction</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="font-medium text-amber-700">Infrastructure</div>
                <div>Port: {ACTION_COSTS.buildings.port} PA</div>
                <div>Marché: {ACTION_COSTS.buildings.market} PA</div>
                <div>Route: {ACTION_COSTS.buildings.road} PA</div>
                <div>Ferme: {ACTION_COSTS.buildings.farm} PA</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-amber-700">Défense</div>
                <div>Forteresse: {ACTION_COSTS.buildings.fortress} PA</div>
                <div>Tour de guet: {ACTION_COSTS.buildings.watchtower} PA</div>
                <div>Fortifications: {ACTION_COSTS.buildings.fortifications} PA</div>
              </div>
            </div>
          </div>

          {/* Unit Movement Costs */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-amber-800 mb-2">🚶 Coûts de Déplacement</h4>
            <div className="text-xs text-amber-700 space-y-1">
              <div>Éclaireur: {ACTION_COSTS.unitMovement.scout} PA/case</div>
              <div>Guerrier: {ACTION_COSTS.unitMovement.warrior} PA/case</div>
              <div>Archer: {ACTION_COSTS.unitMovement.archer} PA/case</div>
              <div>Colon: {ACTION_COSTS.unitMovement.settler} PA/case</div>
              <div>Catapulte: {ACTION_COSTS.unitMovement.catapult} PA/case</div>
              <div className="text-amber-600 mt-2">* Coût maximum: 5x le coût de base</div>
            </div>
          </div>

          {/* Special Actions */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-amber-800 mb-2">🎭 Actions Spéciales</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-700">Exploration</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSpendPoints(ACTION_COSTS.exploration, 'Exploration')}
                  disabled={!canAffordAction(actionPoints, ACTION_COSTS.exploration)}
                  className="text-xs py-1 px-2"
                >
                  {ACTION_COSTS.exploration} PA
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-700">Diplomatie</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSpendPoints(ACTION_COSTS.diplomacy, 'Diplomatie')}
                  disabled={!canAffordAction(actionPoints, ACTION_COSTS.diplomacy)}
                  className="text-xs py-1 px-2"
                >
                  {ACTION_COSTS.diplomacy} PA
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-700">Recherche</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSpendPoints(ACTION_COSTS.research, 'Recherche')}
                  disabled={!canAffordAction(actionPoints, ACTION_COSTS.research)}
                  className="text-xs py-1 px-2"
                >
                  {ACTION_COSTS.research} PA
                </Button>
              </div>
            </div>
          </div>

          {/* Developer Actions (for testing) */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
            <h4 className="text-sm font-bold text-gray-800 mb-2">🔧 Actions de Test</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-700">Ajouter 10 PA</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddPoints(10)}
                  className="text-xs py-1 px-2"
                >
                  +10 PA
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-700">Augmenter limite (+25)</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => increaseMaxActionPoints(25)}
                  className="text-xs py-1 px-2"
                >
                  +25 Max
                </Button>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            <div className="font-medium mb-1">💡 Stratégie des Points d'Action</div>
            <div>Les PA sont une ressource précieuse qui connecte vos actions en événements GN à vos capacités sur la plateforme. Planifiez soigneusement leur utilisation pour maximiser votre impact dans l'univers Nova Imperium.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}