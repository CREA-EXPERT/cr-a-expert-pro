import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Disclaimer } from "@/components/Disclaimer";

const COLONNES = ["Critère", "SCI", "LMNP *", "SAS / SASU immobilière", "SARL de famille"];

const LIGNES: string[][] = [
  [
    "Nature",
    "Société civile immobilière : une société, avec des statuts, des associés et un capital.",
    "Ce n'est pas une forme juridique mais un régime fiscal : la location meublée exercée en direct, par une personne physique (le plus souvent en entreprise individuelle).",
    "Société commerciale par actions, à un associé (SASU) ou plusieurs (SAS).",
    "Société à responsabilité limitée dont tous les associés sont membres d'une même famille.",
  ],
  [
    "Location meublée",
    "Oui, mais impôt sur les sociétés : la location meublée est une activité commerciale ; exercée à titre habituel par une société civile, elle entraîne l'assujettissement de la SCI à l'impôt sur les sociétés (voir l'encadré ci-dessous).",
    "C'est précisément son objet : la location meublée exercée en direct.",
    "Possible sans difficulté : l'activité commerciale correspond à l'objet d'une SAS ou d'une SASU.",
    "Possible : c'est la forme sociétaire la plus utilisée pour louer en meublé à plusieurs, entre membres d'une même famille.",
  ],
  [
    "Location nue",
    "C'est son terrain naturel : activité civile, revenus fonciers.",
    "Non : le régime de la location meublée suppose, par définition, un logement meublé. La location nue relève des revenus fonciers.",
    "Possible, mais la société reste soumise à l'impôt sur les sociétés.",
    "Possible ; la SARL de famille est toutefois pensée pour l'activité commerciale (meublé).",
  ],
  [
    "Traitement des revenus",
    "IR par défaut : le résultat est imposé chez chaque associé en revenus fonciers, à proportion de ses parts. Sur option, IS : l'option est en principe irrévocable (renonciation possible jusqu'au 5e exercice suivant, ensuite définitive).",
    "IR uniquement : bénéfices industriels et commerciaux (BIC), imposés chez la personne, au barème progressif, plus prélèvements sociaux ou cotisations sociales selon le statut.",
    "IS par défaut : le bénéfice est imposé dans la société, puis à nouveau chez l'associé lors de la distribution de dividendes. Option IR possible pour 5 exercices au plus (sociétés de moins de 5 ans), non renouvelable.",
    "IS par défaut, mais option IR sans limite de durée tant que le caractère familial est maintenu : chaque associé est imposé en BIC sur sa quote-part.",
  ],
  [
    "Amortissement du bien",
    "Non à l'IR (revenus fonciers) ; oui en cas d'option pour l'IS.",
    "Oui, au régime réel : l'amortissement réduit fortement le résultat imposable, souvent à zéro les premières années.",
    "Oui, l'IS s'appliquant de plein droit.",
    "Oui, au régime réel des BIC.",
  ],
  [
    "Plus-value de cession",
    "Plus-value des particuliers à l'IR (abattements pour durée de détention) ; plus-value professionnelle à l'IS, calculée sur la valeur nette comptable.",
    "Plus-value des particuliers pour le loueur non professionnel, sous conditions ; les amortissements déduits sont réintégrés dans le calcul depuis 2025.",
    "Plus-value professionnelle, calculée sur la valeur nette comptable : la base est mécaniquement plus large.",
    "Plus-value des particuliers en cas d'option IR pour le loueur non professionnel, sous conditions.",
  ],
  [
    "Responsabilité",
    "Indéfinie, à proportion de la part de chacun dans le capital.",
    "Sur le patrimoine de l'entrepreneur, hors patrimoine personnel protégé depuis le statut unique de 2022.",
    "Limitée aux apports.",
    "Limitée aux apports.",
  ],
  [
    "Composition",
    "Deux associés au minimum, sans condition de lien familial.",
    "Une seule personne physique ; à plusieurs, c'est une indivision ou une société.",
    "Un associé (SASU) ou plusieurs (SAS), sans condition de lien familial.",
    "Uniquement des parents en ligne directe, frères et sœurs, conjoints ou partenaires de PACS.",
  ],
  [
    "Comptabilité",
    "Allégée à l'IR ; comptabilité commerciale complète à l'IS.",
    "Comptabilité commerciale au régime réel ; simple déclaratif au micro-BIC.",
    "Comptabilité commerciale complète et comptes annuels déposés.",
    "Comptabilité commerciale complète.",
  ],
];

