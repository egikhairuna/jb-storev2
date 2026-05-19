import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';

export interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories(),
    queryFn: async () => {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const realCategories = json.data as Category[];
      return [
        { id: 0, name: 'Semua', slug: 'semua' },
        ...realCategories
      ];
    },
    staleTime: 300_000, // 5 minutes
  });
}
