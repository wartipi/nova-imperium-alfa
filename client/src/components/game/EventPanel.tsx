import { useState } from "react";
import { Button } from "../ui/button";

export function EventPanel() {
  const [events] = useState([
    { 
      id: 1, 
      title: "Découverte de ressources", 
      description: "Vos explorateurs ont découvert une mine d'or près de Rome", 
      type: "positive", 
      choices: [
        { id: 1, text: "Exploiter immédiatement", reward: "+100 Or" },
        { id: 2, text: "Étudier d'abord", reward: "+50 Science" }
      ],
      resolved: false
    },
    { 
      id: 2, 
      title: "Épidémie dans la ville", 
      description: "Une maladie se propage dans une de vos villes", 
      type: "negative", 
      choices: [
        { id: 1, text: "Quarantaine stricte", reward: "-10 Population, +Sécurité" },
        { id: 2, text: "Soins médicaux", reward: "-50 Or, +Santé" }
      ],
      resolved: false
    },
    { 
      id: 3, 
      title: "Ambassade étrangère", 
      description: "Les Grecs proposent un accord commercial", 
      type: "neutral", 
      choices: [
        { id: 1, text: "Accepter l'accord", reward: "+20 Or/tour" },
        { id: 2, text: "Refuser poliment", reward: "Pas de changement" }
      ],
      resolved: true
    }
  ]);

  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);

  const handleEventChoice = (eventId: number, choiceId: number) => {
    console.log(`Event ${eventId}, Choice ${choiceId} selected`);
    // Here you would implement the actual event resolution logic
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'positive': return '✨';
      case 'negative': return '⚠️';
      case 'neutral': return '📜';
      default: return '❓';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'positive': return 'border-green-500 bg-green-50';
      case 'negative': return 'border-red-500 bg-red-50';
      case 'neutral': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Événements</h4>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Événements Actifs</div>
        <div className="space-y-2">
          {events.filter(e => !e.resolved).map(event => (
            <div 
              key={event.id} 
              className={`p-3 rounded border-2 ${getEventColor(event.type)}`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getEventIcon(event.type)}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{event.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{event.description}</div>
                  
                  <div className="mt-2 space-y-1">
                    {event.choices.map(choice => (
                      <Button
                        key={choice.id}
                        size="sm"
                        onClick={() => handleEventChoice(event.id, choice.id)}
                        className="w-full text-left justify-start text-xs bg-amber-600 hover:bg-amber-700"
                      >
                        {choice.text} ({choice.reward})
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Événements Résolus</div>
        <div className="space-y-1">
          {events.filter(e => e.resolved).map(event => (
            <div 
              key={event.id} 
              className="p-2 rounded bg-amber-100 border border-amber-300"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">{getEventIcon(event.type)}</span>
                <div className="flex-1">
                  <div className="text-xs font-medium">{event.title}</div>
                  <div className="text-xs text-amber-700">Résolu</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="font-medium text-sm mb-2">Statistiques</div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Événements actifs:</span>
            <span className="font-bold">{events.filter(e => !e.resolved).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Événements résolus:</span>
            <span>{events.filter(e => e.resolved).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span>{events.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}