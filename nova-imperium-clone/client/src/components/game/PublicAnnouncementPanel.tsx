import { useState } from "react";
import { Button } from "../ui/button";

export function PublicAnnouncementPanel() {
  const [announcements] = useState([
    { 
      id: 1, 
      title: "Nouvelle Loi sur le Commerce", 
      content: "Tous les marchands doivent désormais s'enregistrer auprès des autorités locales", 
      date: "Tour 16", 
      priority: "high",
      audience: "Marchands"
    },
    { 
      id: 2, 
      title: "Célébration de la Victoire", 
      content: "Nous célébrons la victoire de nos braves soldats contre les barbares", 
      date: "Tour 15", 
      priority: "medium",
      audience: "Tous les citoyens"
    },
    { 
      id: 3, 
      title: "Travaux de Construction", 
      content: "De nouveaux travaux commenceront dans le quartier nord de la ville", 
      date: "Tour 14", 
      priority: "low",
      audience: "Habitants du nord"
    }
  ]);

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "medium",
    audience: "Tous les citoyens"
  });

  const [showCreateForm, setShowCreateForm] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleCreateAnnouncement = () => {
    if (newAnnouncement.title && newAnnouncement.content) {
      // Here you would implement the actual announcement creation logic
      console.log('Creating announcement:', newAnnouncement);
      setNewAnnouncement({
        title: "",
        content: "",
        priority: "medium",
        audience: "Tous les citoyens"
      });
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Annonces Publiques</h4>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium text-sm">Annonces Actives</div>
          <Button 
            size="sm" 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs bg-amber-600 hover:bg-amber-700"
          >
            {showCreateForm ? 'Annuler' : '+ Nouvelle'}
          </Button>
        </div>

        {showCreateForm && (
          <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Titre de l'annonce"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="w-full p-2 text-xs border border-amber-400 rounded"
              />
              <textarea
                placeholder="Contenu de l'annonce"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                rows={3}
                className="w-full p-2 text-xs border border-amber-400 rounded"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                  className="p-2 text-xs border border-amber-400 rounded"
                >
                  <option value="low">Priorité Basse</option>
                  <option value="medium">Priorité Moyenne</option>
                  <option value="high">Priorité Haute</option>
                </select>
                <input
                  type="text"
                  placeholder="Public cible"
                  value={newAnnouncement.audience}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, audience: e.target.value})}
                  className="p-2 text-xs border border-amber-400 rounded"
                />
              </div>
              <Button 
                size="sm" 
                onClick={handleCreateAnnouncement}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                Publier l'annonce
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {announcements.map(announcement => (
            <div 
              key={announcement.id} 
              className={`p-3 rounded border-2 ${getPriorityColor(announcement.priority)}`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-sm">{getPriorityIcon(announcement.priority)}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-sm">{announcement.title}</div>
                    <div className="text-xs text-gray-600">{announcement.date}</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{announcement.content}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Public: {announcement.audience}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Impact des Annonces</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Moral des citoyens:</span>
            <span className="text-green-600 font-bold">+5%</span>
          </div>
          <div className="flex justify-between">
            <span>Conformité aux lois:</span>
            <span className="text-green-600 font-bold">+10%</span>
          </div>
          <div className="flex justify-between">
            <span>Annonces actives:</span>
            <span className="font-bold">{announcements.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Actions Rapides</div>
        <div className="space-y-1">
          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-xs">
            📢 Proclamer un jour de fête
          </Button>
          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-xs">
            ⚖️ Annoncer nouvelle loi
          </Button>
          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-xs">
            🎖️ Honorer des héros
          </Button>
        </div>
      </div>
    </div>
  );
}