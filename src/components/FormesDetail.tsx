import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Fiche = {
  cle: string;
  titre: string;
  resume: string;
  caracteristiques: string[];
  avantages: string[];
  inconvenients: string[];
  obligations: string[];
};

const FICHES: Fiche[] = [
  {
    cle: "SASU",
    titre: "SASU — société par actions simplifiée unipersonnelle",
    resume: "Un associé unique, une grande liberté statutaire, un président assimilé salarié.",
    caracteristiques: [
      "Un seul associé, personne physique ou morale.",
      "Capital social librement fixé, à partir de 1 €, libéré pour moitié au moins à la constitution.",
      "Direction assurée par un président, obligatoirement désigné dans les statuts.",
      "Impôt sur les sociétés par défaut ; option pour l'impôt sur le revenu possible pendant 5 exercices sous conditions.",
    ],
    avantages: [
      "Responsabilité limitée au montant des apports, sauf faute de gestion ou caution personnelle.",
      "Président affilié au régime général de la sécurité sociale (protection sociale alignée sur celle des salariés).",
      "Aucune cotisation sociale en l'absence de rémunération.",
      "Statuts très souples, entrée d'investisseurs facilitée par la cession d'actions.",
    ],
    inconvenients: [
      "Cotisations sociales élevées sur la rémunération du président (environ 75 à 80 % du net).",
      "Pas de droit à l'assurance chômage au titre du mandat social.",
      "Rédaction statutaire plus exigeante du fait de la liberté laissée aux associés.",
    ],
    obligations: [
      "Tenue d'une comptabilité commerciale et établissement des comptes annuels.",
      "Approbation des comptes par l'associé unique et dépôt au greffe.",
      "Déclaration des bénéficiaires effectifs et registre des mouvements de titres.",
    ],
  },
  {
    cle: "SAS",
    titre: "SAS — société par actions simplifiée",
    resume: "Plusieurs associés, organisation sur mesure, régime social du président aligné sur les salariés.",
    caracteristiques: [
      "Deux associés ou plus, personnes physiques ou morales.",
      "Capital librement fixé, libéré pour moitié au moins à la constitution.",
      "Organes de direction définis librement par les statuts (président, directeurs généraux, comités).",
      "Impôt sur les sociétés par défaut.",
    ],
    avantages: [
      "Responsabilité limitée aux apports.",
      "Grande liberté d'organisation : droits de vote, agrément, préférence, actions de préférence.",
      "Forme privilégiée par les investisseurs et pour l'actionnariat salarié.",
    ],
    inconvenients: [
      "Coût social élevé de la rémunération des dirigeants.",
      "Liberté statutaire = responsabilité de rédaction accrue en cas de mésentente.",
      "Commissaire aux comptes obligatoire au-delà de certains seuils ou en cas de contrôle.",
    ],
    obligations: [
      "Comptabilité commerciale, comptes annuels, assemblée d'approbation.",
      "Dépôt des comptes au greffe et déclaration des bénéficiaires effectifs.",
      "Registre des décisions collectives et des mouvements de titres.",
    ],
  },
  {
    cle: "EURL",
    titre: "EURL — SARL à associé unique",
    resume: "Un cadre légal protecteur, un gérant travailleur non salarié, des charges sociales plus faibles.",
    caracteristiques: [
      "Un seul associé ; la société devient une SARL dès l'entrée d'un second associé.",
      "Capital libre, libéré pour un cinquième au moins à la constitution, le solde dans les 5 ans.",
      "Direction assurée par un gérant, associé ou non.",
      "Impôt sur le revenu par défaut lorsque l'associé unique est une personne physique ; option pour l'IS possible.",
    ],
    avantages: [
      "Responsabilité limitée aux apports.",
      "Cotisations sociales du gérant associé unique nettement inférieures à celles d'un président de SASU.",
      "Fonctionnement largement encadré par la loi, donc plus prévisible.",
    ],
    inconvenients: [
      "Protection sociale des travailleurs non salariés moins favorable (indemnités journalières, retraite).",
      "Cotisations minimales dues même en l'absence de rémunération dans certains cas.",
      "Cession de parts sociales plus lourde que la cession d'actions.",
    ],
    obligations: [
      "Comptabilité commerciale et comptes annuels.",
      "Approbation et dépôt des comptes, déclaration des bénéficiaires effectifs.",
      "Affiliation du gérant à la sécurité sociale des indépendants.",
    ],
  },
  {
    cle: "SARL",
    titre: "SARL — société à responsabilité limitée",
    resume: "Cadre légal stable pour un projet à plusieurs, souvent familial, avec un gérant majoritaire indépendant.",
    caracteristiques: [
      "De 2 à 100 associés.",
      "Capital libre, libéré pour un cinquième au moins à la constitution.",
      "Un ou plusieurs gérants ; le statut social dépend du caractère majoritaire ou non de la gérance.",
      "Impôt sur les sociétés par défaut ; option pour l'IR possible 5 ans, sans limite de durée pour une SARL de famille.",
    ],
    avantages: [
      "Responsabilité limitée aux apports.",
      "Charges sociales réduites pour le gérant majoritaire.",
      "Agrément des cessions de parts à des tiers : le capital reste maîtrisé.",
    ],
    inconvenients: [
      "Souplesse statutaire limitée par la loi.",
      "Protection sociale du gérant majoritaire moins favorable.",
      "Moins adaptée à une levée de fonds qu'une SAS.",
    ],
    obligations: [
      "Comptabilité commerciale, comptes annuels, assemblée générale annuelle.",
      "Dépôt des comptes au greffe et déclaration des bénéficiaires effectifs.",
      "Registre des décisions et des parts sociales.",
    ],
  },
  {
    cle: "SCI",
    titre: "SCI — société civile immobilière",
    resume: "Détenir et gérer un patrimoine immobilier à plusieurs, avec une transmission facilitée.",
    caracteristiques: [
      "Au moins deux associés ; objet civil, non commercial.",
      "Capital librement fixé, libération déterminée par les statuts.",
      "Direction assurée par un ou plusieurs gérants.",
      "Impôt sur le revenu par défaut, avec option irrévocable possible pour l'impôt sur les sociétés.",
    ],
    avantages: [
      "Transmission progressive du patrimoine par donation de parts.",
      "Sortie de l'indivision et règles de gestion définies par les statuts.",
      "Choix du régime fiscal selon la stratégie patrimoniale.",
    ],
    inconvenients: [
      "Responsabilité des associés indéfinie, à proportion de leur part dans le capital.",
      "Interdiction d'exercer une activité commerciale (la location meublée habituelle en fait partie).",
      "Formalisme de fonctionnement : assemblées, comptabilité, décisions écrites.",
    ],
    obligations: [
      "Comptabilité adaptée au régime fiscal (commerciale en cas d'option à l'IS).",
      "Assemblée annuelle et tenue d'un registre des décisions.",
      "Déclaration des bénéficiaires effectifs et déclarations fiscales propres au régime retenu.",
    ],
  },
  {
    cle: "EI",
    titre: "Entreprise individuelle",
    resume: "La forme la plus simple : pas de société, pas de statuts, pas de capital.",
    caracteristiques: [
      "L'entrepreneur exerce en son nom propre ; un nom commercial peut être ajouté.",
      "Aucun capital social, aucun statut à rédiger, aucune annonce légale.",
      "Patrimoine professionnel séparé du patrimoine personnel depuis la réforme du 14 février 2022.",
      "Impôt sur le revenu par défaut, avec option possible pour l'impôt sur les sociétés.",
    ],
    avantages: [
      "Création et fermeture rapides, frais réduits.",
      "Formalisme allégé au quotidien.",
      "Régime micro-entrepreneur accessible sous les seuils de chiffre d'affaires.",
    ],
    inconvenients: [
      "Pas de possibilité d'associer un tiers au capital.",
      "Crédibilité parfois moindre auprès de certains partenaires et financeurs.",
      "Régime des travailleurs non salariés, protection sociale plus limitée.",
    ],
    obligations: [
      "Comptabilité proportionnée au régime fiscal retenu.",
      "Déclarations fiscales et sociales périodiques.",
      "Utilisation de la mention « EI » dans les documents professionnels.",
    ],
  },
];

function Liste({ titre, items }: { titre: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{titre}</h4>
      <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="pl-4 -indent-4 before:mr-2 before:text-accent before:content-['—']">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fiches dépliables par forme juridique : faits légaux uniquement, sans recommandation. */
export function FormesDetail() {
  return (
    <Accordion type="single" collapsible className="mt-8">
      {FICHES.map((f) => (
        <AccordionItem key={f.cle} value={f.cle}>
          <AccordionTrigger className="text-left">
            <span>
              <span className="font-serif text-xl">{f.titre}</span>
              <span className="mt-1 block text-sm font-normal text-muted-foreground">{f.resume}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-6 pt-1 md:grid-cols-2">
              <Liste titre="Caractéristiques" items={f.caracteristiques} />
              <Liste titre="Avantages" items={f.avantages} />
              <Liste titre="Inconvénients" items={f.inconvenients} />
              <Liste titre="Obligations" items={f.obligations} />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
