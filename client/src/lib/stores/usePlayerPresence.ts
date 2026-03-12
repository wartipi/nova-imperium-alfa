import { create } from "zustand";
import { fetchPlayerPositions, type OtherPlayerPosition } from "../api/playersApi";

interface PlayerPresenceState {
  players: OtherPlayerPosition[];
  loadPlayers: () => Promise<void>;
}

export const usePlayerPresence = create<PlayerPresenceState>((set) => ({
  players: [],
  loadPlayers: async () => {
    try {
      const data = await fetchPlayerPositions();
      set({ players: data });
    } catch {
      // Échec silencieux — pas de crash si réseau indisponible ou token expiré
    }
  },
}));
