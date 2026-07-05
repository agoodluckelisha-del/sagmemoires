import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const iconMap = {
  info: { icon: Info, cls: "bg-primary/10 text-primary" },
  success: { icon: CheckCircle2, cls: "bg-success/10 text-success" },
  warning: { icon: AlertTriangle, cls: "bg-warning/10 text-warning" },
  error: { icon: XCircle, cls: "bg-destructive/10 text-destructive" },
} as const;

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notif-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user!.id)
      .eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Toutes les notifications sont lues");
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout
      title="Notifications"
      description={unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Vous êtes à jour"}
      actions={
        unread > 0 ? (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Tout marquer lu
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-3xl">
        {isLoading ? (
          <p className="py-20 text-center text-muted-foreground">Chargement…</p>
        ) : notifications.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-border/60 p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune notification pour le moment.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const style = iconMap[(n.type as keyof typeof iconMap) ?? "info"] ?? iconMap.info;
              return (
                <Card
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 border-border/60 p-4 transition-colors",
                    !n.read && "border-primary/30 bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      style.cls,
                    )}
                  >
                    <style.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!n.read && (
                      <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
