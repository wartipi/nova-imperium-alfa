# RAPPORT FINAL — BLOC P13 — Audit des couches restantes du mode immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P13
Objectif : auditer six catégories de couches candidates (rivières, avatar, autres joueurs, routes, effets visuels secondaires, données déjà chargées mais non rendues) pour préparer une recommandation de priorisation, **sans coder aucun rendu ni modifier aucune logique**. Ce bloc est un audit pur — aucun fichier de code n'a été modifié (`git diff --stat` vide, confirmé en fin de bloc).

## 2. FICHIERS INSPECTÉS
- `client/src/components/game/GameCanvas.tsx` (lecture seule)
- `client/src/lib/game/PixelMapRenderer.ts` (lecture seule)
- `client/src/lib/game/GameEngine.ts` (lecture seule)
- `client/src/lib/game/MapGenerator.ts` (lecture seule)
- `client/src/lib/game/mapAdapter.ts` (lecture seule)
- `client/src/lib/game/types.ts` (lecture seule)
- `client/src/lib/systems/ResourceRevealSystem.ts` (lecture seule, via sous-agent)
- `client/src/lib/stores/useNovaImperium.tsx` (lecture seule)
- `client/src/lib/stores/usePlayer.tsx` (lecture seule)
- `client/src/lib/stores/usePlayerPresence.ts` (lecture seule)
- `client/src/lib/api/playersApi.ts` (lecture seule)
- `client/src/lib/api/territoriesApi.ts` (lecture seule)
- `shared/schema.ts` (lecture seule)
- `server/playerPresenceService.ts`, `server/routes/players.ts`, `server/territoryService.ts`, `server/cartographyService.ts` (lecture seule, pour confirmer la source des données — via sous-agent d'exploration)
- Aucun fichier modifié.

## 3. RIVIÈRES / COURS D'EAU
**Constat inattendu (différent des routes en P11) : un vrai mécanisme de génération de rivières existe et fonctionne**, mais il n'est exploité que dans un chemin de secours peu utilisé en pratique :
- `types.ts` ligne 131 : `hasRiver: boolean` — champ réel dans `HexTile`.
- `MapGenerator.ts` : contient un algorithme complet — `addRivers()` (ligne 233) part de sources situées sur des tuiles montagne, puis `createRiver()` (ligne 252) trace un chemin réel jusqu'à l'océan/la côte et met `hasRiver = true` (ligne 262) sur chaque tuile traversée, avec un bonus de nourriture (`food += 1`, ligne 263).
- `GameEngine.ts` (vue strategic) **dessine réellement les rivières** : trois occurrences de `if (hex.hasRiver)` (lignes 453, 559, 613), y compris avec un traitement spécifique sous fog ("Draw river with fog effect", ligne 612).
- **Mais** : `mapAdapter.ts` (conversion des tuiles chargées depuis PostgreSQL — le chemin de données réellement utilisé en jeu aujourd'hui) code en dur `hasRiver: false` (lignes 54 et 113), et `shared/schema.ts` (table `map_tiles`) **ne contient aucune colonne liée aux rivières**.
- **Conclusion : l'algorithme de génération de rivières est réel et fonctionnel côté client, et la vue strategic sait déjà les afficher — mais la carte persistée en base de données (le chemin normal du jeu) ne transporte aucune donnée de rivière.** Les rivières ne sont donc générées/visibles que dans le chemin de secours rare `MapGenerator.generateMap()` (utilisé uniquement si le chargement DB échoue), pas dans le jeu normal. C'est un statut intermédiaire entre "rivières réelles disponibles" et "aucune donnée exploitable" — précisément : **mécanisme réel non branché sur la source de données actuellement utilisée par les joueurs.**

## 4. AVATAR / POSITION JOUEUR
**Avatar réel disponible, clairement distinct des unités et colonies.**
- `usePlayer.tsx` : `avatarPosition` (coordonnées monde pour rendu, ligne 54), `avatarHexPosition` (coordonnées hex pour la logique de jeu, ligne 55), `avatarRotation` (ligne 56) — état dédié, persistant, distinct de `selectedUnit` (qui vit dans `useNovaImperium.tsx`, ligne 13) et des colonies (`UnifiedTerritorySystem`).
- Déjà utilisé activement dans `GameCanvas.tsx` (`avatarPosition`, `avatarHexPosition`, `avatarRotation`, `moveAvatarToHex`, ligne 75) et dans `GameEngine.ts` (`updateAvatar(...)`, appelé ligne 557 de `GameCanvas.tsx`) pour le rendu strategic.
- **Cette donnée est déjà consommée par le pipeline immersive actuel** (P9 a ajouté les unités, mais l'avatar spécifiquement suit un chemin séparé — à vérifier plus précisément si un rendu avatar dédié existe déjà en immersive ou seulement via la couche unités générique).
- **Conclusion : "avatar réel disponible"** — coordonnées hex distinctes, rotation, état de mouvement (`isMoving`), tout est déjà chargé et utilisé par le rendu strategic actuel. Rien à inventer.

## 5. AUTRES JOUEURS / MULTIJOUEUR
**Un système de présence multijoueur réel existe déjà et est actif en production — mais avec un risque de fuite de fog identifié.**
- `usePlayerPresence.ts` + `playersApi.ts` (`fetchPlayerPositions()`) appellent `GET /api/players/positions`.
- `GameCanvas.tsx` (lignes 565-590) : un polling actif toutes les 5 secondes (`isAuthenticated` uniquement comme garde) récupère les positions des autres joueurs actifs et appelle `gameEngineRef.current.updateOtherPlayers(converted)`.
- `GameEngine.ts` : `renderOtherPlayers()` (ligne 968) dessine un cercle coloré + le nom d'utilisateur pour chaque autre joueur, **sans aucune vérification de fog ou de visibilité** — ni `isHexVisible`, ni `isHexInCurrentVision`, ni `isHexInFogRing` ne sont consultés avant l'affichage (contrairement au rendu des unités et des tuiles, qui respectent strictement le fog).
- Côté serveur (`server/playerPresenceService.ts`, confirmé par audit du sous-agent) : `getActivePlayerPositions` renvoie la position de **tout** joueur actif dans les 10 dernières minutes, **sans filtrage spatial ni vérification de découverte** — la donnée brute reçue par le client contient déjà les positions de joueurs potentiellement non découverts.
- **Ce système n'est actuellement PAS branché sur le renderer immersive** (`PixelMapRenderer.ts` ne contient aucune référence à `otherPlayers` ou `OtherPlayer`) — il n'existe qu'en strategic.
- **Conclusion :**
  - Ce qui est déjà affiché indirectement sans danger : ownership des colonies/territoires (déjà géré avec fog, voir P8).
  - Ce qui est déjà affiché mais **constitue un risque de fuite de fog existant, indépendant de P13** : la présence des autres joueurs (cercle + pseudo) en vue strategic, visible même hors du fog du joueur — **problème préexistant, hors périmètre de correction de ce bloc** (P13 est audit seul), mais à signaler explicitement.
  - Ce qui doit attendre un système de visibilité clair avant d'être porté en immersive : la couche "autres joueurs" ne doit **pas** être ajoutée au renderer immersive tant que la fuite de fog actuelle en strategic n'est pas corrigée — sinon on dupliquerait le même risque dans les deux vues.

## 6. ROUTES CONSTRUCTIBLES
Reprise de la conclusion P11, confirmée inchangée à ce jour :
- Aucune colonne route dans `shared/schema.ts` (confirmé de nouveau).
- `HexTile.hasRoad` existe mais reste hardcodé à `false` partout (`mapAdapter.ts`, `MapGenerator.ts`).
- `BuildingType = 'road'` existe uniquement comme entrée de coût/génération théorique (`ConstructionPanel.tsx`, `ActionPointsGeneration.ts`, `ActionPointsCosts.ts`), jamais branché à un flux de construction réel observable.
- La vue strategic n'affiche aucune route réelle.

**Recommandation de cadrage pour un futur bloc système routes** (non implémenté ici) :
- Modèle le plus cohérent avec l'architecture existante : **infrastructure construite par joueur/faction au niveau de la tuile ou du territoire**, sur le même modèle que `UnifiedTerritorySystem.exploitationBuildingType` (déjà utilisé pour fermes/mines/etc.), plutôt qu'un réseau logistique séparé.
- Effet de gameplay naturel : réduction du coût de déplacement (`movementCost` existe déjà dans `map_tiles` et `TerrainCosts.ts`) plutôt qu'un effet purement commercial, car c'est l'axe déjà instrumenté par le pathfinding actuel.
- Prérequis techniques avant tout code de rendu : (1) ajouter une vraie donnée persistée (colonne DB ou dérivation depuis `exploitationBuildingType='road'`), (2) peupler `hasRoad` de façon réelle dans `mapAdapter.ts`, (3) seulement alors ajouter le rendu immersive — dans cet ordre, jamais l'inverse.
- Ce cadrage reste une recommandation ; aucune implémentation n'a été faite dans ce bloc.

## 7. EFFETS VISUELS SECONDAIRES
Classement des éléments demandés par la spec, selon leur disponibilité et leur statut de rendu :

| Élément | Statut |
|---|---|
| Sélection active (`selectedHex`) | **Déjà rendu** en strategic (`GameEngine.ts` ligne 480) et en immersive (P8/P9, confirmé en P10). |
| Hover | **Pas disponible** — aucune trace de survol de tuile distinct dans `GameEngine.ts` ni `PixelMapRenderer.ts`. |
| Portée de vision | **Déjà rendu** indirectement via les 3 couches de fog (vision directe / fog ring / mémoire explorée), aucune donnée de "portée" affichée en soi (ex. surbrillance du rayon). |
| Zone de mouvement | **Pas disponible** comme surbrillance dédiée — seul le chemin prévisualisé (`previewPathHexes`) existe et est déjà rendu (P9/P10). |
| Zone d'attaque | **Pas disponible** — aucune donnée de portée d'attaque trouvée dans les fichiers audités. |
| État bâtiment en construction | **Disponible mais non rendu** — `city_pending_harvest`/statuts de production existent côté service économique, mais aucun indicateur visuel "en construction" n'existe sur la carte (strategic ou immersive). |
| Production active | **Disponible mais non rendu** sur la carte — visible seulement dans les panneaux UI (`HarvestPanel.tsx`, `UnifiedTerritoryPanel.tsx`), pas sur la tuile elle-même. |
| Territoire contesté | **Pas disponible** — aucun champ "contested" trouvé dans le schéma ou les services audités. |
| Capitale / ville principale | **Disponible mais non rendu distinctement** — `is_capital` existe réellement (`shared/schema.ts`, `server/territoryService.ts`), visible dans `UnifiedTerritoryPanel.tsx`, mais `GameEngine.ts` utilise la même icône générique (🏘️) pour toutes les colonies, capitale ou non ; `PixelMapRenderer.ts` fait de même (`drawColonyMarker` générique). |
| Statut colonie | **Partiellement disponible** — `ownerType`/`ownerPlayerName`/`ownerFactionName` déjà exposés (P12 harmonisation) et déjà rendus via l'ownership overlay (P8), mais pas de statut plus fin (ex. siège, blocus) qui n'existe pas dans le modèle de données actuel. |
| Niveau bâtiment | **Pas disponible** — aucun champ "niveau" de bâtiment trouvé dans les fichiers audités. |
| Amélioration de tuile existante | Seule amélioration réelle trouvée : `exploitation_post` (`shared/gameSchema.ts` ligne 16), déjà rendue en immersive comme marqueur générique de bâtiment (P6), mais **pas rendue distinctement en strategic** (qui n'affiche que l'icône colonie). |
| Fog ring | **Déjà rendu** dans les deux vues (P8/P9/P10 pour immersive, mécanisme d'origine en strategic). |
| Highlights admin/debug | **Dangereux à rendre en dehors du mode admin** — `isAdminMode` bypass déjà présent (`GameEngine.ts` lignes 382-384, 503-505 ; `PixelMapRenderer.ts` via callbacks `shouldShowTileResource`/`shouldShowUnit`) ; ce bypass est déjà correctement conditionné à `isAdmin` côté client des deux renderers — aucune fuite additionnelle trouvée dans le pipeline immersive lui-même au-delà de ce qui existe déjà et est voulu pour les administrateurs.

## 8. DONNÉES DISPONIBLES MAIS NON RENDUES
Synthèse des données réelles, déjà chargées ou générables, mais absentes du rendu (strategic et/ou immersive) :
- **Rivières** (`hasRiver`) — algorithme réel mais non alimenté par le chemin DB actuel (section 3).
- **`is_capital`** — donnée réelle en base, non distinguée visuellement sur la carte (icône identique à toute colonie).
- **`exploitation_post`** — rendu en immersive (générique) mais absent du rendu strategic.
- **Statuts de production/récolte en attente** (`city_pending_harvest`) — visibles uniquement en panneau UI, jamais sur la carte.
- **`hidden_secrets`** (régions de cartographie, `server/cartographyService.ts`) — utilisées pour des calculs de valeur commerciale, jamais exposées sur la carte ni en UI joueur (correctement non rendues — donnée volontairement cachée, pas un oubli).

## 9. RISQUES FOG / VISIBILITÉ
- **Risque identifié et confirmé, préexistant, hors périmètre de correction P13** : `GameEngine.ts.renderOtherPlayers()` (ligne 968) affiche la position et le pseudo de tout joueur actif dans les 10 dernières minutes **sans aucune vérification de fog** (`isHexVisible`/`isHexInCurrentVision`/`isHexInFogRing` non consultés), et l'API serveur `GET /api/players/positions` ne filtre pas non plus spatialement les résultats. Ce risque existe déjà dans le jeu actuel (vue strategic), indépendamment de ce bloc. **Recommandation forte : ne pas porter la couche "autres joueurs" en immersive tant que ce filtrage de fog n'est pas ajouté côté serveur et/ou client** — sinon on duplique une fuite existante dans une deuxième vue au lieu de la corriger.
- Highlights admin/debug : correctement conditionnés par `isAdmin` des deux côtés (client strategic et immersive) — pas de risque nouveau identifié.
- Ressources non découvertes : protection déjà en place (`explorationLevel >= 1 && hexResourceDiscovered`, avec bypass admin uniquement) — cohérente entre les deux vues.
- `hidden_secrets` (cartographie) : jamais exposées à la carte — aucun risque.

## 10. PRIORISATION DES CANDIDATS

| Candidat | Catégorie | Justification |
|---|---|---|
| Icône distincte pour capitale (`is_capital`) | **A — faisable prochainement sans gros système** | Donnée déjà réelle en DB, déjà exposée côté client, aucun risque fog, changement purement visuel (icône) sur marqueur déjà existant. |
| Icône distincte pour `exploitation_post` en strategic (parité avec immersive) | **A** | Donnée déjà réelle et déjà rendue en immersive ; il s'agirait d'ajouter la même distinction visuelle côté strategic, aucun risque. |
| Rivières en immersive | **B — doit attendre un vrai système de données** | L'algorithme existe mais n'est pas branché à la source DB réellement utilisée (`mapAdapter.ts` hardcode `false`) ; il faut d'abord peupler la donnée réellement avant tout rendu, sous peine d'incohérence entre rechargements. |
| Routes | **B** | Confirmé en P11 et reconfirmé ici : aucune donnée réelle, nécessite un vrai système de construction/persistance avant tout rendu. |
| Autres joueurs en immersive | **C — à éviter pour risque fog** | Le mécanisme existe et est actif en strategic, mais souffre déjà d'une fuite de fog non corrigée ; le porter en immersive dupliquerait le risque au lieu de le corriger. |
| Hover / zone de mouvement / zone d'attaque / niveau bâtiment / territoire contesté | **B** | Aucune donnée existante — nécessite une nouvelle modélisation avant tout rendu, hors périmètre visuel seul. |
| Terrains, colonies, bâtiments génériques, ressources, ownership/frontières, unités, fog, sélection | **D — déjà couvert par P5-P12** | Aucune action nécessaire. |

## 11. PROCHAIN BLOC RECOMMANDÉ
```text
Prochain meilleur bloc recommandé :
P14 — Icône distincte pour la capitale (is_capital) en immersive et en strategic

Raison :
- donnée déjà disponible et fiable (is_capital réel en base, déjà exposé côté client)
- faible risque gameplay (changement purement visuel, aucune nouvelle règle)
- faible risque fog (soumis aux mêmes gardes de visibilité que les colonies existantes, aucune donnée supplémentaire exposée)
- utile pour le mode immersive par défaut (P12) : améliore la lisibilité de la carte principale sans toucher à la logique de jeu
```
Alternative de rechange si P14 n'est pas retenu : traiter d'abord, dans un bloc séparé et explicitement scopé "correction", la fuite de fog de `renderOtherPlayers()` (section 9) avant tout ajout visuel supplémentaire lié aux joueurs.

## 12. RÉSULTAT npm run check SI LANCÉ
`npx tsc --noEmit -p .` lancé à titre de vérification de non-régression (aucune modification de code dans ce bloc) : **233 erreurs**, strictement identique à la fin de P12. Aucune erreur nouvelle, aucune erreur hors scope corrigée (conforme à la consigne de ne pas corriger d'erreurs hors scope dans un bloc audit).

## 13. LIMITES RESTANTES
- L'audit de la section 5 (autres joueurs) s'est appuyé en partie sur un sous-agent d'exploration pour confirmer le comportement exact de `server/playerPresenceService.ts` — comportement confirmé cohérent avec l'observation client (aucun filtrage de fog).
- Le statut exact du rendu avatar dédié en immersive (section 4) n'a pas été vérifié ligne par ligne dans `PixelMapRenderer.ts` au-delà de la confirmation que les données existent et sont déjà consommées par `GameEngine.ts` — une vérification plus fine serait nécessaire si un bloc futur cible spécifiquement l'avatar en immersive.
- Aucune limite bloquante : ce bloc est un audit, toutes les zones demandées par la spec ont été couvertes.

## 14. CONCLUSION
L'audit des six catégories de couches candidates montre un paysage contrasté : l'avatar et l'ownership/statut de colonie (`is_capital`) disposent de données réelles, fiables et à faible risque, prêtes pour un enrichissement visuel immédiat. Les rivières disposent d'un algorithme réel mais non connecté à la source de données actuellement utilisée en jeu (chemin DB), et les routes restent sans aucune donnée exploitable (confirmation de P11). Le système de présence multijoueur est déjà actif en strategic mais souffre d'une fuite de fog préexistante qui doit être traitée avant tout portage en immersive. Aucun code n'a été ajouté dans ce bloc, conformément à son périmètre audit-only. La recommandation retenue pour la suite est un bloc P14 ciblé sur l'icône de capitale — faible risque, donnée déjà fiable, cohérent avec le statut de mode par défaut acquis en P12.

## 15. STOP
- Aucune rivière ajoutée.
- Aucune route ajoutée.
- Aucun avatar ajouté.
- Aucun autre joueur ajouté.
- `GameCanvas.tsx` non modifié.
- `PixelMapRenderer.ts` non modifié.
- DB non modifiée.
- Backend non modifié.
- Génération de monde non modifiée.
- Règles de jeu non modifiées.
- Bloc P14 non entamé.
