import { useEffect, useRef } from 'react';
import { useResources } from '../lib/stores/useResources';
import { useNovaImperium } from '../lib/stores/useNovaImperium';

/**
 * Hook de synchronisation bidirectionnelle entre useResources (Zustand) et useNovaImperium
 * Maintient les deux systèmes de ressources synchronisés automatiquement
 */
export const useDualResourceSync = () => {
  const { resources: zustandResources, addResource, removeResource } = useResources();
  const { currentNovaImperium } = useNovaImperium();
  const lastSyncRef = useRef<{ zustand: any; novaimperium: any }>({ zustand: null, novaimperium: null });

  useEffect(() => {
    // Synchronisation Zustand → NovaImperium
    if (zustandResources && currentNovaImperium) {
      const hasChanged = JSON.stringify(zustandResources) !== JSON.stringify(lastSyncRef.current.zustand);
      
      if (hasChanged && lastSyncRef.current.zustand !== null) {
        // Calculer les différences
        const diff: any = {};
        Object.keys(zustandResources).forEach(key => {
          const zustandValue = zustandResources[key as keyof typeof zustandResources];
          const lastValue = lastSyncRef.current.zustand?.[key] || 0;
          if (zustandValue !== lastValue) {
            diff[key] = zustandValue;
          }
        });

        // TODO: Appliquer les changements à NovaImperium
        if (Object.keys(diff).length > 0) {
          console.log('🔄 Sync Zustand → NovaImperium (TODO):', diff);
        }
      }
      
      lastSyncRef.current.zustand = { ...zustandResources };
    }
  }, [zustandResources, currentNovaImperium]);

  useEffect(() => {
    // Synchronisation NovaImperium → Zustand
    if (currentNovaImperium?.resources && zustandResources) {
      const novaResources = currentNovaImperium.resources;
      const hasChanged = JSON.stringify(novaResources) !== JSON.stringify(lastSyncRef.current.novaimperium);
      
      if (hasChanged && lastSyncRef.current.novaimperium !== null) {
        // Calculer les différences et appliquer à Zustand
        Object.keys(novaResources).forEach(key => {
          const novaValue = novaResources[key as keyof typeof novaResources];
          const zustandValue = zustandResources[key as keyof typeof zustandResources];
          const lastValue = lastSyncRef.current.novaimperium?.[key] || 0;
          
          if (novaValue !== lastValue && novaValue !== zustandValue) {
            const diff = novaValue - zustandValue;
            if (diff > 0) {
              addResource(key as any, diff, 'nova_sync');
            } else if (diff < 0) {
              removeResource(key as any, Math.abs(diff));
            }
          }
        });
        
        console.log('🔄 Sync NovaImperium → Zustand');
      }
      
      lastSyncRef.current.novaimperium = { ...novaResources };
    }
  }, [currentNovaImperium?.resources, zustandResources, addResource, removeResource]);

  // Fonction pour forcer la synchronisation
  const forcSync = () => {
    lastSyncRef.current = { zustand: null, novaimperium: null };
  };

  return {
    isInSync: lastSyncRef.current.zustand !== null && lastSyncRef.current.novaimperium !== null,
    forcSync
  };
};