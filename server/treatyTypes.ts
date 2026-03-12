export const ACTIVE_TREATY_TYPES = [
  {
    type: "alliance_militaire",
    name: "Alliance Militaire",
    description: "Défense mutuelle, renseignements partagés, opérations conjointes",
    cost: 25,
    icon: "⚔️",
  },
  {
    type: "accord_commercial",
    name: "Accord Commercial",
    description: "Routes commerciales, réduction des tarifs, bonus économiques",
    cost: 15,
    icon: "💰",
  },
  {
    type: "pacte_non_agression",
    name: "Pacte de Non-Agression",
    description: "Zones neutres, cessez-le-feu",
    cost: 10,
    icon: "🕊️",
  },
  {
    type: "defense_mutuelle",
    name: "Défense Mutuelle",
    description: "Soutien défensif, territoires partagés, contact d'urgence",
    cost: 20,
    icon: "🛡️",
  },
] as const;

export type TreatyType = (typeof ACTIVE_TREATY_TYPES)[number]["type"];
