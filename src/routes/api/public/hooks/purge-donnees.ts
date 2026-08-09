import { createFileRoute } from "@tanstack/react-router";

/**
 * Purge quotidienne des données arrivées à échéance (appelée par le planificateur).
 * Authentification par clé publique du projet transmise dans l'en-tête `apikey`.
 * Aucune donnée personnelle n'est renvoyée ni journalisée.
 */
export const Route = createFileRoute("/api/public/hooks/purge-donnees")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cle = request.headers.get("apikey");
        const attendue =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!attendue || cle !== attendue) {
          return new Response(JSON.stringify({ erreur: "non_autorise" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let dryRun = false;
        try {
          const corps = (await request.json()) as { dry_run?: boolean };
          dryRun = corps?.dry_run === true;
        } catch {
          dryRun = false;
        }

        const { executerPurge } = await import("@/lib/purge.server");
        const resultat = await executerPurge({ dryRun, declencheur: "cron_quotidien" });

        return new Response(JSON.stringify(resultat), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
