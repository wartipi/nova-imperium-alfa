/**
 * Système de Résolution des Effets de Tour - Nova Imperium
 * Étape 2: Créer un Système de Résolution des Effets de Tour
 * 
 * Ce système centralise toute la logique qui s'exécute à chaque fin de tour,
 * permettant une gestion automatisée et cohérente des effets du jeu.
 */

import { useMemo } from 'react';
import { useGameManager } from '../lib/stores/useGameManager';
import { useResources } from '../lib/stores/useResources';
import { useMapState } from '../lib/stores/useMapState';
import { useUnits } from '../lib/stores/useUnits';
import { useBuildings } from '../lib/stores/useBuildings';

// Types des effets de tour
export interface TurnEffect {
  id: string;
  type: 'resource_production' | 'building_production' | 'unit_maintenance' | 'random_event' | 'faction_event' | 'exploration_reveal' | 'diplomacy_update';
  description: string;
  priority: number; // Ordre d'exécution (plus bas = plus prioritaire)
  playerId?: string; // Si l'effet est spécifique à un joueur
  execute: () => TurnEffectResult;
  condition?: () => boolean; // Condition pour exécuter l'effet
}

export interface TurnEffectResult {
  success: boolean;
  message?: string;
  data?: any;
  triggeredEvents?: string[];
}

// Gestionnaire principal des effets de tour
export class TurnEffectsSystem {
  private effects: TurnEffect[] = [];
  private executionHistory: Array<{
    turn: number;
    effects: Array<{ id: string; result: TurnEffectResult; timestamp: number }>;
  }> = [];

  constructor(
    private gameManager: ReturnType<typeof useGameManager>,
    private resources: ReturnType<typeof useResources>,
    private mapState: ReturnType<typeof useMapState>,
    private units: ReturnType<typeof useUnits>,
    private buildings: ReturnType<typeof useBuildings>
  ) {
    this.initializeDefaultEffects();
  }

  // Initialiser les effets par défaut du jeu
  private initializeDefaultEffects() {
    // Effet 1: Production de ressources des bâtiments
    this.registerEffect({
      id: 'building_resource_production',
      type: 'building_production',
      description: 'Production de ressources par les bâtiments',
      priority: 1,
      execute: () => this.executeBuildingProduction()
    });

    // Effet 2: Régénération des points d'action
    this.registerEffect({
      id: 'action_points_regeneration',
      type: 'resource_production',
      description: 'Régénération des points d\'action',
      priority: 2,
      execute: () => this.executeActionPointsRegeneration()
    });

    // Effet 3: Maintenance des unités
    this.registerEffect({
      id: 'unit_maintenance',
      type: 'unit_maintenance',
      description: 'Coûts de maintenance des unités',
      priority: 3,
      execute: () => this.executeUnitMaintenance()
    });

    // Effet 4: Progression des constructions
    this.registerEffect({
      id: 'construction_progress',
      type: 'building_production',
      description: 'Progression des constructions en cours',
      priority: 4,
      execute: () => this.executeConstructionProgress()
    });

    // Effet 5: Événements aléatoires
    this.registerEffect({
      id: 'random_events',
      type: 'random_event',
      description: 'Événements aléatoires du monde',
      priority: 5,
      execute: () => this.executeRandomEvents(),
      condition: () => Math.random() < 0.3 // 30% de chance
    });

    // Effet 6: Révélation d'exploration
    this.registerEffect({
      id: 'exploration_reveal',
      type: 'exploration_reveal',
      description: 'Révélation de nouvelles zones explorées',
      priority: 6,
      execute: () => this.executeExplorationReveal()
    });
  }

  // Enregistrer un nouvel effet
  registerEffect(effect: TurnEffect) {
    this.effects.push(effect);
    this.effects.sort((a, b) => a.priority - b.priority);
  }

  // Supprimer un effet
  removeEffect(effectId: string) {
    this.effects = this.effects.filter(effect => effect.id !== effectId);
  }

