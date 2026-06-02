import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RepositoryPage() {
  return (
    <div>
      <Header
        title="Item Repository"
        subtitle="Browse and manage approved assessment items ready for assembly"
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Published Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              No items in the repository yet. Approve and publish generated content to populate this library.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
