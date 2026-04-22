import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
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
import { useFactions } from "./lib/stores/useFactions";
import { fetchAllTerritories, fetchAllColonies } from "./lib/api/territoriesApi";
import { UnifiedTerritorySystem } from "./lib/systems/UnifiedTerritorySystem";
import HomePage from "./pages/public/HomePage";
import RegisterPage from "./pages/public/RegisterPage";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

function GameApp() {
  const { isAuthenticated, login } = useAuth();
  const { initializeGame, gamePhase } = useGameState();
  const { loadBlockFromDB } = useMap();
  const { initializeNovaImperiums } = useNovaImperium();
  const { setBackgroundMusic } = useAudio();
  const { loadFactions, loadPlayerFaction } = useFactions();

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

        // Étape 3 — Factions (chargement serveur)
        await loadFactions();
        await loadPlayerFaction();
        console.log(`[Startup] Factions chargées: ${useFactions.getState().factions.length}`);

        // Étape 4 — Action active (source de vérité serveur)
        const { action: currentAction } = await fetchCurrentAction();
        let effectiveWorldX = position.worldX;
        let effectiveWorldY = position.worldY;

        if (currentAction) {
          if (currentAction.status === "in_progress") {
            usePlayerActions.getState().setActiveAction(currentAction);
            if (currentAction.type === "move") {
              effectiveWorldX = currentAction.effectiveWorldX;
              effectiveWorldY = currentAction.effectiveWorldY;
            }
            console.log(
              `[Startup] Action active reprise: id=${currentAction.id} type=${currentAction.type}` +
              ` position effective=(${effectiveWorldX},${effectiveWorldY}) step=${currentAction.effectiveStep}` +
              ` → (${currentAction.endWorldX},${currentAction.endWorldY})`
            );
          } else if (currentAction.status === "completed") {
            if (currentAction.type === "move") {
              effectiveWorldX = currentAction.endWorldX;
              effectiveWorldY = currentAction.endWorldY;
            }
            console.log(
              `[Startup] Action complétée pendant l'absence — type=${currentAction.type}` +
              ` position finale: monde (${effectiveWorldX},${effectiveWorldY})`
            );
          }
        } else {
          console.log(`[Startup] Aucune action active`);
        }

        // Étape 5 — Charger le bloc 3×3 centré sur la position effective
        const effectiveSegmentX = Math.floor(effectiveWorldX / 50);
        const effectiveSegmentY = Math.floor(effectiveWorldY / 30);
        await loadBlockFromDB(effectiveSegmentX, effectiveSegmentY);

        // Étape 6 — Territoires et colonies
        const { originWorldX, originWorldY } = useMap.getState();
        try {
          const [serverTerritories, serverColonies] = await Promise.all([
            fetchAllTerritories(),
            fetchAllColonies(),
          ]);
          UnifiedTerritorySystem.loadFromServer(serverTerritories, serverColonies, originWorldX, originWorldY);
          console.log(`[Startup] Territoires: ${serverTerritories.length} | Colonies: ${serverColonies.length}`);
        } catch (territoryErr) {
          console.warn("[Startup] Chargement territoires échoué (non bloquant):", territoryErr);
        }

        // Étape 7 — Convertir world → repère local
        const hexX = effectiveWorldX - originWorldX;
        const hexY = effectiveWorldY - originWorldY;

        console.log(
          `[Startup] Placement: hex=(${hexX},${hexY})` +
          ` depuis world=(${effectiveWorldX},${effectiveWorldY})` +
          ` origine=(${originWorldX},${originWorldY})`
        );

        // Étape 8 — Appliquer l'état persisté au store
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

        // Étape 9 — Placer l'avatar
        const { moveAvatarToHex } = usePlayer.getState();
        moveAvatarToHex(hexX, hexY);

        // Validation des systèmes de jeu
        import("./lib/systems/GameSystemValidator").then(({ GameSystemValidator }) => {
          GameSystemValidator.logSystemValidation();
        });

      } catch (err) {
        console.error("[Startup] Erreur — fallback findLandHex:", err);

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
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08030a', color: '#c9a227', fontFamily: 'Georgia, serif' }}>
        <div style={{ fontSize: '1.4rem', letterSpacing: '0.1em' }}>Chargement de Nova Imperium…</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#111' }}>
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
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/game">
        {isAuthenticated ? <GameApp /> : <Redirect to="/" />}
      </Route>
      <Route path="/register">
        <RegisterPage />
      </Route>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/game" /> : <HomePage />}
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
