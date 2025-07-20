import { usePlayer } from "../../lib/stores/usePlayer";
import { useGameState } from "../../lib/stores/useGameState";
import { useState, useEffect } from "react";

interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'movement' | 'action' | 'competence' | 'exchange' | 'creation' | 'exploration';
  message: string;
  cost?: number;
  location?: string;
}

export function ActivityReportPanel() {
  const { actionPoints, competences } = usePlayer();
  const { currentTurn } = useGameState();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    // Charger les logs d'activité depuis localStorage
    const savedLogs = localStorage.getItem('nova_imperium_activity_logs');
    if (savedLogs) {
      try {
        setActivityLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error('Erreur lors du chargement des logs:', error);
      }
    }
  }, []);

  const addActivityLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}`,
      timestamp: Date.now()
    };
    
    const updatedLogs = [newLog, ...activityLogs].slice(0, 50); // Garder seulement les 50 derniers
    setActivityLogs(updatedLogs);
    localStorage.setItem('nova_imperium_activity_logs', JSON.stringify(updatedLogs));
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'movement': return '🚶';
      case 'action': return '⚡';
      case 'competence': return '🎯';
      case 'exchange': return '💰';
      case 'creation': return '🔨';
      case 'exploration': return '🗺️';
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

  // Exemple de logs récents (à remplacer par de vrais logs)
  const exampleLogs: ActivityLog[] = [
    {
      id: '1',
      timestamp: Date.now() - 300000,
      type: 'creation',
      message: 'Carte créée avec succès',
      cost: 15
    },
    {
      id: '2',
      timestamp: Date.now() - 600000,
      type: 'competence',
      message: 'Compétence Cartographie apprise (Niveau 1)',
      cost: 10
    },
    {
      id: '3',
      timestamp: Date.now() - 900000,
      type: 'movement',
      message: 'Déplacement vers terrain enchanted_meadow',
      cost: 1
    }
  ];

  const displayLogs = activityLogs.length > 0 ? activityLogs : exampleLogs;

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
          <div>🎯 Compétences: {competences.length}</div>
          <div>📍 Position: Hex actuel</div>
          <div>🕒 Heure: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Activités Récentes</div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {displayLogs.length === 0 ? (
            <div className="text-xs text-amber-600 italic">Aucune activité récente</div>
          ) : (
            displayLogs.map((log) => (
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
        <div className="font-medium text-sm mb-2">Compétences Acquises</div>
        <div className="space-y-1 text-xs">
          {competences.length === 0 ? (
            <div className="text-amber-600 italic">Aucune compétence apprise</div>
          ) : (
            competences.map((comp) => (
              <div key={comp.competence} className="flex justify-between">
                <span className="capitalize">{comp.competence}:</span>
                <span>Niveau {comp.level}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Actions Disponibles</div>
        <div className="text-xs text-amber-700">
          <div>• Déplacement: 1-5 PA selon terrain</div>
          <div>• Exploration: 10 PA</div>
          <div>• Cartographie: 15 PA</div>
          <div>• Actions spéciales selon compétences</div>
        </div>
      </div>
    </div>
  );
}