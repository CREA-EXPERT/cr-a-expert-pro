import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { euro, isSas, TVA_OPTIONS, type Forme } from "./domain";
import { analyserBeneficiaires, MOTIF_BE } from "./beneficiaires";
import {
  conjointConcerne,
  consentement1424,
  partenaireIndivisConcerne,
} from "./documents";
import type { Associe, Dossier } from "./documents";

const MARGE = 56;
const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const NAVY = rgb(0.06, 0.11, 0.24);
const GRIS = rgb(0.42, 0.44, 0.5);

type Ctx = {
  pdf: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
};

/** Mode de rendu courant : filigrane « PROJET » et/ou mention de pied de page. */
let RENDU: { filigrane: boolean; pied: string | null } = { filigrane: true, pied: null };

/** Mention légale obligatoire sur chaque page de chaque acte généré. */
export const MENTION_ART_22 =
  "Acte établi à titre accessoire à la mission comptable, sous la responsabilité du cabinet d'expertise comptable en charge du dossier, conformément à l'article 22 de l'ordonnance n° 45-2138 du 19 septembre 1945.";

function filigrane(page: PDFPage, font: PDFFont) {
  if (RENDU.filigrane) {
    page.drawText("PROJET — soumis à la validation du cabinet", {
      x: 60,
      y: 300,
      size: 24,
      font,
      color: rgb(0.86, 0.86, 0.88),
      rotate: degrees(38),
    });
  }
  if (RENDU.pied) {
    page.drawText(RENDU.pied, { x: MARGE, y: 34, size: 8, font, color: GRIS });
  }
  // Mention art. 22 de l'ordonnance de 1945 : 8 pt, gris, centrée, sur toutes les pages.
  const lignesMention = lignes(MENTION_ART_22, font, 8, LARGEUR - MARGE * 2);
  let yMention = 12 + (lignesMention.length - 1) * 9;
  for (const l of lignesMention) {
    const largeur = font.widthOfTextAtSize(l, 8);
    page.drawText(l, { x: (LARGEUR - largeur) / 2, y: yMention, size: 8, font, color: GRIS });
    yMention -= 9;
  }
}


/** Détermine le rendu à partir de l'état du dossier (validation cabinet ou auto-validation). */
export function renduPour(d: Dossier): { filigrane: boolean; pied: string | null } {
  if (d.valide_par) return { filigrane: false, pied: null };
  if (d.voie_validation === "auto" && d.autovalidation_le) {
    return {
      filigrane: false,
      pied: "Document genere a partir des reponses du declarant - non revu par un professionnel.",
    };
  }
  return { filigrane: true, pied: null };
}

function nouvellePage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([LARGEUR, HAUTEUR]);
  filigrane(ctx.page, ctx.bold);
  ctx.y = HAUTEUR - MARGE;
}

function espace(ctx: Ctx, n = 12) {
  ctx.y -= n;
  if (ctx.y < MARGE + 40) nouvellePage(ctx);
}

function lignes(texte: string, font: PDFFont, size: number, max: number) {
  const mots = texte.split(/\s+/);
  const res: string[] = [];
  let courante = "";
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (font.widthOfTextAtSize(essai, size) > max && courante) {
      res.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) res.push(courante);
  return res;
}

function ecrire(ctx: Ctx, texte: string, opts: { size?: number; bold?: boolean; color?: typeof NAVY } = {}) {
  const size = opts.size ?? 10.5;
  const font = opts.bold ? ctx.bold : ctx.regular;
  for (const l of lignes(texte, font, size, LARGEUR - MARGE * 2)) {
    if (ctx.y < MARGE + 30) nouvellePage(ctx);
    ctx.page.drawText(l, { x: MARGE, y: ctx.y, size, font, color: opts.color ?? NAVY });
    ctx.y -= size + 4;
  }
}

function titre(ctx: Ctx, texte: string) {
  espace(ctx, 10);
  ecrire(ctx, texte.toUpperCase(), { size: 11, bold: true });
  espace(ctx, 2);
}

function aValider(ctx: Ctx, sujet: string) {
  ecrire(ctx, `[CLAUSE À VALIDER PAR LE CABINET — ${sujet}]`, { size: 10, color: GRIS });
}

/** Intitulé d'article reproduit tel quel (sans passage en capitales). */
function article(ctx: Ctx, texte: string) {
  espace(ctx, 10);
  ecrire(ctx, texte, { size: 11, bold: true });
  espace(ctx, 2);
}

function puce(ctx: Ctx, texte: string) {
  ecrire(ctx, `• ${texte}`);
  espace(ctx, 2);
}


async function creerCtx(titreDoc: string, sousTitre: string): Promise<Ctx> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([LARGEUR, HAUTEUR]);
  filigrane(page, bold);
  const ctx: Ctx = { pdf, regular, bold, page, y: HAUTEUR - MARGE };
  ecrire(ctx, titreDoc.toUpperCase(), { size: 15, bold: true });
  espace(ctx, 4);
  ecrire(ctx, sousTitre, { size: 10, color: GRIS });
  espace(ctx, 14);
  return ctx;
}

function dateFr(d: string | null | undefined) {
  if (!d) return "[date à compléter]";
  const [a, m, j] = d.split("-");
  return `${j}/${m}/${a}`;
}

function nomComplet(a: Associe) {
  return a.type === "personne_morale"
    ? `${a.denomination ?? "[dénomination]"} (${a.forme ?? "forme"}, SIREN ${a.siren ?? "[SIREN]"})`
    : `${a.civilite ?? ""} ${a.prenom ?? ""} ${a.nom ?? ""}`.trim();
}

function identite(a: Associe) {
  if (a.type === "personne_morale") {
    return `${nomComplet(a)}, dont le siège est situé ${a.siege ?? "[siège]"}, représentée par ${a.representant ?? "[représentant]"}`;
  }
  return `${nomComplet(a)}, né(e) le ${dateFr(a.date_naissance)} à ${a.lieu_naissance ?? "[lieu]"}, de nationalité ${a.nationalite ?? "[nationalité]"}, demeurant ${a.adresse ?? "[adresse]"}`;
}

async function fin(ctx: Ctx) {
  return await ctx.pdf.save();
}

/* --------------------- STATUTS SAS / SASU (gabarit cabinet) --------------------- */

/** En-tête de page réduit : le gabarit SAS commence par son propre bandeau. */
async function creerCtxNu(): Promise<Ctx> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([LARGEUR, HAUTEUR]);
  filigrane(page, bold);
  return { pdf, regular, bold, page, y: HAUTEUR - MARGE };
}

