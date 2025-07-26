// Service de marché publique pour Nova Imperium - Version Hybride avec Enchères

interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  
  // Type d'item
  itemType: 'resource' | 'unique_item';
  
  // Pour les ressources
  resourceType?: string; // 'wood', 'stone', 'iron', etc.
  quantity?: number;
  
  // Pour les objets uniques
  uniqueItemId?: string;
  uniqueItem?: {
    name: string;
    type: 'carte' | 'objet_magique' | 'artefact' | 'relique' | 'document' | 'equipement_legendaire';
    rarity: 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';
    description: string;
    effects?: string[];
    value: number;
  };
  
  // Type de vente (hybride)
  saleType: 'direct_sale' | 'auction';
  
  // Pour vente directe
  fixedPrice?: number;
  
  // Pour enchères
  startingBid?: number;
  currentBid?: number;
  currentBidder?: string;
  bidHistory?: Array<{
    playerId: string;
    playerName: string;
    amount: number;
    timestamp: number;
  }>;
  auctionEndTurn?: number; // Turn où l'enchère se termine
  minBidIncrement?: number; // Montant minimum pour une nouvelle enchère
  
  // Métadonnées communes
  status: 'active' | 'sold' | 'expired' | 'cancelled';
  createdAt: number;
  description?: string;
  tags?: string[];
}

interface BidResult {
  success: boolean;
  message: string;
  newCurrentBid?: number;
  previousBidder?: string;
}

class MarketplaceService {
  private marketItems: Map<string, MarketplaceItem> = new Map();
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  
  constructor() {
    console.log('MarketplaceService initialized');
    this.initializeDemoItems();
  }

  // Initialiser quelques objets de démonstration
  private initializeDemoItems() {
    // Vente directe de bois
    this.createDirectSale(
      'demo_seller',
      'Marchand Demo',
      'resource',
      25,
      {
        resourceType: 'wood',
        quantity: 50,
        description: 'Bois de qualité premium',
        tags: ['premium', 'construction']
      }
    );

    // Enchère de fer
    this.createAuction(
      'demo_auction',
      'Encherisseur Demo',
      'resource',
      15,
      1, // currentTurn
      {
        resourceType: 'iron',
        quantity: 30,
        minBidIncrement: 2,
        description: 'Fer de guerre rare',
        tags: ['rare', 'guerre']
      }
    );

    // Objet magique en vente directe
    this.createDirectSale(
      'demo_mage',
      'Mage Demo',
      'unique_item',
      100,
      {
        uniqueItem: {
          name: 'Amulette de Protection',
          type: 'objet_magique',
          rarity: 'rare',
          description: 'Protège des malédictions',
          effects: ['protection +5', 'resistance magie +10'],
          value: 150
        },
        description: 'Objet magique trouvé dans les ruines',
        tags: ['magique', 'protection']
      }
    );
    
    console.log('Demo items initialized:', this.marketItems.size, 'items');
  }

  // === GESTION DES VENTES DIRECTES ===
  
  createDirectSale(
    sellerId: string,
    sellerName: string,
    itemType: 'resource' | 'unique_item',
    price: number,
    options: {
      resourceType?: string;
      quantity?: number;
      uniqueItemId?: string;
      uniqueItem?: any;
      description?: string;
      tags?: string[];
    }
  ): MarketplaceItem {
    const item: MarketplaceItem = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sellerId,
      sellerName,
      itemType,
      saleType: 'direct_sale',
      fixedPrice: price,
      status: 'active',
      createdAt: Date.now(),
      ...options
    };

    this.marketItems.set(item.id, item);
    
    // Notifier tous les abonnés
    this.notifyAllSubscribers({
      type: 'item_listed',
      item: item
    });

