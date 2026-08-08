import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { TableauFraisLegaux } from "@/components/TableauFraisLegaux";
import { euro } from "@/lib/domain";
import { missionMensuelleHt, useTarifs } from "@/lib/tarifs";

export const Route = createFileRoute("/tarifs")({
  head: () => ({
    meta: [
      { title: "Frais légaux et mission comptable — CREA EXPERT" },
      {
        name: "description",
        content:
          "Le détail des frais légaux par forme juridique (annonce légale, greffe, bénéficiaires effectifs) et les conditions de la mission comptable de 3 mois.",
      },
      { property: "og:title", content: "Frais légaux et mission comptable — CREA EXPERT" },
      {
        property: "og:description",
        content:
          "Annonce légale, greffe, bénéficiaires effectifs : le coût réel d'une création de société, sans honoraires.",
      },
    ],
  }),
  component: Tarifs,
});

function Tarifs() {
  const { data: tarifs } = useTarifs();
  const mission = missionMensuelleHt(tarifs);

  return (
    <PageShell>
      <div className="container-page max-w-4xl py-12">
        <h1 className="font-serif text-4xl">Ce que vous payez, exactement</h1>
        <p className="mt-4 text-lg leading-relaxed">
          Les honoraires de création sont de 0 €. En contrepartie, vous vous engagez sur une mission
          comptable de 3 mois à {euro(mission)} HT/mois auprès du cabinet d'expertise comptable
          partenaire. Les frais légaux ci-dessous sont incompressibles et vous sont refacturés à
          l'euro près.
        </p>

        <div className="mt-8">
          <TableauFraisLegaux />
        </div>

        <div className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-serif text-2xl">Détail de la grille</h2>
          <ul className="space-y-2 text-base">
            {(tarifs ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
                <span>{t.libelle}</span>
                <span className="font-medium tabular-nums">
                  {t.montant_ht !== null && `${euro(Number(t.montant_ht))} HT`}
                  {t.montant_ht !== null && t.montant_ttc !== null && " — "}
                  {t.montant_ttc !== null && `${euro(Number(t.montant_ttc))} TTC`}
                </span>
              </li>
            ))}
          </ul>
          <p className="legal-note">
            Montants applicables en France métropolitaine. Les tarifs réglementés et forfaitaires
            sont révisés, généralement au 1er janvier ; cette grille est mise à jour en conséquence.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
