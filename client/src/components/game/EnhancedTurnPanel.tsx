import React, { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useCentralizedGameState } from "../../lib/stores/useCentralizedGameState";
import { GameStateAdapter } from "../../lib/adapters/GameStateAdapter";
import { ResourceManager } from "../../lib/game/ResourceManager";

export function EnhancedTurnPanel() {
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [lastTurnResult, setLastTurnResult] = useState<any>(null);
  
  const { 
    currentTurn, 
    globalResources, 
    resourceProduction,
    actionPoints,
    maxActionPoints,
    finDuTour 
  } = useCentralizedGameState();

  const handleEnhancedEndTurn = async () => {
    setIsProcessingTurn(true);
    
    try {
      // Utiliser la nouvelle fonction finDuTour améliorée
      const result = GameStateAdapter.executeEnhancedEndTurn();
      setLastTurnResult(result);
      
      console.log("🎯 Fin de tour améliorée terminée:", result);
    } catch (error) {
      console.error("❌ Erreur lors de la fin de tour:", error);
    } finally {
      setIsProcessingTurn(false);
    }
  };

  const handleStandardEndTurn = () => {
    // Utiliser la fonction centralisée standard
    finDuTour();
  };

  return (
    <Card className="p-4 bg-black/80 border-amber-500 text-white">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-amber-400">
          🎯 Gestion des Tours - Système Amélioré
        </h3>
        
        {/* Informations du tour actuel */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-amber-300">Tour actuel: {currentTurn}</div>
            <div className="text-blue-300">PA: {actionPoints}/{maxActionPoints}</div>
          </div>
          <div>
            <div className="text-green-300">
              Production: +{resourceProduction.or} Or, +{resourceProduction.nourriture} Nourriture
            </div>
          </div>
        </div>

        {/* Ressources actuelles */}
        <div className="bg-gray-900/50 p-3 rounded">
          <div className="text-amber-300 text-sm mb-2">Ressources actuelles:</div>
          <div className="text-xs grid grid-cols-3 gap-2">
            <div>🏆 Or: {globalResources.or}</div>
            <div>🍞 Nourriture: {globalResources.nourriture}</div>
            <div>🌲 Bois: {globalResources.bois}</div>
            <div>🗿 Pierre: {globalResources.pierre}</div>
            <div>⚔️ Fer: {globalResources.fer}</div>
            <div>🐎 Chevaux: {globalResources.chevaux}</div>
          </div>
        </div>

        {/* Boutons de fin de tour */}
        <div className="flex gap-2">
          <Button
            onClick={handleEnhancedEndTurn}
            disabled={isProcessingTurn}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-black font-bold"
          >
            {isProcessingTurn ? "⏳ Traitement..." : "🚀 Fin de Tour Améliorée"}
          </Button>
          
          <Button
            onClick={handleStandardEndTurn}
            variant="outline"
            className="border-amber-500 text-amber-400 hover:bg-amber-500/20"
          >
            📜 Tour Simple
          </Button>
        </div>

        {/* Résultats du dernier tour */}
        {lastTurnResult && (
          <div className="bg-green-900/30 p-3 rounded border border-green-500">
            <div className="text-green-300 text-sm mb-2">
              ✅ Tour {lastTurnResult.newTurn - 1} terminé
            </div>
            {lastTurnResult.events.length > 0 && (
              <div className="text-xs">
                <div className="text-green-400">Événements:</div>
                {lastTurnResult.events.map((event: any, index: number) => (
                  <div key={index} className="ml-2 text-green-200">
                    • {event.message}
                  </div>
                ))}
              </div>
            )}
            {lastTurnResult.stats && (
              <div className="text-xs mt-2">
                <div className="text-blue-400">Statistiques:</div>
                <div className="ml-2 text-blue-200">
                  Population totale: {lastTurnResult.stats.totalPopulation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Indicateurs système */}
        <div className="flex justify-between text-xs">
          <div className="text-gray-400">
            🔧 Système modulaire actif
          </div>
          <div className="text-gray-400">
            {ResourceManager.calculateResourceScore(globalResources)} pts
          </div>
        </div>
      </div>
    </Card>
  );
}