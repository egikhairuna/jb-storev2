import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useCartStore } from '@/store/cart.store';

export function useSyncProducts() {
  const queryClient = useQueryClient();
  const setProducts = useCartStore(state => state.setProducts);

  const mutation = useMutation({
    mutationFn: async (force?: boolean) => {
      const res = await fetch(`/api/sync/products${force ? '?force=true' : ''}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Sync failed');
      return json;
    },
    onSuccess: (data) => {
      // Immediately update Zustand store with fresh data
      if (data && data.data) {
        setProducts(data.data);
      }

      // Force refetch all product queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products(),
        refetchType: 'active',
      });
      // Also refetch immediately
      queryClient.refetchQueries({
        queryKey: QUERY_KEYS.products(),
        type: 'active',
      });
    }
  });

  return {
    sync: (force?: boolean) => mutation.mutate(force),
    isSyncing: mutation.isPending,
    status: mutation.status,
    lastSyncedAt: null,
  };
}
