import type { NovaImperium, Unit, City } from "./types";

export class AI {
  static processTurn(novaImperium: NovaImperium) {
    console.log(`Processing AI turn for ${novaImperium.name}`);
    
    // Simple AI behavior
    this.manageCities(novaImperium);
    this.moveUnits(novaImperium);
    this.makeResearchDecisions(novaImperium);
    this.makeDiplomaticDecisions(novaImperium);
  }

  private static manageCities(novaImperium: NovaImperium) {
    novaImperium.cities.forEach(city => {
      // Simple city management
      if (!city.currentProduction) {
        // Prioritize based on city needs
        if (city.population < 3) {
          // Build granary for food
          city.currentProduction = {
            type: 'building',
            name: 'granary',
            cost: 60
          };
        } else if (novaImperium.units.length < 3) {
          // Build military units
          city.currentProduction = {
            type: 'unit',
            name: 'warrior',
            cost: 40
          };
        } else {
          // Build library for science
          city.currentProduction = {
            type: 'building',
            name: 'library',
            cost: 90
          };
        }
      }
    });
  }

  private static moveUnits(novaImperium: NovaImperium) {
    novaImperium.units.forEach(unit => {
      if (unit.movement > 0) {
        // Simple movement AI - move randomly for now
        const directions = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
          { dx: 1, dy: 1 },
          { dx: -1, dy: -1 }
        ];
        
        const direction = directions[Math.floor(Math.random() * directions.length)];
        unit.x = Math.max(0, unit.x + direction.dx);
        unit.y = Math.max(0, unit.y + direction.dy);
        unit.movement--;
      }
    });
  }

  private static makeResearchDecisions(novaImperium: NovaImperium) {
    if (!novaImperium.currentResearch) {
      // Simple research priority
      const availableTechs = ['pottery', 'bronze_working', 'writing', 'iron_working'];
      const unresearched = availableTechs.filter(tech => 
        !novaImperium.researchedTechnologies.includes(tech)
      );
      
      if (unresearched.length > 0) {
        const techToResearch = unresearched[0];
        novaImperium.currentResearch = {
          id: techToResearch,
          name: techToResearch.replace('_', ' ').toUpperCase(),
          cost: 100,
          description: `Research ${techToResearch}`,
          prerequisites: []
        };
      }
    }
  }

  private static makeDiplomaticDecisions(novaImperium: NovaImperium) {
    // Simple diplomatic AI
    novaImperium.diplomacy.forEach(relation => {
      // Randomly adjust trust
      if (Math.random() < 0.1) {
        relation.trust = Math.max(0, Math.min(100, relation.trust + (Math.random() - 0.5) * 10));
      }
      
      // Simple diplomatic proposals
      if (relation.trust > 70 && relation.status === 'peace' && Math.random() < 0.05) {
        relation.status = 'alliance';
      } else if (relation.trust < 30 && relation.status === 'peace' && Math.random() < 0.05) {
        relation.status = 'war';
      }
    });
  }
}
