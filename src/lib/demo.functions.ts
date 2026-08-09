import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { estHoteApercu } from "@/lib/apercu";

export const DEMO_ADMIN_EMAIL = "admin.demo@crea-expert.test";
export const DEMO_DUREE_MINUTES = 60;

function verifierEnvironnement() {
  if (!estHoteApercu(getRequestHost())) throw new Error("Indisponible");
}

// Mot de passe aléatoire fort (32 caractères), généré à chaque appel côté serveur.
function motDePasseAleatoire() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  const octets = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(octets, (o) => alphabet[o % alphabet.length]).join("");
}


async function supprimerCompteDemo(supabaseAdmin: any, userId: string) {
  const { data: dossiers } = await supabaseAdmin.from("dossiers").select("id").eq("user_id", userId);
  for (const d of dossiers ?? []) {
    await supabaseAdmin.from("documents").delete().eq("dossier_id", d.id);
    await supabaseAdmin.from("associes").delete().eq("dossier_id", d.id);
    await supabaseAdmin.from("events_dossier").delete().eq("dossier_id", d.id);
  }
  await supabaseAdmin.from("dossiers").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

type Action = "connexion" | "reinitialiser" | "supprimer";

// Compte de démonstration réservé aux environnements de conception (aperçu / local).
export const preparerCompteDemo = createServerFn({ method: "POST" })
  .inputValidator((data: { action?: Action }) => ({ action: data?.action ?? "connexion" }))
  .handler(async ({ data }) => {
    verifierEnvironnement();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: liste } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = liste?.users.find((u) => u.email === DEMO_ADMIN_EMAIL)?.id ?? null;

    if (data.action === "supprimer") {
      if (userId) await supprimerCompteDemo(supabaseAdmin, userId);
      return { supprime: true as const };
    }

    if (data.action === "reinitialiser" && userId) {
      await supprimerCompteDemo(supabaseAdmin, userId);
      userId = null;
    }

    const motdepasse = motDePasseAleatoire();
    const expireLe = new Date(Date.now() + DEMO_DUREE_MINUTES * 60_000).toISOString();
    const metadonnees = {
      prenom: "Admin",
      nom: "Démonstration",
      consent_marketing: false,
      demo_expire_le: expireLe,
    };

    if (!userId) {
      const { data: cree, error } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_ADMIN_EMAIL,
        password: motdepasse,
        email_confirm: true,
        user_metadata: metadonnees,
      });
      if (error || !cree.user) throw new Error("Création du compte de démonstration impossible");
      userId = cree.user.id;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: motdepasse,
        email_confirm: true,
        user_metadata: metadonnees,
      });
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "cabinet" }, { onConflict: "user_id,role" });

    return {
      supprime: false as const,
      email: DEMO_ADMIN_EMAIL,
      motdepasse,
      expireLe,
      dureeMinutes: DEMO_DUREE_MINUTES,
    };
  });
