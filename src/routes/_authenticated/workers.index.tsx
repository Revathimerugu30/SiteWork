import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HardHat, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  Initials,
  LoadingTable,
  PageHeader,
  StatusBadge,
} from "@/components/kit";
import { useAttendance, usePayments, useSites, useWorkers } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WorkerRequestsCard } from "@/components/WorkerRequests";
import {
  buildLedger,
  money,
  todayISO,
  WORKER_ROLES,
  type Worker,
  type WorkerRole,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/workers/")({
  component: WorkersPage,
});

type Form = {
  name: string;
  phone: string;
  email: string;
  role: WorkerRole;
  daily_wage: string;
  address: string;
  joining_date: string;
  site_id: string;
  status: string;
};

const blank: Form = {
  name: "",
  phone: "",
  email: "",
  role: "Labourer",
  daily_wage: "",
  address: "",
  joining_date: todayISO(),
  site_id: "none",
  status: "Active",
};

function WorkersPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const workers = useWorkers();
  const sites = useSites();
  const attendance = useAttendance();
  const payments = usePayments();

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [page, setPage] = useState(0);
  const perPage = 10;

  const canEdit = role === "contractor";

  const ledger = useMemo(
    () => buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? []),
    [workers.data, attendance.data, payments.data],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (form.name.trim().length < 2) throw new Error("Worker name is required");
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) throw new Error("Enter a valid email");
      if (form.phone && !/^[0-9+\-\s]{8,15}$/.test(form.phone))
        throw new Error("Enter a valid phone number");
      const wage = Number(form.daily_wage);
      if (!Number.isFinite(wage) || wage <= 0) throw new Error("Daily wage must be greater than 0");
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        role: form.role,
        daily_wage: wage,
        address: form.address.trim() || null,
        joining_date: form.joining_date,
        site_id: form.site_id === "none" ? null : form.site_id,
        status: form.status,
        contractor_id: user!.id,
      };
      if (editing) {
        const { error } = await supabase.from("workers").update(payload).eq("id", editing.id);
        if (error) throw error;
        if (payload.site_id) {
          await supabase.from("worker_site_assignments").insert({
            worker_id: editing.id,
            site_id: payload.site_id,
            contractor_id: user!.id,
          });
        }
      } else {
        const { data, error } = await supabase.from("workers").insert(payload).select("id").single();
        if (error) throw error;
        if (payload.site_id && data) {
          await supabase.from("worker_site_assignments").insert({
            worker_id: data.id,
            site_id: payload.site_id,
            contractor_id: user!.id,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Worker updated" : "Worker added");
      setOpen(false);
      setEditing(null);
      setForm(blank);
      void qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (w: Worker) => {
      const { error } = await supabase
        .from("workers")
        .update({ status: w.status === "Active" ? "Inactive" : "Active" })
        .eq("id", w.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Worker status updated");
      void qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () =>
      ledger.filter(({ worker: w }) => {
        const matchQ =
          w.name.toLowerCase().includes(q.toLowerCase()) ||
          (w.phone ?? "").includes(q) ||
          (w.email ?? "").toLowerCase().includes(q.toLowerCase());
        return (
          matchQ &&
          (roleFilter === "all" || w.role === roleFilter) &&
          (siteFilter === "all" || w.site_id === siteFilter) &&
          (statusFilter === "all" || w.status === statusFilter)
        );
      }),
    [ledger, q, roleFilter, siteFilter, statusFilter],
  );

  const paged = filtered.slice(page * perPage, page * perPage + perPage);
  const siteName = (id: string | null) =>
    (sites.data ?? []).find((s) => s.id === id)?.site_name ?? "Unassigned";

  return (
    <div>
      <PageHeader
        title={role === "worker" ? "My record" : "Workers"}
        subtitle="Workforce roster with attendance, earnings and payment status"
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Add Worker
            </Button>
          )
        }
      />

      {canEdit && (
        <div className="mb-5">
          <WorkerRequestsCard />
        </div>
      )}


      <Card className="mb-5 gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone or email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {WORKER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {(sites.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.site_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
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
        {workers.isLoading ? (
          <LoadingTable />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No workers added yet"
            description="Create your first worker to start tracking attendance and wages."
            icon={<HardHat className="size-6" />}
            action={
              canEdit && (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setForm(blank);
                    setOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Add Worker
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Daily wage</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((l) => (
                    <TableRow key={l.worker.id}>
                      <TableCell>
                        <span className="flex items-center gap-2.5">
                          <Initials name={l.worker.name} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{l.worker.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {l.worker.phone || l.worker.email || "—"}
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.worker.role}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {siteName(l.worker.site_id)}
                      </TableCell>
                      <TableCell>{money(Number(l.worker.daily_wage))}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-success">{l.present}P</span> ·{" "}
                        <span className="text-warning-foreground">{l.half}H</span> ·{" "}
                        <span className="text-destructive">{l.absent}A</span>
                      </TableCell>
                      <TableCell>{money(l.earned)}</TableCell>
                      <TableCell className={l.pending > 0 ? "font-medium text-destructive" : ""}>
                        {money(l.pending)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={l.worker.status} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/workers/$id" params={{ id: l.worker.id }}>
                            View
                          </Link>
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(l.worker);
                                setForm({
                                  name: l.worker.name,
                                  phone: l.worker.phone ?? "",
                                  email: l.worker.email ?? "",
                                  role: l.worker.role,
                                  daily_wage: String(l.worker.daily_wage),
                                  address: l.worker.address ?? "",
                                  joining_date: l.worker.joining_date,
                                  site_id: l.worker.site_id ?? "none",
                                  status: l.worker.status,
                                });
                                setOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleStatus.mutate(l.worker)}
                            >
                              {l.worker.status === "Active" ? "Deactivate" : "Activate"}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filtered.length > perPage && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(page + 1) * perPage >= filtered.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit worker" : "Add a worker"}</DialogTitle>
            <DialogDescription>
              Use the worker's own email if they should be able to log in and view their record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as WorkerRole })}
              >
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
                value={form.daily_wage}
                onChange={(e) => setForm({ ...form, daily_wage: e.target.value })}
                placeholder="750"
              />
            </div>
            <div className="space-y-2">
              <Label>Joining date</Label>
              <Input
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={form.site_id} onValueChange={(v) => setForm({ ...form, site_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(sites.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing ? "Save changes" : "Add worker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
