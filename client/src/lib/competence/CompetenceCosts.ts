// Système de coûts variables pour l'apprentissage des compétences
// Les coûts varient de 1 à 5 points selon la complexité de la compétence

export type CompetenceCategory = 'political' | 'military' | 'economic' | 'strategic' | 'occult';

export type CompetenceId =
  | 'diplomatie'
  | 'intrigues'
  | 'eloquence'
  | 'commandement'
  | 'tactique'
  | 'art_de_la_guerre'
  | 'fortification'
  | 'logistique'
  | 'commerce'
  | 'gestion'
  | 'artisanat'
  | 'agriculture'
  | 'espionnage'
  | 'planification'
  | 'exploration'
  | 'cartographie'
  | 'connaissance_des_traites'
  | 'rituels'
  | 'magie_noire'
  | 'alchimie'
  | 'divination';

export interface CompetenceCostData {
  name: string;
  category: CompetenceCategory;
  requiredPlayerLevel: number | null;
  learnCost: number; // Coût pour apprendre le niveau 1
  upgradeCosts: [number, number, number]; // Coûts pour passer aux niveaux 2, 3, 4
  description: string;
}

export const COMPETENCE_COSTS: Record<CompetenceId, CompetenceCostData> = {
  // Compétences Politiques (coûts moyens-élevés)
  'diplomatie': {
    name: 'Diplomatie',
    category: 'political',
    requiredPlayerLevel: null,
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Art de la négociation et des relations diplomatiques'
  },
  'intrigues': {
    name: 'Intrigues',
    category: 'political',
    requiredPlayerLevel: null,
    learnCost: 4,
    upgradeCosts: [4, 5, 5],
    description: 'Maîtrise des complots et manœuvres politiques'
  },
  'eloquence': {
    name: 'Éloquence',
    category: 'political',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Capacité de persuasion et art oratoire'
  },
  'commandement': {
    name: 'Commandement',
    category: 'military',
    requiredPlayerLevel: null,
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Leadership et gestion des groupes'
  },

  // Compétences Militaires (coûts moyens)
  'tactique': {
    name: 'Tactique',
    category: 'military',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Stratégies de combat et manœuvres tactiques'
  },
  'art_de_la_guerre': {
    name: 'Art de la guerre',
    category: 'military',
    requiredPlayerLevel: null,
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Maîtrise avancée des conflits militaires'
  },
  'fortification': {
    name: 'Fortification',
    category: 'military',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 3],
    description: 'Construction et amélioration des défenses'
  },
  'logistique': {
    name: 'Logistique',
    category: 'military',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Organisation des ressources et approvisionnements'
  },

  // Compétences Économiques (coûts faibles-moyens)
  'commerce': {
    name: 'Commerce',
    category: 'economic',
    requiredPlayerLevel: null,
    learnCost: 1,
    upgradeCosts: [1, 2, 3],
    description: 'Négociation commerciale et gestion des échanges'
  },
  'gestion': {
    name: 'Gestion',
    category: 'economic',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 3],
    description: 'Administration et organisation des ressources'
  },
  'artisanat': {
    name: 'Artisanat',
    category: 'economic',
    requiredPlayerLevel: null,
    learnCost: 1,
    upgradeCosts: [1, 2, 2],
    description: 'Création d\'objets et maîtrise des techniques'
  },
  'agriculture': {
    name: 'Agriculture',
    category: 'economic',
    requiredPlayerLevel: null,
    learnCost: 1,
    upgradeCosts: [1, 1, 2],
    description: 'Cultivation et production alimentaire'
  },

  // Compétences Stratégiques (coûts moyens-élevés)
  'espionnage': {
    name: 'Espionnage',
    category: 'strategic',
    requiredPlayerLevel: null,
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Collecte d\'informations et activités secrètes'
  },
  'planification': {
    name: 'Planification',
    category: 'strategic',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Élaboration de stratégies à long terme'
  },
  'exploration': {
    name: 'Exploration',
    category: 'strategic',
    requiredPlayerLevel: null,
    learnCost: 1,
    upgradeCosts: [1, 2, 3],
    description: 'Découverte de territoires et navigation'
  },
  'cartographie': {
    name: 'Cartographie',
    category: 'strategic',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 3],
    description: 'Création et lecture de cartes précises'
  },
  'connaissance_des_traites': {
    name: 'Connaissance des traités',
    category: 'political',
    requiredPlayerLevel: null,
    learnCost: 2,
    upgradeCosts: [2, 3, 4],
    description: 'Maîtrise des accords diplomatiques et négociations formelles'
  },

  // Compétences Occultes (coûts élevés)
  'rituels': {
    name: 'Rituels',
    category: 'occult',
    requiredPlayerLevel: null,
    learnCost: 4,
    upgradeCosts: [4, 5, 5],
    description: 'Maîtrise des cérémonies mystiques'
  },
  'magie_noire': {
    name: 'Magie noire',
    category: 'occult',
    requiredPlayerLevel: null,
    learnCost: 5,
    upgradeCosts: [5, 5, 5],
    description: 'Arts interdits et pouvoirs sombres'
  },
  'alchimie': {
    name: 'Alchimie',
    category: 'occult',
    requiredPlayerLevel: null,
    learnCost: 3,
    upgradeCosts: [3, 4, 5],
    description: 'Transformation des matières et créations magiques'
  },
  'divination': {
    name: 'Divination',
    category: 'occult',
    requiredPlayerLevel: null,
    learnCost: 3,
    upgradeCosts: [3, 4, 4],
    description: 'Prédiction et lecture des signes'
  }
};

function getCompetenceCostData(competence: string): CompetenceCostData | undefined {
  return COMPETENCE_COSTS[competence as CompetenceId];
}

// Fonction pour obtenir le coût d'apprentissage d'une compétence
export function getLearnCost(competence: string): number {
  return getCompetenceCostData(competence)?.learnCost || 3; // Coût par défaut : 3 points
}

// Fonction pour obtenir le coût d'amélioration d'une compétence
export function getUpgradeCost(competence: string, currentLevel: number): number {
  const costData = getCompetenceCostData(competence);
  if (!costData || currentLevel < 1 || currentLevel > 3) {
    return 3; // Coût par défaut : 3 points
  }
  return costData.upgradeCosts[currentLevel - 1];
}

// Fonction pour obtenir la description d'une compétence
export function getCompetenceDescription(competence: string): string {
  return getCompetenceCostData(competence)?.description || 'Compétence spécialisée';
}

// Fonction pour obtenir toutes les informations de coût d'une compétence
export function getCompetenceCostInfo(competence: string) {
  const costData = getCompetenceCostData(competence);
  if (!costData) {
    return {
      learnCost: 3,
      upgradeCosts: [3, 3, 3],
      description: 'Compétence spécialisée'
    };
  }
  return costData;
}