import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, LoadingTable, StatusBadge } from "@/components/kit";
import { useAttendance, usePayments, useSites, useWorkers } from "@/hooks/useData";
import { buildLedger, money } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/workers/$id")({
  component: WorkerProfile,
});

function WorkerProfile() {
  const { id } = Route.useParams();
  const workers = useWorkers();
  const attendance = useAttendance();
  const payments = usePayments();
  const sites = useSites();

  const worker = (workers.data ?? []).find((w) => w.id === id);
  const ledger = useMemo(
    () =>
      worker
        ? buildLedger([worker], attendance.data ?? [], payments.data ?? [])[0]
        : undefined,
    [worker, attendance.data, payments.data],
  );

  if (workers.isLoading) return <LoadingTable />;
  if (!worker)
    return (
      <EmptyState
        title="Worker not found"
        description="This worker may have been removed or belongs to another contractor."
        action={
          <Button asChild>
            <Link to="/workers">Back to workers</Link>
          </Button>
        }
      />
    );

  const rows = (attendance.data ?? []).filter((a) => a.worker_id === worker.id);
  const pays = (payments.data ?? []).filter((p) => p.worker_id === worker.id);
  const siteName = (sites.data ?? []).find((s) => s.id === worker.site_id)?.site_name ?? "Unassigned";

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/workers">
          <ArrowLeft className="size-4" /> All workers
        </Link>
      </Button>

      <Card className="surface-gradient mb-6 gap-0 border-0 p-6 text-primary-foreground">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/15 font-display text-xl font-semibold">
            {worker.name
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold">{worker.name}</h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {worker.role} · {siteName} · Joined {worker.joining_date}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-primary-foreground/70">Daily wage</p>
            <p className="font-display text-2xl font-semibold">
              {money(Number(worker.daily_wage))}
            </p>
            <span className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
              {worker.status}
            </span>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Present days", ledger?.present ?? 0],
          ["Half days", ledger?.half ?? 0],
          ["Absent days", ledger?.absent ?? 0],
          ["Total earned", money(ledger?.earned ?? 0)],
          ["Total paid", money(ledger?.paid ?? 0)],
          ["Pending", money(ledger?.pending ?? 0)],
        ].map(([label, value]) => (
          <Card key={String(label)} className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className="mt-1.5 text-lg font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["Phone", worker.phone || "—"],
                ["Email", worker.email || "—"],
                ["Address", worker.address || "—"],
                ["Current site", siteName],
                ["Joining date", worker.joining_date],
                ["Status", worker.status],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
            {rows.length === 0 ? (
              <EmptyState title="No attendance records" description="Mark attendance to see history." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Wage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.attendance_date}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-right">{money(Number(a.wage_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card className="gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-secondary p-4">
                <p className="text-xs text-muted-foreground">
                  Present {ledger?.present ?? 0} × {money(Number(worker.daily_wage))}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {money((ledger?.present ?? 0) * Number(worker.daily_wage))}
                </p>
              </div>
              <div className="rounded-xl bg-warning/15 p-4">
                <p className="text-xs text-muted-foreground">
                  Half days {ledger?.half ?? 0} × {money(Number(worker.daily_wage) * 0.5)}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {money((ledger?.half ?? 0) * Number(worker.daily_wage) * 0.5)}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-xs text-muted-foreground">Total earned</p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {money(ledger?.earned ?? 0)}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
            {pays.length === 0 ? (
              <EmptyState title="No payments yet" description="Recorded payments will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pays.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell className="text-muted-foreground">{p.payment_method}</TableCell>
                      <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {money(Number(p.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
