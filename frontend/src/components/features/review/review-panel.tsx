"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generationApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { GeneratedContent } from "@/types";

export default function ReviewPanel({ jobId }: { jobId?: string }) {
  const [selected, setSelected] = useState<GeneratedContent | null>(null);
  const [comment, setComment] = useState("");

  const { data, reload } = useAsync(
    () => (jobId ? generationApi.listContents(jobId) : Promise.resolve(null)),
    [jobId],
  );
  const items = data?.items ?? [];

  const updateStatus = async (id: string, status: string) => {
    await generationApi.updateContent(id, { status });
    reload();
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No items currently awaiting review. Run a generation job to populate the queue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Item list */}
      <div className="lg:col-span-1 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`cursor-pointer transition-shadow hover:shadow-md rounded-lg border bg-white ${selected?.id === item.id ? "ring-2 ring-brand-500" : ""}`}
            onClick={() => setSelected(item)}
          >
            <CardContent className="py-3">
              <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.body}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={item.status} />
                {item.validation_score !== null && (
                  <span className="text-xs text-gray-500">
                    Score: {(item.validation_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </CardContent>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-2">
        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>Review Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Question</p>
                <p className="text-sm text-gray-800">{selected.body}</p>
              </div>

              <div className="flex gap-2">
                <StatusBadge status={selected.status} />
                <Tag tone="indigo">{selected.content_type}</Tag>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Review Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Add your review feedback here…"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="primary" size="sm" onClick={() => updateStatus(selected.id, "approved")}>
                  Approve
                </Button>
                <Button variant="secondary" size="sm" onClick={() => updateStatus(selected.id, "draft")}>
                  Request Changes
                </Button>
                <Button variant="danger" size="sm" onClick={() => updateStatus(selected.id, "draft")}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-400">
              Select an item from the list to review it
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
