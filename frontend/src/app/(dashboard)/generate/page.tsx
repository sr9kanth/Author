import Header from "@/components/layout/header";
import GenerationForm from "@/components/features/generation/generation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GeneratePage() {
  return (
    <div>
      <Header
        title="Generate Content"
        subtitle="Use AI to generate assessment questions from your knowledge assets"
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>New Generation Job</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
