// Service de traités pour Nova Imperium

// Types de traités avec leurs propriétés spécifiques
export type TreatyType = 
  | 'alliance_militaire'
  | 'accord_commercial' 
  | 'pacte_non_agression'
  | 'acces_militaire'
  | 'echange_ressources'
  | 'defense_mutuelle';

// Propriétés spécifiques à chaque type de traité
interface TreatyProperties {
  // Alliance militaire
  alliance_militaire?: {
    mutualDefense: boolean;
    sharedIntelligence: boolean;
    jointOperations: boolean;
    resourceSharing: number; // Pourcentage de ressources partagées
    militarySupport: 'full' | 'partial' | 'emergency_only';
  };
  
  // Accord commercial
  accord_commercial?: {
    tradeRoutes: boolean;
    tariffsReduction: number; // Pourcentage de réduction
    exclusiveDeals: boolean;
    resourcePriority: string[]; // Types de ressources prioritaires
    goldBonus: number; // Bonus en or par tour
  };
  
  // Pacte de non-agression
  pacte_non_agression?: {
    duration: number; // Durée en tours
    neutralZones: { x: number; y: number }[]; // Zones neutres
    tradingAllowed: boolean;
  };
  
  // Accès militaire
  acces_militaire?: {
    unitsAllowed: string[]; // Types d'unités autorisées
    territoryAccess: boolean;
    timeLimit: number; // Limite de temps en tours
    restrictedZones: { x: number; y: number }[]; // Zones interdites
  };
  
  // Échange de ressources
  echange_ressources?: {
    resourcesOffered: { [key: string]: number }; // Ressources offertes par le créateur
    resourcesRequested: { [key: string]: number }; // Ressources demandées en échange
    uniqueItemsOffered: string[]; // Objets uniques offerts
    uniqueItemsRequested: string[]; // Objets uniques demandés
    deliverySchedule: 'immediate' | 'monthly' | 'quarterly'; // Fréquence de livraison
    duration: number; // Durée du contrat en tours
    penalties: number; // Pénalités en cas de non-respect
    realTimeExchange: boolean; // Échange en temps réel autorisé
  };
  
  // Défense mutuelle
  defense_mutuelle?: {
    responseTime: number; // Temps de réponse en tours
    supportLevel: 'troops' | 'resources' | 'both';
    sharedTerritories: boolean;
    emergencyContact: boolean;
  };
}

interface Treaty {
  id: string;
  title: string;
  type: TreatyType;
  parties: string[]; // IDs des joueurs participants
  terms: string;
  status: 'draft' | 'proposed' | 'active' | 'expired' | 'broken';
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  signatures: { playerId: string; signedAt: number }[];
  properties: TreatyProperties;
  actionPointsCost: number;
}

class TreatyService {
  private treaties: Treaty[] = [];
  private subscribers: Map<string, ((treaties: Treaty[]) => void)[]> = new Map();

  // Créer un nouveau traité
  createTreaty(treaty: Omit<Treaty, 'id' | 'createdAt' | 'signatures' | 'status'>): Treaty {
    const newTreaty: Treaty = {
      ...treaty,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      status: 'proposed',
      signatures: [{
        playerId: treaty.createdBy,
        signedAt: Date.now()
      }],
      actionPointsCost: this.calculateTreatyCost(treaty.type)
    };

    this.treaties.push(newTreaty);
    
    // Notifier tous les participants
    treaty.parties.forEach(playerId => {
      this.notifySubscribers(playerId);
    });
    
    return newTreaty;
  }

  // Calculer le coût en Points d'Action selon le type de traité
  private calculateTreatyCost(type: TreatyType): number {
    const costs: Record<TreatyType, number> = {
      alliance_militaire: 25,
      accord_commercial: 15,
      pacte_non_agression: 10,
      acces_militaire: 8,
      echange_ressources: 12,
      defense_mutuelle: 20
    };
    return costs[type] || 15;
  }

  // Obtenir tous les traités pour un joueur
  getTreatiesForPlayer(playerId: string): Treaty[] {
    return this.treaties.filter(treaty => treaty.parties.includes(playerId));
  }

  // Obtenir un traité par ID
  getTreatyById(treatyId: string): Treaty | undefined {
    return this.treaties.find(treaty => treaty.id === treatyId);
  }

