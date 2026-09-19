import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAttendance,
  fetchPayments,
  fetchProfiles,
  fetchSites,
  fetchWorkers,
  type Scope,
} from "@/lib/api";

function useScope(): Scope & { ready: boolean } {
  const { user, role, loading, profile } = useAuth();
  return { role, uid: user?.id ?? "", ready: !loading && !!user && !!profile };
}

export function useSites() {
  const s = useScope();
  return useQuery({
    queryKey: ["sites", s.role, s.uid],
    queryFn: () => fetchSites(s),
    enabled: s.ready,
  });
}

export function useWorkers() {
  const s = useScope();
  return useQuery({
    queryKey: ["workers", s.role, s.uid],
    queryFn: () => fetchWorkers(s),
    enabled: s.ready,
  });
}

export function useAttendance(opts: { from?: string; to?: string; siteId?: string } = {}) {
  const s = useScope();
  return useQuery({
    queryKey: ["attendance", s.role, s.uid, opts],
    queryFn: () => fetchAttendance(s, opts),
    enabled: s.ready,
  });
}

export function usePayments() {
  const s = useScope();
  return useQuery({
    queryKey: ["payments", s.role, s.uid],
    queryFn: () => fetchPayments(s),
    enabled: s.ready,
  });
}

export function useProfiles() {
  const s = useScope();
  return useQuery({
    queryKey: ["profiles", s.role],
    queryFn: () => fetchProfiles(),
    enabled: s.ready && s.role === "admin",
  });
}
