import { create } from "zustand";
import { CharacterOption } from "../../components/game/CharacterSelector";
import { VisionSystem, type HexCoordinate } from '../systems/VisionSystem';
import { getLearnCost, getUpgradeCost } from '../competence/CompetenceCosts';
import { useMap } from './useMap';
import { usePlayerActions } from './usePlayerActions';
import { useNovaImperium } from './useNovaImperium';
import { savePlayerPosition } from '../api/playerApi';
import { savePlayerState } from '../api/playerStateApi';
import { fetchDiscoveredTiles, syncDiscoveredTiles } from '../api/discoveredTilesApi';

interface CompetenceLevel {
  competence: string;
  level: number; // 1-4
}

interface Avatar {
  id: string;
  name: string;
  character: CharacterOption;
  level: number;
  experience: number;
  totalExperience: number;
  competences: CompetenceLevel[];
  competencePoints: number;
  actionPoints: number;
  maxActionPoints: number;
  position: { x: number; y: number; z: number }; // Coordonnées monde pour rendu 3D
  hexPosition: { x: number; y: number }; // Coordonnées hex pour logique de jeu
  currentVision: Set<string>;
  exploredHexes: Set<string>;
  resourcesDiscovered: Set<string>; // Ressources découvertes par action "Explorer la Zone"
}

interface PlayerState {
  // Gestion des avatars multiples
  avatars: Avatar[];
  currentAvatarId: string;
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
  avatarPosition: { x: number; y: number; z: number }; // Coordonnées monde pour le rendu 3D
  avatarHexPosition: { x: number; y: number }; // Coordonnées hex pour la logique de jeu
  avatarRotation: { x: number; y: number; z: number };
  isMoving: boolean;
  movementSpeed: number;
  // Vision system unifié
  currentVision: Set<string>;
  exploredHexes: Set<string>;
  fogRing: Set<string>;          // Anneau de brouillard entourant la vision directe (rayon+1)
  resourcesDiscovered: Set<string>; // Ressources découvertes par action "Explorer la Zone"

  // Movement system
  pendingMovement: { x: number; y: number } | null;
  
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
  
  // Propriété calculée pour le niveau d'exploration
  explorationLevel: number;
  
  // Action Points methods
  spendActionPoints: (amount: number) => boolean;
  
  // Avatar position methods
  getAvatarPosition: () => { x: number; y: number; z: number };
  addActionPoints: (amount: number) => void;
  increaseMaxActionPoints: (amount: number) => void;
  setMaxActionPointsForTesting: () => void;
  
  // Avatar movement methods
  setAvatarPosition: (position: { x: number; y: number; z: number }) => void;
  setAvatarRotation: (rotation: { x: number; y: number; z: number }) => void;
  setIsMoving: (isMoving: boolean) => void;
  moveAvatarToHex: (hexX: number, hexY: number) => void;

  // Position visuelle temporaire de trajet (n'affecte pas la position canonique)
  travelVisualHexPosition: { x: number; y: number } | null;
  setTravelVisualHexPosition: (hex: { x: number; y: number } | null) => void;
  clearTravelVisualHexPosition: () => void;
  
  // Vision et exploration - système unifié
  getVisionRange: () => number;
  updateVision: () => void;
  isHexVisible: (hexX: number, hexY: number) => boolean;
  isHexInCurrentVision: (hexX: number, hexY: number) => boolean;
  isHexInFogRing: (hexX: number, hexY: number) => boolean;
  isHexExplored: (hexX: number, hexY: number) => boolean;
  addExploredHex: (hexX: number, hexY: number) => void;
  exploreCurrentLocation: () => boolean;
  isResourceDiscovered: (hexX: number, hexY: number) => boolean;
  discoverResourcesInVision: () => boolean;
  /** Charge les tuiles découvertes depuis le serveur et repeuple exploredHexes. */
  loadDiscoveredTiles: () => Promise<void>;
  /** Ajoute la vision passive des villes owned (rayon 2) à exploredHexes et synce au serveur. */
  addCityVision: (cityLocalPositions: { x: number; y: number }[]) => void;
  /** Reconstruit resourcesDiscovered depuis exploredHexes + mapData au startup. */
  reconstructResourcesDiscovered: () => void;

