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
  private subscribers: Map<string, ((messages: Message[]) => void)[]> = new Map();

  constructor() {
    // Initialiser avec quelques messages de test
    this.initializeTestMessages();
  }

  private initializeTestMessages(): void {
    const testMessages: Omit<Message, 'id' | 'timestamp'>[] = [
      {
        from: 'Guilde de Pandem',
        to: 'player',
        content: 'Bienvenue dans Nova Imperium ! La Guilde de Pandem vous souhaite un bon voyage dans ce monde mystérieux.',
        type: 'message',
        read: false
      },
      {
        from: 'Marchands Itinérants',
        to: 'player',
        content: 'Nos caravanes passent près de vos terres. Nous proposons des échanges avantageux de ressources rares contre de l\'or.',
        type: 'trade',
        read: false
      },
      {
        from: 'Éclaireurs Royaux',
        to: 'player',
        content: 'Des mouvements suspects ont été signalés près de vos frontières. Restez vigilant et renforcez vos défenses.',
        type: 'warning',
        read: false
      },
      {
        from: 'Ambassadeur du Royaume Voisin',
        to: 'player',
        content: 'Notre Roi souhaite établir une alliance commerciale avec votre territoire. Accepteriez-vous une rencontre diplomatique ?',
        type: 'alliance',
        read: false
      },
      {
        from: 'Système',
        to: 'player',
        content: 'Vos territoires génèrent maintenant des revenus automatiques. Consultez votre trésorerie pour voir les gains.',
        type: 'message',
        read: false
      }
    ];

    testMessages.forEach(msg => this.sendMessage(msg));
  }

  // Envoyer un message
  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
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

  // Fonction utilitaire pour créer des messages de test
  addTestMessage(from: string, to: string, content: string, type: 'message' | 'alliance' | 'trade' | 'warning' = 'message'): Message {
    return this.sendMessage({ from, to, content, type, read: false });
  }

  // Créer un message de test depuis un autre joueur
  createPlayerTestMessage(playerName: string): Message {
    const testMessages = [
      { content: "Salutations ! J'aimerais établir des relations commerciales avec votre territoire.", type: 'trade' as const },
      { content: "Nos armées sont prêtes à s'allier contre les menaces communes. Acceptez-vous ?", type: 'alliance' as const },
      { content: "J'ai remarqué vos progrès impressionnants. Félicitations pour votre expansion !", type: 'message' as const },
      { content: "Attention ! Mes éclaireurs ont repéré des bandits près de nos frontières communes.", type: 'warning' as const }
    ];
    
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    
    return this.sendMessage({
      from: playerName,
      to: 'player',
      content: randomMessage.content,
      type: randomMessage.type,
      read: false
    });
  }
}

export const messageService = new MessageService();
export type { Message };