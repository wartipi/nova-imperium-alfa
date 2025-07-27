import { useState } from "react";

export function HelpPanel() {
  const [activeCategory, setActiveCategory] = useState<string>('faq');

  const categories = {
    faq: {
      title: "Questions Fréquentes",
      items: [
        {
          question: "Comment explorer le monde et découvrir des ressources?",
          answer: "Utilisez l'action 'Explorer la Zone' (5 PA) pour révéler les ressources cachées. Plus votre niveau d'exploration est élevé, plus vous découvrez de ressources rares."
        },
        {
          question: "Comment accéder au Marché Publique?",
          answer: "Cliquez sur l'icône ⚖️ dans l'interface ou accédez via le menu de gauche. Vous pourrez acheter et vendre ressources et objets uniques avec d'autres joueurs."
        },
        {
          question: "Pourquoi je ne vois pas toutes les ressources sur la carte?",
          answer: "Les ressources sont révélées progressivement selon votre niveau d'exploration. Niveau 1+ révèle les ressources de base, niveau 3+ débloque les ressources magiques."
        },
        {
          question: "Comment créer et vendre des cartes de région?",
          answer: "Utilisez l'action 'Cartographier' (15 PA) sur une zone explorée pour créer une carte vendable. Les coordonnées restent cachées pour les acheteurs."
        },
        {
          question: "Comment annuler une vente sur le marketplace?",
          answer: "Dans l'onglet 'Vendre' du Marché Publique, cliquez sur le bouton rouge 'Annuler vente' sur vos objets en vente. Confirmez pour retirer l'objet du marché."
        }
      ]
    },
    navigation: {
      title: "Navigation & Interface",
      items: [
        {
          question: "Comment me déplacer sur la carte hexagonale?",
          answer: "Cliquez sur un hexagone adjacent pour déplacer votre avatar. Le coût en PA varie selon le terrain (1-8 PA). Les réductions s'appliquent selon votre niveau d'exploration."
        },
        {
          question: "Comment accéder aux différents menus?",
          answer: "Menu de gauche: Factions, Trésorerie, Marché Publique. Menu de droite: Aide, Guide, Actions contextuelles. Cliquez sur votre avatar pour l'inventaire."
        },
        {
          question: "Que signifient les icônes sur la carte?",
          answer: "🌲 Forêt (bois), ⛰️ Collines (pierre), 🏔️ Montagnes (fer), etc. Les ressources apparaissent selon votre niveau d'exploration avec des fonds colorés."
        },
        {
          question: "Comment voir mes statistiques de déplacement?",
          answer: "Le panneau d'informations de tuile affiche le coût en PA, les réductions d'exploration appliquées et les ressources disponibles sur chaque hexagone."
        }
      ]
    },
    marketplace: {
      title: "Marché Publique",
      items: [
        {
          question: "Comment vendre un objet sur le marketplace?",
          answer: "Ouvrez le Marché Publique, onglet 'Vendre'. Sélectionnez l'objet dans votre inventaire, choisissez 'Vente directe' ou 'Enchère', fixez le prix et validez."
        },
        {
          question: "Pourquoi mon objet apparaît grisé dans l'inventaire?",
          answer: "Cet objet est déjà en vente sur le marketplace. Vous pouvez l'annuler avec le bouton rouge 'Annuler vente' pour le remettre dans votre inventaire."
        },
        {
          question: "Comment fonctionne le système d'enchères?",
          answer: "Les enchères se terminent automatiquement en fin de tour. Le plus offrant remporte l'objet. Vous recevez une notification du résultat."
        },
        {
          question: "Pourquoi les coordonnées des cartes sont cachées?",
          answer: "Pour protéger vos découvertes. Les cartes vendues affichent 'Hexagone (???, ???)' aux acheteurs, mais vous gardez les vraies coordonnées dans votre inventaire."
        }
      ]
    },
    troubleshooting: {
      title: "Problèmes Techniques",
      items: [
        {
          question: "Les ressources n'apparaissent pas sur la carte",
          answer: "Vérifiez votre niveau d'exploration. Utilisez 'Explorer la Zone' pour révéler les ressources cachées. Certaines ressources magiques nécessitent niveau 3+."
        },
        {
          question: "Je ne peux pas me déplacer sur certains terrains",
          answer: "Les eaux profondes et peu profondes bloquent le déplacement à pied. Certains terrains comme les volcans coûtent beaucoup de PA (8 sans réduction)."
        },
        {
          question: "Mes objets achetés n'apparaissent pas",
          answer: "Les ressources vont automatiquement dans votre trésorerie. Les objets uniques apparaissent dans votre inventaire avatar accessible en cliquant sur votre personnage."
        },
        {
          question: "Le marketplace ne se charge pas",
          answer: "Vérifiez votre connexion internet. Le marketplace synchronise en temps réel avec le serveur. Essayez de fermer et rouvrir le panneau."
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
        <div className="font-medium text-sm mb-2">Actions Rapides</div>
        <div className="space-y-1">
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            📖 Ouvrir le Guide de Jeu complet
          </button>
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            ⚖️ Accéder au Marché Publique
          </button>
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            💰 Consulter la Trésorerie
          </button>
          <button className="w-full text-left p-2 bg-amber-100 hover:bg-amber-200 rounded text-xs">
            🎯 Voir l'inventaire Avatar
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Statut du Jeu</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Version Nova Imperium:</span>
            <span>2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Système d'exploration:</span>
            <span className="text-green-600">✓ 5 niveaux</span>
          </div>
          <div className="flex justify-between">
            <span>Marché Publique:</span>
            <span className="text-green-600">✓ Actif</span>
          </div>
          <div className="flex justify-between">
            <span>Ressources magiques:</span>
            <span className="text-green-600">✓ Disponibles</span>
          </div>
          <div className="flex justify-between">
            <span>Sécurité coordonnées:</span>
            <span className="text-green-600">✓ Protégées</span>
          </div>
        </div>
      </div>
    </div>
  );
}