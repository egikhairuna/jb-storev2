import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import type { Product } from '@/types/pos';

export function useProducts(filters?: { 
  search?: string; 
  page?: number; 
  per_page?: number 
}) {
  const page = filters?.page || 1;
  const per_page = filters?.per_page || 24;

  return useQuery({
    queryKey: QUERY_KEYS.products({ ...filters, page, per_page }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters?.search) searchParams.append('search', filters.search);
      searchParams.append('page', page.toString());
      searchParams.append('per_page', per_page.toString());
      
      const res = await fetch(`/api/products?${searchParams.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return {
        data: json.data as Product[],
        total: json.total as number,
        page,
        per_page,
      };
    },
    staleTime: 30_000,
  });
}

export function useProductStock(productId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.productStock(productId),
    queryFn: async () => {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/stock`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { product_id: number; stock_quantity: number; stock_status: string };
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
    enabled: !!productId,
  });
}

export function useSearchProducts(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  return useQuery({
    queryKey: QUERY_KEYS.searchProducts(debouncedQuery),
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedQuery)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Product[];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });
}
