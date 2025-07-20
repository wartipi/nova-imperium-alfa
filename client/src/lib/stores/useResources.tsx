import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface Resources {
  // Ressources de base
  food: number;
  action_points: number;
  gold: number;
  
  // Ressources stratégiques
  iron: number;
  stone: number;
  wood: number;
  precious_metals: number;
  
  // Ressources magiques Nova Imperium
  mana: number;
  crystals: number;
  ancient_knowledge: number;
  
  // Nouvelles ressources étendues
  herbs: number;
  fish: number;
  copper: number;
  silver: number;
  gems: number;
}

export interface ResourceProduction {
  resourceType: keyof Resources;
  amount: number;
  source: string; // 'building', 'exploration', 'trade', etc.
}

interface ResourcesState {
  resources: Resources;
  productionHistory: ResourceProduction[];
  resourceCaps: Partial<Resources>; // Limites de stockage
  
  // Actions
  addResource: (resourceType: keyof Resources, amount: number, source?: string) => boolean;
  removeResource: (resourceType: keyof Resources, amount: number) => boolean;
  hasResources: (costs: Partial<Resources>) => boolean;
  spendResources: (costs: Partial<Resources>) => boolean;
  getResourceProduction: (resourceType: keyof Resources) => number;
  setResourceCap: (resourceType: keyof Resources, cap: number) => void;
  getAvailableSpace: (resourceType: keyof Resources) => number;
  
  // Actions de production
  processProduction: () => void;
  addProductionSource: (production: ResourceProduction) => void;
  removeProductionSource: (resourceType: keyof Resources, source: string) => void;
  
  // Gestion des ressources automatisées
  autoManageResources: () => void;
  getResourcesStatus: () => { [key in keyof Resources]: 'abundant' | 'sufficient' | 'scarce' | 'critical' };
}

const initialResources: Resources = {
  // Ressources de base
  food: 40,
  action_points: 25,
  gold: 80,
  
  // Ressources stratégiques
  iron: 5,
  stone: 10,
  wood: 15,
  precious_metals: 8,
  
  // Ressources magiques
  mana: 20,
  crystals: 3,
  ancient_knowledge: 5,
  
  // Nouvelles ressources
  herbs: 0,
  fish: 0,
  copper: 0,
  silver: 0,
  gems: 0
};

const defaultResourceCaps: Partial<Resources> = {
  food: 200,
  action_points: 100,
  gold: 1000,
  iron: 100,
  stone: 200,
  wood: 150,
  precious_metals: 50,
  mana: 100,
  crystals: 20,
  ancient_knowledge: 50
};

export const useResources = create<ResourcesState>()(
  subscribeWithSelector((set, get) => ({
    resources: { ...initialResources },
    productionHistory: [],
    resourceCaps: { ...defaultResourceCaps },
    
    addResource: (resourceType, amount, source = 'unknown') => {
      const state = get();
      const currentAmount = state.resources[resourceType];
      const cap = state.resourceCaps[resourceType];
      
      if (cap && currentAmount >= cap) {
        console.warn(`Cannot add ${resourceType}: storage full (${cap})`);
        return false;
      }
      
      const finalAmount = cap ? Math.min(currentAmount + amount, cap) : currentAmount + amount;
      const actualAdded = finalAmount - currentAmount;
      
      set((state) => ({
        resources: {
          ...state.resources,
          [resourceType]: finalAmount
        },
        productionHistory: actualAdded > 0 ? [
          ...state.productionHistory.slice(-99), // Garder seulement les 100 derniers
          { resourceType, amount: actualAdded, source }
        ] : state.productionHistory
      }));
      
      return actualAdded > 0;
    },
    
    removeResource: (resourceType, amount) => {
      const state = get();
      const currentAmount = state.resources[resourceType];
      
      if (currentAmount < amount) {
        console.warn(`Cannot remove ${amount} ${resourceType}: insufficient resources (${currentAmount})`);
        return false;
      }
      
      set((state) => ({
        resources: {
          ...state.resources,
          [resourceType]: Math.max(0, currentAmount - amount)
        }
      }));
      
      return true;
    },
    
    hasResources: (costs) => {
      const state = get();
      return Object.entries(costs).every(([resource, cost]) => {
        const currentAmount = state.resources[resource as keyof Resources];
        return currentAmount >= (cost || 0);
      });
    },
    
    spendResources: (costs) => {
      const state = get();
      
      // Vérifier d'abord si on a assez de ressources
      if (!state.hasResources(costs)) {
        return false;
      }
      
      // Dépenser les ressources
      const newResources = { ...state.resources };
      Object.entries(costs).forEach(([resource, cost]) => {
        if (cost && cost > 0) {
          newResources[resource as keyof Resources] -= cost;
        }
      });
      
      set((state) => ({
        resources: newResources
      }));
      
      return true;
    },
    
    getResourceProduction: (resourceType) => {
      const state = get();
      return state.productionHistory
        .filter(prod => prod.resourceType === resourceType)
        .reduce((total, prod) => total + prod.amount, 0);
    },
    
    setResourceCap: (resourceType, cap) => {
      set((state) => ({
        resourceCaps: {
          ...state.resourceCaps,
          [resourceType]: cap
        }
      }));
    },
    
    getAvailableSpace: (resourceType) => {
      const state = get();
      const cap = state.resourceCaps[resourceType];
      const current = state.resources[resourceType];
      return cap ? Math.max(0, cap - current) : Infinity;
    },
    
    processProduction: () => {
      // Cette fonction sera appelée à chaque tour
      // Implémente la production automatique de ressources
      set((state) => {
        const newResources = { ...state.resources };
        
        // Production de base (exemple)
        newResources.action_points = Math.min(
          newResources.action_points + 10, 
          state.resourceCaps.action_points || 100
        );
        
        return {
          resources: newResources
        };
      });
    },
    
    addProductionSource: (production) => {
      set((state) => ({
        productionHistory: [
          ...state.productionHistory.slice(-99),
          production
        ]
      }));
    },
    
    removeProductionSource: (resourceType, source) => {
      set((state) => ({
        productionHistory: state.productionHistory.filter(
          prod => !(prod.resourceType === resourceType && prod.source === source)
        )
      }));
    },
    
    autoManageResources: () => {
      // Gestion automatique intelligente des ressources
      const state = get();
      
      // Par exemple, échanger automatiquement des ressources excédentaires
      Object.entries(state.resources).forEach(([resourceType, amount]) => {
        const cap = state.resourceCaps[resourceType as keyof Resources];
        if (cap && amount > cap * 0.9) {
          console.log(`${resourceType} near capacity: ${amount}/${cap}`);
          // Ici on pourrait implémenter de la logique d'échange automatique
        }
      });
    },
    
    getResourcesStatus: () => {
      const state = get();
      const status: { [key in keyof Resources]: 'abundant' | 'sufficient' | 'scarce' | 'critical' } = {} as any;
      
      Object.entries(state.resources).forEach(([resourceType, amount]) => {
        const cap = state.resourceCaps[resourceType as keyof Resources] || 100;
        const ratio = amount / cap;
        
        if (ratio > 0.8) status[resourceType as keyof Resources] = 'abundant';
        else if (ratio > 0.5) status[resourceType as keyof Resources] = 'sufficient';
        else if (ratio > 0.2) status[resourceType as keyof Resources] = 'scarce';
        else status[resourceType as keyof Resources] = 'critical';
      });
      
      return status;
    }
  }))
);