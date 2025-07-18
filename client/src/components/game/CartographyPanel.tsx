import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useGameState } from '../../lib/stores/useGameState';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface MapRegion {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
  tiles: { x: number; y: number; terrain: string; resources: string[] }[];
  exploredBy: string;
  explorationLevel: number;
  createdAt: number;
}

interface MapDocument {
  id: string;
  name: string;
  region: MapRegion;
  cartographer: string;
  quality: 'rough' | 'detailed' | 'masterwork';
  accuracy: number;
  hiddenSecrets: string[];
  tradingValue: number;
  uniqueFeatures: string[];
  createdAt: number;
  lastUpdated: number;
  isUnique: boolean;
}

interface CartographyProject {
  id: string;
  playerId: string;
  regionId: string;
  progress: number;
  requiredActionPoints: number;
  spentActionPoints: number;
  startedAt: number;
  estimatedCompletion: number;
  tools: string[];
  assistants: string[];
}

interface CartographyPanelProps {
  onClose: () => void;
}

export function CartographyPanel({ onClose }: CartographyPanelProps) {
  const { hasCompetenceLevel, actionPoints, spendActionPoints, playerId } = usePlayer();
  const { currentNovaImperium } = useGameState();
  const [discoveredRegions, setDiscoveredRegions] = useState<MapRegion[]>([]);
  const [playerMaps, setPlayerMaps] = useState<MapDocument[]>([]);
  const [activeProjects, setActiveProjects] = useState<CartographyProject[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<MapRegion | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données de cartographie
  useEffect(() => {
    loadCartographyData();
  }, [playerId]);

  const loadCartographyData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les régions découvertes
      const regionsResponse = await fetch(`/api/cartography/regions/${playerId}`);
      if (regionsResponse.ok) {
        const regions = await regionsResponse.json();
        setDiscoveredRegions(regions);
      }

      // Charger les cartes du joueur
      const mapsResponse = await fetch(`/api/cartography/maps/${playerId}`);
      if (mapsResponse.ok) {
        const maps = await mapsResponse.json();
        setPlayerMaps(maps);
      }

      // Charger les projets actifs
      const projectsResponse = await fetch(`/api/cartography/projects/${playerId}`);
      if (projectsResponse.ok) {
        const projects = await projectsResponse.json();
        setActiveProjects(projects);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de cartographie:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Découvrir une nouvelle région
  const discoverRegion = async () => {
    if (!hasCompetenceLevel('exploration', 1)) {
      alert('Vous devez avoir au moins le niveau Novice en Exploration pour découvrir des régions.');
      return;
    }

    if (actionPoints < 10) {
      alert('Vous n\'avez pas assez de Points d\'Action. Il faut 10 PA pour découvrir une région.');
      return;
    }

    setIsDiscovering(true);
    
    try {
      const response = await fetch('/api/cartography/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          centerX: Math.floor(Math.random() * 50),
          centerY: Math.floor(Math.random() * 30),
          radius: Math.floor(Math.random() * 3) + 2,
          name: `Région-${Date.now()}`
        }),
      });

      if (response.ok) {
        const newRegion = await response.json();
        setDiscoveredRegions(prev => [...prev, newRegion]);
        spendActionPoints(10);
        alert(`Région "${newRegion.name}" découverte avec succès !`);
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la découverte:', error);
      alert('Erreur lors de la découverte de la région.');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Commencer un projet de cartographie
  const startProject = async (regionId: string) => {
    if (!hasCompetenceLevel('cartography', 1)) {
      alert('Vous devez avoir au moins le niveau Novice en Cartographie pour commencer un projet.');
      return;
    }

    const requiredAP = 20; // Coût de base
    if (actionPoints < requiredAP) {
      alert(`Vous n'avez pas assez de Points d'Action. Il faut ${requiredAP} PA pour commencer un projet.`);
      return;
    }

    try {
      const response = await fetch('/api/cartography/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          regionId,
          tools: [],
          assistants: []
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setActiveProjects(prev => [...prev, newProject]);
        spendActionPoints(requiredAP);
        alert('Projet de cartographie commencé avec succès !');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur lors du démarrage du projet:', error);
      alert('Erreur lors du démarrage du projet.');
    }
  };

  // Progresser dans un projet
  const progressProject = async (projectId: string) => {
    const progressAP = 5;
    if (actionPoints < progressAP) {
      alert(`Vous n'avez pas assez de Points d'Action. Il faut ${progressAP} PA pour progresser.`);
      return;
    }

    try {
      const response = await fetch(`/api/cartography/project/${projectId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionPoints: progressAP
        }),
      });

      if (response.ok) {
        spendActionPoints(progressAP);
        loadCartographyData(); // Recharger les données
        alert('Progression du projet mise à jour !');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la progression:', error);
      alert('Erreur lors de la progression du projet.');
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'rough': return 'bg-gray-500';
      case 'detailed': return 'bg-blue-500';
      case 'masterwork': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'rough': return 'Brouillon';
      case 'detailed': return 'Détaillée';
      case 'masterwork': return 'Chef-d\'œuvre';
      default: return 'Inconnue';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-amber-50 p-8 rounded-lg border-2 border-amber-800">
          <div className="text-center">
            <div className="text-amber-800 text-lg font-semibold mb-2">Chargement des données de cartographie...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-800 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-amber-50 p-6 rounded-lg border-2 border-amber-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-amber-800">📍 Cartographie</h2>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-amber-800 hover:bg-amber-100"
          >
            ✕
          </Button>
        </div>

        <Tabs defaultValue="regions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="regions">Régions</TabsTrigger>
            <TabsTrigger value="projects">Projets</TabsTrigger>
            <TabsTrigger value="maps">Cartes</TabsTrigger>
          </TabsList>

          <TabsContent value="regions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Régions Découvertes</CardTitle>
                <CardDescription>
                  Explorez de nouvelles régions pour créer des cartes précieuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-600">
                    {discoveredRegions.length} région(s) découverte(s)
                  </div>
                  <Button 
                    onClick={discoverRegion}
                    disabled={isDiscovering || !hasCompetenceLevel('exploration', 1) || actionPoints < 10}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isDiscovering ? 'Exploration...' : 'Découvrir Région (10 PA)'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discoveredRegions.map((region) => (
                    <Card key={region.id} className="border-green-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{region.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            Centre: {region.centerX}, {region.centerY}
                          </Badge>
                          <Badge variant="secondary">
                            Rayon: {region.radius}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3">
                          <div className="text-sm text-gray-600">
                            Exploration: {region.explorationLevel}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${region.explorationLevel}%` }}
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={() => startProject(region.id)}
                          disabled={!hasCompetenceLevel('cartography', 1) || actionPoints < 20}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Commencer Cartographie (20 PA)
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Projets Actifs</CardTitle>
                <CardDescription>
                  Vos projets de cartographie en cours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucun projet actif. Découvrez des régions pour commencer !
                    </div>
                  ) : (
                    activeProjects.map((project) => (
                      <Card key={project.id} className="border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">
                            Projet de Cartographie
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              Région: {project.regionId}
                            </Badge>
                            <Badge variant="secondary">
                              {project.spentActionPoints}/{project.requiredActionPoints} PA
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-3">
                            <div className="text-sm text-gray-600">
                              Progression: {project.progress.toFixed(1)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                          <Button 
                            onClick={() => progressProject(project.id)}
                            disabled={actionPoints < 5 || project.progress >= 100}
                            className="w-full bg-amber-600 hover:bg-amber-700"
                          >
                            Progresser (5 PA)
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maps" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vos Cartes</CardTitle>
                <CardDescription>
                  Cartes que vous avez créées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playerMaps.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      Aucune carte créée. Terminez des projets pour créer des cartes !
                    </div>
                  ) : (
                    playerMaps.map((map) => (
                      <Card key={map.id} className="border-purple-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{map.name}</CardTitle>
                          <div className="flex gap-2">
                            <Badge className={getQualityColor(map.quality)}>
                              {getQualityLabel(map.quality)}
                            </Badge>
                            <Badge variant="secondary">
                              Précision: {map.accuracy}%
                            </Badge>
                            {map.isUnique && (
                              <Badge className="bg-gold-500">
                                Unique
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="font-semibold">Secrets:</span> {map.hiddenSecrets.length}
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold">Caractéristiques:</span> {map.uniqueFeatures.length}
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold">Valeur:</span> {map.tradingValue} pièces
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />
        
        <div className="text-xs text-gray-500">
          <div className="mb-2">
            <span className="font-semibold">Compétences requises:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>• Exploration (Novice) - Découvrir des régions</div>
            <div>• Cartographie (Novice) - Créer des cartes</div>
          </div>
        </div>
      </div>
    </div>
  );
}