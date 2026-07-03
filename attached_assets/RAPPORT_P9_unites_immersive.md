# RAPPORT FINAL — BLOC P9 — Unités en mode immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P9
Objectif : afficher en mode immersive Pixel HD les unités déjà chargées côté client (marqueur visuel simple selon le type), sans jamais modifier la logique unités/mouvement/combat/sélection. Résultat de l'audit : les unités existent déjà intégralement dans `useNovaImperium` (`novaImperiums[].units`), consommées telles quelles par le rendu strategic (`GameEngine.renderCivilizations()` → `drawUnit()`). Aucune nouvelle donnée, aucun nouveau store, aucune nouvelle route n'était nécessaire — uniquement une lecture de l'existant et un nouveau rendu visuel en mode immersive.
Point d'audit notable : `GameEngine.civilizations` (utilisé par `renderCivilizations()`) est alimenté par `updateCivilizations(novaImperiums)` (GameCanvas.tsx) — c'est **le même tableau** `novaImperiums`, pas une seconde source de données. P9 n'itère donc que sur `novaImperiums[].units`, pour éviter tout doublon visuel.

## 2. FICHIERS MODIFIÉS
- `client/src/lib/game/PixelMapRenderer.ts` :
  - Ajout du commentaire d'en-tête de bloc P9.
  - Ajout de l'interface exportée `PixelMapUnit` (`id`, `type`, `name`, `x`, `y`, `ownerId`/`playerId`/`factionId` optionnels, `color` optionnel, `health`/`maxHealth`/`movement`/`maxMovement`/`selected` optionnels).
  - Ajout des options `units?`, `showUnits?`, `selectedUnitId?`, `shouldShowUnit?` dans `PixelMapRenderOptions`.
  - Ajout de la fonction `drawUnitMarker()` : losange pour worker/settler/civilian/diplomat, bouclier pour les types militaires (warrior/spearman/.../soldier/military), triangle pour scout/spy, pion rond en fallback ; contour sombre `rgba(0,0,0,0.7)`, remplissage = couleur transmise par l'appelant, anneau doré `#e8b23a` si l'unité est sélectionnée.
  - Ajout de la boucle de rendu des unités dans `renderPixelMap()`, insérée après la boucle bâtiments et avant le survol/la sélection.
- `client/src/components/game/GameCanvas.tsx` :
  - Construction du tableau `units: PixelMapUnit[]` depuis `useNovaImperium.getState().novaImperiums` (mapping direct de chaque `unit`, `color: ni.color`).
  - Ajout du callback `shouldShowUnit` (bypass admin identique au pattern déjà utilisé pour les ressources en P7).
  - Transmission de `units`, `showUnits: true`, `selectedUnitId: selectedUnit?.id ?? null`, `shouldShowUnit` à `renderPixelMap`.
- `GameEngine.ts` : lu uniquement (structure `civilizations`, `renderCivilizations()`, `drawUnit()`) — **non modifié**. Aucun getter ajouté : toutes les données nécessaires étaient déjà accessibles directement via `useNovaImperium.getState()`.
- `useNovaImperium.tsx`, `types.ts` : lus uniquement — **non modifiés**.
- Aucun autre fichier touché. DB, backend, schema, logique de mouvement/combat/sélection d'unité : tous intacts.

## 3. DONNÉES UNITÉS DISPONIBLES
- Source unique : `useNovaImperium.getState().novaImperiums[].units` — même source que le rendu strategic.
- Interface `Unit` (`types.ts`) : `{ id, name, type (UnitType), x, y, strength, attack, defense, health, maxHealth, movement, maxMovement, experience, abilities }`.
- Aucun champ `ownerId`/`playerId`/`selected` natif sur l'unité — l'appartenance est déduite du `novaImperium` parent (`ni.id`, `ni.color`), exactement comme en strategic.
- Sélection d'unité : `useNovaImperium.getState().selectedUnit` (déjà déstructuré dans `GameCanvas.tsx` sous le nom `selectedUnit`) — comparé par `id` uniquement, jamais dupliqué dans un nouvel état.
- Aucune unité n'est filtrée côté données : toutes les unités présentes dans `novaImperiums` sont transmises à `renderPixelMap`, le filtrage visuel se fait uniquement via les gardes de visibilité (section 6).

