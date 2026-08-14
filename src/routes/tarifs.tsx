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
    links: [{ rel: "canonical", href: "https://crea-expert.fr/tarifs" }],
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
          comptable de 3 mois à {euro(mission)} HT/mois, soit {euro(mission * 1.2)} TTC/mois (TVA 20 %
          en sus), auprès du cabinet d'expertise comptable partenaire. Les frais légaux ci-dessous
          sont incompressibles, à tarif réglementé, taxes comprises, et vous sont refacturés à l'euro
          près.
        </p>

        <div className="mt-8">
          <TableauFraisLegaux />
        </div>

        <div className="mt-8 space-y-6">
          <h2 className="font-serif text-2xl">À quoi correspondent ces frais</h2>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">Le journal d'annonces légales</h3>
            <p className="mt-2 text-base leading-relaxed">
              Un journal d'annonces légales (JAL) est un journal ou un service de presse en ligne
              habilité par arrêté préfectoral pour publier les actes que la loi impose de rendre
              publics : création, changement de siège, de dirigeant, de capital, dissolution. La
              publication d'un avis de constitution est obligatoire pour toute société : sans
              l'attestation de parution, le greffe refuse l'immatriculation.
            </p>
            <p className="mt-3 text-base leading-relaxed">
              Son intérêt pour vous n'est pas seulement formel. L'annonce rend votre société
              opposable aux tiers : elle informe officiellement vos futurs clients, fournisseurs et
              banques de son existence, de sa forme, de son capital, de son siège et de l'identité
              de son dirigeant. C'est la date de publicité qui fait foi en cas de litige sur ce que
              les tiers étaient censés savoir. Le tarif est forfaitaire, fixé chaque année par
              arrêté ministériel selon la forme juridique : il est identique quel que soit le
              journal retenu, et nous vous le refacturons à l'euro près.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">Les bénéficiaires effectifs</h3>
            <p className="mt-2 text-base leading-relaxed">
              Le bénéficiaire effectif est la personne physique qui, en dernier ressort, possède ou
              contrôle la société : en pratique, toute personne détenant plus de 25 % du capital ou
              des droits de vote, ou exerçant un pouvoir de contrôle par tout autre moyen. Toute
              société doit en déposer la liste au registre des bénéficiaires effectifs, tenu par le
              greffe, lors de son immatriculation puis à chaque changement.
            </p>
            <p className="mt-3 text-base leading-relaxed">
              Cette obligation est née de la lutte contre le blanchiment d'argent et le financement
              du terrorisme : elle empêche qu'une société serve d'écran à des personnes non
              identifiées. Son intérêt pour vous est double : un défaut de déclaration est
              sanctionné pénalement (jusqu'à six mois d'emprisonnement et 7 500 € d'amende), et
              votre banque exigera ce document pour ouvrir votre compte professionnel. Pour une
              création simple, la déclaration se résume le plus souvent à vous désigner vous-même.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-base font-semibold">Le greffe du tribunal de commerce</h3>
            <p className="mt-2 text-base leading-relaxed">
              Le greffe tient le registre du commerce et des sociétés, le registre officiel des
              entreprises françaises. Il contrôle la régularité de votre dossier, procède à
              l'immatriculation, attribue votre numéro SIREN et délivre votre extrait Kbis — la
              carte d'identité de votre société, que vous demanderont la banque, les assureurs et
              la plupart de vos partenaires.
            </p>
            <p className="mt-3 text-base leading-relaxed">
              C'est l'immatriculation qui donne à votre société la personnalité morale : avant elle,
              la société n'existe pas juridiquement et ne peut ni contracter, ni détenir un compte,
              ni limiter votre responsabilité. Les frais de greffe sont des tarifs réglementés,
              fixés par décret et identiques dans toute la France ; le greffe en reverse une partie
              à l'INPI (registre national des entreprises) et au BODACC (publication officielle).
              Le cabinet n'y prend aucune marge.
            </p>
          </div>
        </div>


        <div className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-serif text-2xl">Détail de la grille</h2>
          <ul className="space-y-2 text-base">
            {(tarifs ?? []).map((t) => {
              const estReglemente = t.cle.startsWith("greffe_") || t.cle === "benef_effectifs";
              return (
                <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
                  <span>{t.libelle}</span>
                  <span className="text-right">
                    <span className="font-medium tabular-nums">
                      {t.montant_ht !== null && `${euro(Number(t.montant_ht))} HT`}
                      {t.montant_ht !== null && t.montant_ttc !== null && " — "}
                      {t.montant_ttc !== null && `${euro(Number(t.montant_ttc))} TTC`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t.montant_ht !== null && "TVA 20 % en sus"}
                      {estReglemente && "tarif réglementé, taxes comprises"}
                    </span>
                  </span>
                </li>
              );
            })}
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
