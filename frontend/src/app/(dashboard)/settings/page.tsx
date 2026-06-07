"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { CARD } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { settingsApi, type ApiKeyStatus } from "@/lib/api";
import { CheckCircle, XCircle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
};

function ProviderRow({
  status,
  onSave,
}: {
  status: ApiKeyStatus;
  onSave: (provider: string, key: string) => Promise<void>;
}) {
  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    if (!inputKey.trim()) return;
    setSaving(true);
    setResult(null);
    try {
      await onSave(status.provider, inputKey.trim());
      setResult("success");
      setInputKey("");
    } catch (e: unknown) {
      setResult("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-5 border-b border-stone-100 dark:border-white/[0.06] last:border-0">
      {/* Provider info */}
      <div className="sm:w-52 shrink-0">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-stone-400 shrink-0" />
          <span className="text-[13.5px] font-semibold text-stone-800 dark:text-stone-100">
            {PROVIDER_LABELS[status.provider] ?? status.provider}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {status.configured ? (
            <>
              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
              <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">Configured</span>
              {status.masked_key && (
                <span className="text-[11px] text-stone-400 font-mono ml-1">{status.masked_key}</span>
              )}
            </>
          ) : (
            <>
              <XCircle size={13} className="text-stone-400 shrink-0" />
              <span className="text-[12px] text-stone-400">Not configured</span>
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={status.configured ? "Enter new key to replace…" : "Enter API key…"}
              className={cn(INPUT_CLS, "pr-10 font-mono text-[13px]")}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !inputKey.trim()}
            size="sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
          </Button>
        </div>

        {result === "success" && (
          <p className="flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={12} /> Key saved successfully.
          </p>
        )}
        {result === "error" && (
          <p className="flex items-center gap-1.5 text-[12px] text-rose-600 dark:text-rose-400">
            <XCircle size={12} /> {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await settingsApi.getApiKeys();
      setKeys(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load key statuses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(provider: string, api_key: string) {
    const updated = await settingsApi.saveApiKey(provider, api_key);
    setKeys(updated);
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage application configuration including API keys for AI providers."
      />

      <div className="max-w-2xl space-y-6">
        <div className={cn(CARD, "p-5 sm:p-6")}>
          <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white mb-1">
            API Keys
          </h2>
          <p className="text-[13px] text-stone-500 dark:text-stone-400 mb-5">
            Keys are stored encrypted in the database and applied to the running process immediately.
            They are never returned in full — only a masked preview is shown.
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-stone-400 text-[13px]">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          )}

          {loadError && (
            <p className="text-[13px] text-rose-600 dark:text-rose-400">{loadError}</p>
          )}

          {!loading && !loadError && keys.length === 0 && (
            <p className="text-[13px] text-stone-400">No providers found.</p>
          )}

          {!loading && !loadError && keys.map((k) => (
            <ProviderRow key={k.provider} status={k} onSave={handleSave} />
          ))}
        </div>
      </div>
    </div>
  );
}
