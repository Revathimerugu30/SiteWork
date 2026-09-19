import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff, HardHat, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/auth-hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LabourTrack" },
      {
        name: "description",
        content: "Sign in or create your LabourTrack account to manage labour attendance and wages.",
      },
      { property: "og:title", content: "Sign in — LabourTrack" },
      {
        property: "og:description",
        content: "Secure access for contractors, workers and administrators.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState<AppRole>("contractor");

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPw) { toast.error("Enter your email and password"); return; }
    setBusy(true);
    try {
      await signIn(loginEmail.trim(), loginPw);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { toast.error("Enter your full name"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    if (phone && !/^[0-9+\-\s]{8,15}$/.test(phone)) { toast.error("Enter a valid phone number"); return; }
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      await signUp({ email: email.trim(), password: pw, full_name: name.trim(), phone, role });
      toast.success("Account created — signing you in");
      try {
        await signIn(email.trim(), pw);
        navigate({ to: "/dashboard", replace: true });
      } catch {
        toast.message("Please check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!loginEmail.trim()) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={heroImg}
          alt="Construction site at dusk with tower crane and scaffolding"
          width={1200}
          height={1600}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.2_0.04_258)] via-[oklch(0.2_0.04_258/0.72)] to-[oklch(0.2_0.04_258/0.35)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <HardHat className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">LabourTrack</span>
          </div>
          <div>
            <h2 className="max-w-md font-display text-4xl leading-tight font-semibold">
              Every worker counted. Every rupee accounted for.
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/75">
              Attendance, automatic wage calculation, payments and pending dues across all your
              construction sites — in one clean workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              {["Multi-site attendance", "Automatic wages", "Zero payment disputes"].map((f) => (
                <span key={f} className="flex items-center gap-2 text-white/85">
                  <ShieldCheck className="size-4 text-accent" /> {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <HardHat className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">LabourTrack</span>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="login" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Sign in to your workforce dashboard.
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="le">Email</Label>
                  <Input
                    id="le"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lp">Password</Label>
                  <div className="relative">
                    <Input
                      id="lp"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <h1 className="text-2xl font-semibold">Create your account</h1>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Contractors manage sites and workers. Workers get a read-only view of their
                attendance and earnings.
              </p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="n">Full name</Label>
                  <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Kumar" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="e">Email</Label>
                    <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p">Phone</Label>
                    <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pw">Password</Label>
                    <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min. 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
