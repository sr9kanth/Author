"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CARD } from "@/components/ui/card";
import { PageHeader, EmptyState, FileUploadZone } from "@/components/ui/index";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { knowledgeApi, knowledgeGraphApi } from "@/lib/api";
import type { GraphNode, GraphEdge } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { DetailPanel, useDetailPanel } from "@/components/ui/detail-panel";
import { Tag } from "@/components/ui/badge";
import type { KnowledgeAsset } from "@/types";
import {
  Settings,
  FileText,
  RefreshCw,
  Trash2,
  Sparkles,
  Database,
  ChevronRight,
  ChevronDown,
  GitFork,
} from "lucide-react";

type DisplayStatus = "indexed" | "processing" | "failed";

// ── Topic tree types ──────────────────────────────────────────────────────────

interface TopicNode {
  key: string;       // e.g. "1", "301", "2.3"
  label: string;
  children: TopicNode[];
  genCount: number;  // proxy: number of leaf concepts under this node
}

/** Build a flat or nested TopicNode[] from the raw extracted_topics field */
function buildTopicTree(raw: unknown): TopicNode[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      const label = String(item);
      return { key: String(idx + 1), label, children: [], genCount: 1 };
    });
  }

  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>;
    return Object.entries(rec).map(([key, val]) => {
      if (Array.isArray(val)) {
        const children: TopicNode[] = val.map((child, ci) => ({
          key: `${key}.${ci + 1}`,
          label: String(child),
          children: [],
          genCount: 1,
        }));
        return { key, label: key, children, genCount: children.length };
      }
      if (typeof val === "object" && val !== null) {
        const children = buildTopicTree(val);
        return { key, label: key, children, genCount: children.reduce((s, c) => s + c.genCount, 0) };
      }
      return { key, label: String(val), children: [], genCount: 1 };
    });
  }

  return [];
}

// ── Topic tree component ──────────────────────────────────────────────────────

function GenBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shrink-0">
      Gen {count}
    </span>
  );
}