async function statutsSas(d: Dossier, associes: Associe[]) {
  const manquants = champsManquantsStatutsSas(d, associes);
  if (manquants.length > 0) {
    throw new Error(
      `Statuts non générés — informations manquantes : ${manquants
        .map((m) => `${m.champ} (étape « ${m.etape} »)`)
        .join(" ; ")}.`,
    );
  }
  if (d.apport_nature) {
    throw new Error(
      "Statuts non générés — apport en nature : revue cabinet requise (commissaire aux apports ou dispense, art. L. 227-1 et D. 227-3 du code de commerce).",
    );
  }

  const parts = associesDe(associes);
  const uni = parts.length === 1;
  const premier = parts[0] as Associe;
  const president = presidentDe(associes) as Associe;
  const dg = directeurGeneralDe(associes);
  const libelleForme = uni
    ? "Société par actions simplifiée unipersonnelle"
    : "Société par actions simplifiée";
  const sigleForme = uni ? "SASU" : "SAS";
  const capital = Number(d.capital_montant);
  const nominal = Number(d.valeur_part);
  const nbActions = parts.reduce((s, a) => s + (Number(a.nb_titres) || 0), 0);
  const totalNumeraire = parts.reduce((s, a) => s + (Number(a.montant_apport) || 0), 0);
  const [jourCloture, moisCloture] = (d.date_cloture_exercice ?? "31/12").split("/");
  const ouverture = jourMoisEnLettresFr(
    Number(jourCloture) === 31 && Number(moisCloture) === 12 ? 1 : 1,
    (Number(moisCloture) % 12) + 1,
  );
  const cloture = jourMoisEnLettresFr(Number(jourCloture), Number(moisCloture));
  const activites = activitesDuDossier(d);
  const libere = Number(d.capital_liberation) >= 100;

  const ctx = await creerCtxNu();

  ecrire(ctx, `${d.denomination} ${libelleForme} au capital de ${capital} euros`, { bold: true });
  ecrire(ctx, `Siège social : ${d.siege_adresse}`);
  espace(ctx, 14);
  ecrire(ctx, "STATUTS", { size: 16, bold: true });
  espace(ctx, 14);

  if (uni) ecrire(ctx, feminin(premier) ? "La soussignée :" : "Le soussigné :");
  else ecrire(ctx, "Les soussignés :");
  espace(ctx, 6);

  parts.forEach((a, i) => {
    if (i > 0) {
      ecrire(ctx, "Et,");
      espace(ctx, 4);
    }
    comparution(a).forEach((l) => ecrire(ctx, l));
    espace(ctx, 6);
  });

  if (uni) {
    ecrire(ctx, "(ci-après « l'Associé Unique »).");
    espace(ctx, 6);
    ecrire(
      ctx,
      "A établi ainsi qu'il suit les statuts d'une Société par actions simplifiée (ci-après la « Société ») devant exister entre les propriétaires des actions créées lors de la constitution et en cours de vie sociale.",
    );
  } else {
    ecrire(ctx, "Ci-après désignés ensemble les « Associés »,");
    espace(ctx, 6);
    ecrire(
      ctx,
      "Ont établi ainsi qu'il suit les statuts d'une Société par actions simplifiée (ci-après la « Société ») devant exister entre eux et les propriétaires des actions créées lors de la constitution et en cours de vie sociale.",
    );
  }

  article(
    ctx,
    "TITRE I - FORME - OBJET - DENOMINATION - SIEGE SOCIAL - DUREE - EXERCICE SOCIAL",
  );

  article(ctx, "ARTICLE 1 - Forme");
  ecrire(
    ctx,
    "La Société a la forme d'une société par actions simplifiée et est régie par les lois et règlements en vigueur, ainsi que par les présents statuts.",
  );

  article(ctx, "ARTICLE 2 - Objet");
  ecrire(
    ctx,
    "La société a pour objet, en France et à l'étranger, pour elle-même ou en participation avec des tiers :",
  );
  espace(ctx, 4);
  if (activites.length > 0) activites.forEach((a) => puce(ctx, a.texte));
  else puce(ctx, d.objet_social as string);
  puce(
    ctx,
    "Toutes prestations accessoires ou connexes se rapportant directement ou indirectement aux activités ci-dessus ;",
  );
  puce(
    ctx,
    "L'acquisition, l'exploitation, la concession ou la cession de toutes marques, enseignes, noms de domaine, brevets, savoir-faire et droits de propriété intellectuelle se rapportant à l'objet social, y compris par voie de franchise ou de licence, en qualité de franchisé ou de franchiseur ;",
  );
  puce(
    ctx,
    "La participation de la Société, par tous moyens, directement ou indirectement, dans toutes opérations pouvant se rattacher à son objet par voie de création de sociétés nouvelles, d'apport, de souscription ou d'achat de titres ou droits sociaux, de fusion ou autrement, de création, d'acquisition, de location, de prise en location-gérance de tous fonds de commerce ou établissements ;",
  );
  puce(
    ctx,
    "Et, plus généralement, toutes opérations industrielles, commerciales, financières, civiles, mobilières ou immobilières, pouvant se rattacher directement ou indirectement à l'objet social ou à tout objet similaire ou connexe, ou de nature à en favoriser le développement.",
  );

  article(ctx, "ARTICLE 3 - Dénomination sociale");
  ecrire(ctx, `La Société prend la dénomination : ${d.denomination}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Cette dénomination qui doit figurer sur tous les actes et documents émanant de la Société et destinés aux tiers doit être précédée ou suivie des mots « ${libelleForme} » ou de l'abréviation « ${sigleForme} » et de l'indication du capital social.`,
  );

  article(ctx, "ARTICLE 4 - Durée");
  ecrire(
    ctx,
    `La durée de la Société est fixée à ${d.duree_annees} années à compter de son immatriculation au Registre du Commerce et des Sociétés, sauf prorogation ou dissolution anticipée.`,
  );

  article(ctx, "ARTICLE 5 - Exercice social");
  ecrire(ctx, `L'exercice social commence le ${ouverture} et se termine le ${cloture} de chaque année.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Toutefois, par exception, le premier exercice social débutera à compter de la date d'immatriculation de la société au Registre du Commerce et des Sociétés (RCS) et se terminera le ${dateEnLettresFr(
      d.date_cloture_premier_exercice,
    )}.`,
  );

  article(ctx, "ARTICLE 6 - Siège social");
  ecrire(ctx, `Le siège social est fixé : ${d.siege_adresse}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Il peut être transféré en tout lieu du territoire français par simple décision du Président, lequel est habilité à modifier corrélativement les présents statuts. Il peut également être transféré par décision de l'associé unique ou, en cas de pluralité d'associés, par décision collective.",
  );

  article(ctx, "TITRE II - APPORTS - CAPITAL SOCIAL");

  article(ctx, "ARTICLE 7 - Apports");
  ecrire(ctx, "Apports en numéraire :", { bold: true });
  espace(ctx, 4);
  ecrire(
    ctx,
    uni
      ? "L'Associé Unique fait apport à la société des sommes suivantes en numéraire :"
      : "Les Associés font apport à la société des sommes suivantes en numéraire :",
  );
  espace(ctx, 4);
  parts.forEach((a) =>
    ecrire(
      ctx,
      `${a.type === "personne_morale" ? (a.denomination ?? "") : nomCompletPhysique(a)} : ${Number(
        a.montant_apport,
      )} euros`,
    ),
  );
  espace(ctx, 4);
  ecrire(ctx, `Soit au total, une somme de ${totalNumeraire} euros.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Lesdits apports correspondent à ${nbActions} actions de ${nominal} euro(s) chacune.`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    `Les fonds correspondant aux apports en numéraire seront déposés par ${
      uni ? "l'Associé Unique" : "les Associés"
    }, sur le compte ouvert au nom de la Société en formation auprès de ${d.banque_depot}, ainsi qu'il résultera du certificat établi par la banque dépositaire des fonds, sur présentation notamment de l'état des souscriptions mentionnant la somme versée par les associés. L'état des souscriptions joint aux présents statuts est certifié sincère et véritable par le représentant légal de la société.`,
  );

  const cons1424 = consentement1424(d, associes);
  if (cons1424.requis) {
    espace(ctx, 6);
    for (const a of cons1424.apporteurs) {
      ecrire(
        ctx,
        `${nomCompletPhysique(a)} déclare que son conjoint, ${a.conjoint_nom}, a expressément consenti à l'apport du bien commun suivant : ${d.bien_commun_designation}, conformément à l'article 1424 du Code civil, ainsi qu'il en est justifié par le consentement annexé aux présents statuts.`,
      );
    }
  }
  espace(ctx, 6);
  ecrire(
    ctx,
    `Le total des apports consentis à la Société s'élève à la somme de ${montantEnLettresFr(
      capital,
    )} (${capital}) euros.`,
  );

  article(ctx, "ARTICLE 8 - Capital social");
  ecrire(
    ctx,
    `Le capital social est fixé à la somme de ${capital} euros. Il est divisé en ${nbActions} actions de ${nominal} euro(s), ${
      libere
        ? "chacune entièrement libérée"
        : `libérées chacune à hauteur de ${d.capital_liberation} % de leur valeur nominale, soit au moins la moitié conformément à l'article L. 225-3 du Code de commerce, le surplus devant être libéré en une ou plusieurs fois sur appel du Président dans un délai maximum de cinq ans à compter de l'immatriculation de la Société`
    }. Soit, au total, la somme de ${montantEnLettresFr(capital)} (${capital}) euros.`,
  );

  article(ctx, "ARTICLE 9 - Modification du capital social");
  puce(
    ctx,
    "Le capital ne peut être augmenté ou réduit que par une décision collective des associés statuant sur le rapport du Président. Le capital social peut être augmenté soit par émission d'actions ordinaires ou de préférence, soit par majoration du montant nominal des titres de capital existants. Il peut également être augmenté par l'exercice des droits attachés a des valeurs mobilières donnant accès au capital, dans les conditions prévues par la loi.",
  );
  ecrire(
    ctx,
    "Les titres de capital nouveaux sont émis soit à leur montant nominal, soit a ce montant majoré d'une prime d'émission.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Ils sont libérés soit par apport en numéraire y compris par compensation avec des créances liquides et exigibles sur la Société, soit par apport en nature, soit par incorporation de réserves, bénéfices ou primes d'émission, soit en conséquence d'une fusion ou d'une scission. Ils peuvent aussi être libérés consécutivement a l'exercice d'un droit attaché a des valeurs mobilières donnant accès au capital comprenant, le cas échéant, le versement des sommes correspondantes.",
  );
  espace(ctx, 4);
  puce(
    ctx,
    "Les associés peuvent déléguer au Président les pouvoirs nécessaires à l'effet de réaliser ou de décider, dans les conditions et délais prévus par la loi, l'augmentation ou la réduction du capital.",
  );
  puce(
    ctx,
    "En cas d'augmentation du capital en numéraire ou d'émission de valeurs mobilières donnant accès au capital ou donnant droit à l'attribution de titres de créances, les associés ont, sauf stipulations contraires éventuelles des présents statuts concernant les actions de préférence sans droit de vote, proportionnellement au montant de leurs actions, un droit de préférence à la souscription des nouveaux titres émis. Toutefois, les associés peuvent renoncer à titre individuel à leur droit préférentiel de souscription et la décision d'augmentation du capital peut supprimer ce droit préférentiel dans les conditions prévues par la loi.",
  );
  puce(
    ctx,
    "Les actions nouvelles de numéraire doivent obligatoirement être libérées lors de la souscription de la quotité du nominal (ou du pair) prévue par la loi et, le cas échéant, de la totalité de la prime d'émission.",
  );

  article(ctx, "ARTICLE 10 - Comptes courants d'associés");
  ecrire(
    ctx,
    "La Société peut recevoir de ses associés des fonds en dépôt, sous forme d'avances en compte courant.",
  );

  article(ctx, "ARTICLE 11 - Indivisibilité des actions - Usufruit");
  ecrire(ctx, "1 - Les actions sont indivisibles à l'égard de la Société.");
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les copropriétaires d'actions indivises sont représentés aux assemblées générales par l'un d'eux ou par un mandataire commun de leur choix. A défaut d'accord entre eux sur le choix d'un mandataire, celui-ci est désigné par ordonnance du Président du Tribunal de Commerce statuant en référé à la demande du copropriétaire le plus diligent.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "2 - Le droit de vote attaché à l'action appartient à l'usufruitier dans les assemblées générales ordinaires et au nu-propriétaire dans les assemblées générales extraordinaires. Cependant, les titulaires d'actions dont la propriété est démembrée peuvent convenir entre eux de toute autre répartition pour l'exercice du droit de vote aux assemblées générales. En ce cas, ils devront porter leur convention à la connaissance de la Société par lettre recommandée adressée au siège social, la Société étant tenue de respecter cette convention pour toute assemblée qui se réunirait après l'expiration d'un délai d'un mois suivant l'envoi de la lettre recommandée, le cachet de La Poste faisant foi de la date d'expédition.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Nonobstant les dispositions ci-dessus, le nu-propriétaire a le droit de participer a toutes les assemblées générales.",
  );

  article(ctx, "ARTICLE 12 - Droits et obligations attachés aux actions");
  ecrire(
    ctx,
    "1 - Chaque action donne droit dans les bénéfices et l'actif social à une part proportionnelle à la quotité du capital qu'elle représente.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "2 - Les actionnaires ne sont responsables des pertes qu'à concurrence de leurs apports. Les droits et obligations attachés à l'action suivent le titre dans quelque main qu'il passe. La propriété d'une action comporte de plein droit adhésion aux statuts et aux décisions des assemblées générales.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "3 - Les héritiers, créanciers, ayants droit ou autres représentants d'un actionnaire ne peuvent requérir l'apposition de scellés sur les biens et valeurs de la Société, ni en demander le partage ou la licitation. Ils ne peuvent en aucun cas s'immiscer dans les actes de son administration. Ils doivent pour l'exercice de leurs droits s'en remettre aux inventaires sociaux et aux décisions des assemblées générales.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "4 - Chaque fois qu'il sera nécessaire de posséder plusieurs actions pour exercer un droit quelconque, ou encore en cas d'échange, de regroupement ou d'attribution d'actions, ou en conséquence d'une augmentation ou d'une réduction du capital, d'une fusion ou de toute autre opération, les titulaires d'actions isolées ou en nombre inférieur à celui requis ne pourront exercer ce droit qu'à la condition de faire leur affaire personnelle du regroupement et, le cas échéant, de l'achat ou de la vente des actions nécessaires.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "5 - Sauf interdiction légale, il sera fait masse, au cours de l'existence de la Société ou lors de sa liquidation, entre toutes les actions des exonérations et imputations fiscales ainsi que de toutes taxations susceptibles d'être supportées par la Société, avant de procéder à toute répartition ou remboursement, de telle manière que, compte tenu de la valeur nominale et de leur jouissance respective, les actions de même catégorie reçoivent la même somme nette.",
  );

  article(ctx, "ARTICLE 13 - Forme des valeurs mobilières");
  ecrire(
    ctx,
    "Les valeurs mobilières émises par la société sont obligatoirement nominatives. Elles sont inscrites au nom de leur titulaire dans des comptes tenus par la Société ou par un mandataire désigné à cet effet.",
  );
  espace(ctx, 4);
  ecrire(ctx, "Tout associé peut demander la délivrance d'une attestation d'inscription en compte.");

  article(ctx, "ARTICLE 14 - Libération des actions");
  ecrire(
    ctx,
    "1 - Toute souscription d'actions en numéraire est obligatoirement accompagnée du versement de la quotité minimale prévue par la loi et, le cas échéant, de la totalité de la prime d'émission. Le surplus est payable en une ou plusieurs fois aux époques et dans les proportions qui seront fixées par l'organe dirigeant en conformité de la loi. Les appels de fonds sont portés à la connaissance des associés quinze jours au moins avant l'époque fixée pour chaque versement, par lettres recommandées ou email avec demande d'avis de réception. Les associés ont la faculté d'effectuer des versements anticipés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "2 - A défaut de libération des actions à l'expiration du délai fixé par l'organe dirigeant, les sommes exigibles sont, de plein droit, productives d'intérêt au taux de l'intérêt légal, à partir de la date d'exigibilité, le tout sans préjudice des recours et sanctions prévus par la loi.",
  );

  article(ctx, "TITRE III - CESSION - TRANSMISSION D'ACTIONS");

  article(ctx, "ARTICLE 15 - Définitions");
  ecrire(ctx, "Dans le cadre des présents statuts, les soussignés sont convenus des définitions ci-après :");
  espace(ctx, 4);
  puce(
    ctx,
    "Cession : signifie toute opération à titre onéreux ou gratuit entrainant le transfert de la pleine propriété, de la nue-propriété ou de l'usufruit des valeurs mobilières émises par la Société, à savoir : cession, échange, apport en Société, fusion et opération assimilée, cession judiciaire, nantissement, liquidation.",
  );
  puce(
    ctx,
    "Action ou Valeur mobilière : signifie les valeurs mobilières émises par la Société donnant accès de façon immédiate ou différée et de quelque manière que ce soit, à l'attribution d'un droit au capital et/ou d'un droit de vote de la Société, ainsi que les bons et droits de souscription et d'attribution attachés à ces valeurs mobilières.",
  );

  article(ctx, "ARTICLE 16 - Transmission des actions");
  ecrire(
    ctx,
    "La transmission des actions émises par la Société s'opère par un virement de compte à compte sur production d'un ordre de mouvement. Ce mouvement est inscrit sur le registre des mouvements coté et paraphé.",
  );

  article(ctx, "ARTICLE 17 - Agrément des cessions");
  ecrire(ctx, "Agrément pour toutes les cessions", { bold: true });
  espace(ctx, 4);
  [
    "1. Les actions ne peuvent être cédées y compris entre associés qu'avec l'agrément préalable de la collectivité des associés statuant à la majorité des voix des associés disposant du droit de vote.",
    "2. La demande d'agrément doit être notifiée par lettre recommandée avec demande d'avis de réception adressée au Président de la Société et indiquant le nombre d'actions dont la cession est envisagée, le prix de la cession, les nom, prénoms, adresse, nationalité de l'acquéreur ou s'il s'agit d'une personne morale, son identification complète (dénomination, siège social, numéro RCS, montant et répartition du capital, identité de ses dirigeants sociaux). Cette demande d'agrément est transmise par le Président aux associés.",
    "3. Le Président dispose d'un délai de trois (3) mois à compter de la réception de la demande d'agrément pour faire connaître au Cédant la décision de la collectivité des associés. Cette notification est effectuée par lettre recommandée avec demande d'avis de réception. A défaut de réponse dans le délai ci-dessus, l'agrément sera réputé acquis.",
    "4. Les décisions d'agrément ou de refus d'agrément ne sont pas motivées.",
    "5. En cas d'agrément, l'associé Cédant peut réaliser librement la cession aux conditions notifiées dans sa demande d'agrément. Le transfert des actions doit être réalisé au plus tard dans les 15 jours de la décision d'agrément : à défaut de réalisation du transfert dans ce délai, l'agrément serait frappé de caducité.",
    "6. En cas de refus d'agrément, la Société est tenue dans un délai d'un (1) mois à compter de la notification du refus d'agrément, d'acquérir ou de faire acquérir les actions de l'associé Cédant par un ou plusieurs tiers agréés selon la procédure ci-dessus prévue.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });
  ecrire(
    ctx,
    "Si le rachat des actions n'est pas réalisé du fait de la Société dans ce délai d'un mois, l'agrément du ou des cessionnaires est réputé acquis.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas d'acquisition des actions par la Société, celle-ci est tenue dans un délai de six (6) mois a compter de l'acquisition de les céder ou de les annuler.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le prix de rachat des actions par un tiers ou par la Société est déterminé d'un commun accord entre les parties. A défaut d'accord, le prix sera déterminé à dire d'expert, dans les conditions de l'article 1843-4 du Code civil.",
  );

  article(ctx, "ARTICLE 18 - Modifications dans le contrôle d'un associé");
  ecrire(
    ctx,
    "1. En cas de modification au sens de l'article L. 233-3 du Code de commerce du contrôle d'une société associée, celle-ci doit en informer la Société par lettre recommandée avec demande d'avis de réception adressée au Président dans un délai de trente jours du changement de contrôle. Cette notification doit préciser la date du changement de contrôle et toutes informations sur le ou les nouveaux contrôlaires.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Si cette procédure n'est pas respectée, la Société associée dont le contrôle est modifié pourra être exclue de la Société dans les conditions prévues à l'article « Exclusion d'un associé ».",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "2. Dans le délai de sept jours à compter de la réception de la notification du changement de contrôle, la Société peut mettre en œuvre la procédure d'exclusion et de suspension des droits non pécuniaires de la Société associée dont le contrôle a été modifié, telle que prévue à l'article « Exclusion d'un associé ». Si la Société n'engage pas la procédure d'exclusion dans le délai ci-dessus, elle sera réputée avoir agréé le changement de contrôle.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "3. Les dispositions ci-dessus s'appliquent à la Société associée qui a acquis cette qualité a la suite d'une opération de fusion, de scission ou de dissolution.",
  );

  article(ctx, "ARTICLE 19 - Exclusion d'un associé");
  ecrire(ctx, "Exclusion de plein droit", { bold: true });
  espace(ctx, 4);
  ecrire(
    ctx,
    "L'exclusion de plein droit intervient en cas de dissolution, de redressement ou de liquidation judiciaire d'un associé.",
  );
  espace(ctx, 6);
  ecrire(ctx, "Exclusion facultative", { bold: true });
  espace(ctx, 4);
  ecrire(ctx, "Cas d'exclusion");
  espace(ctx, 4);
  ecrire(ctx, "L'exclusion d'un associé peut être également prononcée dans les cas suivants :");
  espace(ctx, 4);
  [
    "violation des dispositions des présents statuts ;",
    "exercice direct ou indirect d'une activité concurrente de celle exercée par la Société ;",
    "révocation d'un associé de ses fonctions de mandataire social ;",
    "condamnation pénale prononcée à l'encontre d'un associé.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    "L'exclusion est prononcée par décision du Président, après notification à l'associé concerné par lettre recommandée avec demande d'avis de réception, de la procédure d'exclusion en cours, adressée 15 jours avant la date prévue pour la décision d'exclusion, et des motifs de cette mesure afin de lui permettre de faire valoir ses arguments en défense soit par lui-même, soit par l'intermédiaire de son ou de ses représentants légaux. Lorsque la procédure d'exclusion vise l'associé exerçant les fonctions de Président, l'exclusion est prononcée par décision collective des associés, l'associé concerné participant au vote.",
  );
  espace(ctx, 6);
  ecrire(ctx, "Prise d'effet de la décision d'exclusion", { bold: true });
  espace(ctx, 4);
  ecrire(ctx, "La décision d'exclusion prend effet à compter de son prononcé.");
  espace(ctx, 6);
  ecrire(ctx, "Rachat des actions de l'associé exclu", { bold: true });
  espace(ctx, 4);
  ecrire(
    ctx,
    "L'associé exclu doit céder la totalité de ses actions, dans un délai de trente (30) jours à compter de la décision d'exclusion, à toute personne désignée par cette décision, associée ou non, ou à la Société elle-même, laquelle est alors tenue de les céder ou de les annuler dans un délai de six (6) mois. Le prix de rachat est fixé d'un commun accord entre les parties ; à défaut d'accord, il est déterminé à dire d'expert dans les conditions de l'article 1843-4 du Code civil.",
  );

  article(ctx, "ARTICLE 20 - Nullité des cessions d'actions");
  ecrire(
    ctx,
    "Toutes les cessions d'actions effectuées en violation des dispositions des articles « Agrément des cessions » et « Modifications dans le contrôle d'un associé » des présents statuts sont nulles.",
  );
  espace(ctx, 4);
  ecrire(ctx, "Au surplus, une telle cession constitue un juste motif d'exclusion.");

  article(ctx, "TITRE IV - ADMINISTRATION DE LA SOCIETE");

  article(ctx, "ARTICLE 21 - Président de la Société");
  ecrire(
    ctx,
    "La Société est représentée, dirigée et administrée par un Président, personne physique ou morale, associé ou non, de la Société.",
  );
  espace(ctx, 6);
  ecrire(ctx, "Désignation", { bold: true });
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le premier Président de la Société est désigné aux termes des présents statuts. Le Président est ensuite désigné par décision collective des associés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Lorsque le Président est une personne morale, celle-ci doit obligatoirement désigner un représentant permanent personne physique.",
  );
  espace(ctx, 6);
  ecrire(ctx, "Durée des fonctions", { bold: true });
  espace(ctx, 4);
  ecrire(ctx, "Le Président est nommé sans limitation de durée.");
  espace(ctx, 6);
  ecrire(ctx, "Rémunération", { bold: true });
  espace(ctx, 4);
  ecrire(ctx, "La rémunération du Président est fixée chaque année par décision collective des associés.");
  espace(ctx, 6);
  ecrire(ctx, "Pouvoirs", { bold: true });
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le Président dirige la Société et la représente à l'égard des tiers. A ce titre, il est investi de tous les pouvoirs nécessaires pour agir en toute circonstance au nom de la Société, dans la limite de l'objet social et des pouvoirs expressément dévolus par les dispositions légales et les présents statuts aux décisions collectives des associés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le Président peut, sous sa responsabilité, consentir toutes délégations de pouvoirs à tout tiers pour un ou plusieurs objets déterminés.",
  );

  article(ctx, "ARTICLE 22 - Directeur général");
  ecrire(
    ctx,
    "Le Président peut être assisté d'un ou plusieurs Directeurs généraux, personnes physiques ou morales, associés ou non.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le Directeur général est nommé par décision de l'associé unique ou, en cas de pluralité d'associés, par décision collective, laquelle fixe la durée de ses fonctions et, le cas échéant, sa rémunération.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Conformément à l'article L. 227-6 du Code de commerce, le Directeur général dispose, à l'égard des tiers, des mêmes pouvoirs de direction et de représentation que le Président. La décision de nomination peut limiter ses pouvoirs dans l'ordre interne ; ces limitations sont inopposables aux tiers.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le Directeur général est révocable à tout moment, sans préavis ni indemnité, par décision de l'associé unique ou de la collectivité des associés. En cas de décès, de démission ou d'empêchement du Président, le Directeur général en fonction conserve ses attributions et assure la direction de la Société jusqu'à la désignation d'un nouveau Président.",
  );

  article(ctx, "TITRE V - CONVENTIONS REGLEMENTEES - COMMISSAIRES AUX COMPTES");

  article(ctx, "ARTICLE 23 - Conventions entre la Société et ses dirigeants ou associés");
  ecrire(
    ctx,
    "Lorsque la Société ne comprend qu'un seul associé, il est seulement fait mention au registre des décisions des conventions intervenues, directement ou par personne interposée, entre la Société et son dirigeant ou son associé unique, conformément au dernier alinéa de l'article L. 227-10 du Code de commerce.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas de pluralité d'associés, toute convention intervenant, directement ou par personne interposée, entre la Société et son Président, l'un de ses dirigeants, l'un de ses associés disposant d'une fraction des droits de vote supérieure à 10 % ou, s'il s'agit d'une société associée, la société la contrôlant au sens de l'article L. 233-3 du Code de commerce, donne lieu à un rapport du Président sur les conventions conclues au cours de l'exercice écoulé.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les associés statuent sur ce rapport lors de la décision collective statuant sur les comptes de cet exercice. Les conventions non approuvées produisent néanmoins leurs effets, à charge pour la personne intéressée d'en supporter les conséquences dommageables pour la Société.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les dispositions qui précèdent ne s'appliquent pas aux conventions portant sur des opérations courantes et conclues à des conditions normales.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les interdictions prévues à l'article L. 225-43 du Code de commerce s'appliquent, dans les conditions déterminées par cet article, au Président et aux dirigeants de la Société.",
  );

  article(ctx, "ARTICLE 24 - Commissaires aux comptes");
  ecrire(
    ctx,
    "La collectivité des associés désigne, lorsque cela est obligatoire en vertu des dispositions légales et réglementaires, pour la durée, dans les conditions et avec la mission fixée par la loi, notamment en ce qui concerne le contrôle des comptes sociaux, un ou plusieurs commissaires aux comptes titulaires et un ou plusieurs commissaires aux comptes suppléants.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Lorsque la désignation d'un commissaire aux comptes titulaire et d'un commissaire aux comptes suppléant demeure facultative, c'est à la collectivité des associés, statuant dans les conditions prévues par les présents statuts pour les décisions de l'associé unique ou les décisions collectives, qu'il appartient de procéder à de telles désignations, si elle le juge opportun.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En outre, la nomination d'un commissaire aux comptes pourra être demandée en justice par un ou plusieurs associés représentant au moins le dixième du capital.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les commissaires aux comptes doivent être invités à participer à toutes les décisions collectives dans les mêmes conditions que les associés.",
  );

  article(ctx, "TITRE VI - DÉCISIONS DE L'ASSOCIÉ UNIQUE ET DÉCISIONS COLLECTIVES");

  article(ctx, "ARTICLE 25 - Décisions de l'associé unique");
  ecrire(
    ctx,
    "Lorsque la Société ne compte qu'un seul associé, celui-ci exerce seul les pouvoirs dévolus par la loi et les présents statuts à la collectivité des associés. Il ne peut déléguer ces pouvoirs.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les décisions de l'associé unique sont prises à son initiative ou sur proposition du Président. Elles sont constatées par des procès-verbaux datés et signés par l'associé unique, répertoriés dans un registre coté et paraphé, conformément à l'article L. 227-9 du Code de commerce. Les décisions prises en violation de ces dispositions peuvent être annulées à la demande de tout intéressé.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Tant que la Société est unipersonnelle, les dispositions des présents statuts relatives aux convocations, à la tenue des assemblées, à la représentation des associés et aux règles de quorum et de majorité sont sans objet.",
  );

  article(ctx, "ARTICLE 26 - Décisions collectives obligatoires");
  ecrire(ctx, "La collectivité des associés est seule compétente pour prendre les décisions suivantes :");
  espace(ctx, 4);
  [
    "transformation de la Société ;",
    "modification du capital social : augmentation (sous réserve des éventuelles délégations qu'elle pourrait consentir, dans les conditions prévues par la loi), amortissement et réduction ;",
    "fusion, scission, apport partiel d'actifs ;",
    "dissolution ;",
    "nomination des commissaires aux comptes ;",
    "nomination et rémunération du Président ;",
    "nomination, rémunération et révocation du ou des Directeurs généraux ;",
    "approbation des comptes annuels et affectation des résultats ;",
    "approbation des conventions conclues entre la Société et ses dirigeants ou associés ;",
    "modification des statuts, sauf transfert du siège social ;",
    "nomination du Liquidateur et décisions relatives aux opérations de liquidation ;",
    "agrément des cessions d'actions ;",
    "exclusion d'un associé et suspension de ses droits de vote.",
  ].forEach((t) => puce(ctx, t));

  article(ctx, "ARTICLE 27 - Règles de majorité");
  ecrire(
    ctx,
    "Sauf stipulations spécifiques contraires et expresses des présents statuts, les décisions collectives des associés sont adoptées a la majorité des voix des associés disposant du droit de vote, présents ou représentés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Sous la même réserve, le droit de vote attaché aux actions est proportionnel à la quotité du capital qu'elles représentent. Chaque action donne droit à une voix au moins.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Par exception aux dispositions qui précèdent, les décisions collectives limitativement énumérées ci-après doivent être adoptées à l'unanimité des associés disposant du droit de vote :",
  );
  espace(ctx, 4);
  [
    "celles prévues par les dispositions légales ;",
    "les décisions ayant pour effet d'augmenter les engagements des associés, et notamment l'augmentation du capital par majoration du montant nominal des titres de capital autrement que par incorporation de réserves, bénéfices ou primes d'émission (art. L. 225-130, al. 2 du Code de commerce) ;",
    "la prorogation de la Société ;",
    "la dissolution de la Société ;",
    "la transformation de la Société en Société d'une autre forme.",
  ].forEach((t) => puce(ctx, t));

  article(ctx, "ARTICLE 28 - Modalités des décisions collectives");
  ecrire(ctx, "Les décisions collectives sont prises sur convocation ou à l'initiative du Président.");
  espace(ctx, 4);
  ecrire(
    ctx,
    "Elles résultent de la réunion d'une assemblée ou d'un procès-verbal signé par tous les associés. Elles peuvent également être prises par tous moyens de télécommunication électronique. Pendant la période de liquidation de la Société, les décisions collectives sont prises sur convocation ou à l'initiative du Liquidateur.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Tout associé a le droit de participer aux décisions collectives, personnellement ou par mandataire, ou à distance, par voie électronique, dans les conditions prévues par la loi et les présents statuts, quel que soit le nombre d'actions qu'il possède. I1 doit justifier de son identité et de l'inscription en compte de ses actions au jour de la décision collective trois jours ouvrés au moins avant celle-ci, à zéro heure, heure de Paris.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Il ne sera tenu compte d'aucun transfert de propriété des titres intervenant entre la date de réception, par la Société, des procurations et votes à distance et la date requise pour l'inscription en compte des titres. En conséquence, les procurations et votes à distance préalablement émis par l'associé cédant demeureront valides et inchangés.",
  );

  article(ctx, "ARTICLE 29 - Assemblées");
  [
    "Les associés se réunissent en assemblée sur convocation du Président au siège social ou en tout autre lieu mentionné dans la convocation.",
    "Toutefois, tout associé disposant de plus de 10 % du capital peut demander la convocation d'une assemblée.",
    "La convocation est effectuée par tous moyens de communication écrite quinze jours au moins avant la date de la réunion. Elle indique l'ordre du jour.",
    "Toutefois, l'assemblée peut se réunir sans délai si tous les associés y consentent. L'assemblée est présidée par le Président ou, en son absence, par un associé désigné par l'assemblée.",
    "Les associés peuvent se faire représenter aux délibérations de l'assemblée par un autre associé ou par un tiers. Les pouvoirs peuvent être donnés par tous moyens écrits et notamment par télécopie.",
    "Les règles relatives à la représentation des associés pour les décisions collectives de la Société, et notamment celles concernant les modalités du vote par procuration, le contenu, les mentions obligatoires et les documents et informations joints à toute formule de procuration, sont celles applicables à la représentation des actionnaires aux assemblées dans les SA.",
    "Les associés peuvent également participer à distance aux décisions collectives, au moyen d'un formulaire de vote à distance ou d'un document unique de vote, dans les conditions et selon les modalités prévues pour les SA.",
    "En cas de vote à distance au moyen d'un formulaire de vote électronique, ou d'un vote par procuration donné par signature électronique, celui-ci s'exerce dans les conditions prévues par la réglementation en vigueur, soit sous la forme d'une signature électronique sécurisée selon les conditions légales en vigueur, soit sous la forme d'un procédé fiable d'identification garantissant son lien avec l'acte auquel elle se rattache.",
    "Lors de chaque assemblée, le président de séance pourra choisir d'établir une feuille de présence mentionnant l'identité de chaque associé, le nombre d'actions et le nombre de voix dont il dispose, qu'il certifiera après l'avoir fait émarger par les associés présents ou leurs représentants, ou de mentionner l'identité des associés présents ou représentés ainsi que le nombre d'actions et de voix dont chacun dispose.",
    "Le Président de Séance établit un procès-verbal des délibérations devant contenir les mentions prévues à l'article ci-après.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 30 - Procès-verbaux des décisions collectives");
  [
    "Les décisions collectives prises en assemblée doivent être constatées par écrit dans des procès-verbaux établis sur un registre spécial ou sur des feuilles mobiles numérotées. Les procès-verbaux sont signés par le Président de l'Assemblée et par les associés présents.",
    "Les procès-verbaux doivent indiquer la date et le lieu de la réunion, les nom, prénoms et qualité du Président de Séance, l'identité des associés présents et représentés, les documents et informations communiqués préalablement aux associés, un résumé des débats, ainsi que le texte des résolutions mises aux voix et pour chaque résolution le sens du vote de chaque associé.",
    "En cas de décision collective résultant du consentement unanime de tous les associés exprimé dans un acte, cet acte doit mentionner les documents et informations communiqués préalablement aux associés. Il est signé par tous les associés et retranscrit sur le registre spécial ou sur les feuilles mobiles numérotées visés ci-dessus.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 31 - Information préalable des associés");
  [
    "Quel que soit le mode de consultation, toute décision des associés doit avoir fait l'objet d'une information préalable comprenant tous les documents et informations permettant aux associés de se prononcer en connaissance de cause sur la ou les résolutions soumises à leur approbation.",
    "Lorsque les décisions collectives doivent être prises en application de la loi sur le ou les rapports du Président et/ou des commissaires aux comptes, si la société en est dotée, le ou les rapports doivent être communiqués aux associés quinze jours avant la date d'établissement du procès-verbal de la décision des associés.",
    "Les associés peuvent à toute époque mais sous réserve de ne pas entraver la bonne marche de la Société, consulter au siège social, et, le cas échéant prendre copie, pour les trois derniers exercices, des registres sociaux, de l'inventaire et des comptes annuels, du tableau des résultats des cinq derniers exercices, des comptes consolidés, s'il y a lieu, des rapports de gestion du Président et des rapports des commissaires aux comptes, si la Société en est dotée.",
    "S'agissant de la décision collective statuant sur les comptes annuels, les associés peuvent obtenir communication aux frais de la Société des comptes annuels et, le cas échéant, des comptes consolidés du dernier exercice.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 32 - Droit de communication des associés");
  ecrire(
    ctx,
    "Le droit de communication des associés, la nature des documents mis à leur disposition et les modalités de leur mise à disposition ou de leur envoi s'exercent dans les conditions prévues par les dispositions légales et réglementaires.",
  );

  article(ctx, "TITRE VII - COMPTES ANNUELS - AFFECTATION DES RESULTATS");

  article(ctx, "ARTICLE 33 - Etablissement et approbation des comptes annuels");
  [
    "Le Président établit les comptes annuels de l'exercice.",
    "Les associés doivent statuer par décision collective sur les comptes annuels, au vu du rapport de gestion et des rapports du ou des commissaires aux comptes, si la société en est dotée. Lorsque des comptes consolidés sont établis, ils sont présentés avec le rapport de gestion du groupe et les rapports des commissaires aux comptes, lors de cette décision collective.",
    "Lorsque la Société ne comprend qu'un seul associé et que celui-ci, personne physique, assume personnellement la présidence de la Société, le dépôt au registre du commerce et des sociétés, dans les six mois de la clôture de l'exercice, de l'inventaire et des comptes annuels dûment signés vaut approbation des comptes, conformément au dernier alinéa de l'article L. 227-9 du Code de commerce.",
    "L'associé unique est en outre dispensé d'établir un rapport de gestion lorsque la Société répond, à la clôture de l'exercice, à la définition des petites entreprises au sens de l'article L. 232-1, IV du Code de commerce.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 34 - Affectation et répartition des résultats");
  ecrire(
    ctx,
    "1. Toute action en l'absence de catégorie d'actions ou toute action d'une même catégorie dans le cas contraire, donne droit a une part nette proportionnelle a la quote-part du capital qu'elle représente, dans les bénéfices et réserves ou dans l'actif social, au cours de l'existence de la Société comme en cas de liquidation.",
  );
  espace(ctx, 4);
  ecrire(ctx, "Chaque action supporte les pertes sociales dans les mêmes proportions.");
  espace(ctx, 4);
  ecrire(
    ctx,
    "2. Après approbation des comptes et constatation de l'existence d'un bénéfice distribuable, les associés décident sa distribution, en totalité ou en partie, ou son affectation a un ou plusieurs postes de réserves dont ils règlent l'affectation et l'emploi.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "3. La décision collective des associés peut décider la mise en distribution de toute somme prélevée sur le report à nouveau bénéficiaire ou sur les réserves disponibles en indiquant expressément les postes de réserves sur lesquels ces prélèvements sont effectués. Toutefois, les dividendes sont prélevés par priorité sur le bénéfice distribuable de l'exercice.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "La décision collective des associés ou, à défaut, le Président, fixe les modalités de paiement des dividendes.",
  );

  article(ctx, "TITRE VIII - LIQUIDATION - DISSOLUTION");

  article(ctx, "ARTICLE 35 - Dissolution - Liquidation de la Société");
  [
    "La Société est dissoute dans les cas prévus par la loi par décision collective des associés prononçant la dissolution anticipée.",
    "La décision collective des associés qui constate ou décide la dissolution nomme un ou plusieurs Liquidateurs.",
    "Le Liquidateur, ou chacun d'eux s'ils sont plusieurs, représente la Société. Il dispose des pouvoirs les plus étendus pour réaliser l'actif même à l'amiable. Il est habilité a payer les créanciers sociaux et à répartir le solde disponible entre les associés.",
    "Les associés peuvent autoriser le Liquidateur à continuer les affaires sociales en cours et à en engager de nouvelles pour les seuls besoins de la liquidation.",
    "Le produit net de la liquidation, après apurement du passif, est employé au remboursement intégral du capital libéré et non amorti des actions.",
    "Le surplus, s'il en existe, est réparti entre les associés proportionnellement au nombre d'actions de chacun d'eux.",
    "Les pertes, s'il en existe, sont supportées par les associés jusqu'à concurrence du montant de leurs apports.",
    "Si toutes les actions sont réunies en une seule main, la dissolution de la Société entraîne, lorsque l'associé unique est une personne morale, la transmission universelle du patrimoine à l'associé unique, sans qu'il y ait lieu à liquidation, conformément aux dispositions de l'article 1844-5 du Code civil.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(
    ctx,
    "TITRE IX - DESIGNATION DES ORGANES SOCIAUX - ACTES ACCOMPLIS POUR LA SOCIETE EN FORMATION",
  );

  article(ctx, "ARTICLE 36 - Nomination des dirigeants");
  const presidentPm = president.type === "personne_morale";
  const presidentFeminin = !presidentPm && feminin(president);
  ecrire(
    ctx,
    `${presidentFeminin ? "La première Présidente" : "Le premier Président"} de la Société nommé${
      presidentFeminin ? "e" : ""
    } aux termes des présents statuts sans limitation de durée est :`,
  );
  espace(ctx, 4);
  comparution(president).forEach((l) => ecrire(ctx, l));
  espace(ctx, 4);
  ecrire(
    ctx,
    `${presidentFeminin ? "Laquelle" : "Lequel"} déclare accepter lesdites fonctions et satisfaire à toutes les conditions requises par la loi et les règlements pour leur exercice.`,
  );
  if (dg) {
    const dgFeminin = dg.type !== "personne_morale" && feminin(dg);
    espace(ctx, 6);
    ecrire(
      ctx,
      `Est également nommé${dgFeminin ? "e" : ""} en qualité de ${
        dgFeminin ? "Directrice générale" : "Directeur général"
      }, sans limitation de durée :`,
    );
    espace(ctx, 4);
    comparution(dg).forEach((l) => ecrire(ctx, l));
    espace(ctx, 4);
    ecrire(
      ctx,
      `${dgFeminin ? "Laquelle" : "Lequel"} déclare accepter lesdites fonctions et satisfaire à toutes les conditions requises par la loi et les règlements pour leur exercice.`,
    );
  }

  article(ctx, "ARTICLE 37 - Formalités de publicité - Immatriculation");
  ecrire(
    ctx,
    "Tous pouvoirs sont conférés au porteur d'un original des présentes à l'effet d'accomplir les formalités de publicité, de dépôt et autres nécessaires pour parvenir à l'immatriculation de la Société au registre du commerce et des sociétés.",
  );
  espace(ctx, 10);
  ecrire(
    ctx,
    `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}, en autant d'exemplaires originaux que requis.`,
    { bold: true },
  );
  espace(ctx, 14);
  const signatures = () => {
    for (const a of parts) {
      const nom = a.type === "personne_morale" ? (a.denomination as string) : nomCompletPhysique(a);
      const estPresident = a.id === president.id;
      ecrire(ctx, estPresident ? `${nom} — ${presidentFeminin ? "La Présidente" : "Le Président"}` : nom);
      espace(ctx, 22);
    }
  };
  signatures();

  article(ctx, "ANNEXE");
  article(ctx, "I. ETAT DES ACTES ACCOMPLIS POUR LE COMPTE DE LA SOCIETE EN FORMATION");
  ecrire(ctx, "NEANT");
  article(ctx, "II. ETAT DES ACTES A ACCOMPLIR POUR LE COMPTE DE LA SOCIETE EN FORMATION");
  ecrire(
    ctx,
    uni ? (feminin(premier) ? "La soussignée :" : "Le soussigné :") : "Les soussignés :",
  );
  espace(ctx, 4);
  parts.forEach((a) => {
    ecrire(ctx, comparutionCourte(a));
    espace(ctx, 4);
  });
  ecrire(
    ctx,
    `Agissant en qualité d'associé${uni ? "" : "s"} de la société ${d.denomination}, ${libelleForme} au capital de ${capital} euros, en cours de formation, dont le siège social est situé ${d.siege_adresse}, ${
      uni ? "déclare se donner mandat" : "déclarent donner mandat"
    }, ${uni ? "en tant que Président(e)" : "au Président désigné à l'article 36"}, de prendre pour le compte de la société les engagements ci-après :`,
  );
  espace(ctx, 6);
  [
    "Dépôt du capital social auprès d'un établissement bancaire ;",
    "Ouverture d'un compte courant auprès d'un établissement bancaire ;",
    "De procéder ou de faire procéder à toutes les formalités de constitution prescrites par la loi et de requérir l'immatriculation de la société au Registre du Commerce et des Sociétés ;",
    "De prendre tous engagements devant permettre à la société, dès qu'elle aura la pleine capacité, de poursuivre son activité, prendre, accepter, exécuter tous travaux et marchés, traiter et s'engager envers tous clients et fournisseurs, procéder a tous achats et ventes nécessaires à leur exécution, et de procéder à tous les investissements nécessaires ;",
    "D'assurer les dépenses courantes en ce qu'elles concernent la mise en fonctionnement de la société ;",
    "D'encaisser et régler les sommes, faire toutes déclarations, signer toutes pièces et en général faire le nécessaire.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    "Les susnommés tiendront avec exactitude la comptabilité de ces opérations dont le bénéfice et les charges seront repris par la société du fait même de son immatriculation au Registre du Commerce et des Sociétés.",
  );
  espace(ctx, 10);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 14);
  signatures();

  return fin(ctx);
}

