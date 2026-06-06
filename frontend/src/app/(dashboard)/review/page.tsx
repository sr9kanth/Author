"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, Segmented } from "@/components/ui/index";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generationApi, workflowApi, repositoryApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { GeneratedContent } from "@/types";
import { Download, Pencil, X, Check, AlertCircle, BookOpen, Target, ClipboardCheck } from "lucide-react";

interface ReviewItem {
  id: string;
  type: string;
  status: string;
  bloom: string;
  difficulty: string;
  framework: string;
  outcome: string;
  stem: string;
  options: { t: string; correct: boolean }[];
  rationale: string;
  flags: number;
  stimulus?: { title: string; body: string };
}

function metaStr(meta: Record<string, unknown>, key: string): string {
  const v = meta?.[key];
  return typeof v === "string" ? v : "";
}

function toReviewItem(c: GeneratedContent): ReviewItem {
  const meta = c.content_metadata ?? {};
  const fw = c.framework_alignment ?? {};
  const rawOptions = meta.options;
  const options: { t: string; correct: boolean }[] = Array.isArray(rawOptions)
    ? rawOptions.map((o) => {
        if (o && typeof o === "object") {
          const obj = o as Record<string, unknown>;
          return {
            t: typeof obj.text === "string" ? obj.text : String(obj.t ?? ""),
            correct: Boolean(obj.correct),
          };
        }
        return { t: String(o), correct: false };
      })
    : [];
  return {
    id: c.id,
    type: c.content_type || "Item",
    status: c.status,
    bloom: metaStr(meta, "bloom"),
    difficulty: metaStr(meta, "difficulty"),
    framework: metaStr(fw, "framework_name") || metaStr(fw, "name"),
    outcome: metaStr(fw, "outcome") || metaStr(meta, "outcome"),
    stem: metaStr(meta, "stem") || c.body,
    options,
    rationale: metaStr(meta, "rationale"),
    flags: typeof meta.flags === "number" ? meta.flags : 0,
    stimulus: c.stimulus ? { title: c.stimulus.title, body: c.stimulus.body } : undefined,
  };
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading…</div>}>
      <ReviewPageInner />
    </Suspense>
  );
}

function ReviewPageInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");

  const { data, loading, error, reload } = useAsync(
    () => (jobId ? generationApi.listContents(jobId) : Promise.resolve(null)),
    [jobId],
  );

  const fetched = useMemo(() => (data?.items ?? []).map(toReviewItem), [data]);

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    setItems(fetched);
    setActiveId(fetched[0]?.id ?? null);
  }, [fetched]);

  const active = items.find((i) => i.id === activeId) ?? items[0] ?? null;
  const visible = items.filter((i) => filter === "all" || i.status === filter);

  const setStatus = (id: string, status: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, status } : i)));

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
  const isAlreadyExists = (e: unknown) => {
    const m = errMsg(e).toLowerCase();
    const status = (e as { status?: number })?.status;
    return status === 409 || m.includes("already exist") || m.includes("already in") || m.includes("duplicate");
  };

  const approve = async () => {
    if (!active) return;
    const id = active.id;
    try {
      // Persist the workflow state on the server.
      await workflowApi.transition(id, "approved");
      // Push the item into the repository; tolerate "already exists".
      try {
        await repositoryApi.create({ content_id: id });
      } catch (e) {
        if (!isAlreadyExists(e)) throw e;
      }
      setStatus(id, "approved");
      notify("Item approved & added to repository");
      const idx = visible.findIndex((i) => i.id === id);
      const next = visible[idx + 1] || visible[idx - 1];
      if (next) setActiveId(next.id);
    } catch (e) {
      notify(`Failed to approve: ${errMsg(e)}`);
      reload();
    }
  };

  const reject = async () => {
    if (!active) return;
    const id = active.id;
    try {
      await workflowApi.transition(id, "draft", "Sent back for revision");
      setStatus(id, "draft");
      notify("Sent back to draft");
    } catch (e) {
      notify(`Failed to send back: ${errMsg(e)}`);
      reload();
    }
  };

  const startEdit = () => {
    if (!active) return;
    setEditingId(active.id);
    setEditDraft(active.stem);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const id = editingId;
    const body = editDraft;
    try {
      await generationApi.updateContent(id, { body });
      setItems((arr) => arr.map((i) => (i.id === id ? { ...i, stem: body } : i)));
      setEditingId(null);
      setEditDraft("");
      notify("Item saved");
    } catch (e) {
      notify(`Failed to save: ${errMsg(e)}`);
    }
  };

  const exportQueue = () => {
    const payload = visible.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      bloom: i.bloom,
      difficulty: i.difficulty,
      framework: i.framework,
      outcome: i.outcome,
      stem: i.stem,
      options: i.options,
      rationale: i.rationale,
      stimulus: i.stimulus,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-queue-${jobId ?? "items"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify(`Exported ${payload.length} item${payload.length === 1 ? "" : "s"}`);
  };

  const counts = ["draft", "generated", "validated", "approved"].reduce(
    (m, s) => { m[s] = items.filter((i) => i.status === s).length; return m; },
    {} as Record<string, number>,
  );

  if (!jobId || (!loading && items.length === 0)) {
    return (
      <div>
        <PageHeader
          title="Review"
          description="Validate, edit and approve generated items before they enter the repository."
        />
        <div className={CARD}>
          <EmptyState
            Icon={ClipboardCheck}
            title={error ? "Couldn't load review queue" : "Nothing to review"}
            subtext={error ?? "Run a generation job, then open its review queue to validate and approve items."}
          />
        </div>
      </div>
    );
  }

  if (loading || !active) {
    return (
      <div>
        <PageHeader title="Review" description="Validate, edit and approve generated items before they enter the repository." />
        <div className={cn(CARD, "py-16 text-center text-sm text-stone-400 dark:text-stone-500")}>Loading review queue…</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Review"
        description="Validate, edit and approve generated items before they enter the repository."
      >
        <Button variant="secondary" Icon={Download} onClick={exportQueue}>Export queue</Button>
      </PageHeader>

      <div className={cn(CARD, "overflow-hidden")}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr]" style={{ minHeight: "640px" }}>
          {/* LEFT: item list */}
          <div className="border-b lg:border-b-0 lg:border-r border-stone-200/80 dark:border-white/[0.06] flex flex-col">
            <div className="p-3.5 border-b border-stone-100 dark:border-white/[0.05]">
              <Segmented
                size="sm"
                options={[
                  { value: "all", label: `All ${items.length}` },
                  { value: "generated", label: `New ${counts.generated ?? 0}` },
                  { value: "validated", label: `Validated ${counts.validated ?? 0}` },
                  { value: "approved", label: `Done ${counts.approved ?? 0}` },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-white/[0.04]" style={{ maxHeight: "640px" }}>
              {visible.map((it) => {
                const on = it.id === active.id;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setActiveId(it.id)}
                      className={cn("w-full text-left px-4 py-3.5 transition relative", on ? "bg-indigo-50/70 dark:bg-indigo-500/10" : "hover:bg-stone-50 dark:hover:bg-white/[0.02]")}
                    >
                      {on && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500" />}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Tag tone="neutral">{it.type}</Tag>
                        <div className="flex items-center gap-1.5">
                          {it.flags > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              <AlertCircle size={12} />{it.flags}
                            </span>
                          )}
                          <StatusBadge status={it.status} size="sm" />
                        </div>
                      </div>
                      <p className={cn("text-[13px] leading-snug line-clamp-2", on ? "text-stone-900 dark:text-white font-medium" : "text-stone-600 dark:text-stone-300")}>{it.stem}</p>
                      <p className="mt-1 text-[11.5px] text-stone-400 dark:text-stone-500 truncate">{it.framework}</p>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="px-4 py-12 text-center text-sm text-stone-400 dark:text-stone-500">Nothing here — queue is clear.</li>
              )}
            </ul>
          </div>

          {/* RIGHT: review detail */}
          <div className="flex flex-col">
            <div className="flex-1 overflow-y-auto p-5 sm:p-7" style={{ maxHeight: "640px" }}>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <Tag tone="indigo">{active.type}</Tag>
                <Tag tone="violet">{active.bloom}</Tag>
                <Tag tone="neutral">{active.difficulty}</Tag>
                <div className="flex-1" />
                <StatusBadge status={active.status} />
              </div>

              <div className="flex items-center gap-2 text-[12.5px] text-stone-500 dark:text-stone-400 mb-1">
                <Target size={14} className="text-indigo-400" />
                <span>{active.outcome}</span>
              </div>
              <p className="text-[11.5px] text-stone-400 dark:text-stone-500 mb-5">{active.framework}</p>

              {active.stimulus && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-4 mb-6">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300 mb-2">
                    <BookOpen size={14} /> Stimulus
                  </div>
                  <p className="text-[14px] font-medium text-stone-900 dark:text-white mb-1.5">{active.stimulus.title}</p>
                  <p className="text-[13.5px] leading-relaxed text-stone-700 dark:text-stone-300 whitespace-pre-line">{active.stimulus.body}</p>
                </div>
              )}

              <div className="space-y-1.5 mb-6">
                <label className="text-[12px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">Stem</label>
                {editingId === active.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3.5 py-2.5 text-[15px] leading-relaxed text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    />
                    <div className="flex items-center gap-2">
                      <Button Icon={Check} size="sm" onClick={saveEdit}>Save</Button>
                      <Button variant="secondary" Icon={X} size="sm" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[15px] leading-relaxed text-stone-900 dark:text-white">{active.stem}</p>
                )}
              </div>

              {active.options.length > 0 && (
                <div className="space-y-2 mb-6">
                  <label className="text-[12px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">Options</label>
                  {active.options.map((o, i) => (
                    <div key={i} className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm", o.correct ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10" : "border-stone-200 dark:border-white/[0.08]")}>
                      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0", o.correct ? "bg-emerald-500 text-white" : "bg-stone-100 dark:bg-white/[0.06] text-stone-500 dark:text-stone-400")}>
                        {o.correct ? <Check size={14} /> : String.fromCharCode(65 + i)}
                      </span>
                      <span className={cn(o.correct ? "text-stone-900 dark:text-white font-medium" : "text-stone-700 dark:text-stone-300")}>{o.t}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-100 dark:border-white/[0.05] p-4 mb-6">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                  <BookOpen size={14} /> Rationale
                </div>
                <p className="text-[13.5px] text-stone-700 dark:text-stone-300 leading-relaxed">{active.rationale}</p>
              </div>

              {active.flags > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    <AlertCircle size={15} /> {active.flags} validation {active.flags === 1 ? "flag" : "flags"}
                  </div>
                  <p className="text-[12.5px] text-amber-700/90 dark:text-amber-200/80">Automated checks suggest the distractors may be too similar. Review before approving.</p>
                </div>
              )}
            </div>

            <div className="border-t border-stone-200/80 dark:border-white/[0.06] p-4 flex items-center gap-2 bg-stone-50/50 dark:bg-white/[0.02]">
              <Button
                variant="ghost"
                Icon={Pencil}
                size="md"
                onClick={startEdit}
                disabled={editingId === active.id}
              >
                Edit
              </Button>
              <div className="flex-1" />
              <Button variant="secondary" Icon={X} onClick={reject}>Reject</Button>
              <Button Icon={Check} onClick={approve}>Approve</Button>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300", toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none")}>
        <div className="flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-4 py-2.5 text-sm font-medium shadow-lg">
          <Check size={16} className="text-emerald-400 dark:text-emerald-500" />
          {toast}
        </div>
      </div>
    </div>
  );
}
