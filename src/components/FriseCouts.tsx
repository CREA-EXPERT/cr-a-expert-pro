import { euro } from "@/lib/domain";
import {
  bornesAnnonceHt,
  greffeEi,
  greffeEtBenefSociete,
  missionMensuelleHt,
  useTarifs,
} from "@/lib/tarifs";
import { AccordeonsPedago, type ClePedago } from "@/components/AccordeonsPedago";

export function FriseCouts() {
  const { data: tarifs } = useTarifs();
  const bornes = bornesAnnonceHt(tarifs);
  const societe = greffeEtBenefSociete(tarifs);
  const ei = greffeEi(tarifs);
  const mission = missionMensuelleHt(tarifs);

  const etages: { titre: string; texte: string; cles: ClePedago[] }[] = [
    {
      titre: `Honoraires du cabinet pour la création : ${euro(0)}*`,
      texte:
        "Le cabinet ne perçoit aucun honoraire au titre de la création. *En contrepartie, vous vous engagez pour une durée minimum de 3 mois auprès du cabinet d'expertise comptable partenaire (voir étage 4).",
      cles: [],
    },
    {
      titre: `Annonce légale : de ${euro(bornes.min)} à ${euro(bornes.max)} HT selon la forme (${euro(0)} pour l'entreprise individuelle)`,
      texte:
        "Publication obligatoire pour toute société. Tarif forfaitaire fixé chaque année par arrêté ministériel, identique partout : il est versé au support d'annonces légales habilité, jamais au cabinet. Refacturé à l'euro près, sans aucune marge.",
      cles: ["annonce"],
    },
    {
      titre: `Greffe et bénéficiaires effectifs : ${euro(societe)} (montant réglementé) pour une société — ${euro(ei)} pour une entreprise individuelle`,
      texte:
        "Tarifs réglementés perçus par le greffe du tribunal de commerce (qui en reverse une partie à l'INPI et au BODACC). Ce n'est pas une recette du cabinet : le cabinet ne s'enrichit pas sur votre création.",
      cles: ["greffe", "benef"],
    },
    {
      titre: `Mission comptable : ${euro(mission)} HT/mois — engagement 3 mois, puis résiliation libre et sans frais`,
      texte:
        "Lettre de mission à durée indéterminée, avec un engagement initial de 3 mois seulement. Ensuite, vous restez librement, ou vous partez sans frais ni justification. Pour une SCI, ces 3 mois couvrent l'exercice annuel complet, le travail comptable étant concentré sur la déclaration annuelle : vous ne payez donc que 3 mois pour l'année. Pour toutes les autres formes (SASU, SAS, EURL, SARL, entreprise individuelle), la mission est continue et facturée 12 mois par an au-delà de l'engagement initial, si vous choisissez de la poursuivre.",
      cles: ["mission"],
    },

  ];

  return (
    <section aria-labelledby="frise-titre" className="container-page py-14">
      <h2 id="frise-titre" className="font-serif text-3xl">
        Ce que vous payez — en toute transparence
      </h2>

      <ol className="mt-8 border-l-2 border-accent/40 pl-6">
        {etages.map((e, i) => (
          <li key={e.titre} className="relative pb-8 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[1.9rem] top-1 flex size-6 items-center justify-center rounded-full border-2 border-accent bg-background text-xs font-semibold text-accent"
            >
              {i + 1}
            </span>
            <h3 className="text-base font-semibold leading-snug">{e.titre}</h3>
            <p className="mt-2 text-base leading-relaxed text-foreground">{e.texte}</p>
            {e.cles.length > 0 && <AccordeonsPedago cles={e.cles} />}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-base leading-relaxed">
        Tous les prix sont affichés hors taxes ; la TVA de 20 % s'applique en sus (les montants du
        greffe sont des tarifs réglementés, TVA incluse). Si votre création n'aboutit pas, les
        sommes versées vous sont intégralement remboursées, à l'exception des frais déjà réglés pour
        votre compte à des tiers (annonce déjà publiée, par exemple) — nous vous prévenons toujours
        AVANT d'engager le moindre frais.
      </p>
    </section>
  );
}
