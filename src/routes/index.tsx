import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Calculator, HardHat, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImg from "@/assets/site-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabourTrack — Daily Wage Attendance & Payments" },
      {
        name: "description",
        content:
          "Track daily wage labour attendance across construction sites, calculate wages automatically and settle payments without disputes.",
      },
      { property: "og:title", content: "LabourTrack — Daily Wage Attendance & Payments" },
      {
        property: "og:description",
        content:
          "Attendance, automatic wage calculation, payments and pending dues for construction contractors.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "One-tap attendance",
    text: "Mark Present, Half Day or Absent for every worker on every site, with duplicate protection.",
  },
  {
    icon: Calculator,
    title: "Automatic wages",
    text: "Wages calculate themselves from daily rates — half days counted at exactly 50%.",
  },
  {
    icon: Wallet,
    title: "Clear pending dues",
    text: "Earned, paid and pending amounts per worker, always up to date.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    text: "Contractors see only their own data. Workers get a read-only view of their record.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HardHat className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">LabourTrack</span>
        </div>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-8 pb-16 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" /> Built for construction contractors
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold sm:text-5xl">
            Daily wage attendance and payments, finally under control.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground">
            LabourTrack replaces the notebook: sites, workers, attendance, automatic wage
            calculation, payments and pending dues — with reports you can hand over.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Worker login</Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border shadow-[var(--shadow-lift)]">
          <img
            src={heroImg}
            alt="Construction workers on a building site at golden hour"
            width={1600}
            height={900}
            className="size-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="card-elevated gap-0 border-0 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        LabourTrack — workforce attendance & wage management.
      </footer>
    </div>
  );
}
