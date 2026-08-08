import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — CREA EXPERT" },
      {
        name: "description",
        content:
          "Traitement des données personnelles, finalités, durées de conservation et exercice de vos droits sur la plateforme CREA EXPERT.",
      },
      { property: "og:title", content: "Politique de confidentialité — CREA EXPERT" },
      {
        property: "og:description",
        content: "Comment CREA EXPERT traite vos données personnelles, hébergées en Union européenne.",
      },
    ],
  }),
  component: Confidentialite,
});

function Confidentialite() {
  return (
    <PageShell>
      <article className="container-page max-w-3xl space-y-8 py-12">
        <header>
          <h1 className="font-serif text-4xl">Politique de confidentialité</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Document provisoire — les éléments balisés [À COMPLÉTER] doivent être renseignés avant
            toute mise en ligne publique.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">1. Responsable de traitement</h2>
          <p>[À COMPLÉTER — dénomination, siège, contact]</p>
          <p>Délégué à la protection des données : [À COMPLÉTER]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">2. Données collectées</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Données d'identification : civilité, prénom, nom, date et lieu de naissance, nationalité.</li>
            <li>Coordonnées : adresse postale, adresse électronique, numéro de téléphone.</li>
            <li>Données relatives au projet : forme juridique, dénomination, siège, capital, objet.</li>
            <li>Situation matrimoniale et régime matrimonial, lorsqu'ils conditionnent la constitution.</li>
            <li>Pièces justificatives déposées dans votre espace.</li>
            <li>Données de simulation : réponses au simulateur et adresse électronique.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">3. Finalités et bases légales</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Constitution et suivi de votre dossier de création : exécution du contrat.</li>
            <li>Revue du dossier par le cabinet d'expertise comptable : exécution du contrat et obligation légale.</li>
            <li>Conservation des pièces : obligations légales et réglementaires.</li>
            <li>Envoi d'informations commerciales : consentement, révocable à tout moment.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">4. Destinataires</h2>
          <p>
            Vos données sont accessibles à vous-même, aux personnels habilités de l'éditeur et au
            cabinet d'expertise comptable partenaire en charge de votre dossier. [À COMPLÉTER — liste
            des sous-traitants]
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">5. Localisation et transferts</h2>
          <p>
            Les données et les pièces justificatives sont hébergées dans l'Union européenne. Aucun
            transfert de données hors Union européenne n'est réalisé.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">6. Durées de conservation</h2>
          <p>[À COMPLÉTER — durées par catégorie de données]</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">7. Vos droits</h2>
          <p>
            Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation,
            d'opposition et à la portabilité de vos données, ainsi que du droit de définir des
            directives relatives à leur sort après votre décès. Vous pouvez les exercer à l'adresse
            suivante : [À COMPLÉTER]. Vous pouvez également introduire une réclamation auprès de la
            CNIL.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">8. Cookies</h2>
          <p>[À COMPLÉTER — cookies strictement nécessaires, mesure d'audience, consentement]</p>
        </section>
      </article>
    </PageShell>
  );
}
