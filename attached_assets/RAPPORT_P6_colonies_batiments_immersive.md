# RAPPORT FINAL — BLOC P6 — Colonies et bâtiments en mode immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P6
Objectif : afficher les colonies existantes et, si l'information est réellement disponible côté client, les bâtiments par tuile en mode immersive Pixel HD — sans créer de nouveau système, sans nouvel appel API, sans modifier la logique de jeu. Résultat de l'audit : les deux sources de données nécessaires existent déjà et sont déjà chargées côté client (mêmes données que le rendu strategic) ; aucune API supplémentaire n'a été nécessaire.

## 2. FICHIERS MODIFIÉS
- `client/src/lib/game/PixelMapRenderer.ts` — ajout des types `PixelColonyMarker`/`PixelBuildingMarker`, des options `colonies`/`buildings`/`showColonies`/`showBuildings`, des fonctions internes `drawColonyMarker()`/`drawBuildingMarker()` (non exportées), et de la couche de rendu correspondante dans `renderPixelMap()`.
- `client/src/components/game/GameCanvas.tsx` — dans `renderPixelHDOverlay()`, construction des tableaux `colonies` et `buildings` à partir de stores déjà chargés (`useNovaImperium`, `UnifiedTerritorySystem`), puis transmission à `renderPixelMap`.
- `GameEngine.ts` : lu uniquement (confirmation de la formule `drawCity`/coordonnées locales), **non modifié** — aucun nouveau getter n'a été nécessaire.
- Aucun autre fichier touché. DB, backend, schema, `MapGenerator.ts`, `mapAdapter.ts`, `TerrainCosts.ts`, `ResourceRevealSystem.ts`, `UnifiedTerritorySystem.ts` (lu, non modifié), économie, pathfinding, ownership, unités, règles de construction : intacts.

## 3. DONNÉES COLONIES / BÂTIMENTS DISPONIBLES
Audit confirmé :
- `HexTile` (type client de `mapData`) **n'a ni `cityId` ni `buildingType`** — vérifié dans `client/src/lib/game/types.ts`. Ces champs ne peuvent donc pas être lus depuis `mapData` : `PixelMapTile` (interface existante) n'a pas été enrichi de fausses données.
- **Colonies** : `useNovaImperium.getState().novaImperiums[].cities` — exactement la même source que `GameEngine.renderCivilizations()` en mode strategic (`city.x`, `city.y` en coordonnées locales identiques à `mapData[y][x]`, `city.name`/`city.displayName`).
- **Bâtiments par tuile** : `UnifiedTerritorySystem.getAllTerritories()` (déjà peuplé via `loadFromServer()` au chargement, aucun fetch ajouté), champ `exploitationBuildingType`. Vérifié en base réelle : 3 territoires possèdent `exploitationBuildingType: "exploitation_post"` sur les 27 territoires chargés — donnée réelle et non vide.
- Un seul type de bâtiment existe réellement dans la logique serveur (`server/territoryService.ts`, `ALLOWED_BUILDING_TYPES = ['exploitation_post']`) — aucune donnée fiable ne permet de distinguer maison/ferme/mine/port/marché par tuile. Conformément à la consigne « ne pas inventer », un seul marqueur bâtiment générique est implémenté.
- `City.buildings` (liste de `BuildingType[]` par ville) existe mais est un agrégat **par ville**, sans position par tuile — non utilisable pour un marqueur positionné, donc non utilisé.

## 4. RENDU DES COLONIES
`drawColonyMarker()` (interne, non exportée) : symbole village médiéval minimal — base rectangulaire sombre, toit triangulaire brun/ocre avec contour clair, petit point discret au sommet (pas de drapeau texturé, pas d'emoji, pas d'image externe, pas de texte/nom affiché pour rester lisible à zoom moyen). Taille proportionnelle à `hexSize` effectif (donc au zoom courant). Dessiné uniquement sur les tuiles avec `isHexVisible === true` (aucune colonie visible en fog total).

## 5. RENDU DES BÂTIMENTS
`drawBuildingMarker()` (interne, non exportée) : marqueur secondaire générique — petite structure sombre avec toit en ligne ocre, volontairement neutre et discret (ne surcharge pas la case, pas de sous-type inventé). Représente le seul type de donnée réel disponible (`exploitation_post`). Même garde de fog que les colonies.

## 6. ORDRE DES COUCHES
Ordre implémenté dans `renderPixelMap()`, conforme à la spec :
1. Fond canvas
2. Terrain Pixel HD (avec fog total / fog ring déjà gérés par tuile)
3. Grille (optionnelle, `showGrid=false` par défaut, inchangé depuis P4/P5)
4. **Colonies** (nouveau P6)
5. **Bâtiments** (nouveau P6)
6. Survol (`hovered`, toujours non câblé — limite connue)
7. Sélection (`selected`) — reste au-dessus de tout, y compris colonies/bâtiments

