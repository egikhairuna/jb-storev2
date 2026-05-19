import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useCartStore } from '@/store/cart.store';
import type { CreateOrderRequest } from '@/types/api-schemas';
import type { POSOrder } from '@/types/pos';

interface CreateOrderMutationArgs {
  payload: CreateOrderRequest;
  posOrderDraft: Omit<POSOrder, 'offline_id' | 'status' | 'created_at'>;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { queueOrder, clearCart } = useCartStore();

  return useMutation({
    mutationFn: async ({ payload, posOrderDraft }: CreateOrderMutationArgs) => {
      const offline_id = crypto.randomUUID();
      
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, offline_id }),
        });
        
        const json = await res.json();
        
        if (res.status === 409 && json.error === 'STOCK_INSUFFICIENT') {
          return { error: 'STOCK_INSUFFICIENT', items: json.items };
        }
        
        if (!json.success) {
          throw new Error(json.error || 'Failed to create order');
        }
        
        return json;
      } catch (err) {
        queueOrder({
          ...posOrderDraft,
          offline_id,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data && !data.error) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products(), refetchType: 'active' });
        clearCart();
      }
    }
  });
}

export function useOrders(filters?: { 
  page?: number; 
  per_page?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.orders(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters?.page) searchParams.append('page', filters.page.toString());
      if (filters?.per_page) searchParams.append('per_page', (filters.per_page || 20).toString());
      if (filters?.status && filters.status !== 'all') searchParams.append('status', filters.status);
      if (filters?.search) searchParams.append('search', filters.search);
      
      const res = await fetch(`/api/orders?${searchParams.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json as { data: any[]; total: number };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCleanupOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/orders/cleanup', { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders() });
      console.log('[cleanup] Deleted:', data.deleted, 'orders');
    }
  });
}
