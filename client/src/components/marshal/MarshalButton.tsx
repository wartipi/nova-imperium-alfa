import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Sword } from 'lucide-react';
import { usePlayer } from '../../lib/stores/usePlayer';

export function MarshalButton() {
  const { player } = usePlayer();
  const [isOpen, setIsOpen] = useState(false);

  if (!player) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Sword className="h-4 w-4" />
          Maréchaux
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5" />
            Système de Maréchaux
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center py-12">
            <Sword className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Système de Maréchaux</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Le système de maréchaux permet d'embaucher des commandants pour vos armées 
              et de créer des contrats militaires avec d'autres joueurs.
            </p>
            <div className="grid gap-4 md:grid-cols-2 max-w-lg mx-auto">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Fonctionnalités</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Créer et gérer des armées</li>
                  <li>• Embaucher des maréchaux</li>
                  <li>• Contrats entre joueurs</li>
                  <li>• Campagnes militaires</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Compétences requises</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Commandement (armées)</li>
                  <li>• Traités (contrats)</li>
                  <li>• Art de la guerre (tactiques)</li>
                </ul>
              </div>
            </div>
            <Button 
              className="mt-6" 
              onClick={() => {
                console.log('Test API marshal endpoints');
                fetch('/api/marshal/armies/' + player.id)
                  .then(r => r.json())
                  .then(data => console.log('Armies:', data))
                  .catch(e => console.error('Error:', e));
              }}
            >
              Tester l'API
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}