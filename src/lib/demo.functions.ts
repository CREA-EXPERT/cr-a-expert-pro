import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";

export const DEMO_ADMIN_EMAIL = "admin.demo@crea-expert.test";

// Compte de démonstration réservé aux environnements de conception (aperçu / local).
export const preparerCompteDemo = createServerFn({ method: "POST" }).handler(async () => {
  const host = getRequestHost();
  const autorise =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.includes("id-preview--") ||
    host.includes("-dev.lovable.app");
  if (!autorise) {
    throw new Error("Indisponible");
  }

  const motdepasse = "DemoCreaExpert2026!";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: liste } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = liste?.users.find((u) => u.email === DEMO_ADMIN_EMAIL)?.id ?? null;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_ADMIN_EMAIL,
      password: motdepasse,
      email_confirm: true,
      user_metadata: { prenom: "Admin", nom: "Démonstration", consent_marketing: false },
    });
    if (error || !data.user) throw new Error("Création du compte de démonstration impossible");
    userId = data.user.id;
  } else {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: motdepasse,
      email_confirm: true,
    });
  }

  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "cabinet" }, { onConflict: "user_id,role" });

  return { email: DEMO_ADMIN_EMAIL, motdepasse };
});
