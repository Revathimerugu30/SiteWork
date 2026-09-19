import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarCheck, IndianRupee, TrendingUp, Wallet } from "lucide-react";
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
  LoadingCards,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/kit";
import { useAttendance, usePayments, useSites, useWorkers } from "@/hooks/useData";
import { buildLedger, money, todayISO } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function WorkerDashboard() {
  const { profile } = useAuth();
  const workers = useWorkers();
  const attendance = useAttendance();
  const payments = usePayments();
  const sites = useSites();

  const worker = (workers.data ?? [])[0];
  const ledger = useMemo(
    () => buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? [])[0],
    [workers.data, attendance.data, payments.data],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { label: string; Days: number; Earnings: number }>();
    (attendance.data ?? []).forEach((a) => {
      const key = a.attendance_date.slice(0, 7);
      const label = new Date(a.attendance_date).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      const cur = map.get(key) ?? { label, Days: 0, Earnings: 0 };
      if (a.status !== "Absent") cur.Days += a.status === "Present" ? 1 : 0.5;
      cur.Earnings += Number(a.wage_amount);
      map.set(key, cur);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [attendance.data]);

  if (workers.isLoading || attendance.isLoading) return <LoadingCards count={5} />;

  if (!worker) {
    return (
      <div>
        <PageHeader title={`Welcome, ${profile?.full_name || "Worker"}`} />
        <EmptyState
          title="Your worker record isn't linked yet"
          description="Ask your contractor to add you with this same email address. Your attendance and earnings will appear here automatically."
        />
      </div>
    );
  }

  const today = (attendance.data ?? []).find((a) => a.attendance_date === todayISO());
  const siteName = (sites.data ?? []).find((s) => s.id === worker.site_id)?.site_name ?? "—";

  return (
    <div>
      <PageHeader
        title={`Welcome, ${worker.name.split(" ")[0]}`}
        subtitle={`${worker.role} · ${siteName} · Daily wage ${money(Number(worker.daily_wage))}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Today"
          value={today ? today.status : "Not marked"}
          hint={today ? money(Number(today.wage_amount)) + " earned" : "Awaiting attendance"}
          icon={<CalendarCheck className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Days Present"
          value={ledger?.present ?? 0}
          hint={`${ledger?.half ?? 0} half days · ${ledger?.absent ?? 0} absent`}
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="Total Earnings"
          value={money(ledger?.earned ?? 0)}
          icon={<IndianRupee className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Total Paid"
          value={money(ledger?.paid ?? 0)}
          icon={<Wallet className="size-5" />}
          tone="success"
        />
        <StatCard
          label="Pending"
          value={money(ledger?.pending ?? 0)}
          icon={<IndianRupee className="size-5" />}
          tone="danger"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Monthly attendance" description="Days worked each month">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="Days" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Monthly earnings" description="Wages generated each month">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Earnings"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Attendance history" description="Your last 10 marked days">
          {(attendance.data ?? []).length === 0 ? (
            <EmptyState title="No attendance yet" description="Your marked days will appear here." />
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
                {(attendance.data ?? []).slice(0, 10).map((a) => (
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
        </SectionCard>

        <SectionCard title="Payment history" description="Payments received from your contractor">
          {(payments.data ?? []).length === 0 ? (
            <EmptyState title="No payments yet" description="Recorded payments will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments.data ?? []).slice(0, 10).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.payment_date}</TableCell>
                    <TableCell className="text-muted-foreground">{p.payment_method}</TableCell>
                    <TableCell className="text-right font-medium">
                      {money(Number(p.amount))}
                    </TableCell>
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
