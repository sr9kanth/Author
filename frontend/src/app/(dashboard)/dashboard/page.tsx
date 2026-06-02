import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const metrics = [
  { label: "Total Content", value: "—", description: "Generated items" },
  { label: "Pending Review", value: "—", description: "Awaiting reviewer" },
  { label: "Approved", value: "—", description: "Ready to publish" },
  { label: "Knowledge Assets", value: "—", description: "Uploaded documents" },
];

const quickActions = [
  { label: "Upload Knowledge", href: "/knowledge", color: "bg-blue-600" },
  { label: "New Configuration", href: "/configurations", color: "bg-purple-600" },
  { label: "Generate Content", href: "/generate", color: "bg-green-600" },
  { label: "Review Queue", href: "/review", color: "bg-orange-600" },
];

export default function DashboardPage() {
  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Welcome to the Assessment Intelligence Platform"
      />

      <div className="p-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="py-5">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{m.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className={`${action.color} text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity`}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: "Knowledge asset uploaded", time: "Just now", status: "uploaded" },
                { action: "Generation job queued", time: "2 min ago", status: "pending" },
                { action: "Content approved", time: "1 hour ago", status: "approved" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{item.action}</span>
                  <div className="flex items-center gap-3">
                    <Badge label={item.status} status={item.status} />
                    <span className="text-xs text-gray-400">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
