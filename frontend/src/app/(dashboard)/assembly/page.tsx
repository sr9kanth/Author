"use client";

import { useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/index";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, Package, Download, Check, GripVertical, X, Plus } from "lucide-react";

interface Item {
  id: string;
  stem: string;
  type: string;
  bloom: string;
  difficulty: string;
}

const REPOSITORY: Item[] = [
  { id: "rp-1", stem: "Which ion is primarily responsible for the depolarisation phase of a cardiac action potential?", type: "Multiple Choice", bloom: "Remember", difficulty: "Medium" },
  { id: "rp-2", stem: "Calculate the IV flow rate (mL/hr) for 1000 mL of saline to be infused over 8 hours.", type: "Numeric", bloom: "Apply", difficulty: "Medium" },
  { id: "rp-3", stem: "Explain how negative feedback maintains blood glucose homeostasis.", type: "Short Answer", bloom: "Understand", difficulty: "Hard" },
  { id: "rp-4", stem: "Identify the stage of mitosis shown in the micrograph.", type: "Multiple Choice", bloom: "Analyze", difficulty: "Medium" },
  { id: "rp-5", stem: "A portfolio manager front-runs a client order. Which Standard is violated?", type: "Multiple Choice", bloom: "Apply", difficulty: "Hard" },
  { id: "rp-6", stem: "Factorise completely: 2x² + 7x + 3.", type: "Short Answer", bloom: "Apply", difficulty: "Medium" },
  { id: "rp-7", stem: "Define the term \"construct validity\" in the context of assessment design.", type: "Short Answer", bloom: "Remember", difficulty: "Easy" },
  { id: "rp-8", stem: "Which intervention best reduces the risk of pressure injury in an immobile patient?", type: "Multiple Choice", bloom: "Evaluate", difficulty: "Medium" },
  { id: "rp-9", stem: "Interpret the slope of a velocity–time graph for an object in free fall.", type: "Multiple Choice", bloom: "Analyze", difficulty: "Hard" },
  { id: "rp-10", stem: "List two ethical considerations when using AI to generate exam content.", type: "Short Answer", bloom: "Evaluate", difficulty: "Medium" },
  { id: "rp-11", stem: "A patient's ABG shows pH 7.31, PaCO₂ 52. Classify the acid–base disturbance.", type: "Multiple Choice", bloom: "Analyze", difficulty: "Hard" },
  { id: "rp-12", stem: "Convert 0.75 to a fraction in its simplest form.", type: "Numeric", bloom: "Remember", difficulty: "Easy" },
];

function diffTone(d: string) {
  return d === "Easy" ? "text-emerald-600 dark:text-emerald-400" : d === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}

export default function AssemblyPage() {
  const [pkg, setPkg] = useState<Item[]>([REPOSITORY[1], REPOSITORY[3], REPOSITORY[7]]);
  const [overPkg, setOverPkg] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reorderIdx, setReorderIdx] = useState<number | null>(null);

  const inPkg = (id: string) => pkg.some((p) => p.id === id);

  const addItem = (id: string) => {
    const item = REPOSITORY.find((p) => p.id === id);
    if (item && !inPkg(id)) setPkg((p) => [...p, item]);
  };
  const removeItem = (id: string) => setPkg((p) => p.filter((x) => x.id !== id));

  const onPaletteDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("source", "palette");
    e.dataTransfer.setData("id", id);
    setDragId(id);
  };

  const onPkgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOverPkg(false);
    const src = e.dataTransfer.getData("source");
    const id = e.dataTransfer.getData("id");
    if (src === "palette") addItem(id);
    setDragId(null);
    setReorderIdx(null);
  };

  const onReorderStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("source", "reorder");
    e.dataTransfer.setData("idx", String(idx));
  };
  const onReorderOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setReorderIdx(idx);
  };
  const onReorderDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const src = e.dataTransfer.getData("source");
    if (src === "reorder") {
      const from = +e.dataTransfer.getData("idx");
      setPkg((p) => {
        const a = [...p];
        const [m] = a.splice(from, 1);
        a.splice(idx, 0, m);
        return a;
      });
    } else if (src === "palette") {
      addItem(e.dataTransfer.getData("id"));
    }
    setReorderIdx(null);
    setOverPkg(false);
    setDragId(null);
  };

  const points = pkg.length * 4;

  return (
    <div>
      <PageHeader
        title="Assembly"
        description="Drag approved items from the bank into a package to build an exam or assessment form."
      >
        <Button variant="secondary" Icon={Eye}>Preview</Button>
        <Button Icon={Package}>Publish package</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,440px)] gap-6">
        {/* LEFT: item bank */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
              Item bank <span className="text-stone-400 dark:text-stone-500 font-normal">· {REPOSITORY.length}</span>
            </h3>
            <span className="text-[12px] text-stone-400 dark:text-stone-500 inline-flex items-center gap-1.5">
              <GripVertical size={14} /> Drag items into the package →
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {REPOSITORY.map((r) => {
              const added = inPkg(r.id);
              return (
                <div
                  key={r.id}
                  draggable={!added}
                  onDragStart={(e) => onPaletteDragStart(e, r.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(CARD, "p-3.5 transition-all duration-150",
                    added ? "opacity-50" : "cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-sm",
                    dragId === r.id && "ring-2 ring-indigo-400 opacity-60")}
                >
                  <div className="flex items-start gap-2.5">
                    <GripVertical size={16} className="text-stone-300 dark:text-stone-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Tag tone="neutral">{r.type}</Tag>
                        {added ? (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5"><Check size={12} /> Added</span>
                        ) : (
                          <button onClick={() => addItem(r.id)} className="text-stone-400 hover:text-indigo-500 transition"><Plus size={16} /></button>
                        )}
                      </div>
                      <p className="text-[13px] text-stone-800 dark:text-stone-100 leading-snug line-clamp-2">{r.stem}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="text-violet-600 dark:text-violet-400 font-medium">{r.bloom}</span>
                        <span className="text-stone-300 dark:text-stone-600">·</span>
                        <span className={cn("font-medium", diffTone(r.difficulty))}>{r.difficulty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: package drop zone */}
        <div className="lg:sticky lg:top-20 self-start">
          <div
            className={cn(CARD, "overflow-hidden flex flex-col", overPkg && "ring-2 ring-indigo-400")}
            style={{ maxHeight: "calc(100vh - 7rem)" }}
          >
            <div className="p-5 border-b border-stone-100 dark:border-white/[0.05]">
              <input
                defaultValue="Cardiovascular Nursing — Midterm A"
                className="w-full bg-transparent text-base font-semibold text-stone-900 dark:text-white focus:outline-none placeholder:text-stone-400"
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-stone-50 dark:bg-white/[0.03] py-2">
                  <div className="text-lg font-semibold text-stone-900 dark:text-white tabular-nums">{pkg.length}</div>
                  <div className="text-[10.5px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Items</div>
                </div>
                <div className="rounded-lg bg-stone-50 dark:bg-white/[0.03] py-2">
                  <div className="text-lg font-semibold text-stone-900 dark:text-white tabular-nums">{points}</div>
                  <div className="text-[10.5px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Points</div>
                </div>
                <div className="rounded-lg bg-stone-50 dark:bg-white/[0.03] py-2">
                  <div className="text-lg font-semibold text-stone-900 dark:text-white tabular-nums">{Math.max(15, pkg.length * 3)}<span className="text-xs font-normal text-stone-400">m</span></div>
                  <div className="text-[10.5px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Est. time</div>
                </div>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setOverPkg(true); }}
              onDragLeave={() => setOverPkg(false)}
              onDrop={onPkgDrop}
              className={cn("flex-1 overflow-y-auto p-3 transition-colors", overPkg && "bg-indigo-50/50 dark:bg-indigo-500/[0.07]")}
              style={{ minHeight: "280px" }}
            >
              {pkg.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center border-2 border-dashed border-stone-200 dark:border-white/10 rounded-xl px-6">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-white/[0.06] text-stone-400 flex items-center justify-center mb-3"><Package size={22} /></div>
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Drop items here</p>
                  <p className="text-[12px] text-stone-400 dark:text-stone-500 mt-1">Drag from the bank, or click the + on any item.</p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {pkg.map((r, idx) => (
                    <li
                      key={r.id}
                      draggable
                      onDragStart={(e) => onReorderStart(e, idx)}
                      onDragOver={(e) => onReorderOver(e, idx)}
                      onDrop={(e) => onReorderDrop(e, idx)}
                      onDragEnd={() => setReorderIdx(null)}
                      className={cn("group flex items-start gap-2.5 rounded-xl border bg-white dark:bg-white/[0.02] px-3 py-2.5 cursor-grab active:cursor-grabbing transition",
                        reorderIdx === idx ? "border-indigo-400 ring-1 ring-indigo-300" : "border-stone-200/80 dark:border-white/[0.07]")}
                    >
                      <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-stone-800 dark:text-stone-100 leading-snug line-clamp-2">{r.stem}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
                          <span className="text-stone-400 dark:text-stone-500">{r.type}</span>
                          <span className="text-stone-300 dark:text-stone-600">·</span>
                          <span className={cn("font-medium", diffTone(r.difficulty))}>{r.difficulty}</span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(r.id)} className="text-stone-300 dark:text-stone-600 hover:text-rose-500 transition shrink-0 opacity-0 group-hover:opacity-100">
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {pkg.length > 0 && (
              <div className="p-3.5 border-t border-stone-100 dark:border-white/[0.05] flex items-center gap-2">
                <button onClick={() => setPkg([])} className="text-[12.5px] text-stone-400 hover:text-rose-500 transition">Clear all</button>
                <div className="flex-1" />
                <Button variant="secondary" size="sm" Icon={Download}>Export</Button>
                <Button size="sm" Icon={Check}>Finalise</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
