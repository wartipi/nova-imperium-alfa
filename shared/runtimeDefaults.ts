/**
 * runtimeDefaults.ts — Constantes canoniques de runtime partagées
 * Source unique de vérité pour le spawn joueur et les défauts d'état.
 * Importé par le serveur (playerPositionService) et les scripts utilitaires (resetCurrentMatch).
 */

export const CANONICAL_SPAWN = {
  worldX:   25,
  worldY:   15,
  segmentX: 0,
  segmentY: 0,
} as const;

export const PLAYER_STATE_DEFAULTS = {
  level:            1,
  experience:       0,
  totalExperience:  0,
  actionPoints:     25,
  maxActionPoints:  100,
  competencePoints: 3,
  competences:      [] as never[],
} as const;
