"use client";

import { useState } from "react";
import { knowledgeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContentType } from "@/types";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word (DOCX)" },
  { value: "pptx", label: "PowerPoint (PPTX)" },
  { value: "xlsx", label: "Excel (XLSX)" },
  { value: "csv", label: "CSV" },
  { value: "html", label: "HTML" },
  { value: "url", label: "URL" },
  { value: "markdown", label: "Markdown" },
  { value: "text", label: "Plain Text" },
];

export default function UploadForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<ContentType>("pdf");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await knowledgeApi.create({ title, description: description || undefined, content_type: contentType });
      setSuccess(true);
      setTitle("");
      setDescription("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Input
        id="title"
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="e.g. Nursing Pharmacology Guide 2024"
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-gray-700">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          placeholder="Brief description of the document content"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content_type" className="text-sm font-medium text-gray-700">
          Content Type
        </label>
        <select
          id="content_type"
          value={contentType}
          onChange={(e) => setContentType(e.target.value as ContentType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Asset created successfully. It will be queued for processing.
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create Asset"}
      </Button>
    </form>
  );
}
