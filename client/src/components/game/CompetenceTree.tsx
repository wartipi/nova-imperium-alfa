import React, { useState } from 'react';
import { usePlayer } from '../../lib/stores/usePlayer';

interface Competence {
  id: string;
  name: string;
  description: string;
  category: 'political' | 'military' | 'economic' | 'occult' | 'strategic';
  cost: number;
  prerequisites?: string[];
  unlocked: boolean;
}

const allCompetences: Competence[] = [
  // Political Competences
  {
    id: 'treaty_knowledge',
    name: 'Connaissance des traités',
    description: 'Cette compétence permet à un joueur de comprendre, rédiger et négocier des accords complexes entre factions. Elle donne un avantage dans la création d\'ententes officielles protégées par le système d\'honneur.',
    category: 'political',
    cost: 10,
    unlocked: true
  },
  {
    id: 'local_influence',
    name: 'Influence locale',
    description: 'Permet au joueur d\'augmenter son contrôle ou une région donnée, en améliorant les effets des bâtiments politiques et la loyauté des populations.',
    category: 'political',
    cost: 15,
    unlocked: true
  },
  {
    id: 'personal_prestige',
    name: 'Prestige personnel',
    description: 'Rend certaines actions diplomatiques plus efficaces, par exemple l\'obtenir des meilleures bonus lors d\'un commerce victorieux ou obtenir pour l\'élite civile une expertise ou un trait qui obtient le statut accompli.',
    category: 'political',
    cost: 20,
    prerequisites: ['local_influence'],
    unlocked: false
  },

  // Military Competences
  {
    id: 'command',
    name: 'Commandement',
    description: 'Augmente le nombre d\'unités qu\'un maréchal ou commandant peut avoir sous sa bannière.',
    category: 'military',
    cost: 12,
    unlocked: true,
    learned: false
  },
  {
    id: 'logistics',
    name: 'Logistique',
    description: 'Augmente la distance de déplacement possible d\'un commandant et de son armée durant un tour, tout en diminuant le coût en points d\'action.',
    category: 'military',
    cost: 18,
    unlocked: true,
    learned: false
  },
  {
    id: 'siege_engineering',
    name: 'Ingénierie de siège',
    description: 'Permet à un commandant d\'intégrer des unités d\'artillerie de campagne ou de siège à sa bannière.',
    category: 'military',
    cost: 25,
    prerequisites: ['command'],
    unlocked: false,
    learned: false
  },

  // Economic Competences
  {
    id: 'builder',
    name: 'Bâtisseur',
    description: 'Augmente le nombre d\'unités qu\'un maréchal ou commandant peut avoir sous sa bannière.',
    category: 'economic',
    cost: 15,
    unlocked: true,
    learned: false
  },
  {
    id: 'optimized_extraction',
    name: 'Extraction optimisée',
    description: 'Augmente le rendement des ressources récoltées sur le terrain, que ce soit bois, pierres, minéraux ou produits rares.',
    category: 'economic',
    cost: 20,
    unlocked: true,
    learned: false
  },
  {
    id: 'influence_network',
    name: 'Réseau d\'influence',
    description: 'Réduit le coût ou le délai de certaines transactions grâce à des alliances, économiques ou des contacts établis.',
    category: 'economic',
    cost: 30,
    prerequisites: ['builder'],
    unlocked: false,
    learned: false
  },

  // Strategic Competences
  {
    id: 'cartography',
    name: 'Cartographie',
    description: 'Permet de cartographier une zone et ses caractéristiques et de la transformer en objets qui peuvent ensuite être donnés, vendus, achetés ou échangés.',
    category: 'strategic',
    cost: 12,
    unlocked: true,
    learned: false
  },
  {
    id: 'exploration',
    name: 'Exploration',
    description: 'Permet au personnage de se repérer plus facilement sur la carte d\'Athaelia de terrain, augmente le champ de vision et la portée de déplacement de celui-ci.',
    category: 'strategic',
    cost: 18,
    unlocked: true,
    learned: false
  },
  {
    id: 'stealth_agent',
    name: 'Agent furtif',
    description: 'Permet à un personnage sans bannière ou troupe expéditionnaire attachée de passer inaperçu sur la carte même s\'il est dans le champ de vision d\'une autre unité.',
    category: 'strategic',
    cost: 25,
    prerequisites: ['exploration'],
    unlocked: false,
    learned: false
  },
  {
    id: 'civil_spy_network',
    name: 'Réseau d\'espions civils',
    description: 'Bien que politique, cette compétence donne un aspect discret de l\'activité diplomatique d\'une autre faction, en révélant partiellement les ententes ou mouvements.',
    category: 'strategic',
    cost: 35,
    prerequisites: ['stealth_agent'],
    unlocked: false,
    learned: false
  }
];

