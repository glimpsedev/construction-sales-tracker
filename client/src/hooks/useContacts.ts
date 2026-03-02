import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Contact, Company, Job, Interaction, ContactJob } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";

interface ContactFilters {
  search?: string;
  companyId?: string;
}

export function useContacts(filters: ContactFilters = {}) {
  return useQuery<Contact[]>({
    queryKey: ["/api/contacts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.companyId) params.append("companyId", filters.companyId);

      const url = `/api/contacts${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch contacts");
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useContact(id: string | null) {
  return useQuery<Contact & { jobs?: (ContactJob & { job: Job })[]; interactions?: Interaction[]; company?: Company | null }>({
    queryKey: ["/api/contacts", id],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        if (response.status === 404) throw new Error("Contact not found");
        throw new Error("Failed to fetch contact");
      }

      return response.json();
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCompanies(filters: { search?: string; type?: string } = {}) {
  return useQuery<Company[]>({
    queryKey: ["/api/companies", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.type) params.append("type", filters.type);

      const url = `/api/companies${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch companies");
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCompany(id: string | null) {
  return useQuery<Company & { contacts?: Contact[]; interactions?: Interaction[] }>({
    queryKey: ["/api/companies", id],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        if (response.status === 404) throw new Error("Company not found");
        throw new Error("Failed to fetch company");
      }

      return response.json();
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });
}

export function useUpdateContact(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id] });
    },
  });
}

export function useLogInteraction(contactId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: string; direction?: string; summary?: string; notes?: string; jobId?: string }) => {
      const response = await fetch(`/api/contacts/${contactId}/interactions`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to log interaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
    },
  });
}

export function useJobContacts(jobId: string | null) {
  return useQuery({
    queryKey: ["/api/jobs", jobId, "contacts"],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/contacts`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch job contacts");
      }
      return response.json();
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

export function useAssignContactToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { contactId: string; jobId: string; role?: string }) => {
      const response = await fetch(`/api/contacts/${params.contactId}/jobs/${params.jobId}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: params.role || "other" }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to assign contact to job");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "contacts"] });
    },
  });
}

export function useRemoveContactFromJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { contactId: string; jobId: string }) => {
      const response = await fetch(`/api/contacts/${params.contactId}/jobs/${params.jobId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to remove contact from job");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.jobId, "contacts"] });
    },
  });
}
