import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'movement' | 'action' | 'competence' | 'exchange' | 'creation' | 'exploration' | 'marketplace' | 'construction' | 'recruitment';
  message: string;
  cost?: number;
  location?: string;
  details?: Record<string, any>;
}

interface ActivityLogsState {
  logs: ActivityLog[];
  addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  getRecentLogs: (limit?: number) => ActivityLog[];
  getLogsByType: (type: ActivityLog['type']) => ActivityLog[];
}

export const useActivityLogs = create<ActivityLogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      
      addLog: (log) => {
        const newLog: ActivityLog = {
          ...log,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        };
        
        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, 100) // Garder les 100 derniers logs
        }));
      },
      
      clearLogs: () => set({ logs: [] }),
      
      getRecentLogs: (limit = 20) => {
        return get().logs.slice(0, limit);
      },
      
      getLogsByType: (type) => {
        return get().logs.filter(log => log.type === type);
      }
    }),
    {
      name: 'nova-imperium-activity-logs',
      version: 1
    }
  )
);

// Fonctions utilitaires pour créer des logs standardisés
export const ActivityLogUtils = {
  movement: (from: string, to: string, cost: number) => ({
    type: 'movement' as const,
    message: `Déplacement de ${from} vers ${to}`,
    cost,
    location: to
  }),
  
  exploration: (location: string, cost: number, discovered?: string[]) => ({
    type: 'exploration' as const,
    message: `Exploration de ${location}${discovered?.length ? ` - ${discovered.length} ressource(s) découverte(s)` : ''}`,
    cost,
    location,
    details: { discovered }
  }),
  
  competence: (competence: string, level: number, cost: number) => ({
    type: 'competence' as const,
    message: `Compétence ${competence} atteinte niveau ${level}`,
    cost,
    details: { competence, level }
  }),
  
  marketplace: (action: 'buy' | 'sell' | 'cancel', item: string, price?: number) => ({
    type: 'marketplace' as const,
    message: `${action === 'buy' ? 'Achat' : action === 'sell' ? 'Vente' : 'Annulation'} - ${item}${price ? ` (${price} or)` : ''}`,
    cost: action === 'buy' ? price : undefined,
    details: { action, item, price }
  }),
  
  creation: (item: string, cost: number) => ({
    type: 'creation' as const,
    message: `Création - ${item}`,
    cost,
    details: { item }
  }),
  
  construction: (building: string, location: string, cost: number) => ({
    type: 'construction' as const,
    message: `Construction - ${building} à ${location}`,
    cost,
    location,
    details: { building }
  }),
  
  recruitment: (unit: string, location: string, cost: number) => ({
    type: 'recruitment' as const,
    message: `Recrutement - ${unit} à ${location}`,
    cost,
    location,
    details: { unit }
  })
};