import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

/** Create an in-app notification row for a user. */
export async function createNotification(params: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type ?? "info",
    title: params.title,
    message: params.message,
  });
  if (error) console.error("notification error", error);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

/** Simple duplicate detection using Jaccard similarity on word sets. */
export function similarityScore(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const sa = norm(a);
  const sb = norm(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  sa.forEach((w) => {
    if (sb.has(w)) inter++;
  });
  return inter / (sa.size + sb.size - inter);
}