## 4. RENDU DES UNITÉS
- `drawUnitMarker(ctx, sx, sy, hexSize, type, color, isSelected)` :
  - Losange (civil) : worker, settler, civilian, diplomat.
  - Bouclier (militaire) : warrior, spearman, archer, knight, soldier, et toute variante contenant "military"/"soldier" dans son nom de type.
  - Triangle (reconnaissance) : scout, spy.
  - Pion rond : fallback pour tout type non couvert par les trois catégories ci-dessus (aucun crash possible sur un type inconnu).
  - Contour sombre systématique (`rgba(0,0,0,0.7)`, 1.5px) pour la lisibilité sur tout type de terrain.
  - Remplissage = `color` transmise (reprend `ni.color`, identique à la couleur strategic pour la même unité).
  - Anneau doré (`#e8b23a`, 2px) autour du marqueur si l'unité est celle actuellement sélectionnée (`selectedUnitId` ou `unit.selected`).
- Taille du marqueur proportionnelle à `hexSize` (cohérente avec les autres marqueurs P6/P7/P8, pas de taille fixe en pixels qui casserait au zoom).

## 5. POSITIONNEMENT / STACKING
- Positionnement via `hexToScreen(unit.x, unit.y, hexSize, cameraX, cameraY)` — fonction déjà existante, identique à tous les autres marqueurs.
- Regroupement des unités par tuile (`Map<"x,y", PixelMapUnit[]>`) pour gérer le cas de plusieurs unités sur la même case : offset visuel déterministe en cercle autour du centre de la tuile (angle = `i * 2π / total`, rayon = `hexSize * 0.22`, la première unité reste au centre exact).
- Aucun `Math.random()` utilisé — offset entièrement déterministe à partir de l'index dans le tableau groupé.
- Purement visuel : aucune modification de la logique de stacking/déplacement réelle du jeu (aucun champ d'unité modifié, aucun store touché).

## 6. VISIBILITÉ / FOG
- Même garde que colonies/bâtiments (P6) : `if (isHexVisible && !isHexVisible(unit.x, unit.y)) continue;` appliquée sur la tuile avant de dessiner les unités qui s'y trouvent — une unité sur une case en fog total n'est jamais dessinée.
- `shouldShowUnit(unit)` (callback optionnel côté appelant) s'ajoute à cette garde (jamais à sa place) : dans `GameCanvas.tsx`, il vaut `isAdmin || !isHexVisible || isHexVisible(unit.x, unit.y)` — reprend exactement le pattern déjà utilisé pour `shouldShowTileResource` en P7.
- Aucune nouvelle règle de vision introduite : `isHexVisible`/`isHexInFogRing` restent des callbacks strictement consommés, jamais recalculés dans `PixelMapRenderer.ts`.
- Sans tableau `units` fourni par l'appelant (ou `showUnits === false`), aucune unité n'est jamais dessinée — comportement par défaut sûr, identique aux gardes `showOwnership`/`showBorders` de P8.

## 7. SÉLECTION UNITÉS
- `selectedUnitId` (transmis depuis `selectedUnit?.id ?? null` dans `GameCanvas.tsx`) est comparé par égalité stricte d'`id` à chaque unité rendue.
- Aucune modification de la logique de sélection existante (`useNovaImperium.selectedUnit`, clics, `GameEngine`) — P9 ne fait que **lire** l'état déjà sélectionné pour appliquer un anneau doré, jamais l'inverse.
- Le marqueur `unit.selected` (champ optionnel de `PixelMapUnit`) est également supporté pour un usage futur, mais non utilisé actuellement (GameCanvas transmet uniquement `selectedUnitId`).

## 8. ORDRE DES COUCHES
Ordre implémenté dans `renderPixelMap()`, conforme à la spec :
1. Fond canvas
2. Terrain Pixel HD
3. Voile ownership (P8)
4. Fog ring (assombrissement)
5. Grille (optionnelle)
6. Frontières ownership (P8)
7. Ressources de tuile (P7)
8. Colonies (P6)
9. Bâtiments (P6)
10. **Unités (nouveau P9)** — après bâtiments, donc visibles par-dessus une colonie/bâtiment sur la même case
11. Survol (non câblé, limite connue)
12. Sélection de tuile — reste au-dessus de tout, y compris des unités

## 9. FALLBACK STRATEGIC
- Mode `strategic` strictement inchangé : `GameEngine.ts` non modifié, `renderCivilizations()`/`drawUnit()` intacts, aucun comportement altéré.
- Le `try/catch` existant dans `renderPixelHDOverlay()` (GameCanvas.tsx) protège désormais aussi la construction du tableau `units` et du callback `shouldShowUnit` — toute erreur retombe silencieusement sur la vue strategic déjà dessinée, log unique inchangé (`pixelHDFailLoggedRef`).
- Absence d'unités (`novaImperiums` vide ou sans unités) : aucune erreur, la boucle est simplement sautée (`units.length > 0`).

## 10. TESTS MANUELS
- `npx tsc --noEmit -p .` : 233 erreurs au total, **identique au chiffre mesuré avant ce bloc (fin P8)** — 0 erreur imputable à P9 (vérifié par filtrage explicite sur `PixelMapRenderer.ts`/`GameCanvas.tsx`, aucune occurrence après correction des deux erreurs de compilation rencontrées en cours de route : accès erroné à un champ `civilizations` inexistant sur le store, et itération d'une `Map` incompatible avec la cible TS — corrigées avant la mesure finale).
- Logs serveur/console de session réelle (admin) après les modifications : `hmr update GameCanvas.tsx` appliqué sans erreur, `[TerritorySystem] Chargé...`, `GET /api/territories`, `GET /api/cities/me`, `GET /api/player/discovered-tiles` tous en 200/304 — aucune régression, aucune erreur `PixelMapRenderer` ni `GameCanvas` dans les logs capturés après le hot-reload.
- Revue de code : le tableau `units` provient exclusivement de `useNovaImperium.getState().novaImperiums`, source unique déjà utilisée par le rendu strategic — aucune divergence de données possible entre les deux modes.
- **Test visuel interactif direct (bascule "M", vérification à l'œil qu'un marqueur d'unité apparaît sur la carte) non réalisable via l'outil de capture automatisé** : la session de capture démarre sans état d'authentification (écran "Chargement de Nova Imperium…" bloqué), contrairement à la session de développement réelle déjà authentifiée en admin observée dans les logs. Limite identique à celle déjà documentée depuis P4/P5/P6/P7/P8. Validation code + logs effectuée à la place.
- Validation visuelle manuelle recommandée à l'utilisateur : appuyer sur "M" en mode admin, vérifier qu'un marqueur (losange/bouclier/triangle/rond selon le type) apparaît sur chaque case occupée par une unité, avec un anneau doré sur l'unité actuellement sélectionnée.

## 11. RÉSULTAT npm run check
`npx tsc --noEmit -p .` : 233 erreurs au total dans le projet, **strictement identique** au chiffre mesuré juste avant ce bloc (fin P8). 0 erreur dans `PixelMapRenderer.ts` et `GameCanvas.tsx` (double vérification par filtrage explicite sur les noms de fichiers). Toutes les erreurs préexistantes se situent dans des fichiers totalement hors périmètre P9.

## 12. LIMITES RESTANTES
- `hovered` toujours non câblé (limite héritée de P4).
- Aucune animation de déplacement des unités en mode immersive — hors périmètre P9 (interdit explicitement par la spec).
- Aucune barre de vie/indicateur de santé affiché sur le marqueur — les champs `health`/`maxHealth` sont transmis dans `PixelMapUnit` mais non exploités visuellement (non demandé par la spec P9, réservé à un bloc futur si souhaité).
- Le stacking visuel (offset en cercle) est une approximation simple ; au-delà d'un petit nombre d'unités sur une même case, les marqueurs peuvent se chevaucher légèrement — même niveau de simplification que les autres couches (P6/P7/P8).
- Test visuel interactif automatisé non concluant pour cette session (limite d'authentification de l'outil de capture, documentée section 10) — validation par l'utilisateur en preview recommandée.
- Routes, rivières, avatar, autres joueurs, nouvelle logique de combat/sélection : toujours absents du mode immersive — hors périmètre P9, réservés aux blocs suivants.

## 13. CONCLUSION
Le mode immersive affiche désormais un marqueur visuel simple pour chaque unité déjà chargée côté client (`novaImperiums[].units`), avec une forme distincte selon la catégorie de type (civil/militaire/reconnaissance/fallback), la couleur du propriétaire (`ni.color`, identique au rendu strategic) et un anneau doré pour l'unité sélectionnée. Les unités respectent strictement les mêmes gardes de fog/visibilité que colonies/bâtiments (P6) et s'intercalent dans l'ordre des couches juste après les bâtiments, sous la sélection de tuile. Aucune nouvelle donnée, aucune nouvelle route, aucune modification de `GameEngine.ts`, de la logique de mouvement, de combat ou de sélection d'unité. Modifications strictement limitées à `PixelMapRenderer.ts` et `GameCanvas.tsx`.

## 14. STOP
- Aucune route ajoutée.
- Aucune rivière ajoutée.
- Avatar non modifié.
- Autres joueurs non affichés.
- Aucune animation de déplacement ajoutée.
- Aucune nouvelle logique de combat ou de sélection.
- DB non modifiée.
- Backend non modifié.
- Génération de monde non modifiée.
- Bloc P10 non entamé.
