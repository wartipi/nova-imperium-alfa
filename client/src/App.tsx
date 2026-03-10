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
import { fetchPlayerState } from "./lib/api/playerStateApi";
import { fetchCurrentAction } from "./lib/api/playerActionsApi";
import { usePlayerActions } from "./lib/stores/usePlayerActions";
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

  // Chargement carte + état joueur dès que l'auth est établie
  useEffect(() => {
    if (!isAuthenticated) return;

    async function initializePlayerWorld() {
      try {
        // Étape 1 — Position persistée (crée (3,3) si absente)
        const position = await fetchPlayerPosition();
        console.log(
          `[Startup] Position: world=(${position.worldX},${position.worldY})` +
          ` segment=(${position.segmentX},${position.segmentY})`
        );

        // Étape 2 — État joueur persisté (crée les valeurs par défaut si absent)
        const playerStateData = await fetchPlayerState();
        console.log(
          `[Startup] État joueur: level=${playerStateData.level}` +
          ` xp=${playerStateData.experience} ap=${playerStateData.actionPoints}` +
          ` compétences=${playerStateData.competences.length}`
        );

        // Étape 3 — Action active (source de vérité serveur)
        // Si une action move était en cours : la reprendre dans le store.
        // Si elle vient d'expirer : le serveur la finalise (position déjà mise à jour en DB).
        const { action: currentAction } = await fetchCurrentAction();
        let effectiveWorldX = position.worldX;
        let effectiveWorldY = position.worldY;

        if (currentAction) {
          if (currentAction.status === "in_progress") {
            // Action toujours en cours — le joueur est au point de départ
            usePlayerActions.getState().setActiveAction(currentAction);
            console.log(
              `[Startup] Action active reprise: id=${currentAction.id}` +
              ` → (${currentAction.endWorldX},${currentAction.endWorldY})` +
              ` msRestant=${Math.round(currentAction.msRemaining / 60000)}min`
            );
          } else if (currentAction.status === "completed") {
            // Action expirée pendant l'absence — position finale = destination de l'action
            effectiveWorldX = currentAction.endWorldX;
            effectiveWorldY = currentAction.endWorldY;
            console.log(
              `[Startup] Action complétée pendant l'absence — position finale:` +
              ` monde (${effectiveWorldX},${effectiveWorldY})`
            );
          }
        } else {
          console.log(`[Startup] Aucune action active`);
        }

        // Étape 4 — Charger le bloc 3×3 centré sur la position effective
        const effectiveSegmentX = Math.floor(effectiveWorldX / 50);
        const effectiveSegmentY = Math.floor(effectiveWorldY / 30);
        await loadBlockFromDB(effectiveSegmentX, effectiveSegmentY);

        // Étape 5 — Convertir world → repère local après stabilisation de l'origine
        const { originWorldX, originWorldY } = useMap.getState();
        const hexX = effectiveWorldX - originWorldX;
        const hexY = effectiveWorldY - originWorldY;

        console.log(
          `[Startup] Placement: hex=(${hexX},${hexY})` +
          ` depuis world=(${effectiveWorldX},${effectiveWorldY})` +
          ` origine=(${originWorldX},${originWorldY})`
        );

        // Étape 6 — Appliquer l'état persisté au store
        // experienceToNextLevel est recalculé depuis level (valeur dérivée)
        const { calculateExperienceForLevel } = usePlayer.getState();
        const experienceToNextLevel = calculateExperienceForLevel(playerStateData.level + 1);

        usePlayer.setState({
          level: playerStateData.level,
          experience: playerStateData.experience,
          totalExperience: playerStateData.totalExperience,
          experienceToNextLevel,
          actionPoints: playerStateData.actionPoints,
          maxActionPoints: playerStateData.maxActionPoints,
          competencePoints: playerStateData.competencePoints,
          competences: playerStateData.competences,
        });
        console.log(`[Startup] Store joueur initialisé depuis DB`);

        // Étape 7 — Placer l'avatar exactement à la bonne position
        const { moveAvatarToHex } = usePlayer.getState();
        moveAvatarToHex(hexX, hexY);

        // Validation des systèmes de jeu
        import("./lib/systems/GameSystemValidator").then(({ GameSystemValidator }) => {
          GameSystemValidator.logSystemValidation();
        });

      } catch (err) {
        console.error("[Startup] Erreur — fallback findLandHex:", err);

        // Fallback : bloc (0,0) + case libre, état par défaut
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