/* ------------------------------ STATUTS ------------------------------ */

async function statuts(d: Dossier, associes: Associe[]) {
  const forme = d.forme_juridique as Forme;
  if (isSas(forme)) return statutsSas(d, associes);

  const ctx = await creerCtx(
    `Statuts — ${forme}`,
    `${d.denomination || "[dénomination]"} — document généré à partir des informations saisies`,
  );

  titre(ctx, "Les soussignés");
  associes.filter((a) => a.est_associe).forEach((a) => ecrire(ctx, `— ${identite(a)}.`));
  espace(ctx, 6);
  ecrire(ctx, `ont établi ainsi qu'il suit les statuts de la société ${forme} devant exister entre eux.`);

  titre(ctx, "Article 1 — Forme");
  ecrire(ctx, `La société est une ${forme} régie par les dispositions légales et réglementaires en vigueur ainsi que par les présents statuts.`);

  titre(ctx, "Article 2 — Dénomination");
  ecrire(ctx, `La dénomination sociale est : ${d.denomination || "[dénomination]"}${d.sigle ? `, sigle : ${d.sigle}` : ""}.`);

  titre(ctx, "Article 3 — Objet");
  ecrire(ctx, `La société a pour objet, en France et à l'étranger : ${d.objet_social || "[objet social]"}`);
  aValider(ctx, "activités connexes et opérations se rattachant à l'objet");

  titre(ctx, "Article 4 — Siège social");
  ecrire(ctx, `Le siège social est fixé : ${d.siege_adresse || "[adresse du siège]"}.`);
  if (d.siege_type === "domiciliataire") {
    ecrire(ctx, `Société domiciliataire : ${d.domiciliataire_nom ?? "[nom]"} — agrément n° ${d.domiciliataire_agrement ?? "[n° d'agrément]"}.`);
  }
  aValider(ctx, "modalités de transfert du siège");

  titre(ctx, "Article 5 — Durée");
  ecrire(ctx, `La durée de la société est de ${d.duree_annees} années à compter de son immatriculation au registre du commerce et des sociétés, sauf dissolution anticipée ou prorogation.`);

  titre(ctx, "Article 6 — Capital social et répartition");
  ecrire(ctx, `Le capital social est fixé à ${euro(Number(d.capital_montant))}. Il est libéré à hauteur de ${d.capital_liberation} % à la constitution.`);
  ecrire(ctx, `Les apports sont effectués en numéraire. Répartition :`);
  associes
    .filter((a) => a.est_associe)
    .forEach((a) =>
      ecrire(
        ctx,
        `— ${nomComplet(a)} : ${a.nb_titres} ${isSas(forme) ? "actions" : "parts sociales"}, apport de ${euro(Number(a.montant_apport))}.`,
      ),
    );
  const avertis = associes.filter((a) => a.est_associe && conjointConcerne(d, a));
  if (avertis.length > 0) {
    espace(ctx, 6);
    for (const a of avertis) {
      ecrire(
        ctx,
        `${nomComplet(a)} déclare que son conjoint, ${a.conjoint_nom?.trim() || "[prénom et nom du conjoint à compléter]"}, a été averti de l'apport de biens communs réalisé au présent acte, conformément à l'article 1832-2 du Code civil, ainsi qu'il en est justifié par le courrier d'information annexé aux présents statuts.`,
      );
    }
  }
  const cons = consentement1424(d, associes);
  if (cons.requis) {
    espace(ctx, 6);
    for (const a of cons.apporteurs) {
      ecrire(
        ctx,
        `${nomComplet(a)} déclare que son conjoint, ${a.conjoint_nom?.trim() || "[prénom et nom du conjoint à compléter]"}, a expressément consenti à l'apport du bien commun suivant : ${d.bien_commun_designation?.trim() || "[désignation du bien]"}, conformément à l'article 1424 du Code civil, ainsi qu'il en est justifié par le consentement annexé aux présents statuts.`,
      );
    }
  }
  aValider(ctx, "modalités de libération du solde et de variation du capital");

  titre(ctx, isSas(forme) ? "Article 7 — Actions" : "Article 7 — Parts sociales");
  aValider(ctx, isSas(forme) ? "forme, transmission et agrément des actions" : "cession et transmission des parts sociales");

  titre(ctx, "Article 8 — Direction");
  associes
    .filter((a) => a.est_dirigeant)
    .forEach((a) => ecrire(ctx, `— ${nomComplet(a)}, ${a.fonction ?? "dirigeant"}.`));
  aValider(ctx, "pouvoirs, durée du mandat, révocation et rémunération du dirigeant");

  titre(ctx, "Article 9 — Décisions collectives");
  aValider(ctx, "règles de majorité, de quorum et de convocation");

  titre(ctx, "Article 10 — Exercice social");
  ecrire(ctx, `L'exercice social est clos le ${d.date_cloture_exercice} de chaque année. Le premier exercice sera clos le ${d.date_cloture_exercice} suivant l'immatriculation.`);

  titre(ctx, "Article 11 — Affectation du résultat");
  aValider(ctx, "réserve légale et affectation du résultat");

  titre(ctx, "Article 12 — Dissolution et liquidation");
  aValider(ctx, "modalités de dissolution et de liquidation");

  espace(ctx, 20);
  ecrire(ctx, `Fait en autant d'exemplaires que requis, le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 16);
  associes.filter((a) => a.est_associe).forEach((a) => {
    ecrire(ctx, `${nomComplet(a)}`);
    ecrire(ctx, "Signature :", { color: GRIS });
    espace(ctx, 18);
  });
  return fin(ctx);
}

/* ------------------------- AUTRES DOCUMENTS ------------------------- */

async function nonCondamnation(d: Dossier, a: Associe | undefined) {
  const ctx = await creerCtx(
    "Déclaration de non-condamnation et attestation de filiation",
    `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`,
  );
  ecrire(ctx, `Je soussigné(e) ${a ? identite(a) : "[dirigeant]"},`);
  espace(ctx, 8);
  ecrire(ctx, `agissant en qualité de ${a?.fonction ?? "dirigeant"} de la société ${d.denomination || "[dénomination]"},`);
  espace(ctx, 8);
  ecrire(ctx, "déclare sur l'honneur n'avoir fait l'objet d'aucune condamnation pénale ni d'aucune sanction civile ou administrative de nature à m'interdire de gérer, d'administrer ou de diriger une personne morale, ou d'exercer une activité commerciale.");
  espace(ctx, 8);
  ecrire(ctx, `Attestation de filiation : né(e) de ${a?.prenom ? "[prénom et nom du père]" : "[prénom et nom du père]"} et de [prénom et nom de naissance de la mère].`);
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature :", { color: GRIS });
  return fin(ctx);
}

async function attestationDomiciliation(d: Dossier, associes: Associe[]) {
  const dir = associes.find((a) => a.est_dirigeant);
  const ctx = await creerCtx("Attestation de domiciliation", `${d.denomination || "[dénomination]"}`);
  ecrire(ctx, `Je soussigné(e) ${dir ? nomComplet(dir) : "[dirigeant]"}, représentant légal de la société ${d.denomination || "[dénomination]"},`);
  espace(ctx, 8);
  ecrire(ctx, `atteste domicilier le siège social de la société à l'adresse suivante : ${d.siege_adresse || "[adresse]"}.`);
  espace(ctx, 8);
  ecrire(ctx, "Je déclare occuper ce local et n'avoir connaissance d'aucune disposition légale, contractuelle ou de règlement de copropriété s'y opposant. Le cas échéant, la domiciliation est limitée à cinq ans.");
  aValider(ctx, "vérification du bail et du règlement de copropriété");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature :", { color: GRIS });
  return fin(ctx);
}

async function listeSouscripteurs(d: Dossier, associes: Associe[]) {
  const ctx = await creerCtx("Liste des souscripteurs", `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`);
  ecrire(ctx, `Capital social souscrit : ${euro(Number(d.capital_montant))}, libéré à hauteur de ${d.capital_liberation} %.`);
  espace(ctx, 10);
  associes
    .filter((a) => a.est_associe)
    .forEach((a) => ecrire(ctx, `— ${identite(a)} : ${a.nb_titres} actions, ${euro(Number(a.montant_apport))}.`));
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  return fin(ctx);
}

async function beneficiairesEffectifs(d: Dossier, associes: Associe[]) {
  const capital = Number(d.capital_montant) || 1;
  const ctx = await creerCtx("Déclaration des bénéficiaires effectifs", `${d.denomination || "[dénomination]"}`);
  ecrire(ctx, "Personnes physiques détenant, directement ou indirectement, plus de 25 % du capital ou des droits de vote, ou exerçant un pouvoir de contrôle (art. L. 561-2-2 et R. 561-1 du code monétaire et financier) :");
  espace(ctx, 8);
  const analyse = analyserBeneficiaires(d, associes);
  for (const b of analyse.beneficiaires) {
    const personne = associes.find((a) => a.id === b.associeId);
    const base = personne && personne.type === "personne_physique" ? identite(personne) : b.nom;
    ecrire(
      ctx,
      `— ${base}${b.pourcentage !== null ? ` : ${b.pourcentage.toFixed(2)} % du capital ou des droits de vote` : ""}. ${MOTIF_BE[b.motif]}`,
    );
  }
  if (analyse.beneficiaires.length === 0)
    ecrire(ctx, "— Aucun bénéficiaire effectif n'a pu être déterminé à partir des informations saisies.");
  espace(ctx, 8);
  ecrire(ctx, `Capital social de référence : ${euro(capital)}.`, { color: GRIS });
  espace(ctx, 4);
  aValider(ctx, "détention indirecte et modalités de contrôle");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  return fin(ctx);
}

async function pouvoir(d: Dossier, associes: Associe[]) {
  const dir = associes.find((a) => a.est_dirigeant);
  const ctx = await creerCtx("Pouvoir pour les formalités", `${d.denomination || "[dénomination]"}`);
  ecrire(ctx, `Je soussigné(e) ${dir ? identite(dir) : "[dirigeant]"}, agissant en qualité de ${dir?.fonction ?? "dirigeant"} de la société ${d.denomination || "[dénomination]"},`);
  espace(ctx, 8);
  ecrire(ctx, "donne pouvoir au cabinet d'expertise comptable partenaire, avec faculté de subdélégation, à l'effet d'accomplir toutes formalités de constitution, de signer toutes pièces et de procéder au dépôt du dossier auprès des organismes compétents.");
  aValider(ctx, "étendue exacte du mandat");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature :", { color: GRIS });
  return fin(ctx);
}

async function courrierConjoint(d: Dossier, a: Associe | undefined) {
  const ctx = await creerCtx("Information du conjoint", `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`);
  ecrire(ctx, `Je soussigné(e) ${a ? nomComplet(a) : "[associé]"}, marié(e) sous un régime de communauté,`);
  espace(ctx, 8);
  ecrire(ctx, `à l'attention de mon conjoint, ${a?.conjoint_nom?.trim() || "[prénom et nom du conjoint]"},`);
  espace(ctx, 8);
  ecrire(ctx, `informe mon conjoint de mon intention d'apporter des fonds communs, à hauteur de ${a ? euro(Number(a.montant_apport)) : "[montant]"}, au capital de la société ${d.denomination || "[dénomination]"}, société ${d.forme_juridique} en cours de constitution.`);
  espace(ctx, 8);
  ecrire(ctx, "Mon conjoint est informé de la possibilité de revendiquer la qualité d'associé pour la moitié des parts souscrites.");
  aValider(ctx, "formulation de l'information et de la renonciation");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature de l'associé :", { color: GRIS });
  espace(ctx, 18);
  ecrire(ctx, "Signature du conjoint (accusé de réception) :", { color: GRIS });
  return fin(ctx);
}

async function renonciationConjoint(d: Dossier, a: Associe | undefined) {
  const ctx = await creerCtx("Renonciation du conjoint à la qualité d'associé", `${d.denomination || "[dénomination]"}`);
  ecrire(ctx, `Je soussigné(e) ${a?.conjoint_nom?.trim() || "[prénom et nom du conjoint]"}, conjoint(e) de ${a ? nomComplet(a) : "[associé]"},`);
  espace(ctx, 8);
  ecrire(ctx, `déclare renoncer expressément à revendiquer la qualité d'associé pour les parts souscrites au moyen de fonds communs dans la société ${d.denomination || "[dénomination]"}.`);
  aValider(ctx, "portée de la renonciation");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature du conjoint :", { color: GRIS });
  return fin(ctx);
}


async function consentementPartenaireIndivis(d: Dossier, a: Associe | undefined) {
  const ctx = await creerCtx(
    "Consentement du partenaire co-indivisaire à l'apport de fonds indivis",
    `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`,
  );
  ecrire(
    ctx,
    `Je soussigné(e) ${a?.conjoint_nom?.trim() || "[prénom et nom du partenaire]"}, partenaire de ${a ? nomComplet(a) : "[associé]"} lié(e) par un pacte civil de solidarité soumis au régime de l'indivision, consens expressément, en application de l'article 815-3 du Code civil, à l'apport par mon partenaire de fonds indivis à hauteur de ${a ? euro(Number(a.montant_apport)) : "[montant]"} au capital de la société ${d.denomination || "[dénomination]"}, en cours de constitution.`,
  );
  espace(ctx, 8);
  ecrire(ctx, "Ce consentement porte sur l'emploi de fonds indivis. Il n'emporte aucune revendication de la qualité d'associé.");
  aValider(ctx, "portée du consentement à l'emploi de fonds indivis");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_consentements ?? d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature du partenaire :", { color: GRIS });
  return fin(ctx);
}

async function consentementConjoint1424(d: Dossier, a: Associe | undefined) {
  const ctx = await creerCtx(
    "Consentement du conjoint à l'apport d'un bien commun",
    `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`,
  );
  ecrire(
    ctx,
    `Je soussigné(e) ${a?.conjoint_nom?.trim() || "[prénom et nom du conjoint]"}, conjoint(e) de ${a ? nomComplet(a) : "[associé]"}, consens expressément, en application de l'article 1424 du Code civil, à l'apport du bien commun suivant : ${d.bien_commun_designation?.trim() || "[désignation du bien]"}, au capital de la société ${d.denomination || "[dénomination]"} en cours de constitution.`,
  );
  espace(ctx, 8);
  ecrire(ctx, "À défaut de ce consentement, l'apport encourt l'annulation dans les conditions de l'article 1427 du Code civil.");
  aValider(ctx, "désignation exacte du bien commun apporté");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_consentements ?? d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature du conjoint :", { color: GRIS });
  return fin(ctx);
}

/* ------------------------------ ROUTAGE ------------------------------ */

export const TYPES_GENERES = [
  "statuts",
  "non_condamnation",
  "attestation_domiciliation",
  "liste_souscripteurs",
  "beneficiaires_effectifs",
  "pouvoir",
  "courrier_conjoint",
  "renonciation_conjoint",
  "consentement_partenaire_indivis",
  "consentement_conjoint_1424",
  "declaration_ei",
];

/* --------------------- ENTREPRISE INDIVIDUELLE --------------------- */

async function declarationEi(d: Dossier, associes: Associe[]) {
  const e = associes.find((a) => a.type === "personne_physique");
  const ctx = await creerCtx(
    "Déclaration de début d'activité — entreprise individuelle",
    `${d.denomination || "[nom commercial]"} — entrepreneur individuel`,
  );
  ecrire(ctx, `Je soussigné(e) ${e ? identite(e) : "[entrepreneur]"},`);
  espace(ctx, 8);
  ecrire(ctx, `déclare exercer une activité en nom propre, sous le statut d'entrepreneur individuel, à l'adresse suivante : ${d.siege_adresse || "[adresse d'exercice]"}.`);
  espace(ctx, 8);
  ecrire(ctx, `Activité exercée : ${d.objet_social || "[activité]"}`);
  espace(ctx, 8);
  ecrire(ctx, `Régime fiscal : ${d.option_fiscale === "IS" ? "option pour l'impôt sur les sociétés" : "impôt sur le revenu (régime de droit commun)"}.`);
  ecrire(ctx, `Régime de TVA déclaré : ${d.regime_tva ?? "[régime de TVA]"}.`);
  ecrire(ctx, `Demande d'ACRE : ${d.demande_acre ? "oui" : "non"}.`);
  espace(ctx, 8);
  ecrire(ctx, "Depuis le 15 mai 2022, le patrimoine personnel de l'entrepreneur individuel est de plein droit distinct de son patrimoine professionnel, dans les conditions prévues par la loi.");
  aValider(ctx, "vérification de l'éligibilité au régime déclaré et des mentions du guichet des formalités");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 18);
  ecrire(ctx, "Signature :", { color: GRIS });
  return fin(ctx);
}

