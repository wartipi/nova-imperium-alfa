import { useState } from "react";

export function GameGuidePanel() {
  const [activeSection, setActiveSection] = useState<string>('basics');

  const sections = {
    basics: {
      title: "Bases du Jeu",
      content: [
        "🏰 Construisez des villes pour développer votre civilisation",
        "⚔️ Recrutez des unités pour défendre votre territoire",
        "🔬 Recherchez des technologies pour débloquer de nouvelles capacités",
        "💰 Gérez vos ressources pour maintenir votre économie",
        "🤝 Établissez des relations diplomatiques avec d'autres civilisations"
      ]
    },
    combat: {
      title: "Système de Combat",
      content: [
        "⚔️ Chaque unité a une valeur de force et des points de vie",
        "🛡️ Certaines unités sont plus efficaces contre d'autres",
        "🏔️ Le terrain peut influencer les combats",
        "⭐ Les unités gagnent de l'expérience en combattant",
        "🏥 Les unités endommagées peuvent être soignées"
      ]
    },
    economy: {
      title: "Économie",
      content: [
        "🌾 La nourriture permet la croissance des villes",
        "🔨 La production permet de construire bâtiments et unités",
        "💰 L'or finance le maintien des unités et les achats",
        "🔬 La science accélère la recherche technologique",
        "🎭 La culture influence l'expansion des frontières"
      ]
    },
    diplomacy: {
      title: "Diplomatie",
      content: [
        "🤝 Établissez des relations avec d'autres civilisations",
        "📜 Négociez des accords commerciaux",
        "⚖️ Formez des alliances pour la protection mutuelle",
        "⚔️ Déclarez la guerre si nécessaire",
        "🕊️ Négociez la paix pour mettre fin aux conflits"
      ]
    },
    victory: {
      title: "Conditions de Victoire",
      content: [
        "🏆 Victoire par Domination: Contrôlez toutes les capitales",
        "🔬 Victoire Scientifique: Terminez le projet spatial",
        "🎭 Victoire Culturelle: Dominez culturellement le monde",
        "🤝 Victoire Diplomatique: Soyez élu leader mondial",
        "⏰ Victoire par Score: Ayez le meilleur score à la fin"
      ]
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Guide de Jeu</h4>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Sections</div>
        <div className="space-y-1">
          {Object.entries(sections).map(([key, section]) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full text-left p-2 rounded transition-colors ${
                activeSection === key 
                  ? 'bg-amber-300 text-amber-900' 
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
              }`}
            >
              <div className="text-xs font-medium">{section.title}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">
          {sections[activeSection as keyof typeof sections].title}
        </div>
        <div className="space-y-2">
          {sections[activeSection as keyof typeof sections].content.map((item, index) => (
            <div key={index} className="text-xs p-2 bg-amber-100 rounded">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Conseils Rapides</div>
        <div className="space-y-1 text-xs">
          <div className="p-2 bg-amber-100 rounded">
            💡 Explorez rapidement pour trouver de bonnes positions de villes
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Équilibrez croissance économique et force militaire
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Adaptez votre stratégie selon vos voisins
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 N'oubliez pas d'améliorer vos terres avec des ouvriers
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Raccourcis Clavier</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Navigation:</span>
            <span className="font-mono">WASD ou Flèches</span>
          </div>
          <div className="flex justify-between">
            <span>Zoom:</span>
            <span className="font-mono">Molette</span>
          </div>
          <div className="flex justify-between">
            <span>Terminer le tour:</span>
            <span className="font-mono">Entrée</span>
          </div>
          <div className="flex justify-between">
            <span>Pause:</span>
            <span className="font-mono">Espace</span>
          </div>
        </div>
      </div>
    </div>
  );
}