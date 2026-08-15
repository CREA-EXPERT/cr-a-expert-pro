/**
 * Source unique de TOUS les textes du comparateur de formes juridiques.
 * Aucun texte de restitution ne doit être écrit en dur ailleurs dans le code.
 *
 * Toute modification de texte impose d'incrémenter SIMULATEUR_TEXTES_VERSION :
 * cette version est journalisée avec chaque simulation et figure en pied de
 * l'email de restitution (valeur probatoire).
 */

export const SIMULATEUR_TEXTES_VERSION = "2.0.0";

export const SIMULATEUR_TITRE = "Comparer les formes juridiques";

export const SIMULATEUR_SOUS_TITRE =
  "Un comparateur pédagogique pour comprendre les différences entre les formes juridiques, au regard de vos priorités.";

/** Disclaimer unique, affiché en tête de questionnaire, en tête de restitution, en haut et en bas de l'email. */
export const DISCLAIMER_SIMULATEUR =
  "Ce comparateur fournit une information générale et pédagogique sur les formes juridiques. Il ne constitue ni une consultation juridique, ni un conseil personnalisé, ni une recommandation. Le choix d'une forme juridique dépend de votre situation complète, que seul un professionnel peut analyser dans le cadre d'une mission. Vous pouvez à tout moment demander la relecture et l'avis d'un expert-comptable. Voir nos CGU.";

/** Mention de légitimité, attribuée au cabinet et non à CREA EXPERT. */
export const MENTION_LEGITIMITE =
  "Un outil proposé par un cabinet d'expertise comptable inscrit à l'Ordre";

export const OBJET_EMAIL_SIMULATEUR =
  "Votre comparatif des formes juridiques — information pédagogique";

export const LIBELLE_BOUTON_RELECTURE = "Faire relire mon projet par un expert-comptable";

/* ------------------------------------------------------------------ */
/* Questionnaire                                                       */
/* ------------------------------------------------------------------ */

export type OptionQuestion = { v: string; l: string };

export type QuestionSimulateur = {
  id: string;
  section: string;
  intitule: string;
  options: OptionQuestion[];
  pourquoi?: string;
  obligatoire?: boolean;
  /** Condition d'affichage évaluée sur les réponses déjà données. */
  visibleSi?: (r: Record<string, string>) => boolean;
};

export const SECTIONS: { id: string; titre: string; intro?: string }[] = [
  { id: "A", titre: "Votre situation aujourd'hui" },
  {
    id: "B",
    titre: "Votre protection sociale (la vraie vie)",
    intro:
      "Créer une entreprise, c'est aussi anticiper les moments où la vie ne se passe pas comme prévu : un arrêt maladie, une naissance, la retraite. Les formes juridiques ne protègent pas de la même manière.",
  },
  { id: "C", titre: "Votre rémunération et vos revenus" },
  { id: "D", titre: "Votre projet et votre entourage" },
  { id: "E", titre: "Vos préférences de gestion" },
];

