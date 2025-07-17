import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { messageService } from "./messageService";
import { treatyService } from "./treatyService";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Treaty endpoints
  app.get("/api/treaties/:playerId", async (req, res) => {
    try {
      const { playerId } = req.params;
      const treaties = treatyService.getTreatiesForPlayer(playerId);
      res.json(treaties);
    } catch (error) {
      res.status(500).json({ error: "Failed to get treaties" });
    }
  });

  app.post("/api/treaties", async (req, res) => {
    try {
      const { title, type, parties, terms, createdBy } = req.body;
      
      if (!title || !type || !parties || !terms || !createdBy) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const treaty = treatyService.createTreaty({
        title,
        type,
        parties,
        terms,
        createdBy
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

  const httpServer = createServer(app);
  return httpServer;
}
