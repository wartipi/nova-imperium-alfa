# RAPPORT FINAL — BLOC P7 — Ressources de tuile en mode immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P7
Objectif : afficher en mode immersive Pixel HD les ressources de tuile déjà visibles/découvertes, en respectant exactement les mêmes règles de révélation que le mode stratégique — sans jamais révéler une ressource cachée. Résultat de l'audit : la donnée (`tile.resource`) et la règle de découverte existent déjà et sont accessibles ; le renderer immersive ne recalcule rien, il délègue entièrement la décision d'affichage à un callback fourni par `GameCanvas.tsx`.

## 2. FICHIERS MODIFIÉS
- `client/src/lib/game/PixelMapRenderer.ts` — ajout des options `showResources`/`shouldShowTileResource`, de la fonction interne `getResourceVisualColor()` (couleur réutilisée depuis les données existantes), de la fonction interne `drawResourceMarker()`, et de la couche de rendu correspondante dans `renderPixelMap()`.
- `client/src/components/game/GameCanvas.tsx` — dans `renderPixelHDOverlay()`, construction du callback `shouldShowTileResource` reproduisant fidèlement la règle de `GameEngine.ts`, transmission à `renderPixelMap`, ajout de `isAdmin` aux dépendances du `useCallback`.
- `GameEngine.ts` : lu uniquement (confirmation de la règle exacte de révélation), **non modifié**.
- `ResourceRevealSystem.ts`, `ResourceIcons.ts` (`client/src/lib/shared/ResourceIcons.ts`) : lus et **importés en lecture seule** dans `PixelMapRenderer.ts` pour réutiliser leurs couleurs déjà centralisées — aucun des deux fichiers n'a été modifié.
- Aucun autre fichier touché. DB, backend, schema, `MapGenerator.ts`, `mapAdapter.ts`, `TerrainCosts.ts`, `ResourceRevealSystem.ts`, `UnifiedTerritorySystem.ts`, économie, pathfinding, exploration, ownership, unités, colonies (logique), règles de récolte, règles de découverte : tous intacts.

## 3. DONNÉES RESSOURCES DISPONIBLES
- Champ confirmé : `HexTile.resource` (`ResourceType | null`) — déjà présent dans `types.ts`, déjà lu dans `mapData[y][x]`, déjà exposé via `PixelMapTile.resource` (interface existante depuis P3, aucune extension nécessaire).
- Audit de `MapGenerator.ts` (`getSuitableResources`) : confirme que la génération actuelle produit exclusivement des types **V2** (`food`, `wood`, `stone`, `common_metals`, `coal`, `oil`, `herbs`, `leather_fur`, `rare_metals_alloys`, `spices`, `precious_stones`, `sacred_stones`, `crystals`, `ancient_artifacts`, `arcane_stones`, `enchanted_wood`).
- Cependant, des tuiles **persistées en base avant la migration V2** contiennent encore des valeurs **legacy V1** (`fish`, `iron`, `fur`, `gold`, `wheat`, `cattle`, etc.) — confirmé en observant les logs live réels de session (`🔍 Tentative rendu ressource: fish sur (...)`, `iron sur (...)`). Ces valeurs restent lues et affichées par le mode stratégique existant (`GameEngine.ts`, `resourceMap` local) ; le mode immersive doit donc pouvoir les afficher aussi, sans les inventer ni les convertir.

## 4. RÈGLES DE DÉCOUVERTE / VISIBILITÉ
- Règle exacte extraite de `GameEngine.ts` (`drawHex`) :
  `isVisible = isAdminMode || (explorationLevel >= 1 && hexResourceDiscovered)`
  où `explorationLevel = usePlayer.getState().getCompetenceLevel('exploration')` et `hexResourceDiscovered = usePlayer.getState().isResourceDiscovered(x, y)`.
