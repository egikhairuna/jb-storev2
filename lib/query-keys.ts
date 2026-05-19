export const QUERY_KEYS = {
  products: (filters?: Record<string, unknown>) => ['products', filters] as const,
  categories: () => ['categories'] as const,
  productStock: (productId: string) => ['productStock', productId] as const,
  searchProducts: (query: string) => ['searchProducts', query] as const,
  orders: (filters?: Record<string, unknown>) => ['orders', filters] as const,
};
