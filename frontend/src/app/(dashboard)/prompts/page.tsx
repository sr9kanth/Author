"use client";

import { useEffect, useState } from "react";
import { promptTemplatesApi } from "@/lib/api";
import type { PromptTemplate } from "@/types";
import { PageHeader } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { CARD } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle, Copy, Zap, Loader2, X } from "lucide-react";

const TEMPLATE_TYPES = ["generation", "quality", "framework_alignment"] as const;
type TemplateType = (typeof TEMPLATE_TYPES)[number];

const TYPE_LABELS: Record<string, string> = {
  generation: "Generation",
  quality: "Quality",
  framework_alignment: "Framework Alignment",
};

const DEFAULT_SYSTEM_PROMPT =
  `You are an expert assessment author specialising in creating high-quality\nexamination questions. Your questions are accurate, unambiguous, fair, and aligned with the specified\ncognitive levels and learning outcomes.`;

const DEFAULT_USER_TEMPLATE =
  `Generate {question_count} {question_type} questions based on\nthe following knowledge content.\n\nRequirements:\n- Difficulty distribution: {difficulty_levels}\n- Cognitive levels (Bloom's Taxonomy): {cognitive_levels}\n- Reading level: {reading_level}\n- Target audience: {audience}\n- Language: {language}\n{framework_context}\n\nKnowledge Content:\n{knowledge_content}\n\nFor each question, output a JSON object with:\n  - question_type: the type of question\n  - stem: the question text\n  - options: list of answer choices (for multiple-choice / multi-select)\n  - correct_answer: the correct answer or answers\n  - rationale: explanation of the correct answer\n  - difficulty: easy | medium | hard\n  - cognitive_level: remember | understand | apply | analyse | evaluate | create\n  - keywords: list of relevant keywords\n\nReturn a JSON array of question objects only, no additional text.`;

interface FormState {
  name: string;
  version: string;
  template_type: TemplateType;
  system_prompt: string;
  user_template: string;
  notes: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  version: "1.0",
  template_type: "generation",
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  user_template: DEFAULT_USER_TEMPLATE,
  notes: "",
  is_active: false,
};

function Badge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle size={11} />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-white/[0.04] text-stone-500 border border-white/[0.06]">
      Inactive
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [activating, setActivating] = useState<string | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<PromptTemplate | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await promptTemplatesApi.list(filterType || undefined);
      setTemplates(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  async function handleCreate() {
    if (!form.name.trim() || !form.version.trim()) {
      setFormError("Name and version are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await promptTemplatesApi.create({
        name: form.name,
        version: form.version,
        template_type: form.template_type,
        system_prompt: form.system_prompt,
        user_template: form.user_template,
        notes: form.notes || undefined,
        is_active: form.is_active,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate(template: PromptTemplate) {
    setActivating(template.id);
    try {
      await promptTemplatesApi.activate(template.id);
      await load();
    } catch {
      // ignore
    } finally {
      setActivating(null);
      setConfirmActivate(null);
    }
  }

  function handleDuplicate(template: PromptTemplate) {
    setForm({
      name: `${template.name} (copy)`,
      version: template.version,
      template_type: template.template_type as TemplateType,
      system_prompt: template.system_prompt,
      user_template: template.user_template,
      notes: template.notes ?? "",
      is_active: false,
    });
    setShowForm(true);
    setFormError("");
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Prompt Templates"
        description={`${total} template${total !== 1 ? "s" : ""} — manage versioned prompts for AI generation`}
      >
        <Button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); setFormError(""); }}>
          <Plus size={16} className="mr-1.5" />
          New template
        </Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterType("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[13px] font-medium transition",
            !filterType
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "bg-white/[0.04] text-stone-400 border border-white/[0.06] hover:text-stone-200",
          )}
        >
          All
        </button>
        {TEMPLATE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[13px] font-medium transition",
              filterType === t
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-white/[0.04] text-stone-400 border border-white/[0.06] hover:text-stone-200",
            )}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className={cn(CARD, "w-full max-w-sm p-6 space-y-4")}>
            <h3 className="text-[15px] font-semibold text-white">Activate template?</h3>
            <p className="text-[13px] text-stone-400">
              <span className="text-stone-200 font-medium">{confirmActivate.name} v{confirmActivate.version}</span> will become the active{" "}
              <span className="text-stone-200">{TYPE_LABELS[confirmActivate.template_type] ?? confirmActivate.template_type}</span> template.
              Any currently active template of the same type will be deactivated.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmActivate(null)}>Cancel</Button>
              <Button
                onClick={() => handleActivate(confirmActivate)}
                disabled={activating === confirmActivate.id}
              >
                {activating === confirmActivate.id ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Zap size={14} className="mr-1.5" />}
                Activate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New template form */}
      {showForm && (
        <div className={cn(CARD, "p-6 space-y-4")}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white">New Prompt Template</h2>
            <button onClick={() => setShowForm(false)} className="text-stone-500 hover:text-stone-300 transition">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-stone-400">Name *</label>
              <input
                className={INPUT_CLS}
                placeholder="Standard MCQ v2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-stone-400">Version *</label>
              <input
                className={INPUT_CLS}
                placeholder="1.0"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-stone-400">Type</label>
              <select
                className={INPUT_CLS}
                value={form.template_type}
                onChange={(e) => setForm((f) => ({ ...f, template_type: e.target.value as TemplateType }))}
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-stone-400">System Prompt</label>
            <textarea
              className={cn(INPUT_CLS, "min-h-[120px] font-mono text-[12px]")}
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-stone-400">User Template</label>
            <textarea
              className={cn(INPUT_CLS, "min-h-[200px] font-mono text-[12px]")}
              placeholder={DEFAULT_USER_TEMPLATE}
              value={form.user_template}
              onChange={(e) => setForm((f) => ({ ...f, user_template: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-stone-400">Notes (what changed)</label>
            <textarea
              className={cn(INPUT_CLS, "min-h-[60px]")}
              placeholder="Describe changes from the previous version..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              className="rounded"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" className="text-[13px] text-stone-300 cursor-pointer">
              Activate immediately (deactivates current active template of same type)
            </label>
          </div>

          {formError && (
            <p className="text-[13px] text-red-400">{formError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
              Create Template
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={cn(CARD, "overflow-hidden")}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-500">
            <Loader2 size={22} className="animate-spin mr-2" />
            Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-500">
            <p className="text-[14px]">No prompt templates yet.</p>
            <Button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); setFormError(""); }}>
              <Plus size={14} className="mr-1.5" />
              Create first template
            </Button>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-stone-500 text-[11px] uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Version</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    "border-b border-white/[0.04] transition",
                    t.is_active ? "bg-emerald-500/[0.04]" : "hover:bg-white/[0.02]",
                  )}
                >
                  <td className="px-4 py-3 text-stone-100 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-stone-400 font-mono">{t.version}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={t.template_type} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge active={t.is_active} />
                  </td>
                  <td className="px-4 py-3 text-stone-500 max-w-[220px] truncate" title={t.notes ?? ""}>
                    {t.notes ?? <span className="italic text-stone-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDuplicate(t)}
                        title="Duplicate"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] text-stone-400 hover:text-stone-100 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition"
                      >
                        <Copy size={12} />
                        Duplicate
                      </button>
                      {!t.is_active && (
                        <button
                          onClick={() => setConfirmActivate(t)}
                          disabled={activating === t.id}
                          title="Activate"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                        >
                          {activating === t.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Zap size={12} />
                          )}
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