- Cette règle est reproduite **à l'identique** dans `GameCanvas.tsx` via le callback `shouldShowTileResource(x, y, resource)`, en lisant `usePlayer.getState()` en direct (aucune donnée mise en cache/dupliquée) et `isAdmin` déjà disponible dans le composant (`useAuth()`).
- `PixelMapRenderer.ts` ne connaît pas cette règle : il se contente d'appeler le callback transmis. **Si aucun callback n'est fourni, aucune ressource n'est jamais dessinée** (garde de sécurité anti-fuite, cf. étape 2 de la spec) — testé explicitement dans le code (`if (showResources !== false && shouldShowTileResource) { ... }`).
- Garde supplémentaire : le fog total (`isHexVisible(x, y) === false`) bloque systématiquement l'affichage d'une ressource, même si `shouldShowTileResource` répondait `true` — les deux conditions sont cumulatives (ET logique), pas substituables.

## 5. RENDU DES RESSOURCES
`drawResourceMarker()` (interne, non exportée) : petit marqueur positionné au coin haut-droit de l'hexagone (jamais au centre, pour ne pas recouvrir un marqueur colonie/bâtiment). Formes canvas simples, sans emoji ni image externe, sans texte :
- `food` : petit point jaune (épi stylisé)
- `wood` : petit tronc brun rectangulaire
- `stone` : petit galet gris (ellipse)
- `common_metals` : petit lingot gris (rectangle)
- `coal` : petit bloc noir
- `oil` : petite goutte sombre
- `herbs` : petite feuille verte (ellipse inclinée)
- `leather_fur` : petite peau brune (ellipse)
- Toute autre valeur (rares/magiques V2 non encore listées explicitement, et legacy V1 type `fish`/`iron`/`fur`/`gold`) : marqueur générique (petit losange) coloré via `getResourceVisualColor()`.

## 6. COMPATIBILITÉ V2 / LEGACY
- `getResourceVisualColor(resource)` : cherche d'abord dans `ResourceRevealSystem.getResourceDisplayInfo()` (source V2 officielle) ; si absent (valeur legacy comme `fish`/`iron`/`fur`/`gold`/`wheat`/`cattle`), retombe sur `RESOURCE_ICONS` (`client/src/lib/shared/ResourceIcons.ts`, section "V1 legacy — conservées"). Si vraiment introuvable, gris neutre `#9a9a9a`.
- **Aucune conversion visuelle iron→common_metals ni fur→leather_fur n'a été appliquée** : audit confirmé que le système actuel (`GameEngine.ts`) ne fait pas cette conversion (il garde des entrées séparées `iron`/`fur` dans son propre `resourceMap`), donc conformément à la règle de la spec ("seulement si le système actuel le fait déjà"), ce bloc ne l'invente pas non plus. `iron`/`fur`/`gold`/`fish`/etc. reçoivent le marqueur générique avec la couleur legacy déjà définie dans `ResourceIcons.ts`.
- Aucune ressource V1 (`gold`/`iron`/`copper`/`fur`) n'a été réintroduite comme ressource économique active — uniquement affichée visuellement si déjà présente comme donnée historique sur une tuile, exactement comme le fait le mode stratégique.

## 7. ORDRE DES COUCHES
Ordre implémenté dans `renderPixelMap()`, conforme à la spec :
1. Fond canvas
2. Terrain Pixel HD (fog total géré par tuile)
3. Fog ring (voile semi-transparent, géré par tuile)
4. Grille (optionnelle, inchangée)
5. **Ressources de tuile (nouveau P7)**
6. Colonies (P6, inchangé)
7. Bâtiments (P6, inchangé)
8. Survol (`hovered`, toujours non câblé)
9. Sélection — reste au-dessus de tout

Les ressources sont dessinées **avant** colonies/bâtiments : en cas de chevauchement visuel (rare, car le marqueur ressource est positionné en coin, pas au centre), colonies et bâtiments restent visuellement prioritaires, conformément à la règle demandée.

## 8. FALLBACK STRATEGIC
- Mode `strategic` strictement inchangé : `GameEngine.ts` non modifié, aucun nouveau chemin de rendu emprunté par ce mode.
- Le `try/catch` existant dans `renderPixelHDOverlay()` (GameCanvas.tsx) protège désormais aussi la construction du callback `shouldShowTileResource` et son usage dans `renderPixelMap` — toute erreur retombe silencieusement sur la vue strategic déjà dessinée, avec le même log unique déjà en place.
- Ressource de type inconnu (ni V2 ni legacy) : fallback discret (losange gris `#9a9a9a`), aucun crash, aucun texte d'erreur affiché à l'écran.