export const QUESTIONS: QuestionSimulateur[] = [
  {
    id: "a1",
    section: "A",
    obligatoire: true,
    intitule: "Quelle est votre situation actuelle ?",
    options: [
      { v: "salarie", l: "Salarié(e) en poste" },
      { v: "are", l: "Demandeur(se) d'emploi indemnisé(e) (ARE)" },
      { v: "sans_are", l: "Demandeur(se) d'emploi non indemnisé(e)" },
      { v: "independant", l: "Déjà indépendant(e)" },
      { v: "fonctionnaire", l: "Fonctionnaire" },
      { v: "etudiant", l: "Étudiant(e)" },
      { v: "autre", l: "Autre" },
    ],
    pourquoi:
      "La situation de départ change les règles du jeu : maintien des allocations, cumul avec un emploi, couverture sociale déjà existante.",
  },
  {
    id: "a2",
    section: "A",
    visibleSi: (r) => r["a1"] === "are",
    intitule: "Souhaitez-vous conserver vos allocations chômage pendant le démarrage ?",
    options: [
      { v: "essentiel", l: "Oui, c'est essentiel" },
      { v: "si_possible", l: "Oui, si possible" },
      { v: "non", l: "Non" },
      { v: "nsp", l: "Je ne sais pas" },
    ],
    pourquoi:
      "Le mode de rémunération du dirigeant et le traitement des dividendes selon la forme juridique interagissent différemment avec le maintien de l'ARE. C'est l'un des critères les plus différenciants en pratique.",
  },
  {
    id: "a3",
    section: "A",
    intitule:
      "Connaissez-vous le dispositif ACRE (exonération partielle de cotisations en début d'activité) ?",
    options: [
      { v: "oui", l: "Oui, j'en bénéficierai" },
      { v: "incertain", l: "Oui, mais je ne sais pas si j'y ai droit" },
      { v: "non", l: "Je ne connais pas ce dispositif" },
    ],
    pourquoi:
      "L'ACRE allège les cotisations la première année et modifie le calcul du coût réel de chaque statut au démarrage.",
  },
  {
    id: "a4",
    section: "A",
    intitule: "Conserverez-vous un emploi salarié en parallèle ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
      { v: "peutetre", l: "Peut-être" },
    ],
    pourquoi:
      "Un emploi conservé maintient une couverture maladie, prévoyance et retraite, ce qui peut rendre secondaires certaines différences de protection sociale entre statuts.",
  },
  {
    id: "b1",
    section: "B",
    intitule:
      "Quelle importance accordez-vous à la couverture maternité / paternité (indemnités et congés en cas de naissance ou d'adoption) ?",
    options: [
      { v: "tres_important", l: "Critère très important" },
      { v: "important", l: "Important" },
      { v: "peu_important", l: "Peu important" },
      { v: "sans_objet", l: "Sans objet pour moi" },
    ],
    pourquoi:
      "Le dirigeant assimilé salarié (président de SAS/SASU rémunéré) et le travailleur non salarié (gérant majoritaire de SARL, entrepreneur individuel) relèvent de régimes différents, avec des indemnisations calculées différemment. Un dirigeant NON rémunéré peut n'ouvrir aucun droit. Nous ne vous demandons pas votre situation personnelle : seulement l'importance de ce critère pour vous.",
  },
  {
    id: "b2",
    section: "B",
    intitule:
      "Quelle importance accordez-vous aux indemnités journalières en cas d'arrêt de travail (maladie, accident) ?",
    options: [
      { v: "tres_important", l: "Très important — je veux être couvert(e) au mieux" },
      { v: "important", l: "Important" },
      { v: "prevoyance", l: "Je compléterai par une prévoyance privée" },
      { v: "peu_important", l: "Peu important" },
    ],
    pourquoi:
      "Les indemnités journalières dépendent du régime social ET de l'existence d'une rémunération. Beaucoup de créateurs découvrent trop tard qu'un dirigeant sans rémunération peut être très peu couvert.",
  },
  {
    id: "b3",
    section: "B",
    intitule: "Entre revenu net immédiat et retraite, où placez-vous le curseur ?",
    options: [
      { v: "net", l: "Maximiser mon net aujourd'hui, quitte à cotiser moins pour la retraite" },
      { v: "equilibre", l: "Un équilibre" },
      { v: "retraite", l: "Cotiser davantage pour de meilleurs droits à la retraite" },
    ],
    pourquoi:
      "À revenu égal, le statut assimilé salarié coûte plus cher en cotisations mais génère davantage de droits (notamment retraite complémentaire) ; le statut TNS coûte moins cher mais ouvre des droits moindres, souvent complétés par des contrats privés.",
  },
  {
    id: "b4",
    section: "B",
    intitule:
      "Êtes-vous prêt(e) à souscrire des contrats de prévoyance et retraite privés en complément (type contrats Madelin / PER) ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
      { v: "etudier", l: "À étudier" },
    ],
    pourquoi:
      "La protection plus légère du statut TNS est fréquemment compensée par des contrats privés déductibles. Cette disposition change l'analyse du coût global.",
  },
  {
    id: "c1",
    section: "C",
    obligatoire: true,
    intitule: "Vous verserez-vous une rémunération dès la première année ?",
    options: [
      { v: "reguliere", l: "Oui, régulière dès le début" },
      { v: "irreguliere", l: "Oui, mais irrégulière ou faible" },
      { v: "non", l: "Non, je réinvestis tout" },
      { v: "nsp", l: "Je ne sais pas encore" },
    ],
    pourquoi:
      "L'existence d'une rémunération conditionne l'ouverture de la plupart des droits sociaux, quelle que soit la forme juridique.",
  },
  {
    id: "c2",
    section: "C",
    visibleSi: (r) => r["c1"] !== "non",
    intitule: "Dans quelle fourchette mensuelle nette envisagez-vous de vous rémunérer à terme ?",
    options: [
      { v: "moins_1000", l: "Moins de 1 000 €" },
      { v: "1000_3000", l: "1 000 à 3 000 €" },
      { v: "plus_3000", l: "Plus de 3 000 €" },
      { v: "nsp", l: "Je ne sais pas" },
    ],
    pourquoi:
      "Le poids relatif des cotisations et l'intérêt comparé rémunération/dividendes varient selon le niveau de revenu.",
  },
  {
    id: "c3",
    section: "C",
    intitule: "Comment imaginez-vous sortir les bénéfices de l'entreprise ?",
    options: [
      { v: "remuneration", l: "Principalement en rémunération" },
      { v: "dividendes", l: "Principalement en dividendes" },
      { v: "mixte", l: "Un mixte" },
      { v: "reinvestir", l: "Tout réinvestir les premières années" },
    ],
    pourquoi:
      "Le traitement social des dividendes diffère fortement : dans certaines configurations (gérance majoritaire de SARL), une partie des dividendes supporte des cotisations sociales ; dans d'autres (SAS), ils n'en supportent pas mais n'ouvrent aucun droit social. L'interaction avec les allocations chômage diffère également.",
  },
  {
    id: "c4",
    section: "C",
    intitule: "Quel chiffre d'affaires annuel visez-vous à horizon 2-3 ans ?",
    options: [
      { v: "moins_50", l: "Moins de 50 000 €" },
      { v: "50_150", l: "50 000 à 150 000 €" },
      { v: "150_500", l: "150 000 à 500 000 €" },
      { v: "plus_500", l: "Plus de 500 000 €" },
    ],
    pourquoi:
      "Le volume d'activité influe sur le niveau de rémunération envisageable et sur les obligations déclaratives.",
  },
  {
    id: "d1",
    section: "D",
    obligatoire: true,
    intitule: "Créez-vous seul(e) ou à plusieurs ?",
    options: [
      { v: "seul", l: "Seul(e)" },
      { v: "plusieurs", l: "À plusieurs" },
    ],
    pourquoi:
      "En SARL, le régime social du gérant dépend de sa participation (majoritaire = TNS, minoritaire/égalitaire = assimilé salarié). En SAS, le président est assimilé salarié quelle que soit sa participation.",
  },
  {
    id: "d1_part",
    section: "D",
    visibleSi: (r) => r["d1"] === "plusieurs",
    intitule: "Quelle participation envisagez-vous pour le dirigeant ?",
    options: [
      { v: "majoritaire", l: "Majoritaire (plus de la moitié des droits)" },
      { v: "egalitaire", l: "Égalitaire (moitié des droits)" },
      { v: "minoritaire", l: "Minoritaire" },
      { v: "nsp", l: "Je ne sais pas encore" },
    ],
    pourquoi:
      "En SARL, la participation du gérant détermine son régime social ; en SAS, elle est sans effet sur le régime du président.",
  },
  {
    id: "d2",
    section: "D",
    intitule: "Votre conjoint(e) ou partenaire participera-t-il/elle régulièrement à l'activité ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
      { v: "peutetre", l: "Peut-être" },
    ],
    pourquoi:
      "Le statut de conjoint collaborateur (protection sociale à moindre coût) n'est ouvert que dans certaines configurations (notamment la gérance majoritaire de SARL), pas au président de SAS.",
  },
  {
    id: "d3",
    section: "D",
    intitule: "Envisagez-vous de faire entrer des investisseurs ou de lever des fonds ?",
    options: [
      { v: "oui", l: "Oui, c'est prévu" },
      { v: "peutetre", l: "Peut-être un jour" },
      { v: "non", l: "Non" },
    ],
    pourquoi:
      "La SAS offre des instruments dédiés (actions de préférence, BSPCE, pactes) que les investisseurs exigent quasi systématiquement ; les SARL s'y prêtent mal.",
  },
  {
    id: "d4",
    section: "D",
    intitule: "Envisagez-vous de revendre ou transmettre l'entreprise à moyen terme ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "peutetre", l: "Peut-être" },
      { v: "non", l: "Non, projet de long terme" },
    ],
    pourquoi:
      "Les droits d'enregistrement lors d'une cession diffèrent entre actions (SAS) et parts sociales (SARL), et les clauses statutaires de sortie ne s'organisent pas de la même façon.",
  },
  {
    id: "d5",
    section: "D",
    intitule: "Votre activité est-elle réglementée ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
      { v: "nsp", l: "Je ne sais pas" },
    ],
    pourquoi:
      "Certaines activités réglementées imposent une forme juridique, un diplôme ou une autorisation préalable. Le dossier est alors orienté vers le cabinet pour un examen dédié.",
  },
  {
    id: "e1",
    section: "E",
    intitule: "Quel est votre rapport au formalisme juridique ?",
    options: [
      { v: "encadre", l: "Je veux un cadre simple et très encadré par la loi" },
      { v: "souplesse", l: "Je veux de la souplesse, quitte à ce que les statuts soient plus travaillés" },
      { v: "indifferent", l: "Indifférent" },
    ],
    pourquoi:
      "La SARL est fortement encadrée par le Code de commerce (protecteur mais rigide) ; la SAS repose sur la liberté statutaire (souple mais exigeante à la rédaction).",
  },
  {
    id: "e2",
    section: "E",
    intitule: "En matière d'imposition des bénéfices, avez-vous déjà une idée ?",
    options: [
      { v: "is", l: "Impôt sur les sociétés (IS)" },
      { v: "ir", l: "Impôt sur le revenu (IR)" },
      { v: "nsp", l: "Je ne sais pas — c'est justement une question pour un professionnel" },
    ],
    pourquoi:
      "Les options fiscales ouvertes (IS de plein droit, option IR temporaire, SARL de famille, EI à l'IR ou option IS) diffèrent selon la forme. Ce comparateur n'analyse pas votre fiscalité personnelle : ce point relève typiquement d'une mission de conseil.",
  },
];

