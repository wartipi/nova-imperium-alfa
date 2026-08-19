import React, { useState } from 'react';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  COMPETENCE_COSTS,
  getLearnCost,
  getUpgradeCost,
  type CompetenceCategory,
  type CompetenceCostData,
  type CompetenceId
} from '../../lib/competence/CompetenceCosts';

type Competence = CompetenceCostData & { id: CompetenceId };

const categoryOrder: CompetenceCategory[] = [
  'strategic',
  'economic',
  'military',
  'political',
  'occult'
];

const categoryColors: Record<CompetenceCategory, string> = {
  political: 'bg-purple-100 border-purple-300 text-purple-900',
  military: 'bg-red-100 border-red-300 text-red-900',
  economic: 'bg-green-100 border-green-300 text-green-900',
  occult: 'bg-indigo-100 border-indigo-300 text-indigo-900',
  strategic: 'bg-blue-100 border-blue-300 text-blue-900'
};

const categoryTitles: Record<CompetenceCategory, string> = {
  political: 'Compétences Politiques',
  military: 'Compétences Militaires',
  economic: 'Compétences Économiques',
  occult: 'Compétences Occultes',
  strategic: 'Compétences Stratégiques'
};

const allCompetences: Competence[] = (Object.entries(COMPETENCE_COSTS) as [
  CompetenceId,
  CompetenceCostData
][]).map(([id, definition]) => ({
  id,
  ...definition
}));

export function CompetenceTree() {
  const {
    competences,
    competencePoints,
    learnCompetence,
    upgradeCompetence,
    getCompetenceLevel
  } = usePlayer();
  const { isAdmin } = useAuth();
  const [selectedCompetence, setSelectedCompetence] = useState<Competence | null>(null);

  const availablePoints = competencePoints || 3;
  const groupedCompetences = categoryOrder.reduce((groups, category) => {
    groups[category] = allCompetences.filter(competence => competence.category === category);
    return groups;
  }, {} as Record<CompetenceCategory, Competence[]>);

  const canLearnCompetence = (competence: Competence) => {
    if (isAdmin) return true;

    const currentLevel = getCompetenceLevel(competence.id);
    if (currentLevel > 0) return false;

    return availablePoints >= getLearnCost(competence.id);
  };

  const canUpgradeCompetence = (competence: Competence) => {
    const currentLevel = getCompetenceLevel(competence.id);

    if (isAdmin) {
      return currentLevel > 0 && currentLevel < 4;
    }

    if (currentLevel === 0 || currentLevel >= 4) return false;
    return availablePoints >= getUpgradeCost(competence.id, currentLevel);
  };

  const handleLearnCompetence = (competence: Competence) => {
    if (canLearnCompetence(competence)) {
      learnCompetence(competence.id);
    }
  };

  const handleUpgradeCompetence = (competence: Competence) => {
    if (canUpgradeCompetence(competence)) {
      upgradeCompetence(competence.id);
    }
  };

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <div className="mb-4 text-center">
        <div className="bg-amber-100 border border-amber-300 rounded px-3 py-1 inline-block">
          <span className="text-amber-900 font-semibold">
            Points disponibles: {availablePoints}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {categoryOrder.map(category => (
          <div key={category} className="border border-amber-200 rounded-lg p-3">
            <h4 className="font-bold text-amber-900 mb-3 border-b border-amber-200 pb-1">
              {categoryTitles[category]}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedCompetences[category].map(competence => {
                const currentLevel = getCompetenceLevel(competence.id);
                const canLearn = canLearnCompetence(competence);
                const canUpgrade = canUpgradeCompetence(competence);
                const isLocked = currentLevel === 0 && !canLearn;

                return (
                  <div
                    key={competence.id}
                    className={`border-2 rounded-lg p-3 transition-all ${
                      isLocked
                        ? 'bg-gray-100 border-gray-300 opacity-60'
                        : currentLevel > 0
                          ? `${categoryColors[competence.category]} shadow-sm`
                          : `${categoryColors[competence.category]} hover:shadow-md`
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedCompetence(competence)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="font-semibold">{competence.name}</h5>
                        <span className="text-xs bg-white px-2 py-1 rounded">
                          Nv. {currentLevel}/4
                        </span>
                      </div>
                      <p className="text-sm mt-2">{competence.description}</p>
                      <div className="text-xs mt-2 space-y-1">
                        <div>
                          Niveau joueur requis :{' '}
                          {competence.requiredPlayerLevel ?? 'À DÉFINIR'}
                        </div>
                        {currentLevel === 0 && (
                          <div>Coût : {getLearnCost(competence.id)} points</div>
                        )}
                        {currentLevel > 0 && currentLevel < 4 && (
                          <div>
                            Amélioration : {getUpgradeCost(competence.id, currentLevel)} points
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex justify-end gap-2 mt-3">
                      {canLearn && currentLevel === 0 && (
                        <button
                          type="button"
                          onClick={() => handleLearnCompetence(competence)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm"
                        >
                          Apprendre
                        </button>
                      )}
                      {canUpgrade && currentLevel > 0 && currentLevel < 4 && (
                        <button
                          type="button"
                          onClick={() => handleUpgradeCompetence(competence)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                        >
                          Améliorer
                        </button>
                      )}
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-2">{selectedCompetence.name}</h3>
            <p className="text-sm text-gray-700 mb-4">{selectedCompetence.description}</p>

            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <div>Catégorie : {categoryTitles[selectedCompetence.category]}</div>
              <div>
                Niveau joueur requis :{' '}
                {selectedCompetence.requiredPlayerLevel ?? 'À DÉFINIR'}
              </div>
              <div>
                Niveau de maîtrise : {getCompetenceLevel(selectedCompetence.id)}/4
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCompetence(null)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
              >
                Fermer
              </button>
              {canLearnCompetence(selectedCompetence) &&
                getCompetenceLevel(selectedCompetence.id) === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleLearnCompetence(selectedCompetence);
                      setSelectedCompetence(null);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded"
                  >
                    Apprendre ({getLearnCost(selectedCompetence.id)} pts)
                  </button>
                )}
              {canUpgradeCompetence(selectedCompetence) && (
                <button
                  type="button"
                  onClick={() => {
                    handleUpgradeCompetence(selectedCompetence);
                    setSelectedCompetence(null);
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Améliorer (
                  {getUpgradeCost(
                    selectedCompetence.id,
                    getCompetenceLevel(selectedCompetence.id)
                  )}{' '}
                  pts)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}