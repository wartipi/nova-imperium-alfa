# Architecture des Stores - Nova Imperium

## Vue d'ensemble

Ce document décrit l'architecture des stores Zustand implémentée selon l'**Étape 4: Gestion des États Complexes** des recommandations d'amélioration.

## Principe de Séparation des Contextes

### Stores Spécialisés

Chaque aspect du jeu dispose de son propre store dédié :

#### 1. `useResources` - Gestion des Ressources
```typescript
// Responsabilités:
- Gestion des 15 types de ressources
- Système de production et consommation
- Limites de stockage et gestion automatique
- Historique des transactions
```

#### 2. `useMapState` - État de la Carte
```typescript
// Responsabilités:
- Gestion des tuiles hexagonales
- Système de vision et brouillard de guerre
- Interaction avec la carte (sélection, survol)
- Régions et statistiques de carte
```

#### 3. `useUnits` - Gestion des Unités
```typescript
// Responsabilités:
- Création et gestion des unités
- Système de mouvement et combat
- Expérience et progression
- Types d'unités et capacités
```

#### 4. `useBuildings` - Gestion des Bâtiments
```typescript
// Responsabilités:
- Construction et amélioration
- Production de ressources
- Files de construction
- Types de bâtiments et prérequis
```

#### 5. `useGameManager` - Coordination Globale
```typescript
// Responsabilités:
- Orchestration des autres stores
- Gestion des tours et événements
- Sauvegarde/chargement
- Validation et synchronisation
```

## Optimisations de Performance

### 1. Sélecteurs Optimisés

```typescript
// Hook avec sélecteurs mémorisés
export const useOptimizedGameState = () => {
  const gameManagerState = useGameManager(useCallback((state) => ({
    currentTurn: state.currentTurn,
    gamePhase: state.gamePhase,
    currentPlayerId: state.currentPlayerId,
    turnPhase: state.turnPhase
  }), []));
  
  // Évite les re-rendus inutiles
  return useMemo(() => ({ gameManager: gameManagerState }), [gameManagerState]);
};
```

### 2. Actions Groupées (Batch Operations)

```typescript
// Traitement optimisé de fin de tour
const processEndTurn = useCallback(async () => {
  gameManager.processTurnUpdates();
  resources.processProduction();
  buildings.processConstructionQueue();
  units.refreshAllUnits(gameManager.currentPlayerId);
  gameManager.synchronizeStores();
  gameManager.cleanupOldData();
  return true;
}, [gameManager, resources, buildings, units]);
```

### 3. Éviter les Re-rendus

- **Sélecteurs avec `useCallback`** : Évitent la re-création des fonctions de sélection
- **Mémoisation avec `useMemo`** : Évitent la re-création d'objets
- **Stores séparés** : Seuls les composants concernés se re-rendent

## Flux de Données

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Components    │───▶│  Optimized      │───▶│  Specialized    │
│   (React UI)    │    │  Hooks          │    │  Stores         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Game Manager   │◄───│  Synchronization │
                       │  (Coordinator)  │    │  & Validation   │
                       └─────────────────┘    └─────────────────┘
```

## Tests Unitaires

Chaque store dispose de tests complets :

- **Tests d'état initial** : Vérification des valeurs par défaut
- **Tests d'actions** : Vérification des mutations d'état
- **Tests d'intégration** : Vérification des interactions entre stores
- **Tests de performance** : Vérification des optimisations

## Configuration et Debug

### Mode Debug
```typescript
const gameManager = useGameManager();
gameManager.toggleDebugMode(); // Active les logs détaillés
```

### Métriques de Performance
```typescript
const performanceData = useGamePerformanceData();
console.log('Tailles des stores:', performanceData.storesSizes);
console.log('Statistiques:', performanceData.gameStats);
```

## Migration depuis l'Ancien Système

### Compatibilité
- Les anciens stores (`useGameState`, `usePlayer`) restent disponibles
- Migration progressive possible
- API compatible avec l'existant

### Recommandations
1. Utiliser les nouveaux hooks optimisés pour les nouveaux composants
2. Migrer progressivement les composants existants
3. Profiter des optimisations de performance

## Avantages de cette Architecture

### 1. **Performance**
- Évite les re-rendus inutiles
- Opérations groupées
- Nettoyage automatique des données

### 2. **Maintenabilité**
- Séparation claire des responsabilités
- Tests unitaires complets
- Documentation complète

### 3. **Évolutivité**
- Ajout facile de nouveaux stores
- Système de synchronisation extensible
- Architecture modulaire

### 4. **Developer Experience**
- Types TypeScript stricts
- Hooks d'optimisation prêts à l'emploi
- Mode debug intégré

## Prochaines Étapes

1. **Intégration Progressive** : Migrer les composants existants
2. **Optimisations Avancées** : Worker threads pour les calculs lourds
3. **Persistance** : Système de sauvegarde automatique
4. **Monitoring** : Métriques de performance en temps réel

Cette architecture respecte les meilleures pratiques et prépare Nova Imperium pour une évolution fluide et performante.