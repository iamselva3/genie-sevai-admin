import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Category, City } from './types';

export function useCities() {
  return useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: () => api<{ cities: City[] }>('/admin/cities').then((r) => r.cities),
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<{ categories: Category[] }>('/admin/categories').then((r) => r.categories),
    staleTime: 60_000,
  });
}

export const asOptions = <T extends { id: string; name: string }>(list: T[] | undefined) =>
  (list || []).map((x) => ({ value: x.id, label: x.name }));