    return item;
  }

  // === GESTION DES ENCHÈRES ===
  
  createAuction(
    sellerId: string,
    sellerName: string,
    itemType: 'resource' | 'unique_item',
    startingBid: number,
    currentTurn: number,
    options: {
      resourceType?: string;
      quantity?: number;
      uniqueItemId?: string;
      uniqueItem?: any;
      description?: string;
      tags?: string[];
      minBidIncrement?: number;
    }
  ): MarketplaceItem {
    const item: MarketplaceItem = {
      id: `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sellerId,
      sellerName,
      itemType,
      saleType: 'auction',
      startingBid,
      currentBid: startingBid,
      bidHistory: [],
      auctionEndTurn: currentTurn + 1, // Se termine au prochain tour
      minBidIncrement: options.minBidIncrement || Math.max(1, Math.floor(startingBid * 0.1)),
      status: 'active',
      createdAt: Date.now(),
      ...options
    };

    this.marketItems.set(item.id, item);
    
    // Notifier tous les abonnés
    this.notifyAllSubscribers({
      type: 'auction_created',
      item: item
    });

    return item;
  }

  placeBid(itemId: string, playerId: string, playerName: string, bidAmount: number): BidResult {
    const item = this.marketItems.get(itemId);
    
    if (!item || item.saleType !== 'auction' || item.status !== 'active') {
      return { success: false, message: 'Enchère non disponible' };
    }

    if (playerId === item.sellerId) {
      return { success: false, message: 'Vous ne pouvez pas enchérir sur votre propre objet' };
    }

    const minBid = (item.currentBid || item.startingBid || 0) + (item.minBidIncrement || 1);
    if (bidAmount < minBid) {
      return { 
        success: false, 
        message: `Enchère trop faible. Minimum: ${minBid} or` 
      };
    }

    // Enregistrer l'enchère
    const previousBidder = item.currentBidder;
    item.currentBid = bidAmount;
    item.currentBidder = playerId;
    
    if (!item.bidHistory) item.bidHistory = [];
    item.bidHistory.push({
      playerId,
      playerName,
      amount: bidAmount,
      timestamp: Date.now()
    });

    // Notifier le vendeur et l'ancien enchérisseur
    if (previousBidder && previousBidder !== playerId) {
      this.notifySubscribers(previousBidder, {
        type: 'bid_outbid',
        item: item,
        newBidder: playerName,
        newBid: bidAmount
      });
    }

    this.notifySubscribers(item.sellerId, {
      type: 'bid_received',
      item: item,
      bidder: playerName,
      amount: bidAmount
    });

    // Notifier tous les autres pour mise à jour temps réel
    this.notifyAllSubscribers({
      type: 'bid_placed',
      item: item
    });

    return { 
      success: true, 
      message: 'Enchère placée avec succès',
      newCurrentBid: bidAmount,
      previousBidder
    };
  }

  // === ACHAT DIRECT ===
  
  purchaseDirectSale(itemId: string, buyerId: string, buyerName: string): { success: boolean; message: string; item?: MarketplaceItem } {
    const item = this.marketItems.get(itemId);
    
    if (!item || item.saleType !== 'direct_sale' || item.status !== 'active') {
      return { success: false, message: 'Objet non disponible à la vente' };
    }

    if (buyerId === item.sellerId) {
      return { success: false, message: 'Vous ne pouvez pas acheter votre propre objet' };
    }

    // Marquer comme vendu
    item.status = 'sold';
    
    // Notifier le vendeur
    this.notifySubscribers(item.sellerId, {
      type: 'item_sold',
      item: item,
      buyer: buyerName
    });

    // Notifier tous les autres
    this.notifyAllSubscribers({
      type: 'item_purchased',
      item: item
    });

    return { success: true, message: 'Achat réussi', item };
  }

  // === RÉSOLUTION DES ENCHÈRES (APPELÉ EN FIN DE TOUR) ===
  
  resolveAuctions(currentTurn: number): Array<{ item: MarketplaceItem; result: 'sold' | 'extended' | 'expired' }> {
    const results: Array<{ item: MarketplaceItem; result: 'sold' | 'extended' | 'expired' }> = [];
    
    Array.from(this.marketItems.entries()).forEach(([itemId, item]) => {
      if (item.saleType !== 'auction' || item.status !== 'active') return;
      if (!item.auctionEndTurn || currentTurn < item.auctionEndTurn) return;

      if (item.currentBidder && item.currentBid && item.currentBid > (item.startingBid || 0)) {
        // Il y a eu des enchères - vendre l'objet
        item.status = 'sold';
        
        // Notifier le gagnant
        this.notifySubscribers(item.currentBidder, {
          type: 'auction_won',
          item: item,
          finalPrice: item.currentBid
        });

        // Notifier le vendeur
        this.notifySubscribers(item.sellerId, {
          type: 'auction_completed',
          item: item,
          winner: item.currentBidder,
          finalPrice: item.currentBid
        });

        results.push({ item, result: 'sold' });
      } else {
        // Aucune enchère - prolonger l'enchère
        item.auctionEndTurn = currentTurn + 1;
        
        // Notifier le vendeur
        this.notifySubscribers(item.sellerId, {
          type: 'auction_extended',
          item: item,
          newEndTurn: item.auctionEndTurn
        });

        results.push({ item, result: 'extended' });
      }
    });

    // Notifier tous les changements
    if (results.length > 0) {
      this.notifyAllSubscribers({
        type: 'auctions_resolved',
        results: results
      });
    }

    return results;
  }

  // === GESTION DES DONNÉES ===
  
  getAllItems(): MarketplaceItem[] {
    return Array.from(this.marketItems.values());
  }

  getItem(itemId: string): MarketplaceItem | undefined {
    return this.marketItems.get(itemId);
  }

  getActiveItems(): MarketplaceItem[] {
    return Array.from(this.marketItems.values())
      .filter(item => item.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getItemsByType(itemType: 'resource' | 'unique_item'): MarketplaceItem[] {
    return this.getActiveItems().filter(item => item.itemType === itemType);
  }

  getItemsBySeller(sellerId: string): MarketplaceItem[] {
    return Array.from(this.marketItems.values())
      .filter(item => item.sellerId === sellerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  searchItems(query: string): MarketplaceItem[] {
    const searchTerm = query.toLowerCase();
    return this.getActiveItems().filter(item => {
      const searchableText = [
        item.resourceType,
        item.uniqueItem?.name,
        item.uniqueItem?.description,
        item.description,
        ...(item.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }

  removeItem(itemId: string, sellerId: string): boolean {
    const item = this.marketItems.get(itemId);
    if (!item || item.sellerId !== sellerId) return false;

    if (item.saleType === 'auction' && item.currentBidder) {
      // Ne peut pas supprimer une enchère avec des offres
      return false;
    }

    item.status = 'cancelled';
    
    this.notifyAllSubscribers({
      type: 'item_removed',
      item: item
    });

    return true;
  }

  // === SYSTÈME DE NOTIFICATIONS ===
  
  subscribe(playerId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    this.subscribers.get(playerId)!.push(callback);

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

  private notifySubscribers(playerId: string, data: any): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in marketplace notification callback:', error);
        }
      });
    }
  }

  private notifyAllSubscribers(data: any): void {
    Array.from(this.subscribers.entries()).forEach(([, callbacks]) => {
      callbacks.forEach((callback: (data: any) => void) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in marketplace notification callback:', error);
        }
      });
    });
  }
}

// Instance globale du service
export const marketplaceService = new MarketplaceService();
export type { MarketplaceItem, BidResult };