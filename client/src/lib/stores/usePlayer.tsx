import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";

interface CompetenceLevel {
  competence: string;
  level: number; // 1-4
}

interface PlayerState {
  selectedCharacter: CharacterOption | null;
  playerName: string;
  competences: CompetenceLevel[];
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
  learnCompetence: (competence: string) => boolean;
  upgradeCompetence: (competence: string) => boolean;
  getCompetenceLevel: (competence: string) => number;
  hasCompetenceLevel: (competence: string, level: number) => boolean;
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
  isHexInCurrentVision: (hexX: number, hexY: number) => boolean;
  setGameMaster: (isGM: boolean) => void;
  // Avatar land positioning
  findLandHex: (mapData: any[][]) => { x: number; y: number };
  // Movement confirmation
  pendingMovement: { x: number; y: number } | null;
  setPendingMovement: (movement: { x: number; y: number } | null) => void;
  isMovementMode: boolean;
  setMovementMode: (mode: boolean) => void;
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
  avatarRotation: { x: 0, y: 0, z: 0 }, // Always faces forward
  isMoving: false,
  movementSpeed: 2,
  // Vision system - fog of war
  visibleHexes: new Set(), // Will be initialized by initializeVision
  visionRange: 1, // Can see 1 hex around avatar
  isGameMaster: false, // Only game master sees full map
  // Movement confirmation
  pendingMovement: null,
  isMovementMode: false,
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setPlayerName: (name) => set({ playerName: name }),
  updatePlayer: (updates) => set((state) => ({ ...state, ...updates })),
  learnCompetence: (competence) => {
    const state = get();
    const existingCompetence = state.competences.find(c => c.competence === competence);
    
    if (existingCompetence) {
      return false; // Already has this competence
    }
    
    if (state.competencePoints >= 10) { // Cost 10 points to learn level 1
      set({ 
        competences: [...state.competences, { competence, level: 1 }],
        competencePoints: state.competencePoints - 10
      });
      return true;
    }
    return false;
  },
  upgradeCompetence: (competence) => {
    const state = get();
    const existingCompetence = state.competences.find(c => c.competence === competence);
    
    if (!existingCompetence || existingCompetence.level >= 4) {
      return false; // Competence not found or already max level
    }
    
    const upgradeCost = existingCompetence.level * 5; // Level 1->2: 5pts, 2->3: 10pts, 3->4: 15pts
    
    if (state.competencePoints >= upgradeCost) {
      set({ 
        competences: state.competences.map(c => 
          c.competence === competence 
            ? { ...c, level: c.level + 1 } 
            : c
        ),
        competencePoints: state.competencePoints - upgradeCost
      });
      return true;
    }
    return false;
  },
  getCompetenceLevel: (competence) => {
    const state = get();
    const existingCompetence = state.competences.find(c => c.competence === competence);
    return existingCompetence ? existingCompetence.level : 0;
  },
  hasCompetenceLevel: (competence, level) => {
    const state = get();
    const existingCompetence = state.competences.find(c => c.competence === competence);
    return existingCompetence && existingCompetence.level >= level;
  },
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
    const worldX = hexX * 1.5;
    const worldZ = hexY * Math.sqrt(3) * 0.5;
    
    // Debug logs can be re-enabled if needed for troubleshooting
    // console.log('Moving avatar from hex:', Math.round(state.avatarPosition.x / 1.5), Math.round(state.avatarPosition.z / (Math.sqrt(3) * 0.5)));
    // console.log('Moving avatar to hex:', hexX, hexY);
    
    // Keep avatar facing forward (no rotation)
    // Avatar stays upright during movement
    
    // Update visible hexes around new position - keep previously explored hexes
    const newVisibleHexes = new Set(state.visibleHexes);
    
    // Clear current vision area and add new vision centered on avatar
    const currentVisionHexes = new Set();
    
    // Add avatar's current hex
    currentVisionHexes.add(`${hexX},${hexY}`);
    
