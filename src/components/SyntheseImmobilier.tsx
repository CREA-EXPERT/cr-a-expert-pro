import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Disclaimer } from "@/components/Disclaimer";

const COLONNES = ["Critère", "SAS / SASU immobilière", "SARL de famille", "SCI"];

const LIGNES: string[][] = [
  [
    "Location meublée (LMNP / LMP)",
    "Possible : la location meublée est une activité commerciale, compatible avec l'objet d'une SAS ou d'une SASU.",
    "Possible : c'est la forme sociétaire la plus utilisée pour la location meublée à plusieurs.",
    "Non, sauf à titre accessoire : la location meublée habituelle est commerciale et fait perdre le caractère civil, entraînant l'assujettissement à l'impôt sur les sociétés.",
  ],
  [
    "Régime fiscal par défaut",
    "Impôt sur les sociétés.",
    "Impôt sur les sociétés, avec option pour l'impôt sur le revenu sans limite de durée entre membres d'une même famille.",
    "Impôt sur le revenu, avec option irrévocable possible pour l'impôt sur les sociétés.",
  ],
  [
    "Traitement des revenus",
    "Bénéfices imposés dans la société ; imposition à nouveau lors de la distribution de dividendes.",
    "À l'impôt sur le revenu : résultat imposé directement chez chaque associé en bénéfices industriels et commerciaux.",
    "À l'impôt sur le revenu : revenus fonciers imposés chez chaque associé.",
  ],
  [
    "Amortissement du bien",
    "Oui, à l'impôt sur les sociétés.",
    "Oui, dans le cadre du régime réel des bénéfices industriels et commerciaux.",
    "Non à l'impôt sur le revenu ; oui en cas d'option pour l'impôt sur les sociétés.",
  ],
  [
    "Plus-value de cession",
    "Plus-value professionnelle, calculée sur la valeur nette comptable.",
    "Régime des plus-values des particuliers pour le loueur en meublé non professionnel, sous conditions.",
    "Plus-value des particuliers à l'impôt sur le revenu ; plus-value professionnelle à l'impôt sur les sociétés.",
  ],
  [
    "Responsabilité des associés",
    "Limitée aux apports.",
    "Limitée aux apports.",
    "Indéfinie, à proportion de la part de chacun dans le capital.",
  ],
  [
    "Composition",
    "Un associé (SASU) ou plusieurs (SAS), sans condition de lien familial.",
    "Associés unis par des liens familiaux (parents, enfants, frères, sœurs, conjoints, partenaires de PACS).",
    "Deux associés au minimum, sans condition de lien familial.",
  ],
  [
    "Transmission",
    "Cession d'actions, droit d'enregistrement de 0,1 %.",
    "Cession de parts, droit d'enregistrement de 3 % après abattement.",
    "Donation de parts facilitée, abattements renouvelables ; droit d'enregistrement de 5 %.",
  ],
];

/** Tableau de synthèse comparant les montages utilisés pour un projet immobilier. */
export function SyntheseImmobilier() {
  return (
    <section className="border-t border-border py-14">
      <div className="container-page">
        <h2 className="font-serif text-3xl">Projet immobilier : SAS(U), SARL de famille ou SCI</h2>
        <p className="mt-4 text-base leading-relaxed">
          La location meublée (statut LMNP ou LMP) est une activité commerciale. Ce point commande le
          choix de la structure : une société civile immobilière y est en principe inadaptée, alors
          qu'une SARL de famille ou une société par actions simplifiée peut l'exercer. Voici les
          différences de fond, sans recommandation.
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

        <Disclaimer className="mt-6" />
      </div>
    </section>
  );
}
