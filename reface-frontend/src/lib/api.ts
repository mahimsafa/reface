import { type ProcessRecord, type PaginatedResponse } from "../types";
import { config } from "./config";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiUrl}${url}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  async upload(data: FormData): Promise<ProcessRecord> {
    return request("/api/image-processes", { method: "POST", body: data });
  },

  async queueProcess(processId: number): Promise<{ status: string; process_id: number }> {
    return request("/api/queue/process", {
      method: "POST",
      body: JSON.stringify({ process_id: processId }),
    });
  },

  async getProcessedImages(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ProcessRecord>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.page) params.set("skip", String((filters.page - 1) * (filters.limit || 10)));
    if (filters?.limit) params.set("limit", String(filters.limit));
    return request(`/api/image-processes?${params}`);
  },

  async getProcessedImage(id: number): Promise<ProcessRecord> {
    return request(`/api/image-processes/${id}`);
  },

  async retryProcess(processId: number): Promise<ProcessRecord> {
    return request(`/api/image-processes/${processId}/retry`, { method: "POST" });
  },

  async retryRestore(processId: number): Promise<ProcessRecord> {
    return request(`/api/face-restore/${processId}/retry`, { method: "POST" });
  },

  async uploadRestore(data: FormData): Promise<ProcessRecord> {
    return request("/api/face-restore", { method: "POST", body: data });
  },

  getImageUrl(path: string | null): string {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${config.apiUrl}/${path}`;
  },
};
