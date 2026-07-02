# RAPPORT FINAL — BLOC P4-B — Modes de carte stratégique / immersive

Branche : NI-10.09

## 1. DIAGNOSTIC P4-B
Le toggle expérimental P4 (`pixelHDEnabled` + touche "P") était fonctionnel mais nommé de façon trop technique. Objectif : le transformer en concept produit clair — un seul système de carte avec deux **modes de rendu** (`strategic` / `immersive`), sans jamais dupliquer la carte logique ni ses données (`mapData` reste unique, partagé par les deux modes).

## 2. FICHIERS MODIFIÉS
Uniquement `client/src/components/game/GameCanvas.tsx` (comme autorisé). Aucun autre fichier touché — `GameEngine.ts`, `PixelHDAssets.ts`, `PixelMapRenderer.ts`, `MedievalHUD.tsx`, DB, génération de monde : intacts.

## 3. MAP RENDER MODE
- Type `MapRenderMode = "strategic" | "immersive"`.
- Défaut : `"strategic"` (comportement actuel inchangé).
- `"immersive"` déclenche l'overlay Pixel HD après le rendu du renderer actuel — même `mapData`, mêmes coordonnées, même état de jeu, aucune deuxième carte logique créée.

## 4. LOCALSTORAGE / MIGRATION
- Nouvelle clé : `nova_map_render_mode` (valeurs `"strategic"` / `"immersive"`).
- Migration douce : si cette clé est absente et que l'ancienne clé `nova_pixel_hd_renderer === "on"` existe, le mode démarre en `"immersive"` et la nouvelle clé est écrite immédiatement. Ensuite, seule la nouvelle clé est utilisée. Les anciens utilisateurs du toggle P4 ne perdent pas leur préférence.

## 5. RACCOURCI / UI
- Raccourci officiel : **M** (alterne strategic ↔ immersive), ignoré si le focus est dans `input`, `textarea`, `select` ou un élément `contentEditable`.
- Ancien raccourci **P** conservé comme alias debug (même comportement).
- Logs console : `[MapRenderMode] Map render mode: strategic` / `immersive`.
- Bouton discret ajouté en bas à droite de l'écran, affichant "Vue stratégique" ou "Vue immersive", cliquable pour basculer. N'affecte pas `MedievalHUD`, pas de nouveau panneau.

## 6. COMPORTEMENT STRATEGIC
Strictement identique à l'existant avant P4/P4-B : aucun changement de logique, aucun overlay dessiné, renderer actuel seul actif.

## 7. COMPORTEMENT IMMERSIVE
`renderPixelHDOverlay()` s'exécute après chaque `engine.render()` (mêmes 5 points d'accroche que P4). Calcule la géométrie caméra/zoom/hexSize et appelle `renderPixelMap` avec les mêmes `mapData`, `selectedHex`, `isHexVisible`, `isHexInFogRing` que la vue stratégique — une seule source de vérité.

## 8. FALLBACK / SÉCURITÉ
`try/catch` strict autour de l'appel Pixel HD. En cas d'erreur : log unique `[MapRenderMode] Immersive renderer failed, falling back to strategic view`, pas de re-throw — le rendu strategic déjà dessiné en dessous reste affiché à l'écran. Aucun écran noir possible.

## 9. LIMITES ACTUELLES
- `hovered` toujours non câblé (limite héritée de P4, non résolue ici car nécessiterait de toucher `GameEngine.ts`).
- Unités, colonies, ownership, ressources économiques non rendus en mode immersive — seuls les terrains Pixel HD sont visibles. Le mode stratégique reste recommandé pour jouer précisément ; le mode immersive est expérimental mais accessible.

## 10. TESTS
- Chargement par défaut en `strategic` ✔ (clé absente → défaut).
- Migration douce de l'ancienne clé P4 codée et revue par lecture de code.
- Bouton et raccourci M/P déclenchent `toggleMapRenderMode` et persistent via `writeMapRenderMode` ✔ (revue de code).
- Live preview (session réelle en cours) : rechargement à chaud (HMR) sans erreur, jeu continue de fonctionner normalement (vision, ressources, territoires) — confirmé par logs serveur/console sans aucune erreur.
- Test interactif direct de la bascule clavier/bouton non réalisable via l'outil de capture automatisé (limite déjà documentée en P4, bloqué sur écran de chargement initial) — à valider directement dans l'onglet de prévisualisation.

## 11. RÉSULTAT npm run check
Aucune nouvelle erreur imputable à ce bloc. Toutes les erreurs listées sont préexistantes et situées hors du fichier modifié (tests Jest, `TurnEffectsSystem.tsx`, fichiers `server/*`, itérations Set/Map `--downlevelIteration`).

## 12. CONCLUSION
Le toggle technique P4 est devenu un système de mode de carte clair et orienté produit : "Vue stratégique" (défaut, comportement inchangé) et "Vue immersive" (Pixel HD, expérimental), accessible via bouton discret ou raccourci M, avec migration douce de l'ancien réglage et fallback sécurisé garantissant l'absence d'écran noir. Une seule carte logique, aucun doublon de données, périmètre strictement limité à `GameCanvas.tsx`.

## 13. STOP
Aucune deuxième carte logique créée. DB, génération de monde et renderer actuel non modifiés. Bloc P5 non entamé.
