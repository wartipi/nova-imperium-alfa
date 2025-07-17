import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameCanvas } from "./components/game/GameCanvas";
import { GameUI } from "./components/game/GameUI";
import { useGameState } from "./lib/stores/useGameState";
import { useMap } from "./lib/stores/useMap";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

function GameApp() {
  const { initializeGame, gamePhase } = useGameState();
  const { generateMap } = useMap();
  const { setBackgroundMusic } = useAudio();

  useEffect(() => {
    // Initialize background music
    const audio = new Audio("/sounds/background.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    setBackgroundMusic(audio);

    // Initialize game
    generateMap(50, 30); // Generate 50x30 hex map
    initializeGame();
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
      <GameUI />
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
