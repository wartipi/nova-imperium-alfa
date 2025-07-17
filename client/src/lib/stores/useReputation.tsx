import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface ReputationAction {
  id: string;
  description: string;
  timestamp: number;
  honorChange: number;
  category: 'military' | 'diplomatic' | 'economic' | 'social' | 'religious';
  witnesses: string[]; // Other players/factions who witnessed this action
}

export interface ReputationLevel {
  name: string;
  minHonor: number;
  maxHonor: number;
  color: string;
  description: string;
  effects: string[];
}

interface ReputationState {
  honor: number;
  reputation: string;
  reputationHistory: ReputationAction[];
  gnParticipation: number; // Nombre d'événements GN participés
  seasonPass: boolean; // Possède une carte de saison
  
  // Actions
  addReputationAction: (action: Omit<ReputationAction, 'id' | 'timestamp'>) => void;
  getReputationLevel: () => ReputationLevel;
  getAvailableActions: () => string[];
  canPerformAction: (actionType: string) => boolean;
  addGnParticipation: () => void;
  setSeasonPass: (hasPass: boolean) => void;
  canCreateFaction: () => boolean;
}

const REPUTATION_LEVELS: ReputationLevel[] = [
  {
    name: "Banni",
    minHonor: -1000,
    maxHonor: -500,
    color: "#8B0000",
    description: "Paria social, accès à des réseaux clandestins",
    effects: ["Quêtes clandestines", "Contrats dissimulés", "Réseaux criminels", "Missions secrètes"]
  },
  {
    name: "Méprisé",
    minHonor: -499,
    maxHonor: -200,
    color: "#DC143C",
    description: "Personne peu fiable, évitée par la plupart",
    effects: ["Quêtes sombres", "Contrats louches", "Réseaux souterrains"]
  },
  {
    name: "Suspect",
    minHonor: -199,
    maxHonor: 49,
    color: "#FF8C00",
    description: "Réputation ternie, accès limité aux services",
    effects: ["Quêtes mineures", "Commerce restreint", "Réseaux d'information"]
  },
  {
    name: "Neutre",
    minHonor: 50,
    maxHonor: 199,
    color: "#808080",
    description: "Citoyen ordinaire sans distinction particulière",
    effects: ["Quêtes standard", "Commerce libre", "Alliances basiques"]
  },
  {
    name: "Honorable",
    minHonor: 200,
    maxHonor: 499,
    color: "#228B22",
    description: "Personne de confiance, peut créer des factions",
    effects: ["Création de factions", "Alliances officielles", "Missions diplomatiques", "Quêtes d'honneur"]
  },
  {
    name: "Saint",
    minHonor: 500,
    maxHonor: 2000,
    color: "#FFD700",
    description: "Respecté par tous, accès aux plus hautes instances",
    effects: ["Postes de commandement", "Alliances prestigieuses", "Missions diplomatiques", "Quêtes légendaires"]
  }
];

export const useReputation = create<ReputationState>()(
  subscribeWithSelector((set, get) => ({
    honor: 150,
    reputation: "Neutre",
    reputationHistory: [],
    gnParticipation: 0,
    seasonPass: false,
    
    addReputationAction: (actionData) => {
      const action: ReputationAction = {
        ...actionData,
        id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };
      
      set(state => {
        const newHonor = Math.max(-1000, Math.min(2000, state.honor + action.honorChange));
        const newLevel = REPUTATION_LEVELS.find(level => 
          newHonor >= level.minHonor && newHonor <= level.maxHonor
        ) || REPUTATION_LEVELS[3]; // Default to Neutre
        
        return {
          honor: newHonor,
          reputation: newLevel.name,
          reputationHistory: [...state.reputationHistory, action].slice(-100) // Keep last 100 actions
        };
      });
    },
    
    getReputationLevel: () => {
      const { honor } = get();
      return REPUTATION_LEVELS.find(level => 
        honor >= level.minHonor && honor <= level.maxHonor
      ) || REPUTATION_LEVELS[3]; // Default to Neutre
    },
    
    getAvailableActions: () => {
      const level = get().getReputationLevel();
      const baseActions = ['move', 'gather', 'explore'];
      
      if (level.minHonor >= 200) {
        baseActions.push('trade_privileged', 'form_alliance', 'recruit_elite');
      }
      
      if (level.minHonor >= 500) {
        baseActions.push('create_faction', 'lead_expedition', 'judge_dispute');
      }
      
      if (level.maxHonor <= -200) {
        baseActions.push('raid', 'pillage', 'corrupt', 'underground_network');
      }
      
      return baseActions;
    },
    
    canPerformAction: (actionType: string) => {
      const availableActions = get().getAvailableActions();
      return availableActions.includes(actionType);
    },

    addGnParticipation: () => {
      set((state) => ({
        gnParticipation: state.gnParticipation + 1
      }));
    },

    setSeasonPass: (hasPass: boolean) => {
      set({ seasonPass: hasPass });
    },

    canCreateFaction: () => {
      const { gnParticipation, seasonPass, honor } = get();
      return (gnParticipation >= 2 || seasonPass) && honor >= 200;
    }
  }))
);

// Common reputation actions for easy use
export const REPUTATION_ACTIONS = {
  KEEP_PROMISE: {
    description: "Tenu une promesse",
    honorChange: 50,
    category: 'diplomatic' as const,
    witnesses: []
  },
  BREAK_PROMISE: {
    description: "Rompu une promesse",
    honorChange: -100,
    category: 'diplomatic' as const,
    witnesses: []
  },
  HELP_ALLY: {
    description: "Aidé un allié",
    honorChange: 30,
    category: 'military' as const,
    witnesses: []
  },
  BETRAY_ALLY: {
    description: "Trahi un allié",
    honorChange: -200,
    category: 'military' as const,
    witnesses: []
  },
  PROTECT_INNOCENT: {
    description: "Protégé un innocent",
    honorChange: 75,
    category: 'social' as const,
    witnesses: []
  },
  ATTACK_INNOCENT: {
    description: "Attaqué un innocent",
    honorChange: -150,
    category: 'social' as const,
    witnesses: []
  },
  COMPLETE_QUEST: {
    description: "Terminé une quête",
    honorChange: 25,
    category: 'social' as const,
    witnesses: []
  },
  ABANDON_QUEST: {
    description: "Abandonné une quête",
    honorChange: -25,
    category: 'social' as const,
    witnesses: []
  },
  DONATE_TO_GUILD: {
    description: "Fait un don à la Guilde de Pandem",
    honorChange: 100,
    category: 'religious' as const,
    witnesses: []
  },
  DEFY_GUILD: {
    description: "Défié la Guilde de Pandem",
    honorChange: -300,
    category: 'religious' as const,
    witnesses: []
  }
} as const;