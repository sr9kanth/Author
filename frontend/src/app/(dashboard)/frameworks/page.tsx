import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FrameworksPage() {
  return (
    <div>
      <Header
        title="Assessment Frameworks"
        subtitle="Define competency frameworks, domains, and learning outcomes"
        actions={<Button size="sm">New Framework</Button>}
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Frameworks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No frameworks yet. Create your first framework to get started.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
