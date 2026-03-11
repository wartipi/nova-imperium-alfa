import React, { useState } from 'react';
import { useReputation } from '../../lib/stores/useReputation';
import { useAuth } from '../../lib/auth/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface ReputationManagementPanelProps {
  onClose: () => void;
}

export function ReputationManagementPanel({ onClose }: ReputationManagementPanelProps) {
  const { honor, reputation, getReputationLevel, addHonor, removeHonor, setHonor, gnParticipation, seasonPass, addGnParticipation, setSeasonPass } = useReputation();
  const { isAdmin } = useAuth();
  
  const [customAmount, setCustomAmount] = useState<string>('');
  const [setAmount, setSetAmount] = useState<string>('');

  const reputationLevel = getReputationLevel();

  const handleAddHonor = (amount: number) => {
    addHonor(amount);
    console.log(`Honneur ajouté: +${amount}`);
  };

  const handleRemoveHonor = (amount: number) => {
    removeHonor(amount);
    console.log(`Honneur retiré: -${amount}`);
  };

  const handleSetHonor = () => {
    const amount = parseInt(setAmount);
    if (!isNaN(amount)) {
      setHonor(amount);
      setSetAmount('');
      console.log(`Honneur défini à: ${amount}`);
    }
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount)) {
      addHonor(amount);
      setCustomAmount('');
      console.log(`Honneur personnalisé ajouté: +${amount}`);
    }
  };

  const handleCustomRemove = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount)) {
      removeHonor(amount);
      setCustomAmount('');
      console.log(`Honneur personnalisé retiré: -${amount}`);
    }
  };

  const presetActions = [
    { name: 'Petite Action Positive', amount: 25, color: 'bg-green-100 text-green-800' },
    { name: 'Action Moyenne Positive', amount: 50, color: 'bg-green-200 text-green-800' },
    { name: 'Grande Action Positive', amount: 100, color: 'bg-green-300 text-green-800' },
    { name: 'Action Héroïque', amount: 200, color: 'bg-blue-200 text-blue-800' },
    { name: 'Petite Action Négative', amount: -25, color: 'bg-red-100 text-red-800' },
    { name: 'Action Moyenne Négative', amount: -50, color: 'bg-red-200 text-red-800' },
    { name: 'Grande Action Négative', amount: -100, color: 'bg-red-300 text-red-800' },
    { name: 'Trahison Majeure', amount: -200, color: 'bg-red-400 text-red-900' }
  ];

  const reputationLevels = [
    { name: 'Banni', value: -750, color: '#8B0000' },
    { name: 'Méprisé', value: -300, color: '#DC143C' },
    { name: 'Suspect', value: -100, color: '#FF8C00' },
    { name: 'Neutre', value: 0, color: '#808080' },
    { name: 'Honorable', value: 300, color: '#228B22' },
    { name: 'Saint', value: 600, color: '#FFD700' }
  ];

  return (
    <div className="absolute top-20 left-4 pointer-events-auto z-20">
      <Card className="w-[500px] max-h-[700px] overflow-y-auto bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-800 shadow-lg">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-purple-900">⚖️ Gestion de la Réputation</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-purple-600 text-purple-600 hover:bg-purple-200"
            >
              ✕
            </Button>
          </div>

          {/* Statut Actuel */}
          <div className="mb-6 p-4 bg-purple-50 border border-purple-300 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-purple-700">RÉPUTATION ACTUELLE</div>
              <div 
                className="text-2xl font-bold mb-2"
                style={{ color: reputationLevel.color }}
              >
                {reputation}
              </div>
              <div className="text-xl font-semibold text-purple-900">{honor} points d'honneur</div>
              <div className="text-sm text-purple-600 mt-2">{reputationLevel.description}</div>
              
              {/* Barre de progression */}
              <div className="w-full bg-purple-200 rounded-full h-3 mt-3">
                <div 
                  className="h-3 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: reputationLevel.color,
                    width: `${Math.max(0, Math.min(100, ((honor - reputationLevel.minHonor) / (reputationLevel.maxHonor - reputationLevel.minHonor)) * 100))}%`
                  }}
                />
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {reputationLevel.minHonor} → {reputationLevel.maxHonor}
              </div>
            </div>
          </div>

          {/* Actions Prédéfinies */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-purple-800 mb-3">🎭 Actions Prédéfinies</h4>
            <div className="grid grid-cols-2 gap-2">
              {presetActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => action.amount > 0 ? handleAddHonor(action.amount) : handleRemoveHonor(Math.abs(action.amount))}
                  className={`text-xs py-2 px-3 ${action.color} border-2`}
                >
                  {action.name}
                  <br />
                  <span className="font-bold">{action.amount > 0 ? '+' : ''}{action.amount}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Montant Personnalisé */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-purple-800 mb-3">🎯 Modification Personnalisée</h4>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Montant"
                className="flex-1 px-3 py-2 border border-purple-300 rounded text-sm"
              />
              <Button
                size="sm"
                onClick={handleCustomAdd}
                disabled={!customAmount || isNaN(parseInt(customAmount))}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Ajouter
              </Button>
              <Button
                size="sm"
                onClick={handleCustomRemove}
                disabled={!customAmount || isNaN(parseInt(customAmount))}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Retirer
              </Button>
            </div>
          </div>

          {/* Définir Valeur Exacte */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-purple-800 mb-3">🎪 Définir Valeur Exacte</h4>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={setAmount}
                onChange={(e) => setSetAmount(e.target.value)}
                placeholder="Valeur exacte"
                className="flex-1 px-3 py-2 border border-purple-300 rounded text-sm"
              />
              <Button
                size="sm"
                onClick={handleSetHonor}
                disabled={!setAmount || isNaN(parseInt(setAmount))}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Définir
              </Button>
            </div>
          </div>

          {/* Raccourcis Niveaux */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-purple-800 mb-3">⚡ Raccourcis Niveaux</h4>
            <div className="grid grid-cols-3 gap-2">
              {reputationLevels.map((level, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => setHonor(level.value)}
                  className="text-xs py-2 px-2"
                  style={{ 
                    borderColor: level.color,
                    color: level.color
                  }}
                >
                  {level.name}
                  <br />
                  <span className="font-bold">{level.value}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Information Système */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-purple-800 mb-3">🎪 État du Système</h4>
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-300 p-3 rounded">
                <div className="text-sm font-medium text-blue-800">Passe de Saison</div>
                <div className="text-xs text-blue-600 mb-2">Tous les joueurs actifs ont automatiquement leur passe de saison</div>
                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✅ Valide pour tous les joueurs actifs</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-300 p-3 rounded">
                <div className="text-sm font-medium text-yellow-800">Validation GN</div>
                <div className="text-xs text-yellow-600 mb-2">Système de validation des participations aux événements GN</div>
                <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⚙️ En développement</div>
                <div className="text-xs text-yellow-600 mt-1">Un compte maître de jeu sera créé plus tard pour comptabiliser les participations</div>
              </div>
            </div>
          </div>

          {/* Effets Actuels */}
          <div>
            <h4 className="text-sm font-bold text-purple-800 mb-2">✨ Effets Actuels</h4>
            <div className="bg-purple-50 p-3 rounded border">
              <div className="text-xs text-purple-700 space-y-1">
                {reputationLevel.effects.map((effect, index) => (
                  <div key={index}>• {effect}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}