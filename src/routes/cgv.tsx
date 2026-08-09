import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { EDITEUR } from "@/lib/editeur";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions générales de vente — CREA EXPERT" },
      {
        name: "description",
        content:
          "Prix, engagement de mission comptable, frais légaux refacturés à l'euro près, exécution, résiliation et réclamations.",
      },
      { property: "og:title", content: "Conditions générales de vente — CREA EXPERT" },
      {
        property: "og:description",
        content: "Conditions financières et contractuelles des prestations CREA EXPERT.",
      },
    ],
  }),
  component: Cgv,
});

function Cgv() {
  return (
    <PageShell>
      <article className="container-page max-w-3xl space-y-8 py-12 leading-relaxed">
        <header>
          <h1 className="font-serif text-3xl sm:text-4xl">Conditions générales de vente</h1>
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">1. Vendeur</h2>
          <p>
            {EDITEUR.denomination}, {EDITEUR.formeJuridique}, au capital de {EDITEUR.capital}, SIREN{" "}
            {EDITEUR.siren}, {EDITEUR.rcs}, siège social : {EDITEUR.siegeAdresse}. Contact :{" "}
            {EDITEUR.emailContact} — {EDITEUR.telephone}. TVA intracommunautaire :{" "}
            {EDITEUR.tvaIntracommunautaire}.
          </p>
          <p>
            La mission comptable est exécutée par le cabinet partenaire{" "}
            {EDITEUR.cabinetPartenaire.nom}, inscrit à l'Ordre des experts-comptables (
            {EDITEUR.cabinetPartenaire.inscriptionOrdre}).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">2. Prestations</h2>
          <p>
            La plateforme permet de constituer un dossier de création de société, de générer les
            documents constitutifs et de réunir les pièces justificatives. Les honoraires de création
            sont de 0 € ; en contrepartie, le client souscrit une mission comptable de 3 mois à 199 €
            HT par mois auprès du cabinet partenaire. Les frais légaux (annonce légale, greffe,
            bénéficiaires effectifs) restent à la charge du client et sont refacturés à l'euro près,
            sans marge.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">3. Prix et paiement</h2>
          <p>
            Les prix sont indiqués en euros, hors taxes et toutes taxes comprises. Les montants légaux
            sont ceux en vigueur au jour de la commande et peuvent évoluer par décision des pouvoirs
            publics. Le paiement s'effectue par carte bancaire ; la mission comptable est prélevée
            mensuellement à échéance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">4. Exécution et droit de rétractation</h2>
          <p>
            La prestation démarre dès la validation du dossier. Lorsque le client demande une
            exécution immédiate, il renonce expressément à son droit de rétractation de quatorze jours
            pour la partie déjà exécutée, conformément à l'article L. 221-25 du code de la
            consommation. Les frais légaux déjà réglés aux administrations ne peuvent être remboursés.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">5. Obligations du client</h2>
          <p>
            Le client garantit l'exactitude et l'authenticité des informations et pièces transmises.
            La plateforme délivre une information générale et ne constitue pas un conseil
            personnalisé ; les documents produits portent la mention « PROJET » tant qu'ils n'ont pas
            été validés par le cabinet.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">6. Durée et résiliation</h2>
          <p>
            La mission comptable est conclue pour une durée minimale de trois mois, puis se poursuit
            par périodes mensuelles, résiliable par écrit avec un préavis d'un mois. La résiliation
            anticipée ne dispense pas du règlement des mensualités correspondant à l'engagement
            initial.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">7. Réclamations et médiation</h2>
          <p>
            Toute réclamation peut être adressée à {EDITEUR.emailContact}. À défaut de solution
            amiable, le client consommateur peut saisir gratuitement le médiateur de la consommation :{" "}
            {EDITEUR.mediateurConsommation}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">8. Données personnelles</h2>
          <p>
            Le traitement des données personnelles est décrit dans la{" "}
            <Link to="/confidentialite" className="underline underline-offset-2">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">9. Droit applicable</h2>
          <p>
            Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, les
            tribunaux français sont compétents.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
