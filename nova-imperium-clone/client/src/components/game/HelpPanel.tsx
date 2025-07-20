import { useState } from "react";

export function HelpPanel() {
  const [activeCategory, setActiveCategory] = useState<string>('faq');

  const categories = {
    faq: {
      title: "Questions Fréquentes",
      items: [
        {
          question: "Comment construire une nouvelle ville?",
          answer: "Utilisez une unité Colon pour fonder une nouvelle ville. Placez-la sur un terrain approprié et cliquez sur 'Fonder une ville'."
        },
        {
          question: "Pourquoi mes unités perdent-elles de la santé?",
          answer: "Les unités perdent de la santé en combat ou en territoire ennemi. Déplacez-les en territoire ami ou dans une ville pour les soigner."
        },
        {
          question: "Comment rechercher de nouvelles technologies?",
          answer: "Ouvrez le panneau de recherche et sélectionnez une technologie. Votre production scientifique détermine la vitesse de recherche."
        },
        {
          question: "Qu'est-ce que la culture et à quoi sert-elle?",
          answer: "La culture étend les frontières de vos villes et peut influencer la victoire culturelle. Construisez des temples et monuments pour l'augmenter."
        }
      ]
    },
    controls: {
      title: "Contrôles",
      items: [
        {
          question: "Comment naviguer sur la carte?",
          answer: "Utilisez WASD ou les flèches directionnelles pour vous déplacer. Glissez avec la souris pour naviguer rapidement."
        },
        {
          question: "Comment zoomer?",
          answer: "Utilisez la molette de la souris pour zoomer/dézoomer sur la carte."
        },
        {
          question: "Comment sélectionner des unités?",
          answer: "Cliquez sur une unité pour la sélectionner. Ses options d'action apparaîtront."
        },
        {
          question: "Comment terminer mon tour?",
          answer: "Cliquez sur 'Terminer le tour' en bas à droite ou appuyez sur Entrée."
        }
      ]
    },
    troubleshooting: {
      title: "Dépannage",
      items: [
        {
          question: "Le jeu est lent, que faire?",
          answer: "Fermez les autres applications, réduisez la taille de la fenêtre ou redémarrez votre navigateur."
        },
        {
          question: "Je ne peux pas cliquer sur certains éléments",
          answer: "Vérifiez que vous n'êtes pas en train de faire glisser la carte. Essayez de cliquer plus précisément."
        },
        {
          question: "L'audio ne fonctionne pas",
          answer: "Vérifiez que le son n'est pas coupé dans le jeu et dans votre navigateur. Certains navigateurs bloquent l'audio par défaut."
        },
        {
          question: "La sauvegarde ne fonctionne pas",
          answer: "Assurez-vous que vous avez une connexion internet stable. Les sauvegardes sont automatiques."
        }
      ]
    }
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = categories[activeCategory as keyof typeof categories].items.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Aide</h4>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Recherche</div>
        <input
          type="text"
          placeholder="Rechercher dans l'aide..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 text-xs border border-amber-400 rounded"
        />
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Catégories</div>
        <div className="space-y-1">
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`w-full text-left p-2 rounded transition-colors ${
                activeCategory === key 
                  ? 'bg-amber-300 text-amber-900' 
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
              }`}
            >
              <div className="text-xs font-medium">{category.title}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">
          {categories[activeCategory as keyof typeof categories].title}
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredItems.map((item, index) => (
            <div key={index} className="bg-amber-100 rounded p-2">
              <div className="font-medium text-xs mb-1">{item.question}</div>
              <div className="text-xs text-amber-700">{item.answer}</div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-xs text-amber-700 text-center py-4">
              Aucun résultat trouvé pour "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Liens Utiles</div>
        <div className="space-y-1">
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            📖 Manual complet du jeu
          </button>
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            🎮 Tutoriels vidéo
          </button>
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            👥 Forum de la communauté
          </button>
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            🐛 Signaler un bug
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Informations Système</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Version du jeu:</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Navigateur:</span>
            <span>{navigator.userAgent.split(' ')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span>Résolution:</span>
            <span>{window.innerWidth}x{window.innerHeight}</span>
          </div>
        </div>
      </div>
    </div>
  );
}