/* ----------------------- LETTRE DE MISSION ----------------------- */

/** Régime d'imposition des bénéfices ; à défaut de choix, l'IS au réel simplifié. */
function regimeBeneficesTexte(d: Dossier) {
  return (
    d.option_fiscale?.trim() ||
    "impôt sur les sociétés (IS), régime réel simplifié par défaut"
  );
}

/** Régime et périodicité de TVA retenus. */
function regimeTvaTexte(d: Dossier) {
  const label =
    TVA_OPTIONS.find((t) => t.value === d.regime_tva)?.label ??
    "régime réel simplifié (régime par défaut)";
  const periodicite =
    d.periodicite_tva === "mensuelle"
      ? " — déclaration mensuelle"
      : d.periodicite_tva === "trimestrielle"
        ? " — déclaration trimestrielle"
        : "";
  return `${label}${periodicite}`;
}


export async function genererLettreMission(
  d: Dossier,
  missionHt: number,
  penaliteHt: number,
): Promise<Uint8Array> {
  RENDU = { filigrane: false, pied: null };
  const ctx = await creerCtx(
    "Lettre de mission — mission de présentation des comptes",
    `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`,
  );
  titre(ctx, "Objet de la mission");
  ecrire(ctx, "Le cabinet d'expertise comptable partenaire, inscrit à l'Ordre des experts-comptables, réalise une mission de présentation des comptes annuels conforme au référentiel normatif de l'Ordre : tenue de la comptabilité, établissement des comptes annuels, déclarations fiscales courantes et conseil au fil de l'eau.");

  titre(ctx, "Exercice social et régimes fiscaux");
  ecrire(
    ctx,
    `Clôture de l'exercice : ${d.date_cloture_exercice}${d.exercice_etendu ? " — premier exercice étendu (plus de 12 mois, un seul franchissement du 31 décembre)" : ""}.`,
  );
  ecrire(ctx, `Régime d'imposition des bénéfices : ${regimeBeneficesTexte(d)}.`);
  ecrire(ctx, `Taxe sur la valeur ajoutée : ${regimeTvaTexte(d)}.`);

  titre(ctx, "Honoraires");
  ecrire(ctx, `Les honoraires sont fixés à ${euro(missionHt)} HT par mois, TVA de 20 % en sus.`);


  titre(ctx, "Durée et résiliation");
  ecrire(ctx, "La lettre de mission est conclue pour une durée indéterminée, avec un engagement initial de trois mois. À l'issue de cette période, chaque partie peut y mettre fin librement, sans frais ni justification.");

  titre(ctx, "Honoraires de création offerts sous condition");
  ecrire(ctx, `En cas de non-respect de l'engagement de 3 mois ou de défaut de paiement, les honoraires de création, offerts sous condition, deviennent exigibles à hauteur de ${euro(penaliteHt)} HT.`);
  ecrire(ctx, "Réciproquement, si le cabinet n'exécute pas la mission comptable convenue, le client est libéré de son engagement de 3 mois et les honoraires de création ne deviennent pas exigibles.");
  ecrire(ctx, "Si la création n'aboutit pas, les sommes versées sont intégralement remboursées, hors frais déjà réglés pour votre compte à des tiers, toujours annoncés avant engagement.");

  titre(ctx, "Droit de rétractation");
  ecrire(ctx, "Le client dispose en principe d'un délai de rétractation de quatorze jours (art. L. 221-18 du code de la consommation). S'il demande expressément que l'exécution commence avant l'expiration de ce délai, il perd son droit de rétractation une fois la prestation pleinement exécutée et doit, s'il se rétracte avant, le prix correspondant au service déjà fourni (art. L. 221-25 et L. 221-28, 1° du même code).");
  if (d.renonciation_retractation_le) {
    ecrire(ctx, `Demande expresse d'exécution immédiate recueillie en ligne le ${new Date(d.renonciation_retractation_le).toLocaleString("fr-FR")}.`);
  }

  titre(ctx, "Frais légaux");
  ecrire(ctx, "Les frais légaux (annonce légale, greffe, bénéficiaires effectifs) sont refacturés à l'euro près, sans marge. Les frais payés dans l'intérêt de la société créée peuvent être remboursés par celle-ci à la personne qui a avancé les fonds.");


  espace(ctx, 20);
  ecrire(ctx, `Acceptation : ${d.lettre_mission_nom ?? "[nom complet du client]"}`, { bold: true });
  ecrire(
    ctx,
    d.lettre_mission_acceptee_le
      ? `Acceptée en ligne le ${new Date(d.lettre_mission_acceptee_le).toLocaleString("fr-FR")}.`
      : "En attente d'acceptation en ligne.",
    { color: GRIS },
  );
  return fin(ctx);
}

