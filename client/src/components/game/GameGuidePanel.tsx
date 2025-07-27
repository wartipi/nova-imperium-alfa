import { useState } from "react";

export function GameGuidePanel() {
  const [activeSection, setActiveSection] = useState<string>('basics');

  const sections = {
    basics: {
      title: "Bases de Nova Imperium",
      content: [
        "🏰 Construisez des villes et développez votre territoire",
        "⚔️ Recrutez des unités pour défendre votre empire",
        "💰 Gérez 15 ressources différentes (bois, pierre, fer, or...)",
        "🏛️ Développez vos compétences avec l'arbre de progression",
        "🗺️ Explorez le monde hexagonal et découvrez ses secrets",
        "⚖️ Commercez sur le Marché Publique avec d'autres joueurs"
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
      title: "Système de Compétences",
      content: [
        "🔧 Exploration: Améliore vision, réduit coûts de déplacement",
        "🗺️ Cartographie: Permet création cartes de région vendables",
        "⚔️ Combat: Augmente efficacité des unités militaires", 
        "🏗️ Construction: Débloquer nouveaux bâtiments et améliorations",
        "💰 Commerce: Optimise production et échanges de ressources",
        "📈 Progression via expérience gagné lors des actions",
        "🎯 Chaque niveau débloque nouvelles capacités"
      ]
    },
    resources: {
      title: "Système de Ressources",
      content: [
        "💰 15 ressources: bois, pierre, fer, or, nourriture, cuivre...",
        "🔮 Ressources magiques: cristaux mana, écailles dragon, plumes phénix",
        "🏗️ Production via bâtiments: scieries, mines, forges",
        "💼 Stockage dans trésorerie avec limites par type",
        "⚖️ Commerce via Marché Publique avec autres joueurs",
        "🎯 Ressources de base visibles dès niveau 1 d'exploration",
        "✨ Ressources magiques nécessitent niveau 3+ d'exploration"
      ]
    },
    exploration: {
      title: "Système d'Exploration",
      content: [
        "🔍 5 niveaux d'exploration (0→4) avec compétences croissantes",
        "👁️ Vision étendue: Niveau 4 = rayon de 3 hexagones (37 cases)",
        "⚒️ Actions: Explorer la Zone (5 PA), Cartographier (15 PA)",
        "🗺️ Exploration Avancée (15 PA), Carte de Maître (25 PA)",
        "💎 Ressources magiques débloquées au niveau 3+",
        "📍 Réduction des coûts de déplacement selon niveau",
        "🎯 Génération de cartes de région avec coordonnées cachées"
      ]
    },
    marketplace: {
      title: "Marché Publique",
      content: [
        "⚖️ Commercez ressources et objets uniques avec autres joueurs",
        "💰 Ventes directes à prix fixe ou enchères par tours",
        "🔍 Recherche et filtres par type, rareté et mots-clés",
        "🗺️ Cartes de région: coordonnées cachées pour sécurité",
        "❌ Prévention ventes duplicatas avec annulation possible",
        "🏪 Accès via menu de gauche ou bouton ⚖️ Marché Publique",
        "💎 Objets uniques transférés automatiquement à l'acheteur"
      ]
    },
    terrains: {
      title: "Types de Terrains",
      content: [
        "🏞️ Terres Désolées (1 PA) - Terrain de base, facile à traverser",
        "🌲 Forêt (2 PA) - Contient du bois et des herbes",
        "⛰️ Collines (2 PA) - Terrain élevé avec pierre et cuivre",
        "🏔️ Montagnes (5 PA) - Difficile, mais riche en fer et métaux",
        "🌾 Terres Fertiles (1 PA) - Excellentes pour l'agriculture",
        "🏖️ Eaux Peu Profondes (bloqué) - Zones côtières navigables",
        "🌊 Eaux Profondes (bloqué) - Océan, non traversable à pied",
        "🌿 Marécages (3 PA) - Zones humides avec ressources spéciales",
        "🌋 Volcans (8→4 PA niveau 4+) - Dangereux mais précieux",
        "🏛️ Ruines Anciennes (3 PA) - Mystérieux vestiges du passé",
        "✨ Prés Enchantés (2 PA) - Terrains magiques sacrés"
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
        <div className="font-medium text-sm mb-2">Conseils Stratégiques</div>
        <div className="space-y-1 text-xs">
          <div className="p-2 bg-amber-100 rounded">
            💡 Explorez d'abord (niveau 1+) puis cartographiez pour générer des cartes vendables
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Niveau 3+ d'exploration débloque les ressources magiques précieuses
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Utilisez le Marché Publique pour acquérir ressources manquantes
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Surveillez vos ventes actives et annulez si nécessaire
          </div>
          <div className="p-2 bg-amber-100 rounded">
            💡 Cartes de région: coordonnées cachées protègent vos découvertes
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Interface et Navigation</div>
        <div className="space-y-1 text-xs">
          <div className="p-2 bg-amber-100 rounded">
            🖱️ Clic sur hexagone: Sélectionner/déplacer avatar
          </div>
          <div className="p-2 bg-amber-100 rounded">
            📱 Menu gauche: Factions, Trésorerie, Marché Publique
          </div>
          <div className="p-2 bg-amber-100 rounded">
            📱 Menu droite: Aide, Guide, Actions contextuelles
          </div>
          <div className="p-2 bg-amber-100 rounded">
            🎯 Clic sur avatar: Panel d'inventaire et objets uniques
          </div>
          <div className="p-2 bg-amber-100 rounded">
            ⚖️ Icône balance: Accès direct au Marché Publique
          </div>
        </div>
      </div>
    </div>
  );
}