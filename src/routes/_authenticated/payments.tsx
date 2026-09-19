import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus, Search } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAttendance, usePayments, useWorkers } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  buildLedger,
  money,
  PAYMENT_METHODS,
  todayISO,
  type Payment,
  type PaymentMethod,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

type Form = {
  worker_id: string;
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string;
};

const blank: Form = {
  worker_id: "",
  amount: "",
  payment_method: "Cash",
  payment_date: todayISO(),
  notes: "",
};

function PaymentsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const workers = useWorkers();
  const payments = usePayments();
  const attendance = useAttendance();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [q, setQ] = useState("");
  const [del, setDel] = useState<Payment | null>(null);

  const canEdit = role === "contractor";

  const ledger = useMemo(
    () => buildLedger(workers.data ?? [], attendance.data ?? [], payments.data ?? []),
    [workers.data, attendance.data, payments.data],
  );
  const totals = ledger.reduce(
    (a, l) => ({ earned: a.earned + l.earned, paid: a.paid + l.paid, pending: a.pending + l.pending }),
    { earned: 0, paid: 0, pending: 0 },
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!form.worker_id) throw new Error("Select a worker");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
      const payload = {
        worker_id: form.worker_id,
        contractor_id: user!.id,
        amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        notes: form.notes.trim() || null,
        recorded_by: user!.id,
      };
      const { error } = editing
        ? await supabase.from("payments").update(payload).eq("id", editing.id)
        : await supabase.from("payments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Payment updated" : "Payment recorded");
      setOpen(false);
      setEditing(null);
      setForm(blank);
      void qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (p: Payment) => {
      const { error } = await supabase.from("payments").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment deleted");
      setDel(null);
      void qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const workerName = (id: string) => (workers.data ?? []).find((w) => w.id === id)?.name ?? "Worker";
  const list = (payments.data ?? []).filter((p) =>
    workerName(p.worker_id).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title={role === "worker" ? "My payments" : "Payments"}
        subtitle="Recorded wage settlements. No payment gateway is involved — this is a payment record."
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Record Payment
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total earned"
          value={money(totals.earned)}
          hint="Wages workers have earned from attendance"
          tone="primary"
        />
        <StatCard
          label="Total paid"
          value={money(totals.paid)}
          hint="Amount you have already handed over"
          tone="success"
        />
        <StatCard
          label="Total pending"
          value={money(totals.pending)}
          hint="Earned minus paid — record a payment to reduce this"
          tone="danger"
        />
      </div>

      <Card className="mb-5 gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search payments by worker"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </Card>

      <Card className="gap-0 border-0 p-4 shadow-[var(--shadow-soft)]">
        {payments.isLoading ? (
          <LoadingTable />
        ) : list.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Record a payment to keep pending dues accurate."
            icon={<IndianRupee className="size-6" />}
            action={
              canEdit && (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setForm(blank);
                    setOpen(true);
                  }}
                >
                  Record Payment
                </Button>
              )
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
                  <TableHead>Notes</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{workerName(p.worker_id)}</TableCell>
                    <TableCell className="font-semibold">{money(Number(p.amount))}</TableCell>
                    <TableCell className="text-muted-foreground">{p.payment_method}</TableCell>
                    <TableCell className="text-muted-foreground">{p.payment_date}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {p.notes || "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(p);
                            setForm({
                              worker_id: p.worker_id,
                              amount: String(p.amount),
                              payment_method: p.payment_method,
                              payment_date: p.payment_date,
                              notes: p.notes ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setDel(p)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit payment" : "Record a payment"}</DialogTitle>
            <DialogDescription>
              Pending dues update automatically once the payment is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Worker *</Label>
              <Select
                value={form.worker_id}
                onValueChange={(v) => setForm({ ...form, worker_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {ledger.map((l) => (
                    <SelectItem key={l.worker.id} value={l.worker.id}>
                      {l.worker.name} — pending {money(l.pending)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Weekly settlement"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing ? "Save changes" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will increase the worker's pending amount again. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && remove.mutate(del)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
