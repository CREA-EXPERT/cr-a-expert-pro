import { createFileRoute } from "@tanstack/react-router";

/**
 * Relance quotidienne des pièces justificatives manquantes (planificateur).
 * Authentification par le même secret que le hook de purge (`x-purge-secret`
 * ou `Authorization: Bearer …`). Aucune donnée personnelle n'est journalisée.
 */
export const Route = createFileRoute("/api/public/hooks/relance-pieces")({
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

        const { relancerPiecesManquantes } = await import("@/lib/relances.server");
        const origine = new URL(request.url).origin;
        const resultat = await relancerPiecesManquantes(origine, dryRun);

        return new Response(JSON.stringify(resultat), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
