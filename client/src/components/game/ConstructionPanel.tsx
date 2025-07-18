import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { Button } from "../ui/button";
import { getBuildingCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { getBuildingAPGeneration, getBuildingMaxAPIncrease } from "../../lib/game/ActionPointsGeneration";
import { Resources } from "../../lib/game/types";
import { useState } from "react";

export function ConstructionPanel() {
  const { currentNovaImperium, buildInCity } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!currentNovaImperium) return null;

  const buildings = [
    { id: 'port', name: 'Port', cost: { wood: 15, stone: 10, gold: 20 }, constructionTime: 4, description: 'Permet le commerce maritime', icon: '🚢', category: 'Transport' },
    { id: 'market', name: 'Marché', cost: { wood: 10, gold: 25, food: 5 }, constructionTime: 3, description: 'Augmente les revenus commerciaux', icon: '🏪', category: 'Transport' },
    { id: 'road', name: 'Route', cost: { stone: 8, gold: 12 }, constructionTime: 2, description: 'Améliore les déplacements', icon: '🛤️', category: 'Transport' },
    { id: 'shipyard', name: 'Chantier Naval', cost: { wood: 20, iron: 8, gold: 15 }, constructionTime: 5, description: 'Construit des navires', icon: '⚓', category: 'Transport' },
    
    { id: 'farm', name: 'Ferme', cost: { wood: 8, stone: 5, food: 10 }, constructionTime: 2, description: 'Augmente la production alimentaire', icon: '🚜', category: 'Agriculture' },
    { id: 'sawmill', name: 'Scierie', cost: { wood: 12, iron: 6, stone: 4 }, constructionTime: 3, description: 'Exploite les ressources forestières', icon: '🪵', category: 'Agriculture' },
    { id: 'garden', name: 'Jardin', cost: { wood: 6, stone: 3, food: 8 }, constructionTime: 1, description: 'Améliore la beauté et la nourriture', icon: '🌻', category: 'Agriculture' },
    
    // Defense/Military (Red) - 4-7 tours
    { id: 'fortress', name: 'Forteresse', cost: { stone: 25, iron: 15, gold: 20 }, constructionTime: 7, description: 'Défense militaire avancée', icon: '🏰', category: 'Défense' },
    { id: 'watchtower', name: 'Tour de Guet', cost: { wood: 8, stone: 12, iron: 5 }, constructionTime: 4, description: 'Surveille les environs', icon: '🗼', category: 'Défense' },
    { id: 'fortifications', name: 'Fortifications', cost: { stone: 18, iron: 10, wood: 6 }, constructionTime: 5, description: 'Renforce les défenses', icon: '🛡️', category: 'Défense' },
    
    // Culture/Knowledge (Yellow) - 3-6 tours
    { id: 'library', name: 'Bibliothèque', cost: { wood: 15, stone: 8, gold: 12 }, constructionTime: 4, description: 'Centre de connaissance', icon: '📚', category: 'Culture' },
    { id: 'temple', name: 'Temple', cost: { stone: 15, gold: 18, precious_metals: 3 }, constructionTime: 6, description: 'Améliore la culture et le moral', icon: '⛪', category: 'Culture' },
    { id: 'sanctuary', name: 'Sanctuaire', cost: { stone: 12, gold: 15, mana: 5 }, constructionTime: 5, description: 'Lieu de recueillement', icon: '🕊️', category: 'Culture' },
    { id: 'obelisk', name: 'Obélisque', cost: { stone: 20, precious_metals: 5, gold: 10 }, constructionTime: 3, description: 'Monument culturel', icon: '🏛️', category: 'Culture' },
    
    // Magic/Special (Purple) - 7-10 tours
    { id: 'mystic_portal', name: 'Portail Mystique', cost: { crystals: 8, mana: 15, ancient_knowledge: 5, precious_metals: 10 }, constructionTime: 10, description: 'Permet les voyages magiques', icon: '🌀', category: 'Magie' },
    { id: 'legendary_forge', name: 'Forge Légendaire', cost: { iron: 20, crystals: 6, mana: 10, precious_metals: 8 }, constructionTime: 8, description: 'Crée des objets magiques', icon: '🔥', category: 'Magie' },
    { id: 'laboratory', name: 'Laboratoire', cost: { stone: 15, crystals: 5, mana: 8, ancient_knowledge: 3 }, constructionTime: 7, description: 'Recherche alchimique', icon: '🧪', category: 'Magie' },
    
    // Ancient/Ruins (Black) - 5-8 tours
    { id: 'ancient_hall', name: 'Salle Ancienne', cost: { stone: 20, ancient_knowledge: 8, mana: 5, gold: 15 }, constructionTime: 8, description: 'Révèle les secrets du passé', icon: '🏚️', category: 'Ancien' },
    { id: 'underground_base', name: 'Base Souterraine', cost: { stone: 18, iron: 10, ancient_knowledge: 4, gold: 12 }, constructionTime: 6, description: 'Refuge secret', icon: '🕳️', category: 'Ancien' },
    { id: 'cave_dwelling', name: 'Habitation Troglodyte', cost: { stone: 12, wood: 8, food: 6 }, constructionTime: 5, description: 'Logement dans les grottes', icon: '🏔️', category: 'Ancien' }
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

  const getBuildingProduction = (buildingId: string): Record<string, number> => {
    const productions: Record<string, Record<string, number>> = {
      // Agriculture
      'farm': { food: 3, gold: 1 },
      'garden': { food: 2 },
      'sawmill': { wood: 2, gold: 1 },
      
      // Transport/Commercial
      'port': { gold: 4, food: 1 },
      'market': { gold: 6 },
      'road': { gold: 2 },
      'shipyard': { gold: 3, wood: 1 },
      
      // Defense (no resource production, only protection)
      'fortress': {},
      'watchtower': {},
      'fortifications': {},
      
      // Culture
      'library': { ancient_knowledge: 1 },
      'temple': { gold: 2, mana: 1 },
      'sanctuary': { mana: 2 },
      'obelisk': { gold: 1 },
      
      // Magic
      'mystic_portal': { mana: 3, ancient_knowledge: 1 },
      'legendary_forge': { precious_metals: 2, crystals: 1 },
      'laboratory': { mana: 2, crystals: 1, ancient_knowledge: 1 },
      
      // Ancient
      'ancient_hall': { ancient_knowledge: 3, mana: 1 },
      'underground_base': { stone: 2, iron: 1 },
      'cave_dwelling': { stone: 1, food: 1 }
    };
    return productions[buildingId] || {};
  };

  const formatProduction = (production: Record<string, number>): string => {
    const entries = Object.entries(production);
    if (entries.length === 0) return "Aucune production de ressources";
    
    return entries
      .map(([resource, amount]) => `+${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  const formatResourceCost = (cost: Record<string, number>): string => {
    return Object.entries(cost)
      .map(([resource, amount]) => `${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  const canAffordBuilding = (buildingId: string): boolean => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !currentNovaImperium) return false;
    
    const actionCost = getBuildingCost(buildingId);
    const resources = currentNovaImperium.resources;
    
    // Check Action Points
    if (!canAffordAction(actionPoints, actionCost)) return false;
    
    // Check all required resources
    return Object.entries(building.cost).every(([resource, amount]) => {
      return resources[resource as keyof Resources] >= amount;
    });
  };

  const handleBuild = (buildingId: string, cityId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !currentNovaImperium) return;
    
    const actionCost = getBuildingCost(buildingId);
    
    if (canAffordBuilding(buildingId)) {
      const success = spendActionPoints(actionCost);
      if (success) {
        buildInCity(cityId, buildingId, building.cost, building.constructionTime);
        console.log(`Construction de ${buildingId} lancée pour ${building.constructionTime} tours, ${actionCost} PA et ressources déduites`);
      }
    } else {
      console.log(`Ressources insuffisantes pour construire ${buildingId}`);
    }
  };

  const handleMouseEnter = (buildingId: string, event: React.MouseEvent) => {
    setHoveredBuilding(buildingId);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredBuilding(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredBuilding) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Projets de Construction</h4>
      </div>

      {currentNovaImperium.cities.map(city => (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">{city.name}</div>

          
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
                🕐 {city.productionProgress}/{city.currentProduction.cost} tours
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 mb-3">Aucune construction en cours</div>
          )}

          <div className="space-y-3">
            {['Transport', 'Agriculture', 'Défense', 'Culture', 'Magie', 'Ancien'].map(category => {
              const categoryBuildings = buildings.filter(b => b.category === category);
              return (
                <div key={category} className="space-y-1">
                  <div className="text-xs font-bold text-amber-800 border-b border-amber-300 pb-1">
                    {category}
                  </div>
                  {categoryBuildings.map(building => (
                    <div 
                      key={building.id} 
                      className="flex items-center justify-between"
                      onMouseEnter={(e) => handleMouseEnter(building.id, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{building.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{building.name}</div>
                          <div className="text-xs text-amber-700">
                            {formatResourceCost(building.cost)} | {getBuildingCost(building.id)} ⚡
                          </div>
                          <div className="text-xs text-purple-600">
                            🕐 {building.constructionTime} tour{building.constructionTime > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleBuild(building.id, city.id)}
                        disabled={
                          city.currentProduction !== null || 
                          city.buildings.includes(building.id as any) || 
                          !canAffordBuilding(building.id)
                        }
                        className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                      >
                        {city.buildings.includes(building.id as any) ? 'Construit' : 
                         !canAffordBuilding(building.id) ? 'Ressources insuffisantes' : 'Construire'}
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Tooltip */}
      {hoveredBuilding && (
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
              {buildings.find(b => b.id === hoveredBuilding)?.name}
            </div>
            <div className="text-sm">
              {buildings.find(b => b.id === hoveredBuilding)?.description}
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Production par tour:</div>
              <div className="text-sm text-green-400">
                {formatProduction(getBuildingProduction(hoveredBuilding))}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Points d'Action:</div>
              <div className="text-sm text-blue-400">
                Génère {getBuildingAPGeneration(hoveredBuilding)} PA/tour
                {getBuildingMaxAPIncrease(hoveredBuilding) > 0 && (
                  <span className="text-purple-400"> | +{getBuildingMaxAPIncrease(hoveredBuilding)} PA max</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}