import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { Job } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";

interface JobFilters {
  search?: string;
  status?: string[];
  startDate?: string;
  endDate?: string;
  minValue?: string;
  maxValue?: string;
  temperature?: string[];
  hideCold?: boolean;
  county?: string;
  nearMe?: boolean;
  userLat?: number;
  userLng?: number;
  company?: string;
  showUnvisited?: boolean;
  showOffices?: boolean;
}

export function useJobs(filters: JobFilters = {}) {
  // Get user location if nearMe is enabled
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  useEffect(() => {
    if (filters.nearMe && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Failed to get location:', error);
          setUserLocation(null);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setUserLocation(null);
      setLocationLoading(false);
    }
  }, [filters.nearMe]);

  return useQuery<Job[]>({
    queryKey: ['/api/jobs', filters, userLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minValue) params.append('minValue', filters.minValue);
      if (filters.maxValue) params.append('maxValue', filters.maxValue);
      if (filters.temperature && filters.temperature.length > 0) {
        params.append('temperature', filters.temperature.join(','));
      } else if (filters.temperature && filters.temperature.length === 0 && filters.showUnvisited !== true) {
        // Explicitly request no temperature matches when user deselects all temperatures
        params.append('temperature', '__none__');
      }
      if (filters.hideCold === true) params.append('cold', 'false');
      if (filters.county) params.append('county', filters.county);
      if (filters.company) params.append('company', filters.company);
      if (filters.showUnvisited === true) params.append('unvisited', 'true');
      if (filters.showOffices === false) params.append('offices', 'false');
      if (filters.showOffices === true) params.append('offices', 'true');
      
      // Only add location params if we have a location and nearMe is true
      if (filters.nearMe && userLocation) {
        params.append('nearLat', userLocation.lat.toString());
        params.append('nearLng', userLocation.lng.toString());
      }

      const url = `/api/jobs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    // Wait for location if nearMe is enabled
    enabled: !filters.nearMe || (filters.nearMe && !locationLoading)
  });
}

export function useSearchJobs(searchTerm: string) {
  return useQuery<Job[]>({
    queryKey: ['/api/jobs', 'dropdown-search', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('search', searchTerm);
      const url = `/api/jobs?${params.toString()}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to search jobs`);
      }
      return response.json();
    },
    enabled: searchTerm.trim().length > 0,
    staleTime: 30 * 1000,
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDetailedStats() {
  return useQuery({
    queryKey: ['/api/stats/detailed'],
    queryFn: async () => {
      const response = await fetch('/api/stats/detailed', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch detailed stats');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
