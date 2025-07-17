import type { Civilization, Unit, City } from "./types";

export class AI {
  static processTurn(civilization: Civilization) {
    console.log(`Processing AI turn for ${civilization.name}`);
    
    // Simple AI behavior
    this.manageCities(civilization);
    this.moveUnits(civilization);
    this.makeResearchDecisions(civilization);
    this.makeDiplomaticDecisions(civilization);
  }

  private static manageCities(civilization: Civilization) {
    civilization.cities.forEach(city => {
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
        } else if (civilization.units.length < 3) {
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

  private static moveUnits(civilization: Civilization) {
    civilization.units.forEach(unit => {
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

  private static makeResearchDecisions(civilization: Civilization) {
    if (!civilization.currentResearch) {
      // Simple research priority
      const availableTechs = ['pottery', 'bronze_working', 'writing', 'iron_working'];
      const unresearched = availableTechs.filter(tech => 
        !civilization.researchedTechnologies.includes(tech)
      );
      
      if (unresearched.length > 0) {
        const techToResearch = unresearched[0];
        civilization.currentResearch = {
          id: techToResearch,
          name: techToResearch.replace('_', ' ').toUpperCase(),
          cost: 100,
          description: `Research ${techToResearch}`,
          prerequisites: []
        };
      }
    }
  }

  private static makeDiplomaticDecisions(civilization: Civilization) {
    // Simple diplomatic AI
    civilization.diplomacy.forEach(relation => {
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
