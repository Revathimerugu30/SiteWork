import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, Initials, LoadingTable, PageHeader, StatCard, StatusBadge } from "@/components/kit";
import { useProfiles, useSites, useWorkers } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/contractors")({
  component: ContractorsPage,
});

type Row = { id: string; full_name: string; email: string; phone: string | null; status: string };

function ContractorsPage() {
  const qc = useQueryClient();
  const profiles = useProfiles();
  const workers = useWorkers();
  const sites = useSites();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [target, setTarget] = useState<Row | null>(null);

  const contractors = (profiles.data ?? []).filter((p) => p.role === "contractor");
  const list = contractors.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (c.full_name.toLowerCase().includes(q.toLowerCase()) ||
        c.email.toLowerCase().includes(q.toLowerCase())),
  );

  const toggle = useMutation({
    mutationFn: async (row: Row) => {
      const next = row.status === "Active" ? "Inactive" : "Active";
      const { error } = await supabase.from("profiles").update({ status: next }).eq("id", row.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(`Contractor set to ${next}`);
      setTarget(null);
      void qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const countWorkers = (id: string) => (workers.data ?? []).filter((w) => w.contractor_id === id).length;
  const countSites = (id: string) => (sites.data ?? []).filter((s) => s.contractor_id === id).length;

  return (
    <div>
      <PageHeader title="Contractor management" subtitle="Monitor and control contractor accounts" />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total contractors" value={contractors.length} tone="primary" />
        <StatCard
          label="Active"
          value={contractors.filter((c) => c.status === "Active").length}
          tone="success"
        />
        <StatCard
          label="Inactive"
          value={contractors.filter((c) => c.status !== "Active").length}
          tone="danger"
        />
      </div>

      <Card className="mb-5 gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search contractors"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        {profiles.isLoading ? (
          <LoadingTable />
        ) : list.length === 0 ? (
          <EmptyState
            title="No contractors found"
            description="Contractors appear here once they register."
            icon={<Users className="size-6" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Initials name={c.full_name || c.email} />
                        <div>
                          <p className="font-medium">{c.full_name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell>{countWorkers(c.id)}</TableCell>
                    <TableCell>{countSites(c.id)}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setTarget(c as Row)}>
                        {c.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change contractor status?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.full_name} will be marked{" "}
              {target?.status === "Active" ? "Inactive" : "Active"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => target && toggle.mutate(target)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
