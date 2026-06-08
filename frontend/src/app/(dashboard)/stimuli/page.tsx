"use client";

import { useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stimuliApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { Stimulus } from "@/types";
import { BookOpen, Plus, Trash2, ChevronDown } from "lucide-react";

const STIMULUS_TYPES = [
  { value: "scenario", label: "Scenario" },
  { value: "passage", label: "Passage" },
  { value: "case_study", label: "Case Study" },
  { value: "image_description", label: "Image Description" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-stone-700 dark:text-stone-200 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function StimuliPage() {
  const { data, loading, reload } = useAsync(() => stimuliApi.list(), []);
  const stimuli: Stimulus[] = data ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [stimulusType, setStimulusType] = useState("scenario");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setStimulusType("scenario");
    setError(null);
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await stimuliApi.create({ title: title.trim(), body: body.trim(), stimulus_type: stimulusType });
      resetForm();
      setShowCreate(false);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create stimulus.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this stimulus? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await stimuliApi.delete(id);
      reload();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stimuli"
        description="Manage scenario texts and passages that ground generated questions in a specific context."
      >
        <Button Icon={Plus} onClick={() => { resetForm(); setShowCreate(true); }}>
          New stimulus
        </Button>
      </PageHeader>

      {showCreate && (
        <div className={cn(CARD, "p-5 sm:p-6 mb-6 space-y-5")}>
          <h3 className="text-[15px] font-semibold text-stone-900 dark:text-white">Create stimulus</h3>

          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Community nursing case — Mrs. Chen"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Type">
            <div className="relative">
              <select
                value={stimulusType}
                onChange={(e) => setStimulusType(e.target.value)}
                className={cn(INPUT_CLS, "appearance-none pr-10")}
              >
                {STIMULUS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </Field>

          <Field label="Body">
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the scenario or passage text here. Generated questions will be grounded in this content."
              className={cn(INPUT_CLS, "resize-y")}
            />
          </Field>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowCreate(false); resetForm(); }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={cn(CARD, "py-16 text-center text-sm text-stone-400 dark:text-stone-500")}>
          Loading stimuli…
        </div>
      ) : stimuli.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            Icon={BookOpen}
            title="No stimuli yet"
            subtext="Create a scenario or passage to use as context when generating scenario-based questions."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {stimuli.map((s) => (
            <div key={s.id} className={cn(CARD, "p-5")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={15} className="shrink-0 text-indigo-400" />
                    <h3 className="text-[14px] font-semibold text-stone-900 dark:text-white truncate">{s.title}</h3>
                    <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-white/[0.07] text-stone-500 dark:text-stone-400 font-medium capitalize">
                      {s.stimulus_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-4 whitespace-pre-line">
                    {s.body}
                  </p>
                  <p className="mt-2 text-[11.5px] text-stone-400 dark:text-stone-500">
                    Created {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="shrink-0 p-2 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                  title="Delete stimulus"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
