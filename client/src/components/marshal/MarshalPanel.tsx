import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Sword, Users, Crown, MapPin, Plus, FileText, Clock, Star } from 'lucide-react';

interface Army {
  id: string;
  name: string;
  ownerId: string;
  commanderId?: string;
  unitCount: number;
  unitType: string;
  x: number;
  y: number;
  morale: number;
  experience: number;
  supplies: number;
  status: 'ready' | 'moving' | 'fighting' | 'resting';
  description: string;
}

interface Marshal {
  id: string;
  name: string;
  playerId: string;
  assignedArmyId?: string;
  competences: {
    leadership: number;
    tactics: number;
    combat: number;
    logistics: number;
  };
  experience: number;
  reputation: number;
  hirePrice: number;
  status: 'available' | 'hired' | 'in_battle';
}

interface Contract {
  id: string;
  title: string;
  description: string;
  clientId: string;
  contractorId?: string;
  reward: number;
  duration: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  objectives: string[];
}

export function MarshalPanel() {
  const [armies, setArmies] = useState<Army[]>([]);
  const [marshals, setMarshals] = useState<Marshal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [armiesRes, marshalsRes, contractsRes] = await Promise.all([
        fetch('/api/marshal/armies/player'),
        fetch('/api/marshal/marshals/player'),
        fetch('/api/marshal/contracts/player')
      ]);

      setArmies(await armiesRes.json());
      setMarshals(await marshalsRes.json());
      setContracts(await contractsRes.json());
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'moving': return 'bg-blue-500';
      case 'fighting': return 'bg-red-500';
      case 'resting': return 'bg-yellow-500';
      case 'pending': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'available': return 'bg-green-500';
      case 'hired': return 'bg-blue-500';
      case 'in_battle': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const createExampleArmy = async () => {
    try {
      const response = await fetch('/api/marshal/armies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Garde Royale',
          description: 'Élite des forces armées du royaume',
          ownerId: 'player',
          x: 25,
          y: 15,
          unitCount: 150,
          unitType: 'infantry',
          morale: 80,
          experience: 10,
          supplies: 100,
          status: 'ready'
        })
      });

      if (response.ok) {
        loadData();
        console.log('Armée créée avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="armies" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="armies">Armées ({armies.length})</TabsTrigger>
          <TabsTrigger value="marshals">Maréchaux ({marshals.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contrats ({contracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="armies" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mes Armées</h3>
            <Button onClick={createExampleArmy} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Créer Armée d'Example
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {armies.map((army) => (
              <Card key={army.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{army.name}</CardTitle>
                    <Badge className={getStatusColor(army.status)}>
                      {army.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{army.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {army.unitCount} {army.unitType}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      ({army.x}, {army.y})
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Moral:</span>
                      <span className={army.morale > 50 ? 'text-green-600' : 'text-red-600'}>
                        {army.morale}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expérience:</span>
                      <span>{army.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provisions:</span>
                      <span>{army.supplies}%</span>
                    </div>
                  </div>

                  {army.commanderId && (
                    <div className="flex items-center gap-1 text-xs font-medium text-yellow-600">
                      <Crown className="h-3 w-3" />
                      Commandant assigné
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {armies.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sword className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune armée</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Créez votre première armée pour commencer vos campagnes militaires.
                  </p>
                  <Button onClick={createExampleArmy}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une armée d'exemple
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="marshals" className="space-y-4">
          <h3 className="text-lg font-semibold">Maréchaux Disponibles</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {marshals.map((marshal) => (
              <Card key={marshal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{marshal.name}</CardTitle>
                    <Badge className={getStatusColor(marshal.status)}>
                      {marshal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Leadership:</span>
                        <div className="flex">
                          {Array.from({length: 5}, (_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < marshal.competences.leadership ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Tactique:</span>
                        <div className="flex">
                          {Array.from({length: 5}, (_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < marshal.competences.tactics ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Combat:</span>
                        <div className="flex">
                          {Array.from({length: 5}, (_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < marshal.competences.combat ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Logistique:</span>
                        <div className="flex">
                          {Array.from({length: 5}, (_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < marshal.competences.logistics ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Prix d'embauche:</span>
                    <span className="font-medium">{marshal.hirePrice} or</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Réputation:</span>
                    <span>{marshal.reputation}/100</span>
                  </div>

                  {marshal.status === 'available' && (
                    <Button size="sm" className="w-full">
                      Embaucher
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {marshals.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Crown className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun maréchal</h3>
                  <p className="text-muted-foreground text-center">
                    Aucun maréchal disponible pour le moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <h3 className="text-lg font-semibold">Contrats Militaires</h3>
          
          <div className="grid gap-4">
            {contracts.map((contract) => (
              <Card key={contract.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{contract.title}</CardTitle>
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{contract.description}</p>
                  
                  <div className="flex justify-between text-sm">
                    <span>Récompense:</span>
                    <span className="font-medium">{contract.reward} or</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Durée:</span>
                    <span>{contract.duration} jours</span>
                  </div>

                  {contract.objectives.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1">Objectifs:</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {contract.objectives.map((obj, index) => (
                          <li key={index}>• {obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {contracts.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun contrat</h3>
                  <p className="text-muted-foreground text-center">
                    Aucun contrat militaire disponible pour le moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}