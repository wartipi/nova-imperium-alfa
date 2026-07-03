# RAPPORT FINAL — BLOC P11 — Ajouter les routes au mode immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P11
Objectif : afficher les routes existantes dans le mode immersive Pixel HD, en réutilisant exclusivement des données déjà chargées côté client, sans jamais inventer de route. L'audit préalable (étape 1, obligatoire avant tout code) montre qu'**aucune donnée réelle de route n'existe actuellement dans le jeu** — ni côté client, ni côté base de données. Conformément à la clause de repli explicite de la spec ("si aucune donnée route n'existe, ne pas inventer"), **aucun code de rendu n'a été ajouté**. P11 est donc préparatoire seulement.

## 2. FICHIERS MODIFIÉS
**Aucun.** Ni `PixelMapRenderer.ts`, ni `GameCanvas.tsx`, ni aucun autre fichier n'a été modifié dans ce bloc. `git diff --stat` confirme un arbre de travail strictement identique à l'état de fin P10 (aucune sortie, aucun fichier changé).

## 3. DONNÉES ROUTES DISPONIBLES
Audit exhaustif mené sur l'ensemble des couches (types client, générateur de carte, adaptateur DB→client, schéma DB, moteur de rendu strategic) :

- **`HexTile.hasRoad: boolean`** (`client/src/lib/game/types.ts` ligne 132) : le champ existe structurellement dans l'interface, mais il est **hardcodé à `false`** partout où une tuile est construite :
  - `client/src/lib/game/mapAdapter.ts` (lignes 55 et 114) : `hasRoad: false` — conversion DB → HexTile.
  - `client/src/lib/game/MapGenerator.ts` (lignes 67, 134, 204) : `hasRoad: false` — génération procédurale.
  - Aucun autre point du code ne met jamais ce champ à `true`. La donnée existe dans le type mais n'est **jamais peuplée** — c'est un champ mort à ce stade du projet.
- **`shared/schema.ts`** (schéma Drizzle, table `mapTiles` et toutes les autres tables) : **aucune colonne** liée aux routes (`road`, `hasRoad`, `roadType`, etc.). La base de données ne stocke aucune information de route par tuile.
- **`BuildingType` = `'road'`** (`client/src/lib/game/types.ts` ligne 36) : une valeur `'road'` existe dans l'énumération des types de bâtiment, avec une entrée de coût (`ConstructionPanel.tsx` ligne 779, `{ fracten: 2 }`) et des valeurs de génération/coût en points d'action (`ActionPointsGeneration.ts` ligne 21, `ActionPointsCosts.ts` ligne 29). **Cependant**, aucune occurrence dans le code ne montre que ce type de bâtiment est réellement assignable ou assigné à une tuile via `UnifiedTerritorySystem` (`exploitationBuildingType`) — c'est une entrée de configuration théorique dans les tables de coûts, jamais reliée à un flux de construction actif ni à une donnée de territoire existante.
- **`GameEngine.ts` (vue strategic)** : aucune occurrence de `hasRoad` — la vue strategic actuelle **n'affiche déjà aucune route**, ce qui est cohérent avec l'absence de donnée réelle.
- **Conclusion de l'audit : aucune source de donnée route exploitable n'existe actuellement, ni dans le client, ni dans la base de données, ni dans la vue strategic de référence.**

## 4. RENDU ROUTES
**Aucun rendu ajouté.** Conformément à l'étape 8 de la spec ("si aucune donnée route n'existe, ne pas inventer... aucun rendu visible inventé"), aucune fonction `drawRoutesLayer` n'a été créée, aucune ligne de route (chemin de terre, pavé, etc.) n'a été dessinée. Ajouter un rendu sans donnée réelle aurait signifié soit inventer de fausses routes (interdit explicitement), soit dessiner un système à vide qui n'apporte aucune valeur et complexifie le pipeline pour rien.

## 5. CONNEXIONS HEX
Sans donnée route, aucune connexion centre-à-centre entre hexagones voisins n'a de sens à implémenter. Aucune géométrie de connexion n'a été codée dans ce bloc.

## 6. VISIBILITÉ / FOG
Sans nouvelle couche de rendu, aucune règle de fog spécifique aux routes n'a été ajoutée. Les règles de fog existantes (fog total masque tout, fog ring assombrit, aucune fuite d'information) restent strictement celles auditées et validées en P10 — non modifiées, non affectées par ce bloc.

## 7. ORDRE DES COUCHES
Ordre du pipeline de rendu immersive **inchangé** par rapport à P10 (fond → terrain → ownership overlay → fog total → fog ring → grille → frontières → ressources → colonies → bâtiments → unités → sélection). Aucune couche "routes" n'a été insérée puisqu'il n'y a rien à afficher.

