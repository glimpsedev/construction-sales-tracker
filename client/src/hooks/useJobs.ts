import { useQuery } from "@tanstack/react-query";
import type { Job } from "@shared/schema";

interface JobFilters {
  search?: string;
  status?: string[];
  type?: string[];
  startDate?: string;
  endDate?: string;
  minValue?: string;
  maxValue?: string;
}

export function useJobs(filters: JobFilters = {}) {
  return useQuery<Job[]>({
    queryKey: ['/api/jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.type?.length) params.append('type', filters.type.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minValue) params.append('minValue', filters.minValue);
      if (filters.maxValue) params.append('maxValue', filters.maxValue);

      const url = `/api/jobs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
