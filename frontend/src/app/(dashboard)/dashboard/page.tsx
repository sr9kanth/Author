"use client";

import { CARD } from "@/components/ui/card";
import { StatsCard, PageHeader, EmptyState } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { dashboardApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import {
  Layers, FileText, ClipboardCheck, CheckCircle,
  TrendingUp, Upload, Sparkles, Package, ArrowRight,
  CheckCircle2, AlertCircle, Activity as ActivityIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function activityVisual(kind: string): { Icon: LucideIcon; tint: string } {
  const k = kind.toLowerCase();
  if (k.includes("approve")) return { Icon: CheckCircle2, tint: "text-emerald-500" };
  if (k.includes("generat")) return { Icon: Sparkles, tint: "text-violet-500" };
  if (k.includes("upload") || k.includes("knowledge")) return { Icon: Upload, tint: "text-indigo-500" };
  if (k.includes("publish") || k.includes("package") || k.includes("assembl")) return { Icon: Package, tint: "text-sky-500" };
  if (k.includes("flag") || k.includes("review")) return { Icon: AlertCircle, tint: "text-amber-500" };
  if (k.includes("framework")) return { Icon: Layers, tint: "text-indigo-500" };
  return { Icon: ActivityIcon, tint: "text-stone-500" };
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

const data = [38, 52, 41, 67, 59, 78, 71, 90, 84, 96, 88, 104];
const max = Math.max(...data);

function MiniBars() {
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500/70 to-violet-400/80 hover:from-indigo-500 hover:to-violet-400 transition-all"
          style={{ height: `${(d / max) * 100}%` }}
          title={`${d} items`}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: stats, loading: statsLoading } = useAsync(() => dashboardApi.stats(), []);
  const { data: activity, loading: activityLoading } = useAsync(() => dashboardApi.activity(10), []);

  const activityItems = activity?.items ?? [];

  const quickActions = [
    { icon: Layers, accent: "from-indigo-500 to-indigo-600", title: "New framework", desc: "Define outcomes & competencies", href: "/frameworks" },
    { icon: Upload, accent: "from-sky-500 to-sky-600", title: "Upload knowledge", desc: "Add source material to index", href: "/knowledge" },
    { icon: Sparkles, accent: "from-violet-500 to-violet-600", title: "Generate items", desc: "Configure an AI generation job", href: "/generate" },
    { icon: Package, accent: "from-emerald-500 to-emerald-600", title: "Assemble package", desc: "Build an exam from the bank", href: "/assembly" },
  ];

  return (
    <div>
      <PageHeader
        title="Good morning"
        description="Here's what's happening across your assessment workspace today."
      >
        <Button variant="secondary" Icon={FileText} size="md">Export report</Button>
        <Button Icon={Sparkles} onClick={() => router.push("/generate")}>New generation</Button>
      </PageHeader>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatsCard Icon={Layers} accent="indigo" label="Active frameworks" value={statsLoading ? "—" : (stats?.active_frameworks ?? 0).toLocaleString()} />
        <StatsCard Icon={FileText} accent="violet" label="Items generated" value={statsLoading ? "—" : (stats?.items_generated ?? 0).toLocaleString()} />
        <StatsCard Icon={ClipboardCheck} accent="amber" label="Awaiting review" value={statsLoading ? "—" : (stats?.awaiting_review ?? 0).toLocaleString()} />
        <StatsCard Icon={CheckCircle} accent="emerald" label="Approval rate" value={statsLoading ? "—" : `${Math.round(stats?.approval_rate ?? 0)}%`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Generation throughput</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Items produced per week — last 12 weeks</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={14} /> Trending up
              </span>
            </div>
            <MiniBars />
            <div className="flex items-center justify-between mt-3 text-[11px] text-stone-400 dark:text-stone-500">
              <span>Mar</span><span>Apr</span><span>May</span><span>Now</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-3">Quick actions</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickActions.map((qa) => (
                <button
                  key={qa.href}
                  onClick={() => router.push(qa.href)}
                  className={cn(CARD, "group p-4 text-left flex items-start gap-3.5 hover:shadow-md hover:shadow-stone-200/50 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200")}
                >
                  <span className={cn("inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br text-white shrink-0 shadow-sm", qa.accent)}>
                    <qa.icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-stone-900 dark:text-white">
                      {qa.title}
                      <ArrowRight size={14} className="text-stone-300 dark:text-stone-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
                    </span>
                    <span className="block mt-0.5 text-[12.5px] text-stone-500 dark:text-stone-400 leading-snug">{qa.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Recent activity</h3>
              <button className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View all</button>
            </div>
            {activityLoading ? (
              <p className="text-[13px] text-stone-400 dark:text-stone-500 py-4">Loading activity…</p>
            ) : activityItems.length === 0 ? (
              <EmptyState Icon={ActivityIcon} title="No activity yet" subtext="Actions across your workspace will appear here." />
            ) : (
              <ol className="space-y-1">
                {activityItems.map((a, i) => {
                  const { Icon, tint } = activityVisual(a.kind);
                  return (
                    <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < activityItems.length - 1 && (
                        <span className="absolute left-[15px] top-8 bottom-0 w-px bg-stone-200 dark:bg-white/[0.07]" />
                      )}
                      <span className={cn("relative z-10 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 dark:bg-white/[0.06]", tint)}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-stone-700 dark:text-stone-200 leading-snug">{a.summary}</p>
                        <p className="text-[11.5px] text-stone-400 dark:text-stone-500 mt-0.5">{timeAgo(a.created_at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Review queue</h3>
              <button onClick={() => router.push("/review")} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Open</button>
            </div>
            {statsLoading ? (
              <p className="text-[13px] text-stone-400 dark:text-stone-500 py-2">Loading…</p>
            ) : (stats?.awaiting_review ?? 0) === 0 ? (
              <EmptyState Icon={ClipboardCheck} title="Queue is clear" subtext="No items are awaiting review right now." />
            ) : (
              <button
                onClick={() => router.push("/review")}
                className="w-full text-left rounded-xl border border-stone-200/70 dark:border-white/[0.06] p-3 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-stone-50/60 dark:hover:bg-white/[0.02] transition"
              >
                <p className="text-[13px] font-medium text-stone-900 dark:text-white">
                  {stats?.awaiting_review} item{stats?.awaiting_review === 1 ? "" : "s"} awaiting review
                </p>
                <p className="text-[12px] text-stone-500 dark:text-stone-400 mt-0.5">Open the review queue to validate and approve.</p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
