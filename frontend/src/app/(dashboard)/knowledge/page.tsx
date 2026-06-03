"use client";

import { useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, FileUploadZone } from "@/components/ui/index";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, FileText, RefreshCw, Trash2, Sparkles } from "lucide-react";

type AssetStatus = "indexed" | "processing" | "failed";

interface Asset {
  id: string;
  name: string;
  type: string;
  size: string;
  chunks: number;
  status: AssetStatus;
  uploaded: string;
}

const INITIAL_ASSETS: Asset[] = [
  { id: "k-1", name: "Anatomy_&_Physiology_Ch7_Cardiovascular.pdf", type: "PDF", size: "8.4 MB", chunks: 642, status: "indexed", uploaded: "2026-05-30" },
  { id: "k-2", name: "Nursing_Pharmacology_Lecture_Notes.docx", type: "DOCX", size: "2.1 MB", chunks: 188, status: "indexed", uploaded: "2026-05-30" },
  { id: "k-3", name: "AP_Biology_Cell_Division_Slides.pptx", type: "PPTX", size: "14.7 MB", chunks: 0, status: "processing", uploaded: "2026-05-31" },
  { id: "k-4", name: "Clinical_Guidelines_Hypertension_2025.pdf", type: "PDF", size: "5.9 MB", chunks: 410, status: "indexed", uploaded: "2026-05-28" },
  { id: "k-5", name: "Statistics_Probability_Workbook.pdf", type: "PDF", size: "3.2 MB", chunks: 0, status: "failed", uploaded: "2026-05-27" },
  { id: "k-6", name: "Medical_Ethics_Casebook_Vol2.epub", type: "EPUB", size: "1.8 MB", chunks: 256, status: "indexed", uploaded: "2026-05-25" },
];

function typeStyle(t: string) {
  const m: Record<string, string> = {
    PDF: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    DOCX: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    PPTX: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    EPUB: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
  };
  return m[t] || "bg-stone-100 text-stone-500 dark:bg-white/[0.06] dark:text-stone-400";
}

export default function KnowledgePage() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);

  const onFiles = (names: string[]) => {
    const now = new Date().toISOString().slice(0, 10);
    const added: Asset[] = names.map((name, i) => ({
      id: `new-${Date.now()}-${i}`,
      name,
      type: (name.split(".").pop() || "FILE").toUpperCase().slice(0, 4),
      size: `${(Math.random() * 8 + 1).toFixed(1)} MB`,
      chunks: 0,
      status: "processing",
      uploaded: now,
    }));
    setAssets((a) => [...added, ...a]);
    added.forEach((f, idx) => {
      setTimeout(() => {
        setAssets((a) =>
          a.map((x) =>
            x.id === f.id ? { ...x, status: "indexed" as AssetStatus, chunks: Math.floor(Math.random() * 400 + 80) } : x,
          ),
        );
      }, 2600 + idx * 700);
    });
  };

  const remove = (id: string) => setAssets((a) => a.filter((x) => x.id !== id));

  const totals = {
    indexed: assets.filter((a) => a.status === "indexed").length,
    chunks: assets.reduce((s, a) => s + a.chunks, 0),
  };

  return (
    <div>
      <PageHeader
        title="Knowledge base"
        description="Source documents the AI draws on when generating assessment items. Indexed material is chunked and embedded for retrieval."
      >
        <Button variant="secondary" Icon={Settings}>Index settings</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <FileUploadZone onFiles={onFiles} />

          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
                Sources <span className="text-stone-400 dark:text-stone-500 font-normal">· {assets.length}</span>
              </h3>
              <button className="text-xs text-stone-400 dark:text-stone-500 hover:text-indigo-500 transition inline-flex items-center gap-1">
                <RefreshCw size={13} /> Re-index all
              </button>
            </div>
            <ul>
              {assets.map((a) => (
                <li
                  key={a.id}
                  className="group flex items-center gap-3.5 px-5 py-3.5 border-b border-stone-100 dark:border-white/[0.04] last:border-0 hover:bg-stone-50/70 dark:hover:bg-white/[0.02] transition"
                >
                  <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative", typeStyle(a.type))}>
                    <FileText size={18} />
                    {a.status === "processing" && (
                      <span className="absolute inset-0 rounded-xl border-2 border-amber-400/40 border-t-amber-500 animate-spin" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-stone-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-[12px] text-stone-400 dark:text-stone-500 mt-0.5">
                      {a.type} · {a.size}
                      {a.status === "indexed" && <span> · {a.chunks.toLocaleString()} chunks</span>}
                      {a.status === "processing" && <span className="text-amber-600 dark:text-amber-400"> · embedding…</span>}
                      {a.status === "failed" && <span className="text-rose-600 dark:text-rose-400"> · parse error</span>}
                    </p>
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    {a.status === "failed" && (
                      <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-indigo-500 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition">
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => remove(a.id)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn(CARD, "p-5")}>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-4">Index health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[28px] font-semibold tracking-tight text-stone-900 dark:text-white tabular-nums">
                    {totals.chunks.toLocaleString()}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">chunks embedded</span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-100 dark:bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: "78%" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-stone-50 dark:bg-white/[0.03] p-3">
                  <div className="text-xl font-semibold text-stone-900 dark:text-white tabular-nums">{totals.indexed}</div>
                  <div className="text-[11.5px] text-stone-500 dark:text-stone-400">Indexed</div>
                </div>
                <div className="rounded-xl bg-stone-50 dark:bg-white/[0.03] p-3">
                  <div className="text-xl font-semibold text-stone-900 dark:text-white tabular-nums">6.2<span className="text-sm font-normal text-stone-400"> GB</span></div>
                  <div className="text-[11.5px] text-stone-500 dark:text-stone-400">Storage used</div>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-300">
              <Sparkles size={16} />
              <h3 className="text-sm font-semibold">Tip</h3>
            </div>
            <p className="text-[12.5px] text-stone-500 dark:text-stone-400 leading-relaxed">
              Higher-quality source material produces better-aligned items. Upload official curricula and textbooks rather than summaries for best retrieval accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
