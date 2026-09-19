import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";

export type Site = {
  id: string;
  contractor_id: string;
  site_name: string;
  location: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type WorkerRole =
  | "Mason"
  | "Labourer"
  | "Electrician"
  | "Plumber"
  | "Painter"
  | "Carpenter"
  | "Welder"
  | "Other";

export const WORKER_ROLES: WorkerRole[] = [
  "Mason",
  "Labourer",
  "Electrician",
  "Plumber",
  "Painter",
  "Carpenter",
  "Welder",
  "Other",
];

export type Worker = {
  id: string;
  contractor_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: WorkerRole;
  daily_wage: number;
  address: string | null;
  joining_date: string;
  site_id: string | null;
  status: string;
};

export type AttendanceStatus = "Present" | "Half Day" | "Absent";

export type Attendance = {
  id: string;
  worker_id: string;
  site_id: string | null;
  contractor_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  wage_amount: number;
};

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Other";
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Other"];

export type Payment = {
  id: string;
  worker_id: string;
  contractor_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type Scope = { role: AppRole; uid: string };

/** Sites visible to the current user. */
export async function fetchSites({ role, uid }: Scope): Promise<Site[]> {
  let q = supabase.from("sites").select("*").order("created_at", { ascending: false });
  if (role === "contractor") q = q.eq("contractor_id", uid);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Site[];
}

export async function fetchWorkers({ role, uid }: Scope): Promise<Worker[]> {
  let q = supabase.from("workers").select("*").order("created_at", { ascending: false });
  if (role === "contractor") q = q.eq("contractor_id", uid);
  if (role === "worker") q = q.eq("user_id", uid);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Worker[];
}

export async function fetchAttendance(
  { role, uid }: Scope,
  opts: { from?: string; to?: string; siteId?: string } = {},
): Promise<Attendance[]> {
  let q = supabase
    .from("attendance")
    .select("*")
    .order("attendance_date", { ascending: false })
    .limit(4000);
  if (role === "contractor") q = q.eq("contractor_id", uid);
  if (opts.from) q = q.gte("attendance_date", opts.from);
  if (opts.to) q = q.lte("attendance_date", opts.to);
  if (opts.siteId) q = q.eq("site_id", opts.siteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function fetchPayments({ role, uid }: Scope): Promise<Payment[]> {
  let q = supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false })
    .limit(2000);
  if (role === "contractor") q = q.eq("contractor_id", uid);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function fetchProfiles(): Promise<
  { id: string; full_name: string; email: string; phone: string | null; role: AppRole; status: string; created_at: string }[]
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as never;
}

/* ---------- calculations ---------- */

export type WorkerLedger = {
  worker: Worker;
  present: number;
  half: number;
  absent: number;
  earned: number;
  paid: number;
  pending: number;
  lastPayment: string | null;
};

export function buildLedger(
  workers: Worker[],
  attendance: Attendance[],
  payments: Payment[],
): WorkerLedger[] {
  return workers.map((worker) => {
    const rows = attendance.filter((a) => a.worker_id === worker.id);
    const present = rows.filter((r) => r.status === "Present").length;
    const half = rows.filter((r) => r.status === "Half Day").length;
    const absent = rows.filter((r) => r.status === "Absent").length;
    const earned = present * Number(worker.daily_wage) + half * Number(worker.daily_wage) * 0.5;
    const pays = payments.filter((p) => p.worker_id === worker.id);
    const paid = pays.reduce((s, p) => s + Number(p.amount), 0);
    const lastPayment = pays.length
      ? pays.map((p) => p.payment_date).sort().reverse()[0]!
      : null;
    return {
      worker,
      present,
      half,
      absent,
      earned,
      paid,
      pending: Math.max(earned - paid, 0),
      lastPayment,
    };
  });
}

export const money = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
