import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions générales d'utilisation — CREA EXPERT" },
      {
        name: "description",
        content:
          "Conditions d'accès et d'utilisation de la plateforme CREA EXPERT, périmètre du service et conditions de la mission comptable.",
      },
      { property: "og:title", content: "Conditions générales d'utilisation — CREA EXPERT" },
      {
        property: "og:description",
        content: "Périmètre du service, obligations réciproques et conditions tarifaires.",
      },
    ],
  }),
  component: Cgu,
});

function Cgu() {
  return (
    <PageShell>
      <article className="container-page max-w-3xl space-y-8 py-12">
        <header>
          <h1 className="font-serif text-4xl">Conditions générales d'utilisation</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Document provisoire — les éléments balisés [À COMPLÉTER] doivent être renseignés avant
            toute mise en ligne publique.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">1. Objet</h2>
          <p>
            Les présentes conditions régissent l'accès et l'utilisation de la plateforme CREA EXPERT,
            qui permet de préparer en ligne un dossier de création de société et de le soumettre à un
            cabinet d'expertise comptable partenaire.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">2. Périmètre du service</h2>
          <p>
            La plateforme fournit une information générale, un parcours de collecte d'informations et
            la production de projets de documents. Elle ne délivre aucun conseil juridique ni aucune
            recommandation personnalisée. La revue et la validation du dossier relèvent du cabinet
            d'expertise comptable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">3. Conditions tarifaires</h2>
          <p>
            Les honoraires de création sont de 0 €. En contrepartie, l'utilisateur s'engage sur une
            mission comptable de 3 mois à 199 € HT/mois auprès du cabinet d'expertise comptable
            partenaire, sans reconduction forcée à l'issue de cette période. Les frais légaux
            (annonce légale, frais de greffe, déclaration des bénéficiaires effectifs) restent à la
            charge de l'utilisateur et lui sont refacturés à l'euro près.
          </p>
          <p>[À COMPLÉTER — modalités de facturation, de paiement et de résiliation]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">4. Obligations de l'utilisateur</h2>
          <p>
            L'utilisateur garantit l'exactitude et la complétude des informations et des pièces
            qu'il transmet. Il s'engage à ne déposer que des documents dont il est légitimement
            détenteur.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">5. Compte et sécurité</h2>
          <p>[À COMPLÉTER — création de compte, confidentialité des identifiants, suspension]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">6. Responsabilité</h2>
          <p>[À COMPLÉTER]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">7. Droit applicable et litiges</h2>
          <p>[À COMPLÉTER]</p>
        </section>
      </article>
    </PageShell>
  );
}
