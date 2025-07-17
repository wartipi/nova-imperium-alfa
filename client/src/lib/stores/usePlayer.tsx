import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";

interface PlayerState {
  selectedCharacter: CharacterOption | null;
  playerName: string;
  setSelectedCharacter: (character: CharacterOption) => void;
  setPlayerName: (name: string) => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  selectedCharacter: null,
  playerName: "Joueur",
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setPlayerName: (name) => set({ playerName: name })
}));