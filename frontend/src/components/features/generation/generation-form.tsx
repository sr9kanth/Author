"use client";

import { useState } from "react";
import { generationApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { GenerationJob } from "@/types";

const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "gemini", label: "Google (Gemini)" },
  { value: "ollama", label: "Ollama (Local)" },
];

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-opus-4-8", label: "Claude Opus 4" },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  gemini: [
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  ollama: [
    { value: "llama3.2", label: "Llama 3.2" },
  ],
};

export default function GenerationForm() {
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("claude-opus-4-8");
  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableModels = AI_MODELS[provider] ?? [];

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    const models = AI_MODELS[newProvider] ?? [];
    setModel(models[0]?.value ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const job = await generationApi.createJob({ ai_provider: provider, ai_model: model });
      setCreatedJob(job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create generation job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="flex flex-col gap-1">
        <label htmlFor="provider" className="text-sm font-medium text-gray-700">
          AI Provider
        </label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="model" className="text-sm font-medium text-gray-700">
          Model
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {availableModels.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {createdJob && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <p className="font-medium">Generation job created</p>
          <p className="mt-1 text-xs font-mono text-green-600">{createdJob.id}</p>
          <p className="mt-1">
            Status: <Badge label={createdJob.status} status={createdJob.status} />
          </p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Submitting…" : "Start Generation Job"}
      </Button>
    </form>
  );
}
