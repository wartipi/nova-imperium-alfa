import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { NovaImperium, Unit, City, DiplomaticRelation, Resources } from "../game/types";
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
  buildInCity: (cityId: string, buildingType: string, resourceCost?: Record<string, number>, constructionTime?: number, isGameMaster?: boolean) => void;
  trainUnit: (cityId: string, unitType: string, cost?: Record<string, number>, recruitmentTime?: number) => void;
  addCity: (city: City) => void;
  foundColony: (x: number, y: number, colonyName: string, playerId: string, playerName: string, factionId: string, factionName: string) => boolean;
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
      cities: [], // Villes créées via le système de colonies
      units: [], // Unités créées via le système de recrutement
      resources: {
        food: 40,
        action_points: 25,
        gold: 80,
        // Strategic resources
        iron: 5,
        stone: 10,
        wood: 15,
        precious_metals: 8,
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
      cities: [], // Villes créées via le système de colonies
      units: [], // Unités créées via le système de recrutement
      resources: {
        food: 30,
        action_points: 20,
        gold: 60,
        // Strategic resources
        iron: 3,
        stone: 6,
        wood: 12,
        precious_metals: 4,
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
    },
    
    buildInCity: (cityId: string, buildingType: string, resourceCost?: Record<string, number>, constructionTime?: number, isGameMaster?: boolean) => {
      const buildingCosts = {
        granary: 60, library: 90, barracks: 80, market: 100,
        port: 80, road: 40, shipyard: 120,
        farm: 50, sawmill: 70, garden: 60,
        fortress: 150, watchtower: 80, fortifications: 120,
        temple: 120, sanctuary: 100, obelisk: 80,
        mystic_portal: 200, legendary_forge: 180, laboratory: 160,
        ancient_hall: 140, underground_base: 130, cave_dwelling: 90
      };
      
      const cost = constructionTime || buildingCosts[buildingType as keyof typeof buildingCosts] || 50;
      
      set(state => {
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            resources: resourceCost && !isGameMaster ? {
              ...ni.resources,
              ...Object.fromEntries(
                Object.entries(resourceCost).map(([resource, amount]) => [
                  resource,
                  Math.max(0, (ni.resources[resource as keyof Resources] || 0) - amount)
                ])
              )
            } : ni.resources,
            cities: ni.cities.map(city => 
              city.id === cityId ? {
                ...city,
                // En mode MJ, construction instantanée
                ...(isGameMaster ? {
                  buildings: [...(city.buildings || []), buildingType],
                  currentProduction: null,
                  productionProgress: 0
                } : {
                  currentProduction: {
                    type: 'building',
                    name: buildingType,
                    cost
                  },
                  productionProgress: 0
                })
              } : city
            )
          } : ni
        );
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        if (isGameMaster) {
          console.log(`[MODE MJ] Construction instantanée de ${buildingType} dans ${cityId}`);
        }
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
        };
      });
    },
    
    trainUnit: (cityId: string, unitType: string, cost?: Record<string, number>, recruitmentTime?: number) => {
      const unitCosts = {
        warrior: 40, spearman: 60, swordsman: 80,
        archer: 50, crossbowman: 70,
        catapult: 120, trebuchet: 150,
        horseman: 100, knight: 140,
        galley: 90, warship: 130,
        scout: 30, settler: 100, diplomat: 80, spy: 90
      };
      
      const duration = recruitmentTime || 1;
      
      set(state => {
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            resources: cost ? {
              ...ni.resources,
              ...Object.fromEntries(
                Object.entries(cost).map(([resource, amount]) => [
                  resource,
                  Math.max(0, (ni.resources[resource as keyof Resources] || 0) - amount)
                ])
              )
            } : ni.resources,
            cities: ni.cities.map(city => 
              city.id === cityId ? {
                ...city,
                currentProduction: {
                  type: 'unit',
                  name: unitType,
                  cost: duration
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
    
    addCity: (city: City) => {
      set(state => {
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            cities: [...ni.cities, city]
          } : ni
        );
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        console.log(`✅ Ville ajoutée: ${city.name} à (${city.x}, ${city.y})`);
        
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
          
          updatedNI.cities.forEach(city => {
            updatedNI.resources.food += city.foodPerTurn;
            
            if (city.currentProduction) {
              city.productionProgress += city.productionPerTurn;
              
              if (city.productionProgress >= city.currentProduction.cost) {
                console.log(`${city.name} completed ${city.currentProduction.name}`);
                city.currentProduction = null;
                city.productionProgress = 0;
              }
            }
          });
          
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
    },

    foundColony: (x: number, y: number, colonyName: string, playerId: string, playerName: string, factionId: string, factionName: string) => {
      const state = get();
      
      // Vérifier qu'il n'y a pas déjà une colonie à cette position
      const existingCity = state.novaImperiums.flatMap(ni => ni.cities).find(city => city.x === x && city.y === y);
      if (existingCity) {
        console.log(`❌ Fondation échouée: colonie existante à (${x},${y})`);
        return false;
      }
      
      // Créer la nouvelle colonie
      const newColony = {
        id: `colony_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: colonyName,
        x,
        y,
        population: 1,
        populationCap: 5,
        foodPerTurn: 2,
        productionPerTurn: 1,
        sciencePerTurn: 0,
        culturePerTurn: 0,
        buildings: ["settlement"], // Commencer avec un simple campement
        currentProduction: null,
        productionProgress: 0,
        workingHexes: []
      };
      
      set((state) => {
        const newNovaImperiums = state.novaImperiums.map(ni => {
          if (ni.id === "player") {
            return {
              ...ni,
              cities: [...ni.cities, newColony]
            };
          }
          return ni;
        });
        
        const updatedCurrentNI = newNovaImperiums.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        console.log(`✅ Colonie "${colonyName}" fondée à (${x},${y}) par ${playerName} de la faction ${factionName}`);
        
        return { 
          novaImperiums: newNovaImperiums,
          currentNovaImperium: updatedCurrentNI
        };
      });
      
      return true;
    }
  }))
);