/**
 * Boîte de réception de test (lecture seule).
 *
 * Cet endpoint n'existe que pour les suites automatisées : il ne répond que
 * lorsque l'interception d'envoi est active (`EMAILS_TEST_INTERCEPT=1`), ce qui
 * n'est jamais le cas en production. Il expose les emails interceptés,
 * filtrables par dossier et par étiquette, dans leur ordre d'arrivée.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/emails-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (process.env["EMAILS_TEST_INTERCEPT"] !== "1") {
          return new Response("Boîte de test désactivée", { status: 403 });
        }
        const cle = process.env["EMAILS_TEST_INTERCEPT_KEY"];
        if (cle && request.headers.get("x-test-inbox-key") !== cle) {
          return new Response("Clé de test invalide", { status: 401 });
        }

        const url = new URL(request.url);
        const dossier = url.searchParams.get("dossier");
        const tag = url.searchParams.get("tag");
        const destinataire = url.searchParams.get("destinataire");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let requete = supabaseAdmin
          .from("emails_test")
          .select("id, dossier_id, destinataire, sujet, corps, tag, pour_cabinet, ordre, created_at")
          .order("ordre", { ascending: true })
          .limit(200);
        if (dossier) requete = requete.eq("dossier_id", dossier);
        if (tag) requete = requete.eq("tag", tag);
        if (destinataire) requete = requete.eq("destinataire", destinataire);

        const { data, error } = await requete;
        if (error) return new Response(error.message, { status: 500 });

        return new Response(JSON.stringify({ emails: data ?? [] }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
