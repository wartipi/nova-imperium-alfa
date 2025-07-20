# Documentation Nova Imperium

## Vue d'ensemble du projet

Nova Imperium est un jeu stratégique développé en **React** et **TypeScript** avec une architecture moderne et optimisée pour les performances.

## Architecture Technique

### Frontend
- **React 18** avec hooks personnalisés
- **TypeScript** pour la sécurité des types
- **Zustand** pour la gestion d'état globale
- **Tailwind CSS** pour le styling
- **Vite** pour le bundling et le développement

### Backend
- **Express.js** avec TypeScript
- **WebSocket** pour la communication temps réel
- **PostgreSQL** avec Drizzle ORM
- Architecture REST API

## Structure des Dossiers

```
client/src/
├── components/          # Composants React
│   ├── game/           # Composants spécifiques au jeu
│   ├── ui/             # Composants d'interface réutilisables
│   └── optimized/      # Versions optimisées des composants
├── lib/                # Logique métier et utilitaires
│   ├── stores/         # Stores Zustand
│   ├── game/           # Moteur de jeu et types
│   ├── systems/        # Systèmes de jeu (vision, ressources, etc.)
│   └── types/          # Définitions TypeScript
├── tests/              # Tests unitaires
└── docs/               # Documentation
```

## Stores Zustand

### useGameState
**Responsabilité :** Gestion de l'état global du jeu

**État :**
- `gamePhase`: Phase actuelle du jeu ('loading' | 'menu' | 'jeu' | 'pause')
- `currentTurn`: Numéro du tour actuel
- `isGameMaster`: Mode Maître de Jeu activé

**Actions :**
- `initializeGame()`: Initialise le jeu
- `endTurn()`: Termine le tour actuel et passe au suivant
- `toggleGameMaster()`: Active/désactive le mode MJ
- `setGamePhase(phase)`: Change la phase du jeu

**Usage :**
```typescript
const { currentTurn, endTurn, gamePhase } = useGameState();

// Terminer le tour
endTurn();

// Vérifier la phase
if (gamePhase === 'jeu') {
  // Logique de jeu
}
```

### usePlayer
**Responsabilité :** Gestion du joueur, expérience, ressources et avatar

**État principal :**
- `level`: Niveau du joueur
- `experience`: Expérience actuelle
- `actionPoints`: Points d'action disponibles
- `resources`: Ressources du joueur (nourriture, or, mana, etc.)
- `avatarPosition`: Position de l'avatar sur la carte

**Actions principales :**
- `gainExperience(amount)`: Ajoute de l'expérience
- `spendActionPoints(cost)`: Dépense des points d'action
- `moveAvatarToHex(x, y)`: Déplace l'avatar
- `isHexVisible(x, y)`: Vérifie la visibilité d'un hexagone

**Exemple d'utilisation :**
```typescript
const { level, actionPoints, gainExperience, spendActionPoints } = usePlayer();

// Gagner de l'expérience
gainExperience(50);

// Dépenser des points d'action
if (spendActionPoints(5)) {
  // Action réussie
}
```

### useMap
**Responsabilité :** Gestion de la carte hexagonale

**État :**
- `mapData`: Données de la carte
- `selectedHex`: Hexagone sélectionné
- `mapSize`: Taille de la carte

**Actions :**
- `generateMap(width, height)`: Génère une nouvelle carte
- `setSelectedHex(hex)`: Sélectionne un hexagone
- `getHexAt(x, y)`: Récupère un hexagone aux coordonnées données

## Composants Optimisés

### MedievalHUDOptimized
Interface utilisateur principale avec optimisations de performance.

**Caractéristiques :**
- Utilise `React.memo` pour éviter les re-rendus inutiles
- Callbacks mémoïsés avec `useCallback`
- États calculés avec `useMemo`
- Sous-composants séparés et mémoïsés

**Usage :**
```typescript
import { MedievalHUDOptimized } from './components/game/optimized/MedievalHUDOptimized';

function Game() {
  return <MedievalHUDOptimized />;
}
```

### GameCanvasOptimized
Canvas de jeu avec rendu optimisé.

**Optimisations :**
- Limitation du taux de rafraîchissement (60 FPS max)
- Gestion optimisée des événements souris
- Initialisation mémoïsée du moteur de jeu
- Contrôles de caméra séparés

## Types TypeScript Optimisés

### Interface Ressource
```typescript
interface Ressource {
  type: 'or' | 'bois' | 'nourriture' | 'mana' | 'cristaux' | 'pierre' | 'fer';
  quantité: number;
  maxQuantité?: number;
}
```

### Interface Tuile
```typescript
interface Tuile {
  x: number;
  y: number;
  type: TypeTerrain;
  bâtiment?: Bâtiment;
  unité?: Unité;
  ressource?: Ressource;
  exploré: boolean;
  visible: boolean;
  coutDéplacement: number;
}
```

### Interface ÉtatJeu
```typescript
interface ÉtatJeu {
  ressources: RessourcesCollection;
  carte: Tuile[][];
  tour: number;
  phase: 'chargement' | 'menu' | 'jeu' | 'pause';
  joueurActuel: string;
  pointsAction: {
    actuels: number;
    maximum: number;
    régénérationParTour: number;
  };
}
```

## Tests Unitaires

### Configuration Jest
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
};
```

### Exemple de test pour un hook
```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../lib/stores/useGameState';

describe('useGameState', () => {
  it('devrait incrémenter le tour correctement', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.endTurn();
    });

    expect(result.current.currentTurn).toBe(2);
  });
});
```

## Bonnes Pratiques

### Performance
1. **Mémorisation :** Utiliser `React.memo`, `useCallback`, `useMemo`
2. **Lazy Loading :** Charger les composants à la demande
3. **Optimisation du rendu :** Limiter les re-rendus inutiles
4. **Gestion mémoire :** Nettoyer les listeners et timers

### TypeScript
1. **Types précis :** Éviter `any`, utiliser des unions types
2. **Interfaces claires :** Documenter la structure des données
3. **Validation :** Utiliser Zod pour la validation runtime
4. **Génériques :** Pour la réutilisabilité du code

### Tests
1. **Couverture :** Viser 80%+ de couverture de code
2. **Tests unitaires :** Pour chaque hook et utilitaire
3. **Tests d'intégration :** Pour les workflows complets
4. **Mocks appropriés :** Isoler les dépendances externes

### Architecture
1. **Séparation des responsabilités :** Un composant = une responsabilité
2. **Réutilisabilité :** Composants génériques et configurables
3. **Maintenabilité :** Code lisible et documenté
4. **Scalabilité :** Structure modulaire et extensible

## Débogage

### Outils de développement
- **React DevTools :** Inspection des composants et état
- **Redux DevTools :** Pour Zustand avec middleware
- **Performance Profiler :** Analyse des performances
- **Console logging :** Debug informatif

### Techniques de debug
```typescript
// Logging conditionnel
if (process.env.NODE_ENV === 'development') {
  console.log('État du jeu:', gameState);
}

// Validation runtime
const validateHex = (hex: any): hex is HexTile => {
  return hex && typeof hex.x === 'number' && typeof hex.y === 'number';
};
```

## Déploiement

### Build de production
```bash
npm run build
```

### Variables d'environnement
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
```

### Optimisations de build
- Minification automatique
- Tree shaking
- Code splitting
- Assets optimization

## Maintenance

### Mise à jour des dépendances
```bash
npm audit
npm update
```

### Monitoring des performances
- Bundle analyzer
- Lighthouse reports
- Performance metrics

### Gestion des erreurs
- Error boundaries
- Logging centralisé
- Monitoring d'erreurs