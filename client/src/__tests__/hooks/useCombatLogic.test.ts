import { renderHook } from '@testing-library/react';
import { useCombatLogic } from '../../hooks/business/useBusinessLogic';
import { GameProvider } from '../../contexts/GameContext';
import React from 'react';

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <GameProvider>{children}</GameProvider>
  );
};

describe('useCombatLogic', () => {
  const mockAttacker = {
    id: 'attacker1',
    attack: 40,
    level: 2,
    x: 0,
    y: 0,
    canAct: true
  };
  
  const mockDefender = {
    id: 'defender1',
    defense: 20,
    level: 1,
    health: 100
  };

  describe('calculateDamage', () => {
    it('devrait calculer les dégâts de base correctement', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      const damage = result.current.calculateDamage(mockAttacker, mockDefender);
      
      // Dégâts = (attaque + bonus niveau - défense) * facteur aléatoire
      // Base: (40 + 2 - 20) = 22, avec variance ±20%
      expect(damage).toBeGreaterThan(15); // 22 * 0.8 ≈ 18
      expect(damage).toBeLessThan(30);    // 22 * 1.2 ≈ 26
    });
    
    it('devrait retourner au moins 1 dégât', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      const weakAttacker = { ...mockAttacker, attack: 1 };
      const strongDefender = { ...mockDefender, defense: 50 };
      
      const damage = result.current.calculateDamage(weakAttacker, strongDefender);
      
      expect(damage).toBeGreaterThanOrEqual(1);
    });
    
    it('devrait retourner 0 si attaquant ou défenseur manquant', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      expect(result.current.calculateDamage(null, mockDefender)).toBe(0);
      expect(result.current.calculateDamage(mockAttacker, null)).toBe(0);
    });
  });

  describe('calculateHitChance', () => {
    it('devrait calculer la chance de toucher de base', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      const equalLevelAttacker = { ...mockAttacker, level: 1 };
      const hitChance = result.current.calculateHitChance(equalLevelAttacker, mockDefender);
      
      expect(hitChance).toBe(80); // Chance de base
    });
    
    it('devrait augmenter la chance avec un niveau supérieur', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      const hitChance = result.current.calculateHitChance(mockAttacker, mockDefender);
      
      // Attaquant niveau 2 vs défenseur niveau 1 = +5%
      expect(hitChance).toBe(85);
    });
    
    it('devrait limiter la chance entre 10% et 95%', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      const highLevelAttacker = { ...mockAttacker, level: 50 };
      const lowLevelDefender = { ...mockDefender, level: 1 };
      
      const highHitChance = result.current.calculateHitChance(highLevelAttacker, lowLevelDefender);
      expect(highHitChance).toBe(95);
      
      const lowLevelAttacker = { ...mockAttacker, level: 1 };
      const highLevelDefender = { ...mockDefender, level: 50 };
      
      const lowHitChance = result.current.calculateHitChance(lowLevelAttacker, highLevelDefender);
      expect(lowHitChance).toBe(10);
    });
  });

  describe('simulateCombat', () => {
    it('devrait simuler un combat complet', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      const combatResult = result.current.simulateCombat(mockAttacker, mockDefender);
      
      expect(combatResult).toHaveProperty('hit');
      expect(combatResult).toHaveProperty('damage');
      expect(combatResult).toHaveProperty('defenderHealthAfter');
      expect(combatResult).toHaveProperty('critical');
      
      expect(typeof combatResult.hit).toBe('boolean');
      expect(typeof combatResult.damage).toBe('number');
      expect(typeof combatResult.defenderHealthAfter).toBe('number');
      expect(typeof combatResult.critical).toBe('boolean');
    });
    
    it('devrait appliquer 0 dégât si l\'attaque rate', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      // Mock Math.random pour garantir un échec
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.99); // Toujours rater (>95%)
      
      const combatResult = result.current.simulateCombat(mockAttacker, mockDefender);
      
      expect(combatResult.hit).toBe(false);
      expect(combatResult.damage).toBe(0);
      expect(combatResult.defenderHealthAfter).toBe(mockDefender.health);
      
      Math.random = originalRandom;
    });
    
    it('devrait réduire la santé du défenseur si l\'attaque réussit', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCombatLogic(), { wrapper });
      
      // Mock Math.random pour garantir un succès
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.01); // Toujours réussir (<10%)
      
      const combatResult = result.current.simulateCombat(mockAttacker, mockDefender);
      
      expect(combatResult.hit).toBe(true);
      expect(combatResult.damage).toBeGreaterThan(0);
      expect(combatResult.defenderHealthAfter).toBeLessThan(mockDefender.health);
      expect(combatResult.defenderHealthAfter).toBeGreaterThanOrEqual(0);
      
      Math.random = originalRandom;
    });
  });
});