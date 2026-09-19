import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/kit";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, role, refresh } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const saveProfile = async () => {
    if (name.trim().length < 3) {
      toast.error("Enter your full name");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq("id", profile!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (pw.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      ...(currentPw ? { current_password: currentPw } : {}),
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw("");
    setCurrentPw("");
    toast.success("Password changed");
  };

  return (
    <div>
      <PageHeader title="Profile & settings" subtitle="Manage your account details" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-base font-semibold">Account details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={role} disabled className="capitalize" />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={busy}>
              Save changes
            </Button>
          </div>
        </Card>

        <Card className="gap-0 border-0 p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-base font-semibold">Change password</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <Button variant="outline" onClick={changePassword} disabled={busy}>
              Update password
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
