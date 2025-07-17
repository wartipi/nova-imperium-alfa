import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameCanvas } from "./components/game/GameCanvas";
import { MedievalHUD } from "./components/game/MedievalHUD";
import { useGameState } from "./lib/stores/useGameState";
import { useMap } from "./lib/stores/useMap";
import { useCivilizations } from "./lib/stores/useCivilizations";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

function GameApp() {
  const { initializeGame, gamePhase } = useGameState();
  const { generateMap } = useMap();
  const { initializeCivilizations } = useCivilizations();
  const { setBackgroundMusic } = useAudio();

  useEffect(() => {
    console.log('App: Starting game initialization...');
    
    // Initialize background music
    const audio = new Audio("/sounds/background.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    setBackgroundMusic(audio);

    // Initialize game
    console.log('App: Generating map...');
    generateMap(50, 30); // Generate 50x30 hex map
    
    console.log('App: Initializing civilizations...');
    initializeCivilizations();
    
    console.log('App: Initializing game state...');
    initializeGame();
    
    console.log('App: Game initialization complete');
  }, []);

  if (gamePhase === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Loading Civilization...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-900">
      <GameCanvas />
      <MedievalHUD />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameApp />
    </QueryClientProvider>
  );
}

export default App;