/* ------------------------------------------------------------------ */
/* Critères de restitution                                             */
/* ------------------------------------------------------------------ */

export type CritereTexte = {
  id: string;
  libelle: string;
  /** Colonne SAS / SASU */
  sas: string;
  /** Colonne SARL / EURL */
  sarl: string;
};

export const COLONNE_SAS = "SAS / SASU";
export const COLONNE_SARL = "SARL / EURL";

export const CRITERES: CritereTexte[] = [
  {
    id: "regime_social",
    libelle: "Régime social du dirigeant",
    sas: "Le président est assimilé salarié dès lors qu'il est rémunéré, quelle que soit sa participation au capital. Il relève du régime général, sans assurance chômage.",
    sarl: "Le gérant majoritaire relève du régime des travailleurs non salariés ; le gérant minoritaire ou égalitaire rémunéré est assimilé salarié. Le régime dépend donc de la répartition du capital.",
  },
  {
    id: "maternite",
    libelle: "Maternité / paternité",
    sas: "Les droits relèvent du régime général et sont calculés sur la rémunération soumise à cotisations. Sans rémunération, les droits peuvent être inexistants.",
    sarl: "Les droits relèvent du régime des indépendants pour la gérance majoritaire, avec des modalités de calcul et des conditions d'affiliation propres à ce régime.",
  },
  {
    id: "maladie",
    libelle: "Arrêt maladie (indemnités journalières)",
    sas: "Indemnités du régime général, assises sur la rémunération versée. Information constante : un dirigeant sans rémunération peut n'ouvrir que peu ou pas de droits, quel que soit le statut.",
    sarl: "Indemnités du régime des indépendants, assises sur les revenus professionnels déclarés. Information constante : un dirigeant sans rémunération peut n'ouvrir que peu ou pas de droits, quel que soit le statut.",
  },
  {
    id: "retraite",
    libelle: "Retraite (base + complémentaire)",
    sas: "Retraite de base et complémentaire du régime général : à rémunération égale, les droits acquis sont généralement plus élevés, pour un coût de cotisations lui aussi plus élevé.",
    sarl: "Retraite de base et complémentaire des indépendants : cotisations moins élevées, droits acquis généralement moindres, souvent complétés par des contrats privés.",
  },
  {
    id: "chomage",
    libelle: "Chômage",
    sas: "Aucun dirigeant ne cotise à l'assurance chômage : ni le président de SAS, ni le gérant de SARL. Le statut ne crée pas de droits nouveaux ; en revanche, il interagit différemment avec des allocations en cours (ARE). Une absence de rémunération préserve généralement mieux des allocations en cours.",
    sarl: "Aucun dirigeant ne cotise à l'assurance chômage : ni le président de SAS, ni le gérant de SARL. Le statut ne crée pas de droits nouveaux ; en revanche, il interagit différemment avec des allocations en cours (ARE). Les cotisations minimales des indépendants et le traitement des dividendes peuvent affecter le calcul des allocations.",
  },
  {
    id: "cout",
    libelle: "Coût des cotisations et net disponible",
    sas: "Coût des cotisations plus élevé pour un même net versé ; aucune cotisation due en l'absence de rémunération.",
    sarl: "Coût des cotisations moins élevé pour un même net versé ; des cotisations minimales restent dues même sans revenu.",
  },
  {
    id: "dividendes",
    libelle: "Dividendes",
    sas: "Les dividendes ne supportent pas de cotisations sociales, mais n'ouvrent aucun droit social.",
    sarl: "Pour la gérance majoritaire, la fraction des dividendes excédant une part du capital et des sommes assimilées supporte des cotisations sociales.",
  },
  {
    id: "conjoint",
    libelle: "Conjoint collaborateur",
    sas: "Le statut de conjoint collaborateur n'est pas ouvert au conjoint du président de SAS.",
    sarl: "Le statut de conjoint collaborateur est ouvert dans les configurations de gérance majoritaire : une protection sociale propre, à coût réduit.",
  },
  {
    id: "fiscalite",
    libelle: "Fiscalité",
    sas: "Impôt sur les sociétés de plein droit, avec une option temporaire pour l'impôt sur le revenu sous conditions.",
    sarl: "Impôt sur les sociétés de plein droit pour la SARL, impôt sur le revenu par défaut pour l'EURL détenue par une personne physique ; régime particulier de la SARL de famille sous conditions.",
  },
  {
    id: "investisseurs",
    libelle: "Investisseurs et levée de fonds",
    sas: "Actions, actions de préférence, valeurs mobilières et pactes d'associés : le cadre attendu par les investisseurs.",
    sarl: "Parts sociales et cadre légal rigide : montage moins adapté à l'entrée d'investisseurs financiers.",
  },
  {
    id: "cession",
    libelle: "Cession / transmission",
    sas: "Cession d'actions à formalisme allégé, avec des droits d'enregistrement d'un taux plus faible que pour les parts sociales.",
    sarl: "Cession de parts sociales avec agrément légal et formalisme accru, et des droits d'enregistrement d'un taux plus élevé.",
  },
  {
    id: "formalisme",
    libelle: "Formalisme et souplesse statutaire",
    sas: "Grande liberté statutaire : l'organisation se construit dans les statuts, dont la rédaction est déterminante.",
    sarl: "Fonctionnement largement fixé par la loi : cadre protecteur et prévisible, mais peu modulable.",
  },
];

