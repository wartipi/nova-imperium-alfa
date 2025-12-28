import { db } from './db';
import { publicEventsService } from './publicEventsService';
import { marshalService } from './marshalService';
import { cartographyService } from './cartographyService';

async function seed() {
  console.log('🌱 Démarrage du seed de la base de données...');
  
  try {
    console.log('📰 Création des événements publics de démonstration...');
    await publicEventsService.initializeDemoEvents(5);
    
    console.log('🪖 Création d\'armées de test...');
    const army1 = await marshalService.createArmy({
      name: 'Légion Impériale',
      ownerId: 'player',
      units: ['unit_1', 'unit_2', 'unit_3'],
      composition: { infantry: 100, cavalry: 30, archers: 50, siege: 10 },
      totalStrength: 190,
      position: { x: 25, y: 15 }
    });
    
    const army2 = await marshalService.createArmy({
      name: 'Garde du Nord',
      ownerId: 'player',
      units: ['unit_4', 'unit_5'],
      composition: { infantry: 80, cavalry: 20, archers: 40, siege: 5 },
      totalStrength: 145,
      position: { x: 30, y: 20 }
    });
    
    console.log('🗺️ Création de régions cartographiques...');
    await cartographyService.discoverRegion('player', 25, 15, 5, 'Plaines de Vaeloria');
    await cartographyService.discoverRegion('player', 35, 20, 4, 'Forêt de Theros');
    
    console.log('✅ Seed terminé avec succès !');
    console.log(`   - Armées créées: 2`);
    console.log(`   - Régions découvertes: 2`);
    console.log(`   - Événements publics initialisés`);
    
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log('🎉 Base de données initialisée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Échec du seed:', error);
    process.exit(1);
  });
