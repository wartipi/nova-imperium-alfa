import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";
import { VisionSystem, type HexCoordinate } from '../systems/VisionSystem';

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
  // Vision system unifié
  currentVision: Set<string>;
  exploredHexes: Set<string>;
  isGameMaster: boolean;
  // Movement system
  pendingMovement: { x: number; y: number } | null;
  isMovementMode: boolean;
  
  // Character and competence methods
  setSelectedCharacter: (character: CharacterOption) => void;
  setPlayerName: (name: string) => void;
  updatePlayer: (updates: Partial<Pick<PlayerState, 'competences' | 'competencePoints'>>) => void;
  learnCompetence: (competence: string) => boolean;
  upgradeCompetence: (competence: string) => boolean;
  getCompetenceLevel: (competence: string) => number;
  hasCompetenceLevel: (competence: string, level: number) => boolean;
  
  // Action Points methods
  spendActionPoints: (amount: number) => boolean;
  addActionPoints: (amount: number) => void;
  increaseMaxActionPoints: (amount: number) => void;
  
  // Avatar movement methods
  setAvatarPosition: (position: { x: number; y: number; z: number }) => void;
  setAvatarRotation: (rotation: { x: number; y: number; z: number }) => void;
  setIsMoving: (isMoving: boolean) => void;
  moveAvatarToHex: (hexX: number, hexY: number) => void;
  
  // Vision et exploration - système unifié
  setGameMaster: (isGM: boolean) => void;
  getVisionRange: () => number;
  updateVision: () => void;
  isHexVisible: (hexX: number, hexY: number) => boolean;
  isHexInCurrentVision: (hexX: number, hexY: number) => boolean;
  isHexExplored: (hexX: number, hexY: number) => boolean;
  
  // Movement system
  setPendingMovement: (movement: { x: number; y: number } | null) => void;
  setMovementMode: (mode: boolean) => void;
  
  // Avatar land positioning
  findLandHex: (mapData: any[][]) => { x: number; y: number };
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
  currentVision: new Set(),
  exploredHexes: new Set(),
  isGameMaster: false,
  pendingMovement: null,
  isMovementMode: false,

  // Character methods
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setPlayerName: (name) => set({ playerName: name }),
  updatePlayer: (updates) => set((state) => ({ ...state, ...updates })),

  // Competence methods
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
      // Update vision when exploration competence changes
      if (competence === 'exploration') {
        get().updateVision();
      }
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
      // Update vision when exploration competence changes
      if (competence === 'exploration') {
        get().updateVision();
      }
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

  // Action Points methods
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
    const worldCoords = VisionSystem.hexToWorld(hexX, hexY);
    
    set({ 
      avatarPosition: { x: worldCoords.x, y: 0, z: worldCoords.z },
      avatarRotation: { x: 0, y: 0, z: 0 },
      isMoving: false
    });
    
    // Update vision after movement
    state.updateVision();
  },

  // Vision system unifié
  setGameMaster: (isGM) => set({ isGameMaster: isGM }),

  getVisionRange: () => {
    const state = get();
    const explorationLevel = state.getCompetenceLevel('exploration');
    return VisionSystem.getVisionRange(explorationLevel);
  },

  updateVision: () => {
    const state = get();
    const avatarHex = VisionSystem.worldToHex(state.avatarPosition.x, state.avatarPosition.z);
    const explorationLevel = state.getCompetenceLevel('exploration');
    
    // Calculate current vision
    const newCurrentVision = VisionSystem.calculateCurrentVision(
      avatarHex.x, 
      avatarHex.y, 
      explorationLevel
    );
    
    // Update explored hexes with current vision
    const newExploredHexes = VisionSystem.updateExploredHexes(
      newCurrentVision, 
      state.exploredHexes
    );
    
    console.log('Vision updated:', {
      avatarHex,
      explorationLevel,
      visionRange: VisionSystem.getVisionRange(explorationLevel),
      currentVisionCount: newCurrentVision.size,
      exploredCount: newExploredHexes.size
    });
    
    set({ 
      currentVision: newCurrentVision,
      exploredHexes: newExploredHexes
    });
  },

  isHexVisible: (hexX, hexY) => {
    const state = get();
    if (state.isGameMaster) return true;
    return VisionSystem.isHexVisible(hexX, hexY, state.currentVision, state.exploredHexes);
  },

  isHexInCurrentVision: (hexX, hexY) => {
    const state = get();
    if (state.isGameMaster) return true;
    return VisionSystem.isHexInCurrentVision(hexX, hexY, state.currentVision);
  },

  isHexExplored: (hexX, hexY) => {
    const state = get();
    return VisionSystem.isHexExplored(hexX, hexY, state.exploredHexes);
  },

  // Movement system
  setPendingMovement: (movement) => set({ pendingMovement: movement }),
  setMovementMode: (mode) => set({ isMovementMode: mode }),

  // Avatar land positioning
  findLandHex: (mapData) => {
    // Find a land hex (not water) starting from center
    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        const terrain = mapData[y][x].terrain;
        if (terrain !== 'shallow_water' && terrain !== 'deep_water') {
          // Initialize vision after setting position
          const state = get();
          setTimeout(() => state.updateVision(), 0);
          return { x, y };
        }
      }
    }
    // Fallback to center if no land found
    setTimeout(() => get().updateVision(), 0);
    return { x: 3, y: 3 };
  },
}));