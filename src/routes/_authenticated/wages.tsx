import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
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
import { EmptyState, LoadingTable, PageHeader, StatCard } from "@/components/kit";
import { useAttendance, usePayments, useSites, useWorkers } from "@/hooks/useData";
import { buildLedger, daysAgoISO, downloadCSV, money, todayISO } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/wages")({
  component: WagesPage,
});

type Preset = "daily" | "weekly" | "monthly" | "custom";

function WagesPage() {
  const { role } = useAuth();
  const [preset, setPreset] = useState<Preset>("monthly");
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [siteFilter, setSiteFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState("all");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "daily") {
      setFrom(todayISO());
      setTo(todayISO());
    } else if (p === "weekly") {
      setFrom(daysAgoISO(6));
      setTo(todayISO());
    } else if (p === "monthly") {
      setFrom(daysAgoISO(29));
      setTo(todayISO());
    }
  };

  const sites = useSites();
  const workers = useWorkers();
  const attendance = useAttendance(
    siteFilter === "all" ? { from, to } : { from, to, siteId: siteFilter },
  );
  const payments = usePayments();

  const ledger = useMemo(() => {
    const list = buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? []);
    return list.filter(
      (l) =>
        (workerFilter === "all" || l.worker.id === workerFilter) &&
        (siteFilter === "all" || l.worker.site_id === siteFilter),
    );
  }, [workers.data, attendance.data, payments.data, workerFilter, siteFilter]);

  const totals = ledger.reduce(
    (acc, l) => ({
      earned: acc.earned + l.earned,
      paid: acc.paid + l.paid,
      pending: acc.pending + l.pending,
    }),
    { earned: 0, paid: 0, pending: 0 },
  );

  const exportCSV = () =>
    downloadCSV(`wages-${from}-to-${to}.csv`, [
      ["Worker", "Role", "Daily wage", "Present", "Half days", "Absent", "Earned", "Paid", "Pending"],
      ...ledger.map((l) => [
        l.worker.name,
        l.worker.role,
        Number(l.worker.daily_wage),
        l.present,
        l.half,
        l.absent,
        l.earned,
        l.paid,
        l.pending,
      ]),
    ]);

  return (
    <div>
      <PageHeader
        title={role === "worker" ? "My earnings" : "Wage calculation"}
        subtitle="Present = 1 day's wage · Half Day = 50% · Absent = 0. Calculated from real attendance."
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-5 gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 lg:grid-cols-5">
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">Period</Label>
            <Select value={preset} onValueChange={(v) => applyPreset(v as Preset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">Last 7 days</SelectItem>
                <SelectItem value="monthly">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
            />
          </div>
          <div>
            <Label className="mb-2 text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
            />
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
        <StatCard label="Pending amount" value={money(totals.pending)} tone="danger" />
      </div>

      <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        {attendance.isLoading || workers.isLoading ? (
          <LoadingTable />
        ) : ledger.length === 0 ? (
          <EmptyState
            title="Nothing to calculate yet"
            description="Mark attendance for this period to see wage calculations."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Daily wage</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Half days</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Total earned</TableHead>
                  <TableHead>Total paid</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((l) => (
                  <TableRow key={l.worker.id}>
                    <TableCell className="font-medium">{l.worker.name}</TableCell>
                    <TableCell>{money(Number(l.worker.daily_wage))}</TableCell>
                    <TableCell className="text-success">{l.present}</TableCell>
                    <TableCell className="text-warning-foreground">{l.half}</TableCell>
                    <TableCell className="text-destructive">{l.absent}</TableCell>
                    <TableCell>{money(l.earned)}</TableCell>
                    <TableCell>{money(l.paid)}</TableCell>
                    <TableCell
                      className={
                        l.pending > 0 ? "text-right font-semibold text-destructive" : "text-right"
                      }
                    >
                      {money(l.pending)}
                    </TableCell>
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
