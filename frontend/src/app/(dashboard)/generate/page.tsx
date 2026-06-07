"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CARD } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/index";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { frameworksApi, generationApi, orchestrationApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Sparkles, ChevronDown, Check, ClipboardCheck, CheckCircle, AlertCircle } from "lucide-react";

const ITEM_TYPES = ["Multiple Choice", "Short Answer", "True / False", "Numeric Response", "Extended Response"];
const DIFFICULTY = ["Easy", "Medium", "Hard"];
const BLOOM = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-stone-700 dark:text-stone-200 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-stone-400 dark:text-stone-500">{hint}</p>}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-stone-200 dark:border-white/10 overflow-hidden">
      <button onClick={() => onChange(Math.max(1, value - 5))} className="w-10 h-10 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition text-lg">–</button>
      <span className="w-14 text-center text-sm font-semibold text-stone-900 dark:text-white tabular-nums">{value}</span>
      <button onClick={() => onChange(Math.min(200, value + 5))} className="w-10 h-10 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition text-lg">+</button>
    </div>
  );
}

export default function GeneratePage() {
  const router = useRouter();

  const { data: fwData } = useAsync(() => frameworksApi.list(0, 100), []);
  const FRAMEWORKS = useMemo(
    () => (fwData?.items ?? []).map((f) => ({ id: f.id, name: f.name })),
    [fwData],
  );

  const { data: modelData } = useAsync(() => orchestrationApi.listModels(), []);
  const MODELS = useMemo(() => modelData ?? [], [modelData]);

  const [framework, setFramework] = useState("");
  const [aiModel, setAiModel] = useState("");

  // Auto-select the first model with a configured key once models load.
  useEffect(() => {
    if (MODELS.length > 0 && aiModel === "") {
      const first = MODELS.find((m) => m.key_configured);
      if (first) setAiModel(first.id);
    }
  }, [MODELS]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedModelInfo = MODELS.find((m) => m.id === aiModel);
  const [type, setType] = useState("Multiple Choice");
  const [count, setCount] = useState(25);
  const [difficulty, setDifficulty] = useState<Record<string, boolean>>({ Easy: true, Medium: true, Hard: false });
  const [bloom, setBloom] = useState(["Understand", "Apply"]);
  const [creativity, setCreativity] = useState(40);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [failedReason, setFailedReason] = useState<string | null>(null);

  const toggleBloom = (b: string) =>
    setBloom((arr) => (arr.includes(b) ? arr.filter((x) => x !== b) : [...arr, b]));

  const run = async () => {
    setRunning(true);
    setFailed(false);
    setFailedReason(null);
    setProgress(10);
    try {
      const selectedModel = MODELS.find((m) => m.id === aiModel);
      const job = await generationApi.createJob({
        configuration_id: framework || undefined,
        ai_model: selectedModel?.id,
        ai_provider: selectedModel?.provider,
      });
      setProgress(50);
      // Poll until terminal state.
      const poll = async (): Promise<void> => {
        const current = await generationApi.getJob(job.id);
        if (current.status === "completed") {
          setProgress(100);
          router.push(`/review?job=${job.id}`);
          return;
        }
        if (current.status === "failed") {
          setFailed(true);
          setFailedReason(current.error_message ?? null);
          return;
        }
        setProgress((p) => Math.min(90, Math.max(50, p)));
        await new Promise((r) => setTimeout(r, 2000));
        return poll();
      };
      await poll();
    } catch {
      setFailed(true);
    }
  };

  const fw = FRAMEWORKS.find((f) => f.id === framework) || FRAMEWORKS[0];
  const done = running && progress >= 100 && !failed;
  const creativityLabel = creativity < 33 ? "Conservative" : creativity < 66 ? "Balanced" : "Exploratory";

  return (
    <div>
      <PageHeader
        title="Generate items"
        description="Configure an AI generation job. Items are drafted from your knowledge base and aligned to the selected framework's outcomes."
      >
        <Tag tone="violet">AI</Tag>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className={cn(CARD, "p-5 sm:p-6 space-y-6")}>
            <Field label="Target framework" hint="Items will be aligned to this framework's learning outcomes.">
              <div className="relative">
                <select value={framework} onChange={(e) => setFramework(e.target.value)} className={cn(INPUT_CLS, "appearance-none pr-10")}>
                  <option value="">Select a framework…</option>
                  {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </Field>

            <Field label="AI model" hint="Select the model to use for generation. Ollama models run locally.">
              <div className="relative">
                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className={cn(INPUT_CLS, "appearance-none pr-10")}>
                  <option value="">Default (system setting)</option>
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.key_configured}>
                      {m.provider === "ollama"
                        ? `🏠 ${m.id} (local)`
                        : `${m.provider} / ${m.id}`}
                      {!m.key_configured ? " (no key)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
              {selectedModelInfo && !selectedModelInfo.key_configured && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400">
                  <AlertCircle size={13} className="shrink-0" />
                  No API key configured for this provider. Add keys in{" "}
                  <a href="/settings" className="underline hover:text-amber-500">Settings &rarr; API Keys</a>.
                </p>
              )}
            </Field>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Item type">
                <div className="relative">
                  <select value={type} onChange={(e) => setType(e.target.value)} className={cn(INPUT_CLS, "appearance-none pr-10")}>
                    {ITEM_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </Field>
              <Field label="Number of items">
                <Stepper value={count} onChange={setCount} />
              </Field>
            </div>

            <Field label="Difficulty mix">
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY.map((d) => {
                  const on = difficulty[d];
                  return (
                    <button key={d} onClick={() => setDifficulty((s) => ({ ...s, [d]: !s[d] }))}
                      className={cn("px-3.5 py-2 rounded-xl text-sm font-medium border transition",
                        on ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200"
                           : "border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-white/20")}>
                      {on && <Check size={14} className="inline mr-1.5 -mt-0.5" />}{d}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Cognitive level" hint="Bloom's taxonomy levels to target.">
              <div className="flex flex-wrap gap-2">
                {BLOOM.map((b) => {
                  const on = bloom.includes(b);
                  return (
                    <button key={b} onClick={() => toggleBloom(b)}
                      className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium border transition",
                        on ? "border-violet-400 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-200"
                           : "border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-white/20")}>
                      {b}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={`Creativity — ${creativityLabel}`} hint="Lower values stay closer to source material; higher values produce more novel scenarios.">
              <input type="range" min="0" max="100" value={creativity} onChange={(e) => setCreativity(+e.target.value)} className="w-full accent-indigo-500 h-2" />
            </Field>

            <Field label="Additional instructions">
              <textarea rows={3} placeholder="e.g. Use clinical scenarios set in community-care contexts. Avoid abbreviations in stems." className={cn(INPUT_CLS, "resize-none")} />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn(CARD, "p-5 sticky top-20")}>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-4">Job summary</h3>
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-stone-500 dark:text-stone-400">Framework</dt><dd className="font-medium text-stone-900 dark:text-white text-right">{fw?.name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500 dark:text-stone-400">Type</dt><dd className="font-medium text-stone-900 dark:text-white">{type}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500 dark:text-stone-400">Items</dt><dd className="font-medium text-stone-900 dark:text-white tabular-nums">{count}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-stone-500 dark:text-stone-400">Difficulty</dt><dd className="font-medium text-stone-900 dark:text-white text-right">{Object.keys(difficulty).filter((k) => difficulty[k]).join(", ") || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-stone-500 dark:text-stone-400">Levels</dt><dd className="font-medium text-stone-900 dark:text-white text-right">{bloom.length ? bloom.join(", ") : "—"}</dd></div>
            </dl>
            <div className="my-4 h-px bg-stone-100 dark:bg-white/[0.06]" />
            <div className="flex items-center justify-between text-[13px] mb-4">
              <span className="text-stone-500 dark:text-stone-400">Est. credits</span>
              <span className="font-semibold text-stone-900 dark:text-white tabular-nums">{count * 2}</span>
            </div>
            {!running && <Button Icon={Sparkles} className="w-full" size="lg" onClick={run}>Generate {count} items</Button>}
            {running && failed && (
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-500 flex items-center justify-center"><AlertCircle size={24} /></div>
                <p className="text-sm font-medium text-stone-900 dark:text-white">Generation failed</p>
                {failedReason && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 break-words">{failedReason}</p>
                )}
                <button onClick={() => { setRunning(false); setProgress(0); setFailed(false); setFailedReason(null); }} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">Try again</button>
              </div>
            )}
            {running && !failed && !done && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-300 font-medium"><Sparkles size={14} className="animate-pulse" /> Generating…</span>
                  <span className="text-stone-500 dark:text-stone-400 tabular-nums">{Math.min(100, Math.round(progress))}%</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 dark:bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
              </div>
            )}
            {done && (
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500 flex items-center justify-center"><CheckCircle size={24} /></div>
                <p className="text-sm font-medium text-stone-900 dark:text-white">{count} items generated</p>
                <Button Icon={ClipboardCheck} className="w-full" onClick={() => router.push("/review")}>Review now</Button>
                <button onClick={() => { setRunning(false); setProgress(0); }} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">Run another job</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