  // Résoudre tous les effets du tour
  async resoudreEffets(playerId?: string): Promise<TurnEffectResult[]> {
    const currentTurn = this.gameManager.currentTurn;
    const results: TurnEffectResult[] = [];
    const executionLog: Array<{ id: string; result: TurnEffectResult; timestamp: number }> = [];

    console.log(`🎯 Résolution des effets du tour ${currentTurn} pour ${playerId || 'tous les joueurs'}`);

    // Filtrer les effets selon le joueur et les conditions
    const applicableEffects = this.effects.filter(effect => {
      if (playerId && effect.playerId && effect.playerId !== playerId) {
        return false;
      }
      if (effect.condition && !effect.condition()) {
        return false;
      }
      return true;
    });

    // Exécuter les effets dans l'ordre de priorité
    for (const effect of applicableEffects) {
      try {
        console.log(`⚡ Exécution de l'effet: ${effect.description}`);
        const result = effect.execute();
        
        results.push(result);
        executionLog.push({
          id: effect.id,
          result,
          timestamp: Date.now()
        });

        // Ajouter un événement au jeu si l'effet a réussi
        if (result.success && result.message) {
          this.gameManager.addGameEvent({
            type: 'turn_effect',
            description: result.message,
            playerId: playerId || 'system',
            data: { effectId: effect.id, ...result.data }
          });
        }

        // Déclencher des événements supplémentaires si nécessaire
        if (result.triggeredEvents) {
          result.triggeredEvents.forEach(eventType => {
            this.gameManager.addGameEvent({
              type: eventType,
              description: `Événement déclenché par ${effect.description}`,
              playerId: playerId || 'system',
              data: { sourceEffect: effect.id }
            });
          });
        }

      } catch (error) {
        console.error(`❌ Erreur lors de l'exécution de l'effet ${effect.id}:`, error);
        results.push({
          success: false,
          message: `Erreur lors de l'exécution: ${effect.description}`
        });
      }
    }

    // Enregistrer l'historique
    this.executionHistory.push({
      turn: currentTurn,
      effects: executionLog
    });

    // Nettoyer l'historique ancien (garder seulement les 50 derniers tours)
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(-50);
    }

    console.log(`✅ Résolution terminée: ${results.filter(r => r.success).length}/${results.length} effets réussis`);
    