function TopicTreeNode({ node, depth = 0 }: { node: TopicNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 pr-2 rounded-lg group",
          hasChildren ? "cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.03]" : "",
          depth > 0 ? "pl-3" : "pl-1",
        )}
        style={depth > 1 ? { paddingLeft: `${depth * 12 + 4}px` } : undefined}
        onClick={() => hasChildren && setExpanded((p) => !p)}
      >
        {/* expand/collapse icon */}
        <span className="w-4 h-4 shrink-0 flex items-center justify-center text-stone-400">
          {hasChildren ? (
            expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-stone-200 dark:bg-white/20 inline-block" />
          )}
        </span>

        {/* number */}
        <span className="font-mono text-[11px] font-bold text-stone-400 dark:text-stone-500 shrink-0 min-w-[28px]">
          {node.key}
        </span>

        {/* label */}
        <span className="text-[13px] text-stone-800 dark:text-stone-200 flex-1 leading-snug">
          {node.label}
        </span>

        {/* Gen badge */}
        <GenBadge count={node.genCount} />
      </div>

      {/* children */}
      {hasChildren && expanded && (
        <ul
          className="relative ml-5 border-l border-stone-100 dark:border-white/[0.06]"
        >
          {node.children.map((child) => (
            <TopicTreeNode key={child.key} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function TopicTree({ nodes }: { nodes: TopicNode[] }) {
  if (nodes.length === 0) {
    return (
      <p className="text-[12.5px] text-stone-400 dark:text-stone-500 italic">
        No topics extracted yet. Re-index this source to extract topics.
      </p>
    );
  }
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => (
        <TopicTreeNode key={n.key} node={n} depth={0} />
      ))}
    </ul>
  );
}

// ── Concept Graph ─────────────────────────────────────────────────────────────

const NODE_TYPE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  topic:   { fill: "#6366f1", stroke: "#4f46e5", label: "Topic" },
  concept: { fill: "#8b5cf6", stroke: "#7c3aed", label: "Concept" },
  outcome: { fill: "#10b981", stroke: "#059669", label: "Outcome" },
  keyword: { fill: "#78716c", stroke: "#57534e", label: "Keyword" },
};

function weightToRadius(w: number): number {
  // weight 1–5 → radius 14–28
  return 14 + (Math.max(1, Math.min(5, w)) - 1) * 3.5;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function ConceptGraphSVG({ graph }: { graph: GraphData }) {
  const { nodes, edges } = graph;
  const count = nodes.length;
  const W = 560;
  const H = 440;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(cx, cy) - 50;

  // Place nodes in a circle
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / (count || 1) - Math.PI / 2;
    positions[n.id] = {
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle),
    };
  });

  return (
    <div className="overflow-auto rounded-xl border border-stone-100 dark:border-white/[0.06] bg-stone-50 dark:bg-white/[0.02]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const src = positions[e.source];
          const tgt = positions[e.target];
          if (!src || !tgt) return null;
          return (
            <line
              key={i}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke="#d1d5db"
              strokeWidth={Math.max(0.5, e.weight * 2)}
              strokeOpacity={0.7}
            >
              <title>{e.label}</title>
            </line>
          );
        })}
        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions[n.id];
          if (!pos) return null;
          const r = weightToRadius(n.weight);
          const col = NODE_TYPE_COLORS[n.type] ?? NODE_TYPE_COLORS.keyword;
          const truncated = n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label;
          return (
            <g key={n.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={col.fill}
                stroke={col.stroke}
                strokeWidth={1.5}
                opacity={0.9}
              />
              <text
                x={pos.x}
                y={pos.y + r + 13}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
                className="select-none"
              >
                {truncated}
              </text>
              <title>{n.label} ({n.type})</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GraphLegend() {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {Object.entries(NODE_TYPE_COLORS).map(([type, col]) => (
        <span key={type} className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-500 dark:text-stone-400">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: col.fill }}
          />
          {col.label}
        </span>
      ))}
    </div>
  );
}

function ConceptGraphTab({ assetId }: { assetId: string }) {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try to load cached graph on mount
  useEffect(() => {
    setGraph(null);
    setError(null);
    knowledgeGraphApi.get(assetId)
      .then((g) => setGraph(g as GraphData))
      .catch(() => {
        // 404 = not generated yet, ignore
      });
  }, [assetId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await knowledgeGraphApi.generate(assetId);
      setGraph(g as GraphData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
          Concept graph
        </p>
        <Button
          variant="secondary"
          Icon={loading ? RefreshCw : GitFork}
          onClick={generate}
        >
          {loading ? "Generating…" : graph ? "Regenerate" : "Generate graph"}
        </Button>
      </div>

      {error && (
        <p className="text-[12px] text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {loading && !graph && (
        <div className="flex items-center justify-center py-16 text-sm text-stone-400 dark:text-stone-500">
          <RefreshCw size={16} className="animate-spin mr-2" /> Building graph…
        </div>
      )}

      {graph && graph.nodes.length > 0 ? (
        <>
          <ConceptGraphSVG graph={graph} />
          <GraphLegend />
          <p className="text-[11.5px] text-stone-400 dark:text-stone-500">
            {graph.nodes.length} nodes · {graph.edges.length} edges · hover edges for relationship label
          </p>
        </>
      ) : !loading && !graph ? (
        <p className="text-[12.5px] text-stone-400 dark:text-stone-500 italic">
          No graph generated yet. Click "Generate graph" to build one from this asset's extracted knowledge.
        </p>
      ) : null}
    </div>
  );
}

// ── Asset helpers ─────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  name: string;
  type: string;
  size: string;
  fileSizeBytes: number | null;
  chunks: number;
  status: DisplayStatus;
  uploaded: string;
  topics: TopicNode[];
  keywords: string[];
  storagePath: string | null;
}

function fmtSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function displayStatus(s: KnowledgeAsset["status"]): DisplayStatus {
  if (s === "processed") return "indexed";
  if (s === "failed") return "failed";
  return "processing";
}

function chunkCount(a: KnowledgeAsset): number {
  const topics = a.extracted_topics;
  if (topics && typeof topics === "object") return Object.keys(topics).length;
  return 0;
}

const EXT_TO_TYPE: Record<string, string> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  ppt: "pptx",
  pptx: "pptx",
  xls: "xlsx",
  xlsx: "xlsx",
  csv: "csv",
  htm: "html",
  html: "html",
  md: "markdown",
  markdown: "markdown",
  txt: "text",
};

function contentTypeForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext] ?? "text";
}

