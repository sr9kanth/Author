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
  domain: string | null;
  status: string;
  outcomes_count: number;
  items_count: number;
  owner_name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  domains?: unknown[];
}

export interface DashboardStats {
  active_frameworks: number;
  items_generated: number;
  awaiting_review: number;
  approval_rate: number;
}

export interface ActivityItem {
  id: string;
  kind: string;
  summary: string;
  created_at: string;
}

export interface AssessmentItem {
  id: string;
  content_id: string;
  item_code: string;
  tags: string[];
  notes: string | null;
  usage_count: number;
  average_difficulty: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  stem: string | null;
  type: string | null;
  bloom: string | null;
  difficulty: string | null;
  topic: string | null;
}

export interface AssessmentPackage {
  id: string;
  name: string;
  description: string | null;
  configuration_id: string | null;
  item_ids: string[];
  export_formats: string[];
  package_metadata: Record<string, unknown>;
  status: string;
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
  stimulus_id: string | null;
  content_type: string;
  body: string;
  content_metadata: Record<string, unknown>;
  framework_alignment: Record<string, unknown>;
  source_references: unknown[];
  ai_provider: string;
  ai_model: string;
  prompt_version: string;
  status: ContentStatus;
  validation_score: number | null;
  created_at: string;
  updated_at: string;
  stimulus?: Stimulus | null;
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

export interface FunnelStage {
  name: string;
  count: number;
}

export interface DistributionSlice {
  label: string;
  count: number;
}

export interface DashboardAnalytics {
  funnel: FunnelStage[];
  by_status: DistributionSlice[];
  by_type: DistributionSlice[];
  by_difficulty: DistributionSlice[];
}

export interface Guide {
  id: string;
  title: string;
  body: string;
  framework_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type MetadataDimensionValueType = "dictionary_single" | "dictionary_multi" | "text" | "number";

export interface MetadataValue {
  value: string;
  display_title: string;
}

export interface MetadataDimension {
  id: string;
  name: string;
  key: string;
  value_type: MetadataDimensionValueType;
  dimension_values: unknown[];
  explanation: string | null;
  scopes: string[];
  source: "defined" | "library";
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Stimulus {
  id: string;
  title: string;
  body: string;
  stimulus_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
