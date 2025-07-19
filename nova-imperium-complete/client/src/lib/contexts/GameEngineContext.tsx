import { createContext, useContext, ReactNode, useRef, MutableRefObject } from "react";
import { GameEngine } from "../game/GameEngine";

interface GameEngineContextType {
  gameEngineRef: MutableRefObject<GameEngine | null>;
}

const GameEngineContext = createContext<GameEngineContextType | undefined>(undefined);

export function GameEngineProvider({ children }: { children: ReactNode }) {
  const gameEngineRef = useRef<GameEngine | null>(null);

  return (
    <GameEngineContext.Provider value={{ gameEngineRef }}>
      {children}
    </GameEngineContext.Provider>
  );
}

export function useGameEngine() {
  const context = useContext(GameEngineContext);
  if (context === undefined) {
    throw new Error('useGameEngine must be used within a GameEngineProvider');
  }
  return context;
}