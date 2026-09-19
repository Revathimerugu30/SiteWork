import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, CalendarCheck, HardHat, Users, Wallet, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  LoadingCards,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/kit";
import { useAttendance, usePayments, useProfiles, useSites, useWorkers } from "@/hooks/useData";
import { buildLedger, daysAgoISO, money, todayISO } from "@/lib/api";

export function AdminDashboard() {
  const profiles = useProfiles();
  const sites = useSites();
  const workers = useWorkers();
  const attendance = useAttendance();
  const payments = usePayments();

  const loading = profiles.isLoading || sites.isLoading || workers.isLoading;

  const contractors = (profiles.data ?? []).filter((p) => p.role === "contractor");
  const today = todayISO();
  const todayRows = (attendance.data ?? []).filter((a) => a.attendance_date === today);

  const ledger = useMemo(
    () => buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? []),
    [workers.data, attendance.data, payments.data],
  );
  const earned = ledger.reduce((s, l) => s + l.earned, 0);
  const paid = ledger.reduce((s, l) => s + l.paid, 0);

  const trend = useMemo(() => {
    const out: { label: string; Present: number; "Half Day": number; Absent: number; Wages: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgoISO(i);
      const rows = (attendance.data ?? []).filter((a) => a.attendance_date === d);
      out.push({
        label: new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        Present: rows.filter((r) => r.status === "Present").length,
        "Half Day": rows.filter((r) => r.status === "Half Day").length,
        Absent: rows.filter((r) => r.status === "Absent").length,
        Wages: rows.reduce((s, r) => s + Number(r.wage_amount), 0),
      });
    }
    return out;
  }, [attendance.data]);

  const growth = useMemo(() => {
    const map = new Map<string, { label: string; Contractors: number; Workers: number }>();
    const add = (date: string, key: "Contractors" | "Workers") => {
      const k = date.slice(0, 7);
      const label = new Date(date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const cur = map.get(k) ?? { label, Contractors: 0, Workers: 0 };
      cur[key] += 1;
      map.set(k, cur);
    };
    contractors.forEach((c) => add(c.created_at, "Contractors"));
    (workers.data ?? []).forEach((w) => add(w.joining_date, "Workers"));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [contractors, workers.data]);

  const siteSplit = [
    { name: "Active", value: (sites.data ?? []).filter((s) => s.status === "Active").length },
    { name: "Completed", value: (sites.data ?? []).filter((s) => s.status === "Completed").length },
    { name: "Inactive", value: (sites.data ?? []).filter((s) => s.status === "Inactive").length },
  ].filter((s) => s.value > 0);

  const topContractors = contractors
    .map((c) => ({
      ...c,
      workers: (workers.data ?? []).filter((w) => w.contractor_id === c.id).length,
      sites: (sites.data ?? []).filter((s) => s.contractor_id === c.id).length,
    }))
    .sort((a, b) => b.workers - a.workers)
    .slice(0, 5);

  const PIE_COLORS = ["var(--color-chart-2)", "var(--color-chart-1)", "var(--color-chart-4)"];

  return (
    <div>
      <PageHeader
        title="Platform analytics"
        subtitle="Complete overview of contractors, workforce, attendance and payments"
        actions={
          <Button asChild variant="outline">
            <Link to="/contractors">Manage contractors</Link>
          </Button>
        }
      />

      {loading ? (
        <LoadingCards count={8} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Contractors" value={contractors.length} icon={<Users className="size-5" />} tone="primary" to="/contractors" />
          <StatCard label="Total Workers" value={(workers.data ?? []).length} icon={<HardHat className="size-5" />} to="/workers" />
          <StatCard
            label="Sites"
            value={(sites.data ?? []).length}
            hint={`${(sites.data ?? []).filter((s) => s.status === "Active").length} active`}
            icon={<Building2 className="size-5" />}
            to="/sites"
          />
          <StatCard
            label="Today's Attendance"
            value={todayRows.filter((r) => r.status !== "Absent").length}
            hint={`${todayRows.length} records marked today`}
            icon={<CalendarCheck className="size-5" />}
            tone="success"
            to="/attendance"
          />
          <StatCard label="Attendance Records" value={(attendance.data ?? []).length} icon={<CalendarCheck className="size-5" />} />
          <StatCard label="Total Payments" value={money(paid)} hint={`${(payments.data ?? []).length} transactions`} icon={<Wallet className="size-5" />} tone="success" to="/payments" />
          <StatCard label="Total Wages" value={money(earned)} icon={<IndianRupee className="size-5" />} tone="primary" />
          <StatCard label="Pending Wages" value={money(Math.max(earned - paid, 0))} icon={<IndianRupee className="size-5" />} tone="danger" />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SectionCard title="Attendance analytics" description="Last 14 days" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Present" stackId="a" fill="var(--color-chart-2)" />
                <Bar dataKey="Half Day" stackId="a" fill="var(--color-chart-3)" />
                <Bar dataKey="Absent" stackId="a" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Site analytics" description="Status distribution">
          {siteSplit.length === 0 ? (
            <EmptyState title="No sites yet" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={siteSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {siteSplit.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Workforce growth" description="Contractors and workers joining over time">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Workers" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.18} />
                <Area type="monotone" dataKey="Contractors" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top contractors" description="Ranked by workforce size">
          {topContractors.length === 0 ? (
            <EmptyState title="No contractors yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContractors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Initials name={c.full_name || c.email} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{c.full_name || "—"}</span>
                          <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{c.workers}</TableCell>
                    <TableCell>{c.sites}</TableCell>
                    <TableCell className="text-muted-foreground">{c.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
