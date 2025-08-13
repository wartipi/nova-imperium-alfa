// Service de messagerie temps réel pour Nova Imperium
interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  read: boolean;
  type: 'message' | 'alliance' | 'trade' | 'warning';
}

class MessageService {
  private messages: Message[] = [];
  private subscribers: Map<string, Array<(messages: Message[]) => void>> = new Map();

  // Envoyer un message
  sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'read'>): Message {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      read: false
    };

    this.messages.push(newMessage);
    
    // Notifier les abonnés du destinataire
    this.notifySubscribers(message.to);
    
    return newMessage;
  }

  // Obtenir tous les messages pour un joueur
  getMessagesForPlayer(playerId: string): Message[] {
    return this.messages.filter(msg => msg.to === playerId || msg.from === playerId);
  }

  // Obtenir uniquement les messages reçus
  getReceivedMessages(playerId: string): Message[] {
    return this.messages.filter(msg => msg.to === playerId);
  }

  // Obtenir uniquement les messages envoyés
  getSentMessages(playerId: string): Message[] {
    return this.messages.filter(msg => msg.from === playerId);
  }

  // Marquer un message comme lu
  markAsRead(messageId: string, playerId: string): boolean {
    const message = this.messages.find(msg => 
      msg.id === messageId && msg.to === playerId
    );
    
    if (message) {
      message.read = true;
      this.notifySubscribers(playerId);
      return true;
    }
    
    return false;
  }

  // S'abonner aux mises à jour de messages
  subscribe(playerId: string, callback: (messages: Message[]) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    
    this.subscribers.get(playerId)!.push(callback);
    
    // Envoyer les messages existants immédiatement
    callback(this.getMessagesForPlayer(playerId));
    
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

  // Notifier tous les abonnés d'un joueur
  private notifySubscribers(playerId: string): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      const messages = this.getMessagesForPlayer(playerId);
      callbacks.forEach(callback => callback(messages));
    }
  }

  // Obtenir des statistiques
  getStats(playerId: string): {
    totalReceived: number;
    totalSent: number;
    unreadCount: number;
    totalMessages: number;
  } {
    const received = this.getReceivedMessages(playerId);
    const sent = this.getSentMessages(playerId);
    
    return {
      totalReceived: received.length,
      totalSent: sent.length,
      unreadCount: received.filter(msg => !msg.read).length,
      totalMessages: this.messages.length
    };
  }

  // Nettoyer les anciens messages (optionnel)
  cleanOldMessages(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    this.messages = this.messages.filter(msg => now - msg.timestamp < maxAge);
  }
}

export const messageService = new MessageService();
export type { Message };