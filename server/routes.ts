import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { messageService } from "./messageService";

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

  const httpServer = createServer(app);
  return httpServer;
}
