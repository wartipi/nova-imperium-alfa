import { useCivilizations } from "../../lib/stores/useCivilizations";
import { Button } from "../ui/button";

export function ConstructionPanel() {
  const { currentCivilization, buildInCity } = useCivilizations();

  if (!currentCivilization) return null;

  const buildings = [
    // Transport/Commercial (Blue)
    { id: 'port', name: 'Port', cost: 80, description: 'Permet le commerce maritime', icon: '🚢', category: 'Transport' },
    { id: 'market', name: 'Marché', cost: 100, description: 'Augmente les revenus commerciaux', icon: '🏪', category: 'Transport' },
    { id: 'road', name: 'Route', cost: 40, description: 'Améliore les déplacements', icon: '🛤️', category: 'Transport' },
    { id: 'shipyard', name: 'Chantier Naval', cost: 120, description: 'Construit des navires', icon: '⚓', category: 'Transport' },
    
    // Agriculture/Nature (Green)
    { id: 'farm', name: 'Ferme', cost: 50, description: 'Augmente la production alimentaire', icon: '🚜', category: 'Agriculture' },
    { id: 'sawmill', name: 'Scierie', cost: 70, description: 'Exploite les ressources forestières', icon: '🪵', category: 'Agriculture' },
    { id: 'garden', name: 'Jardin', cost: 60, description: 'Améliore la beauté et la nourriture', icon: '🌻', category: 'Agriculture' },
    
    // Defense/Military (Red)
    { id: 'fortress', name: 'Forteresse', cost: 150, description: 'Défense militaire avancée', icon: '🏰', category: 'Défense' },
    { id: 'watchtower', name: 'Tour de Guet', cost: 80, description: 'Surveille les environs', icon: '🗼', category: 'Défense' },
    { id: 'fortifications', name: 'Fortifications', cost: 120, description: 'Renforce les défenses', icon: '🛡️', category: 'Défense' },
    
    // Culture/Knowledge (Yellow)
    { id: 'library', name: 'Bibliothèque', cost: 90, description: 'Centre de connaissance', icon: '📚', category: 'Culture' },
    { id: 'temple', name: 'Temple', cost: 120, description: 'Améliore la culture et le moral', icon: '⛪', category: 'Culture' },
    { id: 'sanctuary', name: 'Sanctuaire', cost: 100, description: 'Lieu de recueillement', icon: '🕊️', category: 'Culture' },
    { id: 'obelisk', name: 'Obélisque', cost: 80, description: 'Monument culturel', icon: '🏛️', category: 'Culture' },
    
    // Magic/Special (Purple)
    { id: 'mystic_portal', name: 'Portail Mystique', cost: 200, description: 'Permet les voyages magiques', icon: '🌀', category: 'Magie' },
    { id: 'legendary_forge', name: 'Forge Légendaire', cost: 180, description: 'Crée des objets magiques', icon: '🔥', category: 'Magie' },
    { id: 'laboratory', name: 'Laboratoire', cost: 160, description: 'Recherche alchimique', icon: '🧪', category: 'Magie' },
    
    // Ancient/Ruins (Black)
    { id: 'ancient_hall', name: 'Salle Ancienne', cost: 140, description: 'Révèle les secrets du passé', icon: '🏚️', category: 'Ancien' },
    { id: 'underground_base', name: 'Base Souterraine', cost: 130, description: 'Refuge secret', icon: '🕳️', category: 'Ancien' },
    { id: 'cave_dwelling', name: 'Habitation Troglodyte', cost: 90, description: 'Logement dans les grottes', icon: '🏔️', category: 'Ancien' }
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}