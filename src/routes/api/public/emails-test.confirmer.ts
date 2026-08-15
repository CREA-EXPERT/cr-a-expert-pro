/**
 * Confirmation d'email automatisée en environnement de test.
 *
 * Le test de bout en bout inscrit un compte `+test`, puis appelle cet endpoint :
 * il vérifie qu'un email portant l'étiquette attendue est bien arrivé dans la
 * boîte `emails_test`, puis confirme l'adresse du compte sans intervention
 * manuelle. Comme la boîte de test, l'endpoint ne répond que lorsque
 * l'interception d'envoi est active ; sinon il renvoie 403.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MOTIF_EMAIL_TEST } from "@/lib/test-mode";

const REFUS = () => new Response("Confirmation de test indisponible", { status: 403 });

const schema = z.object({
  email: z.string().email(),
  /** Étiquette attendue dans la boîte de test ; par défaut aucune contrainte. */
  tag: z.string().min(1).max(60).optional(),
  /** Autorise la confirmation même sans email intercepté correspondant. */
  sansEmail: z.boolean().optional(),
});

function autorisee(request: Request): boolean {
  if (process.env["EMAILS_TEST_INTERCEPT"] !== "1") return false;
  const cle = process.env["EMAILS_TEST_INTERCEPT_KEY"];
  if (cle && request.headers.get("x-test-inbox-key") !== cle) return false;
  return true;
}

export const Route = createFileRoute("/api/public/emails-test/confirmer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!autorisee(request)) return REFUS();

        let corps: z.infer<typeof schema>;
        try {
          corps = schema.parse(await request.json());
        } catch {
          return new Response("Requête invalide", { status: 400 });
        }
        // Seuls les comptes de test peuvent être confirmés automatiquement.
        if (!corps.email.toLowerCase().includes(MOTIF_EMAIL_TEST)) return REFUS();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (!corps.sansEmail) {
          let requete = supabaseAdmin
            .from("emails_test")
            .select("id")
            .eq("destinataire", corps.email)
            .limit(1);
          if (corps.tag) requete = requete.eq("tag", corps.tag);
          const { data } = await requete;
          if (!data || data.length === 0) {
            return new Response(JSON.stringify({ confirme: false, raison: "aucun_email" }), {
              status: 404,
              headers: { "content-type": "application/json" },
            });
          }
        }

        const { data: liste, error } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (error) return new Response(error.message, { status: 500 });
        const utilisateur = liste.users.find(
          (u) => (u.email ?? "").toLowerCase() === corps.email.toLowerCase(),
        );
        if (!utilisateur) {
          return new Response(JSON.stringify({ confirme: false, raison: "compte_inconnu" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }

        const { error: erreurMaj } = await supabaseAdmin.auth.admin.updateUserById(utilisateur.id, {
          email_confirm: true,
        });
        if (erreurMaj) return new Response(erreurMaj.message, { status: 500 });

        return new Response(JSON.stringify({ confirme: true, userId: utilisateur.id }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
      GET: async () => REFUS(),
    },
  },
});
