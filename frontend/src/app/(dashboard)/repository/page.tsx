"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, SearchInput, Segmented } from "@/components/ui/index";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { repositoryApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { DetailPanel, useDetailPanel } from "@/components/ui/detail-panel";
import { Download, Package, Copy, Eye, Plus, Search, FileQuestion, LayoutDashboard, SlidersHorizontal, Upload, X } from "lucide-react";

const CSV_TEMPLATE =
  "stem,options,correct_answer,rationale,question_type,difficulty,cognitive_level\r\n" +
  "What is the capital of France?,Paris|London|Berlin|Rome,Paris,Paris is the capital city of France.,multiple_choice,easy,remember\r\n" +
  "Which gas do plants absorb during photosynthesis?,Oxygen|Carbon Dioxide|Nitrogen|Hydrogen,Carbon Dioxide,Plants use CO2 in photosynthesis.,multiple_choice,medium,understand\r\n";

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "import_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setUploadError(null);
    setResult(null);
    try {
      const res = await repositoryApi.importCsv(file);
      setResult(res);
      if (res.imported > 0) onDone();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-white/[0.08] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X size={18} />
        </button>
        <h2 className="text-[15px] font-semibold text-stone-800 dark:text-stone-100 mb-1">Import questions from CSV</h2>
        <p className="text-[12.5px] text-stone-500 dark:text-stone-400 mb-4">
          Upload a CSV file with your questions. Imported items go straight to the repository as approved.
        </p>

        <button
          onClick={downloadTemplate}
          className="text-[12px] text-indigo-600 dark:text-indigo-400 underline underline-offset-2 mb-4 inline-block hover:text-indigo-800 dark:hover:text-indigo-200"
        >
          Download template CSV
        </button>

        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4",
            file ? "border-indigo-400 bg-indigo-50/40 dark:bg-indigo-500/5" : "border-stone-200 dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-white/[0.15]",
          )}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setUploadError(null); }}
          />
          {file ? (
            <p className="text-[13px] text-stone-700 dark:text-stone-200">{file.name}</p>
          ) : (
            <p className="text-[13px] text-stone-400 dark:text-stone-500">Click to select a .csv file</p>
          )}
        </div>

        {uploadError && (
          <p className="text-[12px] text-rose-600 dark:text-rose-400 mb-3">{uploadError}</p>
        )}

        {result && (
          <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
            <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-300">
              {result.imported} question{result.imported !== 1 ? "s" : ""} imported successfully
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11.5px] text-rose-600 dark:text-rose-400">{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            Icon={Upload}
            disabled={!file || loading}
            onClick={handleUpload}
          >
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RepoRow {
  id: string;
  itemCode: string;
  stem: string;
  type: string;
  bloom: string;
  difficulty: string;
  topic: string;
  usage: number;
  tags: string[];
  created: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
        {label}
      </span>
      <span className="text-[13.5px] text-stone-800 dark:text-stone-100 break-words">{value}</span>
    </div>
  );
}

