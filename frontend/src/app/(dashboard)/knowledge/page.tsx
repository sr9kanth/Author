import Header from "@/components/layout/header";
import UploadForm from "@/components/features/knowledge/upload-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function KnowledgePage() {
  return (
    <div>
      <Header
        title="Knowledge Repository"
        subtitle="Upload and manage source documents for assessment generation"
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Knowledge Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