/* ------------- DOCUMENTS SIGNÉS ÉLECTRONIQUEMENT ------------- */

async function confidentialiteAdresse(d: Dossier, associes: Associe[]) {
  const ctx = await creerCtx(
    "Demande de confidentialité de l'adresse personnelle",
    `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`,
  );
  ecrire(ctx, "Les personnes physiques désignées ci-après demandent que leur adresse personnelle ne soit pas rendue publique dans les registres consultables par tous.");
  espace(ctx, 8);
  for (const a of associes.filter((x) => x.type === "personne_physique")) {
    ecrire(ctx, `— ${nomComplet(a)}, demeurant ${a.adresse ?? "[adresse]"}`);
  }
  espace(ctx, 8);
  ecrire(ctx, "Cette demande ne dispense pas de communiquer l'adresse aux autorités et aux organismes habilités.");
  return fin(ctx);
}

async function mandatGuichetUnique(d: Dossier, associes: Associe[]) {
  const dir = associes.find((a) => a.est_dirigeant);
  const ctx = await creerCtx(
    "Mandat de dépôt sur le guichet unique des formalités",
    `${d.denomination || "[dénomination]"} — ${d.forme_juridique}`,
  );
  ecrire(ctx, `Je soussigné(e) ${dir ? nomComplet(dir) : "[dirigeant]"}, agissant pour la société ${d.denomination || "[dénomination]"},`);
  espace(ctx, 8);
  ecrire(ctx, "donne mandat à CREA EXPERT à l'effet de déposer en mon nom le dossier de création sur le guichet unique des formalités des entreprises, et de répondre aux demandes de pièces complémentaires liées à cette seule formalité.");
  espace(ctx, 8);
  ecrire(ctx, "Ce mandat est limité à cette formalité. Il ne confère aucun pouvoir de gestion, de représentation générale ni de disposition sur la société.");
  return fin(ctx);
}

