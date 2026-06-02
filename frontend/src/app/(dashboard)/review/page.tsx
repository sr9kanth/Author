import Header from "@/components/layout/header";
import ReviewPanel from "@/components/features/review/review-panel";

export default function ReviewPage() {
  return (
    <div>
      <Header
        title="Review Queue"
        subtitle="Review, approve, and provide feedback on generated content"
      />
      <div className="p-6">
        <ReviewPanel />
      </div>
    </div>
  );
}
