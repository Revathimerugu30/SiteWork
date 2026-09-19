import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  HardHat,
  Building2,
  CalendarCheck,
  Calculator,
  Wallet,
  FileBarChart,
  UserCircle,
  Users,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV: Record<AppRole, NavItem[]> = {
  contractor: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sites", label: "Sites", icon: Building2 },
    { to: "/workers", label: "Workers", icon: HardHat },
    { to: "/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/wages", label: "Wages", icon: Calculator },
    { to: "/payments", label: "Payments", icon: Wallet },
    { to: "/reports", label: "Reports", icon: FileBarChart },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ],
  worker: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/attendance", label: "My Attendance", icon: CalendarCheck },
    { to: "/wages", label: "My Earnings", icon: Calculator },
    { to: "/payments", label: "My Payments", icon: Wallet },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/contractors", label: "Contractors", icon: Users },
    { to: "/workers", label: "Workers", icon: HardHat },
    { to: "/sites", label: "Sites", icon: Building2 },
    { to: "/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/payments", label: "Payments", icon: Wallet },
    { to: "/reports", label: "Reports", icon: FileBarChart },
    { to: "/profile", label: "Settings", icon: UserCircle },
  ],
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <HardHat className="size-5" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold text-sidebar-foreground">LabourTrack</p>
        <p className="text-[11px] text-sidebar-foreground/60">Workforce platform</p>
      </div>
    </div>
  );
}

function NavList({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="mt-6 space-y-1">
      {NAV[role].map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className={cn("size-4.5", active && "text-sidebar-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div>
          <Brand />
          <NavList role={role} />
        </div>
        <div className="rounded-xl bg-sidebar-accent/50 p-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {profile?.full_name || "User"}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/60 capitalize">{role}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="mt-2 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <NavList role={role} onNavigate={() => setOpen(false)} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="mt-4 w-full justify-start text-sidebar-foreground/80"
                >
                  <LogOut className="size-4" /> Sign out
                </Button>
              </SheetContent>
            </Sheet>
            <p className="font-display text-sm font-semibold lg:hidden">LabourTrack</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {(profile?.full_name || "U")
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("")}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export type { NavItem };
