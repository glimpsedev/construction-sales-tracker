import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FilterPreferences } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";

export function useFilterPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery<FilterPreferences>({
    queryKey: ['/api/user/filter-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/filter-preferences', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch filter preferences: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (preferences: FilterPreferences) => {
      const response = await fetch('/api/user/filter-preferences', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        const error = await response.json().catch(() => ({ error: 'Failed to update preferences' }));
        throw new Error(error.error || 'Failed to update filter preferences');
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and immediately refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['/api/user/filter-preferences'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/filter-preferences'] });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: updateMutation.mutate,
    updatePreferencesAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    refetch: query.refetch,
  };
}
