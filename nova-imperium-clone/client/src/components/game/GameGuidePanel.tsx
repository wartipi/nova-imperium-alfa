import { useState } from "react";

export function GameGuidePanel() {
  const [activeSection, setActiveSection] = useState<string>('basics');

  const sections = {
    basics: {
      title: "Bases de Nova Imperium",
      content: [
        "🏰 Construisez des villes sur les îles de l'archipel",
        "⚔️ Recrutez des unités pour défendre votre territoire",
        "🌾 Gérez la nourriture, seule ressource du monde",
        "🏛️ Développez votre personnage avec l'arbre de compétences",
        "🗺️ Explorez le monde archipel et ses 14 terrains différents"
      ]
    },
    combat: {
      title: "Système de Combat",
      content: [
        "⚔️ Chaque unité a une valeur d'attaque et de défense",
        "❤️ Les unités ont des points de vie et peuvent être blessées",
        "🏔️ Le terrain peut influencer les combats",
        "⭐ Les unités gagnent de l'expérience en combattant",
        "🏥 Les unités endommagées peuvent être soignées en territoire ami"
      ]
    },
    competences: {
      title: "Arbre de Compétences",
      content: [
        "🎯 5 branches: Politique, Militaire, Économique, Stratégique, Occulte",
        "⭐ Commencez avec 50 points à répartir",
        "🔓 Débloquez de nouvelles compétences avec des prérequis",
        "📈 Améliorez vos capacités selon votre style de jeu",
        "💫 Certaines compétences ouvrent des actions spéciales"
      ]
    },
    world: {
      title: "Monde Archipel",
      content: [
        "🏝️ 14 terrains différents répartis sur des îles",
        "🌊 Naviguez entre eaux profondes et eaux peu profondes",
        "🏔️ Explorez montagnes, volcans, ruines anciennes",
        "🌿 Découvrez prés sacrés, prairies enchantées, marécages",
        "💎 Chaque terrain produit différents niveaux de nourriture"
      ]
    },
    terrains: {
      title: "Types de Terrains",
      content: [
        "🌊 Eaux Profondes (🌾1) - Océan navigable, base de l'archipel",
        "🏖️ Eaux Peu Profondes (🌾2) - Zones côtières autour des îles",
        "🏔️ Montagnes (🌾0) - Pics rocheux, difficiles à traverser",
        "⛰️ Collines (🌾1) - Terrains élevés, bonne défense",
        "🏜️ Désert (🌾0) - Terres arides et stériles",
        "🌾 Terres Fertiles (🌾3) - Sols riches, excellents pour l'agriculture",
        "🌲 Forêt (🌾1) - Bois dense, ressources naturelles",
        "🏞️ Terres Désolées (🌾0) - Terrains stériles et abandonnés",
        "🌿 Marécages (🌾1) - Zones humides, difficiles à développer",
        "🌋 Volcans (🌾0) - Terrains dangereux mais potentiellement précieux",
        "🏛️ Ruines Anciennes (🌾1) - Vestiges de civilisations passées",
        "✨ Prés Sacrés (🌾2) - Terres bénies, spirituellement importantes",
        "🦋 Prairies Enchantées (🌾2) - Terrains magiques et fertiles",
        "🕳️ Grottes (🌾0) - Cavernes profondes, cachent des secrets"
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
            💡 Explorez les îles pour trouver des terres fertiles (🌾3)
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Naviguez entre les îles pour étendre votre territoire
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Investissez dans l'arbre de compétences selon votre style
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Équilibrez croissance des villes et force militaire
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