/** Tableau de synthèse comparant les montages utilisés pour un projet immobilier. */
export function SyntheseImmobilier() {
  return (
    <section className="border-t border-border py-14">
      <div className="container-page">
        <h2 className="font-serif text-3xl">Projet immobilier : SCI, LMNP, SAS(U) ou SARL de famille</h2>
        <p className="mt-4 text-base leading-relaxed">
          Attention à une confusion fréquente : <strong>LMNP et LMP ne sont pas des formes
          juridiques</strong>. Ce sont des régimes fiscaux de la location meublée, exercée en direct
          par une personne physique. SCI, SAS(U) et SARL de famille sont, elles, des sociétés. Les
          comparer côte à côte n'a de sens que pour éclairer un projet ; ce tableau expose des faits
          juridiques et fiscaux, sans recommandation.
        </p>

        <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                {COLONNES.map((c) => (
                  <TableHead key={c} className="align-top text-foreground">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIGNES.map((l) => (
                <TableRow key={l[0]}>
                  {l.map((cell, i) => (
                    <TableCell
                      key={i}
                      className={`align-top text-sm leading-relaxed ${i === 0 ? "font-medium" : "text-muted-foreground"}`}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h3 className="text-base font-semibold">* LMNP et LMP : les grandes différences</h3>
          <p className="mt-2 text-base leading-relaxed text-justify">
            Le loueur en meublé est dit professionnel (LMP) lorsque deux conditions sont réunies
            simultanément : les recettes annuelles de location meublée du foyer fiscal dépassent
            23 000 €, et elles excèdent les autres revenus d'activité du foyer (salaires, autres
            BIC, etc.). À défaut, il est non professionnel (LMNP) — le basculement est automatique,
            il ne se choisit pas. Les conséquences principales : le LMP impute ses déficits sur le
            revenu global (le LMNP seulement sur ses futurs revenus de location meublée, pendant
            dix ans), relève du régime des plus-values professionnelles avec des exonérations
            possibles après cinq ans d'activité (le LMNP relève des plus-values des particuliers,
            avec réintégration des amortissements depuis 2025), et est affilié aux cotisations
            sociales des travailleurs indépendants là où le LMNP supporte les prélèvements sociaux
            de 17,2 %. Dans les deux cas, l'amortissement du bien reste possible au régime réel.
            Cette présentation est volontairement synthétique et non exhaustive.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-accent/40 bg-background p-5">
          <h3 className="text-base font-semibold">IS ou IR : comment ça se calcule, qui paie quoi</h3>
          <p className="mt-2 text-base leading-relaxed text-justify">
            <strong>À l'impôt sur le revenu (IR)</strong>, la société est « transparente » : elle ne
            paie pas d'impôt elle-même. Le résultat est réparti entre les associés au prorata de
            leurs parts, et chacun l'ajoute à sa déclaration personnelle — imposé au barème
            progressif (0 à 45 %) auquel s'ajoutent les prélèvements sociaux de 17,2 % sur les
            revenus fonciers. Vous payez l'impôt même si aucune somme n'est sortie de la société.
          </p>
          <p className="mt-3 text-base leading-relaxed text-justify">
            <strong>À l'impôt sur les sociétés (IS)</strong>, la société paie son propre impôt :
            15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà. En contrepartie, elle déduit
            l'amortissement du bien et les intérêts d'emprunt, ce qui réduit fortement le bénéfice
            taxable les premières années. L'associé n'est imposé que s'il se distribue des
            dividendes : 30 % de prélèvement forfaitaire unique (12,8 % d'impôt + 17,2 % de
            prélèvements sociaux), ou barème progressif sur option.
          </p>
          <p className="mt-3 text-base leading-relaxed text-justify">
            <strong>Exemple chiffré, à titre purement illustratif.</strong> Un bien loué 12 000 € par
            an, 3 000 € de charges et intérêts, 7 000 € d'amortissement possible. À l'IR : base
            imposable 9 000 € ; pour un associé à 30 % de tranche, 2 700 € d'impôt + 1 548 € de
            prélèvements sociaux, soit environ 4 250 €. À l'IS : base 2 000 € après amortissement,
            300 € d'impôt société ; si le solde reste dans la société, rien de plus à payer, mais la
            revente sera taxée sur la valeur nette comptable, amortissements compris.
          </p>
          <p className="mt-3 text-base leading-relaxed">
            En résumé : l'IR est souvent plus simple et plus favorable à la revente, l'IS plus
            favorable pendant la période d'exploitation et de remboursement du prêt. L'arbitrage
            dépend de votre horizon de détention, de votre tranche d'imposition et de votre besoin
            de distribuer les loyers — c'est exactement ce que l'expert-comptable examine avec vous.
          </p>
        </div>

        <Disclaimer className="mt-6" />
      </div>
    </section>
  );
}
