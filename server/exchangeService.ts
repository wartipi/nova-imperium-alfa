// Service d'échange en temps réel pour Nova Imperium

interface UniqueItem {
  id: string;
  name: string;
  type: 'carte' | 'objet_magique' | 'artefact' | 'relique' | 'document' | 'equipement_legendaire';
  rarity: 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';
  description: string;
  effects?: string[];
  requirements?: string[];
  value: number;
  tradeable: boolean;
  ownerId: string;
  createdAt: number;
  metadata?: { [key: string]: any };
}

interface ExchangeOffer {
  id: string;
  fromPlayer: string;
  toPlayer: string;
  resourcesOffered: { [key: string]: number };
  resourcesRequested: { [key: string]: number };
  uniqueItemsOffered: UniqueItem[];
  uniqueItemsRequested: string[]; // IDs des objets demandés
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
  message?: string;
  offerType: 'resources' | 'unique_items' | 'mixed';
}

interface TradeRoom {
  id: string;
  participants: string[];
  treatyId: string;
  activeOffers: ExchangeOffer[];
  isActive: boolean;
  createdAt: number;
}

class ExchangeService {
  private tradeRooms: Map<string, TradeRoom> = new Map();
  private activeOffers: Map<string, ExchangeOffer> = new Map();
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private uniqueItems: Map<string, UniqueItem> = new Map();
  private playerInventories: Map<string, string[]> = new Map(); // playerId -> itemIds

  constructor() {
    // Service d'échange initialisé vide
    // Les objets uniques seront créés dynamiquement via les actions du jeu
  }

  // Créer une salle d'échange basée sur un traité
  createTradeRoom(treatyId: string, participants: string[]): TradeRoom {
    const room: TradeRoom = {
      id: `trade_${treatyId}_${Date.now()}`,
      participants,
      treatyId,
      activeOffers: [],
      isActive: true,
      createdAt: Date.now()
    };

    this.tradeRooms.set(room.id, room);
    
    // Notifier tous les participants
    participants.forEach(playerId => {
      this.notifySubscribers(playerId, {
        type: 'room_created',
        room: room
      });
    });

    return room;
  }

  // Créer un objet unique
  createUniqueItem(
    name: string,
    type: UniqueItem['type'],
    rarity: UniqueItem['rarity'],
    description: string,
    ownerId: string,
    effects?: string[],
    requirements?: string[],
    value: number = 100,
    metadata?: { [key: string]: any }
  ): UniqueItem {
    const item: UniqueItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      rarity,
      description,
      effects: effects || [],
      requirements: requirements || [],
      value,
      tradeable: true,
      ownerId,
      createdAt: Date.now(),
      metadata: metadata || {}
    };

    this.uniqueItems.set(item.id, item);
    
    // Ajouter à l'inventaire du joueur
    if (!this.playerInventories.has(ownerId)) {
      this.playerInventories.set(ownerId, []);
    }
    this.playerInventories.get(ownerId)!.push(item.id);

