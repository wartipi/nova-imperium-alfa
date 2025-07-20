/**
 * Tests unitaires pour le hook useGameState
 * Vérifie la logique de gestion de l'état du jeu
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../lib/stores/useGameState';

// Mock pour les dépendances externes
jest.mock('../../lib/stores/usePlayer', () => ({
  usePlayer: {
    getState: jest.fn(() => ({
      gainExperience: jest.fn(),
      incrementActionPoints: jest.fn()
    }))
  }
}));

describe('useGameState', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    useGameState.setState({
      gamePhase: 'loading',
      currentTurn: 1,
      isGameMaster: false
    });
  });

  describe('initializeGame', () => {
    it('devrait initialiser le jeu correctement', () => {
      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.initializeGame();
      });

      expect(result.current.gamePhase).toBe('jeu');
      expect(result.current.currentTurn).toBe(1);
    });
  });

  describe('endTurn', () => {
    it('devrait incrémenter le numéro de tour', () => {
      const { result } = renderHook(() => useGameState());
      
      // Initialiser le jeu d'abord
      act(() => {
        result.current.initializeGame();
      });

      const initialTurn = result.current.currentTurn;
      
      act(() => {
        result.current.endTurn();
      });

      expect(result.current.currentTurn).toBe(initialTurn + 1);
    });

    it('devrait accorder de l\'expérience et des points d\'action en fin de tour', () => {
      const mockGainExperience = jest.fn();
      const mockIncrementActionPoints = jest.fn();
      
      // Mock du store player
      require('../../lib/stores/usePlayer').usePlayer.getState.mockReturnValue({
        gainExperience: mockGainExperience,
        incrementActionPoints: mockIncrementActionPoints
      });

      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.initializeGame();
        result.current.endTurn();
      });

      expect(mockGainExperience).toHaveBeenCalledWith(10);
      expect(mockIncrementActionPoints).toHaveBeenCalledWith(5);
    });
  });

  describe('toggleGameMaster', () => {
    it('devrait basculer le mode Maître de Jeu', () => {
      const { result } = renderHook(() => useGameState());
      
      expect(result.current.isGameMaster).toBe(false);
      
      act(() => {
        result.current.toggleGameMaster();
      });

      expect(result.current.isGameMaster).toBe(true);
      
      act(() => {
        result.current.toggleGameMaster();
      });

      expect(result.current.isGameMaster).toBe(false);
    });
  });

  describe('setGamePhase', () => {
    it('devrait mettre à jour la phase du jeu', () => {
      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.setGamePhase('menu');
      });

      expect(result.current.gamePhase).toBe('menu');
      
      act(() => {
        result.current.setGamePhase('pause');
      });

      expect(result.current.gamePhase).toBe('pause');
    });
  });

  describe('état initial', () => {
    it('devrait avoir les bonnes valeurs par défaut', () => {
      const { result } = renderHook(() => useGameState());
      
      expect(result.current.gamePhase).toBe('loading');
      expect(result.current.currentTurn).toBe(1);
      expect(result.current.isGameMaster).toBe(false);
      expect(typeof result.current.initializeGame).toBe('function');
      expect(typeof result.current.endTurn).toBe('function');
      expect(typeof result.current.toggleGameMaster).toBe('function');
    });
  });

  describe('intégration des actions', () => {
    it('devrait maintenir la cohérence lors de multiples actions', () => {
      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.initializeGame();
        result.current.toggleGameMaster();
        result.current.endTurn();
        result.current.endTurn();
      });

      expect(result.current.gamePhase).toBe('jeu');
      expect(result.current.isGameMaster).toBe(true);
      expect(result.current.currentTurn).toBe(3);
    });
  });
});