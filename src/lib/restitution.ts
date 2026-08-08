export type LigneComparaison = { critere: string; a: string; b: string };

export type Restitution = {
  a: string;
  b: string;
  titre: string;
  sousTitre: string;
  mention: string;
  lignes: LigneComparaison[];
  encadreTitre: string;
  encadreTexte: string;
};

const SOUS_TITRE =
  "Il n'existe pas de \u00ab meilleure \u00bb forme dans l'absolu — chacune a sa logique. Voici les différences qui comptent, pour vous aider à choisir en connaissance de cause.";

const MENTION =
  "Information générale — ne constitue pas un conseil. Un expert-comptable pourra en discuter avec vous.";

const ENCADRE_TITRE = "Et l'entreprise individuelle ?";
const ENCADRE_TEXTE =
  "Si votre projet démarre petit et que vous voulez la simplicité maximale : pas de statuts, pas de capital, pas d'annonce légale, des frais de création réduits. Depuis 2022, votre patrimoine personnel est automatiquement protégé, et une option pour l'impôt sur les sociétés existe. En revanche : pas de dividendes, et une image parfois moins \u00ab corporate \u00bb auprès de certains clients ou financeurs.";

const LIGNES_SEUL: LigneComparaison[] = [
  {
    critere: "Statut social du dirigeant",
    a: "Assimilé salarié (régime général)",
    b: "Travailleur indépendant (sécurité sociale des indépendants)",
  },
  {
    critere: "Cotisations sur la rémunération",
    a: "Élevées (~75–80 % du net versé) mais ZÉRO cotisation si zéro rémunération",
    b: "Plus faibles (~45 % du net) mais cotisations minimales dues même sans revenu (env. 1 100–1 300 €/an)",
  },
  {
    critere: "Protection sociale",
    a: "Plus complète (retraite, prévoyance proches du salarié — sans assurance chômage)",
    b: "Plus légère, à compléter éventuellement par une prévoyance facultative",
  },
  {
    critere: "Dividendes",
    a: "Non soumis à cotisations sociales (flat tax 30 %)",
    b: "Soumis à cotisations sociales au-delà de 10 % du capital",
  },
  {
    critere: "Impôt par défaut",
    a: "Impôt sur les sociétés (option temporaire IR possible)",
    b: "Impôt sur le revenu (option IS possible)",
  },
  {
    critere: "Souplesse des statuts",
    a: "Très grande liberté statutaire",
    b: "Cadre plus encadré par la loi",
  },
  {
    critere: "Conjoint marié en communauté",
    a: "Aucune formalité particulière",
    b: "Information du conjoint requise en cas d'apport de fonds communs",
  },
  {
    critere: "Tendance d'usage",
    a: "Rémunération faible + dividendes, projets de croissance, futurs investisseurs",
    b: "Rémunération régulière dès le départ, activité stable, coût social optimisé",
  },
];

const LIGNES_PLUSIEURS: LigneComparaison[] = [
  ...LIGNES_SEUL,
  {
    critere: "Entrée d'investisseurs / cession",
    a: "Plus adaptée : actions librement cessibles, outils de financement variés",
    b: "Moins adaptée : cession de parts plus formaliste",
  },
  {
    critere: "Agrément des nouveaux associés",
    a: "À organiser dans les statuts",
    b: "Encadré de plein droit par la loi",
  },
];

export function restitution(seul: boolean): Restitution {
  const a = seul ? "SASU" : "SAS";
  const b = seul ? "EURL" : "SARL";
  return {
    a,
    b,
    titre: `D'après vos réponses, deux formes correspondent le plus souvent à votre situation : la ${a} et l'${b}.`,
    sousTitre: SOUS_TITRE,
    mention: MENTION,
    lignes: seul ? LIGNES_SEUL : LIGNES_PLUSIEURS,
    encadreTitre: ENCADRE_TITRE,
    encadreTexte: ENCADRE_TEXTE,
  };
}

/** Gabarit exact du courriel de résultat (simulé en V1 : stocké en base, non envoyé). */
export const OBJET_EMAIL = "Votre résultat — quelle forme juridique pour votre projet ?";

export function corpsEmail(prenom: string, r: Restitution) {
  const tableau = r.lignes
    .map((l) => `- ${l.critere} | ${r.a} : ${l.a} | ${r.b} : ${l.b}`)
    .join("\n");

  return `Objet : ${OBJET_EMAIL}

Bonjour ${prenom || "[Prénom]"},

Merci d'avoir utilisé notre outil d'orientation. Voici votre résultat, accompagné d'explications complètes pour décider sereinement.

${r.titre}

${r.sousTitre}

${r.mention}

${tableau}

${r.encadreTitre}
${r.encadreTexte}

Comment lire ce résultat selon vos priorités :
- Vous privilégiez votre revenu mensuel net → le coût social plus faible de l'EURL (ou de l'entreprise individuelle) joue en sa faveur.
- Vous privilégiez votre protection sociale (retraite, prévoyance) → le régime assimilé salarié de la SASU est plus protecteur, en contrepartie de cotisations plus élevées.
- Vous raisonnez patrimoine et transmission → les deux formes protègent votre patrimoine personnel ; la SASU (actions) se cède et s'ouvre plus facilement à des associés ou investisseurs.
- Vous raisonnez impôt → à l'IS (les deux formes le permettent), la société paie l'impôt sur ses bénéfices (15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà) et vous choisissez ce que vous vous versez ; à l'IR, le bénéfice est imposé directement entre vos mains, ce qui peut être favorable en début d'activité déficitaire ou à faible bénéfice.

Ces éléments sont une information générale : ils ne remplacent pas un échange sur votre situation précise. Si vous le souhaitez, un expert-comptable inscrit à l'Ordre peut en discuter avec vous — demandez simplement à être rappelé.

Prêt(e) à vous lancer ? Votre création est à honoraires offerts : [bouton « Créer ma société »]

Bon à savoir : les frais payés dans l'intérêt de la société créée peuvent être remboursés par ladite société à la personne qui a avancé les fonds. Les frais de greffe et d'annonce légale peuvent donc être remboursés par la société à son créateur qui a avancé les fonds.

L'équipe CREA EXPERT — plateforme française, données hébergées en Europe`;
}

export const NOTE_REMBOURSEMENT =
  "Les frais payés dans l'intérêt de la société créée peuvent être remboursés par ladite société à la personne qui a avancé les fonds : les frais de greffe et d'annonce légale peuvent donc vous être remboursés par la société une fois immatriculée.";