const BLOOM_LEVELS = ["all", "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const DIFFICULTY_LEVELS = ["all", "Easy", "Medium", "Hard"];
const QUESTION_TYPES = ["all", "Multiple Choice", "Short Answer", "True-False", "Essay"];

function diffTone(d: string) {
  return d === "Easy" ? "text-emerald-600 dark:text-emerald-400" : d === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}

export default function RepositoryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bloom, setBloom] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [questionType, setQuestionType] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showImport, setShowImport] = useState(false);
  const panel = useDetailPanel<RepoRow>();

  const { data, loading, error, reload } = useAsync(() => repositoryApi.list(0, 100), []);

  const repository: RepoRow[] = useMemo(
    () =>
      (data?.items ?? []).map((r) => ({
        id: r.id,
        itemCode: r.item_code,
        stem: r.stem ?? r.item_code,
        type: r.type ?? "Item",
        bloom: r.bloom ?? "—",
        difficulty: r.difficulty ?? "—",
        topic: r.topic ?? (r.tags[0] ?? "—"),
        usage: r.usage_count,
        tags: r.tags,
        created: r.created_at,
      })),
    [data],
  );

  const rows = repository.filter((r) => {
    const q = query.trim().toLowerCase();
    const mq = !q || r.stem.toLowerCase().includes(q) || r.topic.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    const mb = bloom === "all" || r.bloom === bloom;
    const md = difficulty === "all" || r.difficulty.toLowerCase() === difficulty.toLowerCase();
    const mt = questionType === "all" || r.type.toLowerCase().replace(/_/g, " ") === questionType.toLowerCase();
    return mq && mb && md && mt;
  });

  const hasActiveFilters = query.trim() !== "" || bloom !== "all" || difficulty !== "all" || questionType !== "all";

  function clearFilters() {
    setQuery("");
    setBloom("all");
    setDifficulty("all");
    setQuestionType("all");
  }

  function exportQti() {
    window.location.href = repositoryApi.exportQti();
  }

  const isEmpty = !loading && repository.length === 0;

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["item_code", "type", "bloom", "difficulty", "topic", "stem", "tags", "usage_count"];
    const escape = (val: unknown) => {
      const s = val == null ? "" : String(val);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [r.itemCode, r.type, r.bloom, r.difficulty, r.topic, r.stem, r.tags.join("; "), r.usage]
          .map(escape)
          .join(","),
      ),
    ];
    const csv = lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repository.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); reload(); }}
        />
      )}
      <PageHeader
        title="Repository"
        description="Your approved, reusable assessment items. Search and filter the bank, then send items to Assembly."
      >
        <Button variant="secondary" Icon={Upload} onClick={() => setShowImport(true)}>Import</Button>
        <Button variant="secondary" Icon={Download} onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
        <Button variant="secondary" Icon={Download} onClick={exportQti}>Export QTI</Button>
        <Button Icon={Package} onClick={() => router.push("/assembly")}>Build package</Button>
      </PageHeader>

      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by stem, topic or framework…" className="lg:w-96" />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Segmented
              size="sm"
              options={BLOOM_LEVELS.slice(0, 5).map((b) => ({ value: b, label: b === "all" ? "All levels" : b }))}
              value={bloom}
              onChange={setBloom}
            />
            <div className="hidden sm:flex items-center gap-0.5 rounded-xl p-0.5 bg-stone-100 dark:bg-white/[0.05] border border-stone-200/70 dark:border-white/[0.06]">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn("w-8 h-7 inline-flex items-center justify-center rounded-lg transition", view === v ? "bg-white dark:bg-white/[0.10] text-stone-900 dark:text-white shadow-sm" : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200")}
                >
                  {v === "grid" ? <LayoutDashboard size={15} /> : <SlidersHorizontal size={15} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="text-[12.5px] rounded-lg border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-stone-700 dark:text-stone-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {DIFFICULTY_LEVELS.map((d) => (
              <option key={d} value={d}>{d === "all" ? "All difficulties" : d}</option>
            ))}
          </select>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="text-[12.5px] rounded-lg border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-stone-700 dark:text-stone-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All types" : t}</option>
            ))}
          </select>
          <span className="text-[12px] text-stone-400 dark:text-stone-500 ml-1">
            {rows.length} result{rows.length !== 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className={CARD}>
          <div className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading items…</div>
        </div>
      ) : error ? (
        <div className={CARD}>
          <EmptyState Icon={FileQuestion} title="Couldn't load repository" subtext={error} />
        </div>
      ) : isEmpty ? (
        <div className={CARD}>
          <EmptyState Icon={FileQuestion} title="No items yet" subtext="Approved assessment items appear here. Generate and approve items to populate the repository." />
        </div>
      ) : rows.length === 0 ? (
        <div className={CARD}>
          <EmptyState Icon={Search} title="No items match" subtext="Try a different search term or clear the level filter."
            action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} onClick={() => panel.openWith(r)} className={cn(CARD, "group p-4 flex flex-col cursor-pointer hover:shadow-md hover:shadow-stone-200/50 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200")}>
              <div className="flex items-center justify-between mb-3">
                <Tag tone="indigo">{r.type}</Tag>
                <span className="inline-flex items-center gap-1 text-[11.5px] text-stone-400 dark:text-stone-500">
                  <Copy size={12} /> used {r.usage}×
                </span>
              </div>
              <p className="text-[13.5px] text-stone-800 dark:text-stone-100 leading-snug line-clamp-3 flex-1">{r.stem}</p>
              <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="text-violet-600 dark:text-violet-400 font-medium">{r.bloom}</span>
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <span className={cn("font-medium", diffTone(r.difficulty))}>{r.difficulty}</span>
                </div>
                <span className="text-[11.5px] text-stone-400 dark:text-stone-500 truncate max-w-[45%]">{r.topic}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <Button variant="secondary" size="sm" Icon={Eye} className="flex-1" onClick={(e) => { e.stopPropagation(); panel.openWith(r); }}>Preview</Button>
                <Button size="sm" Icon={Plus} className="flex-1" onClick={(e) => { e.stopPropagation(); router.push("/assembly"); }}>Add</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(CARD, "divide-y divide-stone-100 dark:divide-white/[0.04]")}>
          {rows.map((r) => (
            <div key={r.id} onClick={() => panel.openWith(r)} className="group flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-stone-50/70 dark:hover:bg-white/[0.02] transition">
              <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <FileQuestion size={17} />
              </span>
              <p className="flex-1 min-w-0 text-[13.5px] text-stone-800 dark:text-stone-100 truncate">{r.stem}</p>
              <Tag tone="neutral">{r.bloom}</Tag>
              <span className={cn("text-[12px] font-medium hidden sm:inline", diffTone(r.difficulty))}>{r.difficulty}</span>
              <span className="text-[12px] text-stone-400 dark:text-stone-500 hidden md:inline w-28 truncate">{r.topic}</span>
              <Button size="sm" variant="secondary" Icon={Plus} onClick={(e) => { e.stopPropagation(); router.push("/assembly"); }}>Add</Button>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
          {rows.length} approved item{rows.length !== 1 ? "s" : ""}{bloom !== "all" ? ` · ${bloom}` : ""}{difficulty !== "all" ? ` · ${difficulty}` : ""}{questionType !== "all" ? ` · ${questionType}` : ""}
        </p>
      )}

      <DetailPanel
        open={panel.open}
        onClose={panel.close}
        title={panel.active?.stem ?? "Item"}
        subtitle={panel.active ? `${panel.active.type} · ${panel.active.topic}` : undefined}
        tabs={
          panel.active
            ? [
                {
                  id: "view",
                  label: "View",
                  content: (
                    <div className="space-y-5">
                      <Field label="Stem" value={panel.active.stem} />
                      <div className="grid grid-cols-2 gap-5">
                        <Field label="Type" value={<Tag tone="indigo">{panel.active.type}</Tag>} />
                        <Field label="Bloom" value={<Tag tone="violet">{panel.active.bloom}</Tag>} />
                        <Field
                          label="Difficulty"
                          value={<span className={cn("font-medium", diffTone(panel.active.difficulty))}>{panel.active.difficulty}</span>}
                        />
                        <Field label="Topic" value={panel.active.topic} />
                      </div>
                    </div>
                  ),
                },
                {
                  id: "properties",
                  label: "Properties",
                  content: (
                    <div className="space-y-5">
                      <Field label="ID" value={<span className="font-mono text-[12px]">{panel.active.id}</span>} />
                      <Field label="Usage count" value={`${panel.active.usage}×`} />
                      <Field
                        label="Tags"
                        value={
                          panel.active.tags.length ? (
                            <span className="flex flex-wrap gap-1.5">
                              {panel.active.tags.map((t) => (
                                <Tag key={t} tone="neutral">{t}</Tag>
                              ))}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <Field
                        label="Created"
                        value={panel.active.created ? new Date(panel.active.created).toLocaleString() : "—"}
                      />
                    </div>
                  ),
                },
              ]
            : []
        }
      />
    </div>
  );
}
