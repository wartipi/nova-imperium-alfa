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
