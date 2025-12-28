import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { messageService } from "./messageService";
import { treatyService } from "./treatyService";
import { exchangeService, UniqueItem } from "./exchangeService";
import { cartographyService } from "./cartographyService";
import { marketplaceService, initializeMarketplaceService } from "./marketplaceService";
import { loginEndpoint, requireAuth, optionalAuth, AuthRequest } from "./middleware/auth";
import marshalRoutes from "./routes/marshal";
import publicEventsRoutes from "./routes/publicEvents";
import { 
  createTradeRoomSchema, 
  createExchangeOfferSchema, 
  acceptRejectOfferSchema,
  discoverRegionSchema,
  startCartographyProjectSchema,
  progressProjectSchema,
  transferMapSchema,
  createMessageSchema,
  createTreatySchema,
  signTreatySchema,
  createUniqueItemSchema,
  marketplaceSellSchema,
  marketplaceBidSchema,
  marketplaceBuySchema
} from "../shared/exchangeValidation";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialiser le marketplace service avec exchangeService
  initializeMarketplaceService(exchangeService);
  // Game save/load endpoints
  app.get("/api/game/save", async (req, res) => {
    try {
      // In a real implementation, this would save to database
      // For now, return success
      res.json({ success: true, message: "Game saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save game" });
    }
  });

  app.post("/api/game/load", async (req, res) => {
    try {
      // In a real implementation, this would load from database
      // For now, return empty data
      res.json({ 
        success: true, 
        data: null,
        message: "No saved game found" 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load game" });
    }
  });

  // Authentication endpoint
  app.post("/api/auth/login", loginEndpoint);

  // Leaderboard endpoint
  app.get("/api/leaderboard", async (req, res) => {
    try {
      // Return empty leaderboard for now
      res.json({
        scores: [],
        message: "Leaderboard will be implemented with user system"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // Message endpoints
  app.get("/api/messages/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const messages = await messageService.getMessagesForPlayer(playerId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createMessageSchema.parse(req.body);
      const senderId = req.user!.id;
      
      const message = await messageService.sendMessage({
        from: senderId,
        to: validatedData.to,
        content: validatedData.content,
        type: validatedData.type
      });
      
      res.json(message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:messageId/read", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { messageId } = req.params;
      const playerId = req.user!.id;
      
      const success = await messageService.markAsRead(messageId, playerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/messages/:playerId/stats", async (req, res) => {
    try {
      const { playerId } = req.params;
      const stats = await messageService.getStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get message stats" });
    }
  });

  // Treaty endpoints
  app.get("/api/treaties/player/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const treaties = await treatyService.getTreatiesForPlayer(playerId);
      res.json(treaties);
    } catch (error) {
      res.status(500).json({ error: "Failed to get treaties" });
    }
  });

  app.get("/api/treaties/types", async (req, res) => {
    try {
      const treatyTypes = treatyService.getTreatyTypes();
      res.json(treatyTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get treaty types" });
    }
  });

  app.post("/api/treaties", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createTreatySchema.parse(req.body);
      const creatorId = req.user!.id;
      
      const treaty = await treatyService.createTreaty({
        title: validatedData.title,
        type: validatedData.type,
        parties: validatedData.parties,
        terms: validatedData.terms,
        createdBy: creatorId,
        properties: validatedData.properties || {}
      });
      
      res.json(treaty);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create treaty" });
    }
  });

  app.patch("/api/treaties/:treatyId/sign", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { treatyId } = req.params;
      const playerId = req.user!.id;
      
      const success = await treatyService.signTreaty(treatyId, playerId);
      res.json({ success });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to sign treaty" });
    }
  });

  app.patch("/api/treaties/:treatyId/break", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { treatyId } = req.params;
      const playerId = req.user!.id;
      
      const success = await treatyService.breakTreaty(treatyId, playerId);
      res.json({ success });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to break treaty" });
    }
  });

  app.get("/api/treaties/:playerId/stats", async (req, res) => {
    try {
      const { playerId } = req.params;
      const stats = await treatyService.getStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get treaty stats" });
    }
  });

  // Exchange endpoints
  app.get("/api/exchange/rooms/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const rooms = await exchangeService.getTradeRoomsForPlayer(playerId);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to get trade rooms" });
    }
  });

  app.get("/api/exchange/offers/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const offers = await exchangeService.getActiveOffersForPlayer(playerId);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get offers" });
    }
  });

  app.post("/api/exchange/room", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createTradeRoomSchema.parse(req.body);
      const creatorId = req.user!.id;
      
      if (!validatedData.participants.includes(creatorId)) {
        validatedData.participants.push(creatorId);
      }
      
      const room = await exchangeService.createTradeRoom(validatedData.treatyId, validatedData.participants);
      res.json(room);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create trade room" });
    }
  });

  app.post("/api/exchange/offer", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createExchangeOfferSchema.parse(req.body);
      const fromPlayerId = req.user!.id;
      
      const offer = await exchangeService.createExchangeOffer(
        validatedData.roomId,
        fromPlayerId,
        validatedData.toPlayer,
        validatedData.resourcesOffered,
        validatedData.resourcesRequested,
        validatedData.uniqueItemsOffered,
        validatedData.uniqueItemsRequested,
        validatedData.message
      );
      
      if (offer) {
        res.json(offer);
      } else {
        res.status(400).json({ error: "Failed to create offer" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create offer" });
    }
  });

  app.post("/api/exchange/offer/:offerId/accept", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { offerId } = req.params;
      const playerId = req.user!.id;
      
      const success = await exchangeService.acceptOffer(offerId, playerId);
      
      if (success) {
        res.json({ success: true, message: "Offer accepted" });
      } else {
        res.status(400).json({ error: "Failed to accept offer" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to accept offer" });
    }
  });

  app.post("/api/exchange/offer/:offerId/reject", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { offerId } = req.params;
      const playerId = req.user!.id;
      
      const success = await exchangeService.rejectOffer(offerId, playerId);
      
      if (success) {
        res.json({ success: true, message: "Offer rejected" });
      } else {
        res.status(400).json({ error: "Failed to reject offer" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reject offer" });
    }
  });

  app.delete("/api/exchange/room/:roomId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { roomId } = req.params;
      const success = await exchangeService.closeTradeRoom(roomId);
      
      if (success) {
        res.json({ success: true, message: "Room closed" });
      } else {
        res.status(400).json({ error: "Failed to close room" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to close room" });
    }
  });

  // Cartography endpoints
  app.get("/api/cartography/regions/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const regions = await cartographyService.getDiscoveredRegions(playerId);
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get regions" });
    }
  });

  app.post("/api/cartography/discover", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = discoverRegionSchema.parse(req.body);
      const playerId = req.user!.id;
      
      const region = await cartographyService.discoverRegion(
        playerId, 
        validatedData.centerX, 
        validatedData.centerY, 
        validatedData.radius, 
        validatedData.name
      );
      
      if (region) {
        res.json(region);
      } else {
        res.status(400).json({ error: "Region already exists" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to discover region" });
    }
  });

  app.post("/api/cartography/project", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = startCartographyProjectSchema.parse(req.body);
      const playerId = req.user!.id;
      
      const project = await cartographyService.startCartographyProject(
        playerId, 
        validatedData.regionId, 
        validatedData.tools, 
        validatedData.assistants
      );
      
      if (project) {
        res.json(project);
      } else {
        res.status(400).json({ error: "Failed to start project" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to start cartography project" });
    }
  });

  app.post("/api/cartography/project/:projectId/progress", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const validatedData = progressProjectSchema.parse(req.body);
      
      const success = await cartographyService.progressProject(projectId, validatedData.actionPoints);
      
      if (success) {
        res.json({ success: true, message: "Project progress updated" });
      } else {
        res.status(400).json({ error: "Failed to update project progress" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update project progress" });
    }
  });

  app.get("/api/cartography/maps/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const maps = await cartographyService.getPlayerMaps(playerId);
      res.json(maps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get maps" });
    }
  });

  app.get("/api/cartography/maps/tradable", async (req, res) => {
    try {
      const maps = await cartographyService.getTradableMaps();
      res.json(maps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tradable maps" });
    }
  });

  app.get("/api/cartography/projects/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const projects = await cartographyService.getActiveProjects(playerId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.post("/api/cartography/transfer", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { mapId, toPlayerId } = req.body;
      const fromPlayerId = req.user!.id;
      
      const success = await cartographyService.transferMap(mapId, fromPlayerId, toPlayerId);
      
      if (success) {
        res.json({ success: true, message: "Map transferred successfully" });
      } else {
        res.status(400).json({ error: "Failed to transfer map" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to transfer map" });
    }
  });

  app.get("/api/cartography/stats/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const stats = await cartographyService.getCartographyStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cartography stats" });
    }
  });

  app.get("/api/cartography/map/:mapId", async (req, res) => {
    try {
      const { mapId } = req.params;
      const map = await cartographyService.getMapById(mapId);
      
      if (map) {
        res.json(map);
      } else {
        res.status(404).json({ error: "Map not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get map" });
    }
  });

  app.get("/api/cartography/regions/nearby", async (req, res) => {
    try {
      const { x, y, radius, limit } = req.query;
      
      if (!x || !y || !radius) {
        return res.status(400).json({ error: "x, y, and radius are required" });
      }
      
      const regions = await cartographyService.findNearbyRegions(
        parseFloat(x as string),
        parseFloat(y as string),
        parseFloat(radius as string),
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to find nearby regions" });
    }
  });

  app.get("/api/cartography/regions/area", async (req, res) => {
    try {
      const { minX, maxX, minY, maxY } = req.query;
      
      if (!minX || !maxX || !minY || !maxY) {
        return res.status(400).json({ error: "minX, maxX, minY, and maxY are required" });
      }
      
      const regions = await cartographyService.findRegionsInArea(
        parseFloat(minX as string),
        parseFloat(maxX as string),
        parseFloat(minY as string),
        parseFloat(maxY as string)
      );
      
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to find regions in area" });
    }
  });

  // Endpoints pour les objets uniques
  app.get("/api/unique-items/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const inventory = await exchangeService.getPlayerInventory(playerId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player inventory" });
    }
  });

  app.get("/api/unique-items/item/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await exchangeService.getUniqueItem(itemId);
      
      if (item) {
        res.json(item);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get item" });
    }
  });

  app.post("/api/unique-items/create", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createUniqueItemSchema.parse(req.body);
      const ownerId = req.user!.id;
      
      const item = await exchangeService.createUniqueItem(
        validatedData.name,
        validatedData.type,
        validatedData.rarity,
        validatedData.description,
        ownerId,
        validatedData.effects,
        validatedData.requirements,
        validatedData.value,
        validatedData.metadata
      );
      
      res.json(item);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create unique item" });
    }
  });

  app.delete("/api/unique-items/:playerId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const authenticatedPlayerId = req.user!.id;
      const success = await exchangeService.clearPlayerInventory(authenticatedPlayerId);
      
      if (success) {
        res.json({ success: true, message: "Player inventory cleared" });
      } else {
        res.status(400).json({ error: "Failed to clear inventory" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to clear player inventory" });
    }
  });

  app.post("/api/exchange/offer/unique", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { 
        roomId, 
        toPlayer, 
        uniqueItemsOffered, 
        uniqueItemsRequested, 
        message 
      } = req.body;
      const fromPlayer = req.user!.id;
      
      if (!roomId || !toPlayer) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const offer = await exchangeService.createExchangeOffer(
        roomId,
        fromPlayer,
        toPlayer,
        {},
        {},
        uniqueItemsOffered || [],
        uniqueItemsRequested || [],
        message
      );
      
      if (offer) {
        res.json(offer);
      } else {
        res.status(400).json({ error: "Failed to create exchange offer" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to create exchange offer" });
    }
  });

  // Map Marketplace endpoints
  app.get("/api/marketplace/maps", async (req, res) => {
    try {
      // Get all tradeable maps from all players
      const allPlayers = ['player', 'player2', 'player3'];
      const marketOffers = [];
      
      for (const playerId of allPlayers) {
        const inventory = await exchangeService.getPlayerInventory(playerId);
        const maps = inventory.filter(item => item.type === 'carte' && item.tradeable);
        
        for (const map of maps) {
          marketOffers.push({
            id: `offer_${map.id}`,
            item: map,
            sellerId: playerId,
            sellerName: playerId === 'player' ? 'Vous' : `Joueur_${playerId}`,
            price: Math.floor(map.value * 0.8),
            currency: 'gold',
            description: `Carte authentique créée par ${playerId}`,
            createdAt: map.createdAt
          });
        }
      }

      res.json(marketOffers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get marketplace offers" });
    }
  });

  app.post("/api/marketplace/maps/sell", async (req, res) => {
    try {
      const { itemId, sellerId, price } = req.body;
      
      if (!itemId || !sellerId || !price) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      res.json({ 
        success: true, 
        message: "Map listed for sale",
        listingId: `listing_${Date.now()}`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to list map for sale" });
    }
  });

  app.post("/api/marketplace/maps/buy", async (req, res) => {
    try {
      const { offerId, buyerId } = req.body;
      
      if (!offerId || !buyerId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      res.json({ 
        success: true, 
        message: "Map purchased successfully",
        transactionId: `tx_${Date.now()}`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to purchase map" });
    }
  });

  // === MARKETPLACE ENDPOINTS (NOUVEAU SYSTÈME COMPLET) ===
  
  // Obtenir tous les items actifs du marketplace
  app.get("/api/marketplace/items", async (req, res) => {
    try {
      const items = await marketplaceService.getActiveItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get marketplace items" });
    }
  });

  // Obtenir les items par type
  app.get("/api/marketplace/items/:type", async (req, res) => {
    try {
      const { type } = req.params;
      if (type !== 'resource' && type !== 'unique_item') {
        return res.status(400).json({ error: "Invalid item type" });
      }
      const items = await marketplaceService.getItemsByType(type as 'resource' | 'unique_item');
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get items by type" });
    }
  });

  // Obtenir les items d'un vendeur
  app.get("/api/marketplace/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const items = await marketplaceService.getItemsBySeller(sellerId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get seller items" });
    }
  });

  // Rechercher des items
  app.get("/api/marketplace/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search query required" });
      }
      const items = await marketplaceService.searchItems(q);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to search items" });
    }
  });

  app.post("/api/marketplace/direct-sale", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { 
        sellerName, 
        itemType, 
        price, 
        resourceType, 
        quantity, 
        uniqueItemId, 
        uniqueItem, 
        description, 
        tags 
      } = req.body;
      const sellerId = req.user!.id;

      if (!sellerName || !itemType || !price) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let enrichedUniqueItem = uniqueItem;
      
      if (itemType === 'unique_item' && uniqueItemId && !uniqueItem) {
        const fullUniqueItem = await exchangeService.getUniqueItemById(uniqueItemId);
        if (fullUniqueItem && fullUniqueItem.ownerId === sellerId) {
          enrichedUniqueItem = {
            name: fullUniqueItem.name,
            type: fullUniqueItem.type,
            rarity: fullUniqueItem.rarity,
            description: fullUniqueItem.description,
            effects: fullUniqueItem.effects,
            value: fullUniqueItem.value,
            metadata: fullUniqueItem.metadata
          };
          console.log('Enriched unique item for marketplace:', enrichedUniqueItem.name, 'with metadata:', !!enrichedUniqueItem.metadata);
        }
      }

      const item = await marketplaceService.createDirectSale(
        sellerId,
        sellerName,
        itemType,
        price,
        { resourceType, quantity, uniqueItemId, uniqueItem: enrichedUniqueItem, description, tags }
      );

      res.json({ success: true, item });
    } catch (error) {
      res.status(500).json({ error: "Failed to create direct sale" });
    }
  });

  app.post("/api/marketplace/auction", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { 
        sellerName, 
        itemType, 
        startingBid, 
        currentTurn,
        resourceType, 
        quantity, 
        uniqueItemId, 
        uniqueItem, 
        description, 
        tags,
        minBidIncrement
      } = req.body;
      const sellerId = req.user!.id;

      if (!sellerName || !itemType || !startingBid || currentTurn === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const item = await marketplaceService.createAuction(
        sellerId,
        sellerName,
        itemType,
        startingBid,
        currentTurn,
        { resourceType, quantity, uniqueItemId, uniqueItem, description, tags, minBidIncrement }
      );

      res.json({ success: true, item });
    } catch (error) {
      res.status(500).json({ error: "Failed to create auction" });
    }
  });

  app.post("/api/marketplace/purchase/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;
      const { buyerName } = req.body;
      const buyerId = req.user!.id;

      if (!buyerName) {
        return res.status(400).json({ error: "Buyer name required" });
      }

      const result = await marketplaceService.purchaseDirectSale(itemId, buyerId, buyerName);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to purchase item" });
    }
  });

  app.post("/api/marketplace/purchase-integrated/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;
      const { playerName } = req.body;
      const playerId = req.user!.id;
      
      if (!playerName) {
        return res.status(400).json({ error: "playerName requis" });
      }

      const item = await marketplaceService.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Objet non trouvé" });
      }

      if (item.saleType !== 'direct_sale' || item.status !== 'active') {
        return res.status(400).json({ error: "Cet objet n'est pas disponible à l'achat direct" });
      }

      const cost = item.fixedPrice || 0;
      
      const playerGold = 1000;
      const hasEnoughGold = playerGold >= cost;
      
      if (!hasEnoughGold) {
        return res.status(400).json({ 
          error: `Or insuffisant. Coût: ${cost} or, Disponible: ${playerGold} or` 
        });
      }

      const result = await marketplaceService.purchaseDirectSale(itemId, playerId, playerName);
      
      if (result.success) {
        const uniqueItemData = item.uniqueItem as { name: string; type: string; rarity: string; description: string; effects?: string[]; value: number } | null;
        if (item.itemType === 'unique_item' && uniqueItemData) {
          const newItem = await exchangeService.createUniqueItem(
            uniqueItemData.name,
            uniqueItemData.type,
            uniqueItemData.rarity,
            uniqueItemData.description,
            playerId,
            uniqueItemData.effects || [],
            [],
            uniqueItemData.value,
            {}
          );
          
          if (!newItem) {
            return res.status(500).json({ 
              error: "Erreur lors du transfert de l'objet vers votre inventaire" 
            });
          }
        }
        
        res.json({
          success: true,
          message: `Achat réussi ! ${cost} or sera déduit et l'objet ajouté à votre inventaire.`,
          item: result.item,
          goldSpent: cost,
          playerGoldAfter: playerGold - cost
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Erreur achat intégré:', error);
      res.status(500).json({ error: "Erreur lors de l'achat intégré" });
    }
  });

  app.post("/api/marketplace/bid/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;
      const { playerName, bidAmount } = req.body;
      const playerId = req.user!.id;

      if (!playerName || !bidAmount) {
        return res.status(400).json({ error: "Bid information required" });
      }

      const result = await marketplaceService.placeBid(itemId, playerId, playerName, bidAmount);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to place bid" });
    }
  });

  app.delete("/api/marketplace/item/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.params;
      const sellerId = req.user!.id;

      const success = await marketplaceService.removeItem(itemId, sellerId);
      
      if (success) {
        res.json({ success: true, message: "Item removed successfully" });
      } else {
        res.status(400).json({ error: "Failed to remove item" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to remove item" });
    }
  });

  // Résoudre les enchères (appelé en fin de tour)
  app.post("/api/marketplace/resolve-auctions", async (req, res) => {
    try {
      const { currentTurn } = req.body;

      if (currentTurn === undefined) {
        return res.status(400).json({ error: "Current turn required" });
      }

      const results = await marketplaceService.resolveAuctions(currentTurn);
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve auctions" });
    }
  });

  // Marshal routes (armées, contrats, campagnes)
  app.use('/api/marshal', marshalRoutes);
  app.use('/api/public-events', publicEventsRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
