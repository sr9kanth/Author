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
  PromptTemplate,
  ReviewComment,
  Stimulus,
  User,
  ValidationResult,
  WorkflowEvent,
  WorkflowState,
  WorkflowStatus,
} from "@/types";

// Same-origin proxy: all API calls go through the Next.js server
// (see next.config.mjs rewrites), which forwards to the backend. This
// eliminates cross-origin requests entirely, so CORS can never break
// create/upload/fetch operations. Works identically in local Docker and
// in production as long as BACKEND_URL is set on the frontend service.
const API_PREFIX = "/api/proxy/v1";

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
  delete: (id: string) => request<void>(`/frameworks/${id}`, { method: "DELETE" }),
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
  update: (id: string, data: Partial<AssessmentConfiguration>) =>
    request<AssessmentConfiguration>(`/configurations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<void>(`/configurations/${id}`, { method: "DELETE" }),
};

// ---- Generation ----
export const generationApi = {
  listJobs: (skip = 0, limit = 20) =>
    request<PaginatedList<GenerationJob>>(`/generation/jobs?skip=${skip}&limit=${limit}`),
  getJob: (id: string) => request<GenerationJob>(`/generation/jobs/${id}`),
  createJob: (data: {
    configuration_id?: string;
    framework_id?: string;
    question_count?: number;
    question_types?: string[];
    difficulty_levels?: Record<string, number>;
    cognitive_levels?: Record<string, number>;
    reading_level?: string;
    instructions?: string;
    knowledge_asset_ids?: string[];
    ai_provider?: string;
    ai_model?: string;
    stimulus_id?: string;
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
  create: (data: { content_id: string; item_code?: string; tags?: string[]; notes?: string }) =>
    request<AssessmentItem>("/repository", { method: "POST", body: JSON.stringify(data) }),
  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return upload<{ imported: number; errors: string[] }>("/repository/import", fd);
  },
  exportQti: (params?: { job_id?: string; framework_id?: string }): string => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : "";
    return `${API_PREFIX}/repository/export/qti${qs ? "?" + qs : ""}`;
    // caller uses: window.location.href = repositoryApi.exportQti(...)
  },
};

// ---- Workflow ----
export const workflowApi = {
  get: (contentId: string) =>
    request<WorkflowStatus>(`/workflow/content/${contentId}`),
  transition: (contentId: string, toState: WorkflowState, notes?: string) =>
    request<WorkflowStatus>(`/workflow/content/${contentId}/transition`, {
      method: "POST",
      body: JSON.stringify({ to_state: toState, notes }),
    }),
  events: (contentId: string) =>
    request<WorkflowEvent[]>(`/workflow/content/${contentId}/events`),
  addComment: (contentId: string, body: string) =>
    request<ReviewComment>(`/workflow/content/${contentId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
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

// ---- Stimuli ----
export const stimuliApi = {
  list: () => request<Stimulus[]>("/stimuli"),
  get: (id: string) => request<Stimulus>(`/stimuli/${id}`),
  create: (data: { title: string; body: string; stimulus_type?: string }) =>
    request<Stimulus>("/stimuli", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/stimuli/${id}`, { method: "DELETE" }),
};

// ---- Quality ----
export const qualityApi = {
  getForContent: (contentId: string) =>
    request<ValidationResult[]>(`/quality/content/${contentId}`),
};

// ---- Orchestration ----
export const orchestrationApi = {
  listModels: () =>
    request<{ id: string; provider: string; context_window: number; key_configured: boolean }[]>(
      "/orchestration/models",
    ),
};

// ---- Settings ----
export interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  masked_key: string | null;
}

export const settingsApi = {
  getApiKeys: () => request<ApiKeyStatus[]>("/settings/api-keys"),
  saveApiKey: (provider: string, api_key: string) =>
    request<ApiKeyStatus[]>("/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ provider, api_key }),
    }),
};

// ---- Prompt Templates ----
export const promptTemplatesApi = {
  list: (type?: string) => request<PaginatedList<PromptTemplate>>(`/prompt-templates${type ? `?template_type=${type}` : ""}`),
  get: (id: string) => request<PromptTemplate>(`/prompt-templates/${id}`),
  create: (data: Partial<PromptTemplate>) => request<PromptTemplate>("/prompt-templates", { method: "POST", body: JSON.stringify(data) }),
  activate: (id: string) => request<PromptTemplate>(`/prompt-templates/${id}/activate`, { method: "PATCH" }),
  getActive: (type: string) => request<PromptTemplate>(`/prompt-templates/active?type=${type}`),
};

export { ApiError };