  // Movement system
  setPendingMovement: (movement: { x: number; y: number } | null) => void;
  
  // Avatar land positioning
  findLandHex: (mapData: any[][]) => { x: number; y: number };
  
  // Gestion des avatars multiples
  createAvatar: (name: string, character: CharacterOption) => string;
  switchToAvatar: (avatarId: string) => void;
  getCurrentAvatar: () => Avatar | null;
  updateAvatarName: (avatarId: string, name: string) => void;
  deleteAvatar: (avatarId: string) => void;
  canCreateNewAvatar: () => boolean;
}

export const usePlayer = create<PlayerState>((set, get) => {
  // Créer l'avatar initial
  const initialAvatar: Avatar = {
    id: 'avatar_1',
    name: 'Avatar Principal',
    character: { id: 'knight', name: 'Chevalier', image: '🛡️', description: 'Un noble chevalier' },
    level: 1,
    experience: 0,
    totalExperience: 0,
    competences: [],
    competencePoints: 3,
    actionPoints: 25,
    maxActionPoints: 100,
    position: { x: 3 * 1.5, y: 0, z: 3 * Math.sqrt(3) * 0.5 },
    hexPosition: { x: 3, y: 3 },
    currentVision: new Set(),
    exploredHexes: new Set(),
    resourcesDiscovered: new Set()
  };

  return {
    // Système d'avatars multiples
    avatars: [initialAvatar],
    currentAvatarId: 'avatar_1',
    selectedCharacter: { id: 'knight', name: 'Chevalier', image: '🛡️', description: 'Un noble chevalier' },
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
  avatarHexPosition: { x: 3, y: 3 },
  travelVisualHexPosition: null,
  avatarRotation: { x: 0, y: 0, z: 0 },
  isMoving: false,
  movementSpeed: 2,
  currentVision: new Set(),
  exploredHexes: new Set(),
  fogRing: new Set(),
  resourcesDiscovered: new Set(),

  pendingMovement: null,

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
          const avatarHex = newState.avatarHexPosition;
          const newExplorationLevel = newState.getCompetenceLevel('exploration');
          
          // Force immediate vision update with new level
          const newCurrentVision = VisionSystem.calculateCurrentVision(
            avatarHex.x, 
            avatarHex.y, 
            newExplorationLevel
          );

          const newFogRingUpgrade = VisionSystem.calculateFogRing(
            avatarHex.x,
            avatarHex.y,
            newExplorationLevel
          );

          const discoveredUpgrade = new Set<string>(newCurrentVision);
          for (const key of newFogRingUpgrade) discoveredUpgrade.add(key);
          
          const newExploredHexes = VisionSystem.updateExploredHexes(
            discoveredUpgrade, 
            newState.exploredHexes
          );
          
          set({ 
            currentVision: newCurrentVision,
            fogRing: newFogRingUpgrade,
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
    return existingCompetence ? existingCompetence.level >= level : false;
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
  setAvatarPosition: (position) => {
    // Note: Pour une coordination complète, utilisez moveAvatarToHex() qui met à jour les deux positions
    set({ avatarPosition: position });
  },
  setAvatarRotation: (rotation) => set({ avatarRotation: rotation }),
  setIsMoving: (isMoving) => set({ isMoving }),
  
  getAvatarPosition: () => {
    const state = get();
    console.log('🎯 Position avatar - Monde:', state.avatarPosition, 'Hex:', state.avatarHexPosition);
    return { ...state.avatarHexPosition, z: 0 };
  },

  moveAvatarToHex: (hexX, hexY) => {
    const state = get();
    const worldCoords = VisionSystem.hexToWorld(hexX, hexY);
    
    set({ 
      avatarPosition: { x: worldCoords.x, y: 0, z: worldCoords.z },
      avatarHexPosition: { x: hexX, y: hexY },
      avatarRotation: { x: 0, y: 0, z: 0 },
      isMoving: false
    });
    
    // Update vision after movement
    state.updateVision();

    // Detect segment change and reload map block if needed
    useMap.getState().ensurePlayerSegmentLoaded(hexX, hexY);

    // Sauvegarde principale — coordonnées monde reconstituées
    // Protégée : ignorée pendant un chargement de bloc (origine instable)
    // Protégée également si une action de déplacement est en cours — la DB sera mise à jour par completeAction
    const { isLoadingFromDB, originWorldX, originWorldY } = useMap.getState();
    if (!isLoadingFromDB) {
      const worldX = hexX + originWorldX;
      const worldY = hexY + originWorldY;
      if (usePlayerActions.getState().isActionActive()) {
        console.log(`[PlayerSave] Action active — position locale seulement (${worldX},${worldY}), save différé au serveur`);
      } else {
        savePlayerPosition(worldX, worldY).catch((err) => {
          console.warn(`[PlayerSave] Erreur sauvegarde déplacement: ${err}`);
        });
        console.log(`[PlayerSave] Déplacement → world=(${worldX},${worldY})`);
      }
    } else {
      console.log(`[PlayerSave] Chargement en cours — sauvegarde différée au changement de segment`);
    }
  },

  // Position visuelle temporaire de trajet
  setTravelVisualHexPosition: (hex) => set({ travelVisualHexPosition: hex }),
  clearTravelVisualHexPosition: () => set({ travelVisualHexPosition: null }),

  // Vision system unifié
  getVisionRange: () => {
    const state = get();
    const explorationLevel = state.getCompetenceLevel('exploration');
    return VisionSystem.getVisionRange(explorationLevel);
  },

  updateVision: () => {
    const state = get();
    const avatarHex = state.avatarHexPosition;
    const explorationLevel = state.getCompetenceLevel('exploration');

    // Vision directe de l'avatar
    const newCurrentVision = VisionSystem.calculateCurrentVision(
      avatarHex.x,
      avatarHex.y,
      explorationLevel
    );

    // Vision active des villes owned (rayon fixe 2) — fusionnée dans currentVision
    const CITY_VISION_RADIUS = 2;
    const cities = useNovaImperium.getState().currentNovaImperium?.cities ?? [];
    const avatarVisionSizeBefore = newCurrentVision.size;
    for (const city of cities) {
      const cityHexes = VisionSystem.getVisibleHexes(city.x, city.y, CITY_VISION_RADIUS);
      for (const hex of cityHexes) {
        newCurrentVision.add(`${hex.x},${hex.y}`);
      }
    }
    const citiesVisionAdded = newCurrentVision.size - avatarVisionSizeBefore;

    // Anneau de brouillard de l'avatar (rayon+1 hors vision directe)
    // Option A : fogRing = union des anneaux avatar + villes, moins currentVision
    const newFogRing = VisionSystem.calculateFogRing(
      avatarHex.x,
      avatarHex.y,
      explorationLevel
    );
    for (const city of cities) {
      const outerHexes = VisionSystem.getVisibleHexes(city.x, city.y, CITY_VISION_RADIUS + 1);
      for (const hex of outerHexes) {
        const key = `${hex.x},${hex.y}`;
        if (!newCurrentVision.has(key)) {
          newFogRing.add(key);
        }
      }
    }

    // Exploration permanente — découverte = vision directe + anneau (visionRange+1)
    const prevExplored = state.exploredHexes;
    const discoveredThisTurn = new Set<string>(newCurrentVision);
    for (const key of newFogRing) discoveredThisTurn.add(key);
    const newExploredHexes = VisionSystem.updateExploredHexes(discoveredThisTurn, prevExplored);

    // Synchroniser avec le serveur les tuiles nouvellement découvertes (delta)
    const { originWorldX, originWorldY } = useMap.getState();
    const newTiles: { worldX: number; worldY: number }[] = [];
    for (const key of discoveredThisTurn) {
      if (!prevExplored.has(key)) {
        const [lx, ly] = key.split(',').map(Number);
        newTiles.push({ worldX: lx + originWorldX, worldY: ly + originWorldY });
      }
    }
    if (newTiles.length > 0) {
      syncDiscoveredTiles(newTiles).catch(err =>
        console.warn('[updateVision] syncDiscoveredTiles échoué:', err)
      );
    }

    console.log('Vision updated:', {
      avatarHex,
      explorationLevel,
      visionRange: VisionSystem.getVisionRange(explorationLevel),
      avatarVision: avatarVisionSizeBefore,
      citiesVisionAdded,
      currentVisionCount: newCurrentVision.size,
      fogRingCount: newFogRing.size,
      exploredCount: newExploredHexes.size,
      newTilesCount: newTiles.length,
    });

    set({
      currentVision: newCurrentVision,
      fogRing: newFogRing,
      exploredHexes: newExploredHexes,
    });
  },

  isHexVisible: (hexX, hexY) => {
    const state = get();
    return VisionSystem.isHexVisible(hexX, hexY, state.currentVision, state.exploredHexes);
  },

  isHexInCurrentVision: (hexX, hexY) => {
    const state = get();
    return VisionSystem.isHexInCurrentVision(hexX, hexY, state.currentVision);
  },

  isHexInFogRing: (hexX, hexY) => {
    const state = get();
    return VisionSystem.isHexInFogRing(hexX, hexY, state.fogRing);
  },

  loadDiscoveredTiles: async () => {
    try {
      const tiles = await fetchDiscoveredTiles();
      if (tiles.length === 0) return;

      const { originWorldX, originWorldY } = useMap.getState();
      const newExploredHexes = new Set<string>(get().exploredHexes);

      for (const t of tiles) {
        const localX = t.worldX - originWorldX;
        const localY = t.worldY - originWorldY;
        newExploredHexes.add(`${localX},${localY}`);
      }

      set({ exploredHexes: newExploredHexes });
      console.log(
        `[loadDiscoveredTiles] ${tiles.length} tuiles chargées depuis le serveur` +
        ` → ${newExploredHexes.size} tuiles explorées (locales)`
      );
    } catch (err) {
      console.warn('[loadDiscoveredTiles] Échec chargement:', err);
    }
  },

  addCityVision: (cityLocalPositions) => {
    if (cityLocalPositions.length === 0) return;
    const { originWorldX, originWorldY } = useMap.getState();
    const state = get();
    const newExploredHexes = new Set<string>(state.exploredHexes);
    const newTiles: { worldX: number; worldY: number }[] = [];
    for (const { x, y } of cityLocalPositions) {
      const cityHexes = VisionSystem.getVisibleHexes(x, y, 2);
      for (const hex of cityHexes) {
        const key = `${hex.x},${hex.y}`;
        if (!newExploredHexes.has(key)) {
          newExploredHexes.add(key);
          newTiles.push({ worldX: hex.x + originWorldX, worldY: hex.y + originWorldY });
        }
      }
    }
    set({ exploredHexes: newExploredHexes });
    if (newTiles.length > 0) {
      syncDiscoveredTiles(newTiles).catch(err =>
        console.warn('[addCityVision] syncDiscoveredTiles échoué:', err)
      );
    }
    console.log(`[addCityVision] ${cityLocalPositions.length} ville(s) → ${newTiles.length} tuile(s) nouvelles`);
  },

  reconstructResourcesDiscovered: () => {
    const { mapData } = useMap.getState();
    if (!mapData) return;
    const state = get();
    const newResourcesDiscovered = new Set<string>(state.resourcesDiscovered);
    let count = 0;
    state.exploredHexes.forEach(key => {
      const [lx, ly] = key.split(',').map(Number);
      const tile = mapData[ly]?.[lx];
      if (tile?.resource) {
        newResourcesDiscovered.add(key);
        count++;
      }
    });
    set({ resourcesDiscovered: newResourcesDiscovered });
    console.log(`[reconstructResourcesDiscovered] ${count} ressource(s) reconstruite(s) depuis exploredHexes`);
  },

  isHexExplored: (hexX, hexY) => {
    const state = get();
    return VisionSystem.isHexExplored(hexX, hexY, state.exploredHexes);
  },

  addExploredHex: (hexX, hexY) => {
    const state = get();
    const newExploredHexes = new Set(state.exploredHexes);
    newExploredHexes.add(`${hexX},${hexY}`);
    set({ exploredHexes: newExploredHexes });
  },

  exploreCurrentLocation: () => {
    const state = get();
    const avatarHex = state.avatarHexPosition;
    const avatar = state.getCurrentAvatar();
    
    if (!avatar) return false;
    
    // Marquer la position actuelle comme explorée
    const hexKey = `${avatarHex.x},${avatarHex.y}`;
    if (state.exploredHexes.has(hexKey)) {
      return false; // Déjà exploré
    }
    
    // Ajouter aux zones explorées
    state.addExploredHex(avatarHex.x, avatarHex.y);
    
    console.log(`Zone explorée: (${avatarHex.x}, ${avatarHex.y})`);
    return true;
  },

  // Movement system
  setPendingMovement: (movement) => set({ pendingMovement: movement }),

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
  },

  // Gestion des avatars multiples
  createAvatar: (name, character) => {
    const state = get();
    if (state.avatars.length >= 2) {
      return ''; // Maximum 2 avatars
    }

    const newAvatarId = `avatar_${Date.now()}`;
    const landHex = state.findLandHex([]);
    const newAvatar: Avatar = {
      id: newAvatarId,
      name,
      character,
      level: 1,
      experience: 0,
      totalExperience: 0,
      competences: [],
      competencePoints: 3,
      actionPoints: 25,
      maxActionPoints: 100,
      position: { x: landHex.x * 1.5, y: 0, z: landHex.y * Math.sqrt(3) * 0.5 },
      hexPosition: { x: landHex.x, y: landHex.y },
      currentVision: new Set(),
      exploredHexes: new Set(),
      resourcesDiscovered: new Set()
    };

    set({ avatars: [...state.avatars, newAvatar] });
    return newAvatarId;
  },

  switchToAvatar: (avatarId) => {
    const state = get();
    const avatar = state.avatars.find(a => a.id === avatarId);
    if (avatar) {
      set({
        currentAvatarId: avatarId,
        selectedCharacter: avatar.character,
        level: avatar.level,
        experience: avatar.experience,
        totalExperience: avatar.totalExperience,
        competences: avatar.competences,
        competencePoints: avatar.competencePoints,
        actionPoints: avatar.actionPoints,
        maxActionPoints: avatar.maxActionPoints,
        avatarPosition: avatar.position,
        avatarHexPosition: avatar.hexPosition,
        currentVision: avatar.currentVision,
        exploredHexes: avatar.exploredHexes,
        resourcesDiscovered: avatar.resourcesDiscovered
      });
    }
  },

  getCurrentAvatar: () => {
    const state = get();
    return state.avatars.find(a => a.id === state.currentAvatarId) || null;
  },

  updateAvatarName: (avatarId, name) => {
    const state = get();
    set({
      avatars: state.avatars.map(avatar =>
        avatar.id === avatarId ? { ...avatar, name } : avatar
      )
    });
  },

  deleteAvatar: (avatarId) => {
    const state = get();
    if (state.avatars.length <= 1 || avatarId === state.currentAvatarId) {
      return; // Cannot delete last avatar or current avatar
    }
    set({
      avatars: state.avatars.filter(avatar => avatar.id !== avatarId)
    });
  },

  canCreateNewAvatar: () => {
    const state = get();
    return state.avatars.length < 2;
  },

  // Système de découverte des ressources
  isResourceDiscovered: (hexX, hexY) => {
    const state = get();
    return state.resourcesDiscovered.has(`${hexX},${hexY}`);
  },

  discoverResourcesInVision: () => {
    const state = get();
    
    // Vérifier si le joueur a la compétence exploration niveau 1
    const explorationLevel = state.getCompetenceLevel('exploration');
    if (explorationLevel < 1) {
      console.log('❌ Exploration impossible: compétence exploration niveau 1 requise');
      return false;
    }

    // Vérifier les PA
    if (state.actionPoints < 5) {
      console.log('❌ Exploration impossible: 5 PA requis');
      return false;
    }

    // Dépenser les PA
    state.spendActionPoints(5);

    // Utiliser directement le champ de vision actuel du joueur
    // avec filtrage des ressources selon le niveau d'exploration
    const newResourcesDiscovered = new Set(state.resourcesDiscovered);
    let resourcesFound = 0;
    let basicResourcesFound = 0;
    let magicalResourcesFound = 0;

    // Obtenir les données de carte du jeu pour vérifier les ressources
    const gameEngine = (window as any).gameEngine;
    
    state.currentVision.forEach(hexKey => {
      if (!state.resourcesDiscovered.has(hexKey)) {
        const [x, y] = hexKey.split(',').map(Number);
        const tileData = gameEngine?.getTileAt(x, y);
        
        if (tileData && tileData.resource) {
          // Vérifier directement si la ressource peut être révélée selon le niveau
          // Ressources de base : révélées niveau 1+
          // Ressources magiques : révélées niveau 3+
          // V2 : liste des ressources communes (révélées niveau 1+)
          const basicResources = ['food', 'wood', 'stone', 'coal', 'oil', 'leather_fur', 'common_metals', 'spices', 'rare_metals_alloys', 'textiles'];
          // V2 : liste des ressources magiques (révélées niveau 3+)
          const magicalResources = ['herbs', 'crystals', 'sacred_stones', 'ancient_artifacts', 'enchanted_wood', 'arcane_stones', 'elemental_essence', 'spirit_stones', 'void_shards', 'precious_stones', 'dragon_scales', 'phoenix_feathers'];
          
          let canReveal = false;
          if (basicResources.includes(tileData.resource) && explorationLevel >= 1) {
            canReveal = true;
            basicResourcesFound++;
          } else if (magicalResources.includes(tileData.resource) && explorationLevel >= 3) {
            canReveal = true;
            magicalResourcesFound++;
          }
          
          if (canReveal) {
            newResourcesDiscovered.add(hexKey);
            resourcesFound++;
          }
        } else {
          // Pas de ressource sur cette case, marquer comme explorée quand même
          newResourcesDiscovered.add(hexKey);
          resourcesFound++;
        }
      }
    });

    // Mettre à jour l'état
    set({ resourcesDiscovered: newResourcesDiscovered });

    // Log des résultats selon le niveau
    if (explorationLevel >= 3 && magicalResourcesFound > 0) {
      console.log(`🔮 Exploration niveau ${explorationLevel}: ${magicalResourcesFound} ressources magiques découvertes !`);
    }
    if (basicResourcesFound > 0) {
      console.log(`⚒️ Exploration niveau ${explorationLevel}: ${basicResourcesFound} ressources de base découvertes`);
    }

    // Gagner de l'expérience proportionnelle au nombre d'hexagones explorés
    const xpGained = Math.max(5, Math.floor(state.currentVision.size / 2));
    state.gainExperience(xpGained, 'Exploration');

    console.log(`🔍 Exploration niveau ${explorationLevel} terminée! ${resourcesFound} nouvelles zones explorées sur ${state.currentVision.size} hexagones de vision`);
    return true;
  },

  // Fonction de test pour maximiser les PA
  setMaxActionPointsForTesting: () => {
    set({ 
      actionPoints: 999,
      maxActionPoints: 999
    });
    console.log('Points d\'action mis au maximum pour les tests: 999/999');
  },

  // Propriété calculée pour le niveau d'exploration
  get explorationLevel() {
    return get().getCompetenceLevel('exploration');
  }
  };
});

// Risque 2 — Recalibration de la position joueur quand l'origine monde change
// avatarHexPosition est en coordonnées tableau (arrayX/arrayY).
// Quand un nouveau bloc est chargé, originWorldX/Y change → on recalcule
// arrayX = worldX - newOriginX, en utilisant l'ancienne origine pour retrouver worldX.
useMap.subscribe(
  (state) => ({ ox: state.originWorldX, oy: state.originWorldY }),
  ({ ox: newOx, oy: newOy }, { ox: prevOx, oy: prevOy }) => {
    if (newOx === prevOx && newOy === prevOy) return;

    const player = usePlayer.getState();
    const oldHexX = player.avatarHexPosition.x;
    const oldHexY = player.avatarHexPosition.y;

    // Reconstruire les coordonnées monde avec l'ancienne origine
    const worldX = oldHexX + prevOx;
    const worldY = oldHexY + prevOy;

    // Convertir dans le nouveau repère tableau
    const newHexX = worldX - newOx;
    const newHexY = worldY - newOy;

    usePlayer.setState({ avatarHexPosition: { x: newHexX, y: newHexY } });
    console.log(
      `[Player] Recalibration origine (${prevOx},${prevOy})→(${newOx},${newOy})` +
      ` | worldPos=(${worldX},${worldY}) | hex: (${oldHexX},${oldHexY})→(${newHexX},${newHexY})`
    );
  }
);

// ---------------------------------------------------------------------------
// Sauvegarde automatique centralisée — politique unique
// Un seul point de sauvegarde, déclenché par tout changement de progression.
// Le debounce 3s absorbe les cascades (level-up → XP reset → compétence, etc.)
// ---------------------------------------------------------------------------

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePlayerStateSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try {
      const auth = localStorage.getItem("nova_imperium_auth");
      if (!auth) return;
      const { level, experience, totalExperience, actionPoints, maxActionPoints, competencePoints, competences } =
        usePlayer.getState();
      savePlayerState({ level, experience, totalExperience, actionPoints, maxActionPoints, competencePoints, competences })
        .then(() => {
          console.log(`[PlayerState] Auto-save: level=${level} xp=${experience} ap=${actionPoints}`);
        })
        .catch(err => console.warn("[PlayerState] Échec auto-save:", err));
    } catch (err) {
      console.warn("[PlayerState] Erreur schedulePlayerStateSave:", err);
    }
  }, 3000);
}

let _prevProgressionState = {
  level: 0,
  experience: -1,
  totalExperience: -1,
  actionPoints: -1,
  maxActionPoints: -1,
  competencePoints: -1,
  competences: null as unknown,
};

usePlayer.subscribe((state) => {
  const changed =
    state.level !== _prevProgressionState.level ||
    state.experience !== _prevProgressionState.experience ||
    state.totalExperience !== _prevProgressionState.totalExperience ||
    state.actionPoints !== _prevProgressionState.actionPoints ||
    state.maxActionPoints !== _prevProgressionState.maxActionPoints ||
    state.competencePoints !== _prevProgressionState.competencePoints ||
    state.competences !== _prevProgressionState.competences;

  if (!changed) return;

  _prevProgressionState = {
    level: state.level,
    experience: state.experience,
    totalExperience: state.totalExperience,
    actionPoints: state.actionPoints,
    maxActionPoints: state.maxActionPoints,
    competencePoints: state.competencePoints,
    competences: state.competences,
  };

  schedulePlayerStateSave();
});