import { renderHook, act } from '@testing-library/react';
import { useGameManager } from '../../lib/stores/useGameManager';

describe('useGameManager Store', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    useGameManager.setState({
      isInitialized: false,
      gamePhase: 'setup',
      currentTurn: 0,
      currentPlayerId: '',
      playerOrder: [],
      turnPhase: 'planning',
      gameEvents: [],
      turnHistory: [],
      lastUpdateTimestamp: Date.now(),
      updateFrequency: 100,
      debugMode: false
    } as any);
  });

  describe('état initial', () => {
    it('devrait avoir les bonnes valeurs par défaut', () => {
      const { result } = renderHook(() => useGameManager());
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.gamePhase).toBe('setup');
      expect(result.current.currentTurn).toBe(0);
      expect(result.current.currentPlayerId).toBe('');
      expect(result.current.turnPhase).toBe('planning');
    });
  });

  describe('initialisation du jeu', () => {
    it('devrait initialiser le jeu correctement', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1', 'player2']);
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.gamePhase).toBe('playing');
      expect(result.current.currentTurn).toBe(1);
      expect(result.current.currentPlayerId).toBe('player1');
      expect(result.current.playerOrder).toEqual(['player1', 'player2']);
    });

    it('devrait ajouter un événement de début de partie', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1', 'player2']);
      });

      expect(result.current.gameEvents).toHaveLength(1);
      expect(result.current.gameEvents[0].type).toBe('game_start');
      expect(result.current.gameEvents[0].playerId).toBe('system');
    });
  });

  describe('gestion des tours', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useGameManager());
      act(() => {
        result.current.initializeGame(['player1', 'player2']);
      });
    });

    it('devrait démarrer un tour correctement', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.startTurn('player1');
      });

      expect(result.current.currentPlayerId).toBe('player1');
      expect(result.current.turnPhase).toBe('planning');
      expect(result.current.turnHistory).toHaveLength(1);
    });

    it('devrait passer au joueur suivant', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.nextPlayer();
      });

      expect(result.current.currentPlayerId).toBe('player2');
    });

    it('devrait augmenter le numéro de tour après un cycle complet', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.nextPlayer(); // player2
        result.current.nextPlayer(); // retour à player1, tour++
      });

      expect(result.current.currentTurn).toBe(2);
      expect(result.current.currentPlayerId).toBe('player1');
    });
  });

  describe('gestion des événements', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useGameManager());
      act(() => {
        result.current.initializeGame(['player1']);
      });
    });

    it('devrait ajouter des événements correctement', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.addGameEvent({
          type: 'test_event',
          description: 'Événement de test',
          playerId: 'player1',
          data: { value: 42 }
        });
      });

      expect(result.current.gameEvents).toHaveLength(2); // +1 car game_start déjà présent
      const lastEvent = result.current.gameEvents[result.current.gameEvents.length - 1];
      expect(lastEvent.type).toBe('test_event');
      expect(lastEvent.turn).toBe(1);
    });

    it('devrait filtrer les événements par joueur', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.addGameEvent({
          type: 'player1_event',
          description: 'Événement joueur 1',
          playerId: 'player1',
          data: {}
        });
        result.current.addGameEvent({
          type: 'player2_event',
          description: 'Événement joueur 2',
          playerId: 'player2',
          data: {}
        });
      });

      const player1Events = result.current.getEventsForPlayer('player1');
      expect(player1Events).toHaveLength(2); // game_start + player1_event
      
      const player2Events = result.current.getEventsForPlayer('player2');
      expect(player2Events).toHaveLength(1); // seulement player2_event
    });
  });

  describe('validation de l\'état du jeu', () => {
    it('devrait valider un état correct', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1']);
      });

      expect(result.current.validateGameState()).toBe(true);
    });

    it('devrait invalider un état incorrect', () => {
      const { result } = renderHook(() => useGameManager());
      
      // État non initialisé
      expect(result.current.validateGameState()).toBe(false);
    });
  });

  describe('sauvegarde et chargement', () => {
    it('devrait sauvegarder l\'état du jeu', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1']);
      });

      const saveData = result.current.saveGameState();
      expect(saveData).toBeTruthy();
      expect(typeof saveData).toBe('string');
      
      // Vérifier que les données sont en JSON valide
      const parsed = JSON.parse(saveData);
      expect(parsed.gameManager.currentTurn).toBe(1);
      expect(parsed.gameManager.currentPlayerId).toBe('player1');
    });

    it('devrait charger l\'état du jeu', () => {
      const { result } = renderHook(() => useGameManager());
      
      // Créer des données de sauvegarde simulées
      const mockSaveData = JSON.stringify({
        gameManager: {
          currentTurn: 5,
          currentPlayerId: 'player2',
          playerOrder: ['player1', 'player2'],
          gamePhase: 'playing',
          turnPhase: 'action',
          gameEvents: []
        },
        resources: {},
        mapData: '{}',
        units: [],
        buildings: [],
        timestamp: Date.now()
      });

      act(() => {
        const success = result.current.loadGameState(mockSaveData);
        expect(success).toBe(true);
      });

      expect(result.current.currentTurn).toBe(5);
      expect(result.current.currentPlayerId).toBe('player2');
      expect(result.current.gamePhase).toBe('playing');
      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('mode debug', () => {
    it('devrait basculer le mode debug', () => {
      const { result } = renderHook(() => useGameManager());
      
      expect(result.current.debugMode).toBe(false);
      
      act(() => {
        result.current.toggleDebugMode();
      });

      expect(result.current.debugMode).toBe(true);
    });

    it('devrait exporter les données de debug', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1']);
      });

      const debugData = result.current.exportGameData();
      expect(debugData).toBeTruthy();
      
      const parsed = JSON.parse(debugData);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.gameManager).toBeDefined();
      expect(parsed.statistics).toBeDefined();
    });
  });

  describe('statistiques du jeu', () => {
    it('devrait calculer les statistiques correctement', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1', 'player2']);
        result.current.addGameEvent({
          type: 'test',
          description: 'Test',
          playerId: 'player1',
          data: {}
        });
      });

      const stats = result.current.getGameStatistics();
      
      expect(stats.totalTurns).toBe(1);
      expect(stats.totalEvents).toBe(2); // game_start + test event
      expect(stats.playersActive).toBe(2);
      expect(typeof stats.averageTurnDuration).toBe('number');
    });
  });

  describe('pause et reprise', () => {
    it('devrait mettre en pause et reprendre le jeu', () => {
      const { result } = renderHook(() => useGameManager());
      
      act(() => {
        result.current.initializeGame(['player1']);
        result.current.pauseGame();
      });

      expect(result.current.gamePhase).toBe('paused');
      
      act(() => {
        result.current.resumeGame();
      });

      expect(result.current.gamePhase).toBe('playing');
    });
  });
});