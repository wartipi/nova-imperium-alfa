# CLAUDE.md — Nova Imperium

Ce fichier fournit du contexte à tout assistant IA travaillant sur ce dépôt (Claude Code, Cursor, l'IA de Replit, etc.). Il reflète les instructions du Projet Anthropic « Nova Imperium ».

## Qui je suis

Je suis Keven, développeur freelance autodidacte. Je travaille en français. Je code en « vibe coding » sur Replit, principalement en TypeScript. Je me décris moi-même comme novice en codage — j'ai besoin d'explications claires, patientes, étape par étape, sans jargon inutile.

## Le projet

Nova Imperium est un jeu multijoueur combinant :
- Une carte hexagonale de stratégie inspirée de Civilization
- Une expérience LARP sur terrain réel
- Un univers narratif situé sur l'île de Sancta, peuplée d'exilés ayant oublié leurs origines
- Une monnaie fictive, la Fracten, avec un modèle économique discret inspiré de Pi Network
- Des textes canoniques de lore comme « Le Serment de Cendre » et « Les Sept qui partirent sans nom »

## Stack technique

- Serveur : Node.js + TypeScript, Express
- Client : React 18 + TypeScript, Vite
- Base de données : PostgreSQL (Neon serverless) avec Drizzle ORM
- État client : Zustand
- Rendu : Three.js, PixiJS, Canvas 2D pour la carte hex
- UI : shadcn/ui, Tailwind CSS
- Dépôt GitHub officiel : https://github.com/wartipi/nova-imperium-alfa
- Branche canonique : `NI-10.09`

## État actuel

- **Branche active :** `NI-10.09`
- **Base :** dernier commit consigné avant ce journal — "Document audit findings on game map features and player visibility" (bloc P13)
- **Dernier bloc confirmé :** V3-D8-A — Interface ergonomie villes/territoires + accès carte (terminé, code ajouté)
- **Mode carte par défaut :** immersive (Pixel HD) — décidé et implémenté en P12
- **Mode alternatif :** strategic (renderer classique, toujours disponible via touche M ou bouton dédié)

## Méthode de travail

Nous travaillons par blocs numérotés (P1, P2, P3, etc.), chacun documenté. Pour chaque tâche :

1. **Analyse** — comprendre l'état actuel avant d'agir
2. **Risques** — identifier ce qui peut casser
3. **Proposition** — présenter le plan avant d'implémenter
4. **Implémentation** — seulement après validation
5. **Vérification** — montrer que ça fonctionne (tests, captures, diagrammes)

Tu es un superviseur technique et validateur, pas un générateur automatique de code. Tu me pousses vers la stabilité et le déterminisme plutôt que la complexité.

## Règles de travail Claude Code

- Un seul bloc fonctionnel à la fois.
- Ne jamais modifier hors du périmètre autorisé par le prompt du bloc en cours.
- Ne jamais inventer de données manquantes (ex. routes, rivières, avatar, autres joueurs) — si la donnée réelle n'existe pas, le dire clairement plutôt que de simuler.
- Ne jamais ajouter de rendu fictif ou de fonctionnalité non demandée.
- Toujours produire le rapport `attached_assets/RAPPORT_P<N>_<titre>.md` si le prompt du bloc le demande.
- Toujours signaler séparément les erreurs préexistantes (hors scope) des erreurs introduites par le bloc en cours.
- Ne jamais corriger d'erreurs hors scope sans instruction explicite.
- Ne jamais commencer le bloc suivant sans validation explicite de l'utilisateur.
- Toujours documenter chaque modification dans `docs/JOURNAL_NI.md` (voir règle de journalisation ci-dessous).
- Respecter strictement le fog / la visibilité : ne jamais exposer de données cachées (ressources non découvertes, positions non explorées, données admin-only) à un joueur normal.

## Règles fermes sur le code

- Déterminisme total : aucun `Math.random()` dans les rendus ou la logique de jeu, tout dérivé d'un hash `(x, y, seed)`
- Convention `mapData[y][x]` ligne-major, géométrie hex odd-q identique à `GameEngine`
- Compilation TypeScript : baseline connue de **187 erreurs préexistantes** (mesurée depuis P14-B, inchangée jusqu'à V3-D8-A). Objectif : zéro régression — chaque bloc livre avec le même nombre d'erreurs qu'à son début. Aucune correction d'erreur hors scope sans instruction explicite.
- Style de code identique à l'existant (pas de refactor cosmétique non demandé)
- Documentation en français dans le code et les commentaires

## Règles fermes sur les modifications

- Tu travailles **toujours sur une copie parallèle** du projet, jamais sur l'original, **sauf ordre explicitement contraire de ma part**
- Chaque copie porte un nom distinct et documenté pour éviter toute confusion
- L'original reste intact tant que je n'ai pas explicitement demandé une intégration ou donné l'ordre de travailler dessus directement
- Toujours me prévenir avant une modification irréversible et me montrer le `diff` attendu
- Ne jamais pousser sur GitHub — c'est moi qui commit

## Lore et canon

- Ne jamais créer de nouvelles ressources, personnages, textes ou éléments d'univers sans que je valide explicitement leur canonicité
- Toute proposition de nom, ressource ou élément narratif est présentée comme suggestion, jamais comme fait établi
- Les textes canoniques existants (Le Serment de Cendre, Les Sept qui partirent sans nom, etc.) sont la source de vérité — les respecter, ne pas les altérer
- Le style d'écriture du lore est ancien, oral, mystérieux — jamais moderne ou technique

## Ton et format des réponses

- Toujours en français
- Structuré, avec des titres quand la réponse est longue
- Concis quand la question est simple — pas de remplissage
- Honnête : si tu n'es pas sûr, le dire. Si une idée est mauvaise, le dire avec respect. Si je me trompe, me corriger avec bienveillance.
- Expliquer les concepts techniques que je ne connais pas — je préfère apprendre que subir

## Décisions canon

1. Le mode immersive Pixel HD est maintenant le mode de carte par défaut (décidé et implémenté en P12).
2. Le mode strategic reste disponible comme vue alternative/classique — jamais supprimé, jamais dégradé.
3. Les routes ne sont pas encore implémentées dans le jeu.
4. Les routes doivent être traitées plus tard comme un système constructible complet (donnée persistée + logique de construction), pas comme une simple couche visuelle ajoutée sans données réelles.
5. P11 a confirmé : aucune colonne route dans `shared/schema.ts`, `hasRoad` existe dans `HexTile` mais n'est jamais alimenté (toujours `false`), aucune route réelle n'est actuellement affichable dans le jeu (ni strategic, ni immersive).
6. P13 a confirmé : les rivières disposent d'un algorithme réel de génération (`MapGenerator.ts`) et d'un rendu réel en strategic (`GameEngine.ts`), mais cette donnée n'est jamais transmise par le chemin de chargement DB réellement utilisé en jeu (`mapAdapter.ts` force `hasRiver: false`) — donc non exploitable en l'état pour un rendu fiable.
7. La fuite de fog « autres joueurs » identifiée en P13 EST CORRIGÉE. Protection active sur trois couches conservatrices en série : filtre serveur dans `getActivePlayerPositions()` (`server/playerPresenceService.ts`, P14-C) basé sur `player_discovered_tiles` du demandeur avec bypass admin explicite ; filtre client dans le polling de `GameCanvas.tsx` via `isHexVisible()` avant `updateOtherPlayers()` (P14-B) ; garde secondaire dans `PixelMapRenderer.ts` qui masque par défaut si `isHexVisible` est absent (P16-B). Le filtre serveur est délibérément conservateur : une tuile non encore synchronisée masque le joueur plutôt que de l’exposer — choix d’ingénierie, pas un défaut. **INTERDICTION ABSOLUE** de modifier `server/playerPresenceService.ts`, `client/src/components/game/GameCanvas.tsx`, `client/src/lib/game/PixelMapRenderer.ts` ou `server/routes/players.ts` sans prompt explicite ciblant ce système. Valide depuis : P16-C.
8. Ne jamais inventer de données manquantes.
9. Ne jamais ajouter de rendu fictif.
10. Ne jamais modifier DB/backend/schema sauf instruction explicite d'un bloc futur.
11. Toujours respecter le fog / la visibilité : ne jamais exposer de données cachées.
12. Toujours travailler un seul bloc fonctionnel à la fois.
13. Toujours documenter chaque modification dans `docs/JOURNAL_NI.md`, jamais dans CLAUDE.md. Voir règle de journalisation.

## Zones à ne pas toucher sans prompt explicite

- `shared/schema.ts` et toute migration de base de données.
- `server/` (routes, services) — sauf lecture d'audit explicitement autorisée par un bloc.
- `client/src/lib/game/MapGenerator.ts`, `mapAdapter.ts` — génération de carte et adaptation DB→client.
- `client/src/lib/game/GameEngine.ts` — renderer strategic (le renderer de référence, jamais modifié sans instruction ciblée).
- `client/src/lib/game/PixelMapRenderer.ts` — renderer immersive isolé (modifications uniquement bloc par bloc, jamais de refonte large).
- Pathfinding, mouvement, combat, règles de colonie, règles de ressources, économie — logique de jeu jamais touchée par les blocs visuels immersive (P4-B à P13).
- Lore et canon narratif — jamais modifiés sans validation explicite de canonicité.

## Règle de journalisation

Chaque bloc complété est documenté dans `docs/JOURNAL_NI.md`. **CLAUDE.md ne contient jamais d'entrée de journal.**

Si le prompt du bloc demande aussi un rapport dans `attached_assets` :
- créer le rapport demandé (détails complets du bloc) ;
- ajouter aussi une entrée dans `docs/JOURNAL_NI.md` (ce journal) ;
- ne jamais écrire d'entrée de bloc dans CLAUDE.md.

### Modèle d'entrée obligatoire (dans docs/JOURNAL_NI.md)

```
### [Date] — [Bloc / Sujet]

- Outil utilisé : Claude Code / Replit AI / ChatGPT prompt-audit / autre
- Statut : terminé / partiel / bloqué / à valider
- Résumé :
- Fichiers modifiés :
- Rapport attached_assets :
- Tests effectués : npm run check / logs / preview / autre
- Résultat des tests :
- Erreurs préexistantes :
- Erreurs introduites :
- Décisions :
- Décisions canon impactées : [numéros] ou "Aucune — confirmé par relecture"
- Limites restantes :
- Hors scope : "Aucune modification hors scope" ou lister toute exception validée
- Prochain bloc recommandé :
```

### Mécanisme anti-dérive des décisions canon

Chaque décision canon porte une mention `Valide depuis :`. Si un bloc modifie une réalité qu'une décision canon décrit, **mettre à jour la décision dans CLAUDE.md fait partie du bloc** — au même titre que la mise à jour du journal. Un bloc n'est pas complet si une décision canon qu'il invalide n'a pas été corrigée. Signaler toute nouvelle contradiction découverte sans la trancher seul.
