import { usePlayer } from "../../lib/stores/usePlayer";
import { useGameState } from "../../lib/stores/useGameState";
import { useActivityLogs, ActivityLog } from "../../lib/stores/useActivityLogs";
import { useGameLogging } from "../../lib/hooks/useGameLogging";
import { useState } from "react";

export function ActivityReportPanel() {
  const { actionPoints, competences } = usePlayer();
  const { currentTurn } = useGameState();
  const { logs, getRecentLogs, clearLogs } = useActivityLogs();
  const gameLogging = useGameLogging();
  const [filter, setFilter] = useState<string>('all');

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'movement': return '🚶';
      case 'action': return '⚡';
      case 'competence': return '🎯';
      case 'exchange': return '💰';
      case 'creation': return '🔨';
      case 'exploration': return '🗺️';
      case 'marketplace': return '⚖️';
      case 'construction': return '🏗️';
      case 'recruitment': return '⚔️';
      default: return '📋';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Filtrer les logs selon le filtre sélectionné
  const filteredLogs = filter === 'all' 
    ? getRecentLogs(20) 
    : logs.filter(log => log.type === filter).slice(0, 20);

  // Boutons de test pour démonstration
  const handleTestAction = (actionType: string) => {
    switch (actionType) {
      case 'movement':
        gameLogging.logMovement(gameLogging.getCurrentLocation(), 'Hex(27,12)', 2);
        break;
      case 'exploration':
        gameLogging.logExploration(gameLogging.getCurrentLocation(), 5, ['Fer', 'Pierre']);
        break;
      case 'marketplace':
        gameLogging.logMarketplaceAction('buy', 'Épée en fer +1', 150);
        break;
      case 'competence':
        gameLogging.logCompetenceGain('Exploration', 2, 10);
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Rapport d'Activités</h4>
        <div className="text-sm text-amber-700">Jour {currentTurn}</div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Statut Actuel</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>⚡ Points d'Action: {actionPoints}</div>
          <div>🎯 Compétences: {competences?.length || 0}</div>
          <div>📍 Position: {gameLogging.currentLocation}</div>
          <div>🕒 Tour: {currentTurn}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2 flex justify-between items-center">
          <span>Activités Récentes ({filteredLogs.length})</span>
          <div className="flex gap-1">
            <button
              onClick={() => clearLogs()}
              className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded hover:bg-red-300"
            >
              Effacer
            </button>
          </div>
        </div>
        
        <div className="mb-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs p-1 border border-amber-400 rounded w-full"
          >
            <option value="all">Toutes les activités</option>
            <option value="movement">🚶 Déplacements</option>
            <option value="exploration">🗺️ Exploration</option>
            <option value="marketplace">⚖️ Marché</option>
            <option value="competence">🎯 Compétences</option>
            <option value="construction">🏗️ Construction</option>
            <option value="recruitment">⚔️ Recrutement</option>
          </select>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-xs text-amber-600 italic">
              {filter === 'all' ? 'Aucune activité enregistrée' : `Aucune activité de type "${filter}"`}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 text-xs border-b border-amber-200 pb-1">
                <div className="text-sm">{getActivityIcon(log.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-amber-900">{log.message}</div>
                  <div className="text-amber-600 text-xs flex justify-between">
                    <span>{formatTime(log.timestamp)}</span>
                    {log.cost && <span>-{log.cost} PA</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Actions de Test</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => handleTestAction('movement')}
            className="p-1 bg-blue-200 text-blue-700 rounded hover:bg-blue-300"
          >
            🚶 Test Déplacement
          </button>
          <button
            onClick={() => handleTestAction('exploration')}
            className="p-1 bg-green-200 text-green-700 rounded hover:bg-green-300"
          >
            🗺️ Test Exploration
          </button>
          <button
            onClick={() => handleTestAction('marketplace')}
            className="p-1 bg-purple-200 text-purple-700 rounded hover:bg-purple-300"
          >
            ⚖️ Test Marché
          </button>
          <button
            onClick={() => handleTestAction('competence')}
            className="p-1 bg-yellow-200 text-yellow-700 rounded hover:bg-yellow-300"
          >
            🎯 Test Compétence
          </button>
        </div>
        <div className="text-xs text-amber-600 mt-2 italic">
          Ces boutons ajoutent des logs de démonstration pour tester le système
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Synchronisation</div>
        <div className="text-xs text-amber-700 space-y-1">
          <div>📊 Logs actifs: {logs.length}</div>
          <div>🎯 Position actuelle: {gameLogging.currentLocation}</div>
          <div>⚡ PA disponibles: {gameLogging.actionPoints}</div>
          <div>🕒 Tour: {gameLogging.currentTurn}</div>
        </div>
      </div>
    </div>
  );
}