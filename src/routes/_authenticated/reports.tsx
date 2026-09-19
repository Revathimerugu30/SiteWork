import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
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
import { EmptyState, PageHeader, StatCard } from "@/components/kit";
import { useAttendance, usePayments, useSites, useWorkers } from "@/hooks/useData";
import { buildLedger, daysAgoISO, downloadCSV, money, todayISO } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

type ReportKind = "attendance" | "wage" | "payment" | "pending" | "worker" | "site";

const REPORTS: { key: ReportKind; label: string }[] = [
  { key: "attendance", label: "Attendance report" },
  { key: "wage", label: "Wage report" },
  { key: "payment", label: "Payment report" },
  { key: "pending", label: "Pending dues report" },
  { key: "worker", label: "Worker history" },
  { key: "site", label: "Site summary" },
];

function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>("attendance");
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [siteFilter, setSiteFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState("all");

  const sites = useSites();
  const workers = useWorkers();
  const attendance = useAttendance(
    siteFilter === "all" ? { from, to } : { from, to, siteId: siteFilter },
  );
  const payments = usePayments();

  const workerName = (id: string) => (workers.data ?? []).find((w) => w.id === id)?.name ?? "Worker";
  const siteName = (id: string | null) =>
    (sites.data ?? []).find((s) => s.id === id)?.site_name ?? "Unassigned";

  const ledger = useMemo(
    () =>
      buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? []).filter(
        (l) =>
          (workerFilter === "all" || l.worker.id === workerFilter) &&
          (siteFilter === "all" || l.worker.site_id === siteFilter),
      ),
    [workers.data, attendance.data, payments.data, workerFilter, siteFilter],
  );

  const paymentRows = (payments.data ?? []).filter(
    (p) =>
      p.payment_date >= from &&
      p.payment_date <= to &&
      (workerFilter === "all" || p.worker_id === workerFilter),
  );

  const table = useMemo<{ head: string[]; rows: (string | number)[][] }>(() => {
    switch (kind) {
      case "attendance":
        return {
          head: ["Date", "Worker", "Site", "Status", "Wage"],
          rows: (attendance.data ?? [])
            .filter((a) => workerFilter === "all" || a.worker_id === workerFilter)
            .map((a) => [
              a.attendance_date,
              workerName(a.worker_id),
              siteName(a.site_id),
              a.status,
              Number(a.wage_amount),
            ]),
        };
      case "wage":
        return {
          head: ["Worker", "Role", "Daily wage", "Present", "Half", "Absent", "Earned"],
          rows: ledger.map((l) => [
            l.worker.name,
            l.worker.role,
            Number(l.worker.daily_wage),
            l.present,
            l.half,
            l.absent,
            l.earned,
          ]),
        };
      case "payment":
        return {
          head: ["Date", "Worker", "Amount", "Method", "Notes"],
          rows: paymentRows.map((p) => [
            p.payment_date,
            workerName(p.worker_id),
            Number(p.amount),
            p.payment_method,
            p.notes ?? "",
          ]),
        };
      case "pending":
        return {
          head: ["Worker", "Earned", "Paid", "Pending"],
          rows: ledger
            .filter((l) => l.pending > 0)
            .map((l) => [l.worker.name, l.earned, l.paid, l.pending]),
        };
      case "worker":
        return {
          head: ["Worker", "Role", "Site", "Joining date", "Status", "Earned", "Pending"],
          rows: ledger.map((l) => [
            l.worker.name,
            l.worker.role,
            siteName(l.worker.site_id),
            l.worker.joining_date,
            l.worker.status,
            l.earned,
            l.pending,
          ]),
        };
      case "site":
      default:
        return {
          head: ["Site", "Location", "Status", "Workers", "Wages", "Pending"],
          rows: (sites.data ?? []).map((s) => {
            const rows = ledger.filter((l) => l.worker.site_id === s.id);
            return [
              s.site_name,
              s.location,
              s.status,
              rows.length,
              rows.reduce((a, l) => a + l.earned, 0),
              rows.reduce((a, l) => a + l.pending, 0),
            ];
          }),
        };
    }
  }, [kind, attendance.data, ledger, paymentRows, sites.data, workerFilter]);

  const totals = ledger.reduce(
    (a, l) => ({ earned: a.earned + l.earned, paid: a.paid + l.paid, pending: a.pending + l.pending }),
    { earned: 0, paid: 0, pending: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Filter, print or export any report generated from live records"
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              onClick={() => downloadCSV(`${kind}-report-${from}-to-${to}.csv`, [table.head, ...table.rows])}
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <Card className="mb-5 gap-0 border-0 p-4 shadow-[var(--shadow-soft)] print:hidden">
        <div className="grid gap-3 lg:grid-cols-5">
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">Report</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
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
          </div>
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">Worker</Label>
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workers</SelectItem>
                {(workers.data ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total wages" value={money(totals.earned)} tone="primary" />
        <StatCard label="Total paid" value={money(totals.paid)} tone="success" />
        <StatCard label="Pending dues" value={money(totals.pending)} tone="danger" />
      </div>

      <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 text-base font-semibold">
          {REPORTS.find((r) => r.key === kind)?.label}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {from} to {to}
        </p>
        {table.rows.length === 0 ? (
          <EmptyState
            title="No data for this report"
            description="Try widening the date range or clearing filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {table.head.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell key={j} className={j === 0 ? "font-medium" : ""}>
                        {typeof c === "number" && j > 0 && table.head[j]?.match(/wage|earn|paid|pending|amount/i)
                          ? money(c)
                          : String(c)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