## 9. TESTS MANUELS
- Chargement par défaut en `strategic` : confirmé inchangé (logs `✅ Ressource rendue` proviennent du moteur strategic existant, non modifié).
- Revue de code : la couche ressources immersive utilise `hexToScreen()` (même géométrie validée en P5) → alignement garanti avec le terrain et les autres couches.
- Vérification en session live réelle (mode admin) : ressources réellement présentes en base observées dans les logs (`fish`, `oil`, `ancient_artifacts`, etc.), certaines rendues (`✅ Ressource rendue`) et d'autres non (case non explorée) — confirme que le système de découverte réel produit bien un mélange visible/non-visible exploitable par le nouveau callback.
- Double garde vérifiée par lecture de code : une ressource sur une case en fog total (`isHexVisible` false) est ignorée avant même l'appel à `shouldShowTileResource` — aucun scénario ne peut afficher une ressource sur une case totalement inconnue.
- Sans callback transmis (scénario défensif) : le bloc entier est sauté (`if (... && shouldShowTileResource)`), donc aucune ressource ne peut fuiter par erreur d'intégration future.
- `npx tsc --noEmit` : 0 erreur dans les deux fichiers modifiés (vérifié par filtrage explicite sur le nom des fichiers, confirmé deux fois).
- Logs serveur/console de session réelle : aucune erreur, aucune régression sur la vision, les territoires ou les colonies après les modifications.
- Test interactif direct (bascule "M", vérification visuelle qu'une ressource découverte apparaît et qu'une non-découverte n'apparaît pas) **non réalisable via l'outil de capture automatisé** — limite déjà documentée depuis P4/P5/P6. Validation visuelle manuelle recommandée : appuyer sur "M" en mode admin puis observer que les petits marqueurs ressources apparaissent uniquement sur les cases explorées.
- Persistance du mode choisi au rechargement : mécanisme `localStorage` inchangé depuis P4-B, non retouché dans ce bloc.

## 10. RÉSULTAT npm run check
`npx tsc --noEmit` : 233 erreurs au total dans le projet, **identique au chiffre mesuré avant ce bloc (P6)** — donc 0 erreur imputable à P7 (confirmé par filtrage explicite sur `PixelMapRenderer.ts`/`GameCanvas.tsx`, aucune occurrence dans les deux vérifications). Toutes les erreurs préexistantes se situent dans des fichiers totalement hors périmètre.

## 11. LIMITES RESTANTES
- `hovered` toujours non câblé (limite héritée de P4).
- Les ressources rares/magiques V2 (`textiles`, `mana_crystals`, `elemental_essence`, `spirit_stones`, `void_shards`, etc.) et les valeurs legacy V1 partagent un même marqueur générique (losange coloré) — pas d'icône dédiée par type, choix délibéré pour ne pas multiplier les formes sans base graphique officielle.
- Aucune distinction visuelle de rareté (bordure spéciale pour magique/rare) au-delà de la couleur déjà définie dans les systèmes existants.
- Le fog ring n'atténue pas spécifiquement les marqueurs ressources (même simplification que P6 pour colonies/bâtiments).
- Unités, ownership complet/frontières politiques, routes, rivières, avatar, autres joueurs : toujours absents du mode immersive — hors périmètre P7, réservé aux blocs suivants.

## 12. CONCLUSION
Le mode immersive affiche désormais les ressources de tuile réellement découvertes, en respectant strictement — via délégation complète au callback existant — la même règle de révélation que le mode stratégique (admin ou exploration niveau 1+ et ressource découverte). Aucune nouvelle API, aucune nouvelle logique de découverte, aucune donnée inventée : les couleurs et types sont réutilisés depuis `ResourceRevealSystem` (V2) et `ResourceIcons.ts` (legacy V1), lus mais non modifiés. Le fallback vers le mode strategic reste garanti en cas d'erreur, et l'absence de callback bloque totalement l'affichage par sécurité. Modifications strictement limitées à `PixelMapRenderer.ts` et `GameCanvas.tsx`.

## 13. STOP
- Aucune unité ajoutée.
- Aucun système d'ownership complet ou de frontières politiques ajouté.
- Aucune route ajoutée.
- Aucune rivière ajoutée.
- DB, backend, génération de monde : non modifiés.
- Bloc P8 non entamé.