    return item;
  }

  // Créer une offre d'échange
  createExchangeOffer(
    roomId: string,
    fromPlayer: string,
    toPlayer: string,
    resourcesOffered: { [key: string]: number },
    resourcesRequested: { [key: string]: number },
    uniqueItemsOffered: string[] = [],
    uniqueItemsRequested: string[] = [],
    message?: string
  ): ExchangeOffer | null {
    const room = this.tradeRooms.get(roomId);
    if (!room || !room.isActive) return null;

    // Vérifier que les joueurs font partie de la salle
    if (!room.participants.includes(fromPlayer) || !room.participants.includes(toPlayer)) {
      return null;
    }

    // Valider les objets uniques offerts
    const validUniqueItemsOffered: UniqueItem[] = [];
    for (const itemId of uniqueItemsOffered) {
      const item = this.uniqueItems.get(itemId);
      if (item && item.ownerId === fromPlayer && item.tradeable) {
        validUniqueItemsOffered.push(item);
      }
    }

    // Déterminer le type d'offre
    const hasResources = Object.keys(resourcesOffered).length > 0 || Object.keys(resourcesRequested).length > 0;
    const hasUniqueItems = validUniqueItemsOffered.length > 0 || uniqueItemsRequested.length > 0;
    
    let offerType: 'resources' | 'unique_items' | 'mixed';
    if (hasResources && hasUniqueItems) {
      offerType = 'mixed';
    } else if (hasUniqueItems) {
      offerType = 'unique_items';
    } else {
      offerType = 'resources';
    }

    const offer: ExchangeOffer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromPlayer,
      toPlayer,
      resourcesOffered,
      resourcesRequested,
      uniqueItemsOffered: validUniqueItemsOffered,
      uniqueItemsRequested,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // Expire dans 5 minutes
      message,
      offerType
    };

    this.activeOffers.set(offer.id, offer);
    room.activeOffers.push(offer);

    // Notifier le destinataire
    this.notifySubscribers(toPlayer, {
      type: 'offer_received',
      offer: offer
    });

    // Notifier l'expéditeur
    this.notifySubscribers(fromPlayer, {
      type: 'offer_sent',
      offer: offer
    });

    return offer;
  }

  // Accepter une offre d'échange
  acceptOffer(offerId: string, playerId: string): boolean {
    const offer = this.activeOffers.get(offerId);
    if (!offer || offer.status !== 'pending' || offer.toPlayer !== playerId) {
      return false;
    }

    // Vérifier que l'offre n'a pas expiré
    if (Date.now() > offer.expiresAt) {
      offer.status = 'expired';
      return false;
    }

    offer.status = 'accepted';

    // Exécuter l'échange
    this.executeExchange(offer);

    // Notifier les deux joueurs
    this.notifySubscribers(offer.fromPlayer, {
      type: 'offer_accepted',
      offer: offer
    });

    this.notifySubscribers(offer.toPlayer, {
      type: 'offer_accepted',
      offer: offer
    });

    return true;
  }

  // Rejeter une offre d'échange
  rejectOffer(offerId: string, playerId: string): boolean {
    const offer = this.activeOffers.get(offerId);
    if (!offer || offer.status !== 'pending' || offer.toPlayer !== playerId) {
      return false;
    }

    offer.status = 'rejected';

    // Notifier les deux joueurs
    this.notifySubscribers(offer.fromPlayer, {
      type: 'offer_rejected',
      offer: offer
    });

    this.notifySubscribers(offer.toPlayer, {
      type: 'offer_rejected',
      offer: offer
    });

    return true;
  }

  // Exécuter l'échange (logique de transfert de ressources)
  private executeExchange(offer: ExchangeOffer): void {
    console.log(`Échange exécuté entre ${offer.fromPlayer} et ${offer.toPlayer}`);
    
    // Ici on implémenterait la logique réelle de transfert de ressources
    // Pour l'instant, on simule juste le processus
    
    // Transférer les ressources
    Object.entries(offer.resourcesOffered).forEach(([resource, amount]) => {
      console.log(`Transfert: ${amount} ${resource} de ${offer.fromPlayer} vers ${offer.toPlayer}`);
    });

    Object.entries(offer.resourcesRequested).forEach(([resource, amount]) => {
      console.log(`Transfert: ${amount} ${resource} de ${offer.toPlayer} vers ${offer.fromPlayer}`);
    });

    // Transférer les objets uniques offerts
    offer.uniqueItemsOffered.forEach(item => {
      this.transferUniqueItem(item.id, offer.fromPlayer, offer.toPlayer);
      console.log(`Transfert objet unique: ${item.name} de ${offer.fromPlayer} vers ${offer.toPlayer}`);
    });

    // Transférer les objets uniques demandés
    offer.uniqueItemsRequested.forEach(itemId => {
      this.transferUniqueItem(itemId, offer.toPlayer, offer.fromPlayer);
      const item = this.uniqueItems.get(itemId);
      console.log(`Transfert objet unique: ${item?.name} de ${offer.toPlayer} vers ${offer.fromPlayer}`);
    });
  }

  // Obtenir les salles d'échange pour un joueur
  getTradeRoomsForPlayer(playerId: string): TradeRoom[] {
    return Array.from(this.tradeRooms.values()).filter(room => 
      room.participants.includes(playerId) && room.isActive
    );
  }

  // Transférer un objet unique entre joueurs
  private transferUniqueItem(itemId: string, fromPlayer: string, toPlayer: string): boolean {
    const item = this.uniqueItems.get(itemId);
    if (!item || item.ownerId !== fromPlayer || !item.tradeable) {
      return false;
    }

    // Retirer de l'inventaire du joueur source
    const fromInventory = this.playerInventories.get(fromPlayer);
    if (fromInventory) {
      const index = fromInventory.indexOf(itemId);
      if (index > -1) {
        fromInventory.splice(index, 1);
      }
    }

    // Ajouter à l'inventaire du joueur destination
    if (!this.playerInventories.has(toPlayer)) {
      this.playerInventories.set(toPlayer, []);
    }
    this.playerInventories.get(toPlayer)!.push(itemId);

    // Mettre à jour le propriétaire
    item.ownerId = toPlayer;
    this.uniqueItems.set(itemId, item);

    return true;
  }

  // Obtenir l'inventaire d'un joueur
  getPlayerInventory(playerId: string): UniqueItem[] {
    const itemIds = this.playerInventories.get(playerId) || [];
    return itemIds.map(id => this.uniqueItems.get(id)).filter(item => item !== undefined) as UniqueItem[];
  }

  // Obtenir les détails d'un objet unique
  getUniqueItem(itemId: string): UniqueItem | undefined {
    return this.uniqueItems.get(itemId);
  }

  // Vider complètement l'inventaire d'un joueur
  clearPlayerInventory(playerId: string): boolean {
    try {
      // Supprimer tous les objets du joueur
      const inventory = this.playerInventories.get(playerId) || [];
      inventory.forEach(itemId => {
        this.uniqueItems.delete(itemId);
      });
      
      // Vider l'inventaire
      this.playerInventories.set(playerId, []);
      
      return true;
    } catch (error) {
      console.error('Erreur lors du vidage de l\'inventaire:', error);
      return false;
    }
  }

  // Vider tous les inventaires et objets (pour debug/reset)
  clearAllInventories(): boolean {
    try {
      this.uniqueItems.clear();
      this.playerInventories.clear();
      return true;
    } catch (error) {
      console.error('Erreur lors du vidage complet:', error);
      return false;
    }
  }



  // Obtenir les offres actives pour un joueur
  getActiveOffersForPlayer(playerId: string): ExchangeOffer[] {
    return Array.from(this.activeOffers.values()).filter(offer => 
      (offer.fromPlayer === playerId || offer.toPlayer === playerId) && 
      offer.status === 'pending' &&
      Date.now() < offer.expiresAt
    );
  }

  // S'abonner aux mises à jour
  subscribe(playerId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }

    this.subscribers.get(playerId)!.push(callback);

    // Envoyer l'état initial
    callback({
      type: 'initial_state',
      tradeRooms: this.getTradeRoomsForPlayer(playerId),
      activeOffers: this.getActiveOffersForPlayer(playerId)
    });

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

  // Notifier les abonnés
  private notifySubscribers(playerId: string, data: any): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Nettoyer les offres expirées
  cleanupExpiredOffers(): void {
    const now = Date.now();
    
    Array.from(this.activeOffers.entries()).forEach(([offerId, offer]) => {
      if (now > offer.expiresAt && offer.status === 'pending') {
        offer.status = 'expired';
        
        // Notifier les joueurs
        this.notifySubscribers(offer.fromPlayer, {
          type: 'offer_expired',
          offer: offer
        });
        
        this.notifySubscribers(offer.toPlayer, {
          type: 'offer_expired',
          offer: offer
        });
      }
    });
  }

  // Fermer une salle d'échange
  closeTradeRoom(roomId: string): boolean {
    const room = this.tradeRooms.get(roomId);
    if (!room) return false;

    room.isActive = false;
    
    // Notifier tous les participants
    room.participants.forEach(playerId => {
      this.notifySubscribers(playerId, {
        type: 'room_closed',
        roomId: roomId
      });
    });

    return true;
  }
}

export const exchangeService = new ExchangeService();

// Nettoyer les offres expirées toutes les minutes
setInterval(() => {
  exchangeService.cleanupExpiredOffers();
}, 60000);

export { UniqueItem };