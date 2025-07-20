import { TurnEffectsSystem } from '../../systems/TurnEffectsSystem';

// Mock des stores pour les tests
const mockGameManager = {
  currentTurn: 1,
  currentPlayerId: 'player1',
  playerOrder: ['player1', 'player2'],
  addGameEvent: jest.fn(),
} as any;

const mockResources = {
  addResource: jest.fn().mockReturnValue(true),
  removeResource: jest.fn().mockReturnValue(true),
} as any;

const mockMapState = {
  exploredTiles: new Set(['0,0', '1,0', '0,1']),
  getNeighborTiles: jest.fn().mockReturnValue([]),
  exploreTile: jest.fn(),
} as any;

const mockUnits = {
  calculateMaintenanceCost: jest.fn().mockReturnValue({ food: 10, gold: 5 }),
  getUnitsForPlayer: jest.fn().mockReturnValue([]),
} as any;

const mockBuildings = {
  processProduction: jest.fn().mockReturnValue({ food: 20, gold: 15 }),
  processConstructionQueue: jest.fn(),
  getConstructionQueue: jest.fn().mockReturnValue([]),
} as any;

describe('TurnEffectsSystem', () => {
  let effectsSystem: TurnEffectsSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    effectsSystem = new TurnEffectsSystem(
      mockGameManager,
      mockResources,
      mockMapState,
      mockUnits,
      mockBuildings
    );
  });

  describe('initialization', () => {
    it('devrait initialiser avec les effets par défaut', () => {
      const registeredEffects = effectsSystem.getRegisteredEffects();
      
      expect(registeredEffects.length).toBeGreaterThan(0);
      expect(registeredEffects.some(e => e.id === 'building_resource_production')).toBe(true);
      expect(registeredEffects.some(e => e.id === 'action_points_regeneration')).toBe(true);
      expect(registeredEffects.some(e => e.id === 'unit_maintenance')).toBe(true);
    });
    
    it('devrait trier les effets par priorité', () => {
      const registeredEffects = effectsSystem.getRegisteredEffects();
      
      for (let i = 1; i < registeredEffects.length; i++) {
        expect(registeredEffects[i].priority).toBeGreaterThanOrEqual(
          registeredEffects[i - 1].priority
        );
      }
    });
  });

  describe('registerEffect', () => {
    it('devrait enregistrer un nouvel effet', () => {
      const newEffect = {
        id: 'test_effect',
        type: 'resource_production' as const,
        description: 'Test effect',
        priority: 10,
        execute: jest.fn().mockReturnValue({ success: true })
      };

      effectsSystem.registerEffect(newEffect);
      const effects = effectsSystem.getRegisteredEffects();
      
      expect(effects.some(e => e.id === 'test_effect')).toBe(true);
    });
    
    it('devrait maintenir l\'ordre de priorité après ajout', () => {
      const highPriorityEffect = {
        id: 'high_priority',
        type: 'resource_production' as const,
        description: 'High priority effect',
        priority: 0,
        execute: jest.fn().mockReturnValue({ success: true })
      };

      effectsSystem.registerEffect(highPriorityEffect);
      const effects = effectsSystem.getRegisteredEffects();
      
      expect(effects[0].id).toBe('high_priority');
    });
  });

  describe('removeEffect', () => {
    it('devrait supprimer un effet existant', () => {
      effectsSystem.removeEffect('building_resource_production');
      const effects = effectsSystem.getRegisteredEffects();
      
      expect(effects.some(e => e.id === 'building_resource_production')).toBe(false);
    });
  });

  describe('resoudreEffets', () => {
    it('devrait exécuter tous les effets applicables', async () => {
      const results = await effectsSystem.resoudreEffets();
      
      expect(results.length).toBeGreaterThan(0);
      expect(mockGameManager.addGameEvent).toHaveBeenCalled();
    });
    
    it('devrait filtrer les effets par joueur', async () => {
      const playerSpecificEffect = {
        id: 'player_specific',
        type: 'resource_production' as const,
        description: 'Player specific effect',
        priority: 999,
        playerId: 'player2',
        execute: jest.fn().mockReturnValue({ success: true })
      };

      effectsSystem.registerEffect(playerSpecificEffect);
      
      const results = await effectsSystem.resoudreEffets('player1');
      
      expect(playerSpecificEffect.execute).not.toHaveBeenCalled();
    });
    
    it('devrait respecter les conditions d\'exécution', async () => {
      const conditionalEffect = {
        id: 'conditional',
        type: 'resource_production' as const,
        description: 'Conditional effect',
        priority: 999,
        execute: jest.fn().mockReturnValue({ success: true }),
        condition: jest.fn().mockReturnValue(false)
      };

      effectsSystem.registerEffect(conditionalEffect);
      
      await effectsSystem.resoudreEffets();
      
      expect(conditionalEffect.execute).not.toHaveBeenCalled();
      expect(conditionalEffect.condition).toHaveBeenCalled();
    });
    
    it('devrait gérer les erreurs d\'exécution', async () => {
      const faultyEffect = {
        id: 'faulty',
        type: 'resource_production' as const,
        description: 'Faulty effect',
        priority: 999,
        execute: jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        })
      };

      effectsSystem.registerEffect(faultyEffect);
      
      const results = await effectsSystem.resoudreEffets();
      const faultyResult = results.find(r => !r.success);
      
      expect(faultyResult).toBeDefined();
      expect(faultyResult?.message).toContain('Erreur lors de l\'exécution');
    });
  });

  describe('execution history', () => {
    it('devrait enregistrer l\'historique d\'exécution', async () => {
      await effectsSystem.resoudreEffets();
      
      const history = effectsSystem.getExecutionHistory();
      
      expect(history.length).toBe(1);
      expect(history[0].turn).toBe(1);
      expect(history[0].effects.length).toBeGreaterThan(0);
    });
    
    it('devrait limiter l\'historique à 50 tours', async () => {
      // Simuler 60 tours
      for (let i = 0; i < 60; i++) {
        mockGameManager.currentTurn = i + 1;
        await effectsSystem.resoudreEffets();
      }
      
      const history = effectsSystem.getExecutionHistory();
      
      expect(history.length).toBe(50);
      expect(history[0].turn).toBe(11); // Les 10 premiers tours ont été supprimés
    });
  });

  describe('specific effects', () => {
    beforeEach(async () => {
      // Exécuter les effets pour tester les implémentations spécifiques
      await effectsSystem.resoudreEffets();
    });

    it('devrait traiter la production des bâtiments', () => {
      expect(mockBuildings.processProduction).toHaveBeenCalled();
      expect(mockResources.addResource).toHaveBeenCalledWith('food', 20, 'building_production');
      expect(mockResources.addResource).toHaveBeenCalledWith('gold', 15, 'building_production');
    });

    it('devrait régénérer les points d\'action', () => {
      expect(mockResources.addResource).toHaveBeenCalledWith('action_points', 10, 'turn_regeneration');
    });

    it('devrait traiter la maintenance des unités', () => {
      expect(mockUnits.calculateMaintenanceCost).toHaveBeenCalled();
      expect(mockResources.removeResource).toHaveBeenCalledWith('food', 10);
      expect(mockResources.removeResource).toHaveBeenCalledWith('gold', 5);
    });

    it('devrait traiter la progression des constructions', () => {
      expect(mockBuildings.processConstructionQueue).toHaveBeenCalled();
    });
  });
});