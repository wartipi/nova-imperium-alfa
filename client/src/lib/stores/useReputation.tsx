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
  
  // Actions
  addReputationAction: (action: Omit<ReputationAction, 'id' | 'timestamp'>) => void;
  getReputationLevel: () => ReputationLevel;
  getAvailableActions: () => string[];
  canPerformAction: (actionType: string) => boolean;
}

const REPUTATION_LEVELS: ReputationLevel[] = [
  {
    name: "Banni",
    minHonor: -1000,
    maxHonor: -500,
    color: "#8B0000",
    description: "Paria complet, rejeté par tous",
    effects: ["Accès refusé aux villes", "Commerce impossible", "Attaqué à vue"]
  },
  {
    name: "Déshonneur",
    minHonor: -499,
    maxHonor: -200,
    color: "#DC143C",
    description: "Réputation ternie, méfiance générale",
    effects: ["Prix majorés", "Accès limité", "Missions dangereuses uniquement"]
  },
  {
    name: "Neutre",
    minHonor: -199,
    maxHonor: 199,
    color: "#808080",
    description: "Inconnu, sans réputation particulière",
    effects: ["Accès standard", "Commerce normal", "Missions basiques"]
  },
  {
    name: "Honorable",
    minHonor: 200,
    maxHonor: 499,
    color: "#228B22",
    description: "Respecté, digne de confiance",
    effects: ["Réductions commerciales", "Missions privilégiées", "Alliances facilitées"]
  },
  {
    name: "Héros",
    minHonor: 500,
    maxHonor: 999,
    color: "#4169E1",
    description: "Légende vivante, admiré par tous",
    effects: ["Accès VIP", "Missions héroïques", "Peut créer des factions"]
  },
  {
    name: "Saint",
    minHonor: 1000,
    maxHonor: 2000,
    color: "#FFD700",
    description: "Béni par la Guilde de Pandem",
    effects: ["Pouvoir religieux", "Peut sanctifier", "Immunité diplomatique"]
  }
];

export const useReputation = create<ReputationState>()(
  subscribeWithSelector((set, get) => ({
    honor: 0,
    reputation: "Neutre",
    reputationHistory: [],
    
    addReputationAction: (actionData) => {
      const action: ReputationAction = {
        ...actionData,
        id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };
      
      set(state => {
        const newHonor = state.honor + action.honorChange;
        const newLevel = REPUTATION_LEVELS.find(level => 
          newHonor >= level.minHonor && newHonor <= level.maxHonor
        ) || REPUTATION_LEVELS[2]; // Default to Neutre
        
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
      ) || REPUTATION_LEVELS[2]; // Default to Neutre
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
      
      if (level.minHonor >= 1000) {
        baseActions.push('sanctify_territory', 'grant_blessing', 'excommunicate');
      }
      
      if (level.maxHonor <= -200) {
        baseActions.push('raid', 'pillage', 'corrupt');
      }
      
      return baseActions;
    },
    
    canPerformAction: (actionType: string) => {
      const availableActions = get().getAvailableActions();
      return availableActions.includes(actionType);
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