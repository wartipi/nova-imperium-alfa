import type { Unit, Civilization } from "./types";

export class Combat {
  static resolveCombat(attacker: Unit, defender: Unit): {
    attackerDamage: number;
    defenderDamage: number;
    winner: 'attacker' | 'defender' | 'draw';
  } {
    // Simple combat resolution
    const attackerPower = attacker.strength + Math.random() * 10;
    const defenderPower = defender.strength + Math.random() * 10;
    
    const attackerDamage = Math.max(0, Math.floor(defenderPower - attackerPower / 2));
    const defenderDamage = Math.max(0, Math.floor(attackerPower - defenderPower / 2));
    
    // Apply damage
    attacker.health = Math.max(0, attacker.health - attackerDamage);
    defender.health = Math.max(0, defender.health - defenderDamage);
    
    // Determine winner
    let winner: 'attacker' | 'defender' | 'draw';
    if (attacker.health <= 0 && defender.health <= 0) {
      winner = 'draw';
    } else if (attacker.health <= 0) {
      winner = 'defender';
    } else if (defender.health <= 0) {
      winner = 'attacker';
    } else {
      winner = attackerPower > defenderPower ? 'attacker' : 'defender';
    }
    
    // Award experience
    if (winner === 'attacker' || winner === 'draw') {
      attacker.experience += 10;
    }
    if (winner === 'defender' || winner === 'draw') {
      defender.experience += 10;
    }
    
    return {
      attackerDamage,
      defenderDamage,
      winner
    };
  }

  static calculateCombatOdds(attacker: Unit, defender: Unit): number {
    // Return probability of attacker winning (0-1)
    const attackerPower = attacker.strength + attacker.experience / 10;
    const defenderPower = defender.strength + defender.experience / 10;
    
    return attackerPower / (attackerPower + defenderPower);
  }
}
