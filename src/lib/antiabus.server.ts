/** Anti-abus élémentaire par limitation de fréquence. Serveur uniquement. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function verifierLimite(
  cle: string,
  ip: string,
  max = 5,
  fenetreHeures = 1,
): Promise<boolean> {
  const depuis = new Date(Date.now() - fenetreHeures * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("cle", cle)
    .eq("ip", ip)
    .gte("created_at", depuis);

  if (error) {
    // En cas d'erreur de lecture, on reste prudent mais on ne bloque pas la fonctionnalité.
    console.error("[antiabus] échec de lecture rate_limits", error);
  } else if ((count ?? 0) >= max) {
    return false;
  }

  const { error: erreurInsert } = await supabaseAdmin.from("rate_limits").insert({ cle, ip });
  if (erreurInsert) console.error("[antiabus] échec d'insertion rate_limits", erreurInsert);

  return true;
}
