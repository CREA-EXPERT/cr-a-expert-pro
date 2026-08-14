import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { EDITEUR } from "@/lib/editeur";

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
    links: [{ rel: "canonical", href: "https://crea-expert.fr/mentions-legales" }],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  return (
    <PageShell>
      <article className="container-page max-w-3xl space-y-8 py-12">
        <header>
          <h1 className="font-serif text-4xl">Mentions légales</h1>
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">1. Éditeur du site</h2>
          <p>Dénomination sociale : {EDITEUR.denomination}</p>
          <p>
            Forme juridique et capital social : {EDITEUR.formeJuridique} au capital de{" "}
            {EDITEUR.capital}
          </p>
          <p>Siège social : {EDITEUR.siegeAdresse}</p>
          <p>SIREN : {EDITEUR.siren}</p>
          <p>RCS : {EDITEUR.rcs}</p>
          <p>Numéro de TVA intracommunautaire : {EDITEUR.tvaIntracommunautaire}</p>
          <p>Adresse électronique de contact : {EDITEUR.emailContact}</p>
          <p>Téléphone : {EDITEUR.telephone}</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">2. Directeur de la publication</h2>
          <p>{EDITEUR.directeurPublication}</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">3. Cabinet d'expertise comptable partenaire</h2>
          <p>Dénomination : {EDITEUR.cabinetPartenaire.nom}</p>
          <p>Adresse : {EDITEUR.cabinetPartenaire.adresse}</p>
          <p>
            Inscription au tableau de l'Ordre des experts-comptables :{" "}
            {EDITEUR.cabinetPartenaire.inscriptionOrdre}
          </p>
          <p>
            Assurance de responsabilité civile professionnelle :{" "}
            {EDITEUR.cabinetPartenaire.assuranceRcp}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">4. Hébergement</h2>
          <p>Hébergeur : {EDITEUR.hebergeur.nom}</p>
          <p>Adresse de l'hébergeur : {EDITEUR.hebergeur.adresse}</p>
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
          <p>
            L'ensemble des éléments composant ce site (textes, illustrations, logos, structure,
            code) est protégé au titre du droit d'auteur et reste la propriété de l'éditeur ou de
            ses partenaires. Toute reproduction ou représentation, totale ou partielle, sans
            autorisation préalable est interdite.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">7. Médiation et réclamations</h2>
          <p>
            En cas de litige, l'utilisateur peut recourir gratuitement au médiateur de la
            consommation suivant : {EDITEUR.mediateurConsommation}.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
