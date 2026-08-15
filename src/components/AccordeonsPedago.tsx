import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type ClePedago = "annonce" | "benef" | "greffe" | "mission";

export const PEDAGO: Record<ClePedago, { q: string; r: string }> = {
  annonce: {
    q: "Qu'est-ce qu'une annonce légale ?",
    r: "La loi impose d'annoncer publiquement la naissance de votre société dans un support habilité (journal ou service de presse en ligne). Cette publicité informe les tiers — clients, fournisseurs, banques — de l'existence de votre société, de sa forme, de son capital et de son dirigeant. Sans l'attestation de parution, le greffe refuse l'immatriculation. Le tarif est forfaitaire, fixé par arrêté ministériel, identique quel que soit le journal choisi.",
  },
  benef: {
    q: "Qu'est-ce qu'un bénéficiaire effectif ?",
    r: "C'est la ou les personnes physiques qui, en dernier ressort, possèdent ou contrôlent la société : concrètement, toute personne détenant plus de 25 % du capital ou des droits de vote, ou exerçant un contrôle sur la société. La déclaration au registre des bénéficiaires effectifs est obligatoire pour toutes les sociétés : elle sert à la lutte contre le blanchiment d'argent et le financement du terrorisme. Pour une création simple, elle se résume le plus souvent à vous déclarer vous-même.",
  },
  greffe: {
    q: "À quoi sert le greffe ?",
    r: "Le greffe du tribunal de commerce tient le registre officiel des entreprises : il contrôle votre dossier, vous immatricule, délivre votre extrait Kbis (la carte d'identité de votre société) et publie les informations légales. Les frais de greffe sont des tarifs réglementés qui rémunèrent ce service public et sont partagés avec l'INPI et le BODACC. Ils ne transitent pas par le cabinet.",
  },
  mission: {
    q: "Que comprend la mission comptable ?",
    r: "Il s'agit d'une mission de présentation des comptes, prévue par le référentiel de l'Ordre des experts-comptables (profession réglementée par l'ordonnance de 1945) : la tenue de votre comptabilité (saisie et classement), l'établissement de vos comptes annuels, vos déclarations fiscales courantes, et du conseil au fil de l'eau pour piloter votre activité. Un professionnel inscrit à l'Ordre, assuré et soumis à un code de déontologie, en est responsable.",
  },
};

export function AccordeonsPedago({
  cles,
  value,
  onValueChange,
}: {
  cles: ClePedago[];
  value?: string | undefined;
  onValueChange?: ((v: string) => void) | undefined;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      className="mt-3"
      {...(value !== undefined ? { value } : {})}
      {...(onValueChange ? { onValueChange } : {})}
    >
      {cles.map((c) => (
        <AccordionItem key={c} value={c}>
          <AccordionTrigger className="text-left text-sm">{PEDAGO[c].q}</AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-foreground text-justify">
            {PEDAGO[c].r}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