/* --------------- PAGE DE SIGNATURE ÉLECTRONIQUE --------------- */

export type PreuveSignataire = {
  nom: string;
  methode: "trace" | "saisie";
  horodatage: string;
  /** Image PNG du tracé, le cas échéant. */
  trace?: Uint8Array | null;
};

/**
 * Appose sur le document une page de signature listant chaque signataire,
 * la date, l'heure, la méthode et l'empreinte du document signé.
 */
export async function apposerPageDeSignature(
  source: Uint8Array,
  opts: { libelle: string; denomination: string; signataires: PreuveSignataire[]; empreinte: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;

  const ligne = (texte: string, o: { size?: number; bold?: boolean; color?: typeof NAVY } = {}) => {
    const size = o.size ?? 10.5;
    const font = o.bold ? bold : regular;
    for (const l of lignes(texte, font, size, LARGEUR - MARGE * 2)) {
      if (y < MARGE + 30) {
        page = pdf.addPage([LARGEUR, HAUTEUR]);
        y = HAUTEUR - MARGE;
      }
      page.drawText(l, { x: MARGE, y, size, font, color: o.color ?? NAVY });
      y -= size + 4;
    }
  };

  ligne("PAGE DE SIGNATURE ÉLECTRONIQUE", { size: 15, bold: true });
  y -= 6;
  ligne(`${opts.libelle} — ${opts.denomination}`, { size: 10, color: GRIS });
  y -= 14;
  ligne("Signé électroniquement — preuve conservée, empreinte SHA-256.", { bold: true });
  y -= 10;

  for (const s of opts.signataires) {
    ligne(s.nom, { bold: true });
    ligne(
      `Signé le ${new Date(s.horodatage).toLocaleString("fr-FR")} — méthode : ${
        s.methode === "trace" ? "tracé manuscrit" : "saisie du nom"
      }`,
      { color: GRIS },
    );
    if (s.trace && s.trace.length > 0) {
      try {
        const img = await pdf.embedPng(s.trace);
        const largeur = 160;
        const hauteur = (img.height / img.width) * largeur;
        if (y - hauteur < MARGE + 30) {
          page = pdf.addPage([LARGEUR, HAUTEUR]);
          y = HAUTEUR - MARGE;
        }
        page.drawImage(img, { x: MARGE, y: y - hauteur, width: largeur, height: hauteur });
        y -= hauteur + 6;
      } catch {
        /* tracé illisible : la preuve textuelle suffit */
      }
    }
    y -= 8;
  }

  y -= 6;
  ligne("Empreinte SHA-256 du document signé :", { bold: true });
  ligne(opts.empreinte, { size: 8.5, color: GRIS });
  y -= 6;
  ligne(
    "Signature électronique simple au sens du règlement eIDAS. Les preuves associées (horodatage serveur, adresse IP, navigateur, empreinte du document, consentement) sont conservées par CREA EXPERT.",
    { size: 9, color: GRIS },
  );

  return await pdf.save();
}


export async function genererPdf(
  type: string,
  dossier: Dossier,
  associes: Associe[],
  associeId: string | null,
): Promise<Uint8Array> {
  RENDU = renduPour(dossier);
  const cible = associes.find((a) => a.id === associeId);
  switch (type) {
    case "statuts":
      return statuts(dossier, associes);
    case "non_condamnation":
      return nonCondamnation(dossier, cible);
    case "attestation_domiciliation":
      return attestationDomiciliation(dossier, associes);
    case "liste_souscripteurs":
      return listeSouscripteurs(dossier, associes);
    case "beneficiaires_effectifs":
      return beneficiairesEffectifs(dossier, associes);
    case "pouvoir":
      return pouvoir(dossier, associes);
    case "courrier_conjoint":
      return courrierConjoint(dossier, cible);
    case "renonciation_conjoint":
      return renonciationConjoint(dossier, cible);
    case "consentement_partenaire_indivis":
      return consentementPartenaireIndivis(
        dossier,
        cible ?? associes.find((a) => partenaireIndivisConcerne(a)),
      );
    case "consentement_conjoint_1424":
      return consentementConjoint1424(
        dossier,
        cible ?? consentement1424(dossier, associes).apporteurs[0],
      );
    case "confidentialite_adresse":
      return confidentialiteAdresse(dossier, associes);
    case "mandat_guichet_unique":
      return mandatGuichetUnique(dossier, associes);
    case "declaration_ei":
      return declarationEi(dossier, associes);
    default: {
      const ctx = await creerCtx("Document", dossier.denomination || "");
      ecrire(ctx, "Ce document sera généré par le cabinet.");
      return fin(ctx);
    }
  }
}

export function telechargerPdf(octets: Uint8Array, nom: string) {
  const blob = new Blob([octets as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 80) + ".pdf";
  a.click();
  URL.revokeObjectURL(url);
}

/* --------------- GABARIT — MENTION MANUSCRITE D'IDENTITÉ --------------- */

/** Feuille-modèle à imprimer : mention manuscrite « certifiée conforme à l'original ». */
export async function genererGabaritIdentite(
  d: Dossier,
  associes: Associe[],
): Promise<Uint8Array> {
  RENDU = { filigrane: false, pied: "Gabarit fourni à titre d'aide au dépôt — CREA EXPERT" };
  const ctx = await creerCtx(
    "Gabarit — copie de pièce d'identité certifiée conforme",
    d.denomination || "Dossier de création",
  );

  titre(ctx, "Comment procéder, étape par étape");
  ecrire(ctx, "1. Photocopiez ou scannez votre pièce d'identité en cours de validité, recto ET verso, en couleur, sans rien masquer et sans reflet.");
  ecrire(ctx, "2. Sur la copie elle-même, dans une zone blanche, recopiez à la main la mention ci-dessous, en toutes lettres et de façon lisible.");
  ecrire(ctx, "3. Ajoutez la date du jour, puis signez à la main juste en dessous de la mention.");
  ecrire(ctx, "4. Scannez ou photographiez la copie ainsi annotée, puis déposez-la dans « Mes documents ». Formats acceptés : PDF, JPG ou PNG, 10 Mo maximum.");

  titre(ctx, "Mention manuscrite à recopier mot pour mot");
  ecrire(ctx, "« Je soussigné(e) [prénom NOM], certifie la présente copie conforme à l'original de ma pièce d'identité. »", { bold: true });
  ecrire(ctx, "Fait à [ville], le [jour/mois/année]");
  ecrire(ctx, "Signature :");
  espace(ctx, 26);

  titre(ctx, "Pièces acceptées");
  ecrire(ctx, "Carte nationale d'identité (recto-verso), passeport (pages d'identité), ou titre de séjour en cours de validité (recto-verso). Un permis de conduire n'est pas accepté pour les formalités d'immatriculation.");

  titre(ctx, "Erreurs qui entraînent un rejet");
  ecrire(ctx, "Copie expirée, illisible ou tronquée ; verso manquant ; mention absente, incomplète ou dactylographiée ; absence de date ou de signature ; document photographié de biais ou trop sombre.");

  const physiques = associes.filter((a) => a.type === "personne_physique");
  if (physiques.length > 0) {
    titre(ctx, "Personnes concernées dans votre dossier");
    for (const a of physiques) {
      ecrire(ctx, `— ${nomComplet(a) || "Associé"}${a.est_dirigeant ? " (dirigeant)" : ""}`);
    }
  }

  return fin(ctx);
}
