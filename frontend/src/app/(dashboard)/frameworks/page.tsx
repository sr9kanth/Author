"use client";

import { useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, SearchInput, Segmented } from "@/components/ui/index";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Filter, Folder, MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown, Layers } from "lucide-react";

const FRAMEWORKS = [
  { id: "fw-1", name: "Bloom's Taxonomy Alignment", domain: "General Pedagogy", outcomes: 48, items: 312, status: "published", owner: "Amara O.", updated: "2026-05-29" },
  { id: "fw-2", name: "Registered Nurse Competencies 2025", domain: "Health Sciences", outcomes: 126, items: 540, status: "published", owner: "Priya N.", updated: "2026-05-27" },
  { id: "fw-3", name: "AP Biology — Unit Outcomes", domain: "Secondary STEM", outcomes: 64, items: 218, status: "approved", owner: "Lena B.", updated: "2026-05-24" },
  { id: "fw-4", name: "ISTE Digital Literacy Standards", domain: "Educational Technology", outcomes: 28, items: 96, status: "validated", owner: "Tomás V.", updated: "2026-05-21" },
  { id: "fw-5", name: "GCSE Mathematics Outcomes", domain: "Secondary STEM", outcomes: 72, items: 144, status: "generated", owner: "Marcus H.", updated: "2026-05-18" },
  { id: "fw-6", name: "CFA Level I — Ethics Module", domain: "Professional Finance", outcomes: 18, items: 60, status: "draft", owner: "Amara O.", updated: "2026-05-16" },
  { id: "fw-7", name: "Common Core ELA — Grade 8", domain: "Secondary Literacy", outcomes: 41, items: 130, status: "approved", owner: "Priya N.", updated: "2026-05-12" },
  { id: "fw-8", name: "OSHA Workplace Safety Cert.", domain: "Vocational Training", outcomes: 22, items: 84, status: "validated", owner: "Lena B.", updated: "2026-05-09" },
];

const DOMAINS = ["All domains", "Health Sciences", "Secondary STEM", "General Pedagogy", "Educational Technology"];

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FrameworksPage() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("All domains");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const [emptyDemo, setEmptyDemo] = useState(false);

  const onSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  let rows = FRAMEWORKS.filter((f) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.domain.toLowerCase().includes(q);
    const matchD = domain === "All domains" || f.domain === domain;
    return matchQ && matchD;
  });

  rows = [...rows].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const va = (a as any)[sort.key], vb = (b as any)[sort.key];
    if (typeof va === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });

  if (emptyDemo) rows = [];

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
      <PageHeader
        title="Frameworks"
        description="Competency frameworks and learning-outcome maps that structure your generated content."
      >
        <Button variant="secondary" Icon={Filter} size="md">Import</Button>
        <Button Icon={Plus}>New framework</Button>
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
        <button
          onClick={() => setEmptyDemo((v) => !v)}
          className="text-xs text-stone-400 dark:text-stone-500 hover:text-indigo-500 transition"
        >
          {emptyDemo ? "← Show data" : "Preview empty state"}
        </button>
      </div>

      <div className={cn(CARD, "overflow-hidden")}>
        {rows.length === 0 ? (
          <EmptyState
            Icon={Layers}
            title={emptyDemo ? "No frameworks yet" : "No matches found"}
            subtext={
              emptyDemo
                ? "Frameworks organise your learning outcomes and competencies. Create one to start generating aligned assessment content."
                : "Try adjusting your search or domain filter."
            }
            action={
              emptyDemo ? (
                <Button Icon={Plus} onClick={() => setEmptyDemo(false)}>Create your first framework</Button>
              ) : null
            }
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
          Showing {rows.length} of {FRAMEWORKS.length} frameworks
        </p>
      )}
    </div>
  );
}
