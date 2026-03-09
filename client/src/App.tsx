import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameCanvas } from "./components/game/GameCanvas";
import { MedievalHUD } from "./components/game/MedievalHUD";
import { MapLoadingOverlay } from "./components/game/MapLoadingOverlay";
import { LoginModal } from "./components/auth/LoginModal";
import { AuthProvider, useAuth } from "./lib/auth/AuthContext";
import { useGameState } from "./lib/stores/useGameState";
import { useMap } from "./lib/stores/useMap";
import { useNovaImperium } from "./lib/stores/useNovaImperium";
import { useAudio } from "./lib/stores/useAudio";
import { usePlayer } from "./lib/stores/usePlayer";
import { useGameLogging } from "./lib/hooks/useGameLogging";
import { GameEngineProvider } from "./lib/contexts/GameEngineContext";
import { fetchPlayerPosition } from "./lib/api/playerApi";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

function GameApp() {
  const { isAuthenticated, login } = useAuth();
  const { initializeGame, gamePhase } = useGameState();
  const { loadBlockFromDB } = useMap();
  const { initializeNovaImperiums } = useNovaImperium();
  const { setBackgroundMusic } = useAudio();

  useGameLogging();

  // Initialisation une seule fois au montage (musique, systèmes de jeu)
  useEffect(() => {
    const audio = new Audio("/sounds/background.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    setBackgroundMusic(audio);

    initializeNovaImperiums();
    initializeGame();
  }, []);

  // Chargement carte + positionnement joueur dès que l'auth est établie
  useEffect(() => {
    if (!isAuthenticated) return;

    async function initializePlayerWorld() {
      try {
        // Étape 1 — Récupérer la position persistée (crée (3,3) si absente)
        const position = await fetchPlayerPosition();
        console.log(
          `[Startup] Position persistée: world=(${position.worldX},${position.worldY})` +
          ` segment=(${position.segmentX},${position.segmentY})`
        );

        // Étape 2 — Charger le bloc 3×3 centré sur le segment du joueur
        await loadBlockFromDB(position.segmentX, position.segmentY);

        // Étape 3 — Convertir world → repère local après stabilisation de l'origine
        const { originWorldX, originWorldY } = useMap.getState();
        const hexX = position.worldX - originWorldX;
        const hexY = position.worldY - originWorldY;

        console.log(
          `[Startup] Placement joueur: hex=(${hexX},${hexY})` +
          ` depuis world=(${position.worldX},${position.worldY})` +
          ` origine=(${originWorldX},${originWorldY})`
        );

        // Étape 4 — Placer l'avatar exactement à la bonne position
        const { moveAvatarToHex } = usePlayer.getState();
        moveAvatarToHex(hexX, hexY);

        // Validation des systèmes de jeu
        import("./lib/systems/GameSystemValidator").then(({ GameSystemValidator }) => {
          GameSystemValidator.logSystemValidation();
        });

      } catch (err) {
        console.error("[Startup] Erreur position joueur — fallback findLandHex:", err);

        // Fallback : bloc (0,0) + case libre aléatoire
        await loadBlockFromDB(0, 0);
        const { findLandHex, moveAvatarToHex } = usePlayer.getState();
        const { mapData } = useMap.getState();
        if (mapData && mapData.length > 0) {
          const landPosition = findLandHex(mapData);
          moveAvatarToHex(landPosition.x, landPosition.y);
        }
      }
    }

    initializePlayerWorld();
  }, [isAuthenticated]);

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
            <MapLoadingOverlay />
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
