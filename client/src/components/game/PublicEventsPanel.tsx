import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Clock, 
  Users, 
  MapPin, 
  Filter, 
  RefreshCw,
  Crown,
  Sword,
  HandHeart,
  Building,
  Gem,
  AlertTriangle
} from 'lucide-react';

interface PublicEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  participants: string[];
  location?: {
    x: number;
    y: number;
    regionName?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  turn: number;
  timestamp: Date;
  isVisible: boolean;
  icon: string;
  consequences?: string[];
  relatedEvents?: string[];
  metadata?: Record<string, any>;
}

export function PublicEventsPanel() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'high-priority' | 'military'>('recent');

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      let endpoint = '/api/public-events';
      
      switch (selectedFilter) {
        case 'recent':
          endpoint = '/api/public-events/recent/20?turnsBack=10&limit=30';
          break;
        case 'high-priority':
          endpoint = '/api/public-events/priority/high?limit=20';
          break;
        case 'military':
          endpoint = '/api/public-events?types=war_declared&types=campaign_victory&types=campaign_defeat&types=alliance_signed&limit=20';
          break;
        default:
          endpoint = '/api/public-events?limit=50';
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      setEvents(data.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp)
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/public-events/statistics');
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const initializeDemoEvents = async () => {
    try {
      const response = await fetch('/api/public-events/init-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTurn: 20 })
      });
      if (response.ok) {
        loadEvents();
        loadStatistics();
        console.log('Événements de démonstration créés');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des événements:', error);
    }
  };

  useEffect(() => {
    loadEvents();
    loadStatistics();
  }, [selectedFilter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-500 text-green-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <Crown className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Sword className="h-4 w-4 text-yellow-600" />;
      case 'low': return <HandHeart className="h-4 w-4 text-green-600" />;
      default: return null;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'war_declared':
      case 'campaign_victory':
      case 'campaign_defeat':
        return <Sword className="h-4 w-4" />;
      case 'alliance_signed':
      case 'peace_treaty_signed':
        return <HandHeart className="h-4 w-4" />;
      case 'city_founded':
      case 'territory_conquered':
        return <Building className="h-4 w-4" />;
      case 'faction_created':
      case 'faction_disbanded':
        return <Crown className="h-4 w-4" />;
      case 'resource_discovery':
        return <Gem className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Il y a moins d\'une heure';
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
        <span className="ml-2 text-amber-800">Chargement des événements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-amber-900">Chroniques du Royaume</h3>
        <div className="flex gap-2">
          <Button
            onClick={initializeDemoEvents}
            size="sm"
            variant="outline"
            className="border-amber-600 text-amber-700 hover:bg-amber-50"
          >
            Créer événements d'exemple
          </Button>
          <Button
            onClick={() => {
              loadEvents();
              loadStatistics();
            }}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent">Récents</TabsTrigger>
          <TabsTrigger value="high-priority">Prioritaires</TabsTrigger>
          <TabsTrigger value="military">Militaires</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedFilter} className="space-y-4">
          {/* Statistiques */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-800">{statistics.total}</div>
                  <div className="text-sm text-amber-600">Événements totaux</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-800">{statistics.byPriority?.critical || 0}</div>
                  <div className="text-sm text-red-600">Critiques</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-800">{statistics.byPriority?.high || 0}</div>
                  <div className="text-sm text-orange-600">Haute priorité</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">{statistics.recentActivity}</div>
                  <div className="text-sm text-green-600">Activité récente</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Liste des événements */}
          <div className="space-y-3">
            {events.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun événement</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Aucun événement public n'a encore été enregistré dans les chroniques du royaume.
                  </p>
                  <Button
                    onClick={initializeDemoEvents}
                    variant="outline"
                    className="border-amber-600 text-amber-700 hover:bg-amber-50"
                  >
                    Créer des événements d'exemple
                  </Button>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id} className={`border-l-4 ${getPriorityColor(event.priority)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{event.icon}</span>
                          {getEventTypeIcon(event.type)}
                          <h4 className="font-semibold text-amber-900">{event.title}</h4>
                          {getPriorityIcon(event.priority)}
                        </div>
                        
                        <p className="text-sm text-amber-700 mb-3">{event.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-xs text-amber-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Tour {event.turn} • {formatDate(event.timestamp)}
                          </div>
                          
                          {event.participants.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.participants.join(', ')}
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              ({event.location.x}, {event.location.y})
                              {event.location.regionName && ` - ${event.location.regionName}`}
                            </div>
                          )}
                        </div>

                        {event.consequences && event.consequences.length > 0 && (
                          <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                            <div className="text-xs font-medium text-amber-800 mb-1">Conséquences:</div>
                            <ul className="text-xs text-amber-700 space-y-0.5">
                              {event.consequences.map((consequence, index) => (
                                <li key={index}>• {consequence}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <Badge className={`ml-4 ${getPriorityColor(event.priority)}`}>
                        {event.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}