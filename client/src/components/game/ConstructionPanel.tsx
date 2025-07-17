import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { Button } from "../ui/button";
import { getBuildingCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { getBuildingAPGeneration, getBuildingMaxAPIncrease } from "../../lib/game/ActionPointsGeneration";
import { Resources } from "../../lib/game/types";

export function ConstructionPanel() {
  const { currentNovaImperium, buildInCity } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();

  if (!currentNovaImperium) return null;

  const buildings = [
    // Transport/Commercial (Blue)
    { id: 'port', name: 'Port', cost: { wood: 15, stone: 10, gold: 20 }, description: 'Permet le commerce maritime', icon: '🚢', category: 'Transport' },
    { id: 'market', name: 'Marché', cost: { wood: 10, gold: 25, food: 5 }, description: 'Augmente les revenus commerciaux', icon: '🏪', category: 'Transport' },
    { id: 'road', name: 'Route', cost: { stone: 8, gold: 12 }, description: 'Améliore les déplacements', icon: '🛤️', category: 'Transport' },
    { id: 'shipyard', name: 'Chantier Naval', cost: { wood: 20, iron: 8, gold: 15 }, description: 'Construit des navires', icon: '⚓', category: 'Transport' },
    
    // Agriculture/Nature (Green)
    { id: 'farm', name: 'Ferme', cost: { wood: 8, stone: 5, food: 10 }, description: 'Augmente la production alimentaire', icon: '🚜', category: 'Agriculture' },
    { id: 'sawmill', name: 'Scierie', cost: { wood: 12, iron: 6, stone: 4 }, description: 'Exploite les ressources forestières', icon: '🪵', category: 'Agriculture' },
    { id: 'garden', name: 'Jardin', cost: { wood: 6, stone: 3, food: 8 }, description: 'Améliore la beauté et la nourriture', icon: '🌻', category: 'Agriculture' },
    
    // Defense/Military (Red)
    { id: 'fortress', name: 'Forteresse', cost: { stone: 25, iron: 15, gold: 20 }, description: 'Défense militaire avancée', icon: '🏰', category: 'Défense' },
    { id: 'watchtower', name: 'Tour de Guet', cost: { wood: 8, stone: 12, iron: 5 }, description: 'Surveille les environs', icon: '🗼', category: 'Défense' },
    { id: 'fortifications', name: 'Fortifications', cost: { stone: 18, iron: 10, wood: 6 }, description: 'Renforce les défenses', icon: '🛡️', category: 'Défense' },
    
    // Culture/Knowledge (Yellow)
    { id: 'library', name: 'Bibliothèque', cost: { wood: 15, stone: 8, gold: 12 }, description: 'Centre de connaissance', icon: '📚', category: 'Culture' },
    { id: 'temple', name: 'Temple', cost: { stone: 15, gold: 18, precious_metals: 3 }, description: 'Améliore la culture et le moral', icon: '⛪', category: 'Culture' },
    { id: 'sanctuary', name: 'Sanctuaire', cost: { stone: 12, gold: 15, mana: 5 }, description: 'Lieu de recueillement', icon: '🕊️', category: 'Culture' },
    { id: 'obelisk', name: 'Obélisque', cost: { stone: 20, precious_metals: 5, gold: 10 }, description: 'Monument culturel', icon: '🏛️', category: 'Culture' },
    
    // Magic/Special (Purple)
    { id: 'mystic_portal', name: 'Portail Mystique', cost: { crystals: 8, mana: 15, ancient_knowledge: 5, precious_metals: 10 }, description: 'Permet les voyages magiques', icon: '🌀', category: 'Magie' },
    { id: 'legendary_forge', name: 'Forge Légendaire', cost: { iron: 20, crystals: 6, mana: 10, precious_metals: 8 }, description: 'Crée des objets magiques', icon: '🔥', category: 'Magie' },
    { id: 'laboratory', name: 'Laboratoire', cost: { stone: 15, crystals: 5, mana: 8, ancient_knowledge: 3 }, description: 'Recherche alchimique', icon: '🧪', category: 'Magie' },
    
    // Ancient/Ruins (Black)
    { id: 'ancient_hall', name: 'Salle Ancienne', cost: { stone: 20, ancient_knowledge: 8, mana: 5, gold: 15 }, description: 'Révèle les secrets du passé', icon: '🏚️', category: 'Ancien' },
    { id: 'underground_base', name: 'Base Souterraine', cost: { stone: 18, iron: 10, ancient_knowledge: 4, gold: 12 }, description: 'Refuge secret', icon: '🕳️', category: 'Ancien' },
    { id: 'cave_dwelling', name: 'Habitation Troglodyte', cost: { stone: 12, wood: 8, food: 6 }, description: 'Logement dans les grottes', icon: '🏔️', category: 'Ancien' }
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
        buildInCity(cityId, buildingId, building.cost);
        console.log(`Construction de ${buildingId} lancée pour ${actionCost} PA et ressources déduites`);
      }
    } else {
      console.log(`Ressources insuffisantes pour construire ${buildingId}`);
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
                {city.productionProgress}/{city.currentProduction.cost}
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
                    <div key={building.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{building.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{building.name}</div>
                          <div className="text-xs text-amber-700">
                            {formatResourceCost(building.cost)} | {getBuildingCost(building.id)} ⚡
                          </div>
                          <div className="text-xs text-amber-600 mt-1">
                            {building.description}
                          </div>
                          <div className="text-xs text-blue-600">
                            Génère {getBuildingAPGeneration(building.id)} PA/tour
                            {getBuildingMaxAPIncrease(building.id) > 0 && (
                              <span className="text-purple-600"> | +{getBuildingMaxAPIncrease(building.id)} PA max</span>
                            )}
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
    </div>
  );
}