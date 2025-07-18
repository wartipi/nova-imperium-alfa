// Système de coûts variables pour l'apprentissage des compétences
// Les coûts varient de 1 à 5 points selon la complexité de la compétence

export interface CompetenceCostData {
  learnCost: number; // Coût pour apprendre le niveau 1
  upgradeCosts: [number, number, number]; // Coûts pour passer aux niveaux 2, 3, 4
  description: string;
}

export const COMPETENCE_COSTS: Record<string, CompetenceCostData> = {
  // Compétences Politiques (coûts moyens-élevés)
  'diplomatie': {
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Art de la négociation et des relations diplomatiques'
  },
  'intrigues': {
    learnCost: 4,
    upgradeCosts: [4, 5, 5],
    description: 'Maîtrise des complots et manœuvres politiques'
  },
  'eloquence': {
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Capacité de persuasion et art oratoire'
  },
  'commandement': {
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Leadership et gestion des groupes'
  },

  // Compétences Militaires (coûts moyens)
  'tactique': {
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Stratégies de combat et manœuvres tactiques'
  },
  'art_de_la_guerre': {
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Maîtrise avancée des conflits militaires'
  },
  'fortification': {
    learnCost: 2,
    upgradeCosts: [2, 3, 3],
    description: 'Construction et amélioration des défenses'
  },
  'logistique': {
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Organisation des ressources et approvisionnements'
  },

  // Compétences Économiques (coûts faibles-moyens)
  'commerce': {
    learnCost: 1,
    upgradeCosts: [1, 2, 3],
    description: 'Négociation commerciale et gestion des échanges'
  },
  'gestion': {
    learnCost: 2,
    upgradeCosts: [2, 3, 3],
    description: 'Administration et organisation des ressources'
  },
  'artisanat': {
    learnCost: 1,
    upgradeCosts: [1, 2, 2],
    description: 'Création d\'objets et maîtrise des techniques'
  },
  'agriculture': {
    learnCost: 1,
    upgradeCosts: [1, 1, 2],
    description: 'Cultivation et production alimentaire'
  },

  // Compétences Stratégiques (coûts moyens-élevés)
  'espionnage': {
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Collecte d\'informations et activités secrètes'
  },
  'planification': {
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Élaboration de stratégies à long terme'
  },
  'exploration': {
    learnCost: 1,
    upgradeCosts: [1, 2, 3],
    description: 'Découverte de territoires et navigation'
  },
  'cartographie': {
    learnCost: 2,
    upgradeCosts: [2, 3, 3],
    description: 'Création et lecture de cartes précises'
  },
  'connaissance_des_traites': {
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Maîtrise des accords diplomatiques et négociations formelles'
  },

  // Compétences Occultes (coûts élevés)
  'rituels': {
    learnCost: 4,
    upgradeCosts: [4, 5, 5],
    description: 'Maîtrise des cérémonies mystiques'
  },
  'magie_noire': {
    learnCost: 5,
    upgradeCosts: [5, 5, 5],
    description: 'Arts interdits et pouvoirs sombres'
  },
  'alchimie': {
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Transformation des matières et créations magiques'
  },
  'divination': {
    learnCost: 3,
    upgradeCosts: [3, 4, 4],
    description: 'Prédiction et lecture des signes'
  }
};

// Fonction pour obtenir le coût d'apprentissage d'une compétence
export function getLearnCost(competence: string): number {
  return COMPETENCE_COSTS[competence]?.learnCost || 3; // Coût par défaut : 3 points
}

// Fonction pour obtenir le coût d'amélioration d'une compétence
export function getUpgradeCost(competence: string, currentLevel: number): number {
  const costData = COMPETENCE_COSTS[competence];
  if (!costData || currentLevel < 1 || currentLevel > 3) {
    return 3; // Coût par défaut : 3 points
  }
  return costData.upgradeCosts[currentLevel - 1];
}

// Fonction pour obtenir la description d'une compétence
export function getCompetenceDescription(competence: string): string {
  return COMPETENCE_COSTS[competence]?.description || 'Compétence spécialisée';
}

// Fonction pour obtenir toutes les informations de coût d'une compétence
export function getCompetenceCostInfo(competence: string) {
  const costData = COMPETENCE_COSTS[competence];
  if (!costData) {
    return {
      learnCost: 3,
      upgradeCosts: [3, 3, 3],
      description: 'Compétence spécialisée'
    };
  }
  return costData;
}