import { useState, useEffect } from 'react';
import { usePlayer } from '../../lib/stores/usePlayer';

interface LevelUpNotificationProps {
  show: boolean;
  newLevel: number;
  competencePointsGained: number;
  actionPointsBonus: number;
  onClose: () => void;
}

export function LevelUpNotification({ 
  show, 
  newLevel, 
  competencePointsGained, 
  actionPointsBonus, 
  onClose 
}: LevelUpNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className={`
        pointer-events-auto transform transition-all duration-500 ease-out
        ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
      `}>
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 
                        border-4 border-yellow-600 rounded-xl shadow-2xl p-8 text-center
                        animate-pulse max-w-md mx-4">
          
          {/* Celebration Icon */}
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          
          {/* Level Up Title */}
          <h2 className="text-3xl font-bold text-yellow-900 mb-2">
            NIVEAU {newLevel} ATTEINT !
          </h2>
          
          {/* Congratulations */}
          <p className="text-lg text-yellow-800 mb-4">
            Félicitations pour votre progression !
          </p>
          
          {/* Rewards */}
          <div className="bg-yellow-200 border-2 border-yellow-700 rounded-lg p-4 mb-4">
            <h3 className="text-yellow-900 font-bold mb-2">Récompenses :</h3>
            <div className="space-y-2 text-yellow-800">
              <div className="flex items-center justify-center gap-2">
                <span className="text-purple-600 font-bold">🎯 +{competencePointsGained}</span>
                <span>Points de compétence</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-blue-600 font-bold">⚡ +{actionPointsBonus}</span>
                <span>Points d'action maximum</span>
              </div>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-yellow-100 font-bold 
                       py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Continuer
          </button>
        </div>
      </div>
      
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 -z-10"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
      />
    </div>
  );
}

// Hook pour gérer les notifications de montée de niveau
export function useLevelUpNotification() {
  const [notification, setNotification] = useState<{
    show: boolean;
    newLevel: number;
    competencePointsGained: number;
    actionPointsBonus: number;
  }>({
    show: false,
    newLevel: 0,
    competencePointsGained: 0,
    actionPointsBonus: 0
  });

  const showLevelUpNotification = (
    newLevel: number, 
    competencePointsGained: number, 
    actionPointsBonus: number
  ) => {
    setNotification({
      show: true,
      newLevel,
      competencePointsGained,
      actionPointsBonus
    });
  };

  const hideLevelUpNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  return {
    notification,
    showLevelUpNotification,
    hideLevelUpNotification
  };
}