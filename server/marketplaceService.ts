import { eq, and, or, lt, desc, sql, ne, gt } from "drizzle-orm";
import { db } from "./db";
import { marketplaceItems } from "../shared/schema";
import type { MarketplaceItem } from "../shared/schema";

interface ExchangeService {
  getUniqueItemById(itemId: string): any;
  getPlayerInventory(playerId: string): string[];
  getPlayerItem(playerId: string, itemId: string): any;
}

interface BidResult {
  success: boolean;
  message: string;
  newCurrentBid?: number;
  previousBidder?: string;
}

class MarketplaceService {
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();
  private exchangeService: ExchangeService | null = null;
  private initialized: boolean = false;
  
  constructor(exchangeService?: ExchangeService) {
    console.log('MarketplaceService initialized');
    this.exchangeService = exchangeService || null;
    this.initializeDemoItems();
  }

  private async initializeDemoItems() {
    if (this.initialized) return;
    
    const existing = await db.select().from(marketplaceItems).limit(1);
    if (existing.length > 0) {
      this.initialized = true;
      console.log('Demo items already exist, skipping initialization');
      return;
    }
    
    await this.createDirectSale(
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

    await this.createAuction(
      'demo_auction',
      'Encherisseur Demo',
      'resource',
      15,
      1,
      {
        resourceType: 'iron',
        quantity: 30,
        minBidIncrement: 2,
        description: 'Fer de guerre rare',
        tags: ['rare', 'guerre']
      }
    );

    await this.createDirectSale(
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
    
    this.initialized = true;
    console.log('Demo items initialized: 3 items');
  }

  async createDirectSale(
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
  ): Promise<MarketplaceItem> {
    const id = `sale_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [item] = await db.insert(marketplaceItems).values({
      id,
      sellerId,
      sellerName,
      itemType,
      saleType: 'direct_sale',
      fixedPrice: price,
      status: 'active',
      createdAt: new Date(),
      resourceType: options.resourceType || null,
      quantity: options.quantity || null,
      uniqueItemId: options.uniqueItemId || null,
      uniqueItem: options.uniqueItem || null,
      description: options.description || null,
      tags: options.tags || []
    }).returning();

    this.notifyAllSubscribers({
      type: 'item_listed',
      item: item
    });

    return item;
  }

  async createAuction(
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
  ): Promise<MarketplaceItem> {
    const id = `auction_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const minBidIncrement = options.minBidIncrement || Math.max(1, Math.floor(startingBid * 0.1));
    
    const [item] = await db.insert(marketplaceItems).values({
      id,
      sellerId,
      sellerName,
      itemType,
      saleType: 'auction',
      startingBid,
      currentBid: startingBid,
      bids: [],
      endTurn: currentTurn + 1,
      minBidIncrement,
      status: 'active',
      createdAt: new Date(),
      resourceType: options.resourceType || null,
      quantity: options.quantity || null,
      uniqueItemId: options.uniqueItemId || null,
      uniqueItem: options.uniqueItem || null,
      description: options.description || null,
      tags: options.tags || []
    }).returning();

    this.notifyAllSubscribers({
      type: 'auction_created',
      item: item
    });

    return item;
  }

  async placeBid(itemId: string, playerId: string, playerName: string, bidAmount: number): Promise<BidResult> {
    const [item] = await db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));
    
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

    const previousBidder = item.highestBidderId;
    const bids = (item.bids as any[]) || [];
    bids.push({
      bidderId: playerId,
      bidderName: playerName,
      amount: bidAmount,
      timestamp: Date.now()
    });

    await db.update(marketplaceItems)
      .set({
        currentBid: bidAmount,
        highestBidderId: playerId,
        highestBidderName: playerName,
        bids
      })
      .where(eq(marketplaceItems.id, itemId));

    if (previousBidder && previousBidder !== playerId) {
      this.notifySubscribers(previousBidder, {
        type: 'bid_outbid',
        item: { ...item, currentBid: bidAmount, highestBidderId: playerId },
        newBidder: playerName,
        newBid: bidAmount
      });
    }

    this.notifySubscribers(item.sellerId, {
      type: 'bid_received',
      item: { ...item, currentBid: bidAmount, highestBidderId: playerId },
      bidder: playerName,
      amount: bidAmount
    });

    this.notifyAllSubscribers({
      type: 'bid_placed',
      item: { ...item, currentBid: bidAmount, highestBidderId: playerId }
    });

    return { 
      success: true, 
      message: 'Enchère placée avec succès',
      newCurrentBid: bidAmount,
      previousBidder: previousBidder || undefined
    };
  }

