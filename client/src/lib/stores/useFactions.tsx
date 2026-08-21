import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  fetchAllFactions,
  fetchMyFaction,
  apiCreateFaction,
  apiJoinFaction,
  apiLeaveFaction,
  type FactionDTO,
} from "../api/factionsApi";

export interface FactionMember {
  id: string;
  name: string;
  role: "leader" | "officer" | "member";
  joinDate: number;
  contributionScore: number;
  reputation: number;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  charter: string;
  emblem: string;
  structure: string;
  foundedDate: number;
  founderId: string;
  founderName: string;
  members: FactionMember[];
  territory?: string;
  type: "military" | "commercial" | "religious" | "political" | "cultural" | "academic";
  recruitment: "open" | "invitation" | "restricted";
  isActive: boolean;
  color: string;
  banner: string;
  motto: string;
  achievements: string[];
  relationships: { [factionId: string]: number };
  gnEvents: string[];
  resources: {
    gold: number;
    influence: number;
    reputation: number;
  };
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
  status: "available" | "active" | "completed" | "failed";
  participants: string[];
  deadline?: number;
}

function mapDTO(dto: FactionDTO): Faction {
  return {
    ...dto,
    type: dto.type as Faction["type"],
    recruitment: dto.recruitment as Faction["recruitment"],
    resources: { gold: 0, influence: 0, reputation: 0 },
  };
}

interface FactionState {
  factions: Faction[];
  playerFaction: string | null;
  myMemberRole: string | null;
  availableQuests: FactionQuest[];
  isLoading: boolean;

  loadFactions: () => Promise<void>;
  loadPlayerFaction: () => Promise<void>;

  createFaction: (factionData: {
    name: string;
    charter: string;
    emblem: string;
    structure: string;
    type: Faction["type"];
    recruitment: "open" | "invitation" | "restricted";
    color?: string;
    banner?: string;
    motto?: string;
  }, adminMode?: boolean) => Promise<void>;

  joinFaction: (factionId: string) => Promise<void>;
  leaveFaction: (factionId: string) => Promise<void>;
  getFactionById: (factionId: string | null | undefined) => Faction | undefined;
  canCreateFaction: (playerId: string, playerReputation: number) => boolean;
  updateFactionReputation: (factionId: string, change: number) => void;
  createQuest: (quest: Omit<FactionQuest, "id">) => void;
  getAvailableQuests: (playerFaction: string | null, playerReputation: number) => FactionQuest[];
}

export const useFactions = create<FactionState>()(
  subscribeWithSelector((set, get) => ({
    factions: [],
    playerFaction: null,
    myMemberRole: null,
    availableQuests: [],
    isLoading: false,

    loadFactions: async () => {
      try {
        set({ isLoading: true });
        const dtos = await fetchAllFactions();
        set({ factions: dtos.map(mapDTO), isLoading: false });
      } catch (err) {
        console.error("[useFactions] loadFactions error:", err);
        set({ isLoading: false });
      }
    },

    loadPlayerFaction: async () => {
      try {
        const { faction, memberRole } = await fetchMyFaction();
        set({ playerFaction: faction ? faction.id : null, myMemberRole: memberRole ?? null });
        if (faction) {
          set((state) => {
            const exists = state.factions.find((f) => f.id === faction.id);
            if (!exists) {
              return { factions: [...state.factions, mapDTO(faction)] };
            }
            return {};
          });
        }
      } catch (err) {
        console.error("[useFactions] loadPlayerFaction error:", err);
      }
    },

    createFaction: async (factionData, adminMode = false) => {
      const faction = await apiCreateFaction({
        name: factionData.name,
        description: factionData.charter,
        charter: factionData.charter,
        emblem: factionData.emblem,
        structure: factionData.structure,
        type: factionData.type,
        recruitment: factionData.recruitment,
        color: factionData.color || "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        banner: factionData.banner || factionData.emblem,
        motto: factionData.motto || "",
      }, adminMode);
      await get().loadFactions();
      set({ playerFaction: faction.id });
    },

    joinFaction: async (factionId: string) => {
      await apiJoinFaction(factionId);
      await get().loadFactions();
      set({ playerFaction: factionId });
    },

    leaveFaction: async (factionId: string) => {
      await apiLeaveFaction(factionId);
      await get().loadFactions();
      set({ playerFaction: null });
    },

    getFactionById: (factionId) => {
      if (!factionId) return undefined;
      return get().factions.find((f) => f.id === factionId);
    },

    canCreateFaction: (_playerId, playerReputation) => {
      return playerReputation >= 200;
    },

    updateFactionReputation: (factionId, change) => {
      set((state) => ({
        factions: state.factions.map((f) =>
          f.id === factionId
            ? { ...f, resources: { ...f.resources, reputation: f.resources.reputation + change } }
            : f
        ),
      }));
    },

    createQuest: (questData) => {
      const quest: FactionQuest = {
        ...questData,
        id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      set((state) => ({ availableQuests: [...state.availableQuests, quest] }));
    },

    getAvailableQuests: (playerFaction, playerReputation) => {
      return get().availableQuests.filter((quest) => {
        if (quest.requirements.minReputation > playerReputation) return false;
        if (quest.requirements.requiredFaction && quest.requirements.requiredFaction !== playerFaction)
          return false;
        if (quest.requirements.excludedFactions?.includes(playerFaction || "")) return false;
        return quest.status === "available";
      });
    },
  }))
);
