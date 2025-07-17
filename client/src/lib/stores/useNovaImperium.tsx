import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { NovaImperium, Unit, City, DiplomaticRelation } from "../game/types";
import { AI } from "../game/AI";

interface NovaImperiumState {
  novaImperiums: NovaImperium[];
  currentNovaImperiumId: string;
  selectedUnit: Unit | null;
  selectedCity: City | null;
  currentNovaImperium: NovaImperium | null;
  
  // Actions
  initializeNovaImperiums: () => void;
  selectUnit: (unitId: string) => void;
  selectCity: (cityId: string) => void;
  moveUnit: (unitId: string, x: number, y: number) => void;
  attackWithUnit: (unitId: string, targetX: number, targetY: number) => void;
  buildInCity: (cityId: string, buildingType: string) => void;
  trainUnit: (cityId: string, unitType: string) => void;
  researchTechnology: (techId: string) => void;
  sendDiplomaticProposal: (targetNIId: string, type: string) => void;
  processTurn: () => void;
}

const createInitialNovaImperiums = (): NovaImperium[] => {
  return [
    {
      id: "player",
      name: "Empire du Joueur",
      color: "#FF0000",
      isPlayer: true,
      isDefeated: false,
      cities: [
        {
          id: "capital",
          name: "Capitale",
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
          name: "Guerrier Impérial",
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
          name: "Colon Impérial",
          type: "settler",
          x: 26,
          y: 15,
          strength: 0,
          attack: 0,
          defense: 1,
          health: 100,
          maxHealth: 100,
          movement: 2,
          maxMovement: 2,
          experience: 0,
          abilities: ["civilian"]
        }
      ],
      resources: {
        food: 40,
        action_points: 25,
        gold: 80,
        // Strategic resources
        iron: 5,
        stone: 10,
        wood: 15,
        // Magical resources for Nova Imperium
        mana: 20,
        crystals: 3,
        ancient_knowledge: 5
      },
      researchedTechnologies: ["agriculture"],
      currentResearch: null,
      researchProgress: 0,
      diplomacy: []
    },
    {
      id: "ai1",
      name: "Empire Rival",
      color: "#0000FF",
      isPlayer: false,
      isDefeated: false,
      cities: [
        {
          id: "ai_capital",
          name: "Cité Rivale",
          x: 15,
          y: 20,
          population: 2,
          populationCap: 8,
          foodPerTurn: 3,
          productionPerTurn: 2,
          sciencePerTurn: 1,
          culturePerTurn: 1,
          buildings: ["palace"],
          currentProduction: null,
          productionProgress: 0,
          workingHexes: []
        }
      ],
      units: [
        {
          id: "ai_warrior1",
          name: "Guerrier Rival",
          type: "warrior",
          x: 15,
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
        food: 30,
        action_points: 20,
        gold: 60,
        // Strategic resources
        iron: 3,
        stone: 6,
        wood: 12,
        // Magical resources for Nova Imperium
        mana: 15,
        crystals: 2,
        ancient_knowledge: 3
      },
      researchedTechnologies: ["agriculture"],
      currentResearch: null,
      researchProgress: 0,
      diplomacy: [
        {
          novaImperiumId: "player",
          status: "peace",
          trust: 50,
          tradeAgreement: false,
          militaryAccess: false
        }
      ]
    }
  ];
};

export const useNovaImperium = create<NovaImperiumState>()(
  subscribeWithSelector((set, get) => ({
    novaImperiums: [],
    currentNovaImperiumId: "player",
    selectedUnit: null,
    selectedCity: null,
    currentNovaImperium: null,

    initializeNovaImperiums: () => {
      const initialNovaImperiums = createInitialNovaImperiums();
      const currentNI = initialNovaImperiums.find(ni => ni.id === "player") || null;
      set({ 
        novaImperiums: initialNovaImperiums,
        currentNovaImperium: currentNI 
      });
    },
    
    selectUnit: (unitId: string) => {
      const state = get();
      const currentNI = state.novaImperiums.find(ni => ni.id === state.currentNovaImperiumId);
      if (currentNI) {
        const unit = currentNI.units.find(u => u.id === unitId);
        set({ selectedUnit: unit || null });
      }
    },
    
    selectCity: (cityId: string) => {
      const state = get();
      const currentNI = state.novaImperiums.find(ni => ni.id === state.currentNovaImperiumId);
      if (currentNI) {
        const city = currentNI.cities.find(c => c.id === cityId);
        set({ selectedCity: city || null });
      }
    },
    
    moveUnit: (unitId: string, x: number, y: number) => {
      set(state => {
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            units: ni.units.map(unit => 
              unit.id === unitId ? {
                ...unit,
                x,
                y,
                movement: Math.max(0, unit.movement - 1)
              } : unit
            )
          } : ni
        );
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
        };
      });
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
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            cities: ni.cities.map(city => 
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
          } : ni
        );
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
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
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            cities: ni.cities.map(city => 
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
          } : ni
        );
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
        };
      });
    },
    
    researchTechnology: (techId: string) => {
      console.log(`Researching technology: ${techId}`);
    },
    
    sendDiplomaticProposal: (targetNIId: string, type: string) => {
      console.log(`Sending ${type} proposal to ${targetNIId}`);
    },
    
    processTurn: () => {
      set(state => {
        const updatedNIs = state.novaImperiums.map(ni => {
          const updatedNI = {
            ...ni,
            units: ni.units.map(unit => ({
              ...unit,
              movement: unit.maxMovement
            }))
          };
          
          // Process cities
          updatedNI.cities.forEach(city => {
            // Add resources - only for food now
            updatedNI.resources.food += city.foodPerTurn;
            
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
          if (!ni.isPlayer) {
            AI.processTurn(updatedNI);
          }
          
          return updatedNI;
        });
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
        };
      });
    }
  }))
);