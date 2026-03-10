import { create } from "zustand";
import type { ActiveAction } from "../api/playerActionsApi";

interface PlayerActionsState {
  activeAction: ActiveAction | null;
  setActiveAction: (action: ActiveAction | null) => void;
  isActionActive: () => boolean;
}

export const usePlayerActions = create<PlayerActionsState>((set, get) => ({
  activeAction: null,

  setActiveAction: (action) => {
    set({ activeAction: action });
  },

  isActionActive: () => {
    const { activeAction } = get();
    return activeAction !== null && activeAction.status === "in_progress";
  },
}));
