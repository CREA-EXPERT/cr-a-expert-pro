import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — CREA EXPERT" },
      {
        name: "description",
        content:
          "Éditeur, directeur de publication, hébergeur et informations réglementaires de la plateforme CREA EXPERT.",
      },
      { property: "og:title", content: "Mentions légales — CREA EXPERT" },
      { property: "og:description", content: "Informations légales de la plateforme CREA EXPERT." },
    ],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  return (
    <PageShell>
      <article className="container-page max-w-3xl space-y-8 py-12">
        <header>
          <h1 className="font-serif text-4xl">Mentions légales</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Document provisoire — les éléments balisés [À COMPLÉTER] doivent être renseignés avant
            toute mise en ligne publique.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">1. Éditeur du site</h2>
          <p>Dénomination sociale : [À COMPLÉTER]</p>
          <p>Forme juridique et capital social : [À COMPLÉTER]</p>
          <p>Siège social : [À COMPLÉTER]</p>
          <p>RCS / SIREN : [À COMPLÉTER]</p>
          <p>Numéro de TVA intracommunautaire : [À COMPLÉTER]</p>
          <p>Adresse électronique de contact : [À COMPLÉTER]</p>
          <p>Téléphone : [À COMPLÉTER]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">2. Directeur de la publication</h2>
          <p>[À COMPLÉTER]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">3. Cabinet d'expertise comptable partenaire</h2>
          <p>Dénomination : [À COMPLÉTER]</p>
          <p>
            Inscription au tableau de l'Ordre des experts-comptables : [À COMPLÉTER — conseil
            régional et numéro d'inscription]
          </p>
          <p>Assurance de responsabilité civile professionnelle : [À COMPLÉTER]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">4. Hébergement</h2>
          <p>Hébergeur : [À COMPLÉTER]</p>
          <p>Localisation des données : Union européenne.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">5. Nature des informations publiées</h2>
          <p>
            Les contenus, simulateurs et documents mis à disposition sur ce site ont une vocation
            d'information générale. Ils ne constituent ni un conseil juridique, ni un conseil fiscal,
            ni une recommandation personnalisée. Chaque dossier est revu par un expert-comptable
            avant tout dépôt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">6. Propriété intellectuelle</h2>
          <p>[À COMPLÉTER]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">7. Médiation et réclamations</h2>
          <p>[À COMPLÉTER — coordonnées du médiateur de la consommation]</p>
        </section>
      </article>
    </PageShell>
  );
}