function typeStyle(t: string) {
  const m: Record<string, string> = {
    PDF: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    DOCX: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    PPTX: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    EPUB: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
  };
  return m[t] || "bg-stone-100 text-stone-500 dark:bg-white/[0.06] dark:text-stone-400";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
        {label}
      </span>
      <span className="text-[13.5px] text-stone-800 dark:text-stone-100 break-words">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const { data, loading, error, reload } = useAsync(() => knowledgeApi.list(0, 100), []);

  // Auto-poll every 4s while any asset is still processing
  useEffect(() => {
    const hasProcessing = (data?.items ?? []).some(
      (a) => a.status === "uploaded" || a.status === "processing",
    );
    if (!hasProcessing) return;
    const t = setTimeout(reload, 4000);
    return () => clearTimeout(t);
  }, [data, reload]);

  const assets: Asset[] = useMemo(
    () =>
      (data?.items ?? []).map((a) => ({
        id: a.id,
        name: a.title,
        type: a.content_type.toUpperCase().slice(0, 4),
        size: fmtSize(a.file_size),
        fileSizeBytes: a.file_size,
        chunks: chunkCount(a),
        status: displayStatus(a.status),
        uploaded: a.created_at,
        topics: buildTopicTree(a.extracted_topics),
        keywords: a.keywords ?? [],
        storagePath: a.storage_path,
      })),
    [data],
  );

  const panel = useDetailPanel<Asset>();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFiles = async (files: File[]) => {
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const asset = await knowledgeApi.create({
          title: file.name,
          content_type: contentTypeForFile(file.name),
        });
        await knowledgeApi.uploadFile(asset.id, file);
      }
      reload();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await knowledgeApi.delete(id);
    reload();
  };

  const totals = {
    indexed: assets.filter((a) => a.status === "indexed").length,
    chunks: assets.reduce((s, a) => s + a.chunks, 0),
    storage_bytes: (data?.items ?? []).reduce((s, a) => s + (a.file_size ?? 0), 0),
  };

  // Build panel tabs for the selected asset
  const panelTabs = useMemo(() => {
    const active = panel.active;
    if (!active) return [];
    return [
      {
        id: "content",
        label: "Content",
        content: (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-3">
              Topic tree
            </p>
            <TopicTree nodes={active.topics} />
          </div>
        ),
      },
      {
        id: "sources",
        label: "Sources",
        content: (
          <div className="space-y-5">
            <Field label="File name" value={active.name} />
            <div className="grid grid-cols-2 gap-5">
              <Field label="Type" value={<Tag tone="indigo">{active.type}</Tag>} />
              <Field label="Size" value={active.size} />
            </div>
            <Field label="Status" value={<StatusBadge status={active.status} size="sm" />} />
            <Field
              label="Uploaded"
              value={active.uploaded ? new Date(active.uploaded).toLocaleString() : "—"}
            />
            <Field
              label="Storage path"
              value={
                <span className="font-mono text-[12px] break-all">
                  {active.storagePath ?? "—"}
                </span>
              }
            />
            <Field label="ID" value={<span className="font-mono text-[12px]">{active.id}</span>} />
          </div>
        ),
      },
      {
        id: "keywords",
        label: "Keywords",
        content: (
          <div>
            {active.keywords.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {active.keywords.map((k) => (
                  <Tag key={k} tone="neutral">{k}</Tag>
                ))}
              </span>
            ) : (
              <p className="text-[12.5px] text-stone-400 dark:text-stone-500 italic">
                No keywords extracted yet.
              </p>
            )}
          </div>
        ),
      },
      {
        id: "graph",
        label: "Graph",
        content: <ConceptGraphTab assetId={active.id} />,
      },
    ];
  }, [panel.active]);

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

          {uploading && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Uploading…</p>
          )}
          {uploadError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>
          )}

          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
                Sources <span className="text-stone-400 dark:text-stone-500 font-normal">· {assets.length}</span>
              </h3>
              <button
                onClick={() => reload()}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-indigo-500 transition inline-flex items-center gap-1"
              >
                <RefreshCw size={13} /> Re-index all
              </button>
            </div>
            {loading ? (
              <div className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">Loading sources…</div>
            ) : error ? (
              <EmptyState Icon={Database} title="Couldn't load sources" subtext={error} />
            ) : assets.length === 0 ? (
              <EmptyState Icon={Database} title="No sources yet" subtext="Upload documents to build your knowledge base. Indexed material is chunked and embedded for retrieval." />
            ) : (
            <ul>
              {assets.map((a) => (
                <li
                  key={a.id}
                  onClick={() => panel.openWith(a)}
                  className={cn(
                    "group flex items-center gap-3.5 px-5 py-3.5 border-b border-stone-100 dark:border-white/[0.04] last:border-0 cursor-pointer transition",
                    panel.open && panel.active?.id === a.id
                      ? "bg-indigo-50/60 dark:bg-indigo-500/[0.06]"
                      : "hover:bg-stone-50/70 dark:hover:bg-white/[0.02]",
                  )}
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
                  {/* topic count badge */}
                  {a.topics.length > 0 && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300 shrink-0">
                      {a.topics.length} topics
                    </span>
                  )}
                  <StatusBadge status={a.status} size="sm" />
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    {a.status === "failed" && (
                      <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-indigo-500 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition">
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(a.id); }}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            )}
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
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: totals.chunks > 0 ? "100%" : "0%" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-stone-50 dark:bg-white/[0.03] p-3">
                  <div className="text-xl font-semibold text-stone-900 dark:text-white tabular-nums">{totals.indexed}</div>
                  <div className="text-[11.5px] text-stone-500 dark:text-stone-400">Indexed</div>
                </div>
                <div className="rounded-xl bg-stone-50 dark:bg-white/[0.03] p-3">
                  <div className="text-xl font-semibold text-stone-900 dark:text-white tabular-nums">{fmtSize(totals.storage_bytes)}</div>
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

      <DetailPanel
        open={panel.open}
        onClose={panel.close}
        title={panel.active?.name ?? "Source"}
        subtitle={panel.active ? `${panel.active.type} · ${panel.active.size}` : undefined}
        tabs={panelTabs}
      />
    </div>
  );
}
