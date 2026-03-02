import { useQuery } from "@tanstack/react-query";
import type { Interaction } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";

export interface InteractionWithDetails extends Interaction {
  contactName?: string | null;
  companyName?: string | null;
}

export interface InteractionFilters {
  type?: string;
  direction?: string;
  companyId?: string;
  contactId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface CrmOverviewCompany {
  id: string;
  name: string;
  type: string | null;
  contactCount: number;
  interactionCount: number;
  lastInteractionAt: string | null;
  linkedJobCount: number;
  pipelineValue: number;
  linkedJobs: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
    temperature: string | null;
    projectValue: string | null;
  }>;
}

export interface CrmOverview {
  companies: CrmOverviewCompany[];
  totalCompanies: number;
  totalContacts: number;
  totalInteractions: number;
  interactionsThisMonth: number;
  staleCount: number;
  totalPipelineValue: number;
}

export function useInteractions(filters: InteractionFilters = {}) {
  return useQuery<InteractionWithDetails[]>({
    queryKey: ["/api/interactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.direction) params.append("direction", filters.direction);
      if (filters.companyId) params.append("companyId", filters.companyId);
      if (filters.contactId) params.append("contactId", filters.contactId);
      if (filters.search) params.append("search", filters.search);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.limit) params.append("limit", String(filters.limit));
      if (filters.offset) params.append("offset", String(filters.offset));

      const url = `/api/interactions${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch interactions");
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCrmOverview() {
  return useQuery<CrmOverview>({
    queryKey: ["/api/crm/overview"],
    queryFn: async () => {
      const response = await fetch("/api/crm/overview", {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch CRM overview");
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}
