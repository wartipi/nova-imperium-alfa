// Service d'échange en temps réel pour Nova Imperium

interface ExchangeOffer {
  id: string;
  fromPlayer: string;
  toPlayer: string;
  resourcesOffered: { [key: string]: number };
  resourcesRequested: { [key: string]: number };
  uniqueItemsOffered: string[];
  uniqueItemsRequested: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
  message?: string;
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

    const offer: ExchangeOffer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromPlayer,
      toPlayer,
      resourcesOffered,
      resourcesRequested,
      uniqueItemsOffered,
      uniqueItemsRequested,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // Expire dans 5 minutes
      message
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

    // Transférer les objets uniques
    offer.uniqueItemsOffered.forEach(item => {
      console.log(`Transfert objet unique: ${item} de ${offer.fromPlayer} vers ${offer.toPlayer}`);
    });

    offer.uniqueItemsRequested.forEach(item => {
      console.log(`Transfert objet unique: ${item} de ${offer.toPlayer} vers ${offer.fromPlayer}`);
    });
  }

  // Obtenir les salles d'échange pour un joueur
  getTradeRoomsForPlayer(playerId: string): TradeRoom[] {
    return Array.from(this.tradeRooms.values()).filter(room => 
      room.participants.includes(playerId) && room.isActive
    );
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