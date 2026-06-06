"use client";

import { useRef, useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { metadataApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { MetadataDimension, MetadataDimensionValueType, MetadataValue } from "@/types";
import { Plus, SlidersHorizontal, X, Trash2 } from "lucide-react";

const VALUE_TYPES: { value: MetadataDimensionValueType; label: string }[] = [
  { value: "dictionary_single", label: "Dictionary (single select)" },
  { value: "dictionary_multi", label: "Dictionary (multi select)" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
];

const SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "stimulus", label: "Stimulus" },
  { value: "media", label: "Media" },
  { value: "option", label: "Option" },
];

const isDictionary = (t: MetadataDimensionValueType) =>
  t === "dictionary_single" || t === "dictionary_multi";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const TYPE_LABEL: Record<string, string> = {
  dictionary_single: "Dictionary (single)",
  dictionary_multi: "Dictionary (multi)",
  text: "Text",
  number: "Number",
};

interface CreateForm {
  name: string;
  key: string;
  keyEdited: boolean;
  value_type: MetadataDimensionValueType;
  dimension_values: MetadataValue[];
  explanation: string;
  scopes: string[];
  source: "defined" | "library";
}

const DEFAULTS: CreateForm = {
  name: "",
  key: "",
  keyEdited: false,
  value_type: "dictionary_single",
  dimension_values: [{ value: "", display_title: "" }],
  explanation: "",
  scopes: ["question"],
  source: "defined",
};

export default function MetadataPage() {
  const { data, loading, error, reload } = useAsync(() => metadataApi.list(), []);
  const dimensions: MetadataDimension[] = data?.items ?? [];

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  const openModal = () => {
    setForm(DEFAULTS);
    setSaveError(null);
    setShowModal(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const closeModal = () => setShowModal(false);

  const setName = (value: string) =>
    setForm((f) => ({ ...f, name: value, key: f.keyEdited ? f.key : slugify(value) }));

  const setKey = (value: string) =>
    setForm((f) => ({ ...f, key: slugify(value), keyEdited: true }));

  const toggleScope = (scope: string) =>
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter((s) => s !== scope)
        : [...f.scopes, scope],
    }));

  const setValueRow = (i: number, field: keyof MetadataValue, value: string) =>
    setForm((f) => ({
      ...f,
      dimension_values: f.dimension_values.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row,
      ),
    }));

  const addValueRow = () =>
    setForm((f) => ({
      ...f,
      dimension_values: [...f.dimension_values, { value: "", display_title: "" }],
    }));

  const removeValueRow = (i: number) =>
    setForm((f) => ({
      ...f,
      dimension_values: f.dimension_values.filter((_, idx) => idx !== i),
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const dictionary = isDictionary(form.value_type);
      const values = dictionary
        ? form.dimension_values
            .filter((v) => v.value.trim())
            .map((v) => ({
              value: v.value.trim(),
              display_title: v.display_title.trim() || v.value.trim(),
            }))
        : [];
      await metadataApi.create({
        name: form.name.trim(),
        key: form.key.trim() || slugify(form.name),
        value_type: form.value_type,
        dimension_values: values,
        explanation: form.explanation.trim() || undefined,
        scopes: form.scopes,
        source: form.source,
      });
      reload();
      closeModal();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to create dimension");
    } finally {
      setSaving(false);
    }
  };

  const dictionary = isDictionary(form.value_type);

  return (
    <div>
      <PageHeader
        title="Metadata"
        description="Define assessment metadata dimensions — like Cognitive Demand, Difficulty, or Bloom's — that drive generation dropdowns."
      >
        <Button Icon={Plus} onClick={openModal}>New dimension</Button>
      </PageHeader>

      <div className={cn(CARD, "overflow-hidden")}>
        {loading ? (
          <div className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading dimensions…</div>
        ) : error ? (
          <EmptyState Icon={SlidersHorizontal} title="Couldn't load dimensions" subtext={error} />
        ) : dimensions.length === 0 ? (
          <EmptyState
            Icon={SlidersHorizontal}
            title="No dimensions yet"
            subtext="Create a metadata dimension to start building generation dropdowns."
            action={<Button Icon={Plus} onClick={openModal}>Create your first dimension</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 dark:border-white/[0.07]">
                  {["Name", "Type", "# values", "Scopes", "Source", "Active"].map((h) => (
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
                {dimensions.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-stone-100 dark:border-white/[0.04] last:border-0 hover:bg-stone-50/80 dark:hover:bg-white/[0.025] transition"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-500 dark:text-violet-300 flex items-center justify-center shrink-0">
                          <SlidersHorizontal size={17} />
                        </span>
                        <div className="leading-tight">
                          <div className="font-medium text-stone-900 dark:text-white">{d.name}</div>
                          <div className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">{d.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400">
                      {TYPE_LABEL[d.value_type] ?? d.value_type}
                    </td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 tabular-nums">
                      {d.dimension_values?.length ?? 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(d.scopes ?? []).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-300 capitalize"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-md capitalize font-medium",
                          d.source === "library"
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                        )}
                      >
                        {d.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-block w-2 h-2 rounded-full",
                          d.is_active ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-600",
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dimensions.length > 0 && (
        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
          {dimensions.length} dimension{dimensions.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200/60 dark:border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">New dimension</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    className={cn(INPUT_CLS, "w-full")}
                    placeholder="e.g. Cognitive Demand"
                    value={form.name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Key
                  </label>
                  <input
                    className={cn(INPUT_CLS, "w-full font-mono text-[13px]")}
                    placeholder="cognitive_demand"
                    value={form.key}
                    onChange={(e) => setKey(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Value type
                </label>
                <select
                  className={cn(INPUT_CLS, "w-full")}
                  value={form.value_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, value_type: e.target.value as MetadataDimensionValueType }))
                  }
                >
                  {VALUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {dictionary && (
                <div>
                  <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                    Dictionary values
                  </label>
                  <div className="space-y-2">
                    {form.dimension_values.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={cn(INPUT_CLS, "flex-1")}
                          placeholder="value"
                          value={row.value}
                          onChange={(e) => setValueRow(i, "value", e.target.value)}
                        />
                        <input
                          className={cn(INPUT_CLS, "flex-1")}
                          placeholder="Display title"
                          value={row.display_title}
                          onChange={(e) => setValueRow(i, "display_title", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeValueRow(i)}
                          disabled={form.dimension_values.length === 1}
                          className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addValueRow}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                  >
                    <Plus size={14} /> Add value
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Explanation
                </label>
                <textarea
                  className={cn(INPUT_CLS, "w-full min-h-[72px] resize-y")}
                  placeholder="Describe what this dimension captures and how it should be used."
                  value={form.explanation}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Scopes
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((s) => {
                    const active = form.scopes.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleScope(s.value)}
                        className={cn(
                          "text-[12.5px] px-3 py-1.5 rounded-lg border font-medium transition",
                          active
                            ? "bg-indigo-500/10 border-indigo-400/50 text-indigo-600 dark:text-indigo-300"
                            : "border-stone-200 dark:border-white/[0.08] text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/[0.04]",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Source
                </label>
                <div className="inline-flex rounded-lg border border-stone-200 dark:border-white/[0.08] p-0.5">
                  {(["defined", "library"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, source: src }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md text-[12.5px] font-medium capitalize transition",
                        form.source === src
                          ? "bg-indigo-500 text-white"
                          : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
                      )}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{saveError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.name.trim()}>
                  {saving ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
