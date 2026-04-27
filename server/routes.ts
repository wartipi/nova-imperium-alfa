import type { Express } from "express";
import { createServer, type Server } from "http";
import { messageService } from "./messageService";
import treatyRoutes from "./routes/treaties";
import { exchangeService } from "./exchangeService";
import { marketplaceService, initializeMarketplaceService } from "./marketplaceService";
import { cartographyService } from "./cartographyService";
import { loginEndpoint, requireAuth, AUTHORIZED_USERS } from "./middleware/auth";
import type { AuthRequest } from "./middleware/auth";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import marshalRoutes from "./routes/marshal";
import publicEventsRoutes from "./routes/publicEvents";
import mapRoutes from "./routes/map";
import playerRoutes from "./routes/player";
import playerStateRoutes from "./routes/playerState";
import playerActionsRoutes from "./routes/playerActions";
import discoveredTilesRoutes from "./routes/discoveredTiles";
import playersRoutes from "./routes/players";
import citiesRoutes from "./routes/cities";
import unitsRoutes from "./routes/units";
import factionRoutes from "./routes/factions";
import territoryRoutes from "./routes/territories";
import economyRoutes from "./routes/economy";
import marketRoutes from "./routes/market";
import { seedFactions } from "./seeds/factionSeed";
import { getGameClock } from "./gameTurnService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialiser le marketplace service avec exchangeService
  initializeMarketplaceService(exchangeService);

  // Seed idempotent des factions système (Guilde de Pandem)
  await seedFactions();

  // Backfill idempotent Phase 11 — ownership canonique des colonies
  // Toute colonie ownerType='faction' sans ownerFactionId reçoit ownerFactionId/ownerFactionName depuis factionId/factionName.
  try {
    const { sql: rawSql } = await import("drizzle-orm");
    await db.execute(rawSql`
      UPDATE colonies
      SET owner_faction_id   = faction_id,
          owner_faction_name = faction_name
      WHERE owner_type = 'faction'
        AND owner_faction_id IS NULL
    `);
    console.log("[Startup] Backfill ownership colonique terminé (idempotent)");
  } catch (err) {
    console.error("[Startup] Backfill ownership échoué (non bloquant):", err);
  }

  // Routes factions
  app.use("/api/factions", factionRoutes);
  // Routes territoires et colonies (Phase 3)
  app.use("/api/territories", territoryRoutes);
  app.use("/api/treaties", treatyRoutes);
  // Horloge globale du jeu (lecture seule)
  app.get("/api/game/clock", async (_req, res) => {
    try {
      const clock = await getGameClock();
      if (!clock) {
        return res.status(503).json({ error: "Game clock not initialized" });
      }
      res.json({
        currentTurn:       clock.currentTurn,
        turnDurationHours: clock.turnDurationHours,
        turnStartedAt:     clock.turnStartedAt.toISOString(),
        nextTurnAt:        clock.nextTurnAt.toISOString(),
        serverNow:         new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to read game clock" });
    }
  });

  // Authentication endpoint
  app.post("/api/auth/login", loginEndpoint);

  // Inscription — création d'un compte DB
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Nom d\'utilisateur, email et mot de passe requis' });
      }

      const uname = String(username).trim().toLowerCase();
      const emailNorm = String(email).trim().toLowerCase();

      if (uname.length < 3 || uname.length > 32) {
        return res.status(400).json({ error: 'Nom d\'utilisateur : 3 à 32 caractères requis' });
      }

      // Validation email format minimal
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailNorm)) {
        return res.status(400).json({ error: 'Adresse email invalide' });
      }

      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum requis' });
      }

      // Refus si le nom est reservé par un compte hardcodé
      if (AUTHORIZED_USERS[uname]) {
        return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });
      }

      // Refus si username déjà présent en DB
      const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.username, uname)).limit(1);
      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });
      }

      // Refus si email déjà présent en DB
      const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, emailNorm)).limit(1);
      if (existingEmail.length > 0) {
        return res.status(409).json({ error: 'Adresse email déjà utilisée' });
      }

      // Insertion en DB — password stocké tel quel (niveau de sécurité identique aux comptes hardcodés)
      await db.insert(users).values({ username: uname, email: emailNorm, password: String(password).trim() });

      return res.status(201).json({ success: true, message: 'Compte créé avec succès' });
    } catch (err: any) {
      console.error('[Register] Erreur:', err);
      return res.status(500).json({ error: 'Erreur lors de la création du compte' });
    }
  });

  // Message endpoints
  app.get("/api/messages/:playerId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { playerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.id !== playerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const messages = messageService.getMessagesForPlayer(playerId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { to, content, type } = req.body;
      // Le champ "from" est forcé depuis le token — pas de spoofing possible
      const from = req.user!.id;

      if (!to || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const message = messageService.sendMessage({
        from,
        to,
        content,
        type: type || 'message'
      });

      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:messageId/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { messageId } = req.params;
      const playerId = req.user!.id;

      const success = messageService.markAsRead(messageId, playerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/messages/:playerId/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { playerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.id !== playerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const stats = messageService.getStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get message stats" });
    }
  });

  // Endpoints pour les objets uniques

  // Route auth — inventaire du joueur connecté (DOIT être avant /:playerId)
  app.get("/api/unique-items/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const inventory = exchangeService.getPlayerInventory(req.user!.id);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player inventory" });
    }
  });

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

  app.post("/api/unique-items/create", requireAuth, async (req: AuthRequest, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
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

  app.delete("/api/unique-items/:playerId", requireAuth, async (req: AuthRequest, res) => {
    const { playerId } = req.params;
    if (req.user!.id !== playerId && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
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

  app.post("/api/unique-items/clear", requireAuth, async (req: AuthRequest, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
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

  // Cartography endpoints
  app.get("/api/cartography/regions/:playerId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { playerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.id !== playerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const regions = await cartographyService.getDiscoveredRegions(playerId);
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get regions" });
    }
  });

  app.post("/api/cartography/discover", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { centerX, centerY, radius, name } = req.body;
      // playerId forcé depuis le token
      const playerId = req.user!.id;
      const region = await cartographyService.discoverRegion(playerId, centerX, centerY, radius, name);
      if (region) {
        res.json(region);
      } else {
        res.status(400).json({ error: "Region already exists" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to discover region" });
    }
  });

  app.post("/api/cartography/project", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { regionId, tools, assistants } = req.body;
      // playerId forcé depuis le token
      const playerId = req.user!.id;
      const project = await cartographyService.startCartographyProject(playerId, regionId, tools, assistants);
      if (project) {
        res.json(project);
      } else {
        res.status(400).json({ error: "Failed to start project" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start cartography project" });
    }
  });

  app.post("/api/cartography/project/:projectId/progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { projectId } = req.params;
      const { actionPoints } = req.body;
      const success = await cartographyService.progressProject(projectId, actionPoints);
      if (success) {
        res.json({ success: true, message: "Project progress updated" });
      } else {
        res.status(400).json({ error: "Failed to update project progress" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update project progress" });
    }
  });

  app.get("/api/cartography/maps/tradable", requireAuth, async (req: AuthRequest, res) => {
    try {
      const maps = await cartographyService.getTradableMaps();
      res.json(maps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tradable maps" });
    }
  });

  app.get("/api/cartography/maps/:playerId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { playerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.id !== playerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const maps = await cartographyService.getPlayerMaps(playerId);
      res.json(maps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get maps" });
    }
  });

  app.get("/api/cartography/projects/:playerId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { playerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.id !== playerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const projects = await cartographyService.getActiveProjects(playerId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.post("/api/cartography/transfer", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { mapId, toPlayerId } = req.body;
      // fromPlayerId forcé depuis le token — empêche le vol de carte d'autrui
      const fromPlayerId = req.user!.role === "admin" && req.body.fromPlayerId
        ? req.body.fromPlayerId
        : req.user!.id;
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

  app.get("/api/cartography/stats/:playerId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { playerId } = req.params;
      if (req.user!.role !== "admin" && req.user!.id !== playerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const stats = await cartographyService.getCartographyStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get cartography stats" });
    }
  });

  app.get("/api/cartography/map/:mapId", requireAuth, async (req: AuthRequest, res) => {
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

  // Résoudre les enchères (appelé en fin de tour) — admin only
  app.post("/api/marketplace/resolve-auctions", requireAuth, async (req: AuthRequest, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
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

  // Marshal routes (armées, contrats, campagnes)
  app.use('/api/marshal', marshalRoutes);
  app.use('/api/public-events', publicEventsRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/player', playerRoutes);
  app.use('/api/player', playerStateRoutes);
  app.use('/api/player', playerActionsRoutes);
  app.use('/api/player', discoveredTilesRoutes);
  app.use('/api/players', playersRoutes);
  app.use('/api/cities', citiesRoutes);
  app.use('/api/units', unitsRoutes);
  app.use('/api/economy', economyRoutes);
  app.use('/api/market', marketRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
