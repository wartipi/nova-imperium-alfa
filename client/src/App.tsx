import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameCanvas } from "./components/game/GameCanvas";
import { MedievalHUD } from "./components/game/MedievalHUD";
import { LoginModal } from "./components/auth/LoginModal";
import { AuthProvider, useAuth } from "./lib/auth/AuthContext";
import { useGameState } from "./lib/stores/useGameState";
import { useMap } from "./lib/stores/useMap";
import { useNovaImperium } from "./lib/stores/useNovaImperium";
import { useAudio } from "./lib/stores/useAudio";
import { usePlayer } from "./lib/stores/usePlayer";
import { GameEngineProvider } from "./lib/contexts/GameEngineContext";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

function GameApp() {
  const { isAuthenticated, login } = useAuth();
  const { initializeGame, gamePhase } = useGameState();
  const { generateMap, mapData } = useMap();
  const { initializeNovaImperiums } = useNovaImperium();
  const { setBackgroundMusic } = useAudio();

  useEffect(() => {
    // Initialize background music
    const audio = new Audio("/sounds/background.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    setBackgroundMusic(audio);

    // Initialize massive game world
    generateMap(2500, 750); // Generate 2500x750 hex map
    initializeNovaImperiums();
    initializeGame();
    
    // Initialize avatar on land and validate all systems
    setTimeout(() => {
      const { findLandHex, moveAvatarToHex } = usePlayer.getState();
      const { mapData } = useMap.getState();
      
      if (mapData && mapData.length > 0) {
        const landPosition = findLandHex(mapData);
        moveAvatarToHex(landPosition.x, landPosition.y);
        
        // Validate all game systems after initialization
        import('./lib/systems/GameSystemValidator').then(({ GameSystemValidator }) => {
          GameSystemValidator.logSystemValidation();
        });
      }
    }, 100);
  }, []);

  if (gamePhase === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Loading Nova Imperium...</div>
      </div>
    );
  }

  return (
    <>
      <LoginModal 
        onLogin={login} 
        isVisible={!isAuthenticated} 
      />
      {isAuthenticated && (
        <GameEngineProvider>
          <div className="w-full h-full relative overflow-hidden bg-gray-900">
            <GameCanvas />
            <MedievalHUD />
          </div>
        </GameEngineProvider>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GameApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