    return results;
  }

  // Implémentation des effets spécifiques

  private executeBuildingProduction(): TurnEffectResult {
    const playerIds = this.gameManager.playerOrder;
    let totalProduction: Record<string, number> = {};

    playerIds.forEach((playerId: string) => {
      const production = this.buildings.processProduction(playerId);
      Object.entries(production).forEach(([resource, amount]: [string, number]) => {
        this.resources.addResource(resource as any, amount, 'building_production');
        totalProduction = {
          ...totalProduction,
          [resource]: (totalProduction[resource] || 0) + amount
        };
      });
    });

    return {
      success: true,
      message: `Production de ressources: ${Object.entries(totalProduction)
        .map(([res, amt]) => `${res}: +${amt}`)
        .join(', ')}`,
      data: { production: totalProduction }
    };
  }

  private executeActionPointsRegeneration(): TurnEffectResult {
    const currentPlayer = this.gameManager.currentPlayerId;
    const regenerated = this.resources.addResource('action_points', 10, 'turn_regeneration');
    
    return {
      success: regenerated,
      message: regenerated ? 'Points d\'action régénérés (+10)' : 'Limite de points d\'action atteinte',
      data: { playerId: currentPlayer, amount: 10 }
    };
  }

  private executeUnitMaintenance(): TurnEffectResult {
    const playerIds = this.gameManager.playerOrder;
    let totalMaintenanceCost: Record<string, number> = {};

    playerIds.forEach((playerId: string) => {
      const maintenanceCost = this.units.calculateMaintenanceCost(playerId);
      Object.entries(maintenanceCost).forEach(([resource, cost]: [string, number]) => {
        const spent = this.resources.removeResource(resource as any, cost);
        if (!spent) {
          // Si on ne peut pas payer la maintenance, désactiver des unités
          this.handleUnpaidMaintenance(playerId, resource, cost);
        }
        totalMaintenanceCost = {
          ...totalMaintenanceCost,
          [resource]: (totalMaintenanceCost[resource] || 0) + cost
        };
      });
    });

    return {
      success: true,
      message: `Maintenance payée: ${Object.entries(totalMaintenanceCost)
        .map(([res, cost]) => `${res}: -${cost}`)
        .join(', ')}`,
      data: { maintenanceCost: totalMaintenanceCost }
    };
  }

  private executeConstructionProgress(): TurnEffectResult {
    this.buildings.processConstructionQueue();
    const queue = this.buildings.getConstructionQueue();
    
    return {
      success: true,
      message: `Constructions en cours: ${queue.length}`,
      data: { constructionQueue: queue }
    };
  }

  private executeRandomEvents(): TurnEffectResult {
    const events = [
      'Découverte de ressources supplémentaires',
      'Mauvais temps ralentit la production',
      'Marchands itinérants proposent des échanges',
      'Animaux sauvages repérés dans la région',
      'Conditions météo favorables'
    ];

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    // Appliquer l'effet de l'événement aléatoire
    switch (randomEvent) {
      case 'Découverte de ressources supplémentaires':
        this.resources.addResource('gold', 25, 'random_event');
        break;
      case 'Conditions météo favorables':
        this.resources.addResource('food', 15, 'random_event');
        break;
    }

    return {
      success: true,
      message: `Événement aléatoire: ${randomEvent}`,
      data: { eventType: randomEvent },
      triggeredEvents: ['random_event_occurred']
    };
  }

  private executeExplorationReveal(): TurnEffectResult {
    // Révéler automatiquement quelques zones adjacentes aux zones explorées
    const exploredTiles = Array.from(this.mapState.exploredTiles);
    let revealedCount = 0;

    exploredTiles.slice(0, 3).forEach((tileKey: string) => {
      const [x, y] = tileKey.split(',').map(Number);
      const neighbors = this.mapState.getNeighborTiles(x, y);
      
      neighbors.forEach((neighbor: any) => {
        if (!neighbor.isExplored && Math.random() < 0.2) { // 20% de chance
          this.mapState.exploreTile(neighbor.x, neighbor.y);
          revealedCount++;
        }
      });
    });

    return {
      success: revealedCount > 0,
      message: revealedCount > 0 ? `${revealedCount} nouvelles zones révélées` : 'Aucune nouvelle zone révélée',
      data: { revealedCount }
    };
  }

  private handleUnpaidMaintenance(playerId: string, resource: string, cost: number) {
    // Logique pour gérer la maintenance non payée
    // Par exemple, désactiver des unités ou réduire leurs statistiques
    const playerUnits = this.units.getUnitsForPlayer(playerId);
    const unitsToDisable = Math.ceil(cost / 2); // Désactiver des unités selon le coût non payé
    
    playerUnits.slice(0, unitsToDisable).forEach((unit: any) => {
      // Marquer l'unité comme affaiblie par manque de maintenance
      this.gameManager.addGameEvent({
        type: 'unit_maintenance_failed',
        description: `${unit.name} affaiblie par manque de ${resource}`,
        playerId,
        data: { unitId: unit.id, resource, cost }
      });
    });
  }

  // Utilitaires pour l'historique et le debug
  getExecutionHistory(turns?: number) {
    if (turns) {
      return this.executionHistory.slice(-turns);
    }
    return this.executionHistory;
  }

  getRegisteredEffects() {
    return this.effects.map(effect => ({
      id: effect.id,
      type: effect.type,
      description: effect.description,
      priority: effect.priority,
      playerId: effect.playerId
    }));
  }
}

// Hook pour utiliser le système d'effets de tour
export const useTurnEffectsSystem = () => {
  const gameManager = useGameManager();
  const resources = useResources();
  const mapState = useMapState();
  const units = useUnits();
  const buildings = useBuildings();

  // Créer une instance du système (mémorisée)
  const effectsSystem = useMemo(() => {
    return new TurnEffectsSystem(gameManager, resources, mapState, units, buildings);
  }, [gameManager, resources, mapState, units, buildings]);

  return effectsSystem;
};