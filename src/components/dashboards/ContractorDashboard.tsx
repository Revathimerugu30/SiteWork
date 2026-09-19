import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  CalendarCheck,
  HardHat,
  Plus,
  TrendingUp,
  Wallet,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  StatusBadge,
} from "@/components/kit";
import { useAttendance, usePayments, useSites, useWorkers } from "@/hooks/useData";
import { buildLedger, money, todayISO, daysAgoISO } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { WorkerRequestsCard } from "@/components/WorkerRequests";
import attendanceImg from "@/assets/attendance-card.jpg";
import workersImg from "@/assets/workers-card.jpg";
import siteImg from "@/assets/site-hero.jpg";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function ContractorDashboard() {
  const { profile } = useAuth();
  const [range, setRange] = useState<"week" | "month">("week");
  const sites = useSites();
  const workers = useWorkers();
  const attendance = useAttendance();
  const payments = usePayments();

  const loading = sites.isLoading || workers.isLoading || attendance.isLoading;
  const today = todayISO();

  const ledger = useMemo(
    () => buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? []),
    [workers.data, attendance.data, payments.data],
  );

  const totals = useMemo(() => {
    const earned = ledger.reduce((s, l) => s + l.earned, 0);
    const paid = ledger.reduce((s, l) => s + l.paid, 0);
    return { earned, paid, pending: Math.max(earned - paid, 0) };
  }, [ledger]);

  const todayRows = (attendance.data ?? []).filter((a) => a.attendance_date === today);
  const todayCount = {
    present: todayRows.filter((r) => r.status === "Present").length,
    half: todayRows.filter((r) => r.status === "Half Day").length,
    absent: todayRows.filter((r) => r.status === "Absent").length,
  };

  const chartData = useMemo(() => {
    const days = range === "week" ? 7 : 30;
    const out: { label: string; Present: number; "Half Day": number; Absent: number; Wages: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
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
  }, [attendance.data, range]);

  const activeSites = (sites.data ?? []).filter((s) => s.status === "Active");
  const pendingList = ledger.filter((l) => l.pending > 0).sort((a, b) => b.pending - a.pending);
  const recentPayments = (payments.data ?? []).slice(0, 6);
  const workerName = (id: string) => (workers.data ?? []).find((w) => w.id === id)?.name ?? "Worker";

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${profile?.full_name?.split(" ")[0] || "Contractor"}`}
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/workers">
                <Plus className="size-4" /> Add Worker
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sites">
                <Plus className="size-4" /> Add Site
              </Link>
            </Button>
            <Button asChild>
              <Link to="/attendance">
                <CalendarCheck className="size-4" /> Mark Attendance
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/payments">
                <IndianRupee className="size-4" /> Record Payment
              </Link>
            </Button>
          </>
        }
      />

      {/* photo strip */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          { img: siteImg, title: `${activeSites.length} active sites`, sub: "Live construction sites", to: "/sites" },
          { img: workersImg, title: `${(workers.data ?? []).length} workers`, sub: "On your workforce roster", to: "/workers" },
          { img: attendanceImg, title: "Today's attendance", sub: `${todayCount.present} present · ${todayCount.half} half day`, to: "/attendance" },
        ].map((c) => (
          <Link key={c.title} to={c.to} className="group relative h-36 overflow-hidden rounded-2xl border shadow-[var(--shadow-soft)]">
            <img
              src={c.img}
              alt={c.sub}
              loading="lazy"
              width={1200}
              height={800}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.2_0.04_258/0.85)] to-transparent" />
            <div className="absolute bottom-0 p-4 text-white">
              <p className="font-display text-lg font-semibold">{c.title}</p>
              <p className="text-xs text-white/75">{c.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <WorkerRequestsCard />
      </div>

      {loading ? (
        <LoadingCards count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Workers"
            value={(workers.data ?? []).length}
            hint={`${(workers.data ?? []).filter((w) => w.status === "Active").length} active`}
            icon={<HardHat className="size-5" />}
            tone="primary"
            to="/workers"
          />
          <StatCard
            label="Active Sites"
            value={activeSites.length}
            hint={`${(sites.data ?? []).length} sites in total`}
            icon={<Building2 className="size-5" />}
            tone="default"
            to="/sites"
          />
          <StatCard
            label="Today's Attendance"
            value={`${todayCount.present} / ${todayCount.half} / ${todayCount.absent}`}
            hint="Present / Half day / Absent"
            icon={<CalendarCheck className="size-5" />}
            tone="success"
            to="/attendance"
          />
          <StatCard
            label="Total Earnings"
            value={money(totals.earned)}
            hint="Wages generated from attendance"
            icon={<TrendingUp className="size-5" />}
            tone="primary"
            to="/wages"
          />
          <StatCard
            label="Total Paid"
            value={money(totals.paid)}
            hint={`${(payments.data ?? []).length} payments recorded`}
            icon={<Wallet className="size-5" />}
            tone="success"
            to="/payments"
          />
          <StatCard
            label="Pending Payments"
            value={money(totals.pending)}
            hint={`${pendingList.length} workers awaiting payment`}
            icon={<IndianRupee className="size-5" />}
            tone="danger"
            to="/wages"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Attendance analytics"
          description="Attendance pattern across your sites"
          className="lg:col-span-3"
          actions={
            <Tabs value={range} onValueChange={(v) => setRange(v as "week" | "month")}>
              <TabsList>
                <TabsTrigger value="week">Weekly</TabsTrigger>
                <TabsTrigger value="month">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Present" stackId="a" fill="var(--color-chart-2)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Half Day" stackId="a" fill="var(--color-chart-3)" />
                <Bar dataKey="Absent" stackId="a" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Wage & payment analytics"
          description="Earnings trend and settlement status"
          className="lg:col-span-2"
        >
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-[11px] text-muted-foreground">Wages</p>
              <p className="text-sm font-semibold">{money(totals.earned)}</p>
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <p className="text-[11px] text-muted-foreground">Paid</p>
              <p className="text-sm font-semibold text-success">{money(totals.paid)}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-[11px] text-muted-foreground">Pending</p>
              <p className="text-sm font-semibold text-destructive">{money(totals.pending)}</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                />
                <Line
                  type="monotone"
                  dataKey="Wages"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Site performance" description="Workers, wages and dues per site">
          {activeSites.length === 0 ? (
            <EmptyState
              title="No active sites yet"
              description="Create your first site to start assigning workers."
              icon={<Building2 className="size-6" />}
              action={
                <Button asChild>
                  <Link to="/sites">Add Site</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {(sites.data ?? []).slice(0, 5).map((site) => {
                const siteWorkers = (workers.data ?? []).filter((w) => w.site_id === site.id);
                const rows = (attendance.data ?? []).filter((a) => a.site_id === site.id);
                const wages = rows.reduce((s, r) => s + Number(r.wage_amount), 0);
                const presentToday = rows.filter(
                  (r) => r.attendance_date === today && r.status !== "Absent",
                ).length;
                return (
                  <div
                    key={site.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{site.site_name}</p>
                      <p className="text-xs text-muted-foreground">{site.location}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <span className="text-muted-foreground">{siteWorkers.length} workers</span>
                      <span className="text-success">{presentToday} in today</span>
                      <span className="font-medium">{money(wages)}</span>
                      <StatusBadge status={site.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Pending payments"
          description="Workers with outstanding dues"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/wages">View all</Link>
            </Button>
          }
        >
          {pendingList.length === 0 ? (
            <EmptyState title="All settled" description="No pending dues right now." />
          ) : (
            <div className="space-y-3">
              {pendingList.slice(0, 5).map((l) => (
                <div key={l.worker.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Initials name={l.worker.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.worker.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Earned {money(l.earned)} · Paid {money(l.paid)}
                      {l.lastPayment ? ` · Last ${l.lastPayment}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{money(l.pending)}</span>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/workers/$id" params={{ id: l.worker.id }}>
                      Details
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Card className="mt-6 gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent payments</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/payments">All payments</Link>
          </Button>
        </div>
        {recentPayments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Record your first payment to track settled wages."
            icon={<Wallet className="size-6" />}
            action={
              <Button asChild>
                <Link to="/payments">Record Payment</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{workerName(p.worker_id)}</TableCell>
                    <TableCell>{money(Number(p.amount))}</TableCell>
                    <TableCell className="text-muted-foreground">{p.payment_method}</TableCell>
                    <TableCell className="text-muted-foreground">{p.payment_date}</TableCell>
                    <TableCell>
                      <StatusBadge status="Completed" />
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
