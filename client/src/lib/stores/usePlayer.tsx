import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";
import { VisionSystem, type HexCoordinate } from '../systems/VisionSystem';
import { getLearnCost, getUpgradeCost } from '../competence/CompetenceCosts';

interface CompetenceLevel {
  competence: string;
  level: number; // 1-4
}

interface PlayerState {
  selectedCharacter: CharacterOption | null;
  playerName: string;
  
  // Système de niveau et d'expérience
  level: number;
  experience: number;
  experienceToNextLevel: number;
  totalExperience: number;
  
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
  
  // Système d'expérience et de niveau
  gainExperience: (amount: number, source?: string) => void;
  getExperienceProgress: () => number;
  calculateExperienceForLevel: (level: number) => number;
  
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
  
  // Système de niveau - commence au niveau 1
  level: 1,
  experience: 0,
  experienceToNextLevel: 120, // 100 * 1.2^(2-1) = 100 * 1.2 = 120 XP pour niveau 2
  totalExperience: 0,
  
  competences: [],
  competencePoints: 3, // Points de départ pour commencer
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
    
    const learnCost = getLearnCost(competence);
    if (state.competencePoints >= learnCost) {
      set({ 
        competences: [...state.competences, { competence, level: 1 }],
        competencePoints: state.competencePoints - learnCost
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
    
    const upgradeCost = getUpgradeCost(competence, existingCompetence.level);
    
    if (state.competencePoints >= upgradeCost) {
      set({ 
        competences: state.competences.map(c => 
          c.competence === competence 
            ? { ...c, level: c.level + 1 } 
            : c
        ),
        competencePoints: state.competencePoints - upgradeCost
      });
      // Update vision when exploration competence changes using unified system
      if (competence === 'exploration') {
        setTimeout(() => {
          const newState = get();
          const avatarHex = VisionSystem.worldToHex(newState.avatarPosition.x, newState.avatarPosition.z);
          const newExplorationLevel = newState.getCompetenceLevel('exploration');
          
          // Force immediate vision update with new level
          const newCurrentVision = VisionSystem.calculateCurrentVision(
            avatarHex.x, 
            avatarHex.y, 
            newExplorationLevel
          );
          
          const newExploredHexes = VisionSystem.updateExploredHexes(
            newCurrentVision, 
            newState.exploredHexes
          );
          
          set({ 
            currentVision: newCurrentVision,
            exploredHexes: newExploredHexes
          });
          
          // Force GameEngine to re-render with new vision
          if ((window as any).gameEngine) {
            // Update vision callbacks with latest state
            const updatedState = get();
            (window as any).gameEngine.setVisionCallbacks(
              updatedState.isHexVisible,
              updatedState.isHexInCurrentVision
            );
            (window as any).gameEngine.render();
          }
          
          console.log('Exploration competence upgraded - Vision updated:', {
            competence,
            newLevel: newExplorationLevel,
            newVisionRange: VisionSystem.getVisionRange(newExplorationLevel),
            currentVisionCount: newCurrentVision.size,
            exploredCount: newExploredHexes.size
          });
        }, 0);
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
    // Find a land hex (not water) starting from center and expanding outward
    const centerX = Math.floor(mapData[0].length / 2);
    const centerY = Math.floor(mapData.length / 2);
    
    // Check center first
    if (mapData[centerY] && mapData[centerY][centerX]) {
      const terrain = mapData[centerY][centerX].terrain;
      if (terrain !== 'shallow_water' && terrain !== 'deep_water') {
        console.log('Avatar positioned at center:', { x: centerX, y: centerY, terrain });
        return { x: centerX, y: centerY };
      }
    }
    
    // Expand search in spiral pattern
    for (let radius = 1; radius <= 10; radius++) {
      for (let y = Math.max(0, centerY - radius); y <= Math.min(mapData.length - 1, centerY + radius); y++) {
        for (let x = Math.max(0, centerX - radius); x <= Math.min(mapData[0].length - 1, centerX + radius); x++) {
          if (mapData[y] && mapData[y][x]) {
            const terrain = mapData[y][x].terrain;
            if (terrain !== 'shallow_water' && terrain !== 'deep_water') {
              console.log('Avatar positioned at:', { x, y, terrain });
              return { x, y };
            }
          }
        }
      }
    }
    
    // Last resort: force position at (0,0) if it exists
    console.warn('No land hex found, using fallback position');
    return { x: 0, y: 0 };
  },

  // Système d'expérience et de niveau
  calculateExperienceForLevel: (level) => {
    // Formule simple : 100 * 1.2^(level-1)
    // Chaque niveau demande 20% d'XP en plus que le précédent
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(1.2, level - 1));
  },

  getExperienceProgress: () => {
    const state = get();
    if (state.experienceToNextLevel <= 0) return 100;
    return (state.experience / state.experienceToNextLevel) * 100;
  },

  gainExperience: (amount, source = 'Action') => {
    const state = get();
    const newExperience = state.experience + amount;
    const newTotalExperience = state.totalExperience + amount;
    
    console.log(`Expérience gagnée: +${amount} (${source})`);
    
    // Vérifier si le joueur monte de niveau
    if (newExperience >= state.experienceToNextLevel) {
      const newLevel = state.level + 1;
      const nextLevelRequirement = get().calculateExperienceForLevel(newLevel + 1);
      const remainingExp = newExperience - state.experienceToNextLevel;
      
      // Récompenses de niveau
      const competencePointsGained = 1;
      const actionPointsBonus = 5;
      
      set({
        level: newLevel,
        experience: remainingExp,
        experienceToNextLevel: nextLevelRequirement,
        totalExperience: newTotalExperience,
        competencePoints: state.competencePoints + competencePointsGained,
        maxActionPoints: state.maxActionPoints + actionPointsBonus
      });
      
      console.log(`🎉 NIVEAU ${newLevel} ATTEINT !`, {
        competencePoints: `+${competencePointsGained} points de compétence`,
        actionPoints: `+${actionPointsBonus} PA maximum`,
        totalCompetencePoints: state.competencePoints + competencePointsGained,
        newMaxActionPoints: state.maxActionPoints + actionPointsBonus
      });

      // Déclencher notification de montée de niveau
      if ((window as any).showLevelUpNotification) {
        (window as any).showLevelUpNotification(newLevel, competencePointsGained, actionPointsBonus);
      }
      
      // Récursion si plusieurs niveaux sont gagnés d'un coup
      if (remainingExp >= nextLevelRequirement && nextLevelRequirement > 0) {
        get().gainExperience(0, 'Bonus de niveau');
      }
    } else {
      set({
        experience: newExperience,
        totalExperience: newTotalExperience
      });
    }
  }
}));