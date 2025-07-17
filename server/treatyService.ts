// Service de traités pour Nova Imperium
interface Treaty {
  id: string;
  title: string;
  type: 'alliance' | 'commerce' | 'non_aggression' | 'mutual_defense' | 'cultural' | 'research';
  parties: string[]; // IDs des joueurs participants
  terms: string;
  status: 'draft' | 'proposed' | 'active' | 'expired' | 'broken';
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  signatures: { playerId: string; signedAt: number }[];
}

class TreatyService {
  private treaties: Treaty[] = [];
  private subscribers: Map<string, ((treaties: Treaty[]) => void)[]> = new Map();

  // Créer un nouveau traité
  createTreaty(treaty: Omit<Treaty, 'id' | 'createdAt' | 'signatures' | 'status'>): Treaty {
    const newTreaty: Treaty = {
      ...treaty,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      status: 'proposed',
      signatures: [{
        playerId: treaty.createdBy,
        signedAt: Date.now()
      }]
    };

    this.treaties.push(newTreaty);
    
    // Notifier tous les participants
    treaty.parties.forEach(playerId => {
      this.notifySubscribers(playerId);
    });
    
    return newTreaty;
  }

  // Obtenir tous les traités pour un joueur
  getTreatiesForPlayer(playerId: string): Treaty[] {
    return this.treaties.filter(treaty => treaty.parties.includes(playerId));
  }

  // Obtenir un traité par ID
  getTreatyById(treatyId: string): Treaty | undefined {
    return this.treaties.find(treaty => treaty.id === treatyId);
  }

  // Signer un traité
  signTreaty(treatyId: string, playerId: string): boolean {
    const treaty = this.treaties.find(t => t.id === treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'proposed') return false;
    if (!treaty.parties.includes(playerId)) return false;
    
    // Vérifier si déjà signé
    const alreadySigned = treaty.signatures.some(sig => sig.playerId === playerId);
    if (alreadySigned) return false;
    
    // Ajouter la signature
    treaty.signatures.push({
      playerId,
      signedAt: Date.now()
    });
    
    // Vérifier si tous les participants ont signé
    const allSigned = treaty.parties.every(partyId => 
      treaty.signatures.some(sig => sig.playerId === partyId)
    );
    
    if (allSigned) {
      treaty.status = 'active';
    }
    
    // Notifier tous les participants
    treaty.parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  // Rompre un traité
  breakTreaty(treatyId: string, playerId: string): boolean {
    const treaty = this.treaties.find(t => t.id === treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'active') return false;
    if (!treaty.parties.includes(playerId)) return false;
    
    treaty.status = 'broken';
    
    // Notifier tous les participants
    treaty.parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  // Faire expirer un traité
  expireTreaty(treatyId: string): boolean {
    const treaty = this.treaties.find(t => t.id === treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'active') return false;
    
    treaty.status = 'expired';
    
    // Notifier tous les participants
    treaty.parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  // S'abonner aux mises à jour de traités
  subscribe(playerId: string, callback: (treaties: Treaty[]) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    
    this.subscribers.get(playerId)!.push(callback);
    
    // Envoyer les traités existants immédiatement
    callback(this.getTreatiesForPlayer(playerId));
    
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
      const treaties = this.getTreatiesForPlayer(playerId);
      callbacks.forEach(callback => callback(treaties));
    }
  }

  // Obtenir des statistiques
  getStats(playerId: string): {
    totalTreaties: number;
    activeTreaties: number;
    proposedTreaties: number;
    createdTreaties: number;
    signedTreaties: number;
  } {
    const playerTreaties = this.getTreatiesForPlayer(playerId);
    
    return {
      totalTreaties: playerTreaties.length,
      activeTreaties: playerTreaties.filter(t => t.status === 'active').length,
      proposedTreaties: playerTreaties.filter(t => t.status === 'proposed').length,
      createdTreaties: playerTreaties.filter(t => t.createdBy === playerId).length,
      signedTreaties: playerTreaties.filter(t => 
        t.signatures.some(sig => sig.playerId === playerId)
      ).length
    };
  }

  // Obtenir les traités par type
  getTreatiesByType(type: Treaty['type']): Treaty[] {
    return this.treaties.filter(treaty => treaty.type === type);
  }

  // Vérifier si deux joueurs ont un traité actif d'un type donné
  hasActiveTreaty(playerId1: string, playerId2: string, type?: Treaty['type']): boolean {
    return this.treaties.some(treaty => 
      treaty.status === 'active' &&
      treaty.parties.includes(playerId1) &&
      treaty.parties.includes(playerId2) &&
      (!type || treaty.type === type)
    );
  }

  // Nettoyer les anciens traités expirés
  cleanExpiredTreaties(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    this.treaties = this.treaties.filter(treaty => {
      if (treaty.status === 'expired' && now - treaty.createdAt > maxAge) {
        return false;
      }
      return true;
    });
  }

  // Obtenir tous les traités (admin)
  getAllTreaties(): Treaty[] {
    return this.treaties;
  }
}

export const treatyService = new TreatyService();
export type { Treaty };