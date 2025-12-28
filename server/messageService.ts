import { eq, and, or, lt, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { messages } from "../shared/schema";
import type { Message } from "../shared/schema";

class MessageService {
  private subscribers: Map<string, Array<(messages: Message[]) => void>> = new Map();

  async sendMessage(message: {
    from: string;
    to: string;
    content: string;
    type: 'private' | 'system' | 'treaty' | 'trade';
  }): Promise<Message> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [newMessage] = await db.insert(messages).values({
      id,
      fromPlayer: message.from,
      toPlayer: message.to,
      content: message.content,
      type: message.type,
      isRead: false,
      timestamp: new Date()
    }).returning();

    this.notifySubscribers(message.to);
    
    return newMessage;
  }

  async getMessagesForPlayer(playerId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(or(
        eq(messages.toPlayer, playerId),
        eq(messages.fromPlayer, playerId)
      ))
      .orderBy(desc(messages.timestamp));
  }

  async getReceivedMessages(playerId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.toPlayer, playerId))
      .orderBy(desc(messages.timestamp));
  }

  async getSentMessages(playerId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.fromPlayer, playerId))
      .orderBy(desc(messages.timestamp));
  }

  async markAsRead(messageId: string, playerId: string): Promise<boolean> {
    const [message] = await db.select().from(messages)
      .where(and(
        eq(messages.id, messageId),
        eq(messages.toPlayer, playerId)
      ));
    
    if (!message) return false;
    
    await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
    
    this.notifySubscribers(playerId);
    return true;
  }

  subscribe(playerId: string, callback: (messages: Message[]) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    
    this.subscribers.get(playerId)!.push(callback);
    
    (async () => {
      const playerMessages = await this.getMessagesForPlayer(playerId);
      callback(playerMessages);
    })();
    
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

  private async notifySubscribers(playerId: string): Promise<void> {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      const playerMessages = await this.getMessagesForPlayer(playerId);
      callbacks.forEach(callback => callback(playerMessages));
    }
  }

  async getStats(playerId: string): Promise<{
    totalReceived: number;
    totalSent: number;
    unreadCount: number;
    totalMessages: number;
  }> {
    const received = await this.getReceivedMessages(playerId);
    const sent = await this.getSentMessages(playerId);
    
    const unreadCount = received.filter(msg => !msg.isRead).length;
    
    return {
      totalReceived: received.length,
      totalSent: sent.length,
      unreadCount,
      totalMessages: received.length + sent.length
    };
  }

  async cleanOldMessages(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAge);
    
    await db.delete(messages)
      .where(lt(messages.timestamp, cutoffDate));
  }
}

export const messageService = new MessageService();
export type { Message };
