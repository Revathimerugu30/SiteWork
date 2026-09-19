import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, Initials, SectionCard } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSites } from "@/hooks/useData";
import { WORKER_ROLES, todayISO, type WorkerRole } from "@/lib/api";

export type WorkerRequest = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
};

export function useWorkerRequests() {
  const { role, loading, profile } = useAuth();
  return useQuery({
    queryKey: ["worker_requests"],
    enabled: !loading && !!profile && role === "contractor",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_requests")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkerRequest[];
    },
  });
}

export function WorkerRequestsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const requests = useWorkerRequests();
  const sites = useSites();

  const [active, setActive] = useState<WorkerRequest | null>(null);
  const [workerRole, setWorkerRole] = useState<WorkerRole>("Labourer");
  const [wage, setWage] = useState("");
  const [siteId, setSiteId] = useState("none");

  const approve = useMutation({
    mutationFn: async () => {
      const req = active!;
      const amount = Number(wage);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Daily wage must be greater than 0");
      const { data, error } = await supabase
        .from("workers")
        .insert({
          contractor_id: user!.id,
          user_id: req.user_id,
          name: req.full_name || req.email,
          phone: req.phone,
          email: req.email,
          role: workerRole,
          daily_wage: amount,
          joining_date: todayISO(),
          site_id: siteId === "none" ? null : siteId,
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (siteId !== "none") {
        await supabase.from("worker_site_assignments").insert({
          worker_id: data.id,
          site_id: siteId,
          contractor_id: user!.id,
        });
      }
      const { error: upErr } = await supabase
        .from("worker_requests")
        .update({ status: "Approved", contractor_id: user!.id, worker_id: data.id })
        .eq("id", req.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast.success("Worker approved and assigned");
      setActive(null);
      setWage("");
      setSiteId("none");
      void qc.invalidateQueries({ queryKey: ["worker_requests"] });
      void qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (req: WorkerRequest) => {
      const { error } = await supabase
        .from("worker_requests")
        .update({ status: "Rejected", contractor_id: user!.id })
        .eq("id", req.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected");
      void qc.invalidateQueries({ queryKey: ["worker_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = requests.data ?? [];

  return (
    <>
      <SectionCard
        title="Worker join requests"
        description="Workers who signed up and are waiting for approval and a site assignment"
      >
        {list.length === 0 ? (
          <EmptyState
            title="No pending requests"
            description="When a worker creates an account, their details appear here for approval."
            icon={<UserPlus className="size-6" />}
          />
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary/50"
              >
                <Initials name={r.full_name || r.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.full_name || "Worker"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""} · requested{" "}
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setActive(r);
                    setWorkerRole("Labourer");
                    setWage("");
                    setSiteId("none");
                  }}
                >
                  Approve & assign
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reject.mutate(r)}>
                  Reject
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve {active?.full_name || "worker"}</DialogTitle>
            <DialogDescription>
              Set their work role, daily wage and site. They will then appear in your workforce and
              can be marked in attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Work role</Label>
              <Select value={workerRole} onValueChange={(v) => setWorkerRole(v as WorkerRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily wage (₹) *</Label>
              <Input
                type="number"
                min={1}
                placeholder="750"
                value={wage}
                onChange={(e) => setWage(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Assign site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned for now</SelectItem>
                  {(sites.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
              Approve worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
