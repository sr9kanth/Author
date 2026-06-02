export type UserRole =
  | "administrator"
  | "assessment_manager"
  | "author"
  | "reviewer"
  | "auditor"
  | "read_only";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ContentType =
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv"
  | "html"
  | "url"
  | "markdown"
  | "text";

export type AssetStatus = "uploaded" | "processing" | "processed" | "failed";

export interface KnowledgeAsset {
  id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  storage_path: string | null;
  file_size: number | null;
  extracted_topics: Record<string, unknown> | null;
  extracted_concepts: Record<string, unknown> | null;
  extracted_outcomes: Record<string, unknown> | null;
  keywords: string[] | null;
  status: AssetStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Framework {
  id: string;
  name: string;
  description: string | null;
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentConfiguration {
  id: string;
  name: string;
  description: string | null;
  question_types: string[];
  difficulty_levels: Record<string, number>;
  cognitive_levels: Record<string, number>;
  question_count: number;
  reading_level: string;
  language: string;
  audience: string | null;
  jurisdiction: string | null;
  duration_minutes: number;
  framework_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  status: JobStatus;
  configuration_id: string | null;
  knowledge_asset_ids: string[];
  ai_provider: string;
  ai_model: string;
  prompt_version: string;
  celery_task_id: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export type ContentStatus =
  | "draft"
  | "generated"
  | "validated"
  | "under_review"
  | "approved"
  | "published"
  | "archived";

export interface GeneratedContent {
  id: string;
  job_id: string;
  content_type: string;
  body: string;
  metadata: Record<string, unknown>;
  framework_alignment: Record<string, unknown>;
  source_references: unknown[];
  ai_provider: string;
  ai_model: string;
  prompt_version: string;
  status: ContentStatus;
  validation_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  validator_name: string;
  score: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

export type WorkflowState =
  | "draft"
  | "generated"
  | "validated"
  | "under_review"
  | "approved"
  | "published"
  | "archived";

export interface WorkflowStatus {
  id: string;
  content_id: string;
  current_state: WorkflowState;
  assigned_reviewer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
}
