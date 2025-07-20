import { useCallback } from 'react';
import { useCentralizedGameState } from '../stores/useCentralizedGameState';
import { usePlayer } from '../stores/usePlayer';

/**
 * Hook personnalisé pour gérer toute la logique liée aux ressources
 * Centralise la gestion des ressources (ajout, retrait, mise à jour des états)
 */
export function useRessources() {
  const { globalResources, updateResources, calculateResourceProduction, applyResourceProduction } = useCentralizedGameState();
  const { actionPoints, maxActionPoints, spendActionPoints, addActionPoints } = usePlayer();

  // Récupérer les ressources actuelles
  const getCurrentResources = useCallback(() => {
    return {
      ...globalResources,
      actionPoints,
      maxActionPoints
    };
  }, [globalResources, actionPoints, maxActionPoints]);

  // Ajouter des ressources
  const addResources = useCallback((resources: Partial<typeof globalResources>) => {
    updateResources(resources);
  }, [updateResources]);

  // Dépenser des ressources avec validation
  const spendResources = useCallback((cost: Partial<typeof globalResources & { action_points?: number }>) => {
    const current = getCurrentResources();
    
    // Vérifier si on a assez de ressources
    for (const [key, value] of Object.entries(cost)) {
      if (key === 'action_points') {
        if (actionPoints < (value as number)) {
          return false;
        }
      } else {
        const currentValue = (current as any)[key] || 0;
        if (currentValue < (value as number)) {
          return false;
        }
      }
    }

    // Déduire les ressources
    const deductions: Partial<typeof globalResources> = {};
    for (const [key, value] of Object.entries(cost)) {
      if (key === 'action_points') {
        spendActionPoints(value as number);
      } else {
        (deductions as any)[key] = -(value as number);
      }
    }
    
    if (Object.keys(deductions).length > 0) {
      updateResources(deductions);
    }
    
    return true;
  }, [getCurrentResources, actionPoints, spendActionPoints, updateResources]);

  // Calculer la production de ressources
  const getResourceProduction = useCallback(() => {
    return calculateResourceProduction();
  }, [calculateResourceProduction]);

  // Appliquer la production de ressources
  const applyProduction = useCallback(() => {
    applyResourceProduction();
  }, [applyResourceProduction]);

  // Vérifier si on peut se permettre un coût
  const canAfford = useCallback((cost: Partial<typeof globalResources & { action_points?: number }>) => {
    const current = getCurrentResources();
    
    for (const [key, value] of Object.entries(cost)) {
      if (key === 'action_points') {
        if (actionPoints < (value as number)) {
          return false;
        }
      } else {
        const currentValue = (current as any)[key] || 0;
        if (currentValue < (value as number)) {
          return false;
        }
      }
    }
    
    return true;
  }, [getCurrentResources, actionPoints]);

  // Obtenir le statut détaillé des ressources
  const getResourceStatus = useCallback(() => {
    const current = getCurrentResources();
    const production = getResourceProduction();
    
    return {
      current,
      production,
      hasPositiveIncome: Object.values(production).some(value => value > 0),
      isResourcePoor: Object.values(current).every(value => value < 10),
      criticalResources: Object.entries(current).filter(([_, value]) => value < 5).map(([key]) => key)
    };
  }, [getCurrentResources, getResourceProduction]);

  return {
    // État des ressources
    resources: getCurrentResources(),
    resourceProduction: getResourceProduction(),
    resourceStatus: getResourceStatus(),
    
    // Actions sur les ressources
    addResources,
    spendResources,
    canAfford,
    applyProduction,
    
    // Utilitaires
    getCurrentResources,
    getResourceStatus
  };
}

export default useRessources;