export const PASTILLES = {
  correspond: { signe: "●", libelle: "correspond à vos priorités déclarées" },
  neutre: { signe: "◐", libelle: "neutre" },
  vigilance: { signe: "○", libelle: "point de vigilance au regard de vos réponses" },
} as const;

export type NiveauPastille = keyof typeof PASTILLES;

/* ------------------------------------------------------------------ */
/* Synthèse                                                            */
/* ------------------------------------------------------------------ */

function enumerer(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

export function phraseSynthese({
  forme,
  points,
  vigilances,
}: {
  forme: string | null;
  points: string[];
  vigilances: string[];
}): string {
  const fin =
    "Ce résultat est une information générale, pas un conseil : votre situation fiscale, patrimoniale et familiale complète peut mener à une autre analyse. Pour un avis engageant un professionnel, demandez la relecture par un expert-comptable.";

  if (!forme || points.length === 0) {
    return `Au regard des priorités que vous avez déclarées, aucune des deux familles de formes juridiques ne se distingue nettement : les caractéristiques comparées ci-dessus se valent pour un profil similaire au vôtre. ${fin}`;
  }

  const debut = `Au regard des priorités que vous avez déclarées, les caractéristiques de la ${forme} correspondent le plus souvent à un profil similaire au vôtre, notamment sur : ${enumerer(points.slice(0, 3))}.`;
  const milieu = vigilances.length
    ? ` À l'inverse, gardez en tête : ${enumerer(vigilances.slice(0, 2))}.`
    : "";
  return `${debut}${milieu} ${fin}`;
}

/* ------------------------------------------------------------------ */
/* Email de restitution                                                */
/* ------------------------------------------------------------------ */

function esc(t: string) {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type LigneRestitutionEmail = {
  libelle: string;
  sas: { texte: string; niveau: NiveauPastille };
  sarl: { texte: string; niveau: NiveauPastille };
};

const URL_SITE = "https://crea-expert.fr";

function cellule(c: { texte: string; niveau: NiveauPastille }) {
  const p = PASTILLES[c.niveau];
  return `<td style="padding:10px;border-bottom:1px solid #e5e2dc;vertical-align:top;font-size:13px;line-height:1.5;text-align:justify">
    <div style="font-weight:600;margin-bottom:4px">${p.signe} ${esc(p.libelle)}</div>
    ${esc(c.texte)}
  </td>`;
}

function bandeauDisclaimer() {
  return `<p style="background:#f6f4f0;border:1px solid #e5e2dc;border-radius:8px;padding:14px;font-size:13px;line-height:1.6;text-align:justify;color:#2b2a27">${esc(DISCLAIMER_SIMULATEUR)}</p>`;
}

export function emailRestitutionHtml({
  prenom,
  lignes,
  synthese,
}: {
  prenom: string;
  lignes: LigneRestitutionEmail[];
  synthese: string;
}): string {
  const corpsTable = lignes
    .map(
      (l) => `<tr>
    <th scope="row" style="padding:10px;border-bottom:1px solid #e5e2dc;text-align:left;vertical-align:top;font-size:13px;width:22%">${esc(l.libelle)}</th>
    ${cellule(l.sas)}
    ${cellule(l.sarl)}
  </tr>`,
    )
    .join("\n");

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#2b2a27">
<div style="max-width:720px;margin:0 auto">
  <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8a6a3b;margin:0 0 4px">CREA EXPERT</p>
  <h1 style="font-size:22px;margin:0 0 4px">${esc(SIMULATEUR_TITRE)}</h1>
  <p style="font-size:14px;color:#5c5952;margin:0 0 16px;text-align:justify">${esc(SIMULATEUR_SOUS_TITRE)}</p>

  ${bandeauDisclaimer()}

  <p style="font-size:13px;color:#5c5952;margin:14px 0">${esc(MENTION_LEGITIMITE)}</p>

  <p style="font-size:14px;line-height:1.6;text-align:justify">Bonjour ${esc(prenom || "")},<br />
  voici le comparatif, critère par critère, des deux familles de formes juridiques les plus courantes, mis en regard des priorités que vous avez déclarées.</p>

  <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e2dc;border-radius:8px">
    <thead>
      <tr style="background:#f6f4f0">
        <th style="padding:10px;text-align:left;font-size:13px">Critère</th>
        <th style="padding:10px;text-align:left;font-size:13px">${esc(COLONNE_SAS)}</th>
        <th style="padding:10px;text-align:left;font-size:13px">${esc(COLONNE_SARL)}</th>
      </tr>
    </thead>
    <tbody>
${corpsTable}
    </tbody>
  </table>

  <p style="font-size:12px;color:#5c5952;margin:10px 0 18px">${PASTILLES.correspond.signe} ${esc(PASTILLES.correspond.libelle)} · ${PASTILLES.neutre.signe} ${esc(PASTILLES.neutre.libelle)} · ${PASTILLES.vigilance.signe} ${esc(PASTILLES.vigilance.libelle)}</p>

  <p style="font-size:14px;line-height:1.7;text-align:justify;background:#faf8f4;border:1px solid #e5e2dc;border-radius:8px;padding:14px">${esc(synthese)}</p>

  <p style="margin:20px 0">
    <a href="${URL_SITE}/tarifs" style="display:inline-block;background:#2b2a27;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px">${esc(LIBELLE_BOUTON_RELECTURE)}</a>
  </p>

  ${bandeauDisclaimer()}

  <p style="font-size:12px;color:#8a8780;margin-top:18px">
    <a href="${URL_SITE}/cgu" style="color:#8a8780">CGU</a> ·
    <a href="${URL_SITE}/confidentialite" style="color:#8a8780">Politique de confidentialité</a><br />
    Textes v${SIMULATEUR_TEXTES_VERSION}
  </p>
</div>
</body></html>`;
}
