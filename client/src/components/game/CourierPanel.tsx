import { useState } from "react";
import { Button } from "../ui/button";

export function CourierPanel() {
  const [messages] = useState([
    { id: 1, from: "Conseil Royal", subject: "Rapport de territoire", content: "Nouvelles terres découvertes à l'est", read: false, date: "Tour 15" },
    { id: 2, from: "Général Marcus", subject: "Rapport militaire", content: "Nos forces sont prêtes pour la bataille", read: true, date: "Tour 14" },
    { id: 3, from: "Architecte en Chef", subject: "Construction terminée", content: "La bibliothèque de Rome est achevée", read: true, date: "Tour 13" }
  ]);

  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Courrier</h4>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Messages Reçus</div>
        <div className="space-y-1">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`p-2 rounded cursor-pointer transition-colors ${
                !message.read ? 'bg-amber-200 border-l-4 border-amber-600' : 'bg-amber-100'
              } ${selectedMessage === message.id ? 'ring-2 ring-amber-600' : ''}`}
              onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-xs font-medium">{message.from}</div>
                  <div className="text-xs text-amber-700">{message.subject}</div>
                </div>
                <div className="text-xs text-amber-600">{message.date}</div>
              </div>
              
              {selectedMessage === message.id && (
                <div className="mt-2 pt-2 border-t border-amber-300">
                  <div className="text-xs">{message.content}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Actions</div>
        <div className="space-y-2">
          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
            📝 Écrire un message
          </Button>
          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
            📋 Voir tous les messages
          </Button>
          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
            🗑️ Supprimer les messages lus
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Statut</div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Messages non lus:</span>
            <span className="font-bold">{messages.filter(m => !m.read).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total des messages:</span>
            <span>{messages.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}