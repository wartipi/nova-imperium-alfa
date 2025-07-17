import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";

interface PlayerState {
  selectedCharacter: CharacterOption | null;
  playerName: string;
  competences: string[];
  competencePoints: number;
  // Action Points system
  actionPoints: number;
  maxActionPoints: number;
  // Avatar position and movement
  avatarPosition: { x: number; y: number; z: number };
  avatarRotation: { x: number; y: number; z: number };
  isMoving: boolean;
  movementSpeed: number;
  // Vision system - fog of war
  visibleHexes: Set<string>;
  visionRange: number;
  isGameMaster: boolean;
  setSelectedCharacter: (character: CharacterOption) => void;
  setPlayerName: (name: string) => void;
  updatePlayer: (updates: Partial<Pick<PlayerState, 'competences' | 'competencePoints'>>) => void;
  spendActionPoints: (amount: number) => boolean;
  addActionPoints: (amount: number) => void;
  increaseMaxActionPoints: (amount: number) => void;
  // Avatar movement methods
  setAvatarPosition: (position: { x: number; y: number; z: number }) => void;
  setAvatarRotation: (rotation: { x: number; y: number; z: number }) => void;
  setIsMoving: (isMoving: boolean) => void;
  moveAvatarToHex: (hexX: number, hexY: number) => void;
  // Vision system methods
  updateVisibleHexes: (centerX: number, centerY: number) => void;
  isHexVisible: (hexX: number, hexY: number) => boolean;
  setGameMaster: (isGM: boolean) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  selectedCharacter: { id: 'knight', name: 'Chevalier', image: '🛡️' }, // Default character
  playerName: "Joueur",
  competences: [],
  competencePoints: 50,
  // Action Points - starts with 25 AP and max of 100
  actionPoints: 25,
  maxActionPoints: 100,
  // Avatar defaults - start at map center (adjust for better initial position)
  avatarPosition: { x: 5, y: 0, z: 5 },
  avatarRotation: { x: 0, y: 0, z: 0 },
  isMoving: false,
  movementSpeed: 2,
  // Vision system - fog of war
  visibleHexes: new Set(['5,5']), // Start with avatar position visible
  visionRange: 1, // Can see 1 hex around avatar
  isGameMaster: false, // Only game master sees full map
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setPlayerName: (name) => set({ playerName: name }),
  updatePlayer: (updates) => set((state) => ({ ...state, ...updates })),
  spendActionPoints: (amount) => {
    const state = get();
    if (state.actionPoints >= amount) {
      set({ actionPoints: state.actionPoints - amount });
      return true;
    }
    return false;
  },
  addActionPoints: (amount) => {
    const state = get();
    const newAmount = Math.min(state.actionPoints + amount, state.maxActionPoints);
    set({ actionPoints: newAmount });
  },
  increaseMaxActionPoints: (amount) => {
    const state = get();
    set({ maxActionPoints: state.maxActionPoints + amount });
  },
  // Avatar movement methods
  setAvatarPosition: (position) => set({ avatarPosition: position }),
  setAvatarRotation: (rotation) => set({ avatarRotation: rotation }),
  setIsMoving: (isMoving) => set({ isMoving }),
  moveAvatarToHex: (hexX, hexY) => {
    const state = get();
    // Convert hex coordinates to world coordinates
    const worldX = hexX * 1.5;
    const worldZ = hexY * Math.sqrt(3) * 0.5;
    
    // Calculate rotation to face movement direction
    const deltaX = worldX - state.avatarPosition.x;
    const deltaZ = worldZ - state.avatarPosition.z;
    const rotation = Math.atan2(deltaX, deltaZ);
    
    // Update visible hexes around new position
    const newVisibleHexes = new Set(state.visibleHexes);
    for (let dx = -state.visionRange; dx <= state.visionRange; dx++) {
      for (let dy = -state.visionRange; dy <= state.visionRange; dy++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance <= state.visionRange) {
          newVisibleHexes.add(`${hexX + dx},${hexY + dy}`);
        }
      }
    }
    
    set({ 
      avatarPosition: { x: worldX, y: 0, z: worldZ },
      avatarRotation: { x: 0, y: rotation, z: 0 },
      isMoving: false, // Instant movement for testing
      visibleHexes: newVisibleHexes
    });
  },
  
  // Vision system methods
  updateVisibleHexes: (centerX, centerY) => {
    const state = get();
    const newVisibleHexes = new Set(state.visibleHexes);
    
    for (let dx = -state.visionRange; dx <= state.visionRange; dx++) {
      for (let dy = -state.visionRange; dy <= state.visionRange; dy++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance <= state.visionRange) {
          newVisibleHexes.add(`${centerX + dx},${centerY + dy}`);
        }
      }
    }
    
    set({ visibleHexes: newVisibleHexes });
  },
  
  isHexVisible: (hexX, hexY) => {
    const state = get();
    return state.isGameMaster || state.visibleHexes.has(`${hexX},${hexY}`);
  },
  
  setGameMaster: (isGM) => set({ isGameMaster: isGM })
}));