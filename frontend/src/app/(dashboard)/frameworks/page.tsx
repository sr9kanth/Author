"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, SearchInput, Segmented } from "@/components/ui/index";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INPUT_CLS } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { frameworksApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Plus, Filter, Folder, MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown, Layers, X } from "lucide-react";

interface FrameworkRow {
  id: string;
  name: string;
  domain: string;
  outcomes: number;
  items: number;
  status: string;
  owner: string;
  updated: string;
}

interface NewFrameworkModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewFrameworkModal({ onClose, onCreated }: NewFrameworkModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await frameworksApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        version: version.trim() || "1.0",
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(CARD, "w-full max-w-lg p-6 flex flex-col gap-5")}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-white">New framework</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-stone-700 dark:text-stone-200">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={nameRef}
              className={INPUT_CLS}
              placeholder="e.g. Software Engineering Competencies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-stone-700 dark:text-stone-200">Description</label>
            <textarea
              className={cn(INPUT_CLS, "resize-none min-h-[80px]")}
              placeholder="Brief description of this framework…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-200">Version</label>
              <input
                className={INPUT_CLS}
                placeholder="1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-200">Domain</label>
              <input
                className={INPUT_CLS}
                placeholder="e.g. Engineering"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" Icon={Plus} size="md" disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create framework"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FrameworksPage() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("All domains");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const [showNewModal, setShowNewModal] = useState(false);

  const { data, loading, error, reload } = useAsync(() => frameworksApi.list(0, 100), []);

  const frameworks: FrameworkRow[] = useMemo(
    () =>
      (data?.items ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        domain: f.domain ?? "—",
        outcomes: f.outcomes_count,
        items: f.items_count,
        status: f.status,
        owner: f.owner_name ?? "—",
        updated: f.updated_at,
      })),
    [data],
  );

  const DOMAINS = useMemo(() => {
    const set = new Set(frameworks.map((f) => f.domain).filter((d) => d && d !== "—"));
    return ["All domains", ...Array.from(set)];
  }, [frameworks]);

  const onSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  let rows = frameworks.filter((f) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.domain.toLowerCase().includes(q);
    const matchD = domain === "All domains" || f.domain === domain;
    return matchQ && matchD;
  });

  rows = [...rows].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const va = (a as unknown as Record<string, unknown>)[sort.key];
    const vb = (b as unknown as Record<string, unknown>)[sort.key];
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });

  const isEmpty = !loading && frameworks.length === 0;

  const columns = [
    { key: "name", label: "Framework" },
    { key: "domain", label: "Domain", cls: "hidden md:table-cell" },
    { key: "outcomes", label: "Outcomes", cls: "hidden sm:table-cell" },
    { key: "items", label: "Items", cls: "hidden sm:table-cell" },
    { key: "status", label: "Status" },
    { key: "owner", label: "Owner", cls: "hidden lg:table-cell" },
    { key: "updated", label: "Updated", cls: "hidden lg:table-cell" },
    { key: "actions", label: "", sortable: false },
  ];

  return (
    <div>
      {showNewModal && (
        <NewFrameworkModal
          onClose={() => setShowNewModal(false)}
          onCreated={reload}
        />
      )}
      <PageHeader
        title="Frameworks"
        description="Competency frameworks and learning-outcome maps that structure your generated content."
      >
        <Button variant="secondary" Icon={Filter} size="md">Import</Button>
        <Button Icon={Plus} onClick={() => setShowNewModal(true)}>New framework</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search frameworks…" className="sm:w-72" />
        <Segmented
          size="sm"
          options={DOMAINS.slice(0, 4).map((d) => ({ value: d, label: d.split(" ")[0] }))}
          value={DOMAINS.slice(0, 4).includes(domain) ? domain : "All domains"}
          onChange={setDomain}
        />
        <div className="flex-1" />
      </div>

      <div className={cn(CARD, "overflow-hidden")}>
        {loading ? (
          <div className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading frameworks…</div>
        ) : error ? (
          <EmptyState Icon={Layers} title="Couldn't load frameworks" subtext={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            Icon={Layers}
            title={isEmpty ? "No frameworks yet" : "No matches found"}
            subtext={
              isEmpty
                ? "Frameworks organise your learning outcomes and competencies. Create one to start generating aligned assessment content."
                : "Try adjusting your search or domain filter."
            }
            action={isEmpty ? <Button Icon={Plus} onClick={() => setShowNewModal(true)}>Create your first framework</Button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 dark:border-white/[0.07]">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "text-left font-medium text-stone-500 dark:text-stone-400 px-4 py-3 text-[12px] uppercase tracking-wide select-none",
                        c.cls,
                      )}
                    >
                      {c.sortable === false ? (
                        c.label
                      ) : (
                        <button
                          onClick={() => onSort(c.key)}
                          className="inline-flex items-center gap-1 hover:text-stone-800 dark:hover:text-stone-200 transition"
                        >
                          {c.label}
                          {sort.key === c.key ? (
                            sort.dir === "asc" ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />
                          ) : (
                            <ChevronsUpDown size={13} className="text-stone-300 dark:text-stone-600" />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-stone-100 dark:border-white/[0.04] last:border-0 transition cursor-pointer hover:bg-stone-50/80 dark:hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 flex items-center justify-center shrink-0">
                          <Folder size={17} />
                        </span>
                        <span className="font-medium text-stone-900 dark:text-white">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400 hidden md:table-cell">{f.domain}</td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 tabular-nums hidden sm:table-cell">{f.outcomes}</td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 tabular-nums hidden sm:table-cell">{f.items}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={f.status} size="sm" /></td>
                    <td className="px-4 py-3.5 text-[13px] text-stone-500 dark:text-stone-400 hidden lg:table-cell">{f.owner}</td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400 whitespace-nowrap hidden lg:table-cell">{fmtDate(f.updated)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition">
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
          Showing {rows.length} of {frameworks.length} frameworks
        </p>
      )}
    </div>
  );
}
