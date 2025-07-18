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
  // Avatar defaults - start at hex (3,3) in world coordinates
  avatarPosition: { x: 3 * 1.5, y: 0, z: 3 * Math.sqrt(3) * 0.5 },
  avatarRotation: { x: 0, y: 0, z: 0 },
  isMoving: false,
  movementSpeed: 2,
  // Vision system - fog of war
  visibleHexes: new Set(), // Will be initialized by initializeVision
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
    
    // Update visible hexes around new position - keep previously explored hexes
    const newVisibleHexes = new Set(state.visibleHexes);
    
    // Clear current vision area and add new vision centered on avatar
    const currentVisionHexes = new Set();
    
    // Add avatar's current hex
    currentVisionHexes.add(`${hexX},${hexY}`);
    
    // Add all adjacent hexes (6 directions in hex grid)
    // Using proper hex grid offsets for even/odd row systems
    const hexDirections = [
      [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
    ];
    
    hexDirections.forEach(([dx, dy]) => {
      const newHexX = hexX + dx;
      const newHexY = hexY + dy;
      if (newHexX >= 0 && newHexY >= 0) {
        currentVisionHexes.add(`${newHexX},${newHexY}`);
      }
    });
    
    // Add all current vision hexes to permanent visible set
    currentVisionHexes.forEach(hex => newVisibleHexes.add(hex));
    
    console.log('Avatar moved to hex:', hexX, hexY);
    console.log('Current vision area:', Array.from(currentVisionHexes).sort());
    console.log('Total explored hexes:', newVisibleHexes.size);
    
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
    
    // Game master sees everything
    if (state.isGameMaster) return true;
    
    // Convert avatar world position to hex coordinates
    const avatarHexX = Math.round(state.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(state.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    // Check if hex is in current vision range around avatar (avatar + 6 adjacent hexes)
    const isAvatarHex = (hexX === avatarHexX && hexY === avatarHexY);
    
    // Check if hex is adjacent to avatar using proper hex grid adjacency
    const hexDirections = [
      [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
    ];
    
    const isAdjacent = hexDirections.some(([dx, dy]) => 
      hexX === avatarHexX + dx && hexY === avatarHexY + dy
    );
    
    const isInCurrentVision = isAvatarHex || isAdjacent;
    
    // Players see explored hexes OR hexes in current vision range
    const isExplored = state.visibleHexes.has(`${hexX},${hexY}`);
    
    // Debug logging for vision (commented out for performance)
    // if (isInCurrentVision) {
    //   console.log(`Hex ${hexX},${hexY} in current vision - Avatar at ${avatarHexX},${avatarHexY}`);
    // }
    
    return isExplored || isInCurrentVision;
  },
  
  setGameMaster: (isGM) => {
    console.log('Setting game master mode:', isGM);
    set({ isGameMaster: isGM });
  },
  
  // Initialize avatar vision at starting position
  initializeVision: () => {
    const state = get();
    // Convert avatar world position to hex coordinates
    const avatarHexX = Math.round(state.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(state.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    const newVisibleHexes = new Set();
    
    // Add avatar's current hex plus all adjacent hexes
    newVisibleHexes.add(`${avatarHexX},${avatarHexY}`); // Avatar's position
    
    // Add all adjacent hexes (6 directions in hex grid)
    const hexDirections = [
      [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
    ];
    
    hexDirections.forEach(([dx, dy]) => {
      const newHexX = avatarHexX + dx;
      const newHexY = avatarHexY + dy;
      if (newHexX >= 0 && newHexY >= 0) {
        newVisibleHexes.add(`${newHexX},${newHexY}`);
      }
    });
    
    console.log('Initialized vision at hex:', avatarHexX, avatarHexY, 'World pos:', state.avatarPosition);
    console.log('Visible hexes:', Array.from(newVisibleHexes).sort());
    set({ visibleHexes: newVisibleHexes });
  }
}));