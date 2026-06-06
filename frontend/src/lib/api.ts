import { clearTokens, getAccessToken, getRefreshToken, isTokenExpired, setTokens } from "@/lib/auth";
import type {
  ActivityItem,
  AssessmentConfiguration,
  AssessmentItem,
  AssessmentPackage,
  DashboardAnalytics,
  DashboardStats,
  Framework,
  GeneratedContent,
  GenerationJob,
  Guide,
  KnowledgeAsset,
  MetadataDimension,
  PaginatedList,
  User,
  ValidationResult,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_PREFIX = `${BASE_URL}/api/v1`;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_PREFIX}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = (await res.json()) as { access_token: string; refresh_token: string };
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = getAccessToken();

  if (token && isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_PREFIX}${path}`, { ...init, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Multipart upload — must NOT set Content-Type so the browser adds the
// multipart boundary itself. Mirrors request()'s auth/refresh handling.
async function upload<T>(path: string, formData: FormData): Promise<T> {
  let token = getAccessToken();

  if (token && isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, full_name: string, role = "author") =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role }),
    }),

  me: () => request<User>("/auth/me"),
};

// ---- Knowledge ----
export const knowledgeApi = {
  list: (skip = 0, limit = 20) =>
    request<PaginatedList<KnowledgeAsset>>(`/knowledge?skip=${skip}&limit=${limit}`),
  get: (id: string) => request<KnowledgeAsset>(`/knowledge/${id}`),
  create: (data: { title: string; description?: string; content_type: string }) =>
    request<KnowledgeAsset>("/knowledge", { method: "POST", body: JSON.stringify(data) }),
  uploadFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return upload<KnowledgeAsset>(`/knowledge/${id}/upload`, fd);
  },
  delete: (id: string) => request<void>(`/knowledge/${id}`, { method: "DELETE" }),
};

// ---- Frameworks ----
export const frameworksApi = {
  list: (skip = 0, limit = 20) =>
    request<PaginatedList<Framework>>(`/frameworks?skip=${skip}&limit=${limit}`),
  get: (id: string) => request<Framework>(`/frameworks/${id}`),
  create: (data: { name: string; description?: string; version?: string }) =>
    request<Framework>("/frameworks", { method: "POST", body: JSON.stringify(data) }),
};

// ---- Configurations ----
export const configurationsApi = {
  list: (skip = 0, limit = 20) =>
    request<PaginatedList<AssessmentConfiguration>>(`/configurations?skip=${skip}&limit=${limit}`),
  get: (id: string) => request<AssessmentConfiguration>(`/configurations/${id}`),
  create: (data: Partial<AssessmentConfiguration>) =>
    request<AssessmentConfiguration>("/configurations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---- Generation ----
export const generationApi = {
  listJobs: (skip = 0, limit = 20) =>
    request<PaginatedList<GenerationJob>>(`/generation/jobs?skip=${skip}&limit=${limit}`),
  getJob: (id: string) => request<GenerationJob>(`/generation/jobs/${id}`),
  createJob: (data: {
    configuration_id?: string;
    knowledge_asset_ids?: string[];
    ai_provider?: string;
    ai_model?: string;
  }) =>
    request<GenerationJob>("/generation/jobs", { method: "POST", body: JSON.stringify(data) }),
  listContents: (jobId: string) =>
    request<PaginatedList<GeneratedContent>>(`/generation/jobs/${jobId}/contents`),
  updateContent: (id: string, data: { status?: string; body?: string }) =>
    request<GeneratedContent>(`/generation/contents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ---- Dashboard ----
export const dashboardApi = {
  stats: () => request<DashboardStats>("/dashboard/stats"),
  analytics: () => request<DashboardAnalytics>("/dashboard/analytics"),
  activity: (limit = 10) =>
    request<{ items: ActivityItem[] }>(`/dashboard/activity?limit=${limit}`),
};

// ---- Guides ----
export const guidesApi = {
  list: (frameworkId?: string) =>
    request<{ items: Guide[]; total: number }>(
      frameworkId ? `/guides?framework_id=${frameworkId}` : "/guides"
    ),
  get: (id: string) => request<Guide>(`/guides/${id}`),
  create: (data: { title: string; body: string; framework_id?: string; is_active?: boolean }) =>
    request<Guide>("/guides", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; body: string; is_active: boolean }>) =>
    request<Guide>(`/guides/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/guides/${id}`, { method: "DELETE" }),
};

// ---- Metadata ----
export const metadataApi = {
  list: (scope?: string) =>
    request<{ items: MetadataDimension[]; total: number }>(
      scope ? `/metadata?scope=${scope}` : "/metadata"
    ),
  get: (id: string) => request<MetadataDimension>(`/metadata/${id}`),
  create: (data: Partial<MetadataDimension>) =>
    request<MetadataDimension>("/metadata", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<MetadataDimension>) =>
    request<MetadataDimension>(`/metadata/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/metadata/${id}`, { method: "DELETE" }),
};

// ---- Repository ----
export const repositoryApi = {
  list: (skip = 0, limit = 20) =>
    request<PaginatedList<AssessmentItem>>(`/repository?skip=${skip}&limit=${limit}`),
  get: (id: string) => request<AssessmentItem>(`/repository/${id}`),
};

// ---- Assembly ----
export const assemblyApi = {
  list: (skip = 0, limit = 20) =>
    request<PaginatedList<AssessmentPackage>>(`/assembly?skip=${skip}&limit=${limit}`),
  get: (id: string) => request<AssessmentPackage>(`/assembly/${id}`),
  create: (data: {
    name: string;
    description?: string;
    configuration_id?: string;
    item_ids: string[];
    export_formats?: string[];
    package_metadata?: Record<string, unknown>;
  }) => request<AssessmentPackage>("/assembly", { method: "POST", body: JSON.stringify(data) }),
};

// ---- Quality ----
export const qualityApi = {
  getForContent: (contentId: string) =>
    request<ValidationResult[]>(`/quality/content/${contentId}`),
};

// ---- Orchestration ----
export const orchestrationApi = {
  listModels: () => request<{ id: string; provider: string; context_window: number }[]>("/orchestration/models"),
};

export { ApiError };
