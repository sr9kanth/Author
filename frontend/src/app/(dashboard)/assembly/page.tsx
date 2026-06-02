import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AssemblyPage() {
  return (
    <div>
      <Header
        title="Assessment Assembly"
        subtitle="Assemble approved items into final assessment packages"
        actions={<Button size="sm">New Package</Button>}
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Packages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              No packages yet. Select items from the repository and assemble them into a delivery-ready package.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
