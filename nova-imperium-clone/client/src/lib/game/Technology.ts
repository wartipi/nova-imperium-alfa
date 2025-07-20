export interface Technology {
  id: string;
  name: string;
  cost: number;
  description: string;
  prerequisites: string[];
  era: string;
}

export function getTechTree(): Record<string, Technology[]> {
  return {
    ancient: [
      {
        id: 'agriculture',
        name: 'Agriculture',
        cost: 50,
        description: 'Allows farming and granary construction',
        prerequisites: [],
        era: 'ancient'
      },
      {
        id: 'pottery',
        name: 'Pottery',
        cost: 80,
        description: 'Enables granary and cottage construction',
        prerequisites: ['agriculture'],
        era: 'ancient'
      },
      {
        id: 'bronze_working',
        name: 'Bronze Working',
        cost: 100,
        description: 'Enables bronze weapons and tools',
        prerequisites: [],
        era: 'ancient'
      },
      {
        id: 'writing',
        name: 'Writing',
        cost: 120,
        description: 'Allows libraries and enables research',
        prerequisites: ['pottery'],
        era: 'ancient'
      },
      {
        id: 'iron_working',
        name: 'Iron Working',
        cost: 150,
        description: 'Enables iron weapons and tools',
        prerequisites: ['bronze_working'],
        era: 'ancient'
      }
    ],
    classical: [
      {
        id: 'mathematics',
        name: 'Mathematics',
        cost: 200,
        description: 'Enables advanced construction and catapults',
        prerequisites: ['writing'],
        era: 'classical'
      },
      {
        id: 'currency',
        name: 'Currency',
        cost: 180,
        description: 'Enables markets and trade routes',
        prerequisites: ['bronze_working'],
        era: 'classical'
      },
      {
        id: 'construction',
        name: 'Construction',
        cost: 250,
        description: 'Enables aqueducts and bridges',
        prerequisites: ['mathematics', 'iron_working'],
        era: 'classical'
      }
    ],
    medieval: [
      {
        id: 'feudalism',
        name: 'Feudalism',
        cost: 300,
        description: 'Enables longbowmen and castles',
        prerequisites: ['currency'],
        era: 'medieval'
      },
      {
        id: 'machinery',
        name: 'Machinery',
        cost: 350,
        description: 'Enables crossbows and windmills',
        prerequisites: ['construction'],
        era: 'medieval'
      }
    ]
  };
}