    // Add all adjacent hexes (6 directions in hex grid)
    // Using proper hex grid offsets for even/odd column systems
    const hexDirections = hexX % 2 === 0 ? [
      // Even column (0, 2, 4, 6...)
      [0, -1],  // North
      [1, -1],  // Northeast
      [1, 0],   // Southeast
      [0, 1],   // South
      [-1, 0],  // Southwest
      [-1, -1]  // Northwest
    ] : [
      // Odd column (1, 3, 5, 7...)
      [0, -1],  // North
      [1, 0],   // Northeast
      [1, 1],   // Southeast
      [0, 1],   // South
      [-1, 1],  // Southwest
      [-1, 0]   // Northwest
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
      avatarRotation: { x: 0, y: 0, z: 0 }, // Keep avatar facing forward
      isMoving: false, // Instant movement for testing
      visibleHexes: newVisibleHexes
    });
  },
  
  // Vision system methods
  updateVisibleHexes: (centerX, centerY) => {
    const state = get();
    const newVisibleHexes = new Set(state.visibleHexes);
    
    // Add center hex
    newVisibleHexes.add(`${centerX},${centerY}`);
    
    // Add only the 6 directly adjacent hexes using proper hex grid
    const hexDirections = centerX % 2 === 0 ? [
      [0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]
    ] : [
      [0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]
    ];
    
    hexDirections.forEach(([dx, dy]) => {
      const hexX = centerX + dx;
      const hexY = centerY + dy;
      if (hexX >= 0 && hexY >= 0) {
        newVisibleHexes.add(`${hexX},${hexY}`);
      }
    });
    
    set({ visibleHexes: newVisibleHexes });
  },
  
  isHexVisible: (hexX, hexY) => {
    const state = get();
    
    // Game master sees everything
    if (state.isGameMaster) {
      return true;
    }
    
    // Convert avatar world position to hex coordinates
    const avatarHexX = Math.round(state.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(state.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    // Check if hex is in current vision range around avatar (avatar + 6 adjacent hexes)
    const isAvatarHex = (hexX === avatarHexX && hexY === avatarHexY);
    
    // Check if hex is adjacent to avatar using proper hex grid adjacency
    // Hexagonal grid has different adjacency patterns for even/odd columns
    const hexDirections = avatarHexX % 2 === 0 ? [
      // Even column (0, 2, 4, 6...)
      [0, -1],  // North
      [1, -1],  // Northeast
      [1, 0],   // Southeast
      [0, 1],   // South
      [-1, 0],  // Southwest
      [-1, -1]  // Northwest
    ] : [
      // Odd column (1, 3, 5, 7...)
      [0, -1],  // North
      [1, 0],   // Northeast
      [1, 1],   // Southeast
      [0, 1],   // South
      [-1, 1],  // Southwest
      [-1, 0]   // Northwest
    ];
    
    const isAdjacent = hexDirections.some(([dx, dy]) => 
      hexX === avatarHexX + dx && hexY === avatarHexY + dy
    );
    
    const isInCurrentVision = isAvatarHex || isAdjacent;
    
    // Players see explored hexes OR hexes in current vision range
    const isExplored = state.visibleHexes.has(`${hexX},${hexY}`);
    
    return isExplored || isInCurrentVision;
  },

  // New method to check if hex is in current vision (not just explored)
  isHexInCurrentVision: (hexX, hexY) => {
    const state = get();
    
    // Game master sees everything as current vision
    if (state.isGameMaster) {
      return true;
    }
    
    // Convert avatar world position to hex coordinates
    const avatarHexX = Math.round(state.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(state.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    // Check if hex is in current vision range around avatar (avatar + 6 adjacent hexes)
    const isAvatarHex = (hexX === avatarHexX && hexY === avatarHexY);
    
    // Check if hex is adjacent to avatar using proper hex grid adjacency
    const hexDirections = avatarHexX % 2 === 0 ? [
      // Even column (0, 2, 4, 6...)
      [0, -1],  // North
      [1, -1],  // Northeast
      [1, 0],   // Southeast
      [0, 1],   // South
      [-1, 0],  // Southwest
      [-1, -1]  // Northwest
    ] : [
      // Odd column (1, 3, 5, 7...)
      [0, -1],  // North
      [1, 0],   // Northeast
      [1, 1],   // Southeast
      [0, 1],   // South
      [-1, 1],  // Southwest
      [-1, 0]   // Northwest
    ];
    
    const isAdjacent = hexDirections.some(([dx, dy]) => 
      hexX === avatarHexX + dx && hexY === avatarHexY + dy
    );
    
    return isAvatarHex || isAdjacent;
  },
  
  setGameMaster: (isGM) => {
    console.log('Setting game master mode:', isGM);
    set({ isGameMaster: isGM });
  },
  
  // Find first available land hex for avatar spawn
  findLandHex: (mapData: any[][]) => {
    const state = get();
    const waterTerrains = ['shallow_water', 'deep_water'];
    
    // Search for first available land hex starting from center
    const centerX = Math.floor(mapData[0].length / 2);
    const centerY = Math.floor(mapData.length / 2);
    
    // Spiral search outward from center
    for (let radius = 0; radius < Math.max(mapData.length, mapData[0].length); radius++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(mapData[0].length - 1, centerX + radius); x++) {
        for (let y = Math.max(0, centerY - radius); y <= Math.min(mapData.length - 1, centerY + radius); y++) {
          const hex = mapData[y][x];
          if (hex && !waterTerrains.includes(hex.terrain)) {
            const worldX = x * 1.5;
            const worldZ = y * Math.sqrt(3) * 0.5;
            set({ avatarPosition: { x: worldX, y: 0, z: worldZ } });
            console.log('Avatar spawned on land at hex:', x, y, 'terrain:', hex.terrain);
            return { x, y };
          }
        }
      }
    }
    
    // Fallback to original position if no land found
    console.log('No land found, using default position');
    return { x: 3, y: 3 };
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
    // Hexagonal grid has different adjacency patterns for even/odd columns
    const hexDirections = avatarHexX % 2 === 0 ? [
      // Even column (0, 2, 4, 6...)
      [0, -1],  // North
      [1, -1],  // Northeast
      [1, 0],   // Southeast
      [0, 1],   // South
      [-1, 0],  // Southwest
      [-1, -1]  // Northwest
    ] : [
      // Odd column (1, 3, 5, 7...)
      [0, -1],  // North
      [1, 0],   // Northeast
      [1, 1],   // Southeast
      [0, 1],   // South
      [-1, 1],  // Southwest
      [-1, 0]   // Northwest
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
  },

  setPendingMovement: (movement) => set({ pendingMovement: movement }),
  setMovementMode: (mode) => set({ isMovementMode: mode })
}));