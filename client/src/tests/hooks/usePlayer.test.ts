/**
 * Tests unitaires pour le hook usePlayer
 * Vérifie la gestion des ressources, de l'expérience et du niveau
 */

import { renderHook, act } from '@testing-library/react';
import { usePlayer } from '../../lib/stores/usePlayer';

describe('usePlayer', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    usePlayer.setState({
      level: 1,
      experience: 0,
      totalExperience: 0,
      actionPoints: 10,
      maxActionPoints: 10,
      competencePoints: 0
    });
  });

  describe('gainExperience', () => {
    it('devrait ajouter de l\'expérience correctement', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.gainExperience(50);
      });

      expect(result.current.experience).toBe(50);
      expect(result.current.totalExperience).toBe(50);
    });

    it('devrait déclencher une montée de niveau quand suffisamment d\'expérience', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.gainExperience(1000); // Plus que nécessaire pour passer niveau 2
      });

      expect(result.current.level).toBe(2);
      expect(result.current.competencePoints).toBe(1); // 1 point de compétence par niveau
    });

    it('devrait calculer correctement l\'expérience restante pour le prochain niveau', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.gainExperience(150); // Assez pour niveau 2, mais pas niveau 3
      });

      const progress = result.current.getExperienceProgress();
      expect(progress.niveau).toBe(2);
      expect(progress.expérienceActuelle).toBeGreaterThan(0);
      expect(progress.expérienceRequise).toBeGreaterThan(progress.expérienceActuelle);
    });
  });

  describe('incrementActionPoints', () => {
    it('devrait ajouter des points d\'action sans dépasser le maximum', () => {
      const { result } = renderHook(() => usePlayer());
      
      // Dépenser quelques points d'action d'abord
      act(() => {
        result.current.spendActionPoints(5);
      });

      expect(result.current.actionPoints).toBe(5);
      
      act(() => {
        result.current.incrementActionPoints(3);
      });

      expect(result.current.actionPoints).toBe(8);
      
      // Essayer d'ajouter plus que le maximum
      act(() => {
        result.current.incrementActionPoints(10);
      });

      expect(result.current.actionPoints).toBe(10); // Ne dépasse pas le max
    });
  });

  describe('spendActionPoints', () => {
    it('devrait déduire les points d\'action correctement', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.spendActionPoints(3);
      });

      expect(result.current.actionPoints).toBe(7);
    });

    it('ne devrait pas permettre de dépenser plus de points que disponible', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.spendActionPoints(15); // Plus que le maximum
      });

      expect(result.current.actionPoints).toBe(0); // Reste à 0, ne devient pas négatif
    });

    it('devrait retourner true si assez de points, false sinon', () => {
      const { result } = renderHook(() => usePlayer());
      
      let canSpend = false;
      
      act(() => {
        canSpend = result.current.spendActionPoints(5);
      });

      expect(canSpend).toBe(true);
      expect(result.current.actionPoints).toBe(5);
      
      act(() => {
        canSpend = result.current.spendActionPoints(10); // Plus que disponible
      });

      expect(canSpend).toBe(false);
      expect(result.current.actionPoints).toBe(5); // Inchangé
    });
  });

  describe('moveAvatarToHex', () => {
    it('devrait mettre à jour la position de l\'avatar', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.moveAvatarToHex(10, 15);
      });

      expect(result.current.avatarPosition.x).toBe(10);
      expect(result.current.avatarPosition.y).toBe(15);
    });

    it('devrait coûter des points d\'action selon la distance', () => {
      const { result } = renderHook(() => usePlayer());
      
      const initialActionPoints = result.current.actionPoints;
      
      act(() => {
        result.current.moveAvatarToHex(5, 5); // Déplacement coûteux
      });

      expect(result.current.actionPoints).toBeLessThan(initialActionPoints);
    });
  });

  describe('ressources management', () => {
    it('devrait initialiser les ressources avec des valeurs par défaut', () => {
      const { result } = renderHook(() => usePlayer());
      
      expect(result.current.resources).toBeDefined();
      expect(result.current.resources.food).toBeGreaterThanOrEqual(0);
      expect(result.current.resources.gold).toBeGreaterThanOrEqual(0);
      expect(result.current.resources.mana).toBeGreaterThanOrEqual(0);
    });
  });

  describe('vision system', () => {
    it('devrait correctement déterminer la visibilité des hexagones', () => {
      const { result } = renderHook(() => usePlayer());
      
      act(() => {
        result.current.moveAvatarToHex(0, 0);
      });

      // Un hexagone adjacent devrait être visible
      expect(result.current.isHexVisible(0, 1)).toBe(true);
      expect(result.current.isHexVisible(1, 0)).toBe(true);
      
      // Un hexagone éloigné ne devrait pas être visible
      expect(result.current.isHexVisible(10, 10)).toBe(false);
    });
  });
});