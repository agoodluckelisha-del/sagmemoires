import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, CreditCard, Check, Loader2, Receipt, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createNotification, formatCurrency, formatDate } from "@/lib/notify";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

const PREMIUM_PRICE = 9.99;

const premiumFeatures = [
  "Dépôt illimité de mémoires",
  "Téléchargement complet des mémoires Premium",
  "Accès avancé et prioritaire",
  "Badge Premium sur vos dépôts",
];

function PaymentsPage() {
  const { user, subscription, isPremium, refresh } = useAuth();
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subscribe = async () => {
    setProcessing(true);
    try {
      // Simulated checkout — records payment + activates the premium subscription.
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: payErr } = await supabase.from("payments").insert({
        user_id: user!.id,
        amount: PREMIUM_PRICE,
        currency: "EUR",
        status: "paid",
        plan: "premium",
        description: "Abonnement Premium — 1 mois",
      });
      if (payErr) throw payErr;

      const { error: subErr } = await supabase
        .from("subscriptions")
        .update({
          plan: "premium",
          status: "active",
          current_period_end: periodEnd.toISOString(),
        })
        .eq("user_id", user!.id);
      if (subErr) throw subErr;

      await createNotification({
        userId: user!.id,
        type: "success",
        title: "Paiement réussi",
        message: "Votre abonnement Premium est actif. Profitez du dépôt illimité !",
      });

      await refresh();
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Bienvenue dans Premium 🎉");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Le paiement a échoué");
    } finally {
      setProcessing(false);
    }
  };

  const cancel = async () => {
    setProcessing(true);
    try {
      await supabase
        .from("subscriptions")
        .update({ plan: "free", status: "active", current_period_end: null })
        .eq("user_id", user!.id);
      await refresh();
      toast.success("Abonnement annulé");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout title="Paiements & abonnement" description="Gérez votre offre et vos factures">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current plan */}
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Formule actuelle</h2>
            <Badge
              className={
                isPremium
                  ? "bg-gradient-primary border-none text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }
            >
              {isPremium ? "Premium" : "Gratuit"}
            </Badge>
          </div>
          {isPremium ? (
            <div className="mt-4 space-y-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Renouvellement le {formatDate(subscription?.current_period_end)}
              </p>
              <Button variant="outline" onClick={cancel} disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 animate-spin" />} Annuler l'abonnement
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Vous utilisez l'offre gratuite (jusqu'à 3 mémoires).
            </p>
          )}
        </Card>

        {/* Premium upsell */}
        <Card className="relative overflow-hidden border-primary/30 p-6">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Premium</h2>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-display text-3xl font-extrabold">
              {formatCurrency(PREMIUM_PRICE)}
            </span>
            <span className="text-sm text-muted-foreground">/ mois</span>
          </div>
          <ul className="mt-4 space-y-2">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            variant="hero"
            className="mt-5 w-full"
            onClick={subscribe}
            disabled={processing || isPremium}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {isPremium ? "Déjà abonné" : "S'abonner à Premium"}
          </Button>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="mt-6 border-border/60">
        <div className="flex items-center gap-2 border-b border-border/60 p-5">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Historique des paiements</h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Aucun paiement enregistré.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium">{p.description || "Paiement"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(Number(p.amount), p.currency)}</span>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "paid"
                        ? "border-success/30 bg-success/10 text-success"
                        : p.status === "failed"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-warning/30 bg-warning/10 text-warning"
                    }
                  >
                    {p.status === "paid"
                      ? "Payé"
                      : p.status === "failed"
                        ? "Échoué"
                        : p.status === "expired"
                          ? "Expiré"
                          : "En attente"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Paiement de démonstration. Une passerelle réelle (Stripe / Paddle) peut être connectée.
      </p>
    </DashboardLayout>
  );
}
