import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EmptyState, LoadingTable, PageHeader, StatusBadge } from "@/components/kit";
import { useAttendance, useSites, useWorkers } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money, todayISO, type Site } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/sites")({
  component: SitesPage,
});

type Form = {
  site_name: string;
  location: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
};

const blank: Form = {
  site_name: "",
  location: "",
  description: "",
  start_date: todayISO(),
  end_date: "",
  status: "Active",
};

function SitesPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const sites = useSites();
  const workers = useWorkers();
  const attendance = useAttendance();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [detail, setDetail] = useState<Site | null>(null);
  const [confirm, setConfirm] = useState<{ site: Site; status: string } | null>(null);

  const canEdit = role === "contractor";

  const save = useMutation({
    mutationFn: async () => {
      if (form.site_name.trim().length < 2) throw new Error("Site name is required");
      if (!form.location.trim()) throw new Error("Location is required");
      if (form.end_date && form.end_date < form.start_date)
        throw new Error("End date cannot be before the start date");
      const payload = {
        site_name: form.site_name.trim(),
        location: form.location.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        contractor_id: user!.id,
      };
      const { error } = editing
        ? await supabase.from("sites").update(payload).eq("id", editing.id)
        : await supabase.from("sites").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Site updated" : "Site created");
      setOpen(false);
      setEditing(null);
      setForm(blank);
      void qc.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ site, status }: { site: Site; status: string }) => {
      const { error } = await supabase.from("sites").update({ status }).eq("id", site.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Site status updated");
      setConfirm(null);
      void qc.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = useMemo(
    () =>
      (sites.data ?? []).filter(
        (s) =>
          (statusFilter === "all" || s.status === statusFilter) &&
          (s.site_name.toLowerCase().includes(q.toLowerCase()) ||
            s.location.toLowerCase().includes(q.toLowerCase())),
      ),
    [sites.data, q, statusFilter],
  );

  const siteStats = (site: Site) => {
    const sw = (workers.data ?? []).filter((w) => w.site_id === site.id);
    const rows = (attendance.data ?? []).filter((a) => a.site_id === site.id);
    return {
      workers: sw.length,
      wages: rows.reduce((s, r) => s + Number(r.wage_amount), 0),
      today: rows.filter((r) => r.attendance_date === todayISO() && r.status !== "Absent").length,
    };
  };

  return (
    <div>
      <PageHeader
        title="Sites"
        subtitle="Every construction site you manage, with live workforce and wage summaries"
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Add Site
            </Button>
          )
        }
      />

      <Card className="mb-5 gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sites by name or location"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {(q || statusFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {sites.isLoading ? (
        <LoadingTable />
      ) : list.length === 0 ? (
        <EmptyState
          title="No sites yet"
          description="Create your first construction site to start assigning workers and marking attendance."
          icon={<Building2 className="size-6" />}
          action={
            canEdit && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Site
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((site) => {
            const st = siteStats(site);
            return (
              <Card key={site.id} className="card-elevated gap-0 border-0 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{site.site_name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" /> {site.location}
                    </p>
                  </div>
                  <StatusBadge status={site.status} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary p-2.5">
                    <p className="text-[11px] text-muted-foreground">Workers</p>
                    <p className="text-sm font-semibold">{st.workers}</p>
                  </div>
                  <div className="rounded-lg bg-success/10 p-2.5">
                    <p className="text-[11px] text-muted-foreground">In today</p>
                    <p className="text-sm font-semibold text-success">{st.today}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <p className="text-[11px] text-muted-foreground">Wages</p>
                    <p className="text-sm font-semibold text-primary">{money(st.wages)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {site.start_date} → {site.end_date || "ongoing"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetail(site)}>
                    View
                  </Button>
                  {canEdit && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(site);
                          setForm({
                            site_name: site.site_name,
                            location: site.location,
                            description: site.description ?? "",
                            start_date: site.start_date,
                            end_date: site.end_date ?? "",
                            status: site.status,
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {site.status !== "Completed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirm({ site, status: "Completed" })}
                        >
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setConfirm({
                            site,
                            status: site.status === "Inactive" ? "Active" : "Inactive",
                          })
                        }
                      >
                        {site.status === "Inactive" ? "Activate" : "Deactivate"}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* add/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit site" : "Add a new site"}</DialogTitle>
            <DialogDescription>Sites hold your workers, attendance and wages.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Site name *</Label>
              <Input
                value={form.site_name}
                onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                placeholder="Skyline Residency Tower B"
              />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Gachibowli, Hyderabad"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing ? "Save changes" : "Create site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.site_name}</DialogTitle>
            <DialogDescription>{detail?.location}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {detail.description || "No description provided."}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Status", detail.status],
                  ["Workers", siteStats(detail).workers],
                  ["In today", siteStats(detail).today],
                  ["Total wages", money(siteStats(detail).wages)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg bg-secondary p-3">
                    <p className="text-[11px] text-muted-foreground">{k}</p>
                    <p className="text-sm font-semibold">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Assigned workers</h4>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {(workers.data ?? []).filter((w) => w.site_id === detail.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No workers assigned yet.</p>
                  ) : (
                    (workers.data ?? [])
                      .filter((w) => w.site_id === detail.id)
                      .map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <span>
                            {w.name} · <span className="text-muted-foreground">{w.role}</span>
                          </span>
                          <span className="font-medium">{money(Number(w.daily_wage))}/day</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change site status?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.site.site_name} will be marked as {confirm?.status}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && changeStatus.mutate(confirm)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
