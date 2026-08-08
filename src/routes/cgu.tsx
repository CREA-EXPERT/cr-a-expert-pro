import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { EDITEUR } from "@/lib/editeur";

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
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">1. Objet</h2>
          <p>
            Les présentes conditions régissent l'accès et l'utilisation de la plateforme CREA EXPERT,
            éditée par {EDITEUR.denomination}, qui permet de préparer en ligne un dossier de création
            de société et de le soumettre au cabinet d'expertise comptable partenaire,{" "}
            {EDITEUR.cabinetPartenaire.nom}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">2. Périmètre du service</h2>
          <p>
            La plateforme fournit une information générale, un parcours de collecte d'informations et
            la production de projets de documents. Elle ne délivre aucun conseil juridique ni aucune
            recommandation personnalisée. La revue et la validation du dossier relèvent du cabinet
            d'expertise comptable partenaire, inscrit au tableau de l'Ordre des experts-comptables
            sous la référence : {EDITEUR.cabinetPartenaire.inscriptionOrdre}.
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
          <p>
            La facturation de la mission comptable intervient mensuellement auprès du cabinet
            partenaire, selon les modalités de paiement précisées lors de la souscription. En
            l'absence de reconduction, la mission prend fin de plein droit au terme des 3 mois, sans
            préavis à donner par l'utilisateur.
          </p>
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
          <p>
            L'accès à l'espace personnel est protégé par des identifiants strictement personnels et
            confidentiels. L'utilisateur est responsable de leur conservation et doit signaler sans
            délai à {EDITEUR.emailContact} toute utilisation non autorisée de son compte. L'éditeur
            peut suspendre un compte en cas d'usage frauduleux ou de non-respect des présentes
            conditions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">6. Responsabilité</h2>
          <p>
            L'éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité et
            l'exactitude des contenus du site, sans garantie de résultat. La responsabilité de
            l'éditeur ne saurait être engagée en cas d'interruption du service, d'erreur d'origine
            technique ou d'usage non conforme de la plateforme. La validation juridique, fiscale et
            comptable du dossier relève exclusivement du cabinet d'expertise comptable partenaire.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">7. Droit applicable et litiges</h2>
          <p>
            Les présentes conditions sont soumises au droit français. En cas de litige, et à défaut
            de résolution amiable, l'utilisateur peut recourir au médiateur de la consommation
            mentionné dans les mentions légales ({EDITEUR.mediateurConsommation}) avant toute action
            judiciaire.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