  // Signer un traité
  signTreaty(treatyId: string, playerId: string): boolean {
    const treaty = this.treaties.find(t => t.id === treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'proposed') return false;
    if (!treaty.parties.includes(playerId)) return false;
    
    // Vérifier si déjà signé
    const alreadySigned = treaty.signatures.some(sig => sig.playerId === playerId);
    if (alreadySigned) return false;
    
    // Ajouter la signature
    treaty.signatures.push({
      playerId,
      signedAt: Date.now()
    });
    
    // Vérifier si tous les participants ont signé
    const allSigned = treaty.parties.every(partyId => 
      treaty.signatures.some(sig => sig.playerId === partyId)
    );
    
    if (allSigned) {
      treaty.status = 'active';
      this.activateTreatyEffects(treaty);
    }
    
    // Notifier tous les participants
    treaty.parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  // Rompre un traité
  breakTreaty(treatyId: string, playerId: string): boolean {
    const treaty = this.treaties.find(t => t.id === treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'active') return false;
    if (!treaty.parties.includes(playerId)) return false;
    
    treaty.status = 'broken';
    
    // Notifier tous les participants
    treaty.parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  // Faire expirer un traité
  expireTreaty(treatyId: string): boolean {
    const treaty = this.treaties.find(t => t.id === treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'active') return false;
    
    treaty.status = 'expired';
    
    // Notifier tous les participants
    treaty.parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  // S'abonner aux mises à jour de traités
  subscribe(playerId: string, callback: (treaties: Treaty[]) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    
    this.subscribers.get(playerId)!.push(callback);
    
    // Envoyer les traités existants immédiatement
    callback(this.getTreatiesForPlayer(playerId));
    
    // Retourner une fonction de désabonnement
    return () => {
      const callbacks = this.subscribers.get(playerId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Notifier tous les abonnés d'un joueur
  private notifySubscribers(playerId: string): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      const treaties = this.getTreatiesForPlayer(playerId);
      callbacks.forEach(callback => callback(treaties));
    }
  }

  // Activer les effets du traité selon son type
  private activateTreatyEffects(treaty: Treaty): void {
    switch (treaty.type) {
      case 'alliance_militaire':
        this.activateMilitaryAlliance(treaty);
        break;
      case 'accord_commercial':
        this.activateCommercialAgreement(treaty);
        break;
      case 'pacte_non_agression':
        this.activateNonAggressionPact(treaty);
        break;
      case 'acces_militaire':
        this.activateMilitaryAccess(treaty);
        break;
      case 'echange_ressources':
        this.activateResourceExchange(treaty);
        break;
      case 'defense_mutuelle':
        this.activateMutualDefense(treaty);
        break;
    }
  }

  // Activer une alliance militaire
  private activateMilitaryAlliance(treaty: Treaty): void {
    const props = treaty.properties.alliance_militaire;
    if (!props) return;

    console.log(`Alliance militaire activée entre ${treaty.parties.join(', ')}`);
    
    // Effets de l'alliance militaire :
    // 1. Défense mutuelle automatique
    if (props.mutualDefense) {
      this.enableMutualDefense(treaty.parties);
    }
    
    // 2. Partage de renseignements
    if (props.sharedIntelligence) {
      this.enableIntelligenceSharing(treaty.parties);
    }
    
    // 3. Opérations conjointes
    if (props.jointOperations) {
      this.enableJointOperations(treaty.parties);
    }
    
    // 4. Partage de ressources
    if (props.resourceSharing > 0) {
      this.enableResourceSharing(treaty.parties, props.resourceSharing);
    }
  }

  // Activer un accord commercial
  private activateCommercialAgreement(treaty: Treaty): void {
    const props = treaty.properties.accord_commercial;
    if (!props) return;

    console.log(`Accord commercial activé entre ${treaty.parties.join(', ')}`);
    
    // Effets de l'accord commercial :
    // 1. Routes commerciales
    if (props.tradeRoutes) {
      this.enableTradeRoutes(treaty.parties);
    }
    
    // 2. Réduction des tarifs
    if (props.tariffsReduction > 0) {
      this.applyTariffReduction(treaty.parties, props.tariffsReduction);
    }
    
    // 3. Bonus en or
    if (props.goldBonus > 0) {
      this.applyGoldBonus(treaty.parties, props.goldBonus);
    }
  }

  // Activer un pacte de non-agression
  private activateNonAggressionPact(treaty: Treaty): void {
    const props = treaty.properties.pacte_non_agression;
    if (!props) return;

    console.log(`Pacte de non-agression activé entre ${treaty.parties.join(', ')}`);
    
    // Effets du pacte :
    // 1. Zones neutres
    if (props.neutralZones.length > 0) {
      this.establishNeutralZones(treaty.parties, props.neutralZones);
    }
    
    // 2. Commerce autorisé
    if (props.tradingAllowed) {
      this.enableTradingBetweenParties(treaty.parties);
    }
  }

  // Activer la défense mutuelle
  private activateMutualDefense(treaty: Treaty): void {
    const props = treaty.properties.defense_mutuelle;
    if (!props) return;

    console.log(`Défense mutuelle activée entre ${treaty.parties.join(', ')}`);
    
    // Effets de la défense mutuelle
    if (props.sharedTerritories) {
      this.enableSharedTerritories(treaty.parties);
    }
    
    if (props.emergencyContact) {
      this.enableEmergencyContact(treaty.parties);
    }
  }

  // Activer l'accès militaire
  private activateMilitaryAccess(treaty: Treaty): void {
    const props = treaty.properties.acces_militaire;
    if (!props) return;

    console.log(`Accès militaire activé entre ${treaty.parties.join(', ')}`);
    
    // Effets de l'accès militaire :
    // 1. Passage d'unités autorisées
    if (props.unitsAllowed.length > 0) {
      this.enableMilitaryPassage(treaty.parties, props.unitsAllowed);
    }
    
    // 2. Accès aux territoires
    if (props.territoryAccess) {
      this.enableTerritoryAccess(treaty.parties);
    }
    
    // 3. Zones restreintes
    if (props.restrictedZones.length > 0) {
      this.establishRestrictedZones(treaty.parties, props.restrictedZones);
    }
  }

  // Activer l'échange de ressources
  private activateResourceExchange(treaty: Treaty): void {
    const props = treaty.properties.echange_ressources;
    if (!props) return;

    console.log(`Échange de ressources activé entre ${treaty.parties.join(', ')}`);
    
    // Effets de l'échange de ressources :
    // 1. Mise en place des transferts automatiques
    this.setupResourceTransfers(treaty.parties, props.resourcesOffered, props.resourcesRequested);
    
    // 2. Échange d'objets uniques
    if (props.uniqueItemsOffered.length > 0 || props.uniqueItemsRequested.length > 0) {
      this.setupUniqueItemExchange(treaty.parties, props.uniqueItemsOffered, props.uniqueItemsRequested);
    }
    
    // 3. Échange en temps réel
    if (props.realTimeExchange) {
      this.enableRealTimeExchange(treaty.parties);
    }
    
    // 4. Planification selon la fréquence
    this.scheduleResourceDeliveries(treaty.parties, props.deliverySchedule, props.duration);
    
    // 5. Système de pénalités
    if (props.penalties > 0) {
      this.setupPenaltySystem(treaty.parties, props.penalties);
    }
  }



  // Méthodes d'activation des effets (à implémenter selon la logique du jeu)
  private enableMutualDefense(parties: string[]): void {
    // Logique de défense mutuelle
    console.log(`Défense mutuelle activée pour: ${parties.join(', ')}`);
  }

  private enableIntelligenceSharing(parties: string[]): void {
    // Logique de partage de renseignements
    console.log(`Partage de renseignements activé pour: ${parties.join(', ')}`);
  }

  private enableJointOperations(parties: string[]): void {
    // Logique d'opérations conjointes
    console.log(`Opérations conjointes activées pour: ${parties.join(', ')}`);
  }

  private enableResourceSharing(parties: string[], percentage: number): void {
    // Logique de partage de ressources
    console.log(`Partage de ressources (${percentage}%) activé pour: ${parties.join(', ')}`);
  }

  private enableTradeRoutes(parties: string[]): void {
    // Logique de routes commerciales
    console.log(`Routes commerciales activées pour: ${parties.join(', ')}`);
  }

  private applyTariffReduction(parties: string[], reduction: number): void {
    // Logique de réduction des tarifs
    console.log(`Réduction des tarifs (${reduction}%) activée pour: ${parties.join(', ')}`);
  }

  private applyGoldBonus(parties: string[], bonus: number): void {
    // Logique de bonus en or
    console.log(`Bonus en or (${bonus} par tour) activé pour: ${parties.join(', ')}`);
  }

  private establishNeutralZones(parties: string[], zones: { x: number; y: number }[]): void {
    // Logique des zones neutres
    console.log(`Zones neutres établies pour: ${parties.join(', ')}`);
  }

  private enableMilitaryPassage(parties: string[], allowedUnits?: string[]): void {
    // Logique de passage militaire
    if (allowedUnits) {
      console.log(`Passage militaire activé pour: ${parties.join(', ')} (unités autorisées: ${allowedUnits.join(', ')})`);
    } else {
      console.log(`Passage militaire activé pour: ${parties.join(', ')}`);
    }
  }

  private enableTradingBetweenParties(parties: string[]): void {
    // Logique de commerce entre parties
    console.log(`Commerce autorisé entre: ${parties.join(', ')}`);
  }

  private enableSharedTerritories(parties: string[]): void {
    // Logique de territoires partagés
    console.log(`Territoires partagés activés pour: ${parties.join(', ')}`);
  }

  private enableEmergencyContact(parties: string[]): void {
    // Logique de contact d'urgence
    console.log(`Contact d'urgence activé pour: ${parties.join(', ')}`);
  }

  private enableTerritoryAccess(parties: string[]): void {
    // Logique d'accès aux territoires
    console.log(`Accès aux territoires activé pour: ${parties.join(', ')}`);
  }

  private establishRestrictedZones(parties: string[], zones: { x: number; y: number }[]): void {
    // Logique de zones restreintes
    console.log(`Zones restreintes établies pour: ${parties.join(', ')} (${zones.length} zones)`);
  }

  private setupResourceTransfers(parties: string[], offered: { [key: string]: number }, requested: { [key: string]: number }): void {
    // Logique de transferts de ressources
    console.log(`Transferts de ressources configurés pour: ${parties.join(', ')}`);
    console.log(`Ressources offertes:`, offered);
    console.log(`Ressources demandées:`, requested);
  }

  private scheduleResourceDeliveries(parties: string[], schedule: string, duration: number): void {
    // Logique de planification des livraisons
    console.log(`Livraisons planifiées (${schedule}) pour: ${parties.join(', ')} pendant ${duration} tours`);
  }

  private setupPenaltySystem(parties: string[], penalties: number): void {
    // Logique de système de pénalités
    console.log(`Système de pénalités (${penalties} PA) configuré pour: ${parties.join(', ')}`);
  }

  private setupUniqueItemExchange(parties: string[], offered: string[], requested: string[]): void {
    // Logique d'échange d'objets uniques
    console.log(`Échange d'objets uniques configuré pour: ${parties.join(', ')}`);
    console.log(`Objets uniques offerts:`, offered);
    console.log(`Objets uniques demandés:`, requested);
  }

  private enableRealTimeExchange(parties: string[]): void {
    // Logique d'échange en temps réel
    console.log(`Échange en temps réel activé pour: ${parties.join(', ')}`);
    // Ici on pourrait configurer des WebSockets ou des polling rapides
  }



  // Obtenir les informations sur les types de traités
  getTreatyTypes(): Array<{
    type: TreatyType;
    name: string;
    description: string;
    cost: number;
    icon: string;
  }> {
    return [
      {
        type: 'alliance_militaire',
        name: 'Alliance Militaire',
        description: 'Défense mutuelle, partage de renseignements, opérations conjointes',
        cost: 25,
        icon: '⚔️'
      },
      {
        type: 'accord_commercial',
        name: 'Accord Commercial',
        description: 'Routes commerciales, réduction des tarifs, bonus économiques',
        cost: 15,
        icon: '💰'
      },
      {
        type: 'pacte_non_agression',
        name: 'Pacte de Non-Agression',
        description: 'Zones neutres, commerce autorisé, cessez-le-feu',
        cost: 10,
        icon: '🕊️'
      },
      {
        type: 'acces_militaire',
        name: 'Accès Militaire',
        description: 'Passage d\'unités militaires, accès aux territoires',
        cost: 8,
        icon: '🚶'
      },
      {
        type: 'echange_ressources',
        name: 'Échange de Ressources',
        description: 'Échange direct de ressources et objets uniques en temps réel',
        cost: 12,
        icon: '🔄'
      },
      {
        type: 'defense_mutuelle',
        name: 'Défense Mutuelle',
        description: 'Soutien défensif, territoires partagés, contact d\'urgence',
        cost: 20,
        icon: '🛡️'
      }
    ];
  }

  // Obtenir des statistiques
  getStats(playerId: string): {
    totalTreaties: number;
    activeTreaties: number;
    proposedTreaties: number;
    createdTreaties: number;
    signedTreaties: number;
  } {
    const playerTreaties = this.getTreatiesForPlayer(playerId);
    
    return {
      totalTreaties: playerTreaties.length,
      activeTreaties: playerTreaties.filter(t => t.status === 'active').length,
      proposedTreaties: playerTreaties.filter(t => t.status === 'proposed').length,
      createdTreaties: playerTreaties.filter(t => t.createdBy === playerId).length,
      signedTreaties: playerTreaties.filter(t => 
        t.signatures.some(sig => sig.playerId === playerId)
      ).length
    };
  }

  // Obtenir les traités par type
  getTreatiesByType(type: Treaty['type']): Treaty[] {
    return this.treaties.filter(treaty => treaty.type === type);
  }

  // Vérifier si deux joueurs ont un traité actif d'un type donné
  hasActiveTreaty(playerId1: string, playerId2: string, type?: Treaty['type']): boolean {
    return this.treaties.some(treaty => 
      treaty.status === 'active' &&
      treaty.parties.includes(playerId1) &&
      treaty.parties.includes(playerId2) &&
      (!type || treaty.type === type)
    );
  }

  // Nettoyer les anciens traités expirés
  cleanExpiredTreaties(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    this.treaties = this.treaties.filter(treaty => {
      if (treaty.status === 'expired' && now - treaty.createdAt > maxAge) {
        return false;
      }
      return true;
    });
  }

  // Obtenir tous les traités (admin)
  getAllTreaties(): Treaty[] {
    return this.treaties;
  }
}

export const treatyService = new TreatyService();
export type { Treaty };