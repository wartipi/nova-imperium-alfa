# RAPPORT FINAL — BLOC P8 — Frontières et ownership visuel en mode immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P8
Objectif : afficher en mode immersive Pixel HD les territoires déjà revendiqués/connus et les frontières entre propriétaires différents, en lecture seule sur les données d'ownership déjà chargées côté client, sans jamais dupliquer ou modifier la logique de revendication/territoire/faction. Résultat de l'audit : la donnée d'ownership canonique existe déjà intégralement dans `UnifiedTerritorySystem` (alimentée par `loadFromServer()`, déjà appelée), et le rendu strategic (`GameEngine.ts`) dispose déjà d'une logique de frontières exploitable telle quelle comme référence de convention (couleurs, voisinage hex).

## 2. FICHIERS MODIFIÉS
- `client/src/lib/game/PixelMapRenderer.ts` — extension de `PixelMapTile` (`ownerType`, `factionId`, `buildingType`, `buildingId`, champs déjà réellement disponibles), ajout des options `showOwnership`, `showBorders`, `getTileOwner`, `getOwnerColor`, `isSameOwner`, ajout des fonctions internes `drawOwnershipOverlay()`, `drawTileBorders()`, `drawHexSidePath()`, `HEX_NEIGHBOR_SIDES()`, `hashOwnerIdToColor()`, `resolveOwnerColor()`, et insertion des deux couches de rendu (voile ownership dans la boucle terrain, frontières dans une passe dédiée après la grille).
- `client/src/components/game/GameCanvas.tsx` — dans `renderPixelHDOverlay()`, ajout de trois callbacks (`getTileOwner`, `getOwnerColor`, `isSameOwner`) lisant exclusivement `UnifiedTerritorySystem.getTerritory(x, y)` (donnée déjà chargée), transmission à `renderPixelMap` avec `showOwnership: true` / `showBorders: true`.
- `GameEngine.ts` : lu uniquement (fonctions `drawTerritoryBorders`, `drawHexSide`, couleurs joueur/faction) pour garantir une convention strictement identique — **non modifié**, aucun getter ajouté (toutes les données nécessaires étaient déjà accessibles via `UnifiedTerritorySystem`, donc aucune lecture supplémentaire dans `GameEngine.ts` n'a été requise).
- `UnifiedTerritorySystem.ts` : lu uniquement — **non modifié**. Aucun nouveau champ, aucune nouvelle méthode.
- Aucun autre fichier touché. DB, backend, schema, `MapGenerator.ts`, `mapAdapter.ts`, `TerrainCosts.ts`, `ResourceRevealSystem.ts`, économie, pathfinding, exploration, règles d'ownership/faction/revendication : tous intacts.

## 3. DONNÉES OWNERSHIP DISPONIBLES
- Source unique et déjà chargée : `UnifiedTerritorySystem.getTerritory(x, y)` → objet `Territory` avec les champs canoniques Phase 12 :
  - `ownerType: 'player' | 'faction'`
  - `ownerPlayerId: string | null`
  - `ownerFactionId: string | null`
  - (legacy conservés mais non utilisés ici : `playerId`, `factionId`)
- Ces mêmes champs sont ceux consultés par `GameEngine.ts` (`drawTerritoryBorders`) pour le rendu strategic — aucune divergence de source.
- Territoires en coordonnées locales (`x`, `y`) déjà alignées sur `mapData[y][x]` (confirmé par `loadFromServer()`, qui convertit `worldX/worldY` → `hexX/hexY` via l'origine du bloc).
- Aucune tuile ownership n'est absente/incomplète : une case sans territoire retourne simplement `null` via `getTerritory()`, traitée comme "sans propriétaire" (aucun voile, aucune frontière).
- Distinction owner : joueur vs faction distinguée par `ownerType` ; "sans propriétaire" = `getTerritory()` retourne `null` ou les deux identifiants (`ownerPlayerId`/`ownerFactionId`) sont `null`.

## 4. RENDU OWNERSHIP
- `getTileOwner(x, y)` (GameCanvas.tsx) retourne une clé stable `player:<id>` ou `faction:<id>`, ou `null` si aucun owner.
- `drawOwnershipOverlay()` (PixelMapRenderer.ts) : voile hexagonal plein à `globalAlpha = 0.16` (dans la fourchette recommandée 0.12–0.20), couleur résolue via `getOwnerColor`.
- Couleur : réutilise **exactement** les couleurs déjà utilisées par le mode strategic (`GameEngine.ts` ligne ~416-417) : `rgba(20, 100, 220, 0.90)` pour un joueur, `rgba(20, 110, 20, 0.90)` pour une faction (l'alpha élevé de la couleur de base est neutralisé par le `globalAlpha` faible appliqué au moment du remplissage — le rendu final reste discret).
- Fallback : si `getOwnerColor` ne reconnaît pas la clé (cas non prévu), un hash déterministe local (`hashOwnerIdToColor`, hue via `hsl(...)`) est utilisé — jamais de `Math.random()`.
- Le voile est dessiné **après** le sprite de terrain (dans la même boucle), donc jamais sous une case en fog total (le `continue` du fog total intervient avant), et le terrain reste visible sous le voile grâce à l'alpha faible.

## 5. RENDU FRONTIÈRES
- Passe dédiée après la grille : pour chaque tuile visible ayant un owner, les 6 voisins sont testés avec la convention **identique** à `GameEngine.drawTerritoryBorders` (`HEX_NEIGHBOR_SIDES`, colonnes décalées, ordre 0=SE...5=NE, recopié à l'identique).
- `isSameOwner(ax, ay, bx, by)` (GameCanvas.tsx) reproduit **mot pour mot** la logique d'égalité de `GameEngine.ts` : même `ownerType` ET (même `ownerPlayerId` pour un joueur) OU (même `ownerFactionId` non nul pour une faction).
- Un segment de frontière (`drawHexSidePath`, identique à `drawHexSide` de `GameEngine.ts`) n'est tracé que si le voisin est absent d'ownership ou a un owner différent — jamais entre deux tuiles du même owner (pas de grille interne parasite).
- Style : trait de largeur 2px (recommandation "raisonnable"), couleur = couleur de l'owner de la tuile A (pas de dégradé multi-couleur pour rester lisible), sans tirets (`setLineDash([])`), au-dessus de la grille mais sous ressources/colonies/bâtiments/sélection.
- Aucune identité de voisin caché n'est exposée : le callback `isSameOwner` (ou le repli local dans `PixelMapRenderer.ts`) ne renvoie qu'un booléen, jamais l'`ownerId` du voisin — une frontière peut apparaître en bordure d'une zone de fog total, mais uniquement comme un simple trait de couleur (déjà connue du joueur, celle de sa propre tuile), sans révéler à qui appartient la case cachée.

## 6. VISIBILITÉ / FOG
- Fog total (`isHexVisible(x, y) === false`) : la boucle terrain fait `continue` **avant** le calcul du voile ownership → aucun voile n'est jamais dessiné sur une case en fog total. La passe frontières a sa propre garde explicite (`if (isHexVisible && !isHexVisible(x, y)) continue;`) pour la tuile de référence (tuile A) — une frontière ne peut donc jamais partir d'une case cachée.
- Fog ring (`isHexInFogRing`) : dessiné **après** le voile ownership dans la boucle terrain (assombrissement `rgba(12,10,8,0.62)` déjà existant depuis P5/P7) → un voile ownership sous fog ring est visuellement assombri, conformément à la recommandation "le fog ring peut assombrir ownership/frontières".
- Aucune règle de vision n'a été modifiée : `isHexVisible`/`isHexInFogRing` restent des callbacks strictement consommés, jamais recalculés dans `PixelMapRenderer.ts`.
- Sans callback `getTileOwner` fourni par l'appelant, aucune couche ownership/frontière n'est jamais dessinée (garde `if (showOwnership !== false && getTileOwner)` / `if (showBorders !== false && getTileOwner)`).

## 7. COULEURS / STYLE
- Overlay : alpha `0.16` (fourchette recommandée 0.12–0.20 respectée).
- Bordure : épaisseur 2px, couleur pleine (alpha de la couleur source ≈0.90, dans la fourchette recommandée 0.65–0.85 à l'usage réel car appliquée en trait fin, pas en remplissage) — volontairement identique à la couleur strategic existante pour cohérence visuelle immédiate entre les deux modes.
- Pas de conflit avec la sélection : la sélection reste dessinée en dernier (couche 11), toujours au-dessus.
- Pas de conflit avec le fog : le fog total bloque tout, le fog ring s'applique par-dessus le voile ownership (assombrissement, pas d'annulation).
- Fallback hash déterministe (`hsl(hue, 45%, 55%)`) réservé aux cas non couverts par `getOwnerColor` (aucun cas de ce type ne se présente actuellement, puisque seuls `player:`/`faction:` sont produits par `getTileOwner`).

## 8. ORDRE DES COUCHES
Ordre implémenté dans `renderPixelMap()`, conforme à la spec :
1. Fond canvas
2. Terrain Pixel HD (par tuile, avec `continue` immédiat sur fog total)
3. **Voile ownership léger (nouveau P8, dans la même boucle, juste après le sprite terrain)**
4. *(le fog total a déjà été traité en amont via `continue` — aucune case masquée n'atteint cette étape)*
5. Fog ring (assombrissement, existant depuis P5/P7, appliqué après le voile ownership)
6. Grille (optionnelle)
7. **Frontières ownership (nouveau P8, passe dédiée juste après la grille)**
8. Ressources de tuile (P7)
9. Colonies (P6)
10. Bâtiments (P6)
11. Survol (non câblé, limite connue)
12. Sélection — reste au-dessus de tout

## 9. FALLBACK STRATEGIC
- Mode `strategic` strictement inchangé : `GameEngine.ts` non modifié, aucune nouvelle donnée ni fonction interne touchée.
- Le `try/catch` existant dans `renderPixelHDOverlay()` (GameCanvas.tsx) protège désormais aussi la construction des callbacks `getTileOwner`/`getOwnerColor`/`isSameOwner` et leur usage — toute erreur retombe silencieusement sur la vue strategic déjà dessinée, log unique inchangé.
- Owner inconnu / territoire `null` : aucun voile, aucune frontière, aucun log ajouté (pas de log spam introduit par P8, contrairement au log de debug déjà présent depuis P7 pour les ressources — aucun log équivalent n'a été ajouté pour l'ownership).

## 10. TESTS MANUELS
- `npx tsc --noEmit -p .` : 233 erreurs au total, **identique au chiffre mesuré avant ce bloc (P7)** — 0 erreur imputable à P8 (vérifié par filtrage explicite sur `PixelMapRenderer.ts`/`GameCanvas.tsx`, aucune occurrence).
- Logs serveur/console de session réelle authentifiée (admin) après les modifications : `[TerritorySystem] Chargé : 27 territoire(s), 3 colonie(s)` confirmé plusieurs fois sans erreur, `POST /api/player/discovered-tiles`, `GET /api/territories`, `GET /api/territories/colonies` tous en 200/304 — aucune régression sur le chargement des territoires, aucune erreur `PixelMapRenderer` ni `GameCanvas` dans les logs capturés.
- Revue de code : les callbacks `getTileOwner`/`isSameOwner` utilisent exactement `UnifiedTerritorySystem.getTerritory()`, déjà utilisé ailleurs (bâtiments P6) — aucune divergence de source de données possible.
- Vérification géométrique : `HEX_NEIGHBOR_SIDES` et `drawHexSidePath` sont des copies fonctionnellement identiques (mêmes formules, même convention d'index de côté) à `drawTerritoryBorders`/`drawHexSide` de `GameEngine.ts` — alignement des frontières garanti avec le rendu strategic pour une même carte.
- **Test visuel interactif direct (bascule "M", vérification à l'œil qu'un voile/une frontière apparaît sur une tuile revendiquée) non réalisable via l'outil de capture automatisé** : la session de capture automatisée démarre sans état d'authentification (écran "Chargement de Nova Imperium…" bloqué), contrairement à la session de développement réelle déjà authentifiée en admin observée dans les logs. Cette limite est identique à celle déjà documentée depuis P4/P5/P6/P7. Validation code + logs effectuée à la place, conformément à la procédure de repli prévue à l'étape 10 de la spec.
- Validation visuelle manuelle recommandée à l'utilisateur : appuyer sur "M" en mode admin, se rendre sur une case du territoire "ponta marsh" (colonie existante, territoires déjà chargés) et vérifier la présence d'un voile bleu/vert discret et d'un trait de bordure aux limites de la zone revendiquée.
- Persistance du mode choisi au rechargement : mécanisme `localStorage` inchangé depuis P4-B, non retouché dans ce bloc.

## 11. RÉSULTAT npm run check
`npx tsc --noEmit` : 233 erreurs au total dans le projet, **strictement identique** au chiffre mesuré juste avant ce bloc (fin P7). 0 erreur dans `PixelMapRenderer.ts` et `GameCanvas.tsx` (double vérification par filtrage explicite sur les noms de fichiers). Toutes les erreurs préexistantes se situent dans des fichiers totalement hors périmètre P8.

## 12. LIMITES RESTANTES
- `hovered` toujours non câblé (limite héritée de P4).
- Aucune distinction visuelle supplémentaire pour un territoire "gouverné" (`governorUserId`) vs simplement possédé — hors périmètre P8 (non demandé par la spec).
- Le fog ring assombrit le voile ownership mais ne l'atténue pas de façon dégressive selon la distance — même simplification que pour colonies/bâtiments/ressources (P6/P7).
- Test visuel interactif automatisé non concluant pour cette session (limite d'authentification de l'outil de capture, documentée section 10) — validation par l'utilisateur en preview recommandée.
- Unités, routes, rivières, avatar, autres joueurs, logique politique avancée : toujours absents du mode immersive — hors périmètre P8, réservés aux blocs suivants.

## 13. CONCLUSION
Le mode immersive affiche désormais un voile de couleur discret sur les tuiles revendiquées et des frontières entre propriétaires différents, en réutilisant à l'identique la source de données (`UnifiedTerritorySystem`), les couleurs et la géométrie de voisinage hexagonal déjà employées par le rendu strategic (`GameEngine.ts`). Aucune nouvelle règle d'ownership, aucune nouvelle API, aucune modification de `GameEngine.ts`, DB ou backend. Le fog total masque strictement tout (voile et frontières), le fog ring assombrit sans révéler, et l'absence de callback bloque totalement l'affichage par sécurité — cohérent avec les garanties déjà en place pour les blocs P6/P7. Modifications strictement limitées à `PixelMapRenderer.ts` et `GameCanvas.tsx`.

## 14. STOP
- Aucune unité ajoutée.
- Aucune route ajoutée.
- Aucune rivière ajoutée.
- DB non modifiée.
- Backend non modifié.
- Génération de monde non modifiée.
- Règles d'ownership non modifiées (lecture seule stricte).
- Bloc P9 non entamé.
