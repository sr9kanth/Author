"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, SearchInput, Segmented } from "@/components/ui/index";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { repositoryApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Download, Package, Copy, Eye, Plus, Search, FileQuestion, LayoutDashboard, SlidersHorizontal } from "lucide-react";

interface RepoRow {
  id: string;
  stem: string;
  type: string;
  bloom: string;
  difficulty: string;
  topic: string;
  usage: number;
}

const BLOOM_LEVELS = ["all", "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

function diffTone(d: string) {
  return d === "Easy" ? "text-emerald-600 dark:text-emerald-400" : d === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}

export default function RepositoryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bloom, setBloom] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data, loading, error } = useAsync(() => repositoryApi.list(0, 100), []);

  const repository: RepoRow[] = useMemo(
    () =>
      (data?.items ?? []).map((r) => ({
        id: r.id,
        stem: r.stem ?? r.item_code,
        type: r.type ?? "Item",
        bloom: r.bloom ?? "—",
        difficulty: r.difficulty ?? "—",
        topic: r.topic ?? (r.tags[0] ?? "—"),
        usage: r.usage_count,
      })),
    [data],
  );

  const rows = repository.filter((r) => {
    const q = query.trim().toLowerCase();
    const mq = !q || r.stem.toLowerCase().includes(q) || r.topic.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    const mb = bloom === "all" || r.bloom === bloom;
    return mq && mb;
  });

  const isEmpty = !loading && repository.length === 0;

  return (
    <div>
      <PageHeader
        title="Repository"
        description="Your approved, reusable assessment items. Search and filter the bank, then send items to Assembly."
      >
        <Button variant="secondary" Icon={Download}>Export</Button>
        <Button Icon={Package} onClick={() => router.push("/assembly")}>Build package</Button>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
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
            action={<Button variant="secondary" onClick={() => { setQuery(""); setBloom("all"); }}>Clear filters</Button>} />
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div key={r.id} className={cn(CARD, "group p-4 flex flex-col hover:shadow-md hover:shadow-stone-200/50 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200")}>
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
                <Button variant="secondary" size="sm" Icon={Eye} className="flex-1">Preview</Button>
                <Button size="sm" Icon={Plus} className="flex-1" onClick={() => router.push("/assembly")}>Add</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(CARD, "divide-y divide-stone-100 dark:divide-white/[0.04]")}>
          {rows.map((r) => (
            <div key={r.id} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50/70 dark:hover:bg-white/[0.02] transition">
              <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <FileQuestion size={17} />
              </span>
              <p className="flex-1 min-w-0 text-[13.5px] text-stone-800 dark:text-stone-100 truncate">{r.stem}</p>
              <Tag tone="neutral">{r.bloom}</Tag>
              <span className={cn("text-[12px] font-medium hidden sm:inline", diffTone(r.difficulty))}>{r.difficulty}</span>
              <span className="text-[12px] text-stone-400 dark:text-stone-500 hidden md:inline w-28 truncate">{r.topic}</span>
              <Button size="sm" variant="secondary" Icon={Plus} onClick={() => router.push("/assembly")}>Add</Button>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
          {rows.length} approved items{bloom !== "all" ? ` · ${bloom}` : ""}
        </p>
      )}
    </div>
  );
}
