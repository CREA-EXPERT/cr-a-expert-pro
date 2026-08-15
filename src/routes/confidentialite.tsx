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
    links: [{ rel: "canonical", href: "https://crea-expert.fr/confidentialite" }],
  }),
  component: Confidentialite,
});

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-2xl">{titre}</h2>
      {children}
    </section>
  );
}

function Confidentialite() {
  return (
    <PageShell>
      <article className="container-page max-w-3xl space-y-8 py-12 leading-relaxed">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl">POLITIQUE DE CONFIDENTIALITÉ — CREA EXPERT</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : [DATE À COMPLÉTER]</p>
        </header>

        <Section titre="1. Responsable de vos données">
          <p>
            CREA EXPERT [forme, capital, SIREN À COMPLÉTER], dont le siège est à Paris [adresse À
            COMPLÉTER], édite et exploite la plateforme crea-expert.fr et en est responsable de
            traitement pour l'exploitation du service (compte, sécurité, facturation, support).
          </p>
          <p>
            La prestation de création de société est réalisée sous la responsabilité du cabinet
            d'expertise comptable partenaire ODEON (SAS), 138 Avenue Victor Hugo, 75016 Paris, dont l'inscription au
            tableau de l'Ordre des experts-comptables de Paris est en cours : pour cette prestation, ODEON est responsable de traitement et CREA
            EXPERT agit comme sous-traitant, sur ses instructions et dans le respect du secret
            professionnel.
          </p>
          <p>Contact : contact@crea-expert.fr</p>
        </Section>

        <Section titre="2. Données traitées">
          <p>
            Identification et compte (nom, prénom, email, identifiants) ; données du projet (activité,
            forme, associés, bénéficiaires effectifs) ; pièces justificatives déposées (dont pièce
            d'identité) ; documents générés et preuves de signature ; données de facturation ; données
            techniques nécessaires au fonctionnement et à la sécurité.
          </p>
        </Section>

        <Section titre="3. Finalités et bases légales">
          <p>
            Gestion du compte, fourniture du service, dépôt et génération de documents, signature :
            exécution du contrat (art. 6.1.b RGPD). Facturation et conservation comptable : obligation
            légale (art. 6.1.c). Sécurité, prévention des abus, amélioration du service, réponses aux
            demandes : intérêt légitime (art. 6.1.f).
          </p>
          <p>
            Conservation des pièces d'identité et des données de vigilance au titre de la lutte contre
            le blanchiment (LBC-FT) : obligation légale (art. 6.1.c RGPD ; art. L.561-2 et L.561-12 du
            Code monétaire et financier).
          </p>
        </Section>


        <Section titre="4. Destinataires et sous-traitants">
          <p>
            Personnel habilité de CREA EXPERT et du cabinet ODEON, et sous-traitants techniques
            agissant sur instructions : Supabase (hébergement, UE – Francfort), OVH (domaine et
            messagerie, France), Resend (emails), Stripe (paiement), prestataire de signature
            électronique. Chacun est lié par un contrat conforme à l'article 28 RGPD. Vos données ne
            sont jamais vendues.
          </p>
        </Section>

        <Section titre="5. Transferts hors Union européenne">
          <p>
            L'hébergement principal est situé dans l'UE (Francfort). Certains prestataires (Resend,
            Stripe) peuvent impliquer un transfert vers les États-Unis, encadré par la décision
            d'adéquation « EU-US Data Privacy Framework » et, en complément, par des clauses
            contractuelles types.
          </p>
        </Section>

        <Section titre="6. Durées de conservation">
          <p>
            Compte : durée de la relation, puis suppression ou anonymisation. Pièces d'identité et
            données de vigilance (KYC) : lorsque vous engagez le cabinet ODEON, elles sont conservées
            par celui-ci 5 ans à compter de la fin de la relation d'affaires, au titre de ses
            obligations de lutte contre le blanchiment (art. L.561-12 CMF), puis supprimées. Si vous
            n'engagez pas le cabinet, elles sont supprimées dès la finalité atteinte ou, en cas
            d'abandon, après 6 mois. Facturation : 10 ans (obligation comptable). Documents
            constitutifs et preuves de signature : durée justifiée par leur valeur probante. Demandes
            de contact non abouties : 3 ans.
          </p>
        </Section>


        <Section titre="7. Sécurité">
          <p>
            Chiffrement des échanges (HTTPS) et des données au repos, stockage privé à accès restreint,
            liens de téléchargement temporaires, contrôle des accès et journalisation.
          </p>
        </Section>

        <Section titre="8. Vos droits">
          <p>
            Vous disposez des droits d'accès, de rectification, d'effacement, de limitation,
            d'opposition et de portabilité (art. 15 à 22 RGPD), exerçables depuis votre espace « Mes
            données personnelles » ou à contact@crea-expert.fr. Vous pouvez introduire une réclamation
            auprès de la CNIL (www.cnil.fr).
          </p>
          <p>
            Le droit à l'effacement s'exerce sous réserve des durées imposées par la loi : les données
            conservées au titre de la LBC-FT (5 ans) ou des obligations comptables (10 ans) ne peuvent
            être supprimées avant leur terme (art. 17.3 RGPD).
          </p>

        </Section>

        <Section titre="9. Cookies">
          <p>
            La plateforme n'utilise que des cookies strictement nécessaires (session, authentification,
            sécurité), exemptés de consentement. Aucun cookie de mesure d'audience, de publicité ou de
            suivi tiers n'est déposé.
          </p>
        </Section>
      </article>
    </PageShell>
  );
}