const categoryColors = {
  political: 'bg-purple-100 border-purple-300 text-purple-900',
  military: 'bg-red-100 border-red-300 text-red-900',
  economic: 'bg-green-100 border-green-300 text-green-900',
  occult: 'bg-indigo-100 border-indigo-300 text-indigo-900',
  strategic: 'bg-blue-100 border-blue-300 text-blue-900'
};

const categoryTitles = {
  political: 'Compétences Politiques',
  military: 'Compétences Militaires',
  economic: 'Compétences Économiques',
  occult: 'Compétences Occultes',
  strategic: 'Compétences Stratégiques'
};

export function CompetenceTree() {
  const { competences, competencePoints, learnCompetence, upgradeCompetence, getCompetenceLevel } = usePlayer();
  const [selectedCompetence, setSelectedCompetence] = useState<Competence | null>(null);

  const availablePoints = competencePoints || 50; // Starting points
  const learnedCompetences = competences || [];

  const groupedCompetences = allCompetences.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {} as Record<string, Competence[]>);

  const canLearnCompetence = (competence: Competence) => {
    const currentLevel = getCompetenceLevel(competence.id);
    if (currentLevel > 0) return false; // Already learned
    if (availablePoints < 10) return false; // Cost to learn level 1
    
    if (competence.prerequisites) {
      return competence.prerequisites.every(prereq => 
        getCompetenceLevel(prereq) > 0
      );
    }
    
    return competence.unlocked;
  };

  const canUpgradeCompetence = (competence: Competence) => {
    const currentLevel = getCompetenceLevel(competence.id);
    if (currentLevel === 0 || currentLevel >= 4) return false; // Not learned or max level
    
    const upgradeCost = currentLevel * 5; // Level 1->2: 5pts, 2->3: 10pts, 3->4: 15pts
    return availablePoints >= upgradeCost;
  };

  const handleLearnCompetence = (competence: Competence) => {
    if (!canLearnCompetence(competence)) return;
    
    if (learnCompetence(competence.id)) {
      // Unlock dependent competences
      allCompetences.forEach(comp => {
        if (comp.prerequisites?.includes(competence.id)) {
          comp.unlocked = true;
        }
      });
    }
  };

  const handleUpgradeCompetence = (competence: Competence) => {
    if (!canUpgradeCompetence(competence)) return;
    upgradeCompetence(competence.id);
  };

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <div className="mb-4 text-center">
        <div className="bg-amber-100 border border-amber-300 rounded px-3 py-1 inline-block">
          <span className="text-amber-900 font-semibold">Points disponibles: {availablePoints}</span>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedCompetences).map(([category, comps]) => (
          <div key={category} className="border border-amber-200 rounded-lg p-3">
            <h4 className="font-bold text-amber-900 mb-3 border-b border-amber-200 pb-1">
              {categoryTitles[category as keyof typeof categoryTitles]}
            </h4>
            
            <div className="grid grid-cols-1 gap-2">
              {comps.map((competence) => {
                const currentLevel = getCompetenceLevel(competence.id);
                const canLearn = canLearnCompetence(competence);
                const canUpgrade = canUpgradeCompetence(competence);
                const isLocked = !competence.unlocked || 
                  (competence.prerequisites && !competence.prerequisites.every(prereq => 
                    getCompetenceLevel(prereq) > 0
                  ));

                const levelNames = ['Non apprise', 'Novice', 'Apprenti', 'Expert', 'Maître'];
                const levelColors = ['text-gray-500', 'text-green-600', 'text-blue-600', 'text-purple-600', 'text-orange-600'];

                return (
                  <div
                    key={competence.id}
                    className={`p-3 rounded border-2 cursor-pointer transition-all ${
                      currentLevel > 0 
                        ? 'bg-green-100 border-green-400' 
                        : canLearn 
                          ? `${categoryColors[competence.category]} hover:shadow-md`
                          : 'bg-gray-100 border-gray-300 opacity-50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompetence(competence);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">
                          {competence.name}
                          {isLocked && <span className="text-red-500 ml-1">🔒</span>}
                          {currentLevel > 0 && (
                            <span className={`ml-2 text-xs font-bold ${levelColors[currentLevel]}`}>
                              {levelNames[currentLevel]} (Niv. {currentLevel})
                            </span>
                          )}
                        </div>
                        
                        {/* Level indicator bars */}
                        <div className="flex space-x-1 mb-2">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`w-4 h-2 rounded-sm ${
                                level <= currentLevel 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-1">
                          {currentLevel === 0 
                            ? 'Coût: 10 points pour apprendre'
                            : currentLevel < 4 
                              ? `Améliorer: ${currentLevel * 5} points`
                              : 'Niveau maximum atteint'
                          }
                        </div>
                        {competence.prerequisites && (
                          <div className="text-xs text-gray-500">
                            Prérequis: {competence.prerequisites.map(prereq => 
                              allCompetences.find(c => c.id === prereq)?.name
                            ).join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {canLearn && currentLevel === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleLearnCompetence(competence);
                            }}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded"
                            type="button"
                          >
                            Apprendre
                          </button>
                        )}
                        {canUpgrade && currentLevel > 0 && currentLevel < 4 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleUpgradeCompetence(competence);
                            }}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
                            type="button"
                          >
                            Améliorer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedCompetence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4">
            <h3 className="font-bold text-lg mb-2">{selectedCompetence.name}</h3>
            
            {/* Current Level Display */}
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Niveau actuel:</div>
              <div className="flex space-x-1 mb-2">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`w-6 h-3 rounded-sm ${
                      level <= getCompetenceLevel(selectedCompetence.id) 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm font-bold text-blue-600">
                {getCompetenceLevel(selectedCompetence.id) > 0 
                  ? `Niveau ${getCompetenceLevel(selectedCompetence.id)} - ${['', 'Novice', 'Apprenti', 'Expert', 'Maître'][getCompetenceLevel(selectedCompetence.id)]}`
                  : 'Non apprise'
                }
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">{selectedCompetence.description}</p>
            
            <div className="text-sm text-gray-600 mb-4">
              <div>Catégorie: {categoryTitles[selectedCompetence.category]}</div>
              {selectedCompetence.prerequisites && (
                <div>Prérequis: {selectedCompetence.prerequisites.map(prereq => 
                  allCompetences.find(c => c.id === prereq)?.name
                ).join(', ')}</div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedCompetence(null)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
              >
                Fermer
              </button>
              {canLearnCompetence(selectedCompetence) && getCompetenceLevel(selectedCompetence.id) === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleLearnCompetence(selectedCompetence);
                    setSelectedCompetence(null);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded"
                  type="button"
                >
                  Apprendre (10 pts)
                </button>
              )}
              {canUpgradeCompetence(selectedCompetence) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleUpgradeCompetence(selectedCompetence);
                    setSelectedCompetence(null);
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  type="button"
                >
                  Améliorer ({getCompetenceLevel(selectedCompetence.id) * 5} pts)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}