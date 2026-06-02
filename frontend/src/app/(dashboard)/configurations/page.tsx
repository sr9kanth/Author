import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConfigurationsPage() {
  return (
    <div>
      <Header
        title="Assessment Configurations"
        subtitle="Manage question type mix, difficulty, and cognitive level settings"
        actions={<Button size="sm">New Configuration</Button>}
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              No configurations yet. Create one to define the parameters for your assessment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
