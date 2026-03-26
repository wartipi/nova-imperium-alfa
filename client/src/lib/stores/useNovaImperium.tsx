import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { NovaImperium, Unit, City, DiplomaticRelation, Resources, BuildingType } from "../game/types";
import { AI } from "../game/AI";
import { fetchMyCities, apiAddBuilding, apiSetProduction, apiClearProduction } from "../api/citiesApi";
import { useMap } from "./useMap";

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
  buildInCity: (cityId: string, buildingType: string, resourceCost?: Record<string, number>, constructionTime?: number, isAdmin?: boolean) => void;
  trainUnit: (cityId: string, unitType: string, cost?: Record<string, number>, recruitmentTime?: number) => void;
  addCity: (city: City) => void;
  foundColony: (x: number, y: number, colonyName: string, playerId: string, playerName: string, factionId: string, factionName: string) => boolean;
  hydrateCitiesFromServer: () => Promise<void>;
  renameCityDisplayName: (cityId: string, newDisplayName: string) => boolean;
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
    
    buildInCity: (cityId: string, buildingType: string, resourceCost?: Record<string, number>, constructionTime?: number, isAdmin?: boolean) => {
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
            resources: resourceCost && !isAdmin ? {
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
                ...(isAdmin ? {
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
        
        if (isAdmin) {
          console.log(`[MODE MJ] Construction instantanée de ${buildingType} dans ${cityId}`);
        }
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
        };
      });

      // Phase 7 : persistance serveur après écriture locale.
      // En cas d'échec, resynchronisation explicite depuis le serveur.
      if (isAdmin) {
        // Construction instantanée MJ → persister le bâtiment directement
        apiAddBuilding(cityId, buildingType).catch(() => {
          console.warn(`[buildInCity] Échec serveur (POST building) — resynchronisation`);
          get().hydrateCitiesFromServer();
        });
      } else {
        // Lancement de production → persister la file
        const city = get().novaImperiums
          .find(ni => ni.id === get().currentNovaImperiumId)
          ?.cities.find(c => c.id === cityId);
        if (city?.currentProduction) {
          apiSetProduction(cityId, {
            type:     city.currentProduction.type,
            name:     city.currentProduction.name,
            cost:     city.currentProduction.cost,
            progress: city.productionProgress,
          }).catch(() => {
            console.warn(`[buildInCity] Échec serveur (PUT production) — resynchronisation`);
            get().hydrateCitiesFromServer();
          });
        }
      }
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

      // Phase 7 : persister le lancement de production unité côté serveur.
      apiSetProduction(cityId, {
        type:     'unit',
        name:     unitType,
        cost:     recruitmentTime || 1,
        progress: 0,
      }).catch(() => {
        console.warn(`[trainUnit] Échec serveur (PUT production) — resynchronisation`);
        get().hydrateCitiesFromServer();
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
      // Phase 7 : collecter les changements de production avant le set()
      // pour déclencher les appels serveur après la mise à jour locale.
      type ProductionUpdate =
        | { kind: 'completed_building'; cityId: string; building: string }
        | { kind: 'completed_unit';     cityId: string }
        | { kind: 'progressed';         cityId: string; type: string; name: string; cost: number; progress: number };

      const productionUpdates: ProductionUpdate[] = [];

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
            if (city.currentProduction) {
              city.productionProgress += city.productionPerTurn;
              
              if (city.productionProgress >= city.currentProduction.cost) {
                console.log(`${city.name} completed ${city.currentProduction.name}`);
                // Phase 7 : enregistrer la complétion (uniquement pour les villes du joueur)
                if (ni.id === state.currentNovaImperiumId) {
                  if (city.currentProduction.type === 'building') {
                    productionUpdates.push({ kind: 'completed_building', cityId: city.id, building: city.currentProduction.name });
                  } else {
                    productionUpdates.push({ kind: 'completed_unit', cityId: city.id });
                  }
                }
                city.currentProduction = null;
                city.productionProgress = 0;
              } else if (ni.id === state.currentNovaImperiumId) {
                // Phase 7 : enregistrer la progression (non finale)
                productionUpdates.push({
                  kind:     'progressed',
                  cityId:   city.id,
                  type:     city.currentProduction.type,
                  name:     city.currentProduction.name,
                  cost:     city.currentProduction.cost,
                  progress: city.productionProgress,
                });
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

      // Phase 7 : persistance serveur des changements de production après set().
      // Chaque appel a son propre catch → hydrateCitiesFromServer() pour éviter toute divergence silencieuse.
      for (const update of productionUpdates) {
        if (update.kind === 'completed_building') {
          Promise.all([
            apiAddBuilding(update.cityId, update.building),
            apiClearProduction(update.cityId),
          ]).catch(() => {
            console.warn(`[processTurn] Échec serveur (complétion bâtiment) — resynchronisation`);
            get().hydrateCitiesFromServer();
          });
        } else if (update.kind === 'completed_unit') {
          apiClearProduction(update.cityId).catch(() => {
            console.warn(`[processTurn] Échec serveur (complétion unité) — resynchronisation`);
            get().hydrateCitiesFromServer();
          });
        } else {
          apiSetProduction(update.cityId, {
            type:     update.type,
            name:     update.name,
            cost:     update.cost,
            progress: update.progress,
          }).catch(() => {
            console.warn(`[processTurn] Échec serveur (progression) — resynchronisation`);
            get().hydrateCitiesFromServer();
          });
        }
      }
    },

    // Phase 6 : foundColony ne crée plus de ville locale.
    // La ville est créée atomiquement côté serveur (transaction colonie + ville).
    // Après le POST serveur, appeler hydrateCitiesFromServer() pour resynchroniser.
    foundColony: (_x: number, _y: number, _colonyName: string, _playerId: string, _playerName: string, _factionId: string, _factionName: string) => {
      console.log("[foundColony] Remplacé par hydrateCitiesFromServer() — la ville est créée via le serveur.");
      return true;
    },

    // Phase 6 : source de vérité des villes = serveur.
    // Charge les villes depuis GET /api/cities/me et hydrate useNovaImperium.cities.
    // Coordonnées monde (worldX/worldY) → coordonnées locales dérivées (x/y) via l'origine de la carte.
    hydrateCitiesFromServer: async () => {
      try {
        const dtos = await fetchMyCities();
        // L'origine est nécessaire pour dériver les coords locales depuis les coords monde persistées.
        const { originWorldX, originWorldY } = useMap.getState();

        const hydratedCities: City[] = dtos.map((dto) => ({
          id:               String(dto.id),      // cities.id — CORRECTION Phase 7 (était dto.colonyId)
          colonyId:         String(dto.colonyId), // colonies.id — champ distinct Phase 7
          name:             dto.name,
          displayName:      dto.displayName ?? undefined,
          x:                dto.worldX - originWorldX, // coord locale dérivée — non persistée
          y:                dto.worldY - originWorldY, // coord locale dérivée — non persistée
          population:       dto.population,
          populationCap:    5,          // non persisté
          foodPerTurn:       dto.foodPerTurn,       // Phase 8 : calculé serveur
          productionPerTurn: dto.productionPerTurn,  // Phase 8 : calculé serveur
          sciencePerTurn:   0,
          culturePerTurn:   0,
          // Phase 7 : bâtiments et production hydratés depuis le serveur
          buildings:         dto.buildings as BuildingType[],
          currentProduction: dto.currentProduction
            ? { type: dto.currentProduction.type as 'building' | 'unit', name: dto.currentProduction.name, cost: dto.currentProduction.cost }
            : null,
          productionProgress: dto.currentProduction?.progress ?? 0,
          workingHexes:     [], // non persisté — placeholder Phase 7
          playerName:       dto.founderName,
          factionName:      dto.factionName,
        }));

        set((state) => {
          const updated = state.novaImperiums.map((ni) => {
            if (ni.id !== state.currentNovaImperiumId) return ni;
            return { ...ni, cities: hydratedCities };
          });
          const updatedCurrentNI = updated.find((ni) => ni.id === state.currentNovaImperiumId) || null;
          console.log(`[hydrateCitiesFromServer] ${hydratedCities.length} ville(s) chargée(s) depuis le serveur.`);
          return { novaImperiums: updated, currentNovaImperium: updatedCurrentNI };
        });
      } catch (err) {
        // Échec silencieux — la carte reste jouable sans villes hydratées
        console.warn("[hydrateCitiesFromServer] Erreur chargement villes:", err);
      }
    },

    renameCityDisplayName: (cityId: string, newDisplayName: string) => {
      // Validation du nom (3-25 caractères, alphanumériques + espaces)
      if (!newDisplayName.trim() || newDisplayName.length < 3 || newDisplayName.length > 25) {
        return false;
      }
      
      const cleanName = newDisplayName.trim().replace(/[^a-zA-Z0-9À-ÿ\s\-']/g, '');
      if (cleanName !== newDisplayName.trim()) {
        return false;
      }

      set(state => {
        const updatedNIs = state.novaImperiums.map(ni => 
          ni.id === state.currentNovaImperiumId ? {
            ...ni,
            cities: ni.cities.map(city => 
              city.id === cityId ? {
                ...city,
                displayName: cleanName
              } : city
            )
          } : ni
        );
        
        const updatedCurrentNI = updatedNIs.find(ni => ni.id === state.currentNovaImperiumId) || null;
        
        console.log(`✅ Ville ${cityId} renommée : "${cleanName}"`);
        
        return {
          novaImperiums: updatedNIs,
          currentNovaImperium: updatedCurrentNI
        };
      });
      
      return true;
    }
  }))
);