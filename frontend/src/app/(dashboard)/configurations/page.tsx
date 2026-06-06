"use client";

import { useEffect, useRef, useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { configurationsApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { AssessmentConfiguration } from "@/types";
import { Plus, Settings2, X, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface RowMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

function RowMenu({ onEdit, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-1 z-20 w-40 rounded-xl border border-stone-200/80 dark:border-white/[0.08] bg-white dark:bg-stone-900 shadow-lg py-1"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface CreateForm {
  name: string;
  question_count: number;
  duration_minutes: number;
  language: string;
  reading_level: string;
}

const DEFAULTS: CreateForm = {
  name: "",
  question_count: 20,
  duration_minutes: 60,
  language: "en",
  reading_level: "general",
};

export default function ConfigurationsPage() {
  const { data, loading, error, reload } = useAsync(() => configurationsApi.list(0, 100), []);
  const configs: AssessmentConfiguration[] = data?.items ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  const openModal = () => {
    setEditingId(null);
    setForm(DEFAULTS);
    setSaveError(null);
    setShowModal(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const openEditModal = (c: AssessmentConfiguration) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      question_count: c.question_count,
      duration_minutes: c.duration_minutes,
      language: c.language,
      reading_level: c.reading_level,
    });
    setSaveError(null);
    setShowModal(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const closeModal = () => setShowModal(false);

  const set = (field: keyof CreateForm, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleDelete = async (c: AssessmentConfiguration) => {
    if (!window.confirm(`Delete configuration "${c.name}"? This cannot be undone.`)) return;
    try {
      await configurationsApi.delete(c.id);
      reload();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Failed to delete configuration");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      name: form.name.trim(),
      question_count: form.question_count,
      duration_minutes: form.duration_minutes,
      language: form.language,
      reading_level: form.reading_level,
    };
    try {
      if (editingId) {
        await configurationsApi.update(editingId, payload);
      } else {
        await configurationsApi.create(payload);
      }
      reload();
      closeModal();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : `Failed to ${editingId ? "update" : "create"} configuration`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configurations"
        description="Define assessment parameters — question count, duration, language, and reading level — that guide AI generation."
      >
        <Button Icon={Plus} onClick={openModal}>New configuration</Button>
      </PageHeader>

      <div className={cn(CARD, "overflow-hidden")}>
        {loading ? (
          <div className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading configurations…</div>
        ) : error ? (
          <EmptyState Icon={Settings2} title="Couldn't load configurations" subtext={error} />
        ) : configs.length === 0 ? (
          <EmptyState
            Icon={Settings2}
            title="No configurations yet"
            subtext="Create a configuration to define the parameters for your assessments."
            action={<Button Icon={Plus} onClick={openModal}>Create your first configuration</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 dark:border-white/[0.07]">
                  {["Name", "Questions", "Duration", "Language", "Reading level", "Created", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left font-medium text-stone-500 dark:text-stone-400 px-4 py-3 text-[12px] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-stone-100 dark:border-white/[0.04] last:border-0 hover:bg-stone-50/80 dark:hover:bg-white/[0.025] transition cursor-pointer"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-500 dark:text-violet-300 flex items-center justify-center shrink-0">
                          <Settings2 size={17} />
                        </span>
                        <span className="font-medium text-stone-900 dark:text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 tabular-nums">{c.question_count}</td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400">{c.duration_minutes} min</td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400">{c.language}</td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400">{c.reading_level}</td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <RowMenu onEdit={() => openEditModal(c)} onDelete={() => handleDelete(c)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {configs.length > 0 && (
        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
          {configs.length} configuration{configs.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200/60 dark:border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">{editingId ? "Edit configuration" : "New configuration"}</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  className={cn(INPUT_CLS, "w-full")}
                  placeholder="e.g. Standard Grade 10 Assessment"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Question count
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={cn(INPUT_CLS, "w-full")}
                    value={form.question_count}
                    onChange={(e) => set("question_count", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={cn(INPUT_CLS, "w-full")}
                    value={form.duration_minutes}
                    onChange={(e) => set("duration_minutes", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Language
                  </label>
                  <input
                    className={cn(INPUT_CLS, "w-full")}
                    placeholder="en"
                    value={form.language}
                    onChange={(e) => set("language", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Reading level
                  </label>
                  <input
                    className={cn(INPUT_CLS, "w-full")}
                    placeholder="general"
                    value={form.reading_level}
                    onChange={(e) => set("reading_level", e.target.value)}
                  />
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{saveError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.name.trim()}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
