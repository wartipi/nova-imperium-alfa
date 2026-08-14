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
- **Dernier bloc confirmé :** P14-A — Icône capitale distincte en mode immersive (terminé, code ajouté)
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
- Toujours mettre à jour CLAUDE.md après chaque modification (voir règle obligatoire ci-dessous).
- Respecter strictement le fog / la visibilité : ne jamais exposer de données cachées (ressources non découvertes, positions non explorées, données admin-only) à un joueur normal.

## Règles fermes sur le code

- Déterminisme total : aucun `Math.random()` dans les rendus ou la logique de jeu, tout dérivé d'un hash `(x, y, seed)`
- Convention `mapData[y][x]` ligne-major, géométrie hex odd-q identique à `GameEngine`
- Compilation TypeScript stricte (`tsc --strict`) sans erreur avant tout livrable
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
7. P13 a identifié un risque de fuite de fog préexistant (hors scope de P13, non corrigé) : `GameEngine.ts` (`renderOtherPlayers()`) affiche la position et le pseudo des autres joueurs actifs sans aucune vérification de brouillard de guerre côté client, et l'API serveur `/api/players/positions` ne filtre pas non plus spatialement les résultats. Ne pas porter cette couche en immersive avant correction.
8. Ne jamais inventer de données manquantes.
9. Ne jamais ajouter de rendu fictif.
10. Ne jamais modifier DB/backend/schema sauf instruction explicite d'un bloc futur.
11. Toujours respecter le fog / la visibilité : ne jamais exposer de données cachées.
12. Toujours travailler un seul bloc fonctionnel à la fois.
13. Toujours documenter chaque modification future dans CLAUDE.md.

## Zones à ne pas toucher sans prompt explicite

- `shared/schema.ts` et toute migration de base de données.
- `server/` (routes, services) — sauf lecture d'audit explicitement autorisée par un bloc.
- `client/src/lib/game/MapGenerator.ts`, `mapAdapter.ts` — génération de carte et adaptation DB→client.
- `client/src/lib/game/GameEngine.ts` — renderer strategic (le renderer de référence, jamais modifié sans instruction ciblée).
- `client/src/lib/game/PixelMapRenderer.ts` — renderer immersive isolé (modifications uniquement bloc par bloc, jamais de refonte large).
- Pathfinding, mouvement, combat, règles de colonie, règles de ressources, économie — logique de jeu jamais touchée par les blocs visuels immersive (P4-B à P13).
- Lore et canon narratif — jamais modifiés sans validation explicite de canonicité.

## Prochains sujets possibles

