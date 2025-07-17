import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { useGameState } from "../../lib/stores/useGameState";

export function ActivityReportPanel() {
  const { currentNovaImperium } = useNovaImperium();
  const { currentTurn } = useGameState();

  if (!currentNovaImperium) return null;

  const totalPopulation = currentNovaImperium.cities.reduce((sum, city) => sum + city.population, 0);
  const totalProduction = currentNovaImperium.cities.reduce((sum, city) => sum + city.productionPerTurn, 0);
  const totalScience = currentNovaImperium.cities.reduce((sum, city) => sum + city.sciencePerTurn, 0);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Rapport d'Activités</h4>
        <div className="text-sm text-amber-700">Tour {currentTurn}</div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Statistiques Générales</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Villes: {currentNovaImperium.cities.length}</div>
          <div>Unités: {currentNovaImperium.units.length}</div>
          <div>Population: {totalPopulation}</div>
          <div>Technologies: {currentNovaImperium.researchedTechnologies.length}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Production par Tour</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>🌾 Nourriture:</span>
            <span>+{currentNovaImperium.cities.reduce((sum, city) => sum + city.foodPerTurn, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>🔨 Production:</span>
            <span>+{totalProduction}</span>
          </div>
          <div className="flex justify-between">
            <span>🔬 Science:</span>
            <span>+{totalScience}</span>
          </div>
          <div className="flex justify-between">
            <span>🎭 Culture:</span>
            <span>+{currentNovaImperium.cities.reduce((sum, city) => sum + city.culturePerTurn, 0)}</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Projets en Cours</div>
        <div className="space-y-1 text-xs">
          {currentNovaImperium.cities.map(city => (
            <div key={city.id}>
              <div className="font-medium">{city.name}:</div>
              <div className="text-amber-700 ml-2">
                {city.currentProduction ? 
                  `${city.currentProduction.name} (${Math.ceil((city.currentProduction.cost - city.productionProgress) / city.productionPerTurn)} tours)` : 
                  'Aucun projet'
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Recherche Actuelle</div>
        <div className="text-xs">
          {currentCivilization.currentResearch ? (
            <div>
              <div className="font-medium">{currentCivilization.currentResearch.name}</div>
              <div className="text-amber-700">
                Progrès: {currentCivilization.researchProgress}/{currentCivilization.currentResearch.cost}
              </div>
              <div className="text-amber-700">
                Temps restant: {Math.ceil((currentCivilization.currentResearch.cost - currentCivilization.researchProgress) / totalScience)} tours
              </div>
            </div>
          ) : (
            <div className="text-amber-700">Aucune recherche en cours</div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Relations Diplomatiques</div>
        <div className="space-y-1 text-xs">
          {currentCivilization.diplomacy.map(relation => {
            const statusColor = relation.status === 'war' ? 'text-red-600' : 
                               relation.status === 'alliance' ? 'text-blue-600' : 
                               'text-green-600';
            return (
              <div key={relation.civilizationId} className="flex justify-between">
                <span>Civilisation {relation.civilizationId}:</span>
                <span className={statusColor}>{relation.status.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}