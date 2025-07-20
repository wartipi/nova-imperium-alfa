/**
 * Adaptateur pour la migration progressive vers le système centralisé
 * Permet de garder la compatibilité avec l'ancien code pendant la transition
 */

import { useCentralizedGameState } from "../stores/useCentralizedGameState";
import { useGameState } from "../stores/useGameState";
import { useMap } from "../stores/useMap";
import { useNovaImperium } from "../stores/useNovaImperium";
import { usePlayer } from "../stores/usePlayer";
import { TurnManager } from "../game/TurnManager";
import { ResourceManager } from "../game/ResourceManager";

export class GameStateAdapter {
  
  /**
   * Synchronise l'ancien système avec le nouveau
   */
  static syncToNewSystem() {
    const newState = useCentralizedGameState.getState();
    const oldGameState = useGameState.getState();
    const oldMapState = useMap.getState();
    const oldNovaImperiumState = useNovaImperium.getState();
    const oldPlayerState = usePlayer.getState();

    // Synchroniser les données de base
    if (oldGameState.currentTurn !== newState.currentTurn) {
      useCentralizedGameState.setState({ 
        currentTurn: oldGameState.currentTurn,
        gamePhase: oldGameState.gamePhase,
        isPaused: oldGameState.isPaused,
        isGameMaster: oldGameState.isGameMaster
      });
    }

    // Synchroniser les données de carte
    if (oldMapState.mapData && !newState.mapData) {
      useCentralizedGameState.setState({
        mapData: oldMapState.mapData,
        mapWidth: oldMapState.mapWidth,
        mapHeight: oldMapState.mapHeight,
        selectedHex: oldMapState.selectedHex
      });
    }

    // Synchroniser les Nova Imperiums
    if (oldNovaImperiumState.novaImperiums.length > 0) {
      useCentralizedGameState.setState({
        novaImperiums: oldNovaImperiumState.novaImperiums
      });
    }

    // Synchroniser les données du joueur
    if (oldPlayerState.avatarPosition) {
      useCentralizedGameState.setState({
        avatarPosition: oldPlayerState.avatarPosition,
        actionPoints: oldPlayerState.actionPoints,
        maxActionPoints: oldPlayerState.maxActionPoints,
        explorationLevel: oldPlayerState.explorationLevel
      });
    }
  }

  /**
   * Synchronise le nouveau système vers l'ancien (pour compatibilité)
   */
  static syncToOldSystem() {
    const newState = useCentralizedGameState.getState();
    
    // Synchroniser useGameState
    useGameState.setState({
      currentTurn: newState.currentTurn,
      gamePhase: newState.gamePhase,
      isPaused: newState.isPaused,
      isGameMaster: newState.isGameMaster
    });

    // Synchroniser useMap
    if (newState.mapData) {
      useMap.setState({
        mapData: newState.mapData,
        mapWidth: newState.mapWidth,
        mapHeight: newState.mapHeight,
        selectedHex: newState.selectedHex
      });
    }

    // Synchroniser useNovaImperium
    if (newState.novaImperiums.length > 0) {
      useNovaImperium.setState({
        novaImperiums: newState.novaImperiums
      });
    }

    // Synchroniser usePlayer
    usePlayer.setState({
      avatarPosition: newState.avatarPosition,
      actionPoints: newState.actionPoints,
      maxActionPoints: newState.maxActionPoints,
      explorationLevel: newState.explorationLevel
    });
  }

  /**
   * Fonction de fin de tour améliorée qui utilise les nouveaux modules
   */
  static executeEnhancedEndTurn() {
    const state = useCentralizedGameState.getState();
    
    console.log(`🎯 Début de la fin de tour ${state.currentTurn} (système amélioré)`);
    
    // 1. Utiliser le TurnManager pour traiter tous les Nova Imperiums
    const turnResult = TurnManager.processEndOfTurn(
      state.novaImperiums,
      state.mapData || [],
      state.currentTurn
    );

    // 2. Calculer la production des ressources globales
    state.calculateResourceProduction();
    state.applyResourceProduction();

    // 3. Mettre à jour l'état centralisé
    useCentralizedGameState.setState({
      currentTurn: state.currentTurn + 1,
      novaImperiums: turnResult.updatedNovaImperiums,
      actionPoints: state.maxActionPoints
    });

    // 4. Synchroniser avec l'ancien système pour compatibilité
    this.syncToOldSystem();

    // 5. Afficher les résultats
    console.log(`✅ Fin de tour ${state.currentTurn} terminée`);
    console.log(`📊 Événements générés:`, turnResult.turnEvents);
    console.log(`🏆 Statistiques globales:`, turnResult.globalStats);
    console.log(`💰 Ressources après production:`, ResourceManager.formatResources(state.globalResources));

    return {
      success: true,
      events: turnResult.turnEvents,
      stats: turnResult.globalStats,
      newTurn: state.currentTurn
    };
  }

  /**
   * Initialise le système hybride
   */
  static initializeHybridSystem() {
    console.log("🔄 Initialisation du système hybride Nova Imperium");
    
    // Synchroniser les données existantes vers le nouveau système
    this.syncToNewSystem();
    
    // Abonner le nouveau système aux changements de l'ancien
    this.setupBidirectionalSync();
    
    console.log("✅ Système hybride initialisé");
  }

  /**
   * Configure la synchronisation bidirectionnelle
   */
  static setupBidirectionalSync() {
    // Écouter les changements dans l'ancien système et les propager
    useGameState.subscribe(
      (state) => state.currentTurn,
      (turn) => {
        const newState = useCentralizedGameState.getState();
        if (newState.currentTurn !== turn) {
          useCentralizedGameState.setState({ currentTurn: turn });
        }
      }
    );

    useMap.subscribe(
      (state) => state.selectedHex,
      (hex) => {
        const newState = useCentralizedGameState.getState();
        if (newState.selectedHex !== hex) {
          useCentralizedGameState.setState({ selectedHex: hex });
        }
      }
    );

    usePlayer.subscribe(
      (state) => state.avatarPosition,
      (position) => {
        const newState = useCentralizedGameState.getState();
        if (newState.avatarPosition !== position) {
          useCentralizedGameState.setState({ avatarPosition: position });
        }
      }
    );
  }

  /**
   * Teste si le nouveau système fonctionne correctement
   */
  static validateNewSystem(): boolean {
    const state = useCentralizedGameState.getState();
    
    const validations = [
      { name: "GameState centralisé", result: !!state.gamePhase },
      { name: "Gestion des ressources", result: !!state.globalResources },
      { name: "Fonction finDuTour", result: typeof state.finDuTour === 'function' },
      { name: "Gestion de la carte", result: typeof state.generateMap === 'function' },
      { name: "Position avatar", result: !!state.avatarPosition }
    ];

    const allValid = validations.every(v => v.result);
    
    console.log("🔍 Validation du nouveau système:");
    validations.forEach(v => {
      console.log(`  ${v.result ? '✅' : '❌'} ${v.name}`);
    });

    return allValid;
  }

  /**
   * Bascule vers le nouveau système (migration finale)
   */
  static migrateToNewSystem() {
    console.log("🚀 Migration finale vers le nouveau système");
    
    // Une dernière synchronisation
    this.syncToNewSystem();
    
    // Valider que tout fonctionne
    const isValid = this.validateNewSystem();
    
    if (isValid) {
      console.log("✅ Migration réussie! Le nouveau système centralisé est opérationnel");
      return true;
    } else {
      console.error("❌ Erreur lors de la migration. Retour au système précédent recommandé.");
      return false;
    }
  }
}