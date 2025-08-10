import React, { useEffect, useState } from 'react';
import { useArmies, useArmiesSelectors } from '../../lib/stores/useArmies';
import { usePlayer } from '../../lib/stores/usePlayer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Sword, Shield, Users, Crown, MapPin, Plus, FileText, Clock } from 'lucide-react';
import type { Army, ArmyContract } from '../../../../shared/marshalSchema';

export function ArmyManagement() {
  const { player } = usePlayer();
  const { 
    fetchArmies, 
    fetchMarshals, 
    fetchContracts,
    createArmy, 
    hireCommander,
    createContract,
    acceptContract,
    setSelectedArmy,
    isLoading 
  } = useArmies();

  const myArmies = useArmiesSelectors.getArmiesByOwner(player?.id || '');
  const availableMarshals = useArmiesSelectors.getAvailableMarshals();
  const activeContracts = useArmiesSelectors.getActiveContracts(player?.id || '');
  const pendingContracts = useArmiesSelectors.getPendingContracts();

  // États locaux pour les formulaires
  const [newArmyForm, setNewArmyForm] = useState({
    name: '',
    description: '',
    x: 0,
    y: 0,
    unitCount: 100,
    unitType: 'infantry' as const,
  });

  const [newContractForm, setNewContractForm] = useState({
    title: '',
    description: '',
    contractorId: '',
    reward: 1000,
    duration: 30,
    objectives: [] as string[],
  });

  useEffect(() => {
    if (player?.id) {
      fetchArmies(player.id);
      fetchMarshals(player.id);
      fetchContracts(player.id);
    }
  }, [player?.id, fetchArmies, fetchMarshals, fetchContracts]);

  const handleCreateArmy = async () => {
    if (!player?.id) return;

    const armyData = {
      ...newArmyForm,
      ownerId: player.id,
      commanderId: null,
      morale: 70,
      experience: 0,
      supplies: 100,
      status: 'ready' as const,
    };

    const newArmy = await createArmy(armyData);
    if (newArmy) {
      setNewArmyForm({
        name: '',
        description: '',
        x: 0,
        y: 0,
        unitCount: 100,
        unitType: 'infantry',
      });
    }
  };

  const handleCreateContract = async () => {
    if (!player?.id) return;

    const contractData = {
      ...newContractForm,
      clientId: player.id,
    };

    const newContract = await createContract(contractData);
    if (newContract) {
      setNewContractForm({
        title: '',
        description: '',
        contractorId: '',
        reward: 1000,
        duration: 30,
        objectives: [],
      });
    }
  };

  const getArmyStatusColor = (status: Army['status']) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'moving': return 'bg-blue-500';
      case 'fighting': return 'bg-red-500';
      case 'resting': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getContractStatusColor = (status: ArmyContract['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des armées...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sword className="h-8 w-8" />
          Gestion des Armées
        </h1>
      </div>

      <Tabs defaultValue="armies" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="armies">Mes Armées ({myArmies.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contrats ({activeContracts.length})</TabsTrigger>
          <TabsTrigger value="create">Créer</TabsTrigger>
        </TabsList>

        <TabsContent value="armies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myArmies.map((army) => (
              <Card key={army.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedArmy(army.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{army.name}</CardTitle>
                    <Badge className={getArmyStatusColor(army.status)}>
                      {army.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{army.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {army.unitCount} {army.unitType}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      ({army.x}, {army.y})
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Moral</span>
                      <span className={army.morale > 50 ? 'text-green-600' : 'text-red-600'}>
                        {army.morale}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Expérience</span>
                      <span>{army.experience}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Provisions</span>
                      <span>{army.supplies}%</span>
                    </div>
                  </div>

                  {army.commanderId && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Commandant assigné
                    </div>
                  )}

                  {!army.commanderId && availableMarshals.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (availableMarshals[0]) {
                          hireCommander(army.id, availableMarshals[0].id);
                        }
                      }}
                    >
                      Embaucher un commandant
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {myArmies.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sword className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune armée</h3>
                  <p className="text-muted-foreground text-center">
                    Créez votre première armée pour commencer vos campagnes militaires.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <div className="grid gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Contrats Actifs</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {activeContracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{contract.title}</CardTitle>
                        <Badge className={getContractStatusColor(contract.status)}>
                          {contract.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{contract.description}</p>
                      <div className="flex justify-between text-sm">
                        <span>Récompense</span>
                        <span className="font-medium">{contract.reward} or</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Durée</span>
                        <span>{contract.duration} jours</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-3">Contrats Disponibles</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {pendingContracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{contract.title}</CardTitle>
                        <Badge className={getContractStatusColor(contract.status)}>
                          En attente
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{contract.description}</p>
                      <div className="flex justify-between text-sm">
                        <span>Récompense</span>
                        <span className="font-medium">{contract.reward} or</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Durée</span>
                        <span>{contract.duration} jours</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => acceptContract(contract.id)}
                      >
                        Accepter le contrat
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Formulaire création d'armée */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Créer une Armée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="army-name">Nom de l'armée</Label>
                  <Input
                    id="army-name"
                    value={newArmyForm.name}
                    onChange={(e) => setNewArmyForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="La Garde Royale"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="army-description">Description</Label>
                  <Textarea
                    id="army-description"
                    value={newArmyForm.description}
                    onChange={(e) => setNewArmyForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Élite des forces armées..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="army-x">Position X</Label>
                    <Input
                      id="army-x"
                      type="number"
                      value={newArmyForm.x}
                      onChange={(e) => setNewArmyForm(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="army-y">Position Y</Label>
                    <Input
                      id="army-y"
                      type="number"
                      value={newArmyForm.y}
                      onChange={(e) => setNewArmyForm(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="army-units">Nombre d'unités</Label>
                  <Input
                    id="army-units"
                    type="number"
                    value={newArmyForm.unitCount}
                    onChange={(e) => setNewArmyForm(prev => ({ ...prev, unitCount: parseInt(e.target.value) || 100 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="army-type">Type d'unités</Label>
                  <Select
                    value={newArmyForm.unitType}
                    onValueChange={(value) => setNewArmyForm(prev => ({ ...prev, unitType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infantry">Infanterie</SelectItem>
                      <SelectItem value="cavalry">Cavalerie</SelectItem>
                      <SelectItem value="archers">Archers</SelectItem>
                      <SelectItem value="siege">Machines de siège</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCreateArmy} 
                  className="w-full"
                  disabled={!newArmyForm.name.trim()}
                >
                  Créer l'Armée
                </Button>
              </CardContent>
            </Card>

            {/* Formulaire création de contrat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Créer un Contrat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contract-title">Titre du contrat</Label>
                  <Input
                    id="contract-title"
                    value={newContractForm.title}
                    onChange={(e) => setNewContractForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Défense de la capitale"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-description">Description</Label>
                  <Textarea
                    id="contract-description"
                    value={newContractForm.description}
                    onChange={(e) => setNewContractForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Protéger la ville contre les invasions..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-contractor">Contractant</Label>
                  <Input
                    id="contract-contractor"
                    value={newContractForm.contractorId}
                    onChange={(e) => setNewContractForm(prev => ({ ...prev, contractorId: e.target.value }))}
                    placeholder="ID du joueur contractant"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract-reward">Récompense (or)</Label>
                    <Input
                      id="contract-reward"
                      type="number"
                      value={newContractForm.reward}
                      onChange={(e) => setNewContractForm(prev => ({ ...prev, reward: parseInt(e.target.value) || 1000 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-duration">Durée (jours)</Label>
                    <Input
                      id="contract-duration"
                      type="number"
                      value={newContractForm.duration}
                      onChange={(e) => setNewContractForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateContract} 
                  className="w-full"
                  disabled={!newContractForm.title.trim() || !newContractForm.contractorId.trim()}
                >
                  Créer le Contrat
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}