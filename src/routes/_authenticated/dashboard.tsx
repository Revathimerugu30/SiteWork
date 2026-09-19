import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { LoadingCards } from "@/components/kit";
import { ContractorDashboard } from "@/components/dashboards/ContractorDashboard";
import { WorkerDashboard } from "@/components/dashboards/WorkerDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { role, loading, profile } = useAuth();
  if (loading || !profile) return <LoadingCards count={6} />;
  if (role === "admin") return <AdminDashboard />;
  if (role === "worker") return <WorkerDashboard />;
  return <ContractorDashboard />;
}
