import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";

interface PlayerState {
  selectedCharacter: CharacterOption | null;
  playerName: string;
  competences: string[];
  competencePoints: number;
  setSelectedCharacter: (character: CharacterOption) => void;
  setPlayerName: (name: string) => void;
  updatePlayer: (updates: Partial<Pick<PlayerState, 'competences' | 'competencePoints'>>) => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  selectedCharacter: null,
  playerName: "Joueur",
  competences: [],
  competencePoints: 50,
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setPlayerName: (name) => set({ playerName: name }),
  updatePlayer: (updates) => set((state) => ({ ...state, ...updates }))
}));