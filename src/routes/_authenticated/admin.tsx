import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Users,
  BarChart3,
  Check,
  X,
  Loader2,
  Send,
  Download,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNotification, formatCurrency, formatDate } from "@/lib/notify";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout title="Administration">
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Administration">
        <Card className="mx-auto max-w-md border-border/60 p-10 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 font-semibold">Accès réservé</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cet espace est réservé aux administrateurs.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Administration" description="Supervision de la plateforme">
      <Tabs defaultValue="validation">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="validation">
            <FileText className="mr-1.5 h-4 w-4" /> Validation
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1.5 h-4 w-4" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-1.5 h-4 w-4" /> Statistiques
          </TabsTrigger>
          <TabsTrigger value="notify">
            <Send className="mr-1.5 h-4 w-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="validation">
          <ValidationTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
        <TabsContent value="notify">
          <NotifyTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function ValidationTab() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data: theses = [], isLoading } = useQuery({
    queryKey: ["admin-theses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pending = theses.filter((t) => t.status === "pending");

  const decide = async (
    t: (typeof theses)[number],
    status: "approved" | "rejected",
  ) => {
    setBusy(t.id);
    try {
      const { error } = await supabase
        .from("theses")
        .update({ status, rejection_reason: status === "rejected" ? reason[t.id] ?? null : null })
        .eq("id", t.id);
      if (error) throw error;
      await createNotification({
        userId: t.author_id,
        type: status === "approved" ? "success" : "error",
        title: status === "approved" ? "Mémoire validé" : "Mémoire rejeté",
        message:
          status === "approved"
            ? `Votre mémoire « ${t.title} » a été validé et est désormais public.`
            : `Votre mémoire « ${t.title} » a été rejeté. Motif : ${reason[t.id] || "non précisé"}.`,
      });
      toast.success(status === "approved" ? "Mémoire validé" : "Mémoire rejeté");
      qc.invalidateQueries({ queryKey: ["admin-theses"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  const download = async (path: string) => {
    const { data } = await supabase.storage.from("theses").createSignedUrl(path, 600);
    if (data) window.open(data.signedUrl, "_blank");
  };

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {pending.length} mémoire{pending.length > 1 ? "s" : ""} en attente de validation
      </p>
      {pending.length === 0 ? (
        <Card className="border-border/60 p-10 text-center text-muted-foreground">
          Aucun mémoire en attente. 🎉
        </Card>
      ) : (
        pending.map((t) => (
          <Card key={t.id} className="border-border/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{t.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.author_name || "Anonyme"} · {t.faculty || "—"} · {t.year || "—"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => download(t.file_path)}>
                <Download className="h-4 w-4" /> PDF
              </Button>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{t.abstract}</p>
            <Textarea
              className="mt-3"
              rows={2}
              placeholder="Motif de rejet (optionnel)"
              value={reason[t.id] ?? ""}
              onChange={(e) => setReason((r) => ({ ...r, [t.id]: e.target.value }))}
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => decide(t, "approved")}
                disabled={busy === t.id}
              >
                {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Valider
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => decide(t, "rejected")}
                disabled={busy === t.id}
              >
                <X className="h-4 w-4" /> Rejeter
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, university, faculty").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const setAdmin = async (userId: string, makeAdmin: boolean) => {
    setBusy(userId);
    try {
      if (makeAdmin) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      } else {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      }
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      toast.error("Modification impossible");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Chargement…</p>;

  return (
    <Card className="border-border/60">
      <ul className="divide-y divide-border/60">
        {users.map((u) => {
          const isAdminUser = u.roles.includes("admin");
          return (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{u.full_name || "Utilisateur"}</p>
                <p className="text-xs text-muted-foreground">
                  {u.university || "—"} · {u.faculty || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px] uppercase">
                    {r === "admin" ? "Admin" : r === "student" ? "Déposant" : "Visiteur"}
                  </Badge>
                ))}
                <Button
                  variant={isAdminUser ? "outline" : "hero"}
                  size="sm"
                  disabled={busy === u.id}
                  onClick={() => setAdmin(u.id, !isAdminUser)}
                >
                  {busy === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isAdminUser ? "Retirer admin" : "Promouvoir admin"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function StatsTab() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [theses, users, payments] = await Promise.all([
        supabase.from("theses").select("status, downloads"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount, status"),
      ]);
      const rows = theses.data ?? [];
      const pays = payments.data ?? [];
      return {
        total: rows.length,
        pending: rows.filter((t) => t.status === "pending").length,
        approved: rows.filter((t) => t.status === "approved").length,
        rejected: rows.filter((t) => t.status === "rejected").length,
        downloads: rows.reduce((s, t) => s + (t.downloads ?? 0), 0),
        users: users.count ?? 0,
        revenue: pays
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + Number(p.amount), 0),
      };
    },
  });

  const cards = [
    { label: "Utilisateurs", value: data?.users ?? 0, icon: Users },
    { label: "Mémoires", value: data?.total ?? 0, icon: FileText },
    { label: "En attente", value: data?.pending ?? 0, icon: FileText },
    { label: "Validés", value: data?.approved ?? 0, icon: Check },
    { label: "Téléchargements", value: data?.downloads ?? 0, icon: Download },
    {
      label: "Revenus",
      value: formatCurrency(data?.revenue ?? 0),
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{c.label}</span>
            <c.icon className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{c.value}</p>
        </Card>
      ))}
    </div>
  );
}

function NotifyTab() {
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState("all");
  const [form, setForm] = useState({ title: "", message: "" });

  const { data: users = [] } = useQuery({
    queryKey: ["notify-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data ?? [];
    },
  });

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error("Titre et message requis");
    }
    setBusy(true);
    try {
      const recipients = target === "all" ? users.map((u) => u.id) : [target];
      for (const uid of recipients) {
        await createNotification({
          userId: uid,
          type: "info",
          title: form.title.trim(),
          message: form.message.trim(),
        });
      }
      toast.success(`Notification envoyée à ${recipients.length} utilisateur(s)`);
      setForm({ title: "", message: "" });
    } catch {
      toast.error("Envoi impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl border-border/60 p-6">
      <h2 className="font-semibold">Envoyer une notification</h2>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label>Destinataire</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || "Utilisateur"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ntitle">Titre</Label>
          <Input
            id="ntitle"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nmsg">Message</Label>
          <Textarea
            id="nmsg"
            rows={4}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            maxLength={500}
          />
        </div>
        <Button variant="hero" onClick={send} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer
        </Button>
      </div>
    </Card>
  );
}
