import { createFileRoute } from "@tanstack/react-router";

/**
 * Purge quotidienne des données arrivées à échéance (appelée par le planificateur).
 * Authentification par secret dédié transmis dans l'en-tête `x-purge-secret`
 * (ou `Authorization: Bearer …`). Aucun secret ni donnée personnelle n'est journalisé.
 */
export const Route = createFileRoute("/api/public/hooks/purge-donnees")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const attendu = process.env["PURGE_HOOK_SECRET"];
        const fourni =
          request.headers.get("x-purge-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          null;

        if (!attendu || !fourni || fourni !== attendu) {
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
