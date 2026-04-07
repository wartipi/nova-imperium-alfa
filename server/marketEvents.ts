// ─── marketEvents.ts ──────────────────────────────────────────────────────────
// Module SSE ciblé marché — diffusion d'invalidation uniquement.
// Responsabilité minimale :
//   • maintenir la liste en mémoire des clients SSE connectés
//   • diffuser un petit événement d'invalidation (pas les ordres complets)
//   • pas de stockage persistant, pas de replay, pas de logique métier
// ─────────────────────────────────────────────────────────────────────────────

import type { Response } from "express";

// Ensemble en mémoire des réponses SSE actives (non partagé entre process).
const _subscribers = new Set<Response>();

/** Enregistre une réponse SSE dans le pool marché. */
export function addMarketSubscriber(res: Response): void {
  _subscribers.add(res);
}

/** Retire une réponse SSE du pool (déconnexion / cleanup). */
export function removeMarketSubscriber(res: Response): void {
  _subscribers.delete(res);
}

/**
 * Diffuse un événement d'invalidation à tous les abonnés actifs.
 * Seul le signal est envoyé — jamais les ordres complets.
 * Les clients rechargent le carnet via les routes REST existantes.
 */
export function broadcastMarketInvalidation(reason = "update"): void {
  if (_subscribers.size === 0) return;
  const payload = JSON.stringify({ reason, ts: Date.now() });
  for (const res of _subscribers) {
    try {
      res.write(`event: market_invalidated\ndata: ${payload}\n\n`);
    } catch {
      // Connexion morte — retire silencieusement
      _subscribers.delete(res);
    }
  }
}
