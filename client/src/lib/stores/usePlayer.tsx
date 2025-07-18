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
  getVisionRange: () => number;
  // Avatar land positioning
  findLandHex: (mapData: any[][]) => { x: number; y: number };
  // Movement confirmation
  pendingMovement: { x: number; y: number } | null;
  setPendingMovement: (movement: { x: number; y: number } | null) => void;
  isMovementMode: boolean;
  setMovementMode: (mode: boolean) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  selectedCharacter: { id: 'knight', name: 'Chevalier', image: '🛡️' },
  playerName: "Joueur",
  competences: [],
  competencePoints: 50,
  actionPoints: 25,
  maxActionPoints: 100,
  avatarPosition: { x: 3 * 1.5, y: 0, z: 3 * Math.sqrt(3) * 0.5 },
  avatarRotation: { x: 0, y: 0, z: 0 },
  isMoving: false,
  movementSpeed: 2,
  visibleHexes: new Set(),
  visionRange: 1,
  isGameMaster: false,
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
    
    set({ 
      avatarPosition: { x: worldX, y: 0, z: worldZ },
      avatarRotation: { x: 0, y: 0, z: 0 },
      isMoving: false
    });
    
    // Update vision using the new vision system
    state.updateVisibleHexes(hexX, hexY);
  },
  
  updateVisibleHexes: (centerX, centerY) => {
    const state = get();
    const newVisibleHexes = new Set(state.visibleHexes);
    const visionRange = state.getVisionRange();
    
    // Add avatar position
    newVisibleHexes.add(`${centerX},${centerY}`);
    
    if (visionRange >= 1) {
      // Add 6 adjacent hexes for radius 1 (total 7 hexes)
      const adjacentOffsets = [
        [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
      ];
      
      for (const [dx, dy] of adjacentOffsets) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && y >= 0) {
          newVisibleHexes.add(`${x},${y}`);
        }
      }
    }
    
    if (visionRange >= 2) {
      // Add outer ring for radius 2 (total 19 hexes)
      const outerOffsets = [
        [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [1, 1], [0, 2], 
        [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1]
      ];
      
      for (const [dx, dy] of outerOffsets) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && y >= 0) {
          newVisibleHexes.add(`${x},${y}`);
        }
      }
    }
    
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
    
    // Check if hex is in current vision range based on exploration level
    const isInCurrentVision = state.isHexInCurrentVision(hexX, hexY);
    
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
    
    // Get vision range based on exploration level
    const visionRange = state.getVisionRange();
    
    // Check if it's the avatar position
    if (hexX === avatarHexX && hexY === avatarHexY) {
      return true;
    }
    
    // Check adjacent hexes for radius 1
    if (visionRange >= 1) {
      const adjacentOffsets = [
        [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
      ];
      
      for (const [dx, dy] of adjacentOffsets) {
        if (hexX === avatarHexX + dx && hexY === avatarHexY + dy) {
          return true;
        }
      }
    }
    
    // Check outer ring for radius 2
    if (visionRange >= 2) {
      const outerOffsets = [
        [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [1, 1], [0, 2], 
        [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1]
      ];
      
      for (const [dx, dy] of outerOffsets) {
        if (hexX === avatarHexX + dx && hexY === avatarHexY + dy) {
          return true;
        }
      }
    }
    
    return false;
  },
  
  setGameMaster: (isGM) => {
    console.log('Setting game master mode:', isGM);
    set({ isGameMaster: isGM });
  },

  getVisionRange: () => {
    const state = get();
    const explorationLevel = state.getCompetenceLevel('exploration');
    // Vision de base : 1, niveau 2+ d'exploration : +1
    const visionRange = 1 + (explorationLevel >= 2 ? 1 : 0);
    console.log('Vision range calculation - Exploration level:', explorationLevel, 'Vision range:', visionRange);
    return visionRange;
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
            // Initialize vision after positioning avatar
            setTimeout(() => state.initializeVision(), 0);
            return { x, y };
          }
        }
      }
    }
    
    // Fallback to original position if no land found
    console.log('No land found, using default position');
    // Initialize vision for fallback position too
    setTimeout(() => state.initializeVision(), 0);
    return { x: 3, y: 3 };
  },

  // Initialize avatar vision at starting position
  initializeVision: () => {
    const state = get();
    // Convert avatar world position to hex coordinates
    const avatarHexX = Math.round(state.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(state.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    const newVisibleHexes = new Set();
    const visionRange = state.getVisionRange();
    
    // Add avatar position
    newVisibleHexes.add(`${avatarHexX},${avatarHexY}`);
    
    if (visionRange >= 1) {
      // Add 6 adjacent hexes for radius 1 (total 7 hexes)
      const adjacentOffsets = [
        [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]
      ];
      
      for (const [dx, dy] of adjacentOffsets) {
        const x = avatarHexX + dx;
        const y = avatarHexY + dy;
        if (x >= 0 && y >= 0) {
          newVisibleHexes.add(`${x},${y}`);
        }
      }
    }
    
    if (visionRange >= 2) {
      // Add outer ring for radius 2 (total 19 hexes)
      const outerOffsets = [
        [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [1, 1], [0, 2], 
        [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1]
      ];
      
      for (const [dx, dy] of outerOffsets) {
        const x = avatarHexX + dx;
        const y = avatarHexY + dy;
        if (x >= 0 && y >= 0) {
          newVisibleHexes.add(`${x},${y}`);
        }
      }
    }
    
    console.log('Initialized vision at hex:', avatarHexX, avatarHexY, 'World pos:', state.avatarPosition);
    console.log('Vision range:', visionRange, 'Visible hexes count:', newVisibleHexes.size);
    console.log('Visible hexes:', Array.from(newVisibleHexes).sort());
    set({ visibleHexes: newVisibleHexes });
  },

  setPendingMovement: (movement) => set({ pendingMovement: movement }),
  setMovementMode: (mode) => set({ isMovementMode: mode })
}));