## 8. FALLBACK SI AUCUNE DONNÉE ROUTE
C'est le scénario qui s'applique intégralement à ce bloc. Choix effectué, conforme à l'étape 8 de la spec :
- Audit clair et documenté (sections 3 et ci-dessus).
- **Aucune option `showRoutes`/`hasTileRoad` ajoutée aux interfaces.** La spec autorisait cet ajout ("éventuellement... seulement si cela reste propre et sans effet visuel"), mais il s'agit d'une option, pas d'une obligation. Décision : ne pas ajouter de plomberie non exploitée (types/options qui ne seraient jamais appelés par aucune donnée réelle) pour éviter d'introduire du code mort ou une fausse impression de fonctionnalité prête à l'emploi. Cette plomberie pourra être ajoutée dans un futur bloc, au moment où une vraie source de donnée route sera introduite (nouvelle colonne DB, nouveau champ peuplé, etc.), ce qui sortirait du périmètre strictement visuel de P11 (le périmètre interdisait explicitement toute modification de schéma/DB).
- Aucun rendu visible inventé.
- **Conclusion retenue, telle que suggérée par la spec : "P11 préparatoire seulement — aucune route réelle à afficher actuellement."**

## 9. FALLBACK STRATEGIC
- `GameEngine.ts` non modifié (lecture seule pour l'audit du champ `hasRoad`) — confirmé par `git diff --stat` (fichier absent de toute modification).
- Le mode strategic reste strictement inchangé, comme il l'était déjà avant ce bloc (il n'affichait aucune route et continue de n'en afficher aucune).
- Le `try/catch` autour de `renderPixelHDOverlay()` reste inchangé — aucun risque introduit puisqu'aucun code n'a été ajouté au renderer.

## 10. TESTS MANUELS
- Aucune modification de code n'a été effectuée dans ce bloc — les tests manuels de non-régression du pipeline de rendu (terrain, fog, ownership, ressources, colonies, bâtiments, unités, sélection) restent ceux déjà validés en P10, non affectés.
- `git diff --stat` : confirme qu'aucun fichier n'a changé dans ce bloc (arbre de travail identique à la fin de P10).
- Redémarrage non nécessaire : aucun fichier serveur/client modifié, donc aucun risque de régression runtime introduit par ce bloc.
- Test visuel interactif automatisé non tenté dans ce bloc car aucun changement visuel n'existe à valider — cohérent avec la conclusion "aucune route réelle à afficher".

## 11. RÉSULTAT npm run check
`npx tsc --noEmit -p .` : 233 erreurs au total, **strictement identique** au chiffre mesuré à la fin de P10. 0 erreur nouvelle, car 0 ligne de code modifiée dans ce bloc.

## 12. PROBLÈMES TROUVÉS
- Aucune fuite de fog, aucune régression, aucun bug trouvé — puisque ce bloc est un audit sans modification de code.
- Constat principal : absence totale de donnée route exploitable dans l'état actuel du projet (champ `hasRoad` toujours `false`, aucune colonne DB, aucun mécanisme de construction de route actif). Ce n'est pas un bug, c'est un état de fait documenté pour orienter un futur bloc si des routes réelles doivent être introduites (hors périmètre strictement visuel de P11, car cela nécessiterait de peupler une vraie donnée, ce qui touche potentiellement génération de carte / DB / logique de construction — tous interdits dans ce bloc).

## 13. CORRECTIONS APPLIQUÉES
Aucune — aucun problème de rendu à corriger, aucune donnée à afficher.

## 14. LIMITES RESTANTES
- Le champ `HexTile.hasRoad` existe mais reste un champ mort (toujours `false`) tant qu'aucun système de construction de route n'est implémenté et qu'aucune colonne DB correspondante n'est ajoutée — ce travail sortirait du périmètre strictement visuel de P11.
- Le type `BuildingType = 'road'` existe dans les tables de coûts/génération mais n'est relié à aucun flux de construction actif observable dans le code actuel — clarifier son statut (fonctionnalité prévue mais non implémentée, ou résidu de conception) sortirait également du périmètre de ce bloc.
- Si des routes réelles doivent être affichées en immersive dans le futur, un bloc dédié devra d'abord introduire la donnée réelle (côté génération de carte et/ou DB et/ou construction), ce qui est explicitement hors du périmètre "visuel seulement" de P11.
- Aucune vérification visuelle interactive effectuée dans ce bloc (aucun changement à vérifier).

## 15. CONCLUSION
L'audit exhaustif des données de route (type client `HexTile.hasRoad`, générateur de carte, adaptateur DB→client, schéma PostgreSQL, vue strategic de référence) confirme qu'aucune route réelle n'existe actuellement dans Nova Imperium : le champ `hasRoad` est structurellement présent mais toujours à `false`, aucune colonne DB ne stocke de donnée de route, et la vue strategic n'affiche déjà aucune route. Conformément à la clause de repli explicite de la spec P11, **aucun code de rendu n'a été ajouté** et **aucune fausse route n'a été inventée**. P11 est donc un bloc préparatoire/audit uniquement — le mode immersive reste dans l'état stable validé en P10, sans aucune modification.

## 16. STOP
- Aucune rivière ajoutée.
- Aucun avatar ajouté.
- Aucun autre joueur ajouté.
- DB non modifiée.
- Backend non modifié.
- Génération de monde non modifiée.
- Pathfinding non modifié.
- Mouvement non modifié.
- Règles de construction non modifiées.
- Bloc P12 non entamé.
