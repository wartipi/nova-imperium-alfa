import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Civilization, Unit, City, DiplomaticRelation } from "../game/types";
import { AI } from "../game/AI";

interface CivilizationState {
  civilizations: Civilization[];
  currentCivilizationId: string;
  selectedUnit: Unit | null;
  selectedCity: City | null;
  currentCivilization: Civilization | null;
  
  // Actions
  initializeCivilizations: () => void;
  selectUnit: (unitId: string) => void;
  selectCity: (cityId: string) => void;
  moveUnit: (unitId: string, x: number, y: number) => void;
  attackWithUnit: (unitId: string, targetX: number, targetY: number) => void;
  buildInCity: (cityId: string, buildingType: string) => void;
  trainUnit: (cityId: string, unitType: string) => void;
  researchTechnology: (techId: string) => void;
  sendDiplomaticProposal: (targetCivId: string, type: string) => void;
  processTurn: () => void;
}

const createInitialCivilizations = (): Civilization[] => {
  return [
    {
      id: "player",
      name: "Romans",
      color: "#FF0000",
      isPlayer: true,
      isDefeated: false,
      cities: [
        {
          id: "rome",
          name: "Rome",
          x: 25,
          y: 15,
          population: 3,
          populationCap: 10,
          foodPerTurn: 4,
          productionPerTurn: 3,
          sciencePerTurn: 2,
          culturePerTurn: 1,
          buildings: ["palace"],
          currentProduction: null,
          productionProgress: 0,
          workingHexes: []
        }
      ],
      units: [
        {
          id: "warrior1",
          name: "Roman Warrior",
          type: "warrior",
          x: 25,
          y: 14,
          strength: 4,
          attack: 4,
          defense: 3,
          health: 100,
          maxHealth: 100,
          movement: 2,
          maxMovement: 2,
          experience: 0,
          abilities: ["melee"]
        },
        {
          id: "settler1",
          name: "Roman Settler",
          type: "settler",
          x: 26,
          y: 15,
          strength: 0,
          attack: 0,
          defense: 1,
          health: 100,
          maxHealth: 100,
          movement: 1,
          maxMovement: 1,
          experience: 0,
          abilities: ["found_city"]
        }
      ],
      resources: {
        food: 50,
        production: 30,
        science: 10,
        culture: 5,
        gold: 100
      },
      researchedTechnologies: ["agriculture"],
      currentResearch: null,
      researchProgress: 0,
      diplomacy: [
        {
          civilizationId: "ai1",
          status: "peace",
          trust: 50,
          tradeAgreement: false,
          militaryAccess: false
        }
      ]
    },
    {
      id: "ai1",
      name: "Greeks",
      color: "#0000FF",
      isPlayer: false,
      isDefeated: false,
      cities: [
        {
          id: "athens",
          name: "Athens",
          x: 35,
          y: 20,
          population: 2,
          populationCap: 8,
          foodPerTurn: 3,
          productionPerTurn: 2,
          sciencePerTurn: 3,
          culturePerTurn: 2,
          buildings: ["palace"],
          currentProduction: null,
          productionProgress: 0,
          workingHexes: []
        }
      ],
      units: [
        {
          id: "greek_warrior1",
          name: "Greek Warrior",
          type: "warrior",
          x: 35,
          y: 19,
          strength: 4,
          attack: 4,
          defense: 3,
          health: 100,
          maxHealth: 100,
          movement: 2,
          maxMovement: 2,
          experience: 0,
          abilities: ["melee"]
        }
      ],
      resources: {
        food: 40,
        production: 25,
        science: 15,
        culture: 10,
        gold: 80
      },
      researchedTechnologies: ["agriculture"],
      currentResearch: null,
      researchProgress: 0,
      diplomacy: [
        {
          civilizationId: "player",
          status: "peace",
          trust: 50,
          tradeAgreement: false,
          militaryAccess: false
        }
      ]
    }
  ];
};

