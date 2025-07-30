import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { messageService } from "./messageService";
import { treatyService } from "./treatyService";
import { exchangeService, UniqueItem } from "./exchangeService";
import { cartographyService } from "./cartographyService";
import { marketplaceService, initializeMarketplaceService } from "./marketplaceService";
import { loginEndpoint } from "./middleware/auth";

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
      const messages = messageService.getMessagesForPlayer(playerId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { from, to, content, type, read = false } = req.body;
      
      if (!from || !to || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const message = messageService.sendMessage({
        from,
        to,
        content,
        type: type || 'message',
        read
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:messageId/read", async (req, res) => {
    try {
      const { messageId } = req.params;
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: "Player ID required" });
      }
      
      const success = messageService.markAsRead(messageId, playerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/messages/:playerId/stats", async (req, res) => {
    try {
      const { playerId } = req.params;
      const stats = messageService.getStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get message stats" });
    }
  });

  // Test message endpoints
  app.post("/api/messages/test", async (req, res) => {
    try {
      const { playerName = "Joueur Mystérieux" } = req.body;
      const message = messageService.createPlayerTestMessage(playerName);
      res.json({ success: true, message });
    } catch (error) {
      res.status(500).json({ error: "Failed to create test message" });
    }
  });

  app.post("/api/messages/test/custom", async (req, res) => {
    try {
      const { from, to = "player", content, type = "message" } = req.body;
      
      if (!from || !content) {
        return res.status(400).json({ error: "From and content are required" });
      }
      
      const message = messageService.addTestMessage(from, to, content, type);
      res.json({ success: true, message });
    } catch (error) {
      res.status(500).json({ error: "Failed to create custom test message" });
    }
  });

  // Treaty endpoints
  app.get("/api/treaties/player/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const treaties = treatyService.getTreatiesForPlayer(playerId);
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

  app.post("/api/treaties", async (req, res) => {
    try {
      const { title, type, parties, terms, createdBy, properties } = req.body;
      
      if (!title || !type || !parties || !terms || !createdBy) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const treaty = treatyService.createTreaty({
        title,
        type,
        parties,
        terms,
        createdBy,
        properties: properties || {}
      });
      
      res.json(treaty);
    } catch (error) {
      res.status(500).json({ error: "Failed to create treaty" });
    }
  });

  app.patch("/api/treaties/:treatyId/sign", async (req, res) => {
    try {
      const { treatyId } = req.params;
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: "Player ID required" });
      }
      
      const success = treatyService.signTreaty(treatyId, playerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to sign treaty" });
    }
  });

  app.patch("/api/treaties/:treatyId/break", async (req, res) => {
    try {
      const { treatyId } = req.params;
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: "Player ID required" });
      }
      
      const success = treatyService.breakTreaty(treatyId, playerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to break treaty" });
    }
  });

  app.get("/api/treaties/:playerId/stats", async (req, res) => {
    try {
      const { playerId } = req.params;
      const stats = treatyService.getStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get treaty stats" });
    }
  });

  // Exchange endpoints
  app.get("/api/exchange/rooms/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const rooms = exchangeService.getTradeRoomsForPlayer(playerId);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to get trade rooms" });
    }
  });

  app.get("/api/exchange/offers/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const offers = exchangeService.getActiveOffersForPlayer(playerId);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get offers" });
    }
  });

  app.post("/api/exchange/room", async (req, res) => {
    try {
      const { treatyId, participants } = req.body;
      const room = exchangeService.createTradeRoom(treatyId, participants);
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Failed to create trade room" });
    }
  });

  app.post("/api/exchange/offer", async (req, res) => {
    try {
      const { 
        roomId, 
        fromPlayer, 
        toPlayer, 
        resourcesOffered, 
        resourcesRequested, 
        uniqueItemsOffered, 
        uniqueItemsRequested, 
        message 
      } = req.body;
      
      const offer = exchangeService.createExchangeOffer(
        roomId,
        fromPlayer,
        toPlayer,
        resourcesOffered,
        resourcesRequested,
        uniqueItemsOffered,
        uniqueItemsRequested,
        message
      );
      
      if (offer) {
        res.json(offer);
      } else {
        res.status(400).json({ error: "Failed to create offer" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to create offer" });
    }
  });

  app.post("/api/exchange/offer/:offerId/accept", async (req, res) => {
    try {
      const { offerId } = req.params;
      const { playerId } = req.body;
      
      const success = exchangeService.acceptOffer(offerId, playerId);
      
      if (success) {
        res.json({ success: true, message: "Offer accepted" });
      } else {
        res.status(400).json({ error: "Failed to accept offer" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to accept offer" });
    }
  });

  app.post("/api/exchange/offer/:offerId/reject", async (req, res) => {
    try {
      const { offerId } = req.params;
      const { playerId } = req.body;
      
      const success = exchangeService.rejectOffer(offerId, playerId);
      
      if (success) {
        res.json({ success: true, message: "Offer rejected" });
      } else {
        res.status(400).json({ error: "Failed to reject offer" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to reject offer" });
    }
  });

  app.delete("/api/exchange/room/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const success = exchangeService.closeTradeRoom(roomId);
      
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
      const regions = cartographyService.getDiscoveredRegions(playerId);
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get regions" });
    }
  });

  app.post("/api/cartography/discover", async (req, res) => {
    try {
      const { playerId, centerX, centerY, radius, name } = req.body;
      const region = cartographyService.discoverRegion(playerId, centerX, centerY, radius, name);
      
      if (region) {
        res.json(region);
      } else {
        res.status(400).json({ error: "Region already exists" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to discover region" });
    }
  });

  app.get("/api/cartography/regions/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const regions = cartographyService.getDiscoveredRegions(playerId);
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get regions" });
    }
  });

  app.post("/api/cartography/project", async (req, res) => {
    try {
      const { playerId, regionId, tools, assistants } = req.body;
      const project = cartographyService.startCartographyProject(playerId, regionId, tools, assistants);
      
      if (project) {
        res.json(project);
      } else {
        res.status(400).json({ error: "Failed to start project" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start cartography project" });
    }
  });

  app.post("/api/cartography/project/:projectId/progress", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { actionPoints } = req.body;
      
      const success = cartographyService.progressProject(projectId, actionPoints);
      
      if (success) {
        res.json({ success: true, message: "Project progress updated" });
      } else {
        res.status(400).json({ error: "Failed to update project progress" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update project progress" });
    }
  });

  app.get("/api/cartography/maps/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const maps = cartographyService.getPlayerMaps(playerId);
      res.json(maps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get maps" });
    }
  });

  app.get("/api/cartography/maps/tradable", async (req, res) => {
    try {
      const maps = cartographyService.getTradableMaps();
      res.json(maps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tradable maps" });
    }
  });

  app.get("/api/cartography/projects/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const projects = cartographyService.getActiveProjects(playerId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.post("/api/cartography/transfer", async (req, res) => {
    try {
      const { mapId, fromPlayerId, toPlayerId } = req.body;
      const success = cartographyService.transferMap(mapId, fromPlayerId, toPlayerId);
      
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
      const stats = cartographyService.getCartographyStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cartography stats" });
    }
  });

  app.get("/api/cartography/map/:mapId", async (req, res) => {
    try {
      const { mapId } = req.params;
      const map = cartographyService.getMapById(mapId);
      
      if (map) {
        res.json(map);
      } else {
        res.status(404).json({ error: "Map not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get map" });
    }
  });

  // Endpoints pour les objets uniques
  app.get("/api/unique-items/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const inventory = exchangeService.getPlayerInventory(playerId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player inventory" });
    }
  });

  app.get("/api/unique-items/item/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = exchangeService.getUniqueItem(itemId);
      
      if (item) {
        res.json(item);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get item" });
    }
  });

  app.post("/api/unique-items/create", async (req, res) => {
    try {
      const { name, type, rarity, description, ownerId, effects, requirements, value, metadata } = req.body;
      
      if (!name || !type || !rarity || !description || !ownerId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const item = exchangeService.createUniqueItem(
        name,
        type,
        rarity,
        description,
        ownerId,
        effects,
        requirements,
        value,
        metadata
      );
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create unique item" });
    }
  });

  app.delete("/api/unique-items/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const success = exchangeService.clearPlayerInventory(playerId);
      
      if (success) {
        res.json({ success: true, message: "Player inventory cleared" });
      } else {
        res.status(400).json({ error: "Failed to clear inventory" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to clear player inventory" });
    }
  });

  app.post("/api/unique-items/clear", async (req, res) => {
    try {
      const success = exchangeService.clearAllInventories();
      
      if (success) {
        res.json({ success: true, message: "All inventories cleared" });
      } else {
        res.status(400).json({ error: "Failed to clear all inventories" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to clear all inventories" });
    }
  });

  // Endpoint pour créer une offre d'échange d'objets uniques
  app.post("/api/exchange/offer/unique", async (req, res) => {
    try {
      const { 
        roomId, 
        fromPlayer, 
        toPlayer, 
        uniqueItemsOffered, 
        uniqueItemsRequested, 
        message 
      } = req.body;
      
      if (!roomId || !fromPlayer || !toPlayer) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const offer = exchangeService.createExchangeOffer(
        roomId,
        fromPlayer,
        toPlayer,
        {}, // Pas de ressources normales
        {}, // Pas de ressources demandées
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
        const inventory = exchangeService.getPlayerInventory(playerId);
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
      const items = marketplaceService.getActiveItems();
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
      const items = marketplaceService.getItemsByType(type as 'resource' | 'unique_item');
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get items by type" });
    }
  });

  // Obtenir les items d'un vendeur
  app.get("/api/marketplace/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const items = marketplaceService.getItemsBySeller(sellerId);
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
      const items = marketplaceService.searchItems(q);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to search items" });
    }
  });

  // Créer une vente directe
  app.post("/api/marketplace/direct-sale", async (req, res) => {
    try {
      const { 
        sellerId, 
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

      if (!sellerId || !sellerName || !itemType || !price) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let enrichedUniqueItem = uniqueItem;
      
      // Si c'est un objet unique avec un ID, récupérer les métadonnées complètes
      if (itemType === 'unique_item' && uniqueItemId && !uniqueItem) {
        const fullUniqueItem = exchangeService.getUniqueItemById(uniqueItemId);
        if (fullUniqueItem && fullUniqueItem.ownerId === sellerId) {
          enrichedUniqueItem = {
            name: fullUniqueItem.name,
            type: fullUniqueItem.type,
            rarity: fullUniqueItem.rarity,
            description: fullUniqueItem.description,
            effects: fullUniqueItem.effects,
            value: fullUniqueItem.value,
            metadata: fullUniqueItem.metadata // Important pour les cartes !
          };
          console.log('Enriched unique item for marketplace:', enrichedUniqueItem.name, 'with metadata:', !!enrichedUniqueItem.metadata);
        }
      }

      const item = marketplaceService.createDirectSale(
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

  // Créer une enchère
  app.post("/api/marketplace/auction", async (req, res) => {
    try {
      const { 
        sellerId, 
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

      if (!sellerId || !sellerName || !itemType || !startingBid || currentTurn === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const item = marketplaceService.createAuction(
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

  // Acheter un item en vente directe (ancienne version - pas d'intégration ressources)
  app.post("/api/marketplace/purchase/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { buyerId, buyerName } = req.body;

      if (!buyerId || !buyerName) {
        return res.status(400).json({ error: "Buyer information required" });
      }

      const result = marketplaceService.purchaseDirectSale(itemId, buyerId, buyerName);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to purchase item" });
    }
  });

  // Achat intégré avec validation et déduction des ressources
  app.post("/api/marketplace/purchase-integrated/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { playerId, playerName } = req.body;
      
      if (!playerId || !playerName) {
        return res.status(400).json({ error: "playerId et playerName requis" });
      }

      const item = marketplaceService.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Objet non trouvé" });
      }

      if (item.saleType !== 'direct_sale' || item.status !== 'active') {
        return res.status(400).json({ error: "Cet objet n'est pas disponible à l'achat direct" });
      }

      const cost = item.fixedPrice || 0;
      
      // Simulation de vérification d'or (sera remplacé par l'intégration réelle)
      const playerGold = 1000; // TODO: Récupérer de l'état du joueur
      const hasEnoughGold = playerGold >= cost;
      
      if (!hasEnoughGold) {
        return res.status(400).json({ 
          error: `Or insuffisant. Coût: ${cost} or, Disponible: ${playerGold} or` 
        });
      }

      // Procéder à l'achat
      const result = marketplaceService.purchaseDirectSale(itemId, playerId, playerName);
      
      if (result.success) {
        // INTÉGRATION AVEC INVENTORY: Transférer l'objet unique si applicable
        if (item.itemType === 'unique_item' && item.uniqueItem) {
          // Créer l'objet dans l'inventaire du joueur acheteur
          const newItem = exchangeService.createUniqueItem(
            item.uniqueItem.name,
            item.uniqueItem.type,
            item.uniqueItem.rarity,
            item.uniqueItem.description,
            playerId,
            item.uniqueItem.effects || [],
            [], // requirements
            item.uniqueItem.value,
            {} // metadata
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
          playerGoldAfter: playerGold - cost // Simulation
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Erreur achat intégré:', error);
      res.status(500).json({ error: "Erreur lors de l'achat intégré" });
    }
  });

  // Placer une enchère
  app.post("/api/marketplace/bid/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { playerId, playerName, bidAmount } = req.body;

      if (!playerId || !playerName || !bidAmount) {
        return res.status(400).json({ error: "Bid information required" });
      }

      const result = marketplaceService.placeBid(itemId, playerId, playerName, bidAmount);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to place bid" });
    }
  });

  // Supprimer un item (seulement le vendeur)
  app.delete("/api/marketplace/item/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { sellerId } = req.body;

      if (!sellerId) {
        return res.status(400).json({ error: "Seller ID required" });
      }

      const success = marketplaceService.removeItem(itemId, sellerId);
      
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

      const results = marketplaceService.resolveAuctions(currentTurn);
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve auctions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
