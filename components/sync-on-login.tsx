'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSyncProducts } from '@/hooks/use-sync';
import { useOrders } from '@/hooks/use-orders';

export function SyncOnLogin() {
  const { status } = useSession();
  const { sync } = useSyncProducts();
  
  // 3. Load orders separately
  useOrders();

  const hasSynced = useRef(false);

  useEffect(() => {
    // 1. User authenticates
    if (status === 'authenticated' && !hasSynced.current) {
      hasSynced.current = true;
      // 2. Call useSyncProducts()
      sync();
    }
  }, [status, sync]);

  return null;
}