export const useCivilizations = create<CivilizationState>()(
  subscribeWithSelector((set, get) => ({
    civilizations: [],
    currentCivilizationId: "player",
    selectedUnit: null,
    selectedCity: null,
    currentCivilization: null,

    
    initializeCivilizations: () => {
      const initialCivilizations = createInitialCivilizations();
      const currentCiv = initialCivilizations.find(civ => civ.id === "player") || null;
      set({ 
        civilizations: initialCivilizations,
        currentCivilization: currentCiv 
      });
    },
    
    selectUnit: (unitId: string) => {
      const state = get();
      const currentCiv = state.civilizations.find(civ => civ.id === state.currentCivilizationId);
      if (currentCiv) {
        const unit = currentCiv.units.find(u => u.id === unitId);
        set({ selectedUnit: unit || null });
      }
    },
    
    selectCity: (cityId: string) => {
      const state = get();
      const currentCiv = state.civilizations.find(civ => civ.id === state.currentCivilizationId);
      if (currentCiv) {
        const city = currentCiv.cities.find(c => c.id === cityId);
        set({ selectedCity: city || null });
      }
    },
    
    moveUnit: (unitId: string, x: number, y: number) => {
      set(state => ({
        civilizations: state.civilizations.map(civ => 
          civ.id === state.currentCivilizationId ? {
            ...civ,
            units: civ.units.map(unit => 
              unit.id === unitId ? {
                ...unit,
                x,
                y,
                movement: Math.max(0, unit.movement - 1)
              } : unit
            )
          } : civ
        )
      }));
    },
    
    attackWithUnit: (unitId: string, targetX: number, targetY: number) => {
      console.log(`Unit ${unitId} attacking position (${targetX}, ${targetY})`);
      // Implement combat logic
    },
    
    buildInCity: (cityId: string, buildingType: string) => {
      const buildingCosts = {
        // Basic buildings
        granary: 60, library: 90, barracks: 80, market: 100,
        // Transport/Commercial
        port: 80, road: 40, shipyard: 120,
        // Agriculture/Nature
        farm: 50, sawmill: 70, garden: 60,
        // Defense/Military
        fortress: 150, watchtower: 80, fortifications: 120,
        // Culture/Knowledge
        temple: 120, sanctuary: 100, obelisk: 80,
        // Magic/Special
        mystic_portal: 200, legendary_forge: 180, laboratory: 160,
        // Ancient/Ruins
        ancient_hall: 140, underground_base: 130, cave_dwelling: 90
      };
      
      const cost = buildingCosts[buildingType as keyof typeof buildingCosts] || 50;
      
      set(state => {
        const updatedCivs = state.civilizations.map(civ => 
          civ.id === state.currentCivilizationId ? {
            ...civ,
            cities: civ.cities.map(city => 
              city.id === cityId ? {
                ...city,
                currentProduction: {
                  type: 'building',
                  name: buildingType,
                  cost
                },
                productionProgress: 0
              } : city
            )
          } : civ
        );
        
        const updatedCurrentCiv = updatedCivs.find(civ => civ.id === state.currentCivilizationId) || null;
        
        return {
          civilizations: updatedCivs,
          currentCivilization: updatedCurrentCiv
        };
      });
    },
    
    trainUnit: (cityId: string, unitType: string) => {
      const unitCosts = {
        // Basic Infantry
        warrior: 40, spearman: 60, swordsman: 80,
        // Ranged Units
        archer: 50, crossbowman: 70,
        // Siege Units
        catapult: 120, trebuchet: 150,
        // Cavalry
        horseman: 100, knight: 140,
        // Naval Units
        galley: 90, warship: 130,
        // Special Units
        scout: 30, settler: 100, diplomat: 80, spy: 90
      };
      
      const cost = unitCosts[unitType as keyof typeof unitCosts] || 40;
      
      set(state => {
        const updatedCivs = state.civilizations.map(civ => 
          civ.id === state.currentCivilizationId ? {
            ...civ,
            cities: civ.cities.map(city => 
              city.id === cityId ? {
                ...city,
                currentProduction: {
                  type: 'unit',
                  name: unitType,
                  cost
                },
                productionProgress: 0
              } : city
            )
          } : civ
        );
        
        const updatedCurrentCiv = updatedCivs.find(civ => civ.id === state.currentCivilizationId) || null;
        
        return {
          civilizations: updatedCivs,
          currentCivilization: updatedCurrentCiv
        };
      });
    },
    
    researchTechnology: (techId: string) => {
      // Implement technology research
      console.log(`Researching technology: ${techId}`);
    },
    
    sendDiplomaticProposal: (targetCivId: string, type: string) => {
      console.log(`Sending ${type} proposal to ${targetCivId}`);
      // Implement diplomacy logic
    },
    
    processTurn: () => {
      set(state => ({
        civilizations: state.civilizations.map(civ => {
          // Reset unit movement
          const updatedCiv = {
            ...civ,
            units: civ.units.map(unit => ({
              ...unit,
              movement: unit.maxMovement
            }))
          };
          
          // Process cities
          updatedCiv.cities.forEach(city => {
            // Add resources
            updatedCiv.resources.food += city.foodPerTurn;
            updatedCiv.resources.production += city.productionPerTurn;
            updatedCiv.resources.science += city.sciencePerTurn;
            updatedCiv.resources.culture += city.culturePerTurn;
            
            // Process production
            if (city.currentProduction) {
              city.productionProgress += city.productionPerTurn;
              
              if (city.productionProgress >= city.currentProduction.cost) {
                console.log(`${city.name} completed ${city.currentProduction.name}`);
                city.currentProduction = null;
                city.productionProgress = 0;
              }
            }
          });
          
          // Process AI turns
          if (!civ.isPlayer) {
            AI.processTurn(updatedCiv);
          }
          
          return updatedCiv;
        })
      }));
    }
  }))
);
