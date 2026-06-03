"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, SearchInput, Segmented } from "@/components/ui/index";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Package, Copy, Eye, Plus, Search, FileQuestion, LayoutDashboard, SlidersHorizontal } from "lucide-react";

const REPOSITORY = [
  { id: "rp-1", stem: "Which ion is primarily responsible for the depolarisation phase of a cardiac action potential?", type: "Multiple Choice", bloom: "Remember", difficulty: "Medium", topic: "Cardiovascular", framework: "RN Competencies", usage: 14 },
  { id: "rp-2", stem: "Calculate the IV flow rate (mL/hr) for 1000 mL of saline to be infused over 8 hours.", type: "Numeric", bloom: "Apply", difficulty: "Medium", topic: "Pharmacology", framework: "RN Competencies", usage: 31 },
  { id: "rp-3", stem: "Explain how negative feedback maintains blood glucose homeostasis.", type: "Short Answer", bloom: "Understand", difficulty: "Hard", topic: "Endocrine", framework: "AP Biology", usage: 8 },
  { id: "rp-4", stem: "Identify the stage of mitosis shown in the micrograph.", type: "Multiple Choice", bloom: "Analyze", difficulty: "Medium", topic: "Cell Biology", framework: "AP Biology", usage: 22 },
  { id: "rp-5", stem: "A portfolio manager front-runs a client order. Which Standard is violated?", type: "Multiple Choice", bloom: "Apply", difficulty: "Hard", topic: "Ethics", framework: "CFA Level I", usage: 5 },
  { id: "rp-6", stem: "Factorise completely: 2x² + 7x + 3.", type: "Short Answer", bloom: "Apply", difficulty: "Medium", topic: "Algebra", framework: "GCSE Maths", usage: 19 },
  { id: "rp-7", stem: "Define the term \"construct validity\" in the context of assessment design.", type: "Short Answer", bloom: "Remember", difficulty: "Easy", topic: "Assessment Theory", framework: "Bloom's Taxonomy", usage: 27 },
  { id: "rp-8", stem: "Which intervention best reduces the risk of pressure injury in an immobile patient?", type: "Multiple Choice", bloom: "Evaluate", difficulty: "Medium", topic: "Patient Care", framework: "RN Competencies", usage: 16 },
  { id: "rp-9", stem: "Interpret the slope of a velocity–time graph for an object in free fall.", type: "Multiple Choice", bloom: "Analyze", difficulty: "Hard", topic: "Mechanics", framework: "GCSE Physics", usage: 11 },
  { id: "rp-10", stem: "List two ethical considerations when using AI to generate exam content.", type: "Short Answer", bloom: "Evaluate", difficulty: "Medium", topic: "EdTech", framework: "ISTE Standards", usage: 9 },
  { id: "rp-11", stem: "A patient's ABG shows pH 7.31, PaCO₂ 52. Classify the acid–base disturbance.", type: "Multiple Choice", bloom: "Analyze", difficulty: "Hard", topic: "Respiratory", framework: "RN Competencies", usage: 13 },
  { id: "rp-12", stem: "Convert 0.75 to a fraction in its simplest form.", type: "Numeric", bloom: "Remember", difficulty: "Easy", topic: "Number", framework: "GCSE Maths", usage: 24 },
];

const BLOOM_LEVELS = ["all", "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

function diffTone(d: string) {
  return d === "Easy" ? "text-emerald-600 dark:text-emerald-400" : d === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}

export default function RepositoryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bloom, setBloom] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const rows = REPOSITORY.filter((r) => {
    const q = query.trim().toLowerCase();
    const mq = !q || r.stem.toLowerCase().includes(q) || r.topic.toLowerCase().includes(q) || r.framework.toLowerCase().includes(q);
    const mb = bloom === "all" || r.bloom === bloom;
    return mq && mb;
  });

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

      {rows.length === 0 ? (
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
