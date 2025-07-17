import { useState } from "react";
import { useGameState } from "../../lib/stores/useGameState";
import { useCivilizations } from "../../lib/stores/useCivilizations";
import { useMap } from "../../lib/stores/useMap";
import { useAudio } from "../../lib/stores/useAudio";
import { CityPanel } from "./CityPanel";
import { TechTree } from "./TechTree";
import { DiplomacyPanel } from "./DiplomacyPanel";
import { UnitPanel } from "./UnitPanel";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";

export function GameUI() {
  const { gamePhase, currentTurn, endTurn, saveGame, loadGame } = useGameState();
  const { civilizations, currentCivilization } = useCivilizations();
  const { selectedHex } = useMap();
  const { isMuted, toggleMute } = useAudio();
  const [activePanel, setActivePanel] = useState<string | null>(null);

  if (gamePhase === "menu") {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <Card className="p-8 bg-gray-800 text-white">
          <h1 className="text-4xl font-bold mb-8 text-center">Civilization Clone</h1>
          <div className="space-y-4">
            <Button className="w-full" onClick={() => useGameState.getState().startGame()}>
              Start New Game
            </Button>
            <Button className="w-full" onClick={loadGame}>
              Load Game
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (gamePhase === "loading") {
    return null;
  }

  return (
    <>
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gray-800 bg-opacity-90 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="text-lg font-bold">
              Turn: {currentTurn}
            </div>
            {currentCivilization && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">🌾</span>
                  <span>{currentCivilization.resources.food}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-400">🔨</span>
                  <span>{currentCivilization.resources.production}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">🔬</span>
                  <span>{currentCivilization.resources.science}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400">🎭</span>
                  <span>{currentCivilization.resources.culture}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">💰</span>
                  <span>{currentCivilization.resources.gold}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={toggleMute}>
              {isMuted ? "🔇" : "🔊"}
            </Button>
            <Button variant="outline" size="sm" onClick={saveGame}>
              Save
            </Button>
            <Button onClick={endTurn} className="bg-green-600 hover:bg-green-700">
              End Turn
            </Button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="absolute top-20 right-0 z-30 w-80 h-full bg-gray-800 bg-opacity-95 text-white p-4">
        <Tabs value={activePanel || "overview"} onValueChange={setActivePanel}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Info</TabsTrigger>
            <TabsTrigger value="city">City</TabsTrigger>
            <TabsTrigger value="tech">Tech</TabsTrigger>
            <TabsTrigger value="diplomacy">Diplo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Game Overview</h3>
              {selectedHex && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Hex ({selectedHex.x}, {selectedHex.y})</h4>
                  <p>Terrain: {selectedHex.terrain}</p>
                  <p>Food: {selectedHex.food}</p>
                  <p>Production: {selectedHex.production}</p>
                  <p>Science: {selectedHex.science}</p>
                  {selectedHex.resource && (
                    <p>Resource: {selectedHex.resource}</p>
                  )}
                </div>
              )}
              <UnitPanel />
            </div>
          </TabsContent>
          
          <TabsContent value="city" className="mt-4">
            <CityPanel />
          </TabsContent>
          
          <TabsContent value="tech" className="mt-4">
            <TechTree />
          </TabsContent>
          
          <TabsContent value="diplomacy" className="mt-4">
            <DiplomacyPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gray-800 bg-opacity-90 text-white p-2">
        <div className="flex justify-between items-center text-sm">
          <div>
            {currentCivilization?.name} - Population: {currentCivilization?.cities.reduce((sum, city) => sum + city.population, 0)}
          </div>
          <div className="text-center text-xs text-gray-400">
            Navigate: WASD or Arrow Keys | Mouse: Drag to pan, Wheel to zoom, Click to select
          </div>
          <div>
            Cities: {currentCivilization?.cities.length} | Units: {currentCivilization?.units.length}
          </div>
        </div>
      </div>
    </>
  );
}
