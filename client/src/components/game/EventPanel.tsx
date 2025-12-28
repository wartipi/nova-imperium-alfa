import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type PublicEventType = 
  | 'alliance_signed' | 'alliance_broken' | 'war_declared' | 'peace_treaty_signed'
  | 'campaign_victory' | 'campaign_defeat' | 'territory_conquered' | 'city_founded'
  | 'trade_agreement' | 'diplomatic_mission' | 'faction_created' | 'faction_disbanded'
  | 'leader_change' | 'resource_discovery' | 'natural_disaster' | 'festival_event'
  | 'economic_crisis' | 'plague_outbreak' | 'technological_advance' | 'religious_event';

interface WorldEvent {
  id: string;
  type: PublicEventType;
  title: string;
  description: string;
  participants: string[];
  location?: { x: number; y: number; regionName?: string };
  priority: 'low' | 'medium' | 'high' | 'critical';
  turn: number;
  timestamp: string;
  icon: string;
  isVisible: boolean;
}

async function fetchPublicEvents(): Promise<WorldEvent[]> {
  const response = await fetch('/api/public-events');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des événements');
  }
  return response.json();
}

async function initDemoEvents(): Promise<void> {
  await fetch('/api/public-events/init-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentTurn: 5 })
  });
}

export function EventPanel() {
  const [filterType, setFilterType] = useState<PublicEventType | 'all'>('all');
  const [initialized, setInitialized] = useState(false);

  const { data: worldEvents = [], isLoading, refetch } = useQuery<WorldEvent[]>({
    queryKey: ['publicEvents'],
    queryFn: fetchPublicEvents,
    staleTime: 30000,
    refetchInterval: 60000
  });

  useEffect(() => {
    if (!initialized && worldEvents.length === 0 && !isLoading) {
      initDemoEvents().then(() => {
        setInitialized(true);
        refetch();
      });
    }
  }, [worldEvents, isLoading, initialized, refetch]);

  const getEventIcon = (type: PublicEventType, customIcon?: string) => {
    if (customIcon) return customIcon;
    
    switch (type) {
      case 'faction_created': return '🏰';
      case 'war_declared': return '⚔️';
      case 'natural_disaster': return '🌋';
      case 'alliance_signed': return '🤝';
      case 'resource_discovery': return '💎';
      case 'city_founded': return '🏘️';
      case 'peace_treaty_signed': return '🕊️';
      case 'campaign_victory': return '🏆';
      case 'trade_agreement': return '💰';
      case 'plague_outbreak': return '☠️';
      default: return '📜';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-600 bg-red-50 text-red-800';
      case 'high': return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'medium': return 'border-blue-500 bg-blue-50 text-blue-800';
      case 'low': return 'border-gray-500 bg-gray-50 text-gray-800';
      default: return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const filteredEvents = filterType === 'all' 
    ? worldEvents 
    : worldEvents.filter(event => event.type === filterType);

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Il y a moins d'une heure";
    if (hours === 1) return "Il y a 1 heure";
    if (hours < 24) return `Il y a ${hours} heures`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return "Il y a 1 jour";
    return `Il y a ${days} jours`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="font-bold text-base mb-3">Chronique du Monde</h4>
          <div className="text-sm text-amber-600">Chargement des événements...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Chronique du Monde</h4>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Filtrer par type</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <button 
            onClick={() => setFilterType('all')}
            className={`p-1 rounded ${filterType === 'all' ? 'bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200'}`}
          >
            Tous
          </button>
          <button 
            onClick={() => setFilterType('war_declared')}
            className={`p-1 rounded ${filterType === 'war_declared' ? 'bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200'}`}
          >
            Guerres
          </button>
          <button 
            onClick={() => setFilterType('alliance_signed')}
            className={`p-1 rounded ${filterType === 'alliance_signed' ? 'bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200'}`}
          >
            Alliances
          </button>
          <button 
            onClick={() => setFilterType('natural_disaster')}
            className={`p-1 rounded ${filterType === 'natural_disaster' ? 'bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200'}`}
          >
            Catastrophes
          </button>
          <button 
            onClick={() => setFilterType('faction_created')}
            className={`p-1 rounded ${filterType === 'faction_created' ? 'bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200'}`}
          >
            Factions
          </button>
          <button 
            onClick={() => setFilterType('resource_discovery')}
            className={`p-1 rounded ${filterType === 'resource_discovery' ? 'bg-amber-600 text-white' : 'bg-amber-100 hover:bg-amber-200'}`}
          >
            Découvertes
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Journal des Événements Majeurs</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center text-sm text-amber-600 py-4">
              Aucun événement à afficher
            </div>
          ) : (
            filteredEvents.map(event => (
              <div 
                key={event.id} 
                className={`p-3 rounded border-2 ${getPriorityColor(event.priority)}`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getEventIcon(event.type, event.icon)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs mt-1 opacity-75">{event.description}</div>
                    
                    <div className="flex justify-between items-center mt-2 text-xs opacity-60">
                      <span>Tour {event.turn}</span>
                      <span>{formatTimeAgo(event.timestamp)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="text-xs mt-1 opacity-60">
                        📍 {(event.location as any).regionName || `(${event.location.x}, ${event.location.y})`}
                      </div>
                    )}
                    
                    {(event.participants as string[]).length > 0 && (
                      <div className="text-xs mt-1 opacity-60">
                        👥 Impliqués: {(event.participants as string[]).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Statistiques</div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Événements totaux:</span>
            <span className="font-bold">{worldEvents.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Événements critiques:</span>
            <span className="text-red-600 font-bold">{worldEvents.filter(e => e.priority === 'critical').length}</span>
          </div>
          {worldEvents.length > 0 && (
            <div className="flex justify-between">
              <span>Dernière mise à jour:</span>
              <span>Tour {Math.max(...worldEvents.map(e => e.turn))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
