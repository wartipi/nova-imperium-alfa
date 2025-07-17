import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface FactionMember {
  id: string;
  name: string;
  role: 'leader' | 'officer' | 'member';
  joinDate: number;
  contributionScore: number;
  reputation: number;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  foundedDate: number;
  founderId: string;
  members: FactionMember[];
  territory: string[]; // hex coordinates
  resources: {
    gold: number;
    influence: number;
    reputation: number;
  };
  type: 'guild' | 'kingdom' | 'merchant' | 'religious' | 'mercenary' | 'scholar';
  isActive: boolean;
  color: string;
  banner: string;
  motto: string;
  achievements: string[];
  relationships: { [factionId: string]: number }; // -100 to 100 relationship score
}

export interface FactionQuest {
  id: string;
  title: string;
  description: string;
  factionId: string;
  createdBy: string;
  requirements: {
    minReputation: number;
    requiredFaction?: string;
    excludedFactions?: string[];
  };
  rewards: {
    gold: number;
    reputation: number;
    items?: string[];
  };
  status: 'available' | 'active' | 'completed' | 'failed';
  participants: string[];
  deadline?: number;
}

interface FactionState {
  factions: Faction[];
  playerFaction: string | null;
  guildeDePandemId: string;
  availableQuests: FactionQuest[];
  
  // Actions
  createFaction: (name: string, description: string, type: Faction['type'], founderId: string) => void;
  joinFaction: (factionId: string, playerId: string, playerName: string) => void;
  leaveFaction: (factionId: string, playerId: string) => void;
  getFactionById: (factionId: string) => Faction | undefined;
  canCreateFaction: (playerId: string, playerReputation: number) => boolean;
  updateFactionReputation: (factionId: string, change: number) => void;
  createQuest: (quest: Omit<FactionQuest, 'id'>) => void;
  getAvailableQuests: (playerFaction: string | null, playerReputation: number) => FactionQuest[];
  initializeGuildeDePandem: () => void;
}

// The omnipresent Guilde de Pandem
const createGuildeDePandem = (): Faction => ({
  id: 'guild-de-pandem',
  name: 'Guilde de Pandem',
  description: 'La seule faction fixe et omniprésente. Ses prêtres guident, ses soldats observent, et ses rituels façonnent les âmes.',
  foundedDate: 0, // Always existed
  founderId: 'system',
  members: [],
  territory: [], // Exists everywhere
  resources: {
    gold: 999999,
    influence: 1000,
    reputation: 1000
  },
  type: 'religious',
  isActive: true,
  color: '#4A148C', // Deep purple
  banner: '⚡',
  motto: 'Omnipotentia et Misericordia',
  achievements: ['Eternal Guardians', 'Keepers of Balance', 'Divine Authority'],
  relationships: {}
});

export const useFactions = create<FactionState>()(
  subscribeWithSelector((set, get) => ({
    factions: [],
    playerFaction: null,
    guildeDePandemId: 'guild-de-pandem',
    availableQuests: [],
    
    createFaction: (name, description, type, founderId) => {
      const newFaction: Faction = {
        id: `faction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        foundedDate: Date.now(),
        founderId,
        members: [{
          id: founderId,
          name: 'Founder',
          role: 'leader',
          joinDate: Date.now(),
          contributionScore: 0,
          reputation: 0
        }],
        territory: [],
        resources: {
          gold: 1000, // Starting resources
          influence: 50,
          reputation: 0
        },
        type,
        isActive: true,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        banner: '🏛️',
        motto: 'Nouveau départ, nouvelles destinées',
        achievements: [],
        relationships: {}
      };
      
      set(state => ({
        factions: [...state.factions, newFaction],
        playerFaction: newFaction.id
      }));
    },
    
    joinFaction: (factionId, playerId, playerName) => {
      set(state => {
        const factions = state.factions.map(faction => {
          if (faction.id === factionId) {
            const newMember: FactionMember = {
              id: playerId,
              name: playerName,
              role: 'member',
              joinDate: Date.now(),
              contributionScore: 0,
              reputation: 0
            };
            
            return {
              ...faction,
              members: [...faction.members, newMember]
            };
          }
          return faction;
        });
        
        return {
          factions,
          playerFaction: factionId
        };
      });
    },
    
    leaveFaction: (factionId, playerId) => {
      set(state => {
        const factions = state.factions.map(faction => {
          if (faction.id === factionId) {
            return {
              ...faction,
              members: faction.members.filter(member => member.id !== playerId)
            };
          }
          return faction;
        });
        
        return {
          factions,
          playerFaction: state.playerFaction === factionId ? null : state.playerFaction
        };
      });
    },
    
    getFactionById: (factionId) => {
      return get().factions.find(faction => faction.id === factionId);
    },
    
    canCreateFaction: (playerId, playerReputation) => {
      // Need to be at least "Honorable" (200+ reputation) to create a faction
      return playerReputation >= 200;
    },
    
    updateFactionReputation: (factionId, change) => {
      set(state => ({
        factions: state.factions.map(faction => 
          faction.id === factionId 
            ? { ...faction, resources: { ...faction.resources, reputation: faction.resources.reputation + change } }
            : faction
        )
      }));
    },
    
    createQuest: (questData) => {
      const quest: FactionQuest = {
        ...questData,
        id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      set(state => ({
        availableQuests: [...state.availableQuests, quest]
      }));
    },
    
    getAvailableQuests: (playerFaction, playerReputation) => {
      const { availableQuests } = get();
      
      return availableQuests.filter(quest => {
        // Check reputation requirement
        if (quest.requirements.minReputation > playerReputation) return false;
        
        // Check faction requirements
        if (quest.requirements.requiredFaction && quest.requirements.requiredFaction !== playerFaction) return false;
        if (quest.requirements.excludedFactions?.includes(playerFaction || '')) return false;
        
        return quest.status === 'available';
      });
    },
    
    initializeGuildeDePandem: () => {
      set(state => {
        const guildExists = state.factions.find(f => f.id === 'guild-de-pandem');
        if (!guildExists) {
          return {
            factions: [createGuildeDePandem(), ...state.factions]
          };
        }
        return state;
      });
      
      // Create initial Guilde de Pandem quests
      const initialQuests: Omit<FactionQuest, 'id'>[] = [
        {
          title: 'Première Offrande',
          description: 'Faire un don à la Guilde de Pandem pour montrer votre dévotion.',
          factionId: 'guild-de-pandem',
          createdBy: 'system',
          requirements: {
            minReputation: -1000 // Available to everyone
          },
          rewards: {
            gold: 0,
            reputation: 100
          },
          status: 'available',
          participants: []
        },
        {
          title: 'Gardien des Traditions',
          description: 'Protéger un site sacré contre les profanateurs.',
          factionId: 'guild-de-pandem',
          createdBy: 'system',
          requirements: {
            minReputation: 0 // Neutral or better
          },
          rewards: {
            gold: 500,
            reputation: 200,
            items: ['Blessing of Pandem']
          },
          status: 'available',
          participants: []
        },
        {
          title: 'Jugement Divin',
          description: 'Arbitrer un conflit entre deux factions au nom de la Guilde.',
          factionId: 'guild-de-pandem',
          createdBy: 'system',
          requirements: {
            minReputation: 500 // Heroes only
          },
          rewards: {
            gold: 1000,
            reputation: 300,
            items: ['Divine Authority Token']
          },
          status: 'available',
          participants: []
        }
      ];
      
      initialQuests.forEach(quest => {
        get().createQuest(quest);
      });
    }
  }))
);

// Initialize the Guilde de Pandem when the store is created
useFactions.getState().initializeGuildeDePandem();