## 7. FOG / VISIBILITÉ
Colonies et bâtiments sont filtrés individuellement via `isHexVisible(x, y)` avant tout dessin — une case en fog total (non découverte) ne montre jamais de colonie ni de bâtiment, cohérent avec l'étape 3/4 de la spec et avec le comportement déjà en place pour le terrain. Le fog ring (case explorée mais hors vision directe) n'assombrit pas spécifiquement les marqueurs — simplification volontaire pour ne pas complexifier ce bloc (autorisée explicitement par la spec, étape 6).

## 8. FALLBACK STRATEGIC
- Mode `strategic` strictement inchangé : `GameEngine.renderCivilizations()`/`drawCity()` non modifiés, aucun nouveau chemin de rendu emprunté par ce mode.
- Le `try/catch` existant dans `renderPixelHDOverlay()` (GameCanvas.tsx) protège désormais aussi la construction des tableaux `colonies`/`buildings` et leur rendu — toute erreur retombe silencieusement sur la vue strategic déjà dessinée, avec le même log unique `[MapRenderMode] Immersive renderer failed, falling back to strategic view`.
- Terrain inconnu : fallback déjà existant (P5), inchangé. Bâtiment/colonie « inconnu » : n'existe pas dans ce modèle (un seul type de bâtiment, structure colonie unique) — pas de cas à gérer, aucun marqueur inventé.

## 9. TESTS MANUELS
- Chargement par défaut en `strategic` : confirmé par les logs serveur/console (comportement inchangé, `🏰 1 colonies` toujours affiché par le moteur strategic existant).
- Revue de code confirmant : coordonnées locales des colonies (`city.x`/`city.y`) identiques au repère `mapData[y][x]` (même formule que `GameEngine.drawCity()`), donc alignement garanti avec le terrain Pixel HD sans conversion supplémentaire.
- Vérification en base réelle (lecture seule, `GET /api/territories`) : 3 territoires réels portent `exploitationBuildingType: "exploitation_post"` — la couche bâtiments a donc des données concrètes à afficher, pas seulement une structure vide.
- `npx tsc --noEmit` : 0 erreur dans les deux fichiers modifiés (vérifié par filtrage explicite du nom de fichier sur la sortie complète).
- Logs serveur/console de session réelle (mode admin) : aucune erreur, aucune régression sur la vision, les ressources ou les territoires après les modifications.
- Test interactif direct (bascule clavier "M", vérification visuelle d'une colonie affichée en mode immersive, sélection visible par-dessus) **non réalisable via l'outil de capture automatisé** — limite déjà documentée depuis P4/P4-B/P5 (écran de chargement bloquant l'automatisation). Validation visuelle manuelle recommandée dans l'onglet de prévisualisation : appuyer sur "M", constater l'apparition du symbole de colonie sur la ville visible, revenir en strategic avec "M".
- Persistance du mode choisi au rechargement : mécanisme `localStorage` inchangé depuis P4-B, non retouché dans ce bloc — comportement déjà validé précédemment.

## 10. RÉSULTAT npm run check
`npx tsc --noEmit` : 233 erreurs au total dans le projet, **0 imputable à ce bloc** (confirmé par filtrage sur `PixelMapRenderer.ts`/`GameCanvas.tsx`, aucune occurrence). Toutes les erreurs préexistantes se situent dans des fichiers totalement hors périmètre (composants faction, compétences, gestion d'armée, etc.), identiques en nombre/nature à avant ce bloc.

## 11. LIMITES RESTANTES
- `hovered` toujours non câblé (limite héritée de P4, nécessiterait de modifier `GameEngine.ts` au-delà d'une lecture).
- Un seul type de bâtiment réel existe dans les données (`exploitation_post`) — impossible d'afficher des icônes différenciées (maison/ferme/mine/port/marché) sans inventer de données non présentes dans le modèle actuel.
- Aucun label de nom de colonie affiché en mode immersive (choix délibéré pour rester lisible et éviter le texte massif) — à réévaluer dans un bloc futur si souhaité.
- Fog ring n'assombrit pas les marqueurs colonies/bâtiments (simplification autorisée par la spec).
- Unités, ownership complet/frontières politiques, ressources de tuile, routes, rivières, avatar, autres joueurs : toujours absents du mode immersive — hors périmètre P6, réservé aux blocs suivants.

## 12. CONCLUSION
Le mode immersive affiche désormais les colonies réelles (même source que le mode strategic, donc toujours synchronisé, jamais de duplication de données) ainsi qu'un marqueur générique pour les bâtiments d'exploitation réellement présents en base. Aucune nouvelle API, aucun nouveau store, aucune modification de la logique de jeu, des colonies, des villes ou des règles de construction. Le fallback vers le mode strategic reste garanti en cas d'erreur. Modifications strictement limitées à `PixelMapRenderer.ts` et `GameCanvas.tsx`.

## 13. STOP
- Aucune unité ajoutée.
- Aucun système d'ownership complet ou de frontières politiques ajouté (déjà géré séparément par `UnifiedTerritorySystem`/GameEngine en mode strategic, non touché ici).
- Aucune ressource de tuile ajoutée.
- DB, backend, génération de monde : non modifiés.
- Bloc P7 non entamé.
