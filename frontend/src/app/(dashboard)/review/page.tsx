"use client";

import { useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, Segmented } from "@/components/ui/index";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Pencil, RefreshCw, X, Check, AlertCircle, BookOpen, Target } from "lucide-react";

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
}

const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "it-1", type: "Multiple Choice", status: "generated", bloom: "Apply", difficulty: "Medium",
    framework: "Registered Nurse Competencies 2025", outcome: "Calculate safe medication dosages",
    stem: "A patient is prescribed 250 mg of a drug available as 125 mg / 5 mL oral suspension. How many millilitres should the nurse administer per dose?",
    options: [{ t: "5 mL", correct: false }, { t: "10 mL", correct: true }, { t: "12.5 mL", correct: false }, { t: "2.5 mL", correct: false }],
    rationale: "Using the formula (desired ÷ available) × volume: (250 ÷ 125) × 5 = 10 mL.", flags: 1,
  },
  {
    id: "it-2", type: "Multiple Choice", status: "generated", bloom: "Understand", difficulty: "Easy",
    framework: "AP Biology — Unit Outcomes", outcome: "Describe the phases of mitosis",
    stem: "During which phase of mitosis do sister chromatids separate and move toward opposite poles of the cell?",
    options: [{ t: "Prophase", correct: false }, { t: "Metaphase", correct: false }, { t: "Anaphase", correct: true }, { t: "Telophase", correct: false }],
    rationale: "Anaphase is defined by the separation of sister chromatids, which are pulled to opposite poles by spindle fibres.", flags: 0,
  },
  {
    id: "it-3", type: "Short Answer", status: "validated", bloom: "Analyze", difficulty: "Hard",
    framework: "Registered Nurse Competencies 2025", outcome: "Interpret abnormal vital signs",
    stem: "A post-operative patient presents with BP 88/54, HR 122, and RR 24. Identify the most likely clinical concern and one immediate nursing action.",
    options: [],
    rationale: "Findings are consistent with hypovolaemic shock; an appropriate immediate action is to increase IV fluids and notify the provider.", flags: 0,
  },
  {
    id: "it-4", type: "Multiple Choice", status: "generated", bloom: "Remember", difficulty: "Easy",
    framework: "CFA Level I — Ethics Module", outcome: "Recall the Standards of Professional Conduct",
    stem: "Under the CFA Institute Standards, accepting a gift from a client that could affect objectivity is primarily a violation of which standard?",
    options: [{ t: "Loyalty, Prudence, and Care", correct: false }, { t: "Independence and Objectivity", correct: true }, { t: "Material Nonpublic Information", correct: false }, { t: "Fair Dealing", correct: false }],
    rationale: "Gifts that may compromise objectivity fall under Standard I(B) — Independence and Objectivity.", flags: 2,
  },
  {
    id: "it-5", type: "Multiple Choice", status: "generated", bloom: "Evaluate", difficulty: "Hard",
    framework: "Clinical Guidelines: Hypertension", outcome: "Evaluate first-line antihypertensive therapy",
    stem: "For a 54-year-old patient with stage 2 hypertension and type 2 diabetes, which initial pharmacologic class is most strongly indicated?",
    options: [{ t: "Beta-blocker", correct: false }, { t: "ACE inhibitor", correct: true }, { t: "Loop diuretic", correct: false }, { t: "Alpha-blocker", correct: false }],
    rationale: "ACE inhibitors are preferred first-line in patients with diabetes due to renoprotective effects.", flags: 0,
  },
  {
    id: "it-6", type: "Multiple Choice", status: "draft", bloom: "Understand", difficulty: "Medium",
    framework: "GCSE Mathematics Outcomes", outcome: "Solve linear equations",
    stem: "Solve for x: 3(x − 4) = 2x + 5.",
    options: [{ t: "x = 7", correct: false }, { t: "x = 17", correct: true }, { t: "x = 11", correct: false }, { t: "x = 1", correct: false }],
    rationale: "3x − 12 = 2x + 5 → x = 17.", flags: 0,
  },
];

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>(REVIEW_ITEMS);
  const [activeId, setActiveId] = useState(REVIEW_ITEMS[0].id);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  const active = items.find((i) => i.id === activeId) || items[0];
  const visible = items.filter((i) => filter === "all" || i.status === filter);

  const setStatus = (id: string, status: string) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, status } : i)));

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const approve = () => {
    setStatus(active.id, "approved");
    notify("Item approved");
    const idx = visible.findIndex((i) => i.id === active.id);
    const next = visible[idx + 1] || visible[idx - 1];
    if (next) setActiveId(next.id);
  };

  const counts = ["draft", "generated", "validated", "approved"].reduce(
    (m, s) => { m[s] = items.filter((i) => i.status === s).length; return m; },
    {} as Record<string, number>,
  );

  return (
    <div>
      <PageHeader
        title="Review"
        description="Validate, edit and approve generated items before they enter the repository."
      >
        <Button variant="secondary" Icon={Download}>Export queue</Button>
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

              <div className="space-y-1.5 mb-6">
                <label className="text-[12px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">Stem</label>
                <p className="text-[15px] leading-relaxed text-stone-900 dark:text-white">{active.stem}</p>
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
              <Button variant="ghost" Icon={Pencil} size="md">Edit</Button>
              <Button variant="ghost" Icon={RefreshCw} size="md" className="hidden sm:inline-flex">Regenerate</Button>
              <div className="flex-1" />
              <Button variant="secondary" Icon={X} onClick={() => { setStatus(active.id, "draft"); notify("Sent back to draft"); }}>Reject</Button>
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
