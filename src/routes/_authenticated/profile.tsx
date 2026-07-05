import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    university: profile?.university ?? "",
    faculty: profile?.faculty ?? "",
    study_year: profile?.study_year ?? "",
    bio: profile?.bio ?? "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          university: form.university.trim() || null,
          faculty: form.faculty.trim() || null,
          study_year: form.study_year.trim() || null,
          bio: form.bio.trim() || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
      await refresh();
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    form.full_name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <DashboardLayout title="Mon profil" description="Gérez vos informations personnelles">
      <div className="mx-auto max-w-2xl">
        <Card className="border-border/60 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-primary text-lg font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{form.full_name || "Utilisateur"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="university">Université</Label>
                <Input
                  id="university"
                  value={form.university}
                  onChange={(e) => update("university", e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty">Filière</Label>
                <Input
                  id="faculty"
                  value={form.faculty}
                  onChange={(e) => update("faculty", e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="study_year">Année d'étude</Label>
              <Input
                id="study_year"
                value={form.study_year}
                onChange={(e) => update("study_year", e.target.value)}
                placeholder="Master 2"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biographie</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                rows={4}
                maxLength={500}
              />
            </div>
            <Button type="submit" variant="hero" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
