import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Category, City, Coupon, Service } from './types';

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

/** Same key and shape as the Services page, so the two share one cache entry. */
export function useServices(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => api<{ services: Service[] }>('/admin/services').then((r) => r.services),
    staleTime: 60_000,
    enabled,
  });
}

/** Same key and shape as the Coupons page. */
export function useCoupons(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => api<{ coupons: Coupon[] }>('/admin/coupons').then((r) => r.coupons),
    staleTime: 60_000,
    enabled,
  });
}

export const asOptions = <T extends { id: string; name: string }>(list: T[] | undefined) =>
  (list || []).map((x) => ({ value: x.id, label: x.name }));
