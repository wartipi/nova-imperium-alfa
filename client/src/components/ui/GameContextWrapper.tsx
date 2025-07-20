/**
 * Wrapper pour intégrer le nouveau GameContext dans l'application existante
 * Permet une transition en douceur vers la nouvelle architecture
 */

import React from 'react';
import { GameProvider } from '../../contexts/GameContext';

interface GameContextWrapperProps {
  children: React.ReactNode;
}

export const GameContextWrapper: React.FC<GameContextWrapperProps> = ({ children }) => {
  return (
    <GameProvider>
      {children}
    </GameProvider>
  );
};

// Hook pour migration progressive - utilise les nouveaux stores si disponibles
export const useGameContextOrFallback = () => {
  try {
    const { useGameContext } = await import('../../contexts/GameContext');
    return useGameContext();
  } catch {
    // Fallback vers les anciens hooks si le contexte n'est pas disponible
    console.warn('GameContext not available, using fallback hooks');
    return null;
  }
};