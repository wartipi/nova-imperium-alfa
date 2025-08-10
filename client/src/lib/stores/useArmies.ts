import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Army, Marshal, ArmyContract, BattleEvent } from '../../../../shared/marshalSchema';

interface ArmiesState {
  // États des armées
  armies: Army[];
  marshals: Marshal[];
  contracts: ArmyContract[];
  battleEvents: BattleEvent[];
  
  // États de l'interface
  selectedArmyId: string | null;
  selectedContractId: string | null;
  isLoading: boolean;
  lastUpdate: number;
  
  // Actions
  fetchArmies: (playerId: string) => Promise<void>;
  fetchMarshals: (playerId: string) => Promise<void>;
  fetchContracts: (playerId: string) => Promise<void>;
  createArmy: (armyData: Omit<Army, 'id' | 'createdAt' | 'lastActivity'>) => Promise<Army | null>;
  hireCommander: (armyId: string, marshalId: string) => Promise<boolean>;
  updateArmyPosition: (armyId: string, x: number, y: number) => Promise<boolean>;
  createContract: (contractData: Omit<ArmyContract, 'id' | 'createdAt' | 'status'>) => Promise<ArmyContract | null>;
  acceptContract: (contractId: string) => Promise<boolean>;
  fulfillContract: (contractId: string) => Promise<boolean>;
  initiateBattle: (attackerId: string, defenderId: string, x: number, y: number) => Promise<BattleEvent | null>;
  setSelectedArmy: (armyId: string | null) => void;
  setSelectedContract: (contractId: string | null) => void;
  reset: () => void;
}

export const useArmies = create<ArmiesState>()(
  immer((set, get) => ({
    // État initial
    armies: [],
    marshals: [],
    contracts: [],
    battleEvents: [],
    selectedArmyId: null,
    selectedContractId: null,
    isLoading: false,
    lastUpdate: 0,

    // Actions
    fetchArmies: async (playerId: string) => {
      set((state) => {
        state.isLoading = true;
      });

      try {
        const response = await fetch(`/api/marshal/armies/${playerId}`);
        if (response.ok) {
          const armies = await response.json();
          set((state) => {
            state.armies = armies;
            state.lastUpdate = Date.now();
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des armées:', error);
      } finally {
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    fetchMarshals: async (playerId: string) => {
      try {
        const response = await fetch(`/api/marshal/marshals/${playerId}`);
        if (response.ok) {
          const marshals = await response.json();
          set((state) => {
            state.marshals = marshals;
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des maréchaux:', error);
      }
    },

    fetchContracts: async (playerId: string) => {
      try {
        const response = await fetch(`/api/marshal/contracts/${playerId}`);
        if (response.ok) {
          const contracts = await response.json();
          set((state) => {
            state.contracts = contracts;
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des contrats:', error);
      }
    },

    createArmy: async (armyData) => {
      set((state) => {
        state.isLoading = true;
      });

      try {
        const response = await fetch('/api/marshal/armies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(armyData),
        });

        if (response.ok) {
          const newArmy = await response.json();
          set((state) => {
            state.armies.push(newArmy);
            state.lastUpdate = Date.now();
          });
          return newArmy;
        }
        return null;
      } catch (error) {
        console.error('Erreur lors de la création de l\'armée:', error);
        return null;
      } finally {
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    hireCommander: async (armyId: string, marshalId: string) => {
      try {
        const response = await fetch(`/api/marshal/armies/${armyId}/hire-commander`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ marshalId }),
        });

        if (response.ok) {
          const updatedArmy = await response.json();
          set((state) => {
            const index = state.armies.findIndex(a => a.id === armyId);
            if (index !== -1) {
              state.armies[index] = updatedArmy;
              state.lastUpdate = Date.now();
            }
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erreur lors de l\'embauche du commandant:', error);
        return false;
      }
    },

    updateArmyPosition: async (armyId: string, x: number, y: number) => {
      try {
        const response = await fetch(`/api/marshal/armies/${armyId}/move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ x, y }),
        });

        if (response.ok) {
          const updatedArmy = await response.json();
          set((state) => {
            const index = state.armies.findIndex(a => a.id === armyId);
            if (index !== -1) {
              state.armies[index] = updatedArmy;
              state.lastUpdate = Date.now();
            }
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erreur lors du déplacement de l\'armée:', error);
        return false;
      }
    },

    createContract: async (contractData) => {
      try {
        const response = await fetch('/api/marshal/contracts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contractData),
        });

        if (response.ok) {
          const newContract = await response.json();
          set((state) => {
            state.contracts.push(newContract);
          });
          return newContract;
        }
        return null;
      } catch (error) {
        console.error('Erreur lors de la création du contrat:', error);
        return null;
      }
    },

    acceptContract: async (contractId: string) => {
      try {
        const response = await fetch(`/api/marshal/contracts/${contractId}/accept`, {
          method: 'POST',
        });

        if (response.ok) {
          const updatedContract = await response.json();
          set((state) => {
            const index = state.contracts.findIndex(c => c.id === contractId);
            if (index !== -1) {
              state.contracts[index] = updatedContract;
            }
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erreur lors de l\'acceptation du contrat:', error);
        return false;
      }
    },

    fulfillContract: async (contractId: string) => {
      try {
        const response = await fetch(`/api/marshal/contracts/${contractId}/fulfill`, {
          method: 'POST',
        });

        if (response.ok) {
          const updatedContract = await response.json();
          set((state) => {
            const index = state.contracts.findIndex(c => c.id === contractId);
            if (index !== -1) {
              state.contracts[index] = updatedContract;
            }
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erreur lors de l\'accomplissement du contrat:', error);
        return false;
      }
    },

    initiateBattle: async (attackerId: string, defenderId: string, x: number, y: number) => {
      try {
        const response = await fetch('/api/marshal/battles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attackerArmyId: attackerId,
            defenderArmyId: defenderId,
            battleX: x,
            battleY: y,
          }),
        });

        if (response.ok) {
          const battleEvent = await response.json();
          set((state) => {
            state.battleEvents.push(battleEvent);
          });
          return battleEvent;
        }
        return null;
      } catch (error) {
        console.error('Erreur lors de l\'initiation de la bataille:', error);
        return null;
      }
    },

    setSelectedArmy: (armyId: string | null) => {
      set((state) => {
        state.selectedArmyId = armyId;
      });
    },

    setSelectedContract: (contractId: string | null) => {
      set((state) => {
        state.selectedContractId = contractId;
      });
    },

    reset: () => {
      set((state) => {
        state.armies = [];
        state.marshals = [];
        state.contracts = [];
        state.battleEvents = [];
        state.selectedArmyId = null;
        state.selectedContractId = null;
        state.isLoading = false;
        state.lastUpdate = 0;
      });
    },
  }))
);

// Sélecteurs optimisés
export const useArmiesSelectors = {
  getArmiesByOwner: (ownerId: string) => 
    useArmies((state) => state.armies.filter((army: Army) => army.ownerId === ownerId)),
  
  getAvailableMarshals: () =>
    useArmies((state) => state.marshals.filter((marshal: Marshal) => !marshal.assignedArmyId)),
  
  getActiveContracts: (playerId: string) =>
    useArmies((state) => state.contracts.filter((contract: ArmyContract) => 
      (contract.clientId === playerId || contract.contractorId === playerId) &&
      contract.status === 'active'
    )),
  
  getPendingContracts: () =>
    useArmies((state) => state.contracts.filter((contract: ArmyContract) => contract.status === 'pending')),
  
  getSelectedArmy: () =>
    useArmies((state) => state.armies.find((army: Army) => army.id === state.selectedArmyId)),
  
  getSelectedContract: () =>
    useArmies((state) => state.contracts.find((contract: ArmyContract) => contract.id === state.selectedContractId)),
    
  getRecentBattles: () =>
    useArmies((state) => state.battleEvents
      .filter(battle => Date.now() - new Date(battle.timestamp).getTime() < 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    ),
};