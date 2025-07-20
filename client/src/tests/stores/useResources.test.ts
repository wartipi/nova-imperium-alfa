import { renderHook, act } from '@testing-library/react';
import { useResources, type Resources } from '../../lib/stores/useResources';

describe('useResources Store', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    const initialResources: Resources = {
      food: 40,
      action_points: 25,
      gold: 80,
      iron: 5,
      stone: 10,
      wood: 15,
      precious_metals: 8,
      mana: 20,
      crystals: 3,
      ancient_knowledge: 5,
      herbs: 0,
      fish: 0,
      copper: 0,
      silver: 0,
      gems: 0
    };
    
    useResources.setState({
      resources: initialResources,
      productionHistory: [],
      resourceCaps: {
        food: 200,
        action_points: 100,
        gold: 1000,
        iron: 100,
        stone: 200,
        wood: 150,
        precious_metals: 50,
        mana: 100,
        crystals: 20,
        ancient_knowledge: 50
      }
    });
  });

  describe('état initial', () => {
    it('devrait avoir les bonnes valeurs par défaut', () => {
      const { result } = renderHook(() => useResources());
      
      expect(result.current.resources.food).toBe(40);
      expect(result.current.resources.gold).toBe(80);
      expect(result.current.resources.action_points).toBe(25);
      expect(result.current.resources.mana).toBe(20);
    });
  });

  describe('ajout de ressources', () => {
    it('devrait ajouter des ressources correctement', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        const success = result.current.addResource('gold', 50, 'test');
        expect(success).toBe(true);
      });

      expect(result.current.resources.gold).toBe(130);
    });

    it('devrait respecter les limites de stockage', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        const success = result.current.addResource('food', 200); // Dépasse la limite
        expect(success).toBe(true); // Devrait ajouter jusqu'à la limite
      });

      expect(result.current.resources.food).toBe(200); // Cap atteint
    });

    it('devrait enregistrer l\'historique de production', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        result.current.addResource('gold', 25, 'mine');
      });

      expect(result.current.productionHistory).toHaveLength(1);
      expect(result.current.productionHistory[0]).toEqual({
        resourceType: 'gold',
        amount: 25,
        source: 'mine'
      });
    });
  });

  describe('dépense de ressources', () => {
    it('devrait dépenser des ressources si disponibles', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        const success = result.current.spendResources({ gold: 30, wood: 10 });
        expect(success).toBe(true);
      });

      expect(result.current.resources.gold).toBe(50);
      expect(result.current.resources.wood).toBe(5);
    });

    it('ne devrait pas dépenser si ressources insuffisantes', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        const success = result.current.spendResources({ gold: 100 }); // Plus que disponible
        expect(success).toBe(false);
      });

      expect(result.current.resources.gold).toBe(80); // Inchangé
    });
  });

  describe('vérification des ressources', () => {
    it('devrait vérifier la disponibilité des ressources', () => {
      const { result } = renderHook(() => useResources());
      
      expect(result.current.hasResources({ gold: 50, wood: 10 })).toBe(true);
      expect(result.current.hasResources({ gold: 100 })).toBe(false);
    });
  });

  describe('gestion des limites', () => {
    it('devrait définir et utiliser les limites de ressources', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        result.current.setResourceCap('gold', 500);
      });

      expect(result.current.resourceCaps.gold).toBe(500);
      expect(result.current.getAvailableSpace('gold')).toBe(420); // 500 - 80 actuel
    });
  });

  describe('production automatique', () => {
    it('devrait traiter la production de base', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        result.current.processProduction();
      });

      expect(result.current.resources.action_points).toBe(35); // +10 de base
    });
  });

  describe('état des ressources', () => {
    it('devrait calculer l\'état des ressources correctement', () => {
      const { result } = renderHook(() => useResources());
      
      const status = result.current.getResourcesStatus();
      
      expect(status.gold).toBe('sufficient'); // 80/1000 = 8% = sufficient
      expect(status.food).toBe('scarce'); // 40/200 = 20% = scarce
    });
  });

  describe('suppression de ressources', () => {
    it('devrait supprimer des ressources si disponibles', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        const success = result.current.removeResource('gold', 30);
        expect(success).toBe(true);
      });

      expect(result.current.resources.gold).toBe(50);
    });

    it('ne devrait pas supprimer plus que disponible', () => {
      const { result } = renderHook(() => useResources());
      
      act(() => {
        const success = result.current.removeResource('gold', 100);
        expect(success).toBe(false);
      });

      expect(result.current.resources.gold).toBe(80); // Inchangé
    });
  });
});