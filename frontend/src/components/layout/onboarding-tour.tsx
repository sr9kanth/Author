"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowRight, X, Layers, Database, Sparkles,
  ClipboardCheck, Library, LayoutDashboard,
} from "lucide-react";

const TOUR_KEY = "aip_tour_done";

interface Step {
  title: string;
  body: string;
  href: string;
  Icon: React.ElementType;
  accent: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to AIP",
    body: "Assessment Intelligence Platform helps you build high-quality exam items at scale using AI. This quick tour shows you the core workflow — takes about 60 seconds.",
    href: "/dashboard",
    Icon: LayoutDashboard,
    accent: "from-indigo-500 to-violet-600",
  },
  {
    title: "1. Build a framework",
    body: "Start by creating a competency framework. Frameworks define the learning outcomes your assessment items will be aligned to.",
    href: "/frameworks",
    Icon: Layers,
    accent: "from-indigo-500 to-indigo-600",
    tip: "Click "New framework" and give it a name and domain to get started.",
  },
  {
    title: "2. Upload knowledge",
    body: "Upload source documents — PDFs, Word docs, slides. The AI reads and indexes them so it can generate contextually accurate questions.",
    href: "/knowledge",
    Icon: Database,
    accent: "from-sky-500 to-sky-600",
    tip: "Drag files onto the upload zone. Processing takes a few seconds per document.",
  },
  {
    title: "3. Generate items",
    body: "Configure a generation job: pick your framework, item type, difficulty mix, and Bloom's taxonomy levels. Click Generate and the AI drafts items from your knowledge base.",
    href: "/generate",
    Icon: Sparkles,
    accent: "from-violet-500 to-violet-600",
    tip: "You can choose between cloud models (DeepSeek) or a local Ollama model from the AI model dropdown.",
  },
  {
    title: "4. Review & approve",
    body: "Generated items arrive here for human review. Read each stem and options, then Approve or send back to Draft. Approved items move to the Repository.",
    href: "/review",
    Icon: ClipboardCheck,
    accent: "from-amber-500 to-orange-500",
    tip: "After a generation job completes you'll be taken here automatically.",
  },
  {
    title: "5. Assemble a package",
    body: "Drag approved items from the Repository into a package to build an exam or assessment form. Add a name and click Publish.",
    href: "/assembly",
    Icon: Library,
    accent: "from-emerald-500 to-emerald-600",
    tip: "Items can be reordered by dragging within the package.",
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(TOUR_KEY);
      if (!done) setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      router.push(STEPS[step + 1].href);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) {
      setStep((s) => s - 1);
      router.push(STEPS[step - 1].href);
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={dismiss}
      />

      {/* Card — bottom-right anchored */}
      <div
        className={cn(
          "fixed z-50 bottom-6 right-6 w-[360px] rounded-2xl shadow-2xl shadow-black/40",
          "bg-[#111115] border border-white/[0.08] overflow-hidden",
        )}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-white/[0.06]">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white shadow-sm",
                  current.accent,
                )}
              >
                <current.Icon size={18} />
              </span>
              <h3 className="text-[15px] font-semibold text-white leading-snug">{current.title}</h3>
            </div>
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-200 hover:bg-white/[0.06] transition shrink-0 mt-0.5"
              title="Skip tour"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <p className="text-[13.5px] text-stone-300 leading-relaxed mb-3">{current.body}</p>

          {current.tip && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-2.5 mb-4">
              <p className="text-[12px] text-stone-400 leading-relaxed">
                <span className="text-indigo-400 font-semibold">Tip: </span>
                {current.tip}
              </p>
            </div>
          )}

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setStep(i); router.push(STEPS[i].href); }}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === step
                    ? "w-5 h-1.5 bg-indigo-400"
                    : "w-1.5 h-1.5 bg-white/[0.15] hover:bg-white/30",
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={dismiss}
              className="text-[12px] text-stone-500 hover:text-stone-300 transition mr-auto"
            >
              Skip tour
            </button>
            {step > 0 && (
              <button
                onClick={prev}
                className="text-[13px] font-medium text-stone-400 hover:text-stone-200 transition px-3 py-1.5 rounded-xl hover:bg-white/[0.05]"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-medium px-4 py-1.5 rounded-xl transition"
            >
              {isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Call this to reset the tour (e.g. from a Help menu)
export function resetTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_KEY);
  }
}
