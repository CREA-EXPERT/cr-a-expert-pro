import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import { Disclaimer } from "@/components/Disclaimer";

export const Route = createFileRoute("/rendez-vous")({
  head: () => ({
    meta: [
      { title: "Prendre rendez-vous avec un expert-comptable — CREA EXPERT" },
      {
        name: "description",
        content:
          "Réservez et réglez en ligne un entretien avec un expert-comptable du cabinet partenaire : choix du créneau, paiement sécurisé, échange à distance.",
      },
      {
        property: "og:title",
        content: "Prendre rendez-vous avec un expert-comptable — CREA EXPERT",
      },
      {
        property: "og:description",
        content:
          "Choisissez votre créneau et réglez votre entretien avec un expert-comptable du cabinet partenaire.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://crea-expert.fr/rendez-vous" }],
  }),
  component: RendezVous,
});

function RendezVous() {
  return (
    <PageShell>
      <div className="container-page max-w-4xl py-12">
        <h1 className="font-serif text-4xl">Faire appel à un expert-comptable</h1>
        <p className="mt-4 text-base leading-relaxed text-justify">
          Choisissez un créneau et réglez votre entretien en ligne. L'échange est mené par un
          expert-comptable du cabinet partenaire : il examine votre situation, répond à vos
          questions et vous indique les points à instruire avant la création. Les informations
          publiées sur ce site restent des informations générales ; seul cet entretien donne lieu à
          une analyse de votre dossier.
        </p>

        <div className="mt-8">
          <ConsultationExpertCard />
        </div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </div>
    </PageShell>
  );
}
