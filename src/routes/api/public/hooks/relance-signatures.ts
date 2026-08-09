import { createFileRoute } from "@tanstack/react-router";

/**
 * Relance automatique des convocations de signature non délivrées.
 * Appelée par le planificateur, authentifiée par le secret dédié
 * (`x-purge-secret` ou `Authorization: Bearer …`).
 * Aucune adresse email en clair n'est journalisée : le journal ne conserve
 * qu'une forme masquée et une cause générique.
 */
export const Route = createFileRoute("/api/public/hooks/relance-signatures")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const attendu = process.env["PURGE_HOOK_SECRET"];
        const anon = process.env["SUPABASE_ANON_KEY"];
        const fourni =
          request.headers.get("x-purge-secret") ??
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          null;

        const autorise =
          Boolean(fourni) && ((attendu && fourni === attendu) || (anon && fourni === anon));
        if (!autorise) {
          return new Response(JSON.stringify({ erreur: "non_autorise" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { relancerEnvoisEnEchec } = await import("@/lib/signature.server");
        const origine = new URL(request.url).origin;
        const resultat = await relancerEnvoisEnEchec(origine, "relance_auto");

        return new Response(JSON.stringify(resultat), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
