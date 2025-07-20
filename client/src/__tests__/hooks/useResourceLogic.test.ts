/**
 * Tests Unitaires pour la Logique Métier - Nova Imperium
 * Étape 4: Ajouter des Tests Unitaires Simples
 */

import { renderHook } from '@testing-library/react';
import { useResourceLogic } from '../../hooks/business/useBusinessLogic';
import { GameProvider } from '../../contexts/GameContext';
import React from 'react';

// Wrapper pour les tests qui ont besoin du contexte
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <GameProvider>{children}</GameProvider>
  );
};

describe('useResourceLogic', () => {
  describe('calculateBuildingCost', () => {
    it('devrait calculer le coût de base d\'un bâtiment', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      const houseCost = result.current.calculateBuildingCost('house');
      
      expect(houseCost).toEqual({
        wood: 50,
        stone: 30
      });
    });
    
    it('devrait augmenter le coût avec le niveau', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      const level1Cost = result.current.calculateBuildingCost('house', 1);
      const level2Cost = result.current.calculateBuildingCost('house', 2);
      
      expect(level2Cost.wood).toBeGreaterThan(level1Cost.wood);
      expect(level2Cost.stone).toBeGreaterThan(level1Cost.stone);
    });
    
    it('devrait retourner un objet vide pour un type inconnu', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      const unknownCost = result.current.calculateBuildingCost('unknown_building');
      
      expect(unknownCost).toEqual({});
    });
  });

  describe('calculateUnitCost', () => {
    it('devrait calculer le coût d\'une unité scout', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      const scoutCost = result.current.calculateUnitCost('scout');
      
      expect(scoutCost).toEqual({
        food: 30,
        gold: 50
      });
    });
    
    it('devrait calculer le coût d\'une unité mage', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      const mageCost = result.current.calculateUnitCost('mage');
      
      expect(mageCost).toEqual({
        food: 40,
        gold: 120,
        mana: 30
      });
    });
    
    it('devrait retourner un objet vide pour un type d\'unité inconnu', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      const unknownCost = result.current.calculateUnitCost('unknown_unit');
      
      expect(unknownCost).toEqual({});
    });
  });

  describe('calculateOptimalProduction', () => {
    it('devrait recommander une ferme quand la nourriture est faible', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      // Mock des ressources faibles en nourriture
      jest.spyOn(result.current, 'resources', 'get').mockReturnValue({
        food: 20, // Faible
        gold: 200,
        action_points: 50
      });
      
      const recommendations = result.current.calculateOptimalProduction();
      
      const farmRecommendation = recommendations.find(r => r.target === 'farm');
      expect(farmRecommendation).toBeDefined();
      expect(farmRecommendation?.priority).toBe('high');
    });
    
    it('devrait recommander un marché quand l\'or est faible', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      // Mock des ressources faibles en or
      jest.spyOn(result.current, 'resources', 'get').mockReturnValue({
        food: 100,
        gold: 50, // Faible
        action_points: 50
      });
      
      const recommendations = result.current.calculateOptimalProduction();
      
      const marketRecommendation = recommendations.find(r => r.target === 'market');
      expect(marketRecommendation).toBeDefined();
      expect(marketRecommendation?.priority).toBe('medium');
    });
    
    it('devrait recommander d\'attendre quand les PA sont faibles', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useResourceLogic(), { wrapper });
      
      // Mock des ressources faibles en PA
      jest.spyOn(result.current, 'resources', 'get').mockReturnValue({
        food: 100,
        gold: 200,
        action_points: 5 // Faible
      });
      
      const recommendations = result.current.calculateOptimalProduction();
      
      const waitRecommendation = recommendations.find(r => r.type === 'wait');
      expect(waitRecommendation).toBeDefined();
      expect(waitRecommendation?.priority).toBe('low');
    });
  });
});