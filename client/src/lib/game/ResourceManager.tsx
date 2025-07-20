import type { Resources } from "./types";

/**
 * Gestionnaire centralisé des ressources pour Nova Imperium
 * Conforme aux recommandations de modularisation
 */
export class ResourceManager {
  
  /**
   * Calcule la production de ressources basée sur les territoires contrôlés
   */
  static calculateTerritoryProduction(controlledTiles: any[]): Resources {
    let production: Resources = {
      or: 0,
      bois: 0,
      nourriture: 0,
      pierre: 0,
      fer: 0,
      chevaux: 0
    };

    controlledTiles.forEach(tile => {
      switch (tile.terrain) {
        case 'fertile_land':
          production.nourriture += 3;
          production.or += 1;
          break;
        case 'forest':
          production.bois += 4;
          production.nourriture += 1;
          break;
        case 'hills':
          production.pierre += 3;
          production.fer += 1;
          break;
        case 'volcano':
          production.fer += 2;
          production.pierre += 1;
          break;
        case 'desert':
          production.or += 2;
          break;
        case 'wasteland':
          // Pas de production
          break;
        case 'shallow_water':
          production.nourriture += 2; // Pêche
          break;
        case 'deep_water':
          production.nourriture += 1; // Pêche en profondeur
          break;
      }

      // Bonus pour les ressources spéciales
      if (tile.resource) {
        switch (tile.resource) {
          case 'gold':
            production.or += 5;
            break;
          case 'iron':
            production.fer += 3;
            break;
          case 'horses':
            production.chevaux += 2;
            break;
          case 'stone':
            production.pierre += 3;
            break;
          case 'wood':
            production.bois += 3;
            break;
          case 'fish':
            production.nourriture += 4;
            break;
          case 'whales':
            production.nourriture += 6;
            production.or += 2;
            break;
          case 'oil':
            production.or += 3;
            break;
        }
      }
    });

    return production;
  }

  /**
   * Applique les coûts de maintenance des unités et bâtiments
   */
  static calculateMaintenanceCosts(units: any[], buildings: any[]): Resources {
    let costs: Resources = {
      or: 0,
      bois: 0,
      nourriture: 0,
      pierre: 0,
      fer: 0,
      chevaux: 0
    };

    // Coûts de maintenance des unités
    units.forEach(unit => {
      switch (unit.type) {
        case 'warrior':
          costs.nourriture += 1;
          break;
        case 'archer':
          costs.nourriture += 1;
          costs.bois += 1;
          break;
        case 'cavalry':
          costs.nourriture += 2;
          costs.chevaux += 1;
          break;
        case 'siege':
          costs.nourriture += 2;
          costs.fer += 1;
          break;
      }
    });

    // Coûts de maintenance des bâtiments
    buildings.forEach(building => {
      switch (building.type) {
        case 'granary':
          costs.or += 1;
          break;
        case 'library':
          costs.or += 2;
          break;
        case 'barracks':
          costs.or += 3;
          break;
        case 'walls':
          costs.or += 2;
          costs.pierre += 1;
          break;
      }
    });

    return costs;
  }

  /**
   * Valide si les ressources sont suffisantes pour une action
   */
  static canAfford(currentResources: Resources, cost: Resources): boolean {
    return (
      currentResources.or >= cost.or &&
      currentResources.bois >= cost.bois &&
      currentResources.nourriture >= cost.nourriture &&
      currentResources.pierre >= cost.pierre &&
      currentResources.fer >= cost.fer &&
      currentResources.chevaux >= cost.chevaux
    );
  }

  /**
   * Soustrait les coûts des ressources actuelles
   */
  static spendResources(currentResources: Resources, cost: Resources): Resources {
    return {
      or: Math.max(0, currentResources.or - cost.or),
      bois: Math.max(0, currentResources.bois - cost.bois),
      nourriture: Math.max(0, currentResources.nourriture - cost.nourriture),
      pierre: Math.max(0, currentResources.pierre - cost.pierre),
      fer: Math.max(0, currentResources.fer - cost.fer),
      chevaux: Math.max(0, currentResources.chevaux - cost.chevaux)
    };
  }

  /**
   * Ajoute des ressources (pour la production ou les événements)
   */
  static addResources(currentResources: Resources, gain: Resources): Resources {
    return {
      or: currentResources.or + gain.or,
      bois: currentResources.bois + gain.bois,
      nourriture: currentResources.nourriture + gain.nourriture,
      pierre: currentResources.pierre + gain.pierre,
      fer: currentResources.fer + gain.fer,
      chevaux: currentResources.chevaux + gain.chevaux
    };
  }

  /**
   * Formate les ressources pour l'affichage
   */
  static formatResources(resources: Resources): string {
    return `Or: ${resources.or}, Bois: ${resources.bois}, Nourriture: ${resources.nourriture}, Pierre: ${resources.pierre}, Fer: ${resources.fer}, Chevaux: ${resources.chevaux}`;
  }

  /**
   * Calcule le score total des ressources (pour les classements)
   */
  static calculateResourceScore(resources: Resources): number {
    return (
      resources.or * 2 +
      resources.bois * 1 +
      resources.nourriture * 1 +
      resources.pierre * 1.5 +
      resources.fer * 3 +
      resources.chevaux * 5
    );
  }
}