import type { NovaImperium } from "./types";

/**
 * IA simplifiée - délègue maintenant au TurnManager pour la cohérence
 * Ancien système remplacé par le système modulaire
 */
export class AI {
  static processTurn(novaImperium: NovaImperium) {
    console.log(`🤖 IA traitant le tour pour ${novaImperium.name} (via TurnManager)`);
    
    // Rediriger vers le système modulaire centralisé
    const { TurnManager } = require('./TurnManager');
    return TurnManager.processNovaImperiumTurn(novaImperium, []);
  }
}