import Sidebar from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { OnboardingTour } from "@/components/layout/onboarding-tour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--paper)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
      </div>
      <OnboardingTour />
    </div>
  );
}
