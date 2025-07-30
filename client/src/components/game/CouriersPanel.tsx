import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { getUnitRecruitmentCost } from "../../lib/game/ActionPointsCosts";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  read: boolean;
  type: 'message' | 'alliance' | 'trade' | 'warning';
}

export function CouriersPanel() {
  const { currentNovaImperium, novaImperiums } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'message' | 'alliance' | 'trade' | 'warning'>('message');
  const [showCompose, setShowCompose] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!currentNovaImperium) return null;

  const otherPlayers = novaImperiums.filter(ni => ni.id !== currentNovaImperium.id);
  const courierCost = 3; // Coût en PA pour envoyer un message

  // Charger les messages au démarrage
  useEffect(() => {
    loadMessages();
    // Recharger les messages toutes les 5 secondes
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [currentNovaImperium.id]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${currentNovaImperium.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'alliance': return '🤝';
      case 'trade': return '💰';
      case 'warning': return '⚠️';
      default: return '📜';
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'alliance': return 'text-green-600';
      case 'trade': return 'text-yellow-600';
      case 'warning': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const sendMessage = async () => {
    if (!selectedRecipient || !messageContent.trim()) return;
    
    if (actionPoints < courierCost) {
      alert('Pas assez de Points d\'Action pour envoyer un courrier (3 PA requis)');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: currentNovaImperium.id,
          to: selectedRecipient,
          content: messageContent,
          type: messageType,
          read: false
        })
      });

      if (response.ok) {
        const success = spendActionPoints(courierCost);
        if (success) {
          setMessageContent('');
          setShowCompose(false);
          await loadMessages(); // Recharger les messages
          console.log(`Message envoyé à ${selectedRecipient} pour ${courierCost} PA`);
        }
      } else {
        console.error('Erreur lors de l\'envoi du message');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const receivedMessages = messages.filter(msg => msg.to === currentNovaImperium.id);
  const sentMessages = messages.filter(msg => msg.from === currentNovaImperium.id);

  const markAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: currentNovaImperium.id
        })
      });

      if (response.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        ));
      }
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Courriers & Messages</h4>
        <div className="text-xs text-gray-600">
          Coût d'envoi: {courierCost} ⚡ Points d'Action
        </div>
      </div>

      {/* Compose Message */}
      {showCompose ? (
        <div className="bg-blue-50 border border-blue-300 rounded p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Nouveau Message</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCompose(false)}
                className="text-xs"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Destinataire:</label>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="w-full text-xs p-1 border rounded"
                >
                  <option value="">Sélectionner un joueur</option>
                  {otherPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Type:</label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="w-full text-xs p-1 border rounded"
                >
                  <option value="message">📜 Message</option>
                  <option value="alliance">🤝 Alliance</option>
                  <option value="trade">💰 Commerce</option>
                  <option value="warning">⚠️ Avertissement</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Message:</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full text-xs p-2 border rounded h-20 resize-none"
                  placeholder="Écrivez votre message..."
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {messageContent.length}/200 caractères
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCompose(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={sendMessage}
                disabled={!selectedRecipient || !messageContent.trim() || actionPoints < courierCost || isLoading}
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Envoi...' : `Envoyer (${courierCost} ⚡)`}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Button
            size="sm"
            onClick={() => setShowCompose(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700"
          >
            📝 Nouveau Message
          </Button>
        </div>
      )}

      {/* Messages reçus */}
      <div className="bg-green-50 border border-green-300 rounded p-3">
        <div className="text-sm font-medium mb-2">
          Messages Reçus ({receivedMessages.filter(m => !m.read).length} non lus)
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {receivedMessages.length === 0 ? (
            <div className="text-xs text-gray-500 italic">Aucun message reçu</div>
          ) : (
            receivedMessages.map(msg => {
              const sender = novaImperiums.find(ni => ni.id === msg.from);
              return (
                <div
                  key={msg.id}
                  className={`p-2 rounded text-xs ${
                    msg.read ? 'bg-gray-100' : 'bg-white border border-green-400'
                  }`}
                  onClick={() => markAsRead(msg.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      <span>{getMessageIcon(msg.type)}</span>
                      <span className="font-medium">{sender?.name}</span>
                      {!msg.read && <span className="text-green-600">●</span>}
                    </div>
                    <span className="text-gray-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className={`${getMessageColor(msg.type)}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Messages envoyés */}
      <div className="bg-amber-50 border border-amber-300 rounded p-3">
        <div className="text-sm font-medium mb-2">
          Messages Envoyés ({sentMessages.length})
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {sentMessages.length === 0 ? (
            <div className="text-xs text-gray-500 italic">Aucun message envoyé</div>
          ) : (
            sentMessages.map(msg => {
              const recipient = novaImperiums.find(ni => ni.id === msg.to);
              return (
                <div key={msg.id} className="p-2 bg-white rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      <span>{getMessageIcon(msg.type)}</span>
                      <span className="font-medium">À: {recipient?.name}</span>
                    </div>
                    <span className="text-gray-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className={`${getMessageColor(msg.type)}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-gray-50 border border-gray-300 rounded p-3">
        <div className="text-sm font-medium mb-2">Statistiques</div>
        <div className="text-xs space-y-1">
          <div>Total messages reçus: {receivedMessages.length}</div>
          <div>Total messages envoyés: {sentMessages.length}</div>
          <div>Messages non lus: {receivedMessages.filter(m => !m.read).length}</div>
          <div>Coût total envois: {sentMessages.length * courierCost} PA</div>
        </div>
      </div>

      {/* Tests de Messagerie */}
      <div className="bg-blue-50 border border-blue-300 rounded p-3">
        <div className="text-sm font-medium mb-2">🧪 Tests de Messagerie</div>
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={async () => {
              try {
                const response = await fetch('/api/messages/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ playerName: 'Joueur Mystérieux' })
                });
                if (response.ok) {
                  loadMessages();
                }
              } catch (error) {
                console.error('Erreur test message:', error);
              }
            }}
          >
            Recevoir un message aléatoire
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={async () => {
              const playerNames = ['Empereur Maximus', 'Reine Elizaveta', 'Général Spartacus', 'Marchande Aria'];
              const randomName = playerNames[Math.floor(Math.random() * playerNames.length)];
              try {
                const response = await fetch('/api/messages/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ playerName: randomName })
                });
                if (response.ok) {
                  loadMessages();
                }
              } catch (error) {
                console.error('Erreur test joueur:', error);
              }
            }}
          >
            Message d'un autre joueur
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={async () => {
              try {
                const response = await fetch('/api/messages/test/custom', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    from: 'Dragon Ancien', 
                    content: 'Mortel, tes terres m\'intéressent. Acceptes-tu de négocier ou préfères-tu que je les prenne par la force ?',
                    type: 'warning'
                  })
                });
                if (response.ok) {
                  loadMessages();
                }
              } catch (error) {
                console.error('Erreur message dragon:', error);
              }
            }}
          >
            Message épique (Dragon)
          </Button>
        </div>
      </div>
    </div>
  );
}