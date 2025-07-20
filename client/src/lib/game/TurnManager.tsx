import type { NovaImperium, Resources } from "./types";
import { ResourceManager } from "./ResourceManager";

/**
 * Gestionnaire centralisé des tours pour Nova Imperium
 * Conforme aux recommandations de modularisation
 */
export class TurnManager {
  
  /**
   * Traite la fin du tour pour tous les Nova Imperiums
   */
  static processEndOfTurn(
    novaImperiums: NovaImperium[],
    mapData: any[][],
    currentTurn: number
  ): {
    updatedNovaImperiums: NovaImperium[];
    turnEvents: TurnEvent[];
    globalStats: TurnStats;
  } {
    const turnEvents: TurnEvent[] = [];
    const updatedNovaImperiums: NovaImperium[] = [];

    console.log(`🎯 Traitement de la fin du tour ${currentTurn}`);

    novaImperiums.forEach(imperium => {
      const updatedImperium = this.processNovaImperiumTurn(imperium, mapData);
      updatedNovaImperiums.push(updatedImperium);

      // Générer des événements pour ce Nova Imperium
      const events = this.generateTurnEvents(imperium, updatedImperium);
      turnEvents.push(...events);
    });

    const globalStats = this.calculateGlobalStats(updatedNovaImperiums);

    console.log(`✅ Fin du tour ${currentTurn} traitée`);
    console.log(`📊 Événements générés: ${turnEvents.length}`);

    return {
      updatedNovaImperiums,
      turnEvents,
      globalStats
    };
  }

  /**
   * Traite le tour d'un Nova Imperium spécifique
   */
  static processNovaImperiumTurn(imperium: NovaImperium, mapData: any[][]): NovaImperium {
    // 1. Calculer la production de ressources
    const controlledTiles = this.getControlledTiles(imperium, mapData);
    const resourceProduction = ResourceManager.calculateTerritoryProduction(controlledTiles);

    // 2. Calculer les coûts de maintenance
    const maintenanceCosts = ResourceManager.calculateMaintenanceCosts(
      imperium.units,
      imperium.cities.flatMap(city => city.buildings)
    );

    // 3. Appliquer la production et les coûts
    let newResources = ResourceManager.addResources(imperium.resources, resourceProduction);
    newResources = ResourceManager.spendResources(newResources, maintenanceCosts);

    // 4. Traiter les villes
    const updatedCities = imperium.cities.map(city => this.processCityTurn(city, newResources));

    // 5. Traiter la recherche
    const researchUpdate = this.processResearch(imperium, newResources);

    // 6. Traiter les unités
    const updatedUnits = imperium.units.map(unit => this.processUnitTurn(unit));

    return {
      ...imperium,
      resources: researchUpdate.resources,
      cities: updatedCities,
      units: updatedUnits,
      currentResearch: researchUpdate.currentResearch,
      researchProgress: researchUpdate.researchProgress,
      researchedTechnologies: researchUpdate.researchedTechnologies
    };
  }

  /**
   * Obtient les tuiles contrôlées par un Nova Imperium
   */
  static getControlledTiles(imperium: NovaImperium, mapData: any[][]): any[] {
    const controlledTiles: any[] = [];
    
    // Rayon de contrôle autour des villes
    imperium.cities.forEach(city => {
      const radius = 2; // Rayon de contrôle d'une ville
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = city.x + dx;
          const y = city.y + dy;
          
          if (y >= 0 && y < mapData.length && x >= 0 && x < mapData[y].length) {
            const distance = Math.abs(dx) + Math.abs(dy);
            if (distance <= radius) {
              controlledTiles.push({
                ...mapData[y][x],
                x,
                y,
                controlDistance: distance
              });
            }
          }
        }
      }
    });

    return controlledTiles;
  }

  /**
   * Traite le tour d'une ville
   */
  static processCityTurn(city: any, imperiumResources: Resources): any {
    let updatedCity = { ...city };

    // Croissance de la population
    if (imperiumResources.nourriture >= city.population) {
      const growthRate = Math.min(0.1, imperiumResources.nourriture / (city.population * 10));
      updatedCity.population = Math.floor(city.population * (1 + growthRate));
    }

    // Production de bâtiments/unités
    if (city.currentProduction) {
      updatedCity.productionProgress += city.productionPerTurn;
      
      if (updatedCity.productionProgress >= city.currentProduction.cost) {
        // Production terminée
        console.log(`🏗️ ${city.name} a terminé: ${city.currentProduction.name}`);
        updatedCity.currentProduction = null;
        updatedCity.productionProgress = 0;
      }
    }

    return updatedCity;
  }

  /**
   * Traite la recherche d'un Nova Imperium
   */
  static processResearch(imperium: NovaImperium, resources: Resources): {
    resources: Resources;
    currentResearch: any;
    researchProgress: number;
    researchedTechnologies: string[];
  } {
    let updatedResources = { ...resources };
    let currentResearch = imperium.currentResearch;
    let researchProgress = imperium.researchProgress;
    let researchedTechnologies = [...imperium.researchedTechnologies];

    if (currentResearch) {
      const scienceProduction = imperium.cities.reduce((total, city) => total + city.sciencePerTurn, 0);
      researchProgress += scienceProduction;

      if (researchProgress >= currentResearch.cost) {
        // Recherche terminée
        console.log(`🔬 ${imperium.name} a recherché: ${currentResearch.name}`);
        researchedTechnologies.push(currentResearch.id);
        currentResearch = null;
        researchProgress = 0;
      }
    }

    return {
      resources: updatedResources,
      currentResearch,
      researchProgress,
      researchedTechnologies
    };
  }

  /**
   * Traite le tour d'une unité
   */
  static processUnitTurn(unit: any): any {
    let updatedUnit = { ...unit };

    // Régénération des points de mouvement
    updatedUnit.movementPoints = unit.maxMovementPoints;

    // Guérison des unités blessées
    if (unit.health < unit.maxHealth) {
      updatedUnit.health = Math.min(unit.maxHealth, unit.health + 10);
    }

    return updatedUnit;
  }

  /**
   * Génère des événements pour ce tour
   */
  static generateTurnEvents(oldImperium: NovaImperium, newImperium: NovaImperium): TurnEvent[] {
    const events: TurnEvent[] = [];

    // Événement de croissance de population
    newImperium.cities.forEach((city, index) => {
      const oldCity = oldImperium.cities[index];
      if (oldCity && city.population > oldCity.population) {
        events.push({
          type: 'population_growth',
          imperiumId: newImperium.id,
          message: `${city.name} a grandi! Population: ${city.population}`,
          data: { cityName: city.name, newPopulation: city.population }
        });
      }
    });

    // Événement de recherche terminée
    if (oldImperium.currentResearch && !newImperium.currentResearch) {
      events.push({
        type: 'research_completed',
        imperiumId: newImperium.id,
        message: `Recherche terminée: ${oldImperium.currentResearch.name}`,
        data: { technology: oldImperium.currentResearch }
      });
    }

    return events;
  }

  /**
   * Calcule les statistiques globales du tour
   */
  static calculateGlobalStats(novaImperiums: NovaImperium[]): TurnStats {
    const totalPopulation = novaImperiums.reduce(
      (total, imperium) => total + imperium.cities.reduce((cityTotal, city) => cityTotal + city.population, 0),
      0
    );

    const totalCities = novaImperiums.reduce((total, imperium) => total + imperium.cities.length, 0);
    const totalUnits = novaImperiums.reduce((total, imperium) => total + imperium.units.length, 0);

    const strongestImperium = novaImperiums.reduce((strongest, current) => {
      const currentScore = ResourceManager.calculateResourceScore(current.resources);
      const strongestScore = ResourceManager.calculateResourceScore(strongest.resources);
      return currentScore > strongestScore ? current : strongest;
    });

    return {
      totalPopulation,
      totalCities,
      totalUnits,
      strongestImperiumId: strongestImperium.id
    };
  }
}

// Types pour les événements et statistiques
export interface TurnEvent {
  type: string;
  imperiumId: string;
  message: string;
  data?: any;
}

export interface TurnStats {
  totalPopulation: number;
  totalCities: number;
  totalUnits: number;
  strongestImperiumId: string;
}