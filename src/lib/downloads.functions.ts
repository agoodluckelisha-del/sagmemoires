import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idInput = (data: unknown) => z.object({ id: z.string().uuid() }).parse(data);

async function signAndCount(filePath: string, thesisId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("theses")
    .createSignedUrl(filePath, 60 * 10);
  if (error || !data) throw new Error("Impossible de générer le lien de téléchargement");

  // Increment download counter (best-effort).
  const { data: row } = await supabaseAdmin
    .from("theses")
    .select("downloads")
    .eq("id", thesisId)
    .maybeSingle();
  if (row) {
    await supabaseAdmin
      .from("theses")
      .update({ downloads: (row.downloads ?? 0) + 1 })
      .eq("id", thesisId);
  }
  return data.signedUrl;
}

/** Anonymous download for approved, public, non-premium theses. */
export const getPublicThesisUrl = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: thesis, error } = await supabaseAdmin
      .from("theses")
      .select("file_path, status, is_public, is_premium")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !thesis) throw new Error("Mémoire introuvable");
    if (thesis.status !== "approved" || !thesis.is_public)
      throw new Error("Ce mémoire n'est pas disponible au téléchargement");
    if (thesis.is_premium)
      throw new Error("Ce mémoire nécessite un accès Premium");
    return { url: await signAndCount(thesis.file_path, data.id) };
  });

/** Premium download — requires an authenticated user with an active premium subscription. */
export const getPremiumThesisUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    const isPremium = sub?.plan === "premium" && sub?.status === "active";

    const { data: thesis, error } = await supabaseAdmin
      .from("theses")
      .select("file_path, status, is_public, is_premium, author_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !thesis) throw new Error("Mémoire introuvable");
    if (thesis.status !== "approved" || !thesis.is_public)
      throw new Error("Ce mémoire n'est pas disponible");

    // Author and admins always allowed; premium content needs an active subscription.
    if (thesis.is_premium && !isPremium && thesis.author_id !== context.userId) {
      throw new Error("Un abonnement Premium actif est requis pour ce mémoire");
    }
    return { url: await signAndCount(thesis.file_path, data.id) };
  });
