---
name: GameEngine.civilizations is an alias, not a second data source
description: Why iterating both novaImperiums and GameEngine's civilizations list would double-render units/entities
---

`GameEngine.civilizations` (used by `renderCivilizations()`) is populated via `updateCivilizations(novaImperiums)`, called from `GameCanvas.tsx`. It is literally the same `novaImperiums` array from the `useNovaImperium` store, not an independent collection.

**Why:** Discovered while wiring a new immersive-mode rendering layer that needed unit data — initially assumed `civilizations` was a separate source (e.g. NPC factions) and iterated both, which would have silently doubled every unit/entity drawn.

**How to apply:** When adding any new rendering/consumption logic for units, cities, or other per-faction entities, read only from `useNovaImperium.getState().novaImperiums` (or the store directly). Never also iterate anything called `civilizations` sourced from `GameEngine` — verify with a grep for `updateCivilizations(` before assuming otherwise, since this could change in future refactors.