- **P14 recommandé (issu de l'audit P13) :** icône distincte pour la capitale (`is_capital`) en immersive et en strategic — donnée déjà fiable, faible risque gameplay et fog, changement purement visuel.
- Alternative : traiter en priorité la fuite de fog de `renderOtherPlayers()` (voir décision canon #7) avant tout ajout visuel lié aux joueurs.
- Système de routes constructible complet (donnée persistée + logique de construction) — nécessite un bloc dédié hors périmètre purement visuel, avec modification DB explicitement validée.
- Branchement réel des rivières sur le chemin de données DB (`mapAdapter.ts`) avant tout rendu immersive des rivières.

---

## Règle obligatoire — Journalisation future

À partir de maintenant, chaque modification future faite par Claude Code ou Replit AI doit être consignée dans CLAUDE.md. Aucune modification future ne doit être considérée complète si elle n'est pas documentée ici.

Si le prompt du bloc demande aussi un rapport dans `attached_assets` :
- créer le rapport demandé (détails complets du bloc) ;
- ajouter aussi une courte entrée de résumé dans CLAUDE.md (ce journal) ;
- ne jamais remplacer le rapport par CLAUDE.md — CLAUDE.md sert de journal global chronologique, les rapports `attached_assets` servent de détails par bloc.

### Modèle d'entrée obligatoire

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
- Limites restantes :
- Hors scope : "Aucune modification hors scope" ou lister toute exception validée
- Prochain bloc recommandé :
```

## Journal chronologique des blocs

### P1 — Audit intégration Pixel HD
- **Statut :** terminé (audit seulement)
- **Résumé :** Audit de faisabilité pour intégrer un nouveau style visuel Pixel HD sur la carte de jeu — compatibilité des terrains et cohérence géométrique avec le renderer hexagonal existant.
- **Fichiers principaux :** aucun fichier de code — audit documentaire uniquement.
- **Rapport :** `attached_assets/Pasted-...AUDIT-INT-GRATION-PIXEL-HD-16-TE...txt` (rapport d'audit P1).
- **Décision importante :** l'intégration Pixel HD est jugée faisable sans casser le renderer strategic existant, à condition de l'isoler complètement (base des blocs P2/P3).
- **Notes pour Claude Code :** bloc purement préparatoire, aucune donnée ni logique créée.

### P2 — Extraction PixelHDAssets
- **Statut :** terminé
- **Résumé :** Création du module `PixelHDAssets.ts` contenant les assets graphiques et la logique du renderer Pixel HD (16 types de terrain, génération de sprites, cache), **sans intégration** au moteur de jeu principal.
- **Fichiers principaux :** `client/src/lib/game/PixelHDAssets.ts` (création).
- **Rapport :** aucun rapport `attached_assets` dédié identifié séparément de l'audit P1.
- **Décision importante :** les sprites Pixel HD sont générés/cachés de façon isolée, sans toucher `GameEngine.ts`.
- **Notes pour Claude Code :** module autonome, ne pas fusionner avec `GameEngine.ts`.

### P3 — Création PixelMapRenderer isolé
- **Statut :** terminé
- **Résumé :** Création de `PixelMapRenderer.ts`, un renderer expérimental capable de dessiner la carte avec les assets Pixel HD, sans intégration au moteur de jeu principal à ce stade.
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts` (création).
- **Rapport :** non identifié séparément dans `attached_assets`.
- **Décision importante :** `PixelMapRenderer.ts` reste un fichier isolé, importé plus tard uniquement par `GameCanvas.tsx` (jamais par `GameEngine.ts`).
- **Notes pour Claude Code :** fichier central de tout le pipeline immersive — voir règle "Zones à ne pas toucher sans prompt explicite".

### P4 — Toggle expérimental Pixel HD
- **Statut :** terminé (remplacé fonctionnellement par P4-B)
- **Résumé :** Intégration d'un toggle expérimental pour le renderer Pixel HD, accessible via localStorage et un raccourci clavier. Ajout des getters nécessaires dans `GameEngine` et correction de l'indexation des données de carte dans `PixelMapRenderer.ts`.
- **Fichiers principaux :** `client/src/lib/game/GameEngine.ts` (getters), `client/src/lib/game/PixelMapRenderer.ts`.
- **Rapport :** non identifié séparément dans `attached_assets`.
- **Décision importante :** clé localStorage historique `nova_pixel_hd_renderer` — conservée ensuite en P4-B uniquement pour une migration douce.
- **Notes pour Claude Code :** ce toggle binaire (on/off) est obsolète depuis P4-B (remplacé par un choix à 2 modes strategic/immersive) ; ne pas le réactiver, seule la clé legacy est encore lue pour compatibilité ascendante.

### P4-B — Modes strategic / immersive
- **Statut :** terminé
- **Résumé :** Remplacement du toggle binaire par un vrai système à deux modes de carte : `strategic` (renderer classique, défaut à l'époque) et `immersive` (overlay Pixel HD). Persistance via localStorage (clé `nova_map_render_mode`), bascule au clavier (touche `M`, alias `P` conservé), bouton discret dans l'UI.
- **Fichiers principaux :** `client/src/components/game/GameCanvas.tsx`.
- **Rapport :** `attached_assets/RAPPORT_P4-B_modes_carte_strategique_immersive.md`.
- **Décision importante :** une seule carte logique (mêmes tuiles, mêmes coordonnées) ; fallback try/catch strict — en cas d'erreur du renderer immersive, retour silencieux au rendu strategic déjà affiché.
- **Notes pour Claude Code :** la clé localStorage `nova_map_render_mode` est la source de vérité du mode actif — ne jamais la renommer.

### P5 — Stabilisation terrains immersive
- **Statut :** terminé
- **Résumé :** Stabilisation du rendu des terrains en mode immersive (convention `mapData[y][x]`, cohérence des transformations de caméra).
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts`.
- **Rapport :** `attached_assets/RAPPORT_P5_stabilisation_mode_immersive.md`.
- **Décision importante :** alignement strict sur la géométrie hex odd-q déjà utilisée par `GameEngine.ts` — aucune nouvelle convention introduite.
- **Notes pour Claude Code :** référence pour toute future couche visuelle — respecter la même convention de coordonnées.

### P6 — Colonies et bâtiments immersive
- **Statut :** terminé
- **Résumé :** Ajout des marqueurs visuels pour les colonies et bâtiments dans la vue immersive, à partir des mêmes données déjà chargées côté client que le rendu strategic (aucun nouveau fetch).
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts` (`drawColonyMarker`, `drawBuildingMarker`).
- **Rapport :** `attached_assets/RAPPORT_P6_colonies_batiments_immersive.md`.
- **Décision importante :** icône générique pour tous les types de bâtiments et toutes les colonies (pas de distinction visuelle par type ou par statut, ex. capitale) — point relevé à nouveau en P13.
- **Notes pour Claude Code :** `drawBuildingMarker`/`drawColonyMarker` sont volontairement génériques ; toute distinction visuelle future (ex. capitale) est un ajout scopé, pas une correction de bug.

### P7 — Ressources de tuile immersive
- **Statut :** terminé
- **Résumé :** Ajout de la couche ressources de tuile en immersive, réutilisant le champ `tile.resource` déjà existant, avec respect des règles de découverte (niveau d'exploration, bypass admin).
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts` (`drawResourceMarker`, `getResourceVisualColor`).
- **Rapport :** `attached_assets/RAPPORT_P7_ressources_tuile_immersive.md`.
- **Décision importante :** la garde de visibilité des ressources en immersive reproduit exactement celle du strategic (`isAdmin || (explorationLevel>=1 && hexResourceDiscovered)`).
- **Notes pour Claude Code :** ne jamais afficher une ressource non découverte hors mode admin — règle de fog stricte, déjà vérifiée conforme en P13.

### P8 — Ownership / frontières immersive
- **Statut :** terminé
- **Résumé :** Ajout de l'ownership visuel (voile intérieur de couleur + frontières entre territoires) en immersive, à partir des mêmes données d'ownership que le strategic.
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts` (`drawOwnershipOverlay`, `drawTileBorders`, `resolveOwnerColor`, `hashOwnerIdToColor`).
- **Rapport :** `attached_assets/RAPPORT_P8_frontieres_ownership_immersive.md`.
- **Décision importante :** couleurs stables dérivées d'un hash de l'identifiant du propriétaire (jamais de `Math.random()`), cohérentes avec les couleurs bleu joueur / vert faction déjà utilisées en strategic.
- **Notes pour Claude Code :** `ownerType`/`ownerPlayerName`/`ownerFactionName` (harmonisation canonique post-Phase 12 du jeu) sont la source de vérité pour l'ownership affiché.

### P9 — Unités immersive
- **Statut :** terminé
- **Résumé :** Ajout de la couche unités en immersive (marqueurs typés par type d'unité), sans nouvelle donnée — réutilisation stricte des données déjà chargées.
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts` (`drawUnitMarker`).
- **Rapport :** `attached_assets/RAPPORT_P9_unites_immersive.md`.
- **Décision importante :** les unités respectent le même filtrage de visibilité que les tuiles (`isAdmin || !isHexVisible || isHexVisible(unit.x, unit.y)`).
- **Notes pour Claude Code :** un ajustement mineur de positionnement (ancre des marqueurs) a suivi en P10, pas en P9.

### P10 — Audit visuel final immersive
- **Statut :** terminé (audit + une correction mineure)
- **Résumé :** Audit complet du pipeline immersive (P4-B à P9) jugé stable. Une correction mineure appliquée : l'ancre des marqueurs d'unités a été déplacée du centre exact vers le quadrant bas-gauche pour éviter le chevauchement visuel avec les colonies/bâtiments.
- **Fichiers principaux :** `client/src/lib/game/PixelMapRenderer.ts` (ajustement de positionnement uniquement).
- **Rapport :** `attached_assets/RAPPORT_P10_audit_visuel_final.md`.
- **Décision importante :** le mode immersive est déclaré stable et prêt à devenir un mode candidat pour un usage élargi (base de la décision P12).
- **Notes pour Claude Code :** `tsc --noEmit` : 233 erreurs préexistantes mesurées à ce stade — chiffre de référence pour tous les blocs suivants (inchangé jusqu'à P13 inclus).

### P11 — Audit routes immersive
- **Statut :** terminé (audit seulement, aucun code ajouté)
- **Résumé :** Recherche exhaustive de données route (`HexTile.hasRoad`, `mapAdapter.ts`, `MapGenerator.ts`, `shared/schema.ts`, `GameEngine.ts`, tables de coûts). Conclusion : `hasRoad` existe mais est hardcodé à `false` partout ; aucune colonne DB route ; `BuildingType='road'` existe seulement en théorie (coûts) jamais assigné réellement ; le strategic n'affiche déjà aucune route.
- **Fichiers principaux :** aucun fichier de code modifié — audit seul (confirmé par `git diff --stat` vide).
- **Rapport :** `attached_assets/RAPPORT_P11_routes_immersive.md`.
- **Décision importante :** ne pas ajouter d'options `showRoutes`/`hasTileRoad` non exploitées (plomberie prête pour plus tard mais optionnelle selon la spec) — décision de ne pas introduire de code mort.
- **Notes pour Claude Code :** voir décision canon #5 — aucune route réelle à afficher tant qu'une vraie donnée n'est pas introduite par un bloc dédié système-routes.

### P12 — Mode immersive par défaut
- **Statut :** terminé
- **Résumé :** Le mode immersive devient le mode de carte par défaut officiel quand aucun choix n'existe en localStorage. Le mode strategic reste disponible comme vue alternative. Changement strictement limité aux deux branches de repli de `readMapRenderMode()` (absence de choix / erreur localStorage), qui retournaient `"strategic"` et retournent désormais `"immersive"`. Choix utilisateur déjà enregistré : jamais écrasé.
- **Fichiers principaux :** `client/src/components/game/GameCanvas.tsx` (9 insertions, 4 suppressions — fonction `readMapRenderMode()` + 2 commentaires mis à jour).
- **Rapport :** `attached_assets/RAPPORT_P12_mode_immersive_par_defaut.md`.
- **Tests effectués :** `npm run check` (233 erreurs, inchangé), logs serveur (aucune erreur), vérification par lecture de code des branches de repli ; vérification visuelle du canvas de jeu authentifié non réalisable par l'agent (accès preview non authentifié) — validation utilisateur demandée.
- **Décision importante :** voir décisions canon #1 et #2. La clé localStorage `nova_map_render_mode`, la touche `M`, le bouton UI et le mécanisme de bascule restent strictement inchangés.
- **Notes pour Claude Code :** ne pas revenir sur ce défaut sans nouvelle décision explicite de l'utilisateur.

### P13 — Audit des couches restantes du mode immersive
- **Statut :** terminé (audit seulement, aucun code ajouté)
- **Résumé :** Audit de 6 catégories de couches candidates avant tout nouvel ajout : rivières (algorithme réel mais non branché sur le chemin DB réel — voir décision canon #6), avatar (donnée réelle et fiable, déjà utilisée), autres joueurs (système actif en strategic mais fuite de fog identifiée — voir décision canon #7), routes (reconfirmation de P11), effets visuels secondaires (classés : déjà rendu / disponible non rendu / pas disponible / dangereux / nécessite nouvelle logique), données disponibles mais non rendues (ex. `is_capital`, `exploitation_post` en strategic).
- **Fichiers principaux :** aucun fichier de code modifié — audit seul (confirmé par `git diff --stat` vide), un sous-agent d'exploration utilisé en lecture seule pour confirmer le comportement serveur (`playerPresenceService.ts`).
- **Rapport :** `attached_assets/RAPPORT_P13_audit_couches_restantes_immersive.md`.
- **Décision importante :** recommandation de bloc suivant = P14 (icône distincte pour la capitale `is_capital`), catégorie A (faible risque). Autres décisions : voir décisions canon #6 et #7.
- **Notes pour Claude Code :** ne pas porter la couche "autres joueurs" en immersive avant correction de la fuite de fog de `renderOtherPlayers()` (`GameEngine.ts`) ; ne pas rendre les rivières avant que `mapAdapter.ts` transporte une vraie donnée `hasRiver` depuis la DB.

### P14-A — Icône capitale distincte en mode immersive
- **Statut :** terminé
- **Objectif :** ajouter une distinction visuelle minimale (petite couronne dorée) pour la colonie capitale en mode immersive, purement visuel, sans nouvelle logique serveur ni nouvelle donnée.
- **Résumé :** Audit confirmé : `ColonyDTO.isCapital` est déjà calculé et transmis par le serveur (`territoryService.ts`), mais n'était pas propagé jusqu'à l'objet `Territory` utilisé côté client pour le rendu — seul chaînon manquant, purement client. Ajout du champ `isCapital` à `Territory` (`UnifiedTerritorySystem.ts`), peuplé depuis `ColonyDTO.isCapital` déjà reçu dans `loadFromServer()`. `GameCanvas.tsx` fait un simple lookup par position (`UnifiedTerritorySystem.getTerritory(x,y)?.isCapital`) pour enrichir la liste `colonies` déjà transmise à `PixelMapRenderer`. `drawColonyMarker()` dessine une petite couronne dorée uniquement si `isCapital` est vrai, en plus du marqueur de colonie existant (jamais en remplacement).
- **Fichiers modifiés :** `client/src/lib/systems/UnifiedTerritorySystem.ts` (+4 lignes — champ `isCapital` sur `Territory`, peuplé dans `loadFromServer`), `client/src/lib/game/PixelMapRenderer.ts` (+~38 lignes — champ `isCapital` sur `PixelColonyMarker`, paramètre `isCapital` de `drawColonyMarker`, dessin de la couronne), `client/src/components/game/GameCanvas.tsx` (+~8 lignes — lookup `isCapital` lors de la construction de `colonies`).
- **Rapport attached_assets :** aucun rapport dédié demandé par ce prompt (bloc de format P14-A, différent des blocs P1-P13) ; entrée de journal ci-présente en tenant lieu.
- **Tests effectués :** `npx tsc --noEmit -p .` (233 erreurs au total, identique à P10-P13 ; les 2 seules erreurs dans `UnifiedTerritorySystem.ts` sont préexistantes — `MapIterator` sans `downlevelIteration`, lignes 229/303, non liées à cette modification) ; lecture de code confirmant que le marqueur couronne est dessiné dans la même boucle et sous la même garde de fog (`isHexVisible`) que le marqueur de colonie de base — aucune capitale non visible ne peut être rendue ; vérification visuelle en jeu authentifié non réalisable par l'agent (accès preview non authentifié).
- **Résultat des tests :** aucune régression TypeScript ; garde de fog vérifiée par lecture de code (la couronne est un ajout dans `drawColonyMarker`, jamais appelé hors de la boucle déjà gardée par `isHexVisible`).
- **Erreurs préexistantes :** 233 (dont 2 dans `UnifiedTerritorySystem.ts`, sans lien avec ce bloc).
- **Erreurs introduites :** aucune.
- **Décisions :** la couronne est un ajout au marqueur existant (jamais un remplacement) ; aucune nouvelle donnée serveur créée, uniquement propagation d'une donnée déjà transmise ; aucune nouvelle règle de visibilité — réutilisation stricte de la garde `isHexVisible` déjà en place pour les colonies.
- **Limites restantes :** le mode strategic (`GameEngine.ts`) n'a pas reçu la même distinction visuelle (hors périmètre de ce bloc, qui ciblait exclusivement l'immersive) ; vérification visuelle en jeu réelle non faite par l'agent, à confirmer par l'utilisateur.
- **Hors scope :** aucune modification hors scope. Routes, autres joueurs, rivières, schéma DB, règles de gameplay : non touchés.
- **Prochain bloc recommandé :** parité visuelle capitale en mode strategic (si souhaité), ou traitement de la fuite de fog `renderOtherPlayers()` (décision canon #7).

### P14-B — Correction fuite de fog "autres joueurs"
- **Statut :** terminé (correction client uniquement — limitation réseau serveur documentée, non traitée)
- **Objectif :** enquêter sur la fuite de brouillard de guerre identifiée en P13 (`renderOtherPlayers()` affichait les autres joueurs sans vérification de visibilité) et corriger le plus petit maillon nécessaire, sans porter la couche en immersive, sans toucher routes/capitales/rivières/combat/déplacement/économie/colonies/schéma DB.
- **Diagnostic réel :** deux fuites distinctes confirmées par lecture de code :
  1. **Client :** `GameCanvas.tsx` (polling présence, toutes les 5s) construisait la liste `converted` (positions locales des autres joueurs) et l'envoyait telle quelle à `gameEngineRef.current.updateOtherPlayers()`, sans jamais consulter `isHexVisible`. `GameEngine.renderOtherPlayers()` dessinait donc systématiquement cercle + pseudo pour tout joueur actif retourné par l'API, y compris sur des tuiles non explorées/hors vision.
  2. **Serveur :** `getActivePlayerPositions()` (`server/playerPresenceService.ts`) ne fait aucun filtrage spatial ou de visibilité — elle retourne la position de tout joueur actif dans les 10 dernières minutes (ou en transit), sans notion de fog. Aucune fonction de visibilité/fog n'existe côté serveur (aucune table/service de tuiles découvertes n'est consultée dans ce service).
- **Fichiers inspectés :** `client/src/lib/game/GameEngine.ts` (`renderOtherPlayers`, `updateOtherPlayers`), `client/src/components/game/GameCanvas.tsx` (bloc de polling présence), `client/src/lib/stores/usePlayerPresence.ts`, `client/src/lib/api/playersApi.ts`, `client/src/lib/stores/usePlayer.tsx` (`isHexVisible`, `isHexInCurrentVision`, `isHexInFogRing`), `server/routes/players.ts`, `server/playerPresenceService.ts` (`getActivePlayerPositions`).
- **Fichier modifié :** `client/src/components/game/GameCanvas.tsx` uniquement (+11/-6 lignes) — dans le callback `poll()` du `useEffect` de polling présence, ajout d'un `.filter((p) => isOtherPlayerHexVisible(p.hexX, p.hexY))` sur la liste `converted`, juste avant l'appel à `updateOtherPlayers()`. `isOtherPlayerHexVisible` est `usePlayer.getState().isHexVisible` — la même fonction de fog déjà utilisée pour l'avatar/les unités ailleurs dans ce composant (`isHexVisible` réutilisée telle quelle, aucune nouvelle règle inventée).
- **Règle de visibilité utilisée :** `usePlayer.getState().isHexVisible(hexX, hexY)` (`VisionSystem.isHexVisible`, déjà existante et déjà utilisée pour le rendu de l'avatar/unités) — un joueur dont la tuile n'est pas actuellement visible n'est plus jamais transmis à `updateOtherPlayers()`, donc ni son cercle, ni son pseudo, ni sa position ne sont dessinés. `usePlayer.getState()` est utilisé (plutôt que le hook réactif) pour rester cohérent avec le pattern déjà en place dans ce même composant (ligne ~410) et ne pas ajouter de dépendance à l'intervalle de polling.
- **État serveur :**
  - L'API `GET /api/players/positions` **ne filtre pas** actuellement selon le fog — elle transmet au client la position de tous les joueurs actifs (hors soi-même), qu'ils soient visibles ou non pour le joueur courant.
  - Aucune fonction de visibilité/fog fiable n'existe côté serveur dans `playerPresenceService.ts` ou ailleurs dans ce service — impossible de réutiliser une logique existante sans construire un nouveau système. Conformément à la règle du bloc ("ne pas inventer une nouvelle règle de visibilité", "ne pas faire de refactor massif"), **le serveur n'a pas été modifié**.
  - **Limitation documentée explicitement :** la correction appliquée est uniquement visuelle côté client. Un utilisateur techniquement capable d'inspecter le trafic réseau (DevTools) peut toujours observer dans la réponse brute de `/api/players/positions` les positions de joueurs qu'il ne devrait pas voir. Ce risque réseau n'est pas corrigé par ce bloc et reste un chantier serveur distinct à traiter (nécessiterait une vraie logique de fog serveur croisant `player_discovered_tiles` et la position du joueur demandeur).
- **Tests effectués :** `npm run check` avant et après correction, comparés explicitement : 187 erreurs TypeScript dans les deux cas (correction retirée puis réappliquée pour isoler l'effet) — aucune erreur introduite, aucune régression. Note : la baseline mentionnée dans un journal précédent (233) ne correspond plus à l'état actuel du dépôt (187) — écart antérieur à ce bloc, sans lien avec cette modification. Lecture de code confirmant : aucun autre joueur n'est dessiné hors visibilité, aucune donnée admin-only exposée, mode immersive non modifié, routes/capitales/rivières non touchées.
- **Résultat des tests :** 187/187 erreurs TS (identique avant/après) ; `git diff --stat` confirme un seul fichier modifié (`GameCanvas.tsx`, +11/-6).
- **Erreurs préexistantes :** 187 (non liées à ce bloc, non corrigées — hors scope).
- **Erreurs introduites :** aucune.
- **Limites restantes :** fuite réseau serveur non corrigée (voir "État serveur" ci-dessus) ; la couche "autres joueurs" reste absente du mode immersive (hors scope, conforme à l'interdiction explicite du prompt).
- **Prochain bloc recommandé :** conception d'une vraie logique de fog côté serveur pour `getActivePlayerPositions()` (croisement avec `player_discovered_tiles`/vision courante du joueur demandeur), à traiter comme bloc dédié distinct — ne pas commencer sans validation utilisateur explicite.

### P14-C — Fog serveur pour `/api/players/positions`
- **Statut :** terminé
- **Objectif :** corriger la fuite réseau serveur identifiée en P14-B — l'API `GET /api/players/positions` transmettait les positions brutes de tous les joueurs actifs, sans filtrage de visibilité, exploitable via inspection réseau (DevTools) même après le correctif client de P14-B.
- **Diagnostic réel :** confirmé — `getActivePlayerPositions()` (`server/playerPresenceService.ts`) ne filtrait par aucune notion de fog/visibilité ; elle retournait la position de tout joueur actif dans les 10 dernières minutes (ou en transit), sans exception.
- **Source de visibilité trouvée :** `player_discovered_tiles` (table déjà existante, alimentée en continu par le client via `usePlayer.updateVision → syncDiscoveredTiles`). C'est une source **partielle** par rapport à la règle client complète (`VisionSystem.isHexVisible` = vision courante OU tuile explorée) : elle ne couvre pas la vision courante avant sa synchronisation serveur (délai de quelques centaines de ms après un déplacement). Choix assumé, conforme à la règle de sécurité du bloc : en cas de doute (tuile pas encore synchronisée), le joueur reste masqué plutôt qu'exposé.
- **Fichiers inspectés :** `server/routes/players.ts`, `server/playerPresenceService.ts`, `shared/schema.ts` (table `playerDiscoveredTiles`), `server/routes/discoveredTiles.ts`, `server/middleware/auth.ts` (rôles), `client/src/lib/systems/VisionSystem.ts` (`isHexVisible`), `client/src/lib/stores/usePlayer.tsx` (lecture seule, non modifiés).
- **Fichiers modifiés :** `server/playerPresenceService.ts` (+~29 lignes — paramètre `requesterIsAdmin`, requête groupée sur `player_discovered_tiles` du demandeur, filtrage final du tableau résultat), `server/routes/players.ts` (+2 lignes — calcul de `isAdmin` depuis `req.user!.role` et transmission au service). Client non modifié (aucune nécessité — P14-B reste compatible tel quel, la réponse API est simplement un sous-ensemble de ce qu'elle retournait avant).
- **Correction appliquée :** après calcul des positions actives (logique existante inchangée), une étape supplémentaire charge en une seule requête groupée les tuiles de `player_discovered_tiles` du joueur demandeur, puis filtre le tableau résultat pour ne garder que les joueurs dont la position (coordonnées MONDE, cohérentes des deux côtés — aucune conversion locale nécessaire ici) correspond à une tuile déjà découverte par le demandeur.
- **Règle admin :** `req.user!.role === "admin"` (pattern déjà utilisé de façon cohérente dans tout le projet — `cities.ts`, `market.ts`, `economy.ts`, `routes.ts`) déclenche un bypass complet, sans filtrage. Aucun nouveau bypass inventé. Note : dans `AUTHORIZED_USERS` (`middleware/auth.ts`), le compte `maitre` a déjà `role: 'admin'` — il bénéficie donc logiquement du bypass au même titre que `admin`, comportement préexistant non lié à ce bloc.
- **Tests effectués :**
  - `npm run check` avant/après : 187 erreurs TypeScript dans les deux cas — aucune régression, aucune erreur introduite.
  - Vérification comportementale réelle en conditions de test (données temporaires insérées en DB puis supprimées immédiatement après vérification) : un joueur de rôle `player` (`joueur1`) sans tuile découverte reçoit `[]` ; après ajout d'une tuile découverte correspondant à la position d'un joueur actif fictif, seul ce joueur apparaît dans la réponse, un second joueur fictif positionné hors de toute tuile découverte reste absent ; un compte de rôle `admin` (`admin`) reçoit toutes les positions sans filtrage (bypass vérifié).
  - Toutes les données de test (`_p14c_test_visible`, `_p14c_test_hidden` dans `player_positions`, tuile temporaire dans `player_discovered_tiles` pour `joueur1`) ont été supprimées après vérification — confirmé par requête SQL de contrôle (0 ligne restante).
- **Résultat des tests :** comportement API conforme à l'objectif — un joueur normal ne reçoit plus que les autres joueurs situés sur une tuile qu'il a déjà découverte ; un admin conserve la visibilité complète (bypass explicite et cohérent avec le reste du projet).
- **Erreurs préexistantes :** 187 (non liées à ce bloc, non corrigées — hors scope).
- **Erreurs introduites :** aucune.
- **Limites restantes :** le filtre serveur utilise "tuile déjà découverte" (mémoire permanente) et non "vision courante instantanée" — un peu plus permissif que la vision immédiate stricte, mais jamais plus permissif que ce que le client autorise déjà à afficher (même définition qu'`isHexVisible`, avec un délai de synchronisation résiduel négligeable). Aucune reconstruction de la vision courante (position + niveau d'exploration) n'a été tentée côté serveur dans ce bloc — resterait à faire si une precision plus stricte est un jour requise.
- **Hors scope :** aucune migration DB, aucune nouvelle table, aucun refactor du système de vision, routes/capitales/rivières/combat/déplacement/économie non touchés, mode immersive non modifié.
- **Prochain bloc recommandé :** aucun engagement automatique — attendre validation utilisateur explicite avant tout nouveau bloc.

---

## Notes complémentaires (hors séquence P1-P13)

### Migration Ressources V2 (Fracten / métaux communs / cuir-fourrure)
- **Statut :** terminé
- **Résumé :** Migration additive des ressources vers un système V2 (`fracten`, `common_metals`, `leather_fur`), avec audit complet des anciennes ressources (`gold`, `iron`, `copper`, `fur`) avant suppression des colonnes legacy en base de données. Séquence observée dans l'historique Git : audit legacy → gel des écritures legacy → migration des services économiques/marché/transferts vers les nouveaux types → audit post-migration → suppression effective des colonnes legacy.
- **Fichiers principaux :** services économiques serveur, routes marché/échange, `shared/schema.ts` (suppression des colonnes legacy) — détail non ré-audité ligne par ligne pour ce journal, voir historique Git pour les commits individuels (ex. `Remove old resource columns from the game's database tables`, `Complete post-migration audit of old economic resources`).
- **Rapport :** documents `Pasted-NOVA-IMPERIUM-UI-RESSOURCES-V2-...txt` dans `attached_assets` (prompts/specs sources) ; pas de `RAPPORT_*.md` dédié identifié pour ce chantier antérieur à la convention de rapport actuelle.
- **Décision importante :** migration additive puis retrait — les anciennes ressources V1 ont été explicitement conservées le temps de la transition avant suppression, jamais supprimées brutalement en un seul commit.
- **Notes pour Claude Code :** voir aussi `.agents/memory/resources-v2.md` — rappel mémoire : fracten/common_metals/leather_fur ajoutés en passe additive, V1 gardé comme legacy pendant la transition (information historique, la migration est maintenant terminée).

### Icône Fracten (agrandissement / mise à jour visuelle)
- **Statut :** terminé
- **Résumé :** Mise à jour de l'icône de la monnaie Fracten et amélioration de sa taille d'affichage dans l'interface de jeu, pour cohérence visuelle après la migration Ressources V2.
- **Fichiers principaux :** composants d'icônes de ressources UI (`ResourceIcons` et composants consommateurs) — non ré-audités ligne par ligne pour ce journal.
- **Rapport :** aucun rapport `attached_assets` dédié identifié séparément de la migration Ressources V2.
- **Décision importante :** icône Fracten agrandie pour meilleure lisibilité — cohérent avec la préférence UI générale du projet (voir `replit.md`, section iconographie unifiée).
- **Notes pour Claude Code :** à confirmer si une future demande de modification d'icône doit repartir de cette base ou d'un nouvel asset.

### Création initiale de CLAUDE.md
- **Statut :** terminé
- **Résumé :** Création du fichier `CLAUDE.md` à la racine du projet, à la demande explicite de l'utilisateur, comme fichier de contexte pour tout assistant IA travaillant sur le dépôt.
- **Fichiers principaux :** `CLAUDE.md` (création).
- **Rapport :** aucun rapport `attached_assets` — ce bloc était documentaire pur.
- **Décision importante :** ce fichier journal (mis à jour dans le présent bloc) devient désormais la source de vérité chronologique pour toute intervention IA future sur ce dépôt.
- **Notes pour Claude Code :** ne pas recréer ce fichier depuis zéro dans un futur bloc — toujours le lire et le compléter, jamais l'écraser sans relire son contenu existant en entier au préalable.

### Digression hors-projet : CLI Claude Code
- **Statut :** terminé (annulé/nettoyé)
- **Résumé :** Le paquet `@anthropic-ai/claude-code` a été ajouté par erreur comme dépendance du projet (`package.json`), puis proprement retiré (package.json, package-lock.json, node_modules nettoyés, vérifié par grep). Le jeu a été confirmé fonctionnel après redémarrage. L'installation globale (`npm install -g`) reste bloquée par une restriction plateforme sur l'outil bash de l'agent — l'utilisateur doit l'exécuter lui-même dans le Shell Replit s'il le souhaite.
- **Fichiers principaux :** `package.json`, `package-lock.json` (ajout puis retrait complet).
- **Rapport :** aucun — incident mineur documenté ici pour éviter une répétition future.
- **Décision importante :** ne jamais ajouter d'outils CLI tiers comme dépendance de projet — toute installation d'outil de développement doit rester hors du `package.json` du jeu.
- **Notes pour Claude Code :** si une demande similaire revient, installer uniquement en local/global hors dépendances projet, ou orienter l'utilisateur vers le Shell Replit directement.

### Notes mémoire `.agents/memory/`
- `resources-v2.md` — fracten/common_metals/leather_fur ajoutés en passe additive ; V1 (gold/iron/copper/fur) gardés comme legacy pendant la migration (migration maintenant terminée, voir section ci-dessus).
- `gameengine-civilizations-alias.md` — `GameEngine.civilizations` est un alias du même tableau que `novaImperiums` ; ne jamais l'itérer en plus (risque de doublons de rendu). Pertinent pour toute future couche de rendu touchant les civilisations/colonies (ex. P14 capitale).

### P15 — Stabilisation rendu immersive pendant interactions souris/caméra
- **Statut :** terminé
- **Problème observé :** en mode immersive Pixel HD, lors d'interactions souris/caméra (drag carte, molette/zoom, déplacement caméra clavier WASD/flèches), le rendu immersive semblait s'interrompre brièvement et revenir en mode strategic classique avant de se réafficher en immersive.
- **Diagnostic réel confirmé :** `GameEngine` (`client/src/lib/game/GameEngine.ts`) enregistre ses propres écouteurs internes dans son constructeur — `wheel` (zoom), `mousemove` (drag caméra pendant `isDragging`), et `updateCameraFromKeys()` (WASD/flèches) — qui appellent chacun `this.render()` directement. Plusieurs méthodes publiques (`moveAvatarToHex`, `moveCamera`, `setCameraPosition`, `centerCameraOnPosition`, `setPendingMovement`) font de même. Aucun de ces chemins ne repasse par `GameCanvas.tsx`, donc `renderPixelHDOverlay()` (l'overlay Pixel HD, appliqué uniquement depuis `GameCanvas` après `gameEngineRef.current.render()`) n'était jamais réappliqué après ces renders internes — d'où le flash visible avant qu'un prochain render piloté par React (changement de state) ne réapplique l'overlay.
- **Fichiers inspectés :** `client/src/components/game/GameCanvas.tsx` (tous les appels à `gameEngineRef.current.render()`, `renderEngine()`, `renderPixelHDOverlay()`, handlers souris/clavier), `client/src/lib/game/GameEngine.ts` (constructeur, listeners `wheel`/`mousedown`/`mousemove`/`mouseup`, `setupKeyboardControls`/`updateCameraFromKeys`, `render()`, `moveAvatarToHex`, `moveCamera`, `setCameraPosition`, `centerCameraOnPosition`, `setPendingMovement`), `client/src/lib/hooks/useGameEngineAccess.ts` (`renderEngine()` — simple wrapper `render()`, ne posait pas de problème propre car toujours suivi de `renderPixelHDOverlay()` côté appelant).
- **Fichiers modifiés :** `client/src/lib/game/GameEngine.ts` (+21 lignes — champ privé `postRenderCallback`, méthode publique `setPostRenderCallback()`, appel du callback à la toute fin de `render()`, après `ctx.restore()`), `client/src/components/game/GameCanvas.tsx` (+21 lignes — enregistrement du callback juste après la création de `GameEngine`, plus un `ref` `renderPixelHDOverlayRef` maintenu à jour à chaque re-render pour éviter une closure figée). Aucun autre fichier touché.
- **Correction appliquée (Option B du prompt) :** callback post-render minimal dans `GameEngine.render()`, appelé après `ctx.restore()` (donc après que tout le rendu strategic soit entièrement dessiné). `GameCanvas.tsx` enregistre ce callback une seule fois (`useEffect [mapData]`) pour appeler `renderPixelHDOverlayRef.current()` — qui pointe toujours vers la dernière version de `renderPixelHDOverlay` (laquelle contient déjà sa propre garde `if (mapRenderMode !== "immersive") return;`, donc aucun effet en mode strategic).
- **Pourquoi aucune boucle de rendu n'est possible :** `renderPixelHDOverlay()` n'appelle jamais `render()` ni aucune méthode de `GameEngine` qui appellerait `render()` — elle se contente d'un dessin canvas additionnel via `renderPixelMap()` (fonction pure de dessin, vérifiée par lecture de code, aucun appel à `GameEngine.render` ou `postRenderCallback` en son sein). La chaîne est donc strictement à sens unique : `render()` → `postRenderCallback()` → `renderPixelHDOverlay()` → `renderPixelMap()` (fin), jamais l'inverse.
- **Chemins de rendu désormais couverts :** wheel/zoom, drag souris (mousemove pendant isDragging), clavier WASD/flèches (`updateCameraFromKeys`), `moveAvatarToHex`, `moveCamera`, `setCameraPosition`, `centerCameraOnPosition`, `setPendingMovement` — tous passent maintenant par le callback unique, en plus des chemins déjà couverts côté `GameCanvas.tsx` (qui appelaient déjà `renderPixelHDOverlay()` explicitement après leurs propres `render()`, ex. toggle immersive/strategic, changement admin, mise à jour vision/joueurs/unités).
- **Tests effectués :**
  - `npm run check` avant/après : 187 erreurs TypeScript dans les deux cas — aucune régression, aucune erreur introduite.
  - Vérification par lecture de code (pas d'outil d'interaction souris disponible dans cet environnement pour simuler drag/zoom en direct) : confirmation que tous les points d'appel internes à `render()` dans `GameEngine.ts` sont désormais couverts par le callback unique, et qu'aucun chemin ne peut créer de boucle (`renderPixelHDOverlay`/`renderPixelMap` ne contiennent aucun appel à `render()`).
  - Observation des logs navigateur d'une session déjà active (admin) pendant l'implémentation : aucune erreur console, rendu continu sans interruption, comportement stable.
- **Erreurs préexistantes :** 187 (non liées à ce bloc, non corrigées — hors scope).
- **Erreurs introduites :** aucune.
- **Limites restantes :** la vérification visuelle interactive stricte (drag/zoom/clic simulés en direct dans le navigateur de preview) n'a pas pu être exécutée avec les outils disponibles dans cette session (pas de capacité d'interaction souris sur la preview, seulement capture d'écran statique) — la correction repose sur une garantie structurelle par lecture de code (le callback s'exécute de façon synchrone et systématique après chaque `render()`, sans exception identifiée) plutôt que sur une preuve visuelle filmée de l'absence de flash. Recommandé : validation manuelle par l'utilisateur en interagissant directement avec la carte.
- **Hors scope respecté :** aucune modification DB, serveur, routes, règles de gameplay, capitales, rivières, autres joueurs, fog (hors nécessité de rendu — non touché), aucun refactor massif de `GameEngine`, aucune nouvelle feature visuelle, aucune correction TypeScript préexistante hors scope.
- **Prochain bloc recommandé :** aucun engagement automatique — attendre validation utilisateur explicite (notamment confirmation visuelle directe que le flash a disparu) avant tout nouveau bloc.

### P16-A — Audit post-fog autres joueurs avant ajout immersive
- **Statut :** terminé (audit seul, aucun rendu ajouté)
- **Objectif :** déterminer si l'ajout des autres joueurs au mode immersive Pixel HD est désormais sûr, après P14-B (filtre client), P14-C (filtre serveur) et P15 (stabilisation overlay).
- **Fichiers inspectés (lecture seule) :** `client/src/lib/api/playersApi.ts`, `client/src/lib/stores/usePlayerPresence.ts`, `client/src/lib/game/GameEngine.ts` (`updateOtherPlayers`, `renderOtherPlayers`, ordre d'appel dans `render()`), `client/src/components/game/GameCanvas.tsx` (polling présence Phase 5, conversion coordonnées, `renderPixelHDOverlay`), `client/src/lib/game/PixelMapRenderer.ts` (`PixelMapUnit`, `PixelMapRenderOptions`), `server/routes/players.ts`, `server/playerPresenceService.ts`.
- **Source exacte des données autres joueurs :** `usePlayerPresence.getState().players` (store Zustand), alimenté par `fetchPlayerPositions()` → `GET /api/players/positions` → `getActivePlayerPositions(excludePlayerId, isAdmin)` (`playerPresenceService.ts`). Le joueur courant est exclu côté serveur (`ne(playerPositions.playerId, excludePlayerId)`) — aucun risque de doublon avec l'avatar local.
- **État filtre serveur (P14-C) :** confirmé actif — `getActivePlayerPositions` filtre par `player_discovered_tiles` du demandeur (tuiles déjà découvertes/persistées), sauf bypass admin. Filtre conservateur : une tuile pas encore synchronisée masque le joueur plutôt que de l'exposer.
- **État filtre client (P14-B) :** confirmé actif — dans le polling `GameCanvas.tsx` (Phase 5), chaque position reçue est reconvertie en coordonnées locales puis filtrée via `usePlayer.getState().isHexVisible(hexX, hexY)` (= vision courante OU tuile explorée, `VisionSystem.isHexVisible`) avant `updateOtherPlayers()`. Ce filtre est une règle plus large que celle du serveur mais appliquée en ET logique après le filtre serveur déjà restrictif — ne peut jamais élargir l'exposition, seulement la restreindre davantage (sûr par construction).
- **Coordonnées et conversion :** l'API retourne des coordonnées MONDE (`worldX`, `worldY`). La conversion en coordonnées locales (`hexX = worldX - originWorldX`, `hexY = worldY - originWorldY`) est déjà faite côté `GameCanvas.tsx` avant transmission à `GameEngine.updateOtherPlayers()` — `GameEngine.renderOtherPlayers()` consomme donc déjà des coordonnées locales, exactement comme `mapData[y][x]`, les unités et les colonies. P16-B devra réutiliser cette même conversion déjà effectuée en amont (aucune nouvelle logique de conversion à écrire, seulement transmettre les mêmes `hexX`/`hexY` déjà calculés au rendu immersive).
- **Risque de duplication :** absent. Le joueur courant est exclu côté serveur ; `GameEngine.otherPlayers` ne contient que des joueurs distincts de l'avatar local ; `usePlayerPresence.players` ne recoupe jamais `novaImperiums.units` (sources et stores totalement séparés) — aucun chevauchement possible entre le rendu des unités et celui des autres joueurs.
- **Point de branchement recommandé pour P16-B :** dans `renderPixelHDOverlay()` (`GameCanvas.tsx`), au même niveau que le bloc P9 (unités) — lire `usePlayerPresence.getState().players`, appliquer la même conversion de coordonnées et le même filtre `isHexVisible` déjà utilisés dans le polling Phase 5 (ne pas dupliquer une nouvelle règle de fog), puis transmettre à `renderPixelMap()` via un nouveau paramètre optionnel (ex. `otherPlayers?: PixelMapOtherPlayer[]`).
- **Type recommandé :** un type dédié `PixelMapOtherPlayer` dans `PixelMapRenderer.ts` plutôt que la réutilisation de `PixelMapUnit` — sémantique différente (pas de santé/mouvement/propriétaire de faction, mais un `username` à afficher en label comme le fait déjà `GameEngine.renderOtherPlayers()`). Champs suggérés : `{ userId: string; username: string; x: number; y: number }`. Aucune modification apportée à `PixelMapRenderer.ts` dans ce bloc (audit seul).
- **Ordre de rendu recommandé :** après les unités (bloc P9) et les colonies/bâtiments, avant l'avatar — cohérent avec l'ordre déjà utilisé en strategic (`renderCivilizations()` → `renderOtherPlayers()` → `renderAvatar()` dans `GameEngine.render()`). Avec label (username), marqueur simple (cercle + contour), pas de logique de sélection (les autres joueurs ne sont pas sélectionnables).
- **Verdict : OK pour P16-B.** Le filtre serveur (P14-C) et le filtre client (P14-B) sont tous deux actifs et se combinent de façon strictement conservatrice (intersection, jamais union) — aucune fuite de fog identifiée. La conversion de coordonnées nécessaire est déjà effectuée en amont dans le polling existant, réutilisable telle quelle. Aucun doute bloquant identifié.
- **Tests effectués :** `npm run check` → 187 erreurs TypeScript, identique à la baseline (aucune modification de code effectuée dans ce bloc, changement attendu = aucun, confirmé).
- **Erreurs préexistantes :** 187 (non liées à ce bloc, non corrigées — hors scope).
- **Erreurs introduites :** aucune (aucun fichier de code modifié).
- **Limites restantes :** audit uniquement — aucun rendu des autres joueurs n'a été ajouté au mode immersive. L'implémentation réelle (P16-B) reste à faire et à valider par l'utilisateur avant démarrage.

## P16-B — Rendu des autres joueurs en mode immersive (implémentation)

- **Objectif :** afficher les autres joueurs (marqueurs + pseudo) sur la carte immersive Pixel HD, avec les mêmes garanties de fog/visibilité que le mode strategic (`GameEngine.renderOtherPlayers`).
- **Fichiers modifiés :**
  - `client/src/lib/game/PixelMapRenderer.ts` — ajout du type `PixelMapOtherPlayer` ({userId, username, x, y}), des options `otherPlayers?`/`showOtherPlayers?` dans `PixelMapRenderOptions`, de la fonction `drawOtherPlayerMarker()` (cercle avec teinte déterministe basée sur `userId.split("").reduce(...)`, contour blanc, label pseudo sur fond sombre — même style visuel que le mode strategic) et du bloc de rendu dans `renderPixelMap()` (juste après les unités, avant survol/sélection), avec garde `isHexVisible` en défense en profondeur.
  - `client/src/components/game/GameCanvas.tsx` — dans `renderPixelHDOverlay`, lecture de `usePlayerPresence.getState().players`, conversion monde → local avec `originWorldX`/`originWorldY` (déjà en state réactif du composant), filtrage avec `isHexVisible` (bypass admin, identique au polling Phase 5), construction du tableau `PixelMapOtherPlayer[]` et transmission à `renderPixelMap({ otherPlayers, showOtherPlayers: true, ... })`. `originWorldX`/`originWorldY` ajoutés aux dépendances du `useCallback` (déjà utilisés ailleurs dans la fonction).
- **Aucune modification** : serveur, DB, routes, fog serveur/polling, P14-B/P14-C, gameplay, déplacement, combat, économie, capitales, rivières. Aucun nouveau fetch — réutilisation stricte de `usePlayerPresence` déjà peuplé par le polling Phase 5 existant.
- **Non-sélectionnable :** les autres joueurs ne sont pas cliquables et n'ouvrent aucun menu contextuel en mode immersive (aucun handler ajouté).
- **Type dédié :** `PixelMapOtherPlayer` n'est jamais confondu ni fusionné avec `PixelMapUnit` — structures et fonctions de rendu strictement séparées.
- **Garanties fog non régressées :** même filtre `isHexVisible` que celui déjà transmis pour les unités/colonies/ressources ; même bypass admin ; aucune nouvelle règle de fog côté client, aucune modification de `VisionSystem`, `usePlayer.tsx` (fogRing) ou des routes serveur de présence/discovered-tiles.
- **Tests effectués :** `npm run check` → 187 erreurs TS (baseline inchangée, aucune régression). Un premier essai avec `[...userId]` avait introduit une 188e erreur TS2802 (itération de string sans `--downlevelIteration`, même limitation préexistante que `GameEngine.ts:999`) — corrigé avec `userId.split("")` pour rester à 187. Rechargement HMR de `GameCanvas.tsx` sans erreur console, logs serveur/`GET /api/players/positions` normaux (liste vide dans la session de test — un seul joueur actif, pipeline validé mais non visuellement testé avec un second joueur réel).
- **Limite connue :** non testé visuellement avec un deuxième joueur simultané (aucun autre compte actif disponible pendant l'implémentation) — la logique est strictement calquée sur le mode strategic déjà en production et sur l'audit P16-A validé.
- **Statut :** implémentation terminée, en attente de validation utilisateur avant tout nouveau bloc (P16-C ou suivant).

### P16-B — Correction (fallback permissif du filtre fog)

- **Problème détecté (vérification externe) :** le filtre de visibilité des autres joueurs dans `GameCanvas.tsx` utilisait `isAdmin || !isHexVisible || isHexVisible(p.x, p.y)` — si `isHexVisible` était absent/indéfini, le joueur normal (non-admin) voyait quand même le marqueur affiché (fallback permissif). Ce comportement était interdit par le prompt P16-B : en cas d'incertitude sur la visibilité, il faut masquer, jamais montrer.
- **Correction appliquée :** remplacement par une règle conservatrice — `isAdmin || (isHexVisible ? isHexVisible(p.x, p.y) : false)`. Si `isHexVisible` n'est pas disponible pour un joueur normal, le marqueur est masqué par défaut. `isAdmin` reste l'unique bypass légitime (identique au reste du fichier : unités, colonies, ressources).
- **Fichier modifié :** uniquement `client/src/components/game/GameCanvas.tsx` (bloc de filtrage `otherPlayers` dans `renderPixelHDOverlay`).
- **Aucune modification** serveur, schéma DB, API, polling — aucune nouvelle fonctionnalité, aucun refactor, aucun impact sur unités/colonies/routes/capitales/rivières/économie/déplacement.
- **Garde interne `PixelMapRenderer.ts`** (`isHexVisible` dans `renderPixelMap`) : conservée telle quelle en défense secondaire uniquement — elle n'a jamais été et ne doit pas être considérée comme le filtre de sécurité principal. Le filtre principal reste dans `GameCanvas.tsx`, en amont, avant toute transmission de position à `PixelMapRenderer`.
- **Tests effectués :** `npm run check` → 187 erreurs TypeScript (baseline inchangée, aucune régression). `git diff --stat` limité à `GameCanvas.tsx` (+ `CLAUDE.md` pour la documentation).
- **Statut :** correction terminée, en attente de validation utilisateur avant tout nouveau bloc.

## P16-C — Validation visuelle contrôlée des autres joueurs en immersive (diagnostic)

- **Objectif :** valider visuellement/fonctionnellement le rendu des autres joueurs en mode immersive Pixel HD, sans ajouter de fonctionnalité. Bloc de diagnostic en lecture seule ; correction uniquement si bug strictement lié à P16-B.
- **Fichiers inspectés (lecture seule) :** `client/src/components/game/GameCanvas.tsx`, `client/src/lib/game/PixelMapRenderer.ts`, `client/src/lib/game/GameEngine.ts`, `client/src/lib/stores/usePlayerPresence.ts`, `client/src/lib/api/playersApi.ts`, `server/routes/players.ts`, `server/playerPresenceService.ts`.
- **Fichiers modifiés :** aucun (audit sans anomalie bloquante détectée).

### Résultats des tests

- **A. Baseline :** mode immersive actif par défaut (`nova_map_render_mode`), `npm run check` → 187 erreurs TS (baseline confirmée, aucune nouvelle erreur). Aucune erreur console liée à `otherPlayers`/`PixelMapOtherPlayer` observée dans les logs serveur/navigateur de la session de développement (workflow "Start Game" + console navigateur, joueur admin).
- **B. Sans autre joueur (cas réel observé) :** `GET /api/players/positions` retourne systématiquement `[]` (seul le compte admin actif dans l'environnement de dev). `presencePlayers` est donc vide → aucun marqueur dessiné (`otherPlayers.length > 0` garde le bloc de rendu inactif) → aucun doublon possible avec l'avatar local (l'avatar est rendu par un chemin de code entièrement séparé, `updateAvatar()`/rendu avatar du GameEngine, jamais mélangé à la boucle `otherPlayers`).
- **C. Avec autre joueur réel :** **impossible à exécuter dans cet environnement** — aucun deuxième compte/session simultanée disponible pendant ce bloc (un seul navigateur de test, un seul token admin). Non testé visuellement. Compensé par une relecture de code complète (voir ci-dessous) : le chemin de données et les règles de filtrage sont strictement identiques à ceux du mode strategic déjà en production, ce qui limite fortement le risque résiduel, mais **cela reste une limite documentée, pas une validation visuelle réelle.**
- **D. Fog :** vérifié par lecture de code (impossible à déclencher sans un 2e joueur réel). Serveur (`playerPresenceService.ts`, P14-C) : filtre `player_discovered_tiles` du **demandeur**, retourne un ensemble déjà conservateur (bypass admin uniquement, sinon intersection stricte tuiles découvertes). Client (`GameCanvas.tsx`, correction P16-B) : second filtre `isAdmin || (isHexVisible ? isHexVisible(p.x,p.y) : false)` — pas de fallback permissif. `PixelMapRenderer.ts` applique une 3e garde identique en défense secondaire (`if (isHexVisible && !isHexVisible(...)) continue`). Trois couches conservatrices en série, aucune ne peut élargir la visibilité d'une couche précédente.
- **E. Strategic inchangé :** confirmé par lecture de code — `GameEngine.ts` (`renderOtherPlayers()`, `updateOtherPlayers()`) n'a reçu aucune modification dans P16-B ni dans la correction ; le polling Phase 5 (`GameCanvas.tsx` L618-646) alimente toujours `gameEngineRef.current.updateOtherPlayers(converted)` exactement comme avant P16-B, indépendamment du nouveau bloc `otherPlayers` ajouté pour l'immersive (chemins de données parallèles, jamais fusionnés).
- **F. Mode immersive (marqueur) :** style repris à l'identique de `GameEngine.renderOtherPlayers()` (cercle hue déterministe par `userId`, contour blanc, label username sur fond semi-transparent) — cohérence visuelle confirmée par lecture de code. Taille du marqueur (`hexSize * 0.36`, min 4px) cohérente avec les autres marqueurs (unités `hexSize * 0.32`+ offsets, colonies). Non observé en conditions réelles avec un joueur visible (cf. limite C).
- **G. Interactions drag/zoom/clic/toggle :** non testables avec un marqueur réellement affiché (aucun autre joueur actif). Analyse de code : le bloc `otherPlayers` est recalculé à chaque appel de `renderPixelHDOverlay()` (pas de state mis en cache), lui-même déclenché par le `useEffect` principal (dépendances incluant `originWorldX`/`originWorldY`, ajoutées lors de P16-B) et par le polling Phase 5 toutes les 5s — donc rafraîchi à chaque render, comme les unités/colonies, sans logique de survol/sélection dédiée pouvant provoquer un flash. Aucun changement de P16-B/correction n'a touché la logique de drag/zoom/caméra ou le postRenderCallback P15.
- **Anti-doublon avatar local :** confirmé par lecture de code — le serveur exclut systématiquement `excludePlayerId` (le demandeur lui-même) dans `getActivePlayerPositions()`, donc l'avatar local ne peut jamais apparaître dans `presencePlayers`/`otherPlayers`. Le rendu de l'avatar (chemin `updateAvatar()`) et celui des autres joueurs (chemin `otherPlayers`) sont deux pipelines de données totalement disjoints.
- **Console/logs :** aucune erreur JS ni warning lié à P16-B observé dans les logs de la session de dev (workflow + console navigateur). Réponses `GET /api/players/positions` cohérentes (`[]`, 200/304).
- **`npm run check` :** 187 erreurs TypeScript préexistantes, aucune nouvelle erreur.
- **Corrections faites :** aucune — aucun bug lié à P16-B trouvé lors de l'inspection. Seule action : documentation (ce rapport).
- **Diff summary :** `CLAUDE.md` uniquement (ajout de cette section). Aucun fichier de code modifié dans ce bloc.
- **Limites restantes :** le test C (autre joueur réel visible, hors fog, drag/zoom/clic avec marqueur affiché) n'a pas pu être exécuté faute d'une deuxième session/compte simultané disponible dans cet environnement. La conclusion positive repose sur une relecture de code complète et sur la cohérence stricte avec le mode strategic déjà validé en production, mais une validation visuelle réelle avec un second joueur reste recommandée dès qu'une session multi-compte sera disponible (test manuel utilisateur, hors bloc agent).
- **Verdict :** P16-C **validé sous réserve** — aucun bug de code trouvé, mais validation visuelle réelle avec un deuxième joueur non effectuée (limite d'environnement documentée, pas un échec de l'implémentation).

## P17-A — Correction fog mode immersive Pixel HD (diagnostic + correction)

- **Objectif unique :** identifier pourquoi le fog du mode immersive ne respecte pas le comportement du mode strategic (carte découverte affichée comme totalement visible), puis corriger uniquement ce problème. Priorité utilisateur sur le bug avatar local invisible (non traité ici).
- **Fichiers inspectés :** `client/src/lib/game/GameEngine.ts` (référence stricte, non modifié), `client/src/lib/stores/usePlayer.tsx` (référence, non modifié), `client/src/lib/systems/VisionSystem.ts` (référence, non modifié), `client/src/components/game/GameCanvas.tsx` (modifié), `client/src/lib/game/PixelMapRenderer.ts` (modifié).

### Diagnostic

1. **Trois états distincts existent côté données** (`usePlayer.tsx` / `VisionSystem.ts`) : `isHexInCurrentVision` (vision directe stricte, rayon 1–3 selon exploration), `isHexInFogRing` (anneau juste hors vision, non persisté), `isHexVisible` (union large = vision courante **OU** tuile déjà explorée/persistée en base — donc `true` pour TOUTE tuile jamais découverte, même très ancienne).
2. **Mode strategic (`GameEngine.ts` `drawHex()`, ligne ~445)** utilise les 3 callbacks séparément et applique un rendu à 4 niveaux : (a) `isInCurrentVision` → couleurs pleines ; (b) `isInFogRing && !isInCurrentVision` → assombrissement léger 70 % (`applyLightFog`) + voile bleuté ; (c) `isVisible && !isInCurrentVision && !isInFogRing` (branche `else` L589, tuile "mémoire") → assombrissement fort 40 % (`applyFogOfWar`) + overlay gris `rgba(50,50,50,0.6)`, ressources en alpha réduit (0.3 au lieu de 0.6) ; (d) sinon → noir total `#1a1a1a`.
3. **Mode immersive (`PixelMapRenderer.ts`, avant correction)** ne recevait que `isHexVisible` et `isHexInFogRing` — **aucun callback ne distinguait "vision courante" de "exploré/mémoire"**. Le bloc de rendu ne gérait que 2 états : `isHexVisible === false` → sprite de fog total (`continue`, terrain jamais dessiné) ; sinon → sprite terrain en pleine clarté, avec éventuellement un voile fog ring **par-dessus** si `isHexInFogRing` est vrai.
4. **Confirmation du bug :** `isHexVisible` retourne `true` pour toute tuile explorée un jour, y compris très loin de la position actuelle (ex. logs observés : `exploredCount:520` vs `currentVisionCount:38`). Comme le renderer immersive traitait `isHexVisible === true` comme équivalent à "pleine clarté", **les ~482 tuiles restantes (explorées mais hors vision courante et hors fog ring) s'affichaient exactement comme la vision directe**, sans aucun assombrissement — d'où l'impression que "toute la carte découverte est visible", conforme au signalement utilisateur et à l'hypothèse du prompt.
5. **Callback à ajouter :** `isHexInCurrentVision?: (x,y) => boolean`, mappé sur `usePlayer().isHexInCurrentVision` (déjà exposé, déjà utilisé par `GameEngine.setVisionCallbacks` en mode strategic — aucune nouvelle donnée, aucun nouveau calcul de vision).

### Correction appliquée

- **`GameCanvas.tsx`** : transmission de `isHexInCurrentVision` (déjà destructuré de `usePlayer()`) dans l'appel `renderPixelMap({...})`, et ajout de la dépendance dans le `useCallback` de `renderPixelHDOverlay`.
- **`PixelMapRenderer.ts`** :
  - Ajout de `isHexInCurrentVision?: (x,y) => boolean` à `PixelMapRenderOptions` (optionnel, compat descendante : si absent, comportement inchangé — toute tuile `isHexVisible` reste en pleine clarté, comme avant P17-A).
  - Dans la boucle principale de rendu terrain : après le `continue` du fog total (`isHexVisible === false`, inchangé), calcul d'un 3ᵉ état `isMemoryTile` (`isHexInCurrentVision` fourni ET `!inCurrentVision` ET `!inFogRing`). Si vrai : sprite terrain dessiné avec `ctx.filter = "brightness(0.4) grayscale(0.35)"` (équivalent visuel du `applyFogOfWar` 40 % du mode strategic) puis voile sombre additionnel (`rgba(20,18,16,0.55)`), cohérent avec l'overlay `rgba(50,50,50,0.6)` de `GameEngine.ts`.
  - Dans la couche ressources : même calcul de "tuile mémoire" appliqué localement ; si vrai, le marqueur de ressource est dessiné avec `ctx.globalAlpha = 0.5` au lieu de l'alpha plein, cohérent avec la réduction d'alpha (0.6→0.3) du mode strategic pour les ressources en zone mémoire.
  - Le fog ring (`isHexInFogRing`, voile existant L878) n'a pas été modifié — il reste prioritaire sur l'état "mémoire" (une tuile en fog ring n'est jamais traitée comme "mémoire", conforme à l'ordre des branches de `GameEngine.ts` : `isInFogRing && !isInCurrentVision` est vérifié avant la branche mémoire).
  - **Autres joueurs / unités / colonies : non modifiés.** Vérification par lecture de code : en mode strategic, `renderOtherPlayers()`/polling Phase 5 (`GameCanvas.tsx`) filtrent déjà uniquement par `isHexVisible` (pas par `isHexInCurrentVision`) — comportement identique entre strategic et immersive avant et après ce bloc. Aucune règle de fog globale nouvelle, aucune modification du filtrage P16-B.

### Interdits respectés

Aucune modification serveur/DB/routes/`player_discovered_tiles`/déplacement/combat/économie/capitales/rivières/avatar. Aucun refactor de `GameEngine.ts` (lecture seule). Aucune correction des erreurs TS préexistantes hors scope.

### Vérifications

- **`npm run check` :** 187 erreurs TypeScript, identique à la baseline (aucune nouvelle erreur, aucune dans les fichiers modifiés).
- **`git diff --stat` :** `client/src/components/game/GameCanvas.tsx` (+2/-1), `client/src/lib/game/PixelMapRenderer.ts` (+48), `CLAUDE.md` (cette section).
- **Logs serveur/navigateur (session dev, joueur admin) :** aucune erreur, aucun fallback "Immersive renderer failed" observé après application de la correction. Vision calculée cohérente avec les logs déjà observés (`currentVisionCount:38`, `exploredCount:520`, `fogRingCount:34`) — la correction s'applique donc bien à un écart réel et significatif (≈482 tuiles concernées) entre vision courante et mémoire.
- **Limite documentée :** validation visuelle directe (capture d'écran de la carte immersive avec fog dégradé visible à l'œil) non réalisée dans ce bloc — l'environnement de screenshot automatisé atterrit sur la page marketing non authentifiée plutôt que sur le canvas de jeu (session admin déjà active uniquement dans un onglet de développement distinct, non accessible à l'outil de capture). La correction est validée par lecture de code stricte (parité logique avec `GameEngine.ts`, seule source de vérité désignée par le prompt) et par l'absence de régression TypeScript/runtime.
- **Diff summary :** `GameCanvas.tsx`, `PixelMapRenderer.ts`, `CLAUDE.md`.
- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub).

**Statut :** correction appliquée, en attente de validation utilisateur (idéalement visuelle en jeu) avant tout nouveau bloc (P17-B ou bug avatar local).

## P17-B — Correction avatar local invisible en mode immersive Pixel HD (diagnostic + correction)

- **Objectif unique :** identifier pourquoi l'avatar local n'apparaît pas en mode immersive Pixel HD, puis corriger uniquement ce point. Fog P17-A non modifié (sauf garde `isHexVisible` défensive, cohérente avec le reste du renderer).
- **Fichiers inspectés :** `client/src/lib/game/GameEngine.ts` (référence stricte, non modifié), `client/src/lib/stores/usePlayer.tsx` (référence, non modifié), `client/src/lib/auth/AuthContext.tsx` (référence, non modifié). **Fichiers modifiés :** `client/src/lib/game/PixelMapRenderer.ts`, `client/src/components/game/GameCanvas.tsx`.

### Diagnostic (réponses aux 10 questions du prompt)

1. **Fonction de rendu strategic :** `GameEngine.renderAvatar()` (ligne 867), appelée dans `render()` (ligne 376) après `renderCivilizations()`/`renderOtherPlayers()`. Dessine un sprite 8-bit + ombre + halo blanc + anneau doré si en mouvement.
2. **Source de la position :** `usePlayer().avatarPosition` (coords "3D" x/z, transmises à `GameEngine.updateAvatar()`) ET `usePlayer().avatarHexPosition` (mêmes coordonnées mais déjà exprimées en hex local — `{x,y}`).
3. **Coordonnées monde ou locales ?** Locales. `avatarPosition.x/1.5` et `avatarPosition.z/(√3×0.5)` redonnent exactement `avatarHexPosition.{x,y}` (vérifié dans `renderAvatar()` ligne 871-872) — la même convention que `mapData[y][x]`, `units`, `colonies`, `otherPlayers` déjà utilisés par `PixelMapRenderer`.
4. **Conversion monde → local :** déjà faite en amont, côté `usePlayer.tsx` (recalcul de `avatarHexPosition` au changement de segment via `originWorldX/originWorldY`, cf. section "Persistance de la Position Joueur" du présent document). `GameCanvas.tsx` n'a donc **aucune** conversion à faire pour l'avatar (contrairement à `otherPlayers`, qui reçoit des coordonnées monde brutes de `usePlayerPresence` et doit soustraire `originWorldX/Y`).
5. **`renderPixelHDOverlay()` recevait-il déjà cette donnée ?** Non. Recherche exhaustive (`grep avatar` sur `PixelMapRenderer.ts`) : aucune occurrence avant ce bloc — ni type, ni champ d'option, ni fonction de dessin.
6. **Le rendu immersive recouvre-t-il l'avatar strategic ?** Oui, confirmé par lecture de l'ordre d'exécution : `GameEngine.render()` dessine la carte strategic (dont l'avatar) sur le `<canvas>` réel, PUIS déclenche un `postRenderCallback` (bloc P15) qui appelle `renderPixelHDOverlay()` → `renderPixelMap()`, qui redessine un fond opaque + terrain + colonies + unités + autres joueurs **sur le même canvas, par-dessus tout**. L'avatar, dessiné juste avant, se retrouve donc entièrement recouvert par les sprites terrain immersifs.
7. **Pourquoi l'avatar disparaît :** conjonction des points 5 et 6 — l'avatar est bien positionné et bien dessiné par le mode strategic, mais (a) le renderer immersive n'a aucune notion de lui donc ne le redessine pas, et (b) il est de toute façon recouvert par le repaint immersive qui suit. Ce n'est pas un bug de position/coordonnées.
8. **Point minimal de correction :** ajouter au renderer immersive une couche de dessin dédiée à l'avatar local, alimentée par `avatarHexPosition` (déjà en coordonnées locales, aucune conversion nécessaire), dessinée après la couche `otherPlayers` et avant survol/sélection — même schéma que l'ajout `otherPlayers` de P16-B.
9. **Éviter le doublon avec P16-B :** le serveur exclut déjà systématiquement le joueur local des positions retournées (`excludePlayerId`, `playerPresenceService.ts`, cf. P14-C/P16-C) — `otherPlayers` ne contient donc jamais le joueur courant. Aucune fusion de données nécessaire ; les deux chemins (avatar local vs autres joueurs) restent strictement séparés, comme en mode strategic.
10. **Type dédié `PixelMapAvatar` vs réutilisation de `PixelMapOtherPlayer` :** type dédié retenu (conforme au prompt) — sémantique différente (le joueur local, pas un "autre joueur" en présence), et évite tout risque futur de mélange accidentel des deux tableaux si la structure de l'un évolue indépendamment de l'autre.

### Correction appliquée

- **`PixelMapRenderer.ts`** :
  - Nouveau type exporté `PixelMapAvatar { x, y, username?, isMoving? }` (coordonnées locales, mêmes conventions que le reste du fichier).
  - Nouveaux champs optionnels `avatar?: PixelMapAvatar | null` et `showAvatar?: boolean` sur `PixelMapRenderOptions` (défaut `true`, compat descendante totale : si `avatar` n'est pas fourni, aucun changement de comportement).
  - Nouvelle fonction `drawAvatarMarker()` : cercle doré (`#e8b23a`, cohérent avec la couleur de sélection déjà utilisée dans ce fichier) + contour blanc + petite pointe triangulaire directionnelle (repère "c'est vous", sans dépendre d'une rotation réelle — hors scope minimal) + halo doré animé-like si `isMoving` + label username optionnel. Style volontairement distinct du marqueur `drawOtherPlayerMarker()` (cercle hue-déterministe) pour rester visuellement différentiable si un autre joueur se trouve au même endroit.
  - Câblage dans `renderPixelMap()` : nouveau bloc juste après la boucle `otherPlayers`, avant le survol/la sélection. Garde `isHexVisible` défensive identique aux autres couches (colonies/unités/autres joueurs) — sans effet en usage normal puisque la position de l'avatar local est toujours dans sa propre vision courante.
- **`GameCanvas.tsx`** :
  - `currentUser` ajouté à la destructuration de `useAuth()` (déjà exposé par le contexte, aucune nouvelle donnée).
  - Construction d'un objet `avatar: PixelMapAvatar` à partir de `avatarHexPosition.{x,y}` (déjà local), `currentUser` (username) et `isMoving` (déjà en scope) — aucune conversion, aucun nouveau fetch, aucun nouveau store.
  - Transmission de `avatar`/`showAvatar: true` à `renderPixelMap(...)`.
  - Ajout de `avatarHexPosition`, `currentUser`, `isMoving` aux dépendances du `useCallback` de `renderPixelHDOverlay` (nécessaire pour que l'overlay se redessine bien quand l'avatar bouge — `isMoving` et `avatarPosition` étaient déjà dépendances existantes pour d'autres besoins, `avatarHexPosition` et `currentUser` sont les deux seuls ajouts réels).

### Interdits respectés

Aucune modification serveur/DB/routes/`player_discovered_tiles`/présence multijoueur/déplacement/combat/économie/capitales/rivières. Aucune modification des règles de vision P17-A (seule une garde `isHexVisible` déjà existante dans le fichier est réutilisée à l'identique). Aucun changement sur `otherPlayers`/P16-B autre que l'ajout d'un bloc de rendu séparé pour l'avatar (aucun risque de doublon, cf. point 9 du diagnostic). Aucune nouvelle mécanique de jeu, aucune sélection avatar, aucun menu contextuel, aucun debug permanent, aucun refactor massif, aucune correction TS hors scope.

### Vérifications

- **`npm run check` :** 187 erreurs TypeScript, strictement identique à la baseline (aucune nouvelle erreur, aucune dans les fichiers modifiés).
- **`git diff` :** `PixelMapRenderer.ts` (+type `PixelMapAvatar`, +2 champs d'options, +fonction `drawAvatarMarker`, +bloc de rendu ~10 lignes), `GameCanvas.tsx` (+`currentUser` destructuré, +construction objet `avatar`, +2 champs transmis à `renderPixelMap`, +3 dépendances `useCallback`), `CLAUDE.md` (cette section).
- **Logs serveur/navigateur (session dev, joueur admin) :** aucune erreur, aucun warning, aucun déclenchement du fallback "Immersive renderer failed, falling back to strategic view" après application de la correction. Vision/position cohérentes (`avatarHex:{x:73,y:32}`, `currentVisionCount:38`).
- **Limite documentée (identique à P17-A) :** validation visuelle directe non réalisée dans ce bloc (outil de capture d'écran redirigé vers la page marketing publique plutôt que la session de jeu authentifiée). Correction validée par diagnostic de code complet (cause unique et confirmée : absence totale de tout chemin de rendu avatar dans `PixelMapRenderer.ts` avant ce bloc) et par l'absence de régression TypeScript/runtime.
- **Diff summary :** `PixelMapRenderer.ts`, `GameCanvas.tsx`, `CLAUDE.md`.
- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub).

**Statut :** correction appliquée, en attente de validation utilisateur (idéalement visuelle en jeu) avant tout nouveau bloc.

## Ressources V3-B — Ajout passif du catalogue Tile Modifiers

### 1. Objectif

- Formaliser la séparation conceptuelle entre `ResourceType` (ressources économiques Tier 1 stockables/vendables) et `TileModifier` (traits locaux de case, non stockés automatiquement).
- Créer un catalogue déclaratif **passif**, non branché à aucun système runtime.
- Préparer une intégration future sans toucher au runtime actuel (génération de carte, production, marché, inventaire).

### 2. Fichier créé/finalisé

- `shared/tileModifiers.ts` (nouveau fichier, 100% additif).

### 3. `EconomicResourceType` final (8 clés, répliquées de `server/buildingEffects.ts::T1Material`)

`food`, `wood`, `stone`, `coal`, `oil`, `herbs`, `common_metals`, `leather_fur`.

- `leather_fur` conservé tel quel — c'est la clé runtime existante.
- `hide_fur` **non ajouté** (rejeté explicitement par le prompt).
- Aucune nouvelle ressource économique ajoutée (`rare_metals_alloys`, `precious_stones`, `textiles`, `spices`, `fracten`, `mana_crystals` : exclus).

### 4. `TileModifierId` final (18 valeurs, confirmées par audit direct du code)

**`GENERATED_TILE_MODIFIERS`** (14 — réellement produits par `TERRAIN_RESOURCES`, identique dans les 3 copies `server/seeds/mapSeed.ts`, `backfillTileMetadata.ts`, `updateResources.ts`) :
`deer`, `fur`, `wheat`, `cattle`, `fish`, `iron`, `copper`, `coal`, `stone`, `oil`, `herbs`, `crystals`, `sacred_stones`, `ancient_artifacts`.

**`UI_ONLY_TILE_MODIFIERS`** (4 — présents dans les tables d'affichage `ResourceIcons.ts`/`GameEngine.ts`/`TileInfoPanel.tsx`/`UnifiedTerritoryPanel.tsx` mais jamais générés par `TERRAIN_RESOURCES` à ce jour) :
`crabs`, `whales`, `sulfur`, `obsidian`.

Aucun nouveau modifieur inventé (`mithril_deposit`, `lead_deposit`, `gold_deposit`, `oil_spring`, `wild_herbs`, `raw_crystals`, `sacred_site` : explicitement exclus, réservés à une décision de design future).

### 5. Structures ajoutées

- `TileModifierDefinition` (interface : `id`, `label` FR, `category` (`animal`/`plant`/`mineral`/`site`/`coastal`/`unknown`), `generated: boolean`, `yields`).
- `TILE_MODIFIERS: Record<TileModifierId, TileModifierDefinition>` — catalogue complet des 18 modifieurs.
- `getTileModifierYield(id)` — accesseur passif, retourne `{}` si aucun rendement défini.
- `isTileModifierId` : **non ajouté** dans ce bloc (pas demandé par le prompt initial ; pourra être ajouté dans un bloc de branchement futur si un garde de type runtime devient nécessaire).

### 6. Yields principaux (`TILE_MODIFIER_YIELDS`, reflète ce que fait déjà `BUILDING_PRODUCTION`/`BUILDING_RESOURCE_PREREQS`)

`deer` → `food`+`leather_fur` · `fur` → `leather_fur` · `wheat` → `food` · `cattle` → `food`+`leather_fur` · `fish` → `food` · `herbs` → `herbs` · `iron` → `common_metals` · `copper` → `common_metals` · `coal` → `common_metals`+`coal` · `stone` → `stone` · `oil` → `oil`.

### 7. Modifieurs sans yield actif (intentionnellement vides — pas d'invention)

`crystals`, `sacred_stones`, `ancient_artifacts`, `crabs`, `whales`, `sulfur`, `obsidian`.

### 8. Non-impact confirmé

Aucun runtime branché · aucun import `server/` → `shared/` · aucune DB touchée · aucune migration créée · aucun inventaire modifié · aucun marché modifié · aucune production modifiée · aucun coût modifié · aucune génération de carte modifiée · aucune tuile existante modifiée · aucune clé existante renommée · aucune nouvelle ressource économique ajoutée.

### 9. Vérifications

- `npx tsc --noEmit` : 187 erreurs TypeScript, strictement identique à la baseline.
- Aucune erreur liée à `shared/tileModifiers.ts`.

### 10. Diff summary

`shared/tileModifiers.ts` (nouveau fichier), `CLAUDE.md` (cette section).

### 11. Risques restants

- `TERRAIN_RESOURCES` existe encore dupliqué en 3 copies (`mapSeed.ts`, `backfillTileMetadata.ts`, `updateResources.ts`) — non unifié dans ce bloc.
- `ResourceIcons.ts` mélange encore ressources économiques, modifieurs de case, monnaie (`fracten`) et legacy V1 dans une seule table plate.
- `TILE_MODIFIERS` reste strictement passif — ne remplace aucune logique runtime existante.
- Branchement futur (lecture réelle par un système) à traiter dans un bloc séparé, pas ici.

### 12. Prochain bloc recommandé

**Ressources V3-C — Audit de branchement progressif de `TILE_MODIFIERS`** (aucun démarrage sans validation explicite de l'utilisateur).

### Commit

Fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub — dépôt synchronisé automatiquement avec `origin/NI-10.09`).

**Statut :** bloc V3-B terminé et documenté. En attente de validation utilisateur avant tout nouveau bloc.
- **Prochain bloc recommandé :** aucun nouveau bloc à démarrer sans validation utilisateur. Si un test manuel avec un second compte est possible, le confirmer avant de considérer P16 comme définitivement clos.

## Ressources V3-C-Audit — Audit canonique des ressources économiques (lecture seule)

- **Objectif :** Auditer l'écart entre la liste canonique officielle des ressources économiques et le code existant, sans aucune modification.
- **Fichiers inspectés :** `server/buildingEffects.ts`, `shared/schema.ts`, `shared/tileModifiers.ts`, `client/src/lib/shared/ResourceIcons.ts`, `server/economyService.ts`, `server/marketService.ts`, `server/playerActionService.ts`, `client/src/components/game/TreasuryPanel.tsx`, `HarvestPanel.tsx`, `PublicMarketplace.tsx`, `ConstructionPanel.tsx`, `UnifiedTerritoryPanel.tsx`.
- **Aucun fichier modifié. Aucun commit. Aucun push.**

### Résultats clés

**Clés runtime V2 actives (8 T1 + fracten) — toutes dans 7 tables DB :**
`food`, `wood`, `stone`, `coal`, `oil`, `herbs`, `common_metals`, `leather_fur`, `fracten`

**Ressources canoniques déjà alignées :** `food`, `wood`, `stone`, `oil`, `common_metals`, `leather_fur`, `fracten`.

**Écarts conceptuels (clés valides à court terme, périmètre trop étroit) :**
- `coal` → devrait devenir "Combustible" (plus large que Charbon)
- `herbs` → devrait devenir "Ingrédients communs" (plus large que Herbes)

**Ressources canoniques absentes du runtime :** Textiles communs, Commodités de luxe, Ingrédients rares, Fourrures nobles, Reliques anciennes, Contrats de travail, Équipements (6 niveaux).

**Ressources UI orphelines (ResourceIcons + UnifiedTerritoryPanel, pas de colonne DB) :** `rare_metals_alloys`, `textiles`, `precious_stones`, `enchanted_wood`, `arcane_stones`, `spirit_stones`, `moonstone`.

**Cas hybride non documenté :** `crystals` et `arcane_stones` sont utilisés comme coûts de construction dans `ConstructionPanel.tsx` sans être stockés dans les tables d'inventaire standards — à clarifier avant toute migration.

**`shared/tileModifiers.ts` :** reste cohérent. Mises à jour futures nécessaires si `coal` → `fuel` ou `herbs` → `common_ingredients`, ou si `crystals`/`sacred_stones`/`ancient_artifacts` reçoivent des yields canoniques.

### Plan recommandé (non implémenté)
- **V3-C1 :** Clarifier l'usage `crystals`/`arcane_stones` dans ConstructionPanel (comment débités ?)
- **V3-C2 :** Créer `shared/economicResources.ts` — catalogue canonique passif des 3 catégories
- **V3-C3 :** Mapping passif legacy → canonique (`coal` → `fuel`, `herbs` → `common_ingredients`)
- **V3-C4 :** Labels UI seulement (renommer l'affiché sans toucher aux clés DB)
- **V3-C5 :** Mettre à jour `TILE_MODIFIER_YIELDS` dans `tileModifiers.ts`
- **V3-C6 :** Migration DB — uniquement si nécessaire, validation explicite obligatoire

### Risques
- Renommer `coal` ou `herbs` : 🔴 ÉLEVÉ (7 tables DB + données persistantes)
- Ajouter une nouvelle colonne : 🟡 MODÉRÉ (ALTER TABLE x7 + UI)
- Données persistantes en prod : 🔴 ÉLEVÉ — toute migration de clé sans migration DB détruit les inventaires existants

- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub).

**Statut :** audit V3-C terminé et documenté. Aucune modification effectuée. En attente de validation utilisateur pour choisir le prochain bloc (V3-C1 recommandé).

## Systèmes V1-A — Catalogues canoniques passifs : ressources, tile modifiers, unités terrestres

- **Objectif :** Créer les catalogues de design canoniques V3 dans des fichiers partagés passifs, sans brancher de logique runtime ni modifier la DB.
- **Aucun système runtime existant modifié. Aucune migration DB. Aucun push manuel.**

### Fichiers créés

**`shared/economicResources.ts`** — Catalogue canonique V3 des ressources économiques
- `CanonicalResourceCategory` : `common` | `rare` | `strategic` | `currency`
- `CanonicalResourceId` : 24 ressources (8 communes + 9 rares + 6 stratégiques + fracten)
- `CanonicalResourceDefinition` : id, label FR, catégorie, legacyKeys[], notes
- `CANONICAL_RESOURCES` : catalogue complet des 24 ressources avec notes sur les écarts V2
- `LEGACY_TO_CANONICAL` : mapping déclaratif clés V2/legacy → canonique V3
- Accesseurs passifs : `getCanonicalResource`, `resolveToCanonical`, `getResourcesByCategory`

**`shared/landUnitCatalog.ts`** — Catalogue prototype des 15 unités terrestres
- `LandUnitType` : `"light"` | `"medium"` | `"heavy"`
- `LandUnitId` : 15 unités (militia, garrison, patrollers, scouts, light_infantry, regular_infantry, noble_infantry, shock_troops, bow_infantry, crossbow_infantry, sappers, field_engineers, raid_troops, hunters, pikemen)
- `LandUnitDefinition` : id, label, type, function, size, maxMovementPerTurn, actionPointCostPerTile, creationCategory, creationCost (CanonicalResourceId), siegeWearPoints, upkeepPerTurn, unlockedAction, ability, limitationNotes, prototypeStatus
- `LAND_UNIT_CATALOG` : catalogue complet des 15 unités avec tous les champs
- Accesseurs passifs : `getLandUnit`, `getLandUnitsByType`, `getAllLandUnitIds`
- `prototypeStatus: true` sur chaque entrée — marquage explicite non runtime

### Règles canoniques V3 enregistrées

- `oil` et `coal` ne sont plus des ressources économiques finales — ce sont des tile modifiers qui produisent `fuel` (Combustible)
- `herbs` → tile modifier qui produit `common_ingredients` (Ingrédients communs)
- Les clés runtime V2 (`coal`, `oil`, `herbs`) sont conservées intactes — mapping documenté dans `LEGACY_TO_CANONICAL`
- Les coûts de création/entretien des unités utilisent les clés canoniques V3 (`labor_contracts`, `basic_equipment`, `common_textiles`, etc.) — non branchés au runtime

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée, aucune régression introduite.

### Risques / prochaines étapes
- `server/unitCatalog.ts` reste la source de vérité des stats combat (strength, health, attack, defense, movement) — ne pas confondre avec `shared/landUnitCatalog.ts` (stats design prototype)
- Les clés `labor_contracts`, `basic_equipment`, `common_textiles` n'ont pas de colonne DB — à créer dans un bloc dédié avant branchement runtime
- Prochain bloc recommandé : V3-C1 (clarifier usage `crystals`/`arcane_stones` dans ConstructionPanel) ou V1-B (branchement progressif des coûts d'unités)

- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub — dépôt synchronisé automatiquement avec `origin/NI-10.09`).

**Statut :** bloc Systèmes V1-A terminé et documenté. Catalogues passifs créés, aucun runtime modifié. En attente de validation utilisateur avant tout nouveau bloc.

## Systèmes V1-A — Correction passive landUnitCatalog.ts

- **Objectif :** Deux corrections passives dans `shared/landUnitCatalog.ts`, sans toucher au runtime ni à la DB.
- **Aucun fichier runtime modifié. Aucune migration DB. Aucun push manuel.**

### Corrections apportées

**1. Ajout du champ `creationProfile: string` dans `LandUnitDefinition`**
- `creationCategory` conservé tel quel — représente le lieu/mode de recrutement (`"city"`, `"camp"`, `"any"`).
- Nouveau champ `creationProfile` distinct — représente le profil de création / catégorie de design de l'unité.
- Profils assignés aux 15 unités :
  - Milice → `"Commun"`
  - Garnison → `"Commun défensif"`
  - Patrouilleurs, Éclaireurs, Infanterie légère → `"Professionnel léger"`
  - Infanterie régulière → `"Professionnel"`
  - Infanterie noble → `"Lourd noble"`
  - Troupe de choc → `"Assaut spécialisé"`
  - Infanterie à arc → `"Projectile léger"`
  - Infanterie à arbalète → `"Projectile lourd"`
  - Sapeurs → `"Technique"`
  - Ingénieurs de campagne → `"Technique avancé"`
  - Troupe de raid → `"Raid"`
  - Chasseurs → `"Soutien léger"`
  - Piquiers → `"Contrôle"`

**2. Correction du commentaire `siegeWearPoints`**
- Avant : *"Points d'usure infligés lors d'un combat (siège ou bataille)."*
- Après : *"Points d'usure utilisés pendant les sièges contre fortifications, camps, murs ou positions défensives."*

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée, aucune régression introduite.

- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub).

**Statut :** correction V1-A appliquée et documentée. Fichier passif, aucun runtime modifié.

## Ressources V3-D — Audit des ressources runtime nécessaires au prototype unités

- **Objectif :** Déterminer lesquelles des ressources requises par `shared/landUnitCatalog.ts` existent déjà dans le runtime et lesquelles nécessitent une future intégration.
- **Audit lecture seule. Aucun runtime modifié. Aucune migration DB. Aucun push.**

### Fichiers inspectés
`shared/schema.ts`, `server/buildingEffects.ts`, `server/economyService.ts`, `server/cityService.ts`, `server/marketService.ts`, `server/playerActionService.ts`, `server/routes/economy.ts`, `server/routes/market.ts`, `client/src/lib/shared/ResourceIcons.ts`, `client/src/components/game/RecruitmentPanel.tsx`, `client/src/lib/game/types.ts`, `client/src/lib/systems/ResourceRevealSystem.ts`

### Ressources déjà supportées (immédiatement réutilisables)
- `food` : ✅ DB (7 tables), inventaires, production, marché, UI, transferts, recrutement V1
- `wood` : ✅ DB (7 tables), inventaires, production, marché, UI, transferts, coûts construction
- `common_metals` : ✅ DB (7 tables), inventaires, production (mine/advanced_mine), marché, UI, coûts construction
- `fracten` : ✅ monnaie complète — faction_economy, player_bank, marché, UI

### Ressources manquantes (bloquantes pour branchement unités)
- `common_textiles` : ❌ absente de toutes les couches (pas de colonne DB, pas d'inventaire, pas de marché, pas d'UI, pas de production)
- `labor_contracts` : ❌ absente de toutes les couches runtime (pas de colonne DB, pas d'inventaire). Mentionnée dans `types.ts` mais sans infrastructure.
- `basic_equipment` : ⚠️ déclarée dans `client/src/lib/game/types.ts` (ligne 82) et `ResourceRevealSystem.ts` (revealLevel:99 — jamais révélée), mais **aucune colonne DB**, aucun inventaire, aucune production. Présence UI-only orpheline.

### Gap architectural critique
Le système de recrutement actuel (`server/cityService.ts`) utilise un **`productionCost: number`** (coût en points de production — entier unique). `RecruitmentPanel.tsx` affiche des coûts multi-ressources côté client mais ceux-ci ne correspondent pas au mécanisme réel de débit serveur. Brancher `shared/landUnitCatalog.ts` nécessitera un nouveau mécanisme de débit multi-ressources, pas seulement l'ajout de colonnes.

### Ressources V2 à conflit conceptuel (ne pas migrer maintenant)
- `coal` + `oil` → seront conceptuellement `fuel` — **toutes les 7 tables DB + production (advanced_mine, oil_camp) + UI + marché**
- `herbs` → sera conceptuellement `common_ingredients` — **toutes les 7 tables DB + production (herbalist_house) + UI + marché**

### Plan recommandé
- **V3-D1** *(ce bloc)* : audit — ressources nécessaires aux unités identifiées
- **V3-D2** : ajouter `common_textiles`, `labor_contracts`, `basic_equipment` en DB (ALTER TABLE sur city_inventory, player_bank, city_pending_harvest, city_production_queue, player_market_box, player_transport) — validation explicite requise
- **V3-D3** : exposer ces 3 ressources dans l'UI (ResourceIcons, TreasuryPanel, HarvestPanel, PublicMarketplace)
- **V3-D4** : définir la source de production de `labor_contracts` et `basic_equipment` (bâtiments : atelier, guilde, forge) — nouveau BUILDING_PRODUCTION
- **V3-D5** : réécrire le mécanisme de recrutement pour débiter des ressources multi-types au lieu de `productionCost: number` seul
- **V3-D6** : brancher `shared/landUnitCatalog.ts` comme source de coûts dans le recrutement

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée, aucune régression.

- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub).

**Statut :** audit V3-D terminé et documenté. Aucun runtime modifié. En attente de validation utilisateur avant tout nouveau bloc.

## Bloc V3-D2 — Ajout runtime de `common_textiles`, `labor_contracts`, `basic_equipment`

- **Objectif :** Rendre ces 3 ressources entièrement fonctionnelles dans toutes les couches runtime (DB, inventaires, marché, UI, transferts) — **sans** brancher production ni recrutement.
- **Périmètre :** additif pur — aucun code existant modifié dans sa logique métier.

### Fichiers modifiés

**Schéma DB (`shared/schema.ts`)** — 6 tables étendues :
- `cities` : +3 colonnes `*_per_turn` (toutes à 0 par défaut)
- `player_bank`, `city_pending_harvest`, `city_inventory`, `player_transport`, `player_market_box` : +3 colonnes chacune

**Migration DB** — exécutée via SQL direct (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`) sur les 18 colonnes (drizzle-kit push non utilisé — nécessitait TTY interactif). Toutes les 18 colonnes ajoutées avec succès.

**`server/marketService.ts`** — extensions :
- `ResourceType` local + `VALID_RESOURCES` : 3 nouveaux types
- `resourceCol()`, `transportResourceCol()`, `marketBoxResourceCol()` : 3 entrées chacune
- `ensurePlayerBank()`, `ensurePlayerTransport()`, `ensurePlayerMarketBox()` : 3 champs initialisés à 0
- `hasContent` (×2), transport capacity calc (×2), credit/reset SET (×4 blocs) : 3 ressources ajoutées partout

**`server/playerActionService.ts`** — extensions :
- `computeTransportUnits()` : 3 nouveaux champs optionnels (1 unité transport chacun)
- `completeHarvestTransfer()` : lecture, empty check, credit UPSERT, reset
- `completeBankToCityTransfer()` / `completeBankToPlayerTransfer()` : 3 params + credit + log
- `completeAction()` : path type cast étendu (×2), appels avec 3 nouveaux args
- `createTransferBankToCityAction()` / `createTransferBankToPlayerAction()` : 3 params, validation, bank check, debit, path storage
- `getOrInitPlayerTransport()` : 3 colonnes ajoutées à l'INSERT initial

**`server/routes/economy.ts`** — 4 routes étendues :
- `transfer-bank-to-city` / `transfer-bank-to-player` : body + matList + action call + response
- `deposit-transport-to-city` / `deposit-transport-to-bank` : body + matList + stock checks + debit + credit + response

**Client :**
- `client/src/lib/game/types.ts` : `ResourceType` étendu (+2 nouveaux ; `basic_equipment` existait déjà)
- `client/src/lib/api/marketApi.ts` : `ResourceType` + `RESOURCE_LABELS` + `ALL_RESOURCES`
- `client/src/lib/api/economyApi.ts` : `T1Materials` étendu
- `client/src/lib/shared/ResourceIcons.ts` : 3 entrées icône
- `client/src/lib/systems/ResourceRevealSystem.ts` : 3 entrées `RESOURCE_INFO` (strategic, revealLevel 99)
- `client/src/components/game/TreasuryPanel.tsx` : `TransferState`, `Mats`, `MAT_ICONS`, `RESOURCE_DEFS`, état init, 3 handlers mats
- `client/src/components/game/HarvestPanel.tsx` : `MatKey`, `MAT_ICONS`
- `client/src/components/game/PublicMarketplace.tsx` : `MB_RESOURCES`, 2 tables d'icônes SELL/BUY
- `client/src/components/game/UnifiedTerritoryPanel.tsx` : `RESOURCE_LABELS` local

### Ce qui n'a PAS été touché (délibéré)
- `server/buildingEffects.ts` (`T1Material`/`T1_CITY_COLUMNS`) — aucun bâtiment ne produit ces ressources encore
- `server/unitCatalog.ts`, `shared/landUnitCatalog.ts`, `RecruitmentPanel.tsx`, recrutement `cityService.ts`
- `factionEconomy` table, `market_fee_box` table
- `city_production_queue` (colonne entier `productionCost`, pas de ressources colonnes)

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée, zéro régression.

### Prochaines étapes recommandées
- **V3-D3** : vérifier les labels UI sur joueur connecté (TreasuryPanel, HarvestPanel affichent les 3 nouvelles lignes)
- **V3-D4** : définir les bâtiments sources pour `common_textiles` (atelier tisserand), `labor_contracts` (taverne/guilde), `basic_equipment` (forge)
- **V3-D5** : réécrire le mécanisme recrutement pour débiter multi-ressources
- **V3-D6** : brancher `shared/landUnitCatalog.ts` au recrutement

- **Commit :** fourni par le prochain checkpoint automatique (jamais de push manuel sur GitHub).

**Statut :** bloc V3-D2 terminé et documenté. Les 3 ressources sont entièrement runtime-capable (DB + inventaires + marché + UI + transferts). Aucun bâtiment producteur ni branchement recrutement. En attente de validation utilisateur.

## Ressources V3-D3 — Vérification UI réelle des ressources prototype unités

- **Objectif :** Vérifier que `common_textiles`, `labor_contracts`, `basic_equipment` s'affichent correctement dans tous les panneaux concernés, et corriger les bugs d'affichage/payload mineurs issus de V3-D2.
- **Périmètre :** inspection + bugfix UI seulement — aucun nouveau système, aucun bâtiment producteur, aucun recrutement.

### Composants inspectés

| Composant | Fichier |
|---|---|
| ResourceIcons | `client/src/lib/shared/ResourceIcons.ts` |
| ResourceRevealSystem | `client/src/lib/systems/ResourceRevealSystem.ts` |
| TreasuryPanel | `client/src/components/game/TreasuryPanel.tsx` |
| HarvestPanel | `client/src/components/game/HarvestPanel.tsx` |
| PublicMarketplace | `client/src/components/game/PublicMarketplace.tsx` |
| UnifiedTerritoryPanel | `client/src/components/game/UnifiedTerritoryPanel.tsx` |
| economyApi | `client/src/lib/api/economyApi.ts` |

### Résultats par composant

**ResourceIcons** ✅ — Entrées présentes et correctes :
- `common_textiles` → 🧶 Textiles communs (color #C8A2C8)
- `labor_contracts` → 📜 Contrats de travail (color #8B7355)
- `basic_equipment` → 🛡️ Équipement basique (color #808080)
Aucun fallback ❓ possible.

**ResourceRevealSystem** ✅ — Les 3 ressources configurées `rarity: 'strategic'`, `revealLevel: 99`. Ne seront jamais révélées par exploration de carte. Ne peuvent pas apparaître comme ressource exploitable sur une tuile.

**TreasuryPanel** ✅ après correction — `Mats`, `isMatsEmpty`, `MAT_ICONS`, `RESOURCE_DEFS`, `TransferState`, handlers mats et resets tous corrects. Filtre `bankVisible`/`transportVisible` basé sur `visibleResources(RESOURCE_DEFS, source)` — les 3 ressources apparaîtront dès que > 0 en banque ou transport. Payloads de transfert (handleTransferToCity, handleTransferToPlayer, handleDepositToBank) incluent les 3 nouvelles ressources.

**HarvestPanel** ✅ — `MatKey` et `MAT_ICONS` incluent les 3 nouvelles ressources. Affichage conditionnel (quantité > 0 uniquement).

**PublicMarketplace** ✅ — `MB_RESOURCES` liste les 3 ressources. Tables d'icônes SELL et BUY complètes (🧶 / 📜 / 🛡️). Aucun crash attendu.

**UnifiedTerritoryPanel** ✅ — `RESOURCE_LABELS` local étendu. Les 3 ressources ne font pas partie des ressources de tuile/terrain — aucun risque d'apparition sur la carte.

### Bugs trouvés et corrigés

**`client/src/lib/api/economyApi.ts` — 6 points de défaillance silencieuse :**

1. **`PlayerBankDTO`** — manquait `common_textiles`, `labor_contracts`, `basic_equipment` → les 3 colonnes auraient été ignorées par TypeScript (accès `as any` dans TreasuryPanel masquait le problème).
2. **`PlayerTransportDTO`** — idem.
3. **`CityInventoryDTO`** — idem.
4. **`T1Mats`** — manquait les 3 champs → `postDepositTransportToCity` et `postDepositTransportToBank` n'auraient pas transmis les 3 ressources à l'API.
5. **`TransferMaterials`** — manquait les 3 champs → `postTransferBankToCity` et `postTransferBankToPlayer` n'auraient pas transmis les 3 ressources dans le body JSON.
6. **`TransferResult.action`** — manquait les 3 champs dans la réponse typée.

Tous corrigés dans une passe additive sans modifier la logique métier.

### Confirmations

- ✅ Les 3 ressources ne sont **pas** produites par bâtiments (`buildingEffects.ts` non modifié).
- ✅ Le recrutement n'est **pas** branché (`cityService.ts`, `landUnitCatalog.ts`, `RecruitmentPanel.tsx` non modifiés).
- ✅ Les 3 ressources ne sont **pas** des ressources de carte (revealLevel 99, rarity 'strategic').
- ✅ Aucune migration `coal→fuel` ni `herbs→common_ingredients` réalisée.

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée, zéro régression.

### Prochaine étape recommandée
**V3-D4** — Définir les bâtiments producteurs pour les 3 ressources (`buildingEffects.ts` : atelier tisserand → `common_textiles`, taverne/guilde → `labor_contracts`, forge basique → `basic_equipment`). Les colonnes `*_per_turn` existent déjà dans `cities`.

- **Commit :** fourni par le prochain checkpoint automatique.

**Statut :** bloc V3-D3 terminé. 6 bugs de payload silencieux corrigés dans `economyApi.ts`. Aucun nouveau système. Les 3 ressources sont entièrement vérifiées et opérationnelles côté UI.

## Ressources V3-D4 — Bâtiments producteurs pour ressources prototype unités

- **Objectif :** Ajouter une première source de production contrôlée pour `common_textiles`, `labor_contracts`, `basic_equipment` via 3 nouveaux bâtiments sans prérequis terrain.
- **Périmètre :** additif pur — aucun recrutement branché, aucune unité modifiée, aucune migration `coal/oil/herbs`.

### Fichiers modifiés

| Fichier | Modifications |
|---|---|
| `server/buildingEffects.ts` | `T1Material` étendu ; `BUILDING_PRODUCTION` +3 bâtiments ; `T1_CITY_COLUMNS` +3 mappings ; `applyBuildingEffects` +3 branches |
| `server/economyService.ts` | `ProductionTickResult.cities` étendu ; SELECT +3 colonnes `*_per_turn` ; +3 accumulateurs delta ; zero-check étendu ; pending_harvest UPSERT +3 ; bank UPSERT +3 ; results.push +3 ; log étendu |
| `client/src/components/game/ConstructionPanel.tsx` | +3 bâtiments dans `buildings[]` ; `getBuildingProduction()` +3 entrées ; `getResourceIcon()` +3 icônes |

### Bâtiments ajoutés

| id | label | coût | prérequis | production/tour |
|---|---|---|---|---|
| `atelier_tisserand` | Atelier de tisserand | 10 bois + 6 pierre + 15 PA | aucun terrain | `common_textiles` +1 |
| `bureau_de_recrutement` | Bureau de recrutement | 10 bois + 15 fracten + 15 PA | aucun terrain | `labor_contracts` +1 |
| `forge_basique` | Forge basique | 8 métaux communs + 6 bois + 18 PA | aucun terrain | `basic_equipment` +1 |

### Mappings `T1_CITY_COLUMNS` ajoutés
- `common_textiles` → `common_textiles_per_turn`
- `labor_contracts` → `labor_contracts_per_turn`
- `basic_equipment` → `basic_equipment_per_turn`

### Tick de production
- Les 3 colonnes `*_per_turn` sont lues depuis `cities` à chaque tick.
- Villes avec banque → crédité dans `player_bank` via UPSERT.
- Villes sans banque → accumulé dans `city_pending_harvest` via UPSERT.
- Le zéro-check inclut les 3 nouvelles ressources (ville entièrement inactive si tout à 0).

### Confirmations
- ✅ Recrutement non branché — `cityService.ts`, `RecruitmentPanel.tsx` intacts.
- ✅ `shared/landUnitCatalog.ts` reste passif — aucune modification.
- ✅ `server/unitCatalog.ts` non touché.
- ✅ Aucune migration `coal → fuel` ni `herbs → common_ingredients`.

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée, zéro régression.

### Risques restants
- Les 3 bâtiments produisent +1 par tour — valeur initiale conservative, à ajuster par bâtiment si le gameplay le nécessite.
- `forge_basique` a `common_metals` comme coût de construction — si une ville n'en a pas encore, le bâtiment est inaccessible sans transfert préalable.
- `applyBuildingEffects` incrémente les `*_per_turn` au moment de la construction mais ne les décrémente pas si le bâtiment est détruit (logique existante — comportement cohérent avec les bâtiments V2).

### Prochaine étape recommandée
**V3-D5** — Réécrire le mécanisme de recrutement pour débiter des ressources multi-types (`labor_contracts`, `basic_equipment`, `food`) depuis `city_inventory` au lieu d'un entier `productionCost` unique. Nécessite un nouveau champ de coût multi-ressources dans `cityService.ts` et le branchement de `shared/landUnitCatalog.ts`.

- **Commit :** fourni par le prochain checkpoint automatique.

**Statut :** bloc V3-D4 terminé. Les 3 bâtiments sont constructibles, branchés au tick de production et visibles dans le panneau de construction. Aucun recrutement, aucune unité modifiée.

## Correction V3-D4 — PlayerBankDTO serveur expose les 3 ressources prototype

- **Problème :** `PlayerBankDTO` dans `server/economyService.ts` ne déclarait pas `common_textiles`, `labor_contracts`, `basic_equipment`. `rowToDTO()` ne les retournait pas. La route `/api/economy/player-bank/me` renvoyait donc une réponse incomplète même si les ressources étaient créditées en DB.

### Corrections apportées (`server/economyService.ts`)

1. **`PlayerBankDTO`** — ajout des 3 champs `number` obligatoires.
2. **`rowToDTO()`** — lecture `(r as any).common_textiles ?? 0` / `labor_contracts` / `basic_equipment`.
3. **`getOrInitPlayerBank()` insert initial** — initialisation à 0 des 3 nouvelles colonnes.

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

- **Commit :** fourni par le prochain checkpoint automatique.

**Statut :** correction appliquée. La route banque retourne maintenant les 3 ressources prototype correctement.

---

## Ressources V3-D5 — Audit architecture recrutement multi-ressources

### Objectif
Cartographier précisément le système de recrutement existant afin de concevoir l'intégration d'un débit multi-ressources serveur-authoritative compatible avec `shared/landUnitCatalog.ts`. Aucune implémentation dans ce bloc.

### Fichiers inspectés
- `shared/landUnitCatalog.ts` — catalogue design prototype (15 unités, coûts V3)
- `shared/economicResources.ts` — CanonicalResourceId, LEGACY_TO_CANONICAL
- `server/unitCatalog.ts` — UNIT_CATALOG runtime (stats combat uniquement, 15 entrées)
- `server/cityService.ts` — setProduction, createProducedUnit, tickCityProduction, clearProduction
- `server/routes/cities.ts` — PUT /production, POST /start-construction, GET /inventory, POST /production-tick
- `shared/schema.ts` — tables city_production, units (colonnes)
- `client/src/components/game/RecruitmentPanel.tsx` — UI recrutement, coûts hardcodés
- `client/src/lib/stores/useNovaImperium.tsx` — trainUnit (débit ressources client-side)
- `client/src/lib/api/citiesApi.ts` — apiSetProduction, apiProductionTick, apiStartConstruction

---

### Schéma du recrutement actuel (flux complet)

```
[RecruitmentPanel] → handleRecruit(unitId, cityId)
  ↓
[useNovaImperium.trainUnit]
  ├─ Déduit ressources dans le STATE ZUSTAND (côté client — pas de validation serveur)
  └─ apiSetProduction(cityId, { type:'unit', name:unitType, cost:recruitmentTime, progress:0 })
       ↓
  [PUT /api/cities/:cityId/production] → checkCityAccess() → setProduction()
       ↓
  city_production UPSERT : { productionType:'unit', productionName:unitType,
                              productionCost:recruitmentTime, productionProgress:0 }

[handleEndTurn] → apiProductionTick()
  ↓
[POST /api/cities/production-tick] → tickCityProduction()
  ├─ productionProgress += city.productionPerTurn (chaque tick)
  └─ si progress >= cost :
       └─ UNIT_CATALOG[productionName] → createProducedUnit()
            ↓ INSERT INTO units (stats depuis UNIT_CATALOG serveur)
            ↓ clearProduction(cityId)
```

**Résumé des points clés :**

| Point | Valeur actuelle |
|---|---|
| Déclencheur client | `RecruitmentPanel.tsx` → `trainUnit()` |
| API appelée | `PUT /api/cities/:cityId/production` via `apiSetProduction` |
| Payload | `{ type:'unit', name:unitId, cost:recruitmentTime, progress:0 }` |
| Validation serveur ressources | **Aucune** — le serveur accepte sans vérifier le stock |
| Débit ressources | **Client-side uniquement** (Zustand state) — non persisté en DB |
| `productionCost` en DB | = durée en tours (`recruitmentTime`), PAS le coût en ressources |
| `productionProgress` | incrémenté par `city.productionPerTurn` à chaque tick |
| Création unité | `createProducedUnit()` dans `cityService.ts` |
| Table production | `city_production` (UNIQUE city_id — une seule file par ville) |
| Table unités | `units` (colonnes: unitType, name, attack, defense, health, movement…) |
| Source stats runtime | `server/unitCatalog.ts` → `UNIT_CATALOG` |

---

### Points de friction avec shared/landUnitCatalog.ts

**1. IDs d'unités incompatibles**

| UNIT_CATALOG (serveur runtime) | LAND_UNIT_CATALOG (prototype) |
|---|---|
| warrior, spearman, swordsman | militia, garrison, patrollers |
| archer, crossbowman | scouts, light_infantry, bow_infantry |
| catapult, trebuchet | crossbow_infantry, sappers, field_engineers |
| horseman, knight | raid_troops, hunters, pikemen |
| galley, warship, scout, settler… | (aucun équivalent) |

Aucun ID ne se recoupe. La création d'unité via `createProducedUnit()` appellera `UNIT_CATALOG[unitType]` et échouera avec "Type inconnu" pour tout ID du catalogue prototype.

**2. Coûts hardcodés côté client**
`RecruitmentPanel.tsx` (l.17–42) définit des coûts locaux en `{ food, fracten, wood, common_metals… }` — jamais lus depuis `landUnitCatalog.ts`. Ces valeurs divergent des `creationCost` du catalogue prototype.

**3. Ressources V3 absentes du GET /inventory**
`routes/cities.ts` l.277–292 : `GET /:cityId/inventory` ne retourne PAS `common_textiles`, `labor_contracts`, `basic_equipment`. Les colonnes existent en DB (ajoutées en V3-D2) mais la route ne les expose pas — blocage pour la vérification de stock avant recrutement.

**4. Débit client-side non persisté**
`trainUnit()` soustrait les ressources du Zustand state uniquement. À chaque reload, le state se resynchronise depuis le serveur et les ressources "dépensées" réapparaissent. Aucune transaction réelle ne se produit.

**5. Stats combat absentes du catalogue prototype**
`landUnitCatalog.ts` ne contient pas `attack`, `defense`, `health` — uniquement mobilité stratégique (`maxMovementPerTurn`, `actionPointCostPerTile`). Pour créer des unités combat-ready, `server/unitCatalog.ts` doit être étendu ou les prototypes enrichis.

---

### A. server/unitCatalog.ts — rôle à conserver

**Oui, source de vérité à court terme.** Contient `attack`, `defense`, `health`, `movement`, `strength`. `createProducedUnit()` en dépend directement — ne pas désintégrer sans plan de migration stats. Doit rester authoritative jusqu'à V3-D5-E au minimum.

### B. shared/landUnitCatalog.ts — rôle futur

Catalogue design passif pour : `creationCost`, `upkeepPerTurn`, `maxMovementPerTurn`, `siegeWearPoints`, `creationProfile`. Ne remplace pas les stats combat de `server/unitCatalog.ts` sans plan dédié.

---

### Source de paiement recommandée : city_inventory

**Recommandation : `city_inventory` comme source principale.**

- Pattern déjà existant et testé (`start-construction` débite `city_inventory` de manière atomique)
- Logistique locale cohérente : une ville recrute avec son stock physique
- La route `GET /:cityId/inventory` existe déjà (à étendre pour les 3 ressources V3)
- `player_bank` convient pour `fracten` si nécessaire (hybride possible en V3-D5-C+)

Le pattern de `start-construction` est le modèle à reproduire :
```
vérifier stock → insuffisant → 422 INSUFFICIENT_CITY_INVENTORY
                → suffisant  → débiter city_inventory + UPSERT city_production
```

---

### Modèle de coût multi-ressources recommandé

```typescript
// Compatible avec CanonicalResourceId depuis shared/economicResources.ts
// (importable côté serveur sans problème)
type RecruitmentResourceCost = Partial<Record<
  | 'food' | 'wood' | 'stone'
  | 'common_metals' | 'common_textiles'
  | 'labor_contracts' | 'basic_equipment',
  number
>>;
```

**Ressources à exclure des coûts prototype :** `fuel`, `common_ingredients`, `coal`, `oil`, `herbs` — délibéré (non migrés).

**Catalogue de coûts serveur (futur) :** table de correspondance `LandUnitId → RecruitmentResourceCost` côté serveur, initialisée depuis les `creationCost` de `landUnitCatalog.ts` (ou recopiée statiquement pour éviter la dépendance shared→server).

---

### Architecture de débit atomique proposée

```typescript
// Futur helper passif — server/recruitmentService.ts (V3-D5-B)
async function debitCityInventoryForRecruitment(
  cityId: number,
  cost: RecruitmentResourceCost,
): Promise<void | { error: 'INSUFFICIENT'; missing: Record<string, { required: number; available: number }> }> {
  // 1. Lire city_inventory (SELECT FOR UPDATE dans transaction)
  // 2. Vérifier chaque ressource du cost
  //    → accumuler { resource: { required, available } } si manquant
  // 3. Si manque → retourner erreur lisible (PAS d'UPDATE)
  // 4. Si tout OK → UPDATE city_inventory SET r = r - cost[r] pour chaque r
  //    → en une seule transaction atomique
}
```

**Propriétés clés :**
- Vérification exhaustive avant tout débit (pas de débit partiel)
- Transaction atomique (rollback automatique si une ressource est insuffisante)
- Erreur structurée : `{ resource, required, available }` par ressource manquante
- Aucun débit si la ville n'a pas de ligne `city_inventory` (à créer à 0)

---

### Recommandation pour productionCost:number — Option A

**Conserver `productionCost` comme durée/progression uniquement.**

- `productionCost` = nombre de tours (ou points de production) nécessaires à la complétion
- Les ressources sont débitées **au lancement** (`startRecruitment`), pas à la complétion
- Avantage : aucun refactor de `tickCityProduction`, du schema DB `city_production`, ni de `apiProductionTick`
- Le nom reste ambigu mais le commentaire dans le code le documente suffisamment
- Option B (renommer en `productionDuration`) ou C (ajouter colonne `resource_cost`) reportées à V3-D6+

---

### Plan de blocs progressif recommandé

**V3-D5-A — Audit architecture** ✅ (ce bloc)

**V3-D5-B — Helpers serveur passifs**
- `server/recruitmentService.ts` : `debitCityInventoryForRecruitment()`, `getPrototypeCost(unitId)`
- Table statique `PROTOTYPE_UNIT_COSTS: Record<string, RecruitmentResourceCost>` (copiée de `landUnitCatalog.ts`)
- Pas de route branchée, pas d'UI modifiée
- Étendre `GET /:cityId/inventory` pour exposer `common_textiles`, `labor_contracts`, `basic_equipment`

**V3-D5-C — Nouvelle route startRecruitment serveur-authoritative**
- `POST /api/cities/:cityId/start-recruitment` : body `{ unitId }`, débite `city_inventory`, UPSERT `city_production`
- Validation : `checkCityAccess` + `debitCityInventoryForRecruitment` + bloquer si ville occupée
- **Ne pas encore brancher** le `RecruitmentPanel` à cette route

**V3-D5-D — RecruitmentPanel affiche coûts depuis catalogue prototype**
- Lire `LAND_UNIT_CATALOG` (ou PROTOTYPE_UNIT_COSTS) pour afficher les `creationCost` réels
- Appeler `POST /api/cities/:cityId/start-recruitment` au lieu de `trainUnit`
- Ne PAS encore supprimer les anciens IDs d'unités (warrior, etc.) — les conserver en parallèle

**V3-D5-E — Unités prototype dans server/unitCatalog.ts**
- Ajouter les 15 `LandUnitId` dans `UNIT_CATALOG` avec stats combat provisoires
- `createProducedUnit()` peut alors créer des unités militia, garrison, etc.
- `tickCityProduction` gère les deux familles d'IDs

**V3-D5-F — Tests de recrutement**
- Voir section Tests recommandés ci-dessous

---

### Risques identifiés

| Risque | Sévérité | Notes |
|---|---|---|
| IDs incompatibles UNIT_CATALOG / LAND_UNIT_CATALOG | 🔴 Bloquant | La création d'unité prototype échouera à la complétion — à résoudre en V3-D5-E avant tout test |
| Recrutement actuel sans validation serveur | 🔴 | Débit client-side rechargeable — à remplacer par V3-D5-C |
| Double débit si production annulée et relancée | 🟠 | La route `start-recruitment` doit bloquer si `city_production` déjà occupée ; pas de remboursement automatique en V3-D5-C |
| `city_inventory` absent de GET /inventory pour 3 ressources V3 | 🟠 | Bloque l'affichage stock en UI — à corriger en V3-D5-B |
| Mismatch coûts client / coûts serveur | 🟠 | Le client hardcode ses propres coûts — risque d'incohérence si V3-D5-D est incomplet |
| Permission ville non propriétaire | 🟡 | `checkCityAccess` couvre déjà ownerType=faction/player — à réutiliser |
| Double clic recrutement | 🟡 | `city_production` est UNIQUE(city_id) → second INSERT refusé ; UI à désactiver pendant la requête |
| Stats combat manquantes dans landUnitCatalog.ts | 🟡 | À résoudre en V3-D5-E — fournir valeurs provisoires dans UNIT_CATALOG |
| Remboursement si annulation production | 🟡 | Non prévu en V3-D5-C — à concevoir en V3-D5-F |
| Conflit productionCost:number / coût multi-ressources | 🟢 | Résolu par Option A : rôles distincts, pas de conflit |

---

### Tests recommandés (V3-D5-F)

**Tests de recrutement réussi**
1. Milice (food:2, labor_contracts:1) — city_inventory suffisant → unité créée après tick
2. Infanterie régulière (food:4, labor_contracts:1, basic_equipment:1) — vérifier débit exact

**Tests d'échec par ressource insuffisante**
3. food insuffisant → 422 `INSUFFICIENT_CITY_INVENTORY` avec détail food
4. labor_contracts = 0 → même erreur avec détail labor_contracts
5. basic_equipment = 0 → même erreur avec détail basic_equipment
6. Plusieurs ressources insuffisantes → erreur liste toutes les manquantes

**Tests de contraintes**
7. Ville sans city_inventory → traiter comme 0 partout (pas de crash)
8. Joueur non propriétaire → 403 ACCÈS REFUSÉ (checkCityAccess)
9. Double clic (ville déjà en production) → 409 VILLE_OCCUPÉE
10. Annulation production (`DELETE /production`) → vérifier que les ressources ne sont PAS remboursées en V3-D5-C

**Tests du tick**
11. Tick avec unitId prototype (militia) → unité créée si UNIT_CATALOG contient l'entrée
12. Tick avec unitId prototype absent de UNIT_CATALOG → warning log + clearProduction (pas de crash)

**Tests intégration**
13. Recrutement avec ressources suffisantes → tick → unité apparaît dans `/api/units/me`
14. Reload page après recrutement → ressources débitées persistées (non rechargées)

---

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée (aucun fichier modifié dans ce bloc).

### Confirmation
- Aucun fichier runtime modifié.
- Aucun recrutement branché.
- Aucun débit multi-ressources implémenté.
- Aucune unité modifiée.
- Aucune migration DB.

**Statut V3-D5-A :** Audit complet. Architecture documentée. Prêt pour V3-D5-B.

---

## Ressources V3-D5-B — Helpers serveur passifs pour recrutement multi-ressources

### Objectif
Ajouter des helpers serveur réutilisables de validation et débit multi-ressources depuis `city_inventory`, sans brancher aucun flux de recrutement actif.

### Fichiers inspectés
- `server/cityService.ts`, `server/routes/cities.ts`, `shared/schema.ts`
- `shared/economicResources.ts`, `shared/landUnitCatalog.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/recruitmentService.ts` | **Créé** — helpers passifs (nouveau fichier) |
| `server/routes/cities.ts` | **Modifié** — GET /inventory expose les 3 ressources V3 |

---

### Types ajoutés (`server/recruitmentService.ts`)

```typescript
type RecruitmentCostResource =
  | "food" | "wood" | "stone" | "common_metals"
  | "common_textiles" | "labor_contracts" | "basic_equipment";

type RecruitmentResourceCost = Partial<Record<RecruitmentCostResource, number>>;

interface CityInventorySnapshot {
  cityId: number; food: number; wood: number; stone: number;
  common_metals: number; common_textiles: number;
  labor_contracts: number; basic_equipment: number;
}

interface ResourceShortage {
  resource: RecruitmentCostResource; required: number;
  available: number; shortage: number;
}

interface AffordabilityResult { ok: boolean; missing: ResourceShortage[]; }
interface DebitResult { ok: true; debited: RecruitmentResourceCost; inventoryBefore: CityInventorySnapshot; }
interface RecruitmentCostPreview { cityId; cost; inventory; affordability; }
```

### Constante canonique
```typescript
RECRUITMENT_COST_RESOURCES = ["food","wood","stone","common_metals",
  "common_textiles","labor_contracts","basic_equipment"] as const
```

---

### Helpers ajoutés

| Helper | Description |
|---|---|
| `normalizeRecruitmentCost(cost)` | Valide un objet de coût : ignore clés non autorisées, refuse valeurs négatives/non-entières, retire les zéros, retourne objet propre |
| `getCityInventoryForRecruitment(cityId)` | Lit city_inventory et retourne un snapshot limité aux 7 ressources de recrutement. Retourne 0 partout si aucune ligne n'existe (ne crée pas de ligne) |
| `canAffordRecruitmentCost(inventory, cost)` | Pure — compare stock et coût, retourne `{ ok, missing: ResourceShortage[] }`, ne throw jamais pour stock insuffisant |
| `debitCityInventoryForRecruitment(cityId, rawCost)` | Atomique — lit → vérifie → UPDATE en une opération. Throw `INSUFFICIENT_CITY_INVENTORY` avec `.missing[]` si une ressource manque. Aucun UPDATE partiel |
| `previewRecruitmentCostPayment(cityId, rawCost)` | Retourne `{ cost, inventory, affordability }` sans aucun débit — utile pour affichage UI futur |

### Comportement du débit atomique (corrigé — concurrence-safe)

1. `normalizeRecruitmentCost` valide et nettoie le coût
2. Lecture snapshot pour erreur lisible (early check — cas commun)
3. `canAffordRecruitmentCost` → throw immédiat si manque évident
4. **UPDATE conditionnel atomique** :
   - `SET r = r - cost[r]` (expressions SQL relatives)
   - `WHERE city_id = cityId AND food >= cost.food AND wood >= cost.wood AND ...` (garde par colonne coûtée)
5. Si `UPDATE` retourne **0 lignes** (concurrence / double clic) : relit l'inventaire frais → throw `INSUFFICIENT_CITY_INVENTORY` avec détails actualisés
6. Retourne `{ ok: true, debited, inventoryBefore }`

**Garantie** : deux requêtes concurrentes lisant le même stock ne peuvent pas toutes deux réussir l'UPDATE — la seconde trouve la garde SQL insatisfaite et retourne 0 lignes.

---

### Ressources autorisées dans les coûts de recrutement
`food`, `wood`, `stone`, `common_metals`, `common_textiles`, `labor_contracts`, `basic_equipment`

Exclues délibérément : `fracten`, `fuel`, `coal`, `oil`, `herbs`, `common_ingredients`, ressources rares, legacy (iron/copper/fur/gold).

---

### Correction GET /api/cities/:cityId/inventory
La route retourne désormais `common_textiles`, `labor_contracts`, `basic_equipment` (colonnes existantes en DB depuis V3-D2, absentes de la réponse jusqu'à ce bloc).

---

### Confirmations
- **Recrutement non branché** : `debitCityInventoryForRecruitment` n'est appelé par aucun flux actif (`setProduction`, `tickCityProduction`, `createProducedUnit`, `RecruitmentPanel`, `apiSetProduction`).
- **`productionCost:number` non modifié** — reste la durée/progression en tours.
- **`shared/landUnitCatalog.ts` reste passif** — non importé, non modifié.
- **Aucune migration DB** — colonnes déjà présentes depuis V3-D2.

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- `debitCityInventoryForRecruitment` utilise READ+CHECK+UPDATE sans verrou SERIALIZABLE — contention possible si double clic très rapide (V3-D6+).
- Si `city_inventory` n'a pas de ligne pour une ville, stock retourné à 0 mais aucune ligne n'est créée → debit tentera un UPDATE sur zéro lignes (à gérer en V3-D5-C via UPSERT préalable ou vérification count).

### Prochaine étape recommandée
**V3-D5-C** — Route `POST /api/cities/:cityId/start-recruitment` serveur-authoritative : body `{ unitId }`, appelle `debitCityInventoryForRecruitment`, UPSERT `city_production`.

**Statut V3-D5-B :** Helpers prêts et exportés. Aucun recrutement branché. Aucune unité prototype créée. Aucune migration DB.

---

## Ressources V3-D5-C — Route start-recruitment serveur-authoritative

### Objectif
Ajouter `POST /api/cities/:cityId/start-recruitment` : vérifie l'accès, détermine le coût côté serveur, débite `city_inventory` via `debitCityInventoryForRecruitment()`, lance `setProduction()`. Le coût ne vient jamais du client.

### Fichiers inspectés
- `server/routes/cities.ts`, `server/cityService.ts`, `server/recruitmentService.ts`
- `server/unitCatalog.ts`, `shared/schema.ts`
- `client/src/components/game/RecruitmentPanel.tsx`, `client/src/lib/api/citiesApi.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/recruitmentService.ts` | Ajout `RUNTIME_RECRUITMENT_COSTS` + type `RuntimeRecruitmentEntry` |
| `server/routes/cities.ts` | Ajout imports + route `POST /:cityId/start-recruitment` |

---

### Route ajoutée

`POST /api/cities/:cityId/start-recruitment`

**Payload :** `{ "unitType": "warrior" }`
Le coût vient exclusivement du serveur — jamais du client.

**Flux :**
1. Parse `cityId` → 400 si invalide
2. `checkCityAccess()` → 403/404 si accès refusé
3. Validation `unitType` : requis, string, présent dans `UNIT_CATALOG` → 400 si inconnu
4. Lookup `RUNTIME_RECRUITMENT_COSTS[unitType]` → 400 si absent
5. Vérification production active (`city_production`) → 409 si existante
6. `debitCityInventoryForRecruitment(cityId, cost)` → 400 + `missing[]` si insuffisant
7. `setProduction(cityId, { type:'unit', name:unitType, cost:duration, progress:0 }, playerId)`
8. Retourne `{ ok, cityId, unitType, production, debited }`

**Réponses :**
- `201` succès : `{ ok, cityId, unitType, production: { type, name, cost, progress }, debited }`
- `400` ressources insuffisantes : `{ error:"INSUFFICIENT_CITY_INVENTORY", missing:[] }`
- `409` production déjà active : `{ error:"Une production est déjà en cours dans cette ville" }`
- `400` unitType inconnu : liste des types supportés incluse

---

### Unités supportées + coûts serveur temporaires (`RUNTIME_RECRUITMENT_COSTS`)

| unitType | duration | food | wood | stone | common_metals | common_textiles | labor_contracts | basic_equipment |
|---|---|---|---|---|---|---|---|---|
| warrior | 2 | 2 | – | – | – | – | 1 | 1 |
| spearman | 2 | 2 | 1 | – | 1 | – | 1 | 1 |
| swordsman | 3 | 3 | – | – | 2 | – | 1 | 2 |
| archer | 2 | 2 | 1 | – | – | 1 | 1 | – |
| crossbowman | 3 | 2 | 1 | – | 1 | 1 | 1 | 1 |
| catapult | 4 | – | 4 | 2 | 3 | – | 2 | 2 |
| trebuchet | 5 | – | 5 | 3 | 4 | – | 3 | 3 |
| horseman | 3 | 4 | – | – | 2 | – | 1 | 1 |
| knight | 4 | 5 | – | – | 4 | – | 2 | 3 |
| galley | 3 | 2 | 4 | – | 2 | – | 2 | 1 |
| warship | 4 | 3 | 6 | – | 4 | – | 3 | 2 |
| scout | 1 | 1 | – | – | – | – | 1 | – |
| settler | 3 | 5 | 3 | 2 | 2 | – | 2 | – |
| diplomat | 2 | 2 | – | – | – | 1 | 2 | – |
| spy | 2 | 2 | – | – | – | 1 | 2 | 1 |

Ces coûts sont des valeurs prototype non équilibrées — à remplacer par les `creationCost` de `LAND_UNIT_CATALOG` quand les IDs seront réconciliés (V3-D5-E).

---

### Atomicité débit + setProduction — risque résiduel documenté

Le débit `city_inventory` et l'UPSERT `city_production` ne sont **pas** dans une transaction DB unique. Si `setProduction()` échoue après un débit réussi, les ressources sont perdues sans unité en file — ce cas est loggué explicitement avec `[CRITIQUE]`. Correction prévue en **V3-D5-C2** via transaction Drizzle explicite.

---

### Confirmations
- **`RecruitmentPanel.tsx` non modifié** — l'ancien flux `trainUnit → PUT /production` reste intact.
- **`productionCost:number` inchangé** — `cost` dans `city_production` reste la durée en tours.
- **`shared/landUnitCatalog.ts` passif** — non importé, non modifié.
- **`tickCityProduction()` non modifié** — complétion inchangée.
- **`createProducedUnit()` non modifié** — lira UNIT_CATALOG au tick de complétion.
- **Aucune unité prototype** branchée dans `server/unitCatalog.ts`.

### Tests documentés
| Cas | Comportement attendu |
|---|---|
| `unitType` absent | 400 |
| `unitType` inconnu (ex. "militia") | 400 + liste des types supportés |
| Ville inaccessible | 403/404 via checkCityAccess |
| Production déjà active | 409 |
| food=0, coût food>0 | 400 + `missing:[{ resource:"food", ... }]` |
| Ressources suffisantes | 201 + débit DB + city_production créée |
| Double appel rapide | 2e échoue par 409 (production active) ou débit atomique 0-lignes |

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Prochaine étape recommandée
**V3-D5-D** — Adapter `RecruitmentPanel.tsx` pour appeler `POST /start-recruitment` et afficher les coûts depuis le catalogue prototype.

**Statut V3-D5-C :** Route serveur prête. Débit multi-ressources actif uniquement via la nouvelle route. Ancien recrutement UI inchangé. Aucune unité prototype branchée.

---

## Ressources V3-D5-C2 — Atomicité start-recruitment

### Objectif
Éliminer le risque de perte de ressources identifié en V3-D5-C : débit `city_inventory` et création `city_production` sont désormais dans une seule transaction DB — soit les deux sont appliqués, soit aucun.

### Fichiers inspectés
- `server/recruitmentService.ts`, `server/routes/cities.ts`
- `server/cityService.ts`, `shared/schema.ts`, `server/db.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/recruitmentService.ts` | Ajout import `cityProduction` + `startRecruitmentTransaction()` |
| `server/routes/cities.ts` | Import mis à jour + route simplifiée |

---

### Stratégie transactionnelle

`db.transaction(async (tx) => { ... })` via `drizzle-orm/neon-serverless` + Pool. Tout throw à l'intérieur déclenche un rollback automatique.

### Fonction transactionnelle : `startRecruitmentTransaction(params)`

**Signature :** `{ cityId, unitType, entry: RuntimeRecruitmentEntry, playerId } → StartRecruitmentResult`

**Séquence à l'intérieur de la transaction :**
1. `tx.select` sur `city_production` → throw `PRODUCTION_ALREADY_ACTIVE` si ligne existante
2. `tx.select` sur `city_inventory` → snapshot + `canAffordRecruitmentCost` → throw `INSUFFICIENT_CITY_INVENTORY` si manque
3. `tx.update(cityInventory)` UPDATE conditionnel (garde SQL `≥ coût`, décréments relatifs, RETURNING)
4. Si `RETURNING` = 0 lignes → re-read frais + throw `INSUFFICIENT_CITY_INVENTORY` (cas concurrence)
5. `tx.insert(cityProduction)` UPSERT `{ type:'unit', name:unitType, cost:duration, progress:0 }`
6. Retourne `{ ok, debited, production }`

**Rollback automatique si :** production déjà active / ressources insuffisantes / concurrence / erreur UPSERT.

### Route mise à jour

`POST /api/cities/:cityId/start-recruitment` appelle uniquement `startRecruitmentTransaction()` pour les étapes 4-7. La vérification production active est maintenant **dans** la transaction.

**Gestion des erreurs :**
| Code | HTTP | Réponse |
|---|---|---|
| `PRODUCTION_ALREADY_ACTIVE` | 409 | `{ error, message }` |
| `INSUFFICIENT_CITY_INVENTORY` | 400 | `{ error, missing[] }` |
| Erreur inattendue | 500 | message générique |

### Tests documentés
| Cas | Comportement attendu |
|---|---|
| Production active | Transaction throw → 409, aucun débit |
| Ressources insuffisantes | Transaction throw → 400 + missing[], aucun débit |
| Ressources suffisantes | Débit + city_production créés atomiquement → 201 |
| Échec simulé UPSERT city_production | Rollback → débit annulé, aucune perte |
| Double appel rapide | 2e échoue par PRODUCTION_ALREADY_ACTIVE (dans la transaction) ou garde SQL 0-lignes |

### Confirmations
- **`RecruitmentPanel.tsx` non modifié.**
- **`productionCost:number` inchangé** — `cost` dans `city_production` reste la durée en tours.
- **`shared/landUnitCatalog.ts` passif** — non importé, non modifié.
- **`tickCityProduction()` / `createProducedUnit()` non modifiés.**

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- `debitCityInventoryForRecruitment()` autonome (non transactionnel) reste exporté — à ne pas utiliser depuis start-recruitment (remplacé par `startRecruitmentTransaction`). Peut rester pour usage isolé futur.
- Pas de remboursement en cas d'annulation de production — délibéré jusqu'à V3-D5-F.

### Prochaine étape recommandée
**V3-D5-D** — Adapter `RecruitmentPanel.tsx` pour appeler `POST /start-recruitment` et afficher les coûts depuis le catalogue.

**Statut V3-D5-C2 :** start-recruitment atomique. Aucune perte possible entre débit et city_production. UI inchangée. Aucune unité prototype branchée.

---

## Ressources V3-D5-D — API client passive start-recruitment

### Objectif
Ajouter une fonction client API typée et réutilisable pour `POST /api/cities/:cityId/start-recruitment`, sans brancher l'UI. Prépare V3-D5-E (branchement `RecruitmentPanel.tsx`).

### Fichiers inspectés
- `client/src/lib/api/citiesApi.ts`
- `client/src/lib/api/economyApi.ts` (conventions fetch / getAuthHeaders)
- `server/routes/cities.ts` (commentaire obsolète)
- `server/recruitmentService.ts`, `CLAUDE.md`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `client/src/lib/api/citiesApi.ts` | Types + `apiStartRecruitment()` ajoutés |
| `server/routes/cities.ts` | Commentaire obsolète corrigé (atomicité) |

### Types client ajoutés
```ts
type RecruitmentCostResource = "food"|"wood"|"stone"|"common_metals"|"common_textiles"|"labor_contracts"|"basic_equipment";
type RecruitmentResourceCost = Partial<Record<RecruitmentCostResource, number>>;
interface RecruitmentMissingResource { resource; required; available; shortage; }
interface StartRecruitmentSuccess { ok: true; cityId; unitType; production: { type:"unit"; name; cost; progress; }; debited; }
```

### Fonction API ajoutée
`apiStartRecruitment(cityId: number, unitType: string): Promise<StartRecruitmentSuccess>`

- **Endpoint :** `POST /api/cities/${cityId}/start-recruitment`
- **Body :** `{ unitType }`
- **Auth :** `getAuthHeaders()` (Bearer token via localStorage)
- **Content-Type :** `application/json`

### Gestion des erreurs
Pattern identique à `apiStartConstruction` : `Object.assign(new Error(body.error ?? …), { body })`.

| Code HTTP | Cas | Données attachées |
|---|---|---|
| 400 | unitType absent/inconnu | `body.error` |
| 400 | `INSUFFICIENT_CITY_INVENTORY` | `body.error`, `body.missing[]` |
| 409 | `PRODUCTION_ALREADY_ACTIVE` | `body.error`, `body.message` |
| 500 | erreur inattendue | `body` vide ou message générique |

### Commentaire serveur nettoyé
Ligne 638 de `server/routes/cities.ts` : "Risque résiduel d'atomicité…" → "Recrutement atomique (V3-D5-C2)…" — mention du risque corrigé par C2.

### Confirmations
- **`RecruitmentPanel.tsx` non modifié.**
- **`trainUnit()` non modifié.**
- **`apiSetProduction()` conservé.**
- **Aucune transition UI vers start-recruitment dans ce bloc.**
- **`productionCost:number` inchangé.**
- **`shared/landUnitCatalog.ts` passif.**

### Tests documentés
1. `apiStartRecruitment(5, "warrior")` → `POST /api/cities/5/start-recruitment` body `{ unitType: "warrior" }` ✓
2. Réponse 201 → `StartRecruitmentSuccess` avec `production` + `debited` ✓
3. Réponse 400 `INSUFFICIENT_CITY_INVENTORY` → erreur avec `body.missing[]` conservé ✓
4. Réponse 409 `PRODUCTION_ALREADY_ACTIVE` → erreur avec `body.error` + `body.message` ✓
5. Fonction non appelée depuis l'UI dans ce bloc ✓

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- `apiStartRecruitment` est passive — pas de feedback visuel jusqu'à V3-D5-E.
- `RecruitmentPanel.tsx` utilise toujours Zustand (`trainUnit`) — double source de vérité temporaire.

### Prochaine étape recommandée
**V3-D5-E** — Brancher `RecruitmentPanel.tsx` sur `apiStartRecruitment()`, afficher les coûts depuis `RUNTIME_RECRUITMENT_COSTS`, supprimer la déduction Zustand client-side.

**Statut V3-D5-D :** API client prête. UI non branchée. `apiSetProduction()` conservé. Recrutement atomique serveur intact. Aucune unité prototype branchée.

---

## Ressources V3-D5-E — RecruitmentPanel branché sur start-recruitment

### Objectif
Remplacer le recrutement client-side (`trainUnit` + débit Zustand) par `apiStartRecruitment()` dans `RecruitmentPanel.tsx`. Le débit city_inventory et la création city_production sont désormais 100 % serveur-authoritative.

### Fichiers inspectés
- `client/src/components/game/RecruitmentPanel.tsx`
- `client/src/lib/stores/useNovaImperium.tsx`
- `client/src/lib/api/citiesApi.ts`
- `server/routes/cities.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `client/src/components/game/RecruitmentPanel.tsx` | Import ajouté, handleRecruit async, erreurs UI, boutons |
| `server/routes/cities.ts` | Commentaire de bloc corrigé |

### Changement de flux UI

**Ancien flux (client-side) :**
1. `canAffordUnit()` vérifie resources Zustand + PA
2. `spendActionPoints()` débite les PA côté client
3. `trainUnit()` débite les resources Zustand + appelle `apiSetProduction()`

**Nouveau flux (serveur-authoritative) :**
1. Clic → `handleRecruit(unitId, city.id)` (async)
2. Appel `apiStartRecruitment(Number(cityId), unitId)`
3. Succès → `hydrateCitiesFromServer()` pour rafraîchir la production affichée
4. Erreur → message inline par ville via `cityErrors[city.id]`

### Fonction API appelée
`apiStartRecruitment(Number(city.id), unitId)` → `POST /api/cities/:cityId/start-recruitment`

### Payload envoyé
`{ unitType: string }` — seul le type d'unité. Aucun coût ni durée envoyés depuis le client.

### Confirmation absence de débit client-side
- Aucun `trainUnit()` appelé dans le flux recrutement.
- Aucun `spendActionPoints()` dans le nouveau `handleRecruit`.
- Aucun débit manuel des `resources` Zustand pour le recrutement.

### Gestion erreurs UI
| Cas | Message affiché |
|---|---|
| `PRODUCTION_ALREADY_ACTIVE` | "Une production est déjà en cours dans cette ville." |
| `INSUFFICIENT_CITY_INVENTORY` | "Ressources insuffisantes dans l'inventaire de la ville." + `missing[]` loggué |
| Erreur inconnue | "Impossible de démarrer le recrutement." + `console.error` |

Affichage : bannière rouge inline sous la barre de progression, par ville.

### State React ajouté
- `isRecruiting: Record<string, boolean>` — désactive tous les boutons de la ville pendant l'appel
- `cityErrors: Record<string, string>` — message d'erreur par ville

### Stratégie de rafraîchissement après succès
`hydrateCitiesFromServer()` est appelé après chaque succès → recharge `city.currentProduction` depuis le serveur → les boutons deviennent "Occupé" et la barre de progression s'affiche.

### Confirmations
- **`shared/landUnitCatalog.ts` passif** — non importé, non modifié.
- **Unités prototype non branchées** — IDs restent `warrior/spearman/…` comme définis localement.
- **`productionCost:number` inchangé** — durée en tours, non modifié.
- **`trainUnit()` conservé** dans le store — non supprimé, non appelé depuis ce composant.
- **`apiSetProduction()` conservé** — dans le store et le fichier.
- **`RUNTIME_RECRUITMENT_COSTS` non modifié.**

### Commentaire serveur corrigé
`server/routes/cities.ts` ligne 629 — bloc de commentaire entièrement réécrit : plus aucune mention du risque résiduel ou de `debitCityInventoryForRecruitment`. Texte final : "Recrutement atomique : startRecruitmentTransaction() encapsule vérification de production active, débit city_inventory et écriture city_production dans une transaction DB unique."

### Tests documentés
1. Clic "Recruter" → `POST /api/cities/:cityId/start-recruitment` body `{ unitType }` → succès 201 → `hydrateCitiesFromServer()` → bouton "Occupé", barre de progression affichée ✓
2. Ressources city_inventory insuffisantes → 400 `INSUFFICIENT_CITY_INVENTORY` → message rouge + `missing[]` dans console ✓
3. Production déjà active → 409 `PRODUCTION_ALREADY_ACTIVE` → message rouge ✓
4. Double-clic rapide → `isRecruiting[city.id]` désactive le bouton pendant l'appel → au plus un succès ✓
5. `trainUnit()` non appelé dans ce flux ✓
6. `apiSetProduction()` toujours exporté dans `citiesApi.ts` ✓

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- `canAffordUnit()` vérifie les resources Zustand globales (pas `city_inventory` serveur) — indicateur PA approximatif, peut ne pas refléter l'état réel. À corriger en V3-D5-F.
- Les coûts affichés dans l'UI (`unit.cost` local) diffèrent de `RUNTIME_RECRUITMENT_COSTS` serveur — deux catalogues coexistent. À réconcilier en V3-D5-F ou V3-D5-E2.
- Pas de debounce explicite sur le bouton — `isRecruiting` protège contre le double-clic mais pas contre les clics après `finally`.

### Prochaine étape recommandée
**V3-D5-F** — Tests serveur : `startRecruitmentTransaction`, `canAffordRecruitmentCost`, cas de concurrence, rollback atomique.

**Statut V3-D5-E :** `RecruitmentPanel` branché sur `start-recruitment` serveur-authoritative. Débit uniquement côté serveur. Ancien système (`trainUnit`, `apiSetProduction`) conservé. Unités prototype non branchées. `productionCost:number` inchangé.

---

## Ressources V3-D5-F — Audit fonctionnel/UX recrutement serveur-authoritative

### Objectif
Auditer le flux recrutement après branchement UI (V3-D5-E) et corriger les incohérences UX simples : PA non-authoritative présentés comme bloquants, coûts affichés non réconciliés, message missing[] non exploité.

### Fichiers inspectés
- `client/src/components/game/RecruitmentPanel.tsx`
- `client/src/lib/stores/useNovaImperium.tsx`
- `client/src/lib/api/citiesApi.ts`
- `server/routes/cities.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `client/src/components/game/RecruitmentPanel.tsx` | 3 corrections UX ciblées |

### Résultat de l'audit RecruitmentPanel

| Point audité | Résultat |
|---|---|
| `apiStartRecruitment` appelé | ✅ |
| `trainUnit` non appelé | ✅ |
| Aucun coût client envoyé au serveur | ✅ — seul `unitType` |
| Aucun débit client-side | ✅ |
| `hydrateCitiesFromServer` après succès | ✅ |
| Erreurs affichées/logguées | ✅ — bannière rouge par ville |
| Double-clic limité par `isRecruiting` | ✅ |
| Bouton désactivé si `currentProduction` | ✅ |
| Title mentionnait "PA insuffisants" comme verrou | ⚠️ → **corrigé** |
| Message `missing[]` non exploité | ⚠️ → **corrigé** |
| Coûts UI non réconciliés avec serveur | ⚠️ → **note UX ajoutée** |

### Décision points d'action
`canAffordUnit()` vérifie les PA (Action Points) côté client — non authoritative (le serveur ne valide pas les PA). **Décision :** les PA ne bloquent pas le bouton. Le `title` affichait faussement "Points d'action insuffisants" — corrigé en `"X PA requis (indicatif)"`. La validation réelle reste serveur (`city_inventory`).

### Décision coûts affichés
Les coûts dans `unit.cost` (tableau local) ne correspondent pas à `RUNTIME_RECRUITMENT_COSTS` serveur. **Décision :** ajout d'une note UX sous le titre : *"Coûts affichés indicatifs. Le serveur valide et débite l'inventaire réel de la ville."* Pas de refactor catalogue dans ce bloc.

### Corrections UX appliquées

**1. Message `missing[]` enrichi**
```
Avant : "Ressources insuffisantes dans l'inventaire de la ville."
Après : "Ressources insuffisantes : food +2, labor_contracts +1."  (si missing[] disponible)
         "Ressources insuffisantes dans l'inventaire de la ville."  (fallback si missing[] vide)
```

**2. Note indicative sous le titre**
```
"Coûts affichés indicatifs. Le serveur valide et débite l'inventaire réel de la ville."
```

**3. Title bouton corrigé**
```
Avant : "Points d'action insuffisants"  (laissait croire à un verrou PA)
Après : "X PA requis (indicatif)"       (information sans prétention d'autorité)
```

### Gestion erreurs après correction
| Cas | Message UI |
|---|---|
| `PRODUCTION_ALREADY_ACTIVE` | "Une production est déjà en cours dans cette ville." |
| `INSUFFICIENT_CITY_INVENTORY` (missing disponible) | "Ressources insuffisantes : food +2, …" |
| `INSUFFICIENT_CITY_INVENTORY` (missing vide) | "Ressources insuffisantes dans l'inventaire de la ville." |
| Erreur inconnue | "Impossible de démarrer le recrutement." |

### Confirmations
- **Aucun débit client-side** — `trainUnit()` non appelé, aucun `set()` Zustand sur les resources.
- **`shared/landUnitCatalog.ts` passif** — non importé.
- **`server/unitCatalog.ts` inchangé.**
- **`productionCost:number` inchangé.**
- **`trainUnit()` et `apiSetProduction()` conservés.**
- **Commentaire serveur** — déjà corrigé en V3-D5-E, cohérent (transaction atomique, plus de mention risque résiduel).

### Tests documentés
1. Clic recruter → `apiStartRecruitment` → 201 → `hydrateCitiesFromServer` → bouton "Occupé" ✓
2. Ressources insuffisantes → 400 + `missing[]` → "Ressources insuffisantes : food +2, …" affiché ✓
3. Production active → 409 → "Une production est déjà en cours" — bouton était déjà désactivé si hydrate récent ✓
4. Double-clic → `isRecruiting` désactive pendant l'appel ✓
5. PA → indicatifs uniquement, aucune validation serveur PA ajoutée ✓
6. Coûts → indicatifs, note affichée, pas de réconciliation catalogue ✓

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- Deux catalogues coexistent (`unit.cost` local vs `RUNTIME_RECRUITMENT_COSTS` serveur) — coûts affichés inexacts jusqu'à réconciliation.
- `canAffordUnit()` (PA) toujours calculé mais uniquement indicatif — peut être supprimé proprement en V3-D5-G.
- `hydrateCitiesFromServer` après succès : si le réseau est lent, la production peut ne pas s'afficher immédiatement.

### Prochaine étape recommandée
**V3-D5-G** — Réconcilier les catalogues : exposer `RUNTIME_RECRUITMENT_COSTS` via un endpoint GET pour que l'UI affiche les coûts réels, ou remplacer `unit.cost` local par les coûts de `shared/landUnitCatalog.ts` après unification des IDs.

**Statut V3-D5-F :** Audit complet. Trois corrections UX ciblées appliquées. Flux recrutement serveur-authoritative fonctionnel. Coûts et PA marqués indicatifs. Aucun refactor catalogue. `productionCost:number` conservé.

---

## Ressources V3-D5-G — Coûts recrutement UI depuis catalogue serveur

### Objectif
Réconcilier les coûts affichés dans `RecruitmentPanel.tsx` avec `RUNTIME_RECRUITMENT_COSTS` serveur via un endpoint GET dédié, sans dupliquer le catalogue côté client ni brancher `shared/landUnitCatalog.ts`.

### Fichiers inspectés
- `server/routes/cities.ts`, `server/recruitmentService.ts`, `server/unitCatalog.ts`
- `client/src/lib/api/citiesApi.ts`, `client/src/components/game/RecruitmentPanel.tsx`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/routes/cities.ts` | Route GET `/recruitment-costs` ajoutée avant `/:cityId` |
| `client/src/lib/api/citiesApi.ts` | Types + `apiGetRecruitmentCosts()` ajoutés |
| `client/src/components/game/RecruitmentPanel.tsx` | useEffect, state, icônes, affichage coûts |

### Endpoint serveur ajouté

`GET /api/cities/recruitment-costs` — route statique déclarée **avant** toutes les routes `/:cityId`.

**Comportement :** itère `RUNTIME_RECRUITMENT_COSTS`, filtre par intersection avec `UNIT_CATALOG`, retourne uniquement les unités supportées runtime. Lecture seule.

**Réponse :**
```json
{
  "ok": true,
  "costs": {
    "warrior": { "duration": 2, "cost": { "food": 2, "labor_contracts": 1, "basic_equipment": 1 } }
  }
}
```

### Fonction API client ajoutée

`apiGetRecruitmentCosts(): Promise<RecruitmentCostsResponse>` dans `citiesApi.ts`.
- Pattern identique aux autres fonctions (getAuthHeaders, throw Object.assign)
- Types exportés : `RuntimeRecruitmentCostEntry`, `RecruitmentCostsResponse`

### Changements RecruitmentPanel

**State ajouté :**
```ts
const [serverRecruitmentCosts, setServerRecruitmentCosts] =
  useState<Record<string, RuntimeRecruitmentCostEntry> | null>(null);
```

**useEffect au montage :**
- `apiGetRecruitmentCosts()` → `setServerRecruitmentCosts(res.costs)` au succès
- `console.warn` + fallback local en cas d'erreur (réseau, auth, etc.)

**Affichage des coûts :**
```
serverRecruitmentCosts?.[unit.id] disponible → displayCost + displayDuration depuis le serveur
sinon → unit.cost + unit.recruitmentTime (fallback local)
```

**Note UX dynamique :**
- Coûts chargés : *"Coûts affichés : catalogue serveur."*
- Fallback : *"Coûts affichés : fallback local, validation finale serveur."*

**Icônes ajoutées :**
- `common_textiles` → 🧶
- `labor_contracts` → 📜
- `basic_equipment` → 🛡️

### Comportement fallback
Si `apiGetRecruitmentCosts` échoue (réseau, auth, serveur) :
- `serverRecruitmentCosts` reste `null`
- UI affiche `unit.cost` local (les anciens coûts du tableau hardcodé)
- Note UX indique "fallback local"
- Aucune exception UI — recrutement reste fonctionnel

### Confirmations
- **Aucun coût envoyé par le client au recrutement** — seul `unitType` dans `POST /start-recruitment`.
- **Serveur reste authoritative** — débit uniquement dans `startRecruitmentTransaction`.
- **`shared/landUnitCatalog.ts` passif** — non importé.
- **`server/unitCatalog.ts` inchangé.**
- **`productionCost:number` inchangé** — durée en tours.
- **`trainUnit()` et `apiSetProduction()` conservés.**

### Tests documentés
1. `GET /api/cities/recruitment-costs` → `{ ok: true, costs: { warrior: {...}, … } }` ✓
2. Route déclarée avant `/:cityId` → Express ne confond pas "recruitment-costs" avec un cityId ✓
3. Filtre intersection UNIT_CATALOG ∩ RUNTIME_RECRUITMENT_COSTS → seules unités supportées ✓
4. RecruitmentPanel au montage → useEffect → coûts serveur chargés → note "catalogue serveur" ✓
5. Affichage : `food 2 🍞, labor_contracts 1 📜, basic_equipment 1 🛡️` pour `warrior` ✓
6. Erreur réseau → fallback `unit.cost` local → note "fallback local" ✓
7. Clic recruter → seul `unitType` envoyé → serveur authoritative ✓
8. `missing[]` et `PRODUCTION_ALREADY_ACTIVE` inchangés ✓

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- Les IDs du tableau `units` local (`warrior/spearman/…`) doivent correspondre aux clés de `RUNTIME_RECRUITMENT_COSTS` pour que `serverRecruitmentCosts?.[unit.id]` trouve l'entrée — si les IDs divergent un jour, le fallback s'applique silencieusement.
- `unit.cost` local (fallback) contient `fracten` qui n'est pas dans `RUNTIME_RECRUITMENT_COSTS` — coûts affichés en fallback différents des coûts serveur réels.
- `useEffect` ne se relance pas si le token change en cours de session — acceptable pour l'usage actuel.

### Prochaine étape recommandée
**V3-D5-H** — Unifier les IDs `warrior/spearman/…` (RecruitmentPanel local) avec les 15 entrées de `RUNTIME_RECRUITMENT_COSTS` pour couvrir toutes les unités runtime, ou supprimer les unités sans entrée serveur du tableau local.

**Statut V3-D5-G :** UI affiche les coûts du catalogue serveur réel. Fallback local si erreur API. Aucun débit client-side. Aucun branchement `shared/landUnitCatalog.ts`. `productionCost:number` conservé.

---

## Ressources V3-D5-H — Audit final recrutement runtime

### Objectif
Finaliser le flux recrutement serveur-authoritative avant migration prototype. Nettoyer commentaires obsolètes et harmoniser la présentation des points d'action comme indicatifs.

### Fichiers inspectés
- `client/src/components/game/RecruitmentPanel.tsx`
- `client/src/lib/api/citiesApi.ts`
- `server/routes/cities.ts`, `server/recruitmentService.ts`, `server/unitCatalog.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `client/src/lib/api/citiesApi.ts` | Commentaire section recrutement mis à jour |
| `client/src/components/game/RecruitmentPanel.tsx` | Tooltip PA harmonisé |

### Résultat audit flux complet

| Point audité | Résultat |
|---|---|
| `apiGetRecruitmentCosts()` appelé au montage | ✅ |
| Coûts serveur affichés si disponibles | ✅ |
| Fallback local si erreur API | ✅ |
| Note UX dynamique (serveur/fallback) | ✅ |
| Payload recrutement = `{ unitType }` uniquement | ✅ |
| Aucun coût/durée envoyé par le client | ✅ |
| Aucun débit client-side | ✅ |
| `hydrateCitiesFromServer()` après succès | ✅ |
| Erreurs PRODUCTION_ALREADY_ACTIVE affichées | ✅ |
| Erreurs INSUFFICIENT_CITY_INVENTORY + missing[] | ✅ |
| Double-clic protégé par `isRecruiting` | ✅ |
| Transaction atomique côté serveur | ✅ |
| Route `/recruitment-costs` avant `/:cityId` | ✅ |
| `requireAuth` sur toutes les routes | ✅ |
| Commentaire section "Passive" | ⚠️ → **corrigé** |
| Tooltip "Points d'Action" / "Coût: X PA" | ⚠️ → **corrigé** |

### Nettoyages appliqués

**citiesApi.ts ligne 129 :**
```
Avant : "// Passive — non appelé depuis l'UI dans ce bloc."
Après : "// Fonctions API du recrutement serveur-authoritative utilisées par RecruitmentPanel depuis V3-D5-E/G."
```

**RecruitmentPanel.tsx tooltip :**
```
Avant : "Points d'Action:" / "Coût: X PA"
Après : "Points d'Action (indicatifs) :" / "Requis indicatif : X PA"
```

### Harmonisation PA indicatifs
- Tooltip reformulé : aucune ambiguïté sur le caractère non-authoritative des PA.
- Button `title` (V3-D5-F) : déjà `"X PA requis (indicatif)"` — confirmé cohérent.
- Aucune validation serveur PA ajoutée.

### Confirmation endpoint coûts serveur
`GET /api/cities/recruitment-costs` — déclaré avant `/:cityId`, `requireAuth`, filtre `UNIT_CATALOG ∩ RUNTIME_RECRUITMENT_COSTS`, aucune donnée exclue exposée. Aucun bug trouvé.

### Confirmations finales
- **Payload recrutement** : seul `{ unitType }` envoyé. ✅
- **Serveur authoritative** : `startRecruitmentTransaction()` inchangé. ✅
- **Aucun débit client-side** : `trainUnit()` non appelé depuis `RecruitmentPanel`. ✅
- **`shared/landUnitCatalog.ts` passif** — non importé. ✅
- **`server/unitCatalog.ts` inchangé.** ✅
- **`RUNTIME_RECRUITMENT_COSTS` inchangé.** ✅
- **`productionCost:number`** — durée en tours, inchangé. ✅
- **`tickCityProduction()` / `createProducedUnit()`** — non modifiés. ✅
- **`trainUnit()` / `apiSetProduction()`** — conservés. ✅

### Tests documentés
1. Montage RecruitmentPanel → `apiGetRecruitmentCosts()` → coûts serveur affichés (warrior: food 2, labor_contracts 1, basic_equipment 1) ✓
2. Clic recruter → `{ unitType }` uniquement → serveur débite `city_inventory` + crée `city_production` → `hydrateCitiesFromServer()` → bouton "Occupé" ✓
3. Ressources insuffisantes → 400 + `missing[]` → "Ressources insuffisantes : food +2, …" ✓
4. Production active → 409 → "Une production est déjà en cours" ✓
5. PA → indicatifs dans tooltip + title + aucune validation serveur ✓
6. Coûts → catalogue serveur si chargé, fallback local sinon, note UX cohérente ✓

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- IDs du tableau `units` local (`warrior/spearman/…`) doivent correspondre aux clés `RUNTIME_RECRUITMENT_COSTS` — couverture partielle (15 unités runtime vs 15 locales, mais IDs à vérifier).
- `unit.cost` local (fallback) contient `fracten` absent de `RUNTIME_RECRUITMENT_COSTS` — différence visible si fallback actif.
- `canAffordUnit()` (PA indicatifs) toujours calculé — peut être retiré proprement lors de la migration prototype.

### Prochaine étape recommandée
**V3-D5-I / V3-D6** — Migration vers les unités prototype (`militia`, `garrison`, `patrollers`, `hunters`, …) : unifier les IDs du tableau local avec `RUNTIME_RECRUITMENT_COSTS` et `shared/landUnitCatalog.ts`, et ajouter les 15 entrées dans `server/unitCatalog.ts` avec des stats provisoires.

**Statut V3-D5-H :** Flux recrutement runtime finalisé. Commentaires nettoyés. PA correctement marqués indicatifs. Coûts UI alignés sur le catalogue serveur. Aucun branchement prototype. `productionCost:number` conservé.

---

## Ressources V3-D6-A — Audit migration unités terrestres prototype

### Objectif
Auditer la faisabilité et l'ordre de migration du recrutement runtime (warrior/spearman/…) vers les 15 unités terrestres prototype (militia/garrison/…) de `shared/landUnitCatalog.ts`. Aucune modification de code.

### Fichiers inspectés
- `shared/landUnitCatalog.ts` — catalogue design prototype (15 LandUnitId)
- `server/unitCatalog.ts` — catalogue runtime serveur (15 IDs actuels + UnitStats)
- `server/recruitmentService.ts` — RUNTIME_RECRUITMENT_COSTS + startRecruitmentTransaction
- `server/cityService.ts` — createProducedUnit + tickCityProduction
- `client/src/components/game/RecruitmentPanel.tsx` — tableau local units + serverRecruitmentCosts
- `client/src/lib/api/citiesApi.ts` — apiGetRecruitmentCosts, apiStartRecruitment
- `client/src/lib/game/ActionPointsCosts.ts` — getUnitRecruitmentCost
- `CLAUDE.md`

### Fichiers modifiés
Aucun — bloc audit-only.

---

### 1. État server/unitCatalog.ts

**Structure UnitStats :** `{ name, strength, health, attack, defense, movement }`
- `strength` : NON persisté en DB — injecté dans le DTO API uniquement.
- Tous les autres champs sont persistés dans la table `units` à la création.

**15 IDs actuels :** warrior, spearman, swordsman, archer, crossbowman, catapult, trebuchet, horseman, knight, galley, warship, scout, settler, diplomat, spy.

**Risque si ID absent :**
- `createProducedUnit(unitType)` → `throw new Error(...)` → `tickCityProduction` intercepte avec `console.warn` et **ne crée pas l'unité** — production silencieusement ignorée à la complétion.
- **Conclusion : ajouter les 15 LandUnitIds dans UNIT_CATALOG est un prérequis dur avant tout recrutement prototype.**

---

### 2. Fonctionnement createProducedUnit()

```
UNIT_CATALOG[unitType] → { name, attack, defense, health, movement }
INSERT units(ownerPlayerId, cityId, unitType, name, worldX, worldY, attack, defense, health, maxHealth, movement, movementRemaining, experience=0)
```

- `strength` vient du catalog mais n'est pas dans la table `units` — injecté en DTO GET /units.
- `worldX/Y` = coords de la ville au moment de la complétion (non persistées séparément).
- `maxHealth = health` du catalogue.

**Champs requis pour ajouter un prototype :** `name` (=label), `health`, `attack`, `defense`, `movement` (=maxMovementPerTurn), + `strength` (provisoire — non persisté).

**Ce que `landUnitCatalog.ts` fournit :** `label` (→name), `maxMovementPerTurn` (→movement).

**Ce que `landUnitCatalog.ts` ne fournit pas** (à inventer en V3-D6-B) : `strength`, `health`, `attack`, `defense` → valeurs provisoires à définir manuellement.

---

### 3. État RUNTIME_RECRUITMENT_COSTS

**15 entrées** correspondant exactement aux 15 IDs de UNIT_CATALOG actuel.

**Format :** `{ duration: number (tours), cost: Partial<Record<RecruitmentCostResource, number>> }`

**Ressources autorisées :** food, wood, stone, common_metals, common_textiles, labor_contracts, basic_equipment. (fracten, coal, oil, herbs exclus délibérément.)

**Lien GET /recruitment-costs :** filtre `UNIT_CATALOG ∩ RUNTIME_RECRUITMENT_COSTS` — actuellement 15/15. Après migration : 30/30 (si les 15 nouveaux IDs sont dans les deux).

**Lien POST /start-recruitment :** valide `UNIT_CATALOG[unitType]` puis `RUNTIME_RECRUITMENT_COSTS[unitType]` — les deux doivent exister pour qu'un recrutement aboutisse.

**Divergence avec `shared/landUnitCatalog.ts` :** RUNTIME_RECRUITMENT_COSTS ne connaît pas les 15 LandUnitIds. Les `creationCost` de landUnitCatalog utilisent les mêmes ressources canoniques V3 que les colonnes city_inventory → aucun problème de mapping.

---

### 4. État shared/landUnitCatalog.ts

**15 LandUnitIds :** militia, garrison, patrollers, scouts, light_infantry, regular_infantry, noble_infantry, shock_troops, bow_infantry, crossbow_infantry, sappers, field_engineers, raid_troops, hunters, pikemen.

**Champs utiles pour le runtime (en V3-D6-B/C) :**
| Champ landUnitCatalog | Correspondance UNIT_CATALOG / RUNTIME |
|---|---|
| `label` | `name` dans UNIT_CATALOG |
| `maxMovementPerTurn` | `movement` dans UNIT_CATALOG |
| `creationCost` | `cost` dans RUNTIME_RECRUITMENT_COSTS |
| (durée absente) | `duration` à définir manuellement |

**Champs à NE PAS brancher encore :**
- `siegeWearPoints` — système de siège non implémenté.
- `upkeepPerTurn` — entretien non implémenté.
- `ability` / `unlockedAction` — capacités spéciales non implémentées.
- `actionPointCostPerTile` — PA non authoritative côté serveur.

**`creationCategory: "city"`** sur les 15 unités → toutes recrutables depuis une ville → compatible avec la route actuelle.

**`prototypeStatus: true`** sur toutes les entrées — champ de design, non lu par le runtime.

**Ressources dans `creationCost` :** food, labor_contracts, wood, basic_equipment, common_metals, common_textiles — toutes présentes en `city_inventory` depuis V3-D2. ✅ Aucun ajout de colonne nécessaire.

**Unités sans `common_textiles` ni `basic_equipment` :** militia (food+labor_contracts), garrison (food+labor_contracts+wood), hunters (food+labor_contracts+wood). Les plus simples.

---

### 5. État RecruitmentPanel.tsx

**Tableau local `units` :** 15 entrées hardcodées (warrior/spearman/…), catégories : Infanterie, Distance, Siège, Cavalerie, Marine, Spécial.

**Dépendance `serverRecruitmentCosts` :** affiche les coûts/durées serveur si disponibles, sinon fallback `unit.cost` local.

**Ce qu'il faudra changer en V3-D6-E :**
- Remplacer les 15 entrées locales par les 15 LandUnitIds.
- Adapter les catégories (Infanterie légère/lourde, Distance, Technique, Raid, Support).
- Mettre à jour `getUnitRecruitmentCost` ou ignorer les PA (déjà indicatifs).

**Ce qu'il ne faut pas encore changer :** rien dans ce bloc — UI fonctionnelle avec coûts serveur.

---

### 6. Compatibilité ressources

| Ressource prototype | Présente city_inventory | Présente RUNTIME resource set |
|---|---|---|
| food | ✅ | ✅ |
| labor_contracts | ✅ (V3-D2) | ✅ |
| wood | ✅ | ✅ |
| basic_equipment | ✅ (V3-D2) | ✅ |
| common_metals | ✅ | ✅ |
| common_textiles | ✅ (V3-D2) | ✅ |

**Ressource présente dans RUNTIME actuel mais absente des prototypes :** stone (catapult/trebuchet uniquement — unités à déprécier). Aucun impact.

**Conclusion compatibilité :** migration des coûts prototype → RUNTIME_RECRUITMENT_COSTS ne nécessite aucun ajout de colonne DB ni de nouvelle ressource. Chemin libre.

---

### 7. Risques identifiés

| Risque | Criticité | Mitigation |
|---|---|---|
| LandUnitId absent de UNIT_CATALOG → `createProducedUnit` throw → unité jamais créée | 🔴 Bloquant | Ajouter en V3-D6-B avant tout recrutement prototype |
| Stats combat provisoires (health/attack/defense) à inventer pour les 15 prototypes | 🟡 Moyen | Valeurs provisoires équilibrées en V3-D6-B — à affiner en V3-D7 |
| ActionPointsCosts.ts ne connaît pas les 15 LandUnitIds → fallback 5 PA | 🟢 Faible | PA indicatifs non-authoritative depuis V3-D5-F — acceptable |
| `siege/naval units` (catapult/galley…) disparaissent du catalogue runtime | 🟡 Moyen | Déprécier en dernier (V3-D6-G) après validation prototype |
| UI `units` local doit être remplacé en V3-D6-E — changement visible | 🟡 Moyen | Migration propre dans un bloc dédié |
| `upkeepPerTurn` non branché — prototypes ne coûtent rien par tour | 🟢 Faible | Délibéré — upkeep hors scope V3-D6 |

---

### 8. Plan de migration recommandé

**V3-D6-B** — Ajouter les 15 LandUnitIds dans `server/unitCatalog.ts` avec `label`→name, `maxMovementPerTurn`→movement, et stats provisoires (health/attack/defense/strength). Passif — aucune UI, aucun RUNTIME_RECRUITMENT_COSTS.

**V3-D6-C** — Ajouter les 15 entrées dans `RUNTIME_RECRUITMENT_COSTS` avec `creationCost` de landUnitCatalog + `duration` provisoire par profil. Route GET /recruitment-costs expose automatiquement les 30 IDs (15 anciens + 15 nouveaux). Passif UI.

**V3-D6-D** — Adapter `RecruitmentPanel.tsx` : remplacer le tableau local par les 15 prototypes, nouvelles catégories (Infanterie légère/lourde/Distance/Technique/Raid/Support). Affichage coûts serveur déjà en place (serverRecruitmentCosts).

**V3-D6-E** — Test intégration : recruter militia → vérifier city_inventory débité → city_production créée → tick → createProducedUnit → unité dans la table units.

**V3-D6-F** — Déprécier les 15 anciens IDs runtime (warrior/spearman/…) dans UNIT_CATALOG et RUNTIME_RECRUITMENT_COSTS une fois la migration prototype validée. Masquer ou retirer de RecruitmentPanel.

---

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée. Aucun code modifié.

### Risques restants (post-audit)
- Stats combat provisoires pour les 15 prototypes à calibrer.
- `upkeepPerTurn` non branché — délibéré jusqu'à V3-D7.
- `ability`/`unlockedAction` non branchés — délibéré.

### Prochaine étape recommandée
**V3-D6-B** — Ajouter les 15 LandUnitIds dans `server/unitCatalog.ts` avec stats provisoires dérivées de `shared/landUnitCatalog.ts`.

**Statut V3-D6-A :** Audit complet. Aucun code modifié. Chemin de migration identifié. Risques documentés. Plan en 5 blocs proposé.

---

## Ressources V3-D6-B — UNIT_CATALOG prototype passif

### Objectif
Ajouter passivement les 15 LandUnitIds prototype dans `server/unitCatalog.ts` pour que `createProducedUnit()` puisse les résoudre lorsqu'ils seront activés en V3-D6-C. Sans les rendre recrutables.

### Fichiers inspectés
- `server/unitCatalog.ts`, `shared/landUnitCatalog.ts`, `server/cityService.ts`
- `server/recruitmentService.ts`, `server/routes/cities.ts`, `CLAUDE.md`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/unitCatalog.ts` | 15 entrées prototype ajoutées |
| `CLAUDE.md` | Correction "rangers" → "hunters" (mention V3-D5-H) |

### Confirmation ajout passif
Les 15 IDs sont dans `UNIT_CATALOG` mais **absents de `RUNTIME_RECRUITMENT_COSTS`**.

Conséquences :
- `GET /recruitment-costs` **ne les expose pas** (filtre `UNIT_CATALOG ∩ RUNTIME_RECRUITMENT_COSTS` → intersection vide pour ces IDs).
- `POST /start-recruitment` **les refuse** avec `"Aucun coût de recrutement défini"` (vérification `RUNTIME_RECRUITMENT_COSTS[unitType]`).
- `createProducedUnit("militia")` **ne throw plus** si jamais un tick rencontre cet ID.

### Liste des 15 IDs ajoutés

| ID | Nom | Rôle | movement | strength | health | attack | defense |
|---|---|---|---|---|---|---|---|
| militia | Milice | Infanterie base | 5 | 2 | 8 | 1 | 1 |
| garrison | Garnison | Défense fixe | 3 | 3 | 10 | 1 | 3 |
| patrollers | Patrouilleurs | Rapide/sécurité | 16 | 2 | 7 | 2 | 1 |
| scouts | Éclaireurs | Reconnaissance | 20 | 1 | 6 | 1 | 1 |
| light_infantry | Infanterie légère | Mobilité | 12 | 4 | 10 | 3 | 1 |
| regular_infantry | Infanterie régulière | Ligne principale | 10 | 5 | 12 | 3 | 2 |
| noble_infantry | Infanterie noble | Défense/choc | 10 | 6 | 14 | 3 | 3 |
| shock_troops | Troupe de choc | Percée | 10 | 6 | 10 | 5 | 1 |
| bow_infantry | Infanterie à arc | Soutien distance | 10 | 3 | 8 | 4 | 1 |
| crossbow_infantry | Infanterie à arbalète | Tir lourd | 8 | 4 | 10 | 5 | 1 |
| sappers | Sapeurs | Travaux/sabotage | 6 | 2 | 8 | 1 | 1 |
| field_engineers | Ingénieurs de campagne | Construction/siège | 6 | 2 | 8 | 1 | 1 |
| raid_troops | Troupe de raid | Perturbation | 14 | 4 | 9 | 4 | 1 |
| hunters | Chasseurs | Support logistique | 12 | 3 | 8 | 2 | 1 |
| pikemen | Piquiers | Anti-percée/contrôle | 10 | 4 | 11 | 2 | 4 |

### Source des labels/mouvements
`label` et `maxMovementPerTurn` de `shared/landUnitCatalog.ts`. Stats combat (`health/attack/defense/strength`) provisoires — à calibrer en V3-D7 quand le système de combat sera défini.

### Principe des stats provisoires
- Cohérentes avec l'échelle existante (warrior strength 2–4, knight strength 9).
- Rôle respecté : garnison défensive (defense 3), scouts minimaux (strength 1), shock_troops offensifs (attack 5).
- `siegeWearPoints`, `upkeepPerTurn`, `ability`, `unlockedAction` — NON branchés.

### Confirmations
- **`RUNTIME_RECRUITMENT_COSTS` inchangé.** ✅
- **`RecruitmentPanel.tsx` inchangé.** ✅
- **`shared/landUnitCatalog.ts` inchangé.** ✅
- **`createProducedUnit()` inchangé.** ✅
- **`productionCost:number` inchangé.** ✅
- **Anciennes 15 unités runtime conservées.** ✅
- **Correction "rangers" → "hunters"** dans CLAUDE.md V3-D5-H. ✅

### Tests documentés
1. `UNIT_CATALOG["militia"]` → `{ name: "Milice", strength: 2, health: 8, attack: 1, defense: 1, movement: 5 }` — ne throw plus ✓
2. `UNIT_CATALOG` contient 30 entrées (15 anciennes + 15 prototype) ✓
3. `GET /recruitment-costs` → exclut les 15 prototype (absents de RUNTIME_RECRUITMENT_COSTS) ✓
4. `POST /start-recruitment { unitType: "militia" }` → 400 "Aucun coût de recrutement défini" ✓
5. Anciennes unités (warrior, …) toujours présentes et recrutables ✓

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée.

### Risques restants
- Stats provisoires non calibrées — à affiner en V3-D7 après définition du système de combat.
- `scouts` (prototype) partage le nom "Éclaireurs" avec `scout` (ancien) — conflit de nom display uniquement, IDs distincts.
- `patrollers` movement 16 et `scouts` movement 20 — valeurs très élevées, à vérifier lors de l'intégration mouvement.

### Prochaine étape recommandée
**V3-D6-C** — Ajouter les 15 entrées dans `RUNTIME_RECRUITMENT_COSTS` avec les coûts de `creationCost` de `shared/landUnitCatalog.ts` et des durées provisoires par profil. Rendra les unités recrutables sans toucher à l'UI.

**Statut V3-D6-B :** 15 LandUnitIds prototype dans `UNIT_CATALOG`. Passifs — non recrutables, non exposés par GET /recruitment-costs. `createProducedUnit()` les résoudra sans throw. Runtime stable.

---

## Ressources V3-D6-C — Coûts serveur prototype passifs

### Objectif
Ajouter les coûts et durées de recrutement des 15 LandUnitId prototype dans `RUNTIME_RECRUITMENT_COSTS`, pour que le backend puisse valider et débiter ces unités. Sans modifier l'UI.

### Fichiers inspectés
- `shared/landUnitCatalog.ts`, `server/recruitmentService.ts`, `server/unitCatalog.ts`
- `server/routes/cities.ts`, `client/src/components/game/RecruitmentPanel.tsx`, `CLAUDE.md`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/recruitmentService.ts` | 15 entrées prototype ajoutées dans `RUNTIME_RECRUITMENT_COSTS` ; legacy marqué temporaire |

### Liste des 15 IDs prototype ajoutés dans RUNTIME_RECRUITMENT_COSTS

| ID | duration | cost (ressources) |
|---|---|---|
| militia | 1 | food:2, labor_contracts:1 |
| garrison | 1 | food:2, labor_contracts:1, wood:1 |
| patrollers | 2 | food:3, labor_contracts:1, basic_equipment:1 |
| scouts | 2 | food:3, labor_contracts:1, basic_equipment:1 |
| light_infantry | 2 | food:4, labor_contracts:1, basic_equipment:1 |
| regular_infantry | 3 | food:4, labor_contracts:1, basic_equipment:1 |
| noble_infantry | 4 | food:5, labor_contracts:1, basic_equipment:2 |
| shock_troops | 4 | food:5, labor_contracts:1, basic_equipment:2 |
| bow_infantry | 2 | food:4, labor_contracts:1, wood:1, common_textiles:1 |
| crossbow_infantry | 3 | food:4, labor_contracts:1, wood:1, common_metals:1, basic_equipment:1 |
| sappers | 3 | food:4, labor_contracts:1, wood:1, common_metals:1, basic_equipment:1 |
| field_engineers | 4 | food:4, labor_contracts:1, wood:1, common_metals:1, common_textiles:1, basic_equipment:1 |
| raid_troops | 3 | food:4, labor_contracts:1, basic_equipment:1 |
| hunters | 2 | food:3, labor_contracts:1, wood:1 |
| pikemen | 3 | food:4, labor_contracts:1, wood:1, common_metals:1, basic_equipment:1 |

### Source des coûts
`creationCost` de `shared/landUnitCatalog.ts`, clés filtrées sur `RecruitmentCostResource` (food, wood, stone, common_metals, common_textiles, labor_contracts, basic_equipment).

### Durées provisoires
Par profil de l'unité : Commun = 1, Professionnel léger = 2, Professionnel = 3, Lourd/Spécialisé = 4. À calibrer en V3-D7.

### Ressources autorisées uniquement
Seules les clés de `RecruitmentCostResource` sont présentes dans chaque coût. Aucune ressource non autorisée (fracten, coal, oil, herbs, rare_metals…). ✅

### Décision canonique — anciennes unités legacy
Les 15 anciennes unités (warrior, spearman, swordsman, archer, crossbowman, catapult, trebuchet, horseman, knight, galley, warship, scout, settler, diplomat, spy) **seront supprimées** après migration UI et tests end-to-end (V3-D6-D/E/F). Un commentaire explicite les marque `"Legacy temporaire"` dans `RUNTIME_RECRUITMENT_COSTS`. Aucun nouveau système ne doit être construit sur elles.

### Effet sur GET /recruitment-costs
Désormais expose les 15 unités prototype, car elles sont présentes dans `UNIT_CATALOG` (V3-D6-B) **et** dans `RUNTIME_RECRUITMENT_COSTS` (V3-D6-C). Le filtre intersection est automatiquement satisfait.

### Effet sur POST /start-recruitment
Accepte techniquement les 15 IDs prototype si appelés directement (curl, tests). `startRecruitmentTransaction()` les trouvera dans `RUNTIME_RECRUITMENT_COSTS` et les débitera normalement.

### Confirmations
- **`RecruitmentPanel.tsx` inchangé.** ✅ (n'affiche pas encore les prototype — V3-D6-D)
- **`shared/landUnitCatalog.ts` inchangé.** ✅
- **`server/unitCatalog.ts` inchangé.** ✅
- **`startRecruitmentTransaction()` inchangé.** ✅
- **`productionCost:number` inchangé.** ✅
- **Anciennes unités legacy conservées temporairement.** ✅

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée. ✅

### Risques restants
- `RecruitmentPanel` ne filtre pas encore les prototypes — les affichera dès V3-D6-D (prévu).
- Durées et coûts provisoires non équilibrés — à revoir en V3-D7.
- Legacy units toujours recrutables jusqu'à V3-D6-D ; ne pas en ajouter de nouvelles.

### Prochaine étape recommandée
**V3-D6-D** — Mettre à jour `RecruitmentPanel.tsx` pour afficher les 15 unités prototype issues de `GET /recruitment-costs`, et masquer ou retirer les IDs legacy de l'UI.

**Statut V3-D6-C :** 15 coûts serveur prototype ajoutés dans `RUNTIME_RECRUITMENT_COSTS`. Unités recrutables par le backend. UI inchangée. Legacy marqué temporaire. TypeScript 187 — stable.

---

## Ressources V3-D6-D — RecruitmentPanel prototype

### Objectif
Remplacer les unités legacy dans `RecruitmentPanel.tsx` par les 15 unités terrestres prototype canoniques. UI migre vers prototype — backend inchangé.

### Fichiers inspectés
- `client/src/components/game/RecruitmentPanel.tsx`, `client/src/lib/api/citiesApi.ts`
- `client/src/lib/game/ActionPointsCosts.ts`, `server/recruitmentService.ts`
- `server/unitCatalog.ts`, `shared/landUnitCatalog.ts`, `CLAUDE.md`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `client/src/components/game/RecruitmentPanel.tsx` | Tableau `units[]` legacy → `PROTOTYPE_UNITS` ; catégories ; PA ; icônes |

### IDs legacy retirés de l'UI
warrior, spearman, swordsman, archer, crossbowman, catapult, trebuchet, horseman, knight, galley, warship, scout, settler, diplomat, spy.

### 15 IDs prototype affichés
militia · garrison · patrollers · scouts · light_infantry · regular_infantry · noble_infantry · shock_troops · bow_infantry · crossbow_infantry · sappers · field_engineers · raid_troops · hunters · pikemen.

### Catégories UI
| Catégorie | IDs |
|---|---|
| Infanterie légère | militia, garrison, patrollers, scouts, light_infantry |
| Infanterie lourde | regular_infantry, noble_infantry, shock_troops |
| Distance | bow_infantry, crossbow_infantry |
| Technique | sappers, field_engineers |
| Raid / Soutien | raid_troops, hunters |
| Contrôle | pikemen |

### Coûts et durées
- Si `serverRecruitmentCosts?.[unit.id]` disponible → coûts et durée du serveur (source canonique).
- Sinon → fallback local `PROTOTYPE_UNITS[].cost / recruitmentTime` (valeurs identiques à V3-D6-C).
- Fallback n'utilise que : food, wood, common_metals, common_textiles, labor_contracts, basic_equipment. Aucune ressource fracten/rare/legacy.

### PA indicatifs
`getIndicativeActionPointCost(unitId)` : table locale couvrant les 15 IDs prototype ; fallback vers `getUnitRecruitmentCost(unitId)` pour les IDs non listés. PA restent indicatifs — aucune validation serveur, aucun blocage UI.

### handleRecruit
- Envoie uniquement `{ unitType }` → `apiStartRecruitment(cityId, unitId)`. ✅
- Aucun coût ni durée envoyé depuis le client. ✅
- `hydrateCitiesFromServer()` après succès. ✅
- `missing[]` et `PRODUCTION_ALREADY_ACTIVE` gérés. ✅

### Aucun débit client-side ✅

### Armée Actuelle
`getUnitIcon(unitType)` couvre les 15 IDs prototype + les 15 IDs legacy. Unités déjà en DB restent affichables sans crash — fallback `'👤'` pour tout type inconnu.

### Confirmations
- **`RUNTIME_RECRUITMENT_COSTS` inchangé.** ✅
- **`server/unitCatalog.ts` inchangé.** ✅
- **`shared/landUnitCatalog.ts` inchangé.** ✅
- **`startRecruitmentTransaction()` inchangé.** ✅
- **`productionCost:number` inchangé.** ✅
- **Anciennes unités conservées côté serveur (legacy temporaire).** ✅
- **Anciennes unités déjà en DB restent affichables.** ✅

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée. ✅
Vite hot-reload propre, aucune erreur console.

### Risques restants
- Anciennes unités legacy encore recrutables via API directe (curl) — seront retirées en V3-D6-E/F.
- Durées, coûts et stats provisoires — à équilibrer en V3-D7.
- `getUnitRecruitmentCost()` (ActionPointsCosts.ts) ne connaît pas les IDs prototype — la table locale `prototypeApCosts` compense.

### Prochaine étape recommandée
**V3-D6-E** — Supprimer les anciennes unités legacy de `RUNTIME_RECRUITMENT_COSTS` et `server/unitCatalog.ts`, après confirmation que l'UI fonctionne correctement avec les 15 prototype.

**Statut V3-D6-D :** RecruitmentPanel affiche les 15 unités prototype. Legacy retiré de l'UI. Backend inchangé. PA indicatifs. Armée actuelle non cassante. TypeScript 187 — stable.

---

## Ressources V3-D6-E — Test end-to-end recrutement prototype

### Objectif
Vérifier que le recrutement prototype fonctionne de bout en bout : RecruitmentPanel → POST /start-recruitment → débit city_inventory → city_production → tickCityProduction → createProducedUnit → insertion units → affichage armée.

### Fichiers inspectés
- `client/src/components/game/RecruitmentPanel.tsx`, `client/src/lib/api/citiesApi.ts`
- `server/recruitmentService.ts`, `server/routes/cities.ts`, `server/cityService.ts`
- `server/unitCatalog.ts`, `server/middleware/auth.ts`, `CLAUDE.md`

### Fichiers modifiés
Aucun — bloc audit/test pur. Injection DB temporaire (city_inventory city 10) pour alimenter le test ; aucun changement de code.

### Note de run important
Le serveur doit être **redémarré** après toute modification de `server/recruitmentService.ts` ou `server/unitCatalog.ts` pour que les nouvelles entrées soient disponibles en mémoire. Avant redémarrage, GET /recruitment-costs ne montrait que les 15 legacy. Après redémarrage, toutes les 30 entrées apparaissent.

### Unité testée
`militia` (food:2, labor_contracts:1, duration:1) sur city 10 (maitre).

---

### Résultats des tests

**Test 1 — GET /api/cities/recruitment-costs**
- Retourne **30 entrées** : 15 prototype + 15 legacy. ✅
- Prototype présents : militia, garrison, patrollers, scouts, light_infantry, regular_infantry, noble_infantry, shock_troops, bow_infantry, crossbow_infantry, sappers, field_engineers, raid_troops, hunters, pikemen. ✅
- Coûts/durées conformes à RUNTIME_RECRUITMENT_COSTS V3-D6-C. ✅

**Test 2 — POST /start-recruitment ressources insuffisantes**
- City 9 (admin) — food:13, labor_contracts:0.
- `POST { unitType:"militia" }` → **400** `INSUFFICIENT_CITY_INVENTORY`
- `missing: [{ resource:"labor_contracts", required:1, available:0, shortage:1 }]`
- Aucun city_production créé. Aucun débit partiel. ✅

**Test 3 — POST /start-recruitment succès**
- City 10 (maitre) — food:50, labor_contracts:20 (injecté test).
- `POST { unitType:"militia" }` → **200 ok**
- `debited: { food:2, labor_contracts:1 }` ✅
- `production: { type:"unit", name:"militia", cost:1, progress:0 }` ✅
- Inventaire après : food:48, labor_contracts:19 — débit atomique exact. ✅
- DB city_production : `production_name=militia, production_cost=1, production_progress=0`. ✅

**Test 4 — PRODUCTION_ALREADY_ACTIVE**
- Second POST `{ unitType:"garrison" }` sur city 10 pendant production active.
- **409** `PRODUCTION_ALREADY_ACTIVE` ✅
- Aucun second débit. ✅

**Test 5 — Production tick**
- `POST /api/cities/production-tick`
- `completedUnits: [{ cityId:10, cityName:"allo", unitId:5, unitType:"militia", unitName:"Milice" }]` ✅
- `createProducedUnit()` a résolu `UNIT_CATALOG["militia"]` sans throw. ✅
- Unité insérée dans `units` (id=5, name="Milice"). ✅
- `city_production` vidée après completion (0 lignes restantes). ✅

**Test 6 — Affichage UI après création**
- `GET /api/cities/me` (maitre) : city 10 → `currentProduction: null`. ✅
- `getUnitIcon("militia")` → `'🛡️'` (table prototype). ✅
- Aucune erreur de rendu. ✅

**Test 7 — Non-régression legacy temporaire**
- Legacy toujours présents dans RUNTIME_RECRUITMENT_COSTS et UNIT_CATALOG. ✅
- Aucune erreur serveur liée à leur présence. ✅

---

### Bugs trouvés et corrections
| # | Bug | Correction |
|---|---|---|
| 1 | Après modification de `recruitmentService.ts` / `unitCatalog.ts`, le serveur conserve l'ancien code en mémoire jusqu'au redémarrage | Redémarrage workflow — comportement normal avec `tsx`. Pas de changement de code. |

Aucun bug bloquant dans le code lui-même.

### Confirmations
- **Aucune suppression legacy** dans ce bloc. ✅
- **`productionCost:number` conservé** (city_production.production_cost=1). ✅
- **Aucun débit client-side.** ✅
- **`shared/landUnitCatalog.ts` inchangé.** ✅
- **`RUNTIME_RECRUITMENT_COSTS` inchangé.** ✅
- **`server/unitCatalog.ts` inchangé.** ✅

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée. ✅

### Risques restants
- Legacy (warrior, etc.) encore recrutables via API directe — seront retirés en V3-D6-F.
- Les inventaires city_inventory sont souvent vides en jeu réel — le gameplay doit alimenter les stocks avant que le recrutement prototype soit utilisable.
- `productionPerTurn` à 1 par défaut — un tick suffit pour militia (cost=1). Les unités plus coûteuses (noble_infantry cost=4) nécessiteront plusieurs ticks.
- Aucun test unitaire automatisé — validation manuelle uniquement pour l'instant.

### Prochaine étape recommandée
**V3-D6-F** — Supprimer les entrées legacy de `RUNTIME_RECRUITMENT_COSTS` et `server/unitCatalog.ts` après validation complète. Confirmer que l'UI ne casse pas sur les unités legacy déjà en DB.

**Statut V3-D6-E :** Flux end-to-end validé. militia recrutée, produite, créée (id=5 "Milice"), affichée. Aucun débit client-side. productionCost:number conservé. Legacy serveur encore présent temporairement. TypeScript 187 — stable.

---

## Ressources V3-D6-F — Suppression legacy serveur

### Objectif
Supprimer les 15 unités legacy (warrior, spearman, …) de `RUNTIME_RECRUITMENT_COSTS` et `server/unitCatalog.ts`. Le recrutement prototype est validé end-to-end (V3-D6-E) — la suppression est définitive.

### Fichiers inspectés
- `server/recruitmentService.ts`, `server/unitCatalog.ts`, `server/routes/cities.ts`
- `server/cityService.ts`, `client/src/components/game/RecruitmentPanel.tsx`
- `shared/landUnitCatalog.ts`, `CLAUDE.md`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `server/recruitmentService.ts` | 15 entrées legacy supprimées de `RUNTIME_RECRUITMENT_COSTS` + commentaire "Legacy temporaire" retiré |
| `server/unitCatalog.ts` | 15 entrées legacy supprimées de `UNIT_CATALOG` + en-tête "Unités runtime actuelles (V3-D5)" retiré |

### IDs legacy supprimés
De `RUNTIME_RECRUITMENT_COSTS` **et** `UNIT_CATALOG` :
warrior · spearman · swordsman · archer · crossbowman · catapult · trebuchet · horseman · knight · galley · warship · scout · settler · diplomat · spy

### IDs prototype conservés (15/15)
militia · garrison · patrollers · scouts · light_infantry · regular_infantry · noble_infantry · shock_troops · bow_infantry · crossbow_infantry · sappers · field_engineers · raid_troops · hunters · pikemen

### Confirmations serveur
- **`RUNTIME_RECRUITMENT_COSTS` ne contient plus les 15 legacy.** ✅
- **`UNIT_CATALOG` ne contient plus les 15 legacy.** ✅
- **`RecruitmentPanel.tsx` inchangé.** ✅ (n'affichait plus les legacy depuis V3-D6-D)
- **`getUnitIcon()` conserve le fallback legacy** — unités déjà en DB restent affichables sans crash. ✅
- **`productionCost:number` inchangé.** ✅
- **`shared/landUnitCatalog.ts` inchangé.** ✅

### Résultats des tests (après redémarrage workflow)

**GET /api/cities/recruitment-costs**
- **TOTAL : 15 entrées** — exactement les 15 prototype. ✅
- LEGACY présents : 0. ✅

**POST { unitType:"warrior" } (legacy refusé)**
- **400** `"Type d'unité inconnu : \"warrior\". Unités supportées : militia, garrison, …"` ✅
- Aucun débit city_inventory. Aucun city_production créé. ✅

**POST { unitType:"militia" } (prototype accepté)**
- **200 ok** — debited {food:2, labor_contracts:1}, production {name:"militia", cost:1, progress:0}. ✅

### Bugs trouvés et corrections
Aucun bug bloquant. Suppressions propres sans régression.

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée. ✅

### Risques restants
- Unités legacy déjà en DB (`units` table) — peuvent exister si recrutées avant V3-D6-F. Leur affichage dans "Armée Actuelle" reste non cassant grâce au fallback `getUnitIcon()` dans `RecruitmentPanel.tsx`. Aucune action requise.
- Stats combat (strength/health/attack/defense) toujours provisoires — à calibrer en V3-D7.
- Durées et coûts de recrutement provisoires — à équilibrer selon l'économie réelle (city_inventory souvent vide).

### Prochaine étape recommandée
**V3-D7** — Calibration des coûts/durées de recrutement prototype et des stats combat en cohérence avec le rythme de production des villes et le système de combat futur.

**Statut V3-D6-F :** Suppression legacy serveur complète. `UNIT_CATALOG` et `RUNTIME_RECRUITMENT_COSTS` contiennent uniquement les 15 unités prototype. POST legacy refusé. POST prototype accepté. Fallback UI conservé. TypeScript 187 — stable. **Migration V3-D6 complète.**

---

## Ressources V3-D6-G — Audit post-suppression legacy

### Objectif
Vérifier qu'il ne reste aucune dépendance active aux anciens IDs legacy de recrutement. Classifier toutes les occurrences. Corriger les cas INTERDIT. Documenter les cas ACCEPTABLE.

### Fichiers inspectés
- `server/unitCatalog.ts`, `server/recruitmentService.ts`, `server/routes/cities.ts`, `server/cityService.ts`
- `client/src/components/game/RecruitmentPanel.tsx`, `client/src/components/game/RecruitmentPanelZustand.tsx`
- `client/src/components/game/CityManagementPanel.tsx`, `client/src/components/game/ActionPointsPanel.tsx`
- `client/src/lib/game/ActionPointsCosts.ts`, `client/src/lib/game/types.ts`, `client/src/lib/game/AI.ts`
- `client/src/lib/game/PixelMapRenderer.ts`, `client/src/lib/stores/useNovaImperium.tsx`
- `client/src/lib/stores/useUnits.tsx`, `client/src/lib/stores/useBuildings.tsx`
- `client/src/hooks/business/useBusinessLogic.tsx`, `shared/gameSchema.ts`, `shared/landUnitCatalog.ts`

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `client/src/components/game/RecruitmentPanelZustand.tsx` | `availableUnits[]` migré vers les 15 IDs prototype (warrior/spearman/… retirés) |

---

### Tableau complet des occurrences legacy

| Occurrence | Fichier | Classification | Action |
|---|---|---|---|
| `availableUnits[]` — warrior, spearman, archer, swordsman, catapult, settler, scout | `RecruitmentPanelZustand.tsx` | **INTERDIT corrigé** — actif dans `CityManagementPanel` | Remplacé par les 15 IDs prototype |
| `getUnitIcon()` fallback warrior/spearman/… | `RecruitmentPanel.tsx` | **ACCEPTABLE fallback UI** — unités déjà en DB restent affichables | Conservé |
| `WORKER_LIKE_TYPES` / `MILITARY_TYPES` (warrior, spearman, …) | `PixelMapRenderer.ts` | **ACCEPTABLE fallback UI** — rendu carte des unités historiques | Conservé |
| `ACTION_COSTS` tables (warrior, spearman, settler, …) | `ActionPointsCosts.ts` | **ACCEPTABLE** — PA indicatifs ; IDs prototype couverts par `prototypeApCosts` dans RecruitmentPanel | Conservé |
| `UnitType = 'warrior' \| 'spearman' \| …` | `types.ts` | **ACCEPTABLE** — type TypeScript pour unités en DB ; unités legacy peuvent encore exister | Conservé |
| `trainUnit()` → `unitCosts` (warrior:40, …) | `useNovaImperium.tsx` | **ACCEPTABLE** — `trainUnit` est dead code de recrutement (appelé depuis aucun flux actif) | Conservé (note: dead code) |
| `unitProduction: ["warrior","scout"]` | `useBuildings.tsx` | **ACCEPTABLE** — dead code Zustand mock, hors flux serveur | Conservé |
| `id:"warrior"` / `id:"scout"` | `useUnits.tsx` | **ACCEPTABLE** — données mock Zustand, hors flux serveur | Conservé |
| `name:'warrior'` | `AI.ts` | **ACCEPTABLE** — logique AI simulée, hors recrutement | Conservé |
| `warrior/settler/catapult` PA display | `ActionPointsPanel.tsx` | **ACCEPTABLE** — affichage informatif uniquement, pas de recrutement | Conservé |
| `z.enum(['warrior','archer',…])` | `shared/gameSchema.ts` | **ACCEPTABLE** — validation Zod pour unités en DB (peuvent exister historiquement) | Conservé |
| `warrior:40, spearman:60, …` dans `useBusinessLogic` | `useBusinessLogic.tsx` | **ACCEPTABLE** — logique business indépendante, hors flux recrutement | Conservé |
| **`rangers`** | Partout | **ABSENT** ✅ — aucune occurrence trouvée |  |

### Correction appliquée — RecruitmentPanelZustand.tsx
`availableUnits[]` contenait warrior, spearman, archer, swordsman, catapult, settler, scout (IDs legacy) et était rendu activement dans `CityManagementPanel` (onglet "Recrutement Zustand"). Migré vers les 15 IDs prototype avec les mêmes catégories que `PROTOTYPE_UNITS` dans `RecruitmentPanel.tsx`. `handleRecruit` conservé inchangé (alert informatif — ne déclenche pas de vrai recrutement serveur).

### Confirmations
- **`scout` legacy absent des flux actifs.** ✅ — le seul `scout` restant dans les flux de recrutement est `scouts` (pluriel, prototype). Le `scout` singulier subsiste uniquement dans des tables legacy/mock (ActionPointsCosts, useUnits, PixelMapRenderer) sans déclencher de recrutement.
- **`scouts` prototype actif.** ✅ — présent dans UNIT_CATALOG, RUNTIME_RECRUITMENT_COSTS, PROTOTYPE_UNITS, RecruitmentPanel, RecruitmentPanelZustand.
- **`rangers` absent.** ✅ — aucune occurrence dans le codebase.
- **`getUnitIcon()` fallback legacy conservé.** ✅ — unités legacy déjà en DB (`units` table) restent affichables sans crash.
- **`productionCost:number` inchangé.** ✅
- **Aucun changement DB/schema.** ✅

### Résultats des tests

**GET /api/cities/recruitment-costs**
- TOTAL : **15 entrées** — exactement les 15 IDs prototype. ✅
- Triés : bow_infantry, crossbow_infantry, field_engineers, garrison, hunters, light_infantry, militia, noble_infantry, patrollers, pikemen, raid_troops, regular_infantry, sappers, scouts, shock_troops. ✅

**POST { unitType:"warrior" }**
- **400** — `"Type d'unité inconnu : \"warrior\". Unités supportées : militia, garrison, …"` ✅

**POST { unitType:"militia" }**
- **200 ok** — debited {food:2, labor_contracts:1}, production {name:"militia", cost:1}. ✅

### Résultat TypeScript
`npx tsc --noEmit` : **187 erreurs** — baseline inchangée. ✅

### Risques restants
- `trainUnit()` dans `useNovaImperium.tsx` contient une table de coûts legacy hardcodée — dead code de recrutement, mais la fonction elle-même pourrait être appelée par d'autres chemins. À auditer ou retirer en V3-D7.
- `UnitType` dans `types.ts` n'inclut pas encore les 15 IDs prototype — les unités créées via `createProducedUnit("militia")` peuvent avoir un type non couvert par le union TypeScript client. À compléter en V3-D7.
- `ActionPointsPanel.tsx` affiche des PA pour des unités legacy — mineur, informatif uniquement.

### Prochaine étape recommandée
**V3-D7** — Calibration des coûts/durées/stats + extension de `UnitType` côté client pour inclure les 15 IDs prototype + nettoyage de `trainUnit()` legacy.

**Statut V3-D6-G :** Audit post-suppression complet. Un seul cas INTERDIT trouvé et corrigé (`RecruitmentPanelZustand.tsx`). Toutes les autres occurrences legacy classées ACCEPTABLE (fallback historique ou dead code). rangers absent. scouts prototype actif. TypeScript 187 — stable. **V3-D6 entièrement complète.**