  async purchaseDirectSale(itemId: string, buyerId: string, buyerName: string): Promise<{ success: boolean; message: string; item?: MarketplaceItem }> {
    const [item] = await db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));
    
    if (!item || item.saleType !== 'direct_sale' || item.status !== 'active') {
      return { success: false, message: 'Objet non disponible à la vente' };
    }

    if (buyerId === item.sellerId) {
      return { success: false, message: 'Vous ne pouvez pas acheter votre propre objet' };
    }

    await db.update(marketplaceItems)
      .set({ 
        status: 'sold',
        buyerId,
        buyerName,
        soldAt: new Date()
      })
      .where(eq(marketplaceItems.id, itemId));

    const updatedItem = { ...item, status: 'sold' as const, buyerId, buyerName };

    this.notifySubscribers(item.sellerId, {
      type: 'item_sold',
      item: updatedItem,
      buyer: buyerName
    });

    this.notifyAllSubscribers({
      type: 'item_purchased',
      item: updatedItem
    });

    return { success: true, message: 'Achat réussi', item: updatedItem };
  }

  async resolveAuctions(currentTurn: number): Promise<Array<{ item: MarketplaceItem; result: 'sold' | 'extended' | 'expired' }>> {
    const results: Array<{ item: MarketplaceItem; result: 'sold' | 'extended' | 'expired' }> = [];
    
    const auctions = await db.select().from(marketplaceItems)
      .where(and(
        eq(marketplaceItems.saleType, 'auction'),
        eq(marketplaceItems.status, 'active')
      ));

    for (const item of auctions) {
      if (!item.endTurn || currentTurn < item.endTurn) continue;

      if (item.highestBidderId && item.currentBid && item.currentBid > (item.startingBid || 0)) {
        await db.update(marketplaceItems)
          .set({ 
            status: 'sold',
            buyerId: item.highestBidderId,
            buyerName: item.highestBidderName,
            soldAt: new Date()
          })
          .where(eq(marketplaceItems.id, item.id));

        const soldItem = { ...item, status: 'sold' as const };

        this.notifySubscribers(item.highestBidderId, {
          type: 'auction_won',
          item: soldItem,
          finalPrice: item.currentBid
        });

        this.notifySubscribers(item.sellerId, {
          type: 'auction_completed',
          item: soldItem,
          winner: item.highestBidderId,
          finalPrice: item.currentBid
        });

        results.push({ item: soldItem, result: 'sold' });
      } else {
        const newEndTurn = currentTurn + 1;
        await db.update(marketplaceItems)
          .set({ endTurn: newEndTurn })
          .where(eq(marketplaceItems.id, item.id));

        this.notifySubscribers(item.sellerId, {
          type: 'auction_extended',
          item: { ...item, endTurn: newEndTurn },
          newEndTurn
        });

        results.push({ item: { ...item, endTurn: newEndTurn }, result: 'extended' });
      }
    }

    if (results.length > 0) {
      this.notifyAllSubscribers({
        type: 'auctions_resolved',
        results: results
      });
    }

    return results;
  }

  async getAllItems(): Promise<MarketplaceItem[]> {
    return await db.select().from(marketplaceItems);
  }

  async getItem(itemId: string): Promise<MarketplaceItem | null> {
    const [item] = await db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));
    return item || null;
  }

  private enrichUniqueItem(item: MarketplaceItem): MarketplaceItem {
    if (item.itemType === 'unique_item' && item.uniqueItemId && this.exchangeService) {
      try {
        let uniqueItem = this.exchangeService.getPlayerItem(item.sellerId, item.uniqueItemId);
        if (!uniqueItem && item.sellerId !== 'player') {
          uniqueItem = this.exchangeService.getPlayerItem('player', item.uniqueItemId);
        }
        
        if (uniqueItem) {
          return {
            ...item,
            uniqueItem: {
              name: uniqueItem.name,
              type: uniqueItem.type,
              rarity: uniqueItem.rarity,
              description: uniqueItem.description,
              effects: uniqueItem.effects,
              value: uniqueItem.value,
              metadata: uniqueItem.metadata
            }
          };
        }
      } catch (error) {
        console.log('Error enriching unique item:', error);
      }
    }
    return item;
  }

  async getActiveItems(): Promise<MarketplaceItem[]> {
    const activeItems = await db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.status, 'active'))
      .orderBy(desc(marketplaceItems.createdAt));
    
    return activeItems.map(item => this.enrichUniqueItem(item));
  }

  async getItemsByType(itemType: 'resource' | 'unique_item'): Promise<MarketplaceItem[]> {
    const items = await db.select().from(marketplaceItems)
      .where(and(
        eq(marketplaceItems.status, 'active'),
        eq(marketplaceItems.itemType, itemType)
      ))
      .orderBy(desc(marketplaceItems.createdAt));
    
    return items.map(item => this.enrichUniqueItem(item));
  }

  async getItemsBySeller(sellerId: string): Promise<MarketplaceItem[]> {
    return await db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.sellerId, sellerId))
      .orderBy(desc(marketplaceItems.createdAt));
  }

  async searchItems(query: string): Promise<MarketplaceItem[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const items = await db.select().from(marketplaceItems)
      .where(and(
        eq(marketplaceItems.status, 'active'),
        or(
          sql`LOWER(${marketplaceItems.resourceType}) LIKE ${searchTerm}`,
          sql`LOWER(${marketplaceItems.description}) LIKE ${searchTerm}`,
          sql`${marketplaceItems.tags}::text ILIKE ${searchTerm}`
        )
      ))
      .orderBy(desc(marketplaceItems.createdAt));
    
    return items.map(item => this.enrichUniqueItem(item));
  }

  async removeItem(itemId: string, sellerId: string): Promise<boolean> {
    const [item] = await db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));
    
    if (!item || item.sellerId !== sellerId) return false;

    if (item.saleType === 'auction' && item.highestBidderId) {
      return false;
    }

    await db.update(marketplaceItems)
      .set({ status: 'cancelled' })
      .where(eq(marketplaceItems.id, itemId));

    this.notifyAllSubscribers({
      type: 'item_removed',
      item: { ...item, status: 'cancelled' }
    });

    return true;
  }

  subscribe(playerId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    this.subscribers.get(playerId)!.push(callback);

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

export let marketplaceService: MarketplaceService;

export function initializeMarketplaceService(exchangeService: any): void {
  marketplaceService = new MarketplaceService(exchangeService);
}
export type { MarketplaceItem, BidResult };
