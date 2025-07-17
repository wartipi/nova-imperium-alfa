import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { Button } from "../ui/button";
import { getUnitRecruitmentCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { Resources } from "../../lib/game/types";
import { useState } from "react";

export function RecruitmentPanel() {
  const { currentNovaImperium, trainUnit } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!currentNovaImperium) return null;

  const units = [
    // Basic Infantry - 1-3 tours
    { id: 'warrior', name: 'Guerrier', cost: { food: 10, iron: 5, gold: 8 }, recruitmentTime: 2, description: 'Unité de base au corps à corps', icon: '⚔️', strength: 4, category: 'Infanterie' },
    { id: 'spearman', name: 'Lancier', cost: { food: 12, iron: 8, wood: 4 }, recruitmentTime: 2, description: 'Unité défensive contre la cavalerie', icon: '🗡️', strength: 5, category: 'Infanterie' },
    { id: 'swordsman', name: 'Épéiste', cost: { food: 15, iron: 12, gold: 10 }, recruitmentTime: 3, description: 'Guerrier amélioré avec épée', icon: '🗡️', strength: 7, category: 'Infanterie' },
    
    // Ranged Units - 2-3 tours
    { id: 'archer', name: 'Archer', cost: { food: 8, wood: 10, gold: 6 }, recruitmentTime: 2, description: 'Unité de tir à distance', icon: '🏹', strength: 3, category: 'Distance' },
    { id: 'crossbowman', name: 'Arbalétrier', cost: { food: 12, wood: 8, iron: 6, gold: 8 }, recruitmentTime: 3, description: 'Tireur d\'élite avec arbalète', icon: '🎯', strength: 5, category: 'Distance' },
    
    // Siege Units - 4-5 tours
    { id: 'catapult', name: 'Catapulte', cost: { wood: 20, iron: 15, stone: 10, gold: 12 }, recruitmentTime: 4, description: 'Engin de siège pour détruire les murs', icon: '🏹', strength: 8, category: 'Siège' },
    { id: 'trebuchet', name: 'Trébuchet', cost: { wood: 25, iron: 20, stone: 15, gold: 18 }, recruitmentTime: 5, description: 'Engin de siège lourd', icon: '🏰', strength: 10, category: 'Siège' },
    
    // Cavalry - 3-4 tours
    { id: 'horseman', name: 'Cavalier', cost: { food: 20, iron: 8, gold: 15 }, recruitmentTime: 3, description: 'Unité montée rapide', icon: '🐎', strength: 6, category: 'Cavalerie' },
    { id: 'knight', name: 'Chevalier', cost: { food: 25, iron: 18, gold: 20, precious_metals: 3 }, recruitmentTime: 4, description: 'Cavalerie lourde blindée', icon: '🛡️', strength: 9, category: 'Cavalerie' },
    
    // Naval Units - 3-4 tours
    { id: 'galley', name: 'Galère', cost: { wood: 15, iron: 8, food: 10, gold: 12 }, recruitmentTime: 3, description: 'Navire de guerre léger', icon: '🚤', strength: 4, category: 'Marine' },
    { id: 'warship', name: 'Navire de Guerre', cost: { wood: 25, iron: 15, food: 15, gold: 18 }, recruitmentTime: 4, description: 'Navire de combat lourd', icon: '⛵', strength: 7, category: 'Marine' },
    
    // Special Units - 1-3 tours
    { id: 'scout', name: 'Éclaireur', cost: { food: 6, gold: 4 }, recruitmentTime: 1, description: 'Unité d\'exploration rapide', icon: '🔍', strength: 2, category: 'Spécial' },
    { id: 'settler', name: 'Colon', cost: { food: 25, wood: 15, stone: 10, iron: 8, gold: 20 }, recruitmentTime: 3, description: 'Fonde de nouvelles villes', icon: '🏕️', strength: 0, category: 'Spécial' },
    { id: 'diplomat', name: 'Diplomate', cost: { food: 10, gold: 15, precious_metals: 2 }, recruitmentTime: 2, description: 'Négociateur pour les relations', icon: '🤝', strength: 0, category: 'Spécial' },
    { id: 'spy', name: 'Espion', cost: { food: 12, gold: 18, mana: 3 }, recruitmentTime: 2, description: 'Unité d\'espionnage et sabotage', icon: '🕵️', strength: 1, category: 'Spécial' }
  ];

  const getResourceIcon = (resource: string): string => {
    const icons: Record<string, string> = {
      food: '🍞',
      gold: '💰',
      wood: '🪵',
      stone: '🪨',
      iron: '⚔️',
      precious_metals: '🥇',
      mana: '🔮',
      crystals: '💎',
      ancient_knowledge: '📜'
    };
    return icons[resource] || '❓';
  };

  const formatResourceCost = (cost: Record<string, number>): string => {
    return Object.entries(cost)
      .map(([resource, amount]) => `${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  const canAffordUnit = (unitId: string): boolean => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !currentNovaImperium) return false;
    
    const actionCost = getUnitRecruitmentCost(unitId);
    const resources = currentNovaImperium.resources;
    
    // Check Action Points
    if (!canAffordAction(actionPoints, actionCost)) return false;
    
    // Check all required resources
    return Object.entries(unit.cost).every(([resource, amount]) => {
      return resources[resource as keyof Resources] >= amount;
    });
  };

  const handleRecruit = (unitId: string, cityId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !currentNovaImperium) return;
    
    const actionCost = getUnitRecruitmentCost(unitId);
    
    if (canAffordUnit(unitId)) {
      const success = spendActionPoints(actionCost);
      if (success) {
        trainUnit(cityId, unitId, unit.cost, unit.recruitmentTime);
        console.log(`Recrutement de ${unitId} lancé pour ${unit.recruitmentTime} tours, ${actionCost} PA et ressources déduites`);
      }
    } else {
      console.log(`Ressources insuffisantes pour recruter ${unitId}`);
    }
  };

  const handleMouseEnter = (unitId: string, event: React.MouseEvent) => {
    setHoveredUnit(unitId);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredUnit(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredUnit) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Recrutement d'Unités</h4>
      </div>

      {currentNovaImperium.cities.map(city => (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">{city.name}</div>
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
                🕐 {city.productionProgress}/{city.currentProduction.cost} tours
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 mb-3">Aucun recrutement en cours</div>
          )}

          <div className="space-y-3">
            {['Infanterie', 'Distance', 'Siège', 'Cavalerie', 'Marine', 'Spécial'].map(category => {
              const categoryUnits = units.filter(u => u.category === category);
              return (
                <div key={category} className="space-y-1">
                  <div className="text-xs font-bold text-amber-800 border-b border-amber-300 pb-1">
                    {category}
                  </div>
                  {categoryUnits.map(unit => (
                    <div 
                      key={unit.id} 
                      className="flex items-center justify-between"
                      onMouseEnter={(e) => handleMouseEnter(unit.id, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{unit.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{unit.name}</div>
                          <div className="text-xs text-amber-700">
                            {formatResourceCost(unit.cost)} | {getUnitRecruitmentCost(unit.id)} ⚡
                          </div>
                          <div className="text-xs text-purple-600">
                            🕐 {unit.recruitmentTime} tour{unit.recruitmentTime > 1 ? 's' : ''} | ⚔️ {unit.strength}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRecruit(unit.id, city.id)}
                        disabled={
                          city.currentProduction !== null || 
                          !canAffordUnit(unit.id)
                        }
                        className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                        title={
                          city.currentProduction !== null ? 'Ville occupée' :
                          !canAffordUnit(unit.id) ? 'Ressources insuffisantes' : 'Recruter cette unité'
                        }
                      >
                        {city.currentProduction !== null ? 'Occupé' : 
                         !canAffordUnit(unit.id) ? 'Manque ressources' : 'Recruter'}
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-sm">
          <div className="font-medium mb-2">Armée Actuelle:</div>
          <div className="space-y-1">
            {currentNovaImperium.units.map(unit => (
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
      
      {/* Tooltip */}
      {hoveredUnit && (
        <div 
          className="fixed z-50 bg-gray-800 text-white p-3 rounded shadow-lg max-w-sm pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-yellow-300">
              {units.find(u => u.id === hoveredUnit)?.name}
            </div>
            <div className="text-sm">
              {units.find(u => u.id === hoveredUnit)?.description}
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Statistiques:</div>
              <div className="text-sm text-red-400">
                Force: {units.find(u => u.id === hoveredUnit)?.strength}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Points d'Action:</div>
              <div className="text-sm text-blue-400">
                Coût: {getUnitRecruitmentCost(hoveredUnit)} PA
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}