import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Initials, LoadingTable, PageHeader, StatusBadge } from "@/components/kit";
import { useAttendance, useSites, useWorkers } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money, todayISO, type AttendanceStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [siteFilter, setSiteFilter] = useState("all");
  const [q, setQ] = useState("");

  const sites = useSites();
  const workers = useWorkers();
  const attendance = useAttendance();

  const canMark = role === "contractor";
  const dayRows = (attendance.data ?? []).filter((a) => a.attendance_date === date);

  const mark = useMutation({
    mutationFn: async ({ workerId, status }: { workerId: string; status: AttendanceStatus }) => {
      const worker = (workers.data ?? []).find((w) => w.id === workerId);
      if (!worker) throw new Error("Worker not found");
      const { error } = await supabase.from("attendance").upsert(
        {
          worker_id: workerId,
          site_id: worker.site_id,
          contractor_id: user!.id,
          attendance_date: date,
          status,
          marked_by: user!.id,
        },
        { onConflict: "worker_id,attendance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const rows = visible.map((w) => ({
        worker_id: w.id,
        site_id: w.site_id,
        contractor_id: user!.id,
        attendance_date: date,
        status: "Present" as AttendanceStatus,
        marked_by: user!.id,
      }));
      if (rows.length === 0) throw new Error("No workers to mark");
      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "worker_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("All visible workers marked present");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = useMemo(
    () =>
      (workers.data ?? []).filter(
        (w) =>
          w.status === "Active" &&
          (siteFilter === "all" || w.site_id === siteFilter) &&
          w.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [workers.data, siteFilter, q],
  );

  const summary = {
    present: dayRows.filter((r) => r.status === "Present").length,
    half: dayRows.filter((r) => r.status === "Half Day").length,
    absent: dayRows.filter((r) => r.status === "Absent").length,
  };
  const statusOf = (id: string) => dayRows.find((r) => r.worker_id === id)?.status;
  const workerName = (id: string) => (workers.data ?? []).find((w) => w.id === id)?.name ?? "Worker";

  return (
    <div>
      <PageHeader
        title={role === "worker" ? "My attendance" : "Attendance"}
        subtitle={
          canMark
            ? "Pick a site and date, then mark each worker. Duplicate entries are prevented automatically."
            : "Your marked attendance history"
        }
        actions={
          canMark && (
            <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              Mark all present
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
          <Label className="mb-2 text-xs text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Card>
        <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
          <Label className="mb-2 text-xs text-muted-foreground">Site</Label>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue />
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
        </Card>
        <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)] sm:col-span-2">
          <Label className="mb-2 text-xs text-muted-foreground">Search worker</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Worker name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Card className="gap-0 border-0 bg-success/10 p-4 shadow-none">
          <p className="text-xs text-muted-foreground">Present</p>
          <p className="text-2xl font-semibold text-success">{summary.present}</p>
        </Card>
        <Card className="gap-0 border-0 bg-warning/15 p-4 shadow-none">
          <p className="text-xs text-muted-foreground">Half Day</p>
          <p className="text-2xl font-semibold text-warning-foreground">{summary.half}</p>
        </Card>
        <Card className="gap-0 border-0 bg-destructive/10 p-4 shadow-none">
          <p className="text-xs text-muted-foreground">Absent</p>
          <p className="text-2xl font-semibold text-destructive">{summary.absent}</p>
        </Card>
      </div>

      <Tabs defaultValue={canMark ? "mark" : "history"}>
        <TabsList className="mb-4">
          {canMark && <TabsTrigger value="mark">Mark attendance</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {canMark && (
          <TabsContent value="mark">
            <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
              {workers.isLoading ? (
                <LoadingTable />
              ) : visible.length === 0 ? (
                <EmptyState
                  title="No active workers to mark"
                  description="Add workers and assign them to a site first."
                  icon={<CalendarCheck className="size-6" />}
                  action={
                    <Button asChild>
                      <Link to="/workers">Add Worker</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {visible.map((w) => {
                    const current = statusOf(w.id);
                    return (
                      <div
                        key={w.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-secondary/40"
                      >
                        <Initials name={w.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.role} · {money(Number(w.daily_wage))}/day
                          </p>
                        </div>
                        {current && <StatusBadge status={current} />}
                        <div className="flex gap-2">
                          {(["Present", "Half Day", "Absent"] as AttendanceStatus[]).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={current === s ? "default" : "outline"}
                              className={cn(
                                current === s && s === "Present" && "bg-success hover:bg-success/90",
                                current === s &&
                                  s === "Absent" &&
                                  "bg-destructive hover:bg-destructive/90",
                              )}
                              onClick={() => mark.mutate({ workerId: w.id, status: s })}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history">
          <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
            {(attendance.data ?? []).length === 0 ? (
              <EmptyState title="No attendance records yet" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Wage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(attendance.data ?? [])
                      .filter((a) => siteFilter === "all" || a.site_id === siteFilter)
                      .slice(0, 60)
                      .map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.attendance_date}</TableCell>
                          <TableCell className="font-medium">{workerName(a.worker_id)}</TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {money(Number(a.wage_amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
