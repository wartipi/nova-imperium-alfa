import { useCallback } from 'react';
import { useNovaImperium } from '../stores/useNovaImperium';
import { UnifiedTerritorySystem } from '../systems/UnifiedTerritorySystem';
import type { City } from '../../../shared/gameSchema';

/**
 * Hook dedicated to city selection and management logic
 * Extracts city-specific functionality from GameCanvas
 */
export const useCitySelection = () => {
  const { currentNovaImperium, addCity } = useNovaImperium();

  const findOrCreateCity = useCallback((x: number, y: number): City | null => {
    if (!currentNovaImperium) return null;

    // Look for existing city at position
    let city = currentNovaImperium.cities.find(c => c.x === x && c.y === y);
    console.log('🏘️ Debug clic - Position:', x, y, 'Villes trouvées:', currentNovaImperium.cities.map(c => `${c.name}(${c.x},${c.y})`));
    
    // If no city found but there's a territory with a colony, create the city
    if (!city) {
      const territory = UnifiedTerritorySystem.getTerritory(x, y);
      if (territory && territory.colonyId) {
        console.log('🏘️ Territoire trouvé avec colonie, création de la ville:', territory);
        
        // Create complete city object with all required properties
        city = {
          id: territory.colonyId,
          name: territory.colonyName || `Colonie ${territory.colonyId}`,
          x: x,
          y: y,
          population: 1,
          populationCap: 10,
          buildings: [],
          currentProduction: null,
          productionProgress: 0,
          foodPerTurn: 0,       // Phase 8 : valeur temporaire avant hydrateCitiesFromServer()
          productionPerTurn: 0, // Phase 8 : valeur temporaire avant hydrateCitiesFromServer()
          sciencePerTurn: 1,
          culturePerTurn: 1,
          workingHexes: []
        };
        
        if (city) {
          addCity(city);
          console.log('🏘️ Ville créée et ajoutée:', city);
        }
      }
    }
    
    return city || null;
  }, [currentNovaImperium, addCity]);

  const getCityAtPosition = useCallback((x: number, y: number): City | null => {
    if (!currentNovaImperium) return null;
    return currentNovaImperium.cities.find(c => c.x === x && c.y === y) || null;
  }, [currentNovaImperium]);

  const selectCity = useCallback((x: number, y: number): { city: City | null; cityId: string | null } => {
    const city = findOrCreateCity(x, y);
    
    if (city) {
      console.log('🏘️ Clic sur la colonie:', city.name, 'à', x, y, 'ID:', city.id);
      return { city, cityId: city.id };
    }
    
    return { city: null, cityId: null };
  }, [findOrCreateCity]);

  return {
    findOrCreateCity,
    selectCity,
    getCityAtPosition
  };
};