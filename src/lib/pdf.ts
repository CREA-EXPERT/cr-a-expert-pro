import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { euro, isSas, TVA_OPTIONS, type Forme } from "./domain";
import { analyserBeneficiaires, MOTIF_BE } from "./beneficiaires";
import {
  conjointConcerne,
  consentement1424,
  partenaireIndivisConcerne,
} from "./documents";
import type { Associe, Dossier } from "./documents";
import { activitesDuDossier } from "./activites";
import { clausesManquantes, messageClausesManquantes, type Gabarit } from "./statuts-clauses";
import { DATE_REGLES_CONFORMITE, VERSION_MOTEUR, VERSIONS_GABARIT } from "./gabarits";
import { dateEnLettresFr, jourMoisEnLettresFr, montantEnLettresFr } from "./nombres";
import {
  accord,
  associesDe,
  champsManquantsStatutsSas,
  comparution,
  comparutionCourte,
  directeurGeneralDe,
  feminin,
  nomCompletPhysique,
  presidentDe,
} from "./statuts-sas";
import {
  associesEffectifs,
  champsManquantsStatutsSarl,
  comparutionSarl,
  conjointRenonce,
  conjointRevendique,
  gerantsDe,
  isSarl,
  repartitionParts,
} from "./statuts-sarl";
import {
  associeUnique,
  basculeSarlRequise,
  champsManquantsStatutsEurl,
  dureePremierExercice,
  gerantTiers,
  isEurl,
  MESSAGE_BASCULE_SARL,
  varianteArticle9,
} from "./statuts-eurl";
import {
  champsManquantsStatutsSci,
  conjointInforme as conjointInformeSci,
  isSciForme,
} from "./statuts-sci";
import { gabaritApplique, messageRefusStatuts, motifsRefusStatuts } from "./statuts-controles";



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
  /** Intitulés d'articles écrits, pour le contrôle des clauses obligatoires. */
  titres: string[];
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
      pied: "Document généré à partir des réponses du déclarant — non revu par un professionnel.",
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
  ctx.titres.push(texte);
  espace(ctx, 10);
  ecrire(ctx, texte.toUpperCase(), { size: 11, bold: true });
  espace(ctx, 2);
}

function aValider(ctx: Ctx, sujet: string) {
  ecrire(ctx, `[CLAUSE À VALIDER PAR LE CABINET — ${sujet}]`, { size: 10, color: GRIS });
}

/** Intitulé d'article reproduit tel quel (sans passage en capitales). */
function article(ctx: Ctx, texte: string) {
  ctx.titres.push(texte);
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
  const ctx: Ctx = { pdf, regular, bold, page, y: HAUTEUR - MARGE, titres: [] };
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

/** Bloque la génération si une clause obligatoire du gabarit fait défaut. */
function controlerClauses(ctx: Ctx, gabarit: Gabarit) {
  const manquantes = clausesManquantes(gabarit, ctx.titres);
  if (manquantes.length > 0) throw new Error(messageClausesManquantes(manquantes));
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
  return { pdf, regular, bold, page, y: HAUTEUR - MARGE, titres: [] };
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

  controlerClauses(ctx, "SAS");
  return fin(ctx);
}

/* --------------------- STATUTS SARL (gabarit cabinet) --------------------- */

async function statutsSarl(d: Dossier, associes: Associe[]) {
  const manquants = champsManquantsStatutsSarl(d, associes);
  if (manquants.length > 0) {
    throw new Error(
      `Statuts non générés — informations manquantes : ${manquants
        .map((m) => `${m.champ} (étape « ${m.etape} »)`)
        .join(" ; ")}.`,
    );
  }
  if (d.apport_nature) {
    throw new Error(
      "Statuts non générés — apport en nature : revue cabinet requise (commissaire aux apports ou dispense, art. L. 223-9 du code de commerce).",
    );
  }

  const parts = associesEffectifs(d, associes);
  const gerants = gerantsDe(associes);
  const capital = Number(d.capital_montant);
  const nominal = Number(d.valeur_part);
  const nbParts = parts.reduce((s, a) => s + (Number(a.nb_titres) || 0), 0);
  const totalNumeraire = parts.reduce((s, a) => s + (Number(a.montant_apport) || 0), 0);
  const [jourCloture, moisCloture] = (d.date_cloture_exercice ?? "31/12").split("/");
  const ouverture = jourMoisEnLettresFr(1, (Number(moisCloture) % 12) + 1);
  const cloture = jourMoisEnLettresFr(Number(jourCloture), Number(moisCloture));
  const activites = activitesDuDossier(d);
  const libere = Number(d.capital_liberation) >= 100;
  const nomDe = (a: Associe) =>
    a.type === "personne_morale" ? (a.denomination ?? "") : nomCompletPhysique(a);

  const ctx = await creerCtxNu();

  ecrire(ctx, `${d.denomination} Société à responsabilité limitée au capital de ${capital} euros`, {
    bold: true,
  });
  ecrire(ctx, `Siège social : ${d.siege_adresse}`);
  espace(ctx, 14);
  ecrire(ctx, "STATUTS", { size: 16, bold: true });
  espace(ctx, 14);

  ecrire(ctx, "Les soussignés :");
  espace(ctx, 6);
  parts.forEach((a, i) => {
    if (i > 0) {
      ecrire(ctx, "Et,");
      espace(ctx, 4);
    }
    comparutionSarl(a).forEach((l) => ecrire(ctx, l));
    espace(ctx, 6);
  });
  ecrire(ctx, "Ci-après désignés ensemble les « Associés »,");
  espace(ctx, 6);
  ecrire(
    ctx,
    "Ont établi ainsi qu'il suit les statuts d'une société à responsabilité limitée (ci-après la « Société ») devant exister entre eux et les propriétaires des parts sociales créées lors de la constitution et en cours de vie sociale.",
  );

  // Article 1832-2 du Code civil : revendication ou renonciation du conjoint commun en biens.
  const conjointsRevendiquants = associes.filter((a) => conjointRevendique(d, a));
  const conjointsRenoncants = associes.filter((a) => conjointRenonce(d, a));
  if (conjointsRevendiquants.length > 0 || conjointsRenoncants.length > 0) {
    espace(ctx, 8);
    ecrire(ctx, "Article 1832-2 du Code civil", { bold: true });
    espace(ctx, 4);
    for (const a of conjointsRevendiquants) {
      ecrire(
        ctx,
        `${nomCompletPhysique(a)} déclare que les fonds apportés proviennent de la communauté de biens existant avec ${
          a.conjoint_civilite ?? ""
        } ${a.conjoint_prenom ?? ""} ${a.conjoint_nom ?? ""}. Dûment averti${accord(
          a,
        )} conformément à l'article 1832-2 du Code civil, le conjoint a expressément revendiqué la qualité d'associé pour la moitié des parts souscrites ; il est en conséquence associé de la Société pour la moitié desdites parts, ainsi qu'il ressort de la répartition figurant à l'article 8.`
          .replace(/\s+/g, " ")
          .trim(),
      );
      espace(ctx, 4);
    }
    for (const a of conjointsRenoncants) {
      ecrire(
        ctx,
        `${nomCompletPhysique(a)} déclare que les fonds apportés proviennent de la communauté de biens existant avec ${
          a.conjoint_civilite ?? ""
        } ${a.conjoint_nom ?? ""}. Dûment averti conformément à l'article 1832-2 du Code civil, le conjoint a renoncé à revendiquer la qualité d'associé, ainsi qu'il en est justifié par le document annexé aux présents statuts. Cette renonciation ne fait pas obstacle à ce qu'il revendique ultérieurement cette qualité dans les conditions légales.`
          .replace(/\s+/g, " ")
          .trim(),
      );
      espace(ctx, 4);
    }
  }

  article(ctx, "TITRE I - FORME - OBJET - DENOMINATION - SIEGE SOCIAL - DUREE - EXERCICE SOCIAL");

  article(ctx, "ARTICLE 1 - Forme");
  ecrire(
    ctx,
    "La Société est une société à responsabilité limitée régie par les dispositions légales et réglementaires en vigueur, notamment les articles L. 223-1 et suivants du Code de commerce, ainsi que par les présents statuts.",
  );

  article(ctx, "ARTICLE 2 - Objet");
  ecrire(
    ctx,
    "La Société a pour objet, en France et à l'étranger, pour elle-même ou en participation avec des tiers :",
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
    "Et, plus généralement, toutes opérations industrielles, commerciales, financières, civiles, mobilières ou immobilières, pouvant se rattacher directement ou indirectement à l'objet social ou à tout objet similaire ou connexe, ou de nature à en favoriser le développement.",
  );

  article(ctx, "ARTICLE 3 - Dénomination sociale");
  ecrire(ctx, `La Société prend la dénomination : ${d.denomination}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Tous les actes et documents émanant de la Société et destinés aux tiers doivent indiquer la dénomination sociale précédée ou suivie immédiatement des mots « société à responsabilité limitée » ou des initiales « SARL » et de l'énonciation du capital social.",
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
    `Toutefois, par exception, le premier exercice social débutera à compter de la date d'immatriculation de la Société au Registre du Commerce et des Sociétés et se terminera le ${dateEnLettresFr(
      d.date_cloture_premier_exercice,
    )}.`,
  );

  article(ctx, "ARTICLE 6 - Siège social");
  ecrire(ctx, `Le siège social est fixé : ${d.siege_adresse}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Il peut être transféré en tout autre lieu du territoire français par décision de la gérance, sous réserve de ratification par les associés statuant dans les conditions requises pour la modification des statuts.",
  );

  article(ctx, "TITRE II - APPORTS - CAPITAL SOCIAL - PARTS SOCIALES");

  article(ctx, "ARTICLE 7 - Apports");
  ecrire(ctx, "Apports en numéraire :", { bold: true });
  espace(ctx, 4);
  ecrire(ctx, "Les Associés font apport à la Société des sommes suivantes en numéraire :");
  espace(ctx, 4);
  parts.forEach((a) => ecrire(ctx, `${nomDe(a)} : ${Number(a.montant_apport)} euros`));
  espace(ctx, 4);
  ecrire(ctx, `Soit au total, une somme de ${totalNumeraire} euros.`);
  espace(ctx, 4);
  ecrire(ctx, `Lesdits apports correspondent à ${nbParts} parts sociales de ${nominal} euro(s) chacune.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Les fonds correspondant aux apports en numéraire seront déposés par les Associés sur le compte ouvert au nom de la Société en formation auprès de ${d.banque_depot}, ainsi qu'il résultera du certificat établi par la banque dépositaire des fonds.`,
  );

  const cons1424Sarl = consentement1424(d, associes);
  if (cons1424Sarl.requis) {
    espace(ctx, 6);
    for (const a of cons1424Sarl.apporteurs)
      ecrire(
        ctx,
        `${nomCompletPhysique(a)} déclare que son conjoint, ${a.conjoint_nom}, a expressément consenti à l'apport du bien commun suivant : ${d.bien_commun_designation}, conformément à l'article 1424 du Code civil, ainsi qu'il en est justifié par le consentement annexé aux présents statuts.`,
      );
  }
  espace(ctx, 6);
  ecrire(
    ctx,
    `Le total des apports consentis à la Société s'élève à la somme de ${montantEnLettresFr(
      capital,
    )} (${capital}) euros.`,
  );

  article(ctx, "ARTICLE 8 - Capital social et répartition des parts");
  ecrire(
    ctx,
    `Le capital social est fixé à la somme de ${capital} euros. Il est divisé en ${nbParts} parts sociales de ${nominal} euro(s) chacune, ${
      libere
        ? "intégralement libérées"
        : `libérées à hauteur de ${d.capital_liberation} % de leur valeur nominale, soit au moins le cinquième conformément à l'article L. 223-7 du Code de commerce, le surplus devant être libéré en une ou plusieurs fois sur décision de la gérance dans un délai maximum de cinq ans à compter de l'immatriculation`
    }, souscrites en totalité et attribuées aux associés comme suit :`,
  );
  espace(ctx, 6);
  repartitionParts(parts).forEach((l) =>
    ecrire(
      ctx,
      `${nomDe(l.associe)} : ${l.parts} parts sociales, numérotées de ${l.debut} à ${l.fin}, en rémunération d'un apport de ${Number(
        l.associe.montant_apport,
      )} euros.`,
    ),
  );
  espace(ctx, 6);
  ecrire(
    ctx,
    `Total : ${nbParts} parts sociales, soit la totalité du capital social, ${montantEnLettresFr(
      capital,
    )} (${capital}) euros.`,
    { bold: true },
  );

  article(ctx, "ARTICLE 9 - Modification du capital social");
  ecrire(
    ctx,
    "Le capital social peut être augmenté ou réduit dans les conditions prévues par la loi, par décision collective extraordinaire des associés. En cas d'augmentation de capital en numéraire, les fonds sont déposés dans les conditions légales et le capital antérieur doit être intégralement libéré.",
  );

  article(ctx, "ARTICLE 10 - Représentation des parts sociales");
  ecrire(
    ctx,
    "Les parts sociales ne peuvent jamais être représentées par des titres négociables. Les droits de chaque associé résultent exclusivement des présents statuts, des actes modificatifs ultérieurs et des cessions de parts régulièrement consenties.",
  );

  article(ctx, "ARTICLE 11 - Droits et obligations attachés aux parts sociales");
  ecrire(
    ctx,
    "Chaque part sociale donne droit à une fraction des bénéfices et de l'actif social proportionnelle au nombre de parts existantes. Les associés ne supportent les pertes qu'à concurrence de leurs apports. Chaque part est indivisible à l'égard de la Société ; les copropriétaires indivis sont tenus de se faire représenter par un mandataire unique.",
  );

  article(ctx, "ARTICLE 12 - Cession et transmission des parts sociales");
  ecrire(
    ctx,
    "Toute cession de parts sociales doit être constatée par écrit et n'est opposable à la Société que dans les formes prévues à l'article 1690 du Code civil ou par dépôt d'un original de l'acte de cession au siège social contre remise par le gérant d'une attestation de ce dépôt.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les parts sociales sont librement cessibles entre associés, ainsi qu'entre conjoints, ascendants et descendants. Elles ne peuvent être cédées à des tiers étrangers à la Société qu'avec le consentement de la majorité des associés représentant au moins la moitié des parts sociales, conformément à l'article L. 223-14 du Code de commerce.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas de décès d'un associé, la Société continue entre les associés survivants et les héritiers ou ayants droit de l'associé décédé, sans qu'il y ait lieu à agrément.",
  );

  article(ctx, "TITRE III - GERANCE - DECISIONS COLLECTIVES");

  article(ctx, "ARTICLE 13 - Gérance");
  ecrire(
    ctx,
    "La Société est gérée et administrée par un ou plusieurs gérants, personnes physiques, associés ou non, nommés par les associés. Le gérant est révocable par décision des associés représentant plus de la moitié des parts sociales ; la révocation sans juste motif ouvre droit à dommages et intérêts.",
  );

  article(ctx, "ARTICLE 14 - Pouvoirs de la gérance");
  ecrire(
    ctx,
    "Dans les rapports avec les tiers, le gérant est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la Société, sous réserve des pouvoirs que la loi attribue expressément aux associés. Dans les rapports entre associés, le gérant peut accomplir tous les actes de gestion dans l'intérêt de la Société.",
  );

  article(ctx, "ARTICLE 15 - Rémunération de la gérance");
  ecrire(
    ctx,
    "La rémunération du ou des gérants est fixée par décision collective ordinaire des associés. Le gérant a droit au remboursement de ses frais de représentation et de déplacement sur justificatifs.",
  );

  article(ctx, "ARTICLE 16 - Conventions réglementées");
  ecrire(
    ctx,
    "Les conventions intervenues directement ou par personne interposée entre la Société et l'un de ses gérants ou associés sont soumises aux dispositions de l'article L. 223-19 du Code de commerce. Les conventions portant sur des opérations courantes conclues à des conditions normales échappent à cette procédure.",
  );

  article(ctx, "ARTICLE 17 - Décisions collectives");
  ecrire(
    ctx,
    "Les décisions collectives sont prises en assemblée ou, à l'exception de celles portant sur l'approbation des comptes annuels, par consultation écrite des associés. Chaque associé dispose d'un nombre de voix égal au nombre de parts qu'il possède.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les décisions ordinaires sont adoptées par un ou plusieurs associés représentant plus de la moitié des parts sociales ; à défaut, sur seconde consultation, à la majorité des votes émis. Les décisions extraordinaires emportant modification des statuts sont adoptées à la majorité des deux tiers des parts détenues par les associés présents ou représentés, conformément à l'article L. 223-30 du Code de commerce.",
  );

  article(ctx, "TITRE IV - COMPTES SOCIAUX - AFFECTATION DES RESULTATS");

  article(ctx, "ARTICLE 18 - Comptes annuels");
  ecrire(
    ctx,
    "Il est tenu une comptabilité régulière des opérations sociales. À la clôture de chaque exercice, la gérance dresse l'inventaire, les comptes annuels et le rapport de gestion. Les comptes sont soumis à l'approbation des associés dans les six mois de la clôture de l'exercice.",
  );

  article(ctx, "ARTICLE 19 - Affectation et répartition des résultats");
  ecrire(
    ctx,
    "Le bénéfice distribuable est constitué par le bénéfice de l'exercice diminué des pertes antérieures et des sommes portées en réserve légale, augmenté du report bénéficiaire. Il est réparti entre les associés proportionnellement au nombre de parts qu'ils détiennent, après dotation de cinq pour cent au moins à la réserve légale jusqu'à ce que celle-ci atteigne le dixième du capital social.",
  );

  article(ctx, "ARTICLE 20 - Commissaires aux comptes");
  ecrire(
    ctx,
    "La nomination d'un commissaire aux comptes est facultative tant que les seuils légaux ne sont pas dépassés. Elle devient obligatoire dans les cas prévus par les articles L. 223-35 et suivants du Code de commerce.",
  );

  article(ctx, "TITRE V - DISSOLUTION - LIQUIDATION - CONTESTATIONS");

  article(ctx, "ARTICLE 21 - Dissolution - Liquidation");
  ecrire(
    ctx,
    "La Société est dissoute à l'arrivée du terme, par décision collective extraordinaire des associés ou dans les cas prévus par la loi. La dissolution entraîne sa liquidation ; un ou plusieurs liquidateurs sont nommés par les associés. Après paiement du passif et remboursement du capital, le solde est réparti entre les associés proportionnellement au nombre de leurs parts.",
  );

  article(ctx, "ARTICLE 22 - Contestations");
  ecrire(
    ctx,
    "Toutes les contestations relatives aux affaires sociales pouvant survenir pendant la durée de la Société ou de sa liquidation, soit entre les associés, soit entre un associé et la Société, sont soumises aux tribunaux compétents du lieu du siège social.",
  );

  article(ctx, "TITRE VI - NOMINATION DE LA GERANCE - ACTES ACCOMPLIS POUR LA SOCIETE EN FORMATION");

  article(ctx, "ARTICLE 23 - Nomination du ou des gérants");
  ecrire(
    ctx,
    gerants.length > 1
      ? "Sont nommés premiers gérants de la Société, pour une durée indéterminée, aux termes des présents statuts :"
      : `${feminin(gerants[0] as Associe) ? "Est nommée première gérante" : "Est nommé premier gérant"} de la Société, pour une durée indéterminée, aux termes des présents statuts :`,
  );
  espace(ctx, 4);
  gerants.forEach((g) => {
    comparutionSarl(g).forEach((l) => ecrire(ctx, l));
    espace(ctx, 4);
    ecrire(
      ctx,
      `${feminin(g) ? "Laquelle déclare accepter lesdites fonctions" : "Lequel déclare accepter lesdites fonctions"} et satisfaire à toutes les conditions requises par la loi et les règlements pour leur exercice.`,
    );
    espace(ctx, 6);
  });

  article(ctx, "ARTICLE 24 - Formalités de publicité - Immatriculation");
  ecrire(
    ctx,
    "Tous pouvoirs sont conférés au porteur d'un original des présentes à l'effet d'accomplir les formalités de publicité, de dépôt et autres nécessaires pour parvenir à l'immatriculation de la Société au Registre du Commerce et des Sociétés.",
  );
  espace(ctx, 10);
  ecrire(
    ctx,
    `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}, en autant d'exemplaires originaux que requis.`,
    { bold: true },
  );
  espace(ctx, 14);
  const signaturesSarl = () => {
    for (const a of parts) {
      const estGerant = gerants.some((g) => g.id === a.id);
      ecrire(
        ctx,
        estGerant ? `${nomDe(a)} — ${feminin(a) ? "La Gérante" : "Le Gérant"}` : nomDe(a),
      );
      espace(ctx, 22);
    }
  };
  signaturesSarl();

  article(ctx, "ANNEXE");
  article(ctx, "I. ETAT DES ACTES ACCOMPLIS POUR LE COMPTE DE LA SOCIETE EN FORMATION");
  ecrire(ctx, "NEANT");
  article(ctx, "II. ETAT DES ACTES A ACCOMPLIR POUR LE COMPTE DE LA SOCIETE EN FORMATION");
  ecrire(ctx, "Les soussignés :");
  espace(ctx, 4);
  parts.forEach((a) => {
    ecrire(ctx, comparutionCourte(a));
    espace(ctx, 4);
  });
  ecrire(
    ctx,
    `Agissant en qualité d'associés de la société ${d.denomination}, société à responsabilité limitée au capital de ${capital} euros, en cours de formation, dont le siège social est situé ${d.siege_adresse}, déclarent donner mandat à la gérance désignée à l'article 23 de prendre pour le compte de la Société les engagements ci-après :`,
  );
  espace(ctx, 6);
  [
    "Dépôt du capital social auprès d'un établissement bancaire ;",
    "Ouverture d'un compte courant auprès d'un établissement bancaire ;",
    "De procéder ou de faire procéder à toutes les formalités de constitution prescrites par la loi et de requérir l'immatriculation de la Société au Registre du Commerce et des Sociétés ;",
    "De prendre tous engagements devant permettre à la Société, dès qu'elle aura la pleine capacité, de poursuivre son activité ;",
    "D'assurer les dépenses courantes en ce qu'elles concernent la mise en fonctionnement de la Société ;",
    "D'encaisser et régler les sommes, faire toutes déclarations, signer toutes pièces et en général faire le nécessaire.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    "Les susnommés tiendront avec exactitude la comptabilité de ces opérations dont le bénéfice et les charges seront repris par la Société du fait même de son immatriculation au Registre du Commerce et des Sociétés.",
  );
  espace(ctx, 10);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 14);
  signaturesSarl();

  controlerClauses(ctx, "SARL");
  return fin(ctx);
}

/* --------------------- STATUTS EURL (gabarit cabinet) --------------------- */

async function statutsEurl(d: Dossier, associes: Associe[]) {
  const manquants = champsManquantsStatutsEurl(d, associes);
  if (manquants.length > 0) {
    throw new Error(
      `Statuts non générés — informations manquantes : ${manquants
        .map((m) => `${m.champ} (étape « ${m.etape} »)`)
        .join(" ; ")}.`,
    );
  }
  if (basculeSarlRequise(d, associes)) throw new Error(MESSAGE_BASCULE_SARL);
  if (d.apport_nature)
    throw new Error(
      "Statuts non générés — apport en nature hors périmètre du gabarit EURL : revue cabinet requise (commissaire aux apports, art. L. 223-9 du code de commerce, sauf dispense).",
    );

  const a = associeUnique(associes) as Associe;
  const e = accord(a);
  const elle = feminin(a);
  const gerantAssocie = d.gerant_est_associe_unique !== false;
  const gt = gerantTiers(d, associes);
  const variante = varianteArticle9(d, associes);
  const qualification = d.activite_reglementee || d.activite_artisanale;

  const capital = Number(d.capital_montant);
  const nominal = Number(d.valeur_part);
  const nbParts = Number(a.nb_titres);
  const [jourCloture, moisCloture] = (d.date_cloture_exercice ?? "31/12").split("/");
  const ouverture = jourMoisEnLettresFr(1, (Number(moisCloture) % 12) + 1);
  const cloture = jourMoisEnLettresFr(Number(jourCloture), Number(moisCloture));
  const duree = dureePremierExercice(d);
  const activites = activitesDuDossier(d);
  const isOption = d.regime_fiscal_eurl === "IS";

  const ctx = await creerCtxNu();

  ecrire(ctx, d.denomination as string, { size: 15, bold: true });
  espace(ctx, 6);
  ecrire(
    ctx,
    `Société à responsabilité limitée à associé unique (EURL) — En cours de création — Capital social : ${capital} euros`,
  );
  ecrire(ctx, `Siège social : ${d.siege_adresse}`);
  espace(ctx, 6);
  ecrire(ctx, "(Ci-après, la « Société »)");
  espace(ctx, 14);
  ecrire(ctx, "S T A T U T S", { size: 16, bold: true });
  espace(ctx, 6);
  ecrire(ctx, "Certifié conforme à l'original", { size: 10, color: GRIS });
  espace(ctx, 14);

  article(ctx, "LE SOUSSIGNÉ :");
  comparution(a).forEach((l) => ecrire(ctx, l));
  espace(ctx, 8);
  ecrire(
    ctx,
    `a établi, ainsi qu'il suit, les statuts de la société à responsabilité limitée à associé unique ${
      elle ? "qu'elle a décidé" : "qu'il a décidé"
    } d'instituer.`,
  );

  article(ctx, "TITRE I - FORME - OBJET - DÉNOMINATION - SIÈGE - DURÉE - EXERCICE");

  article(ctx, "ARTICLE 1 - Forme");
  ecrire(
    ctx,
    "La Société est une société à responsabilité limitée ne comportant qu'un seul associé. Elle est régie par les dispositions du Livre II du Code de commerce, notamment ses articles L. 223-1 et suivants, par l'article 1832-2 du Code civil, par toutes autres dispositions légales et réglementaires en vigueur et par les présents statuts.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Elle ne devient pas une société pluripersonnelle par le seul fait de la réunion de plusieurs associés, ni une société unipersonnelle par le seul fait de la réunion de toutes les parts en une seule main. Les présents statuts s'appliquent indifféremment dans l'une et l'autre de ces situations : les dispositions relatives à l'associé unique cessent d'être applicables, sans qu'il y ait lieu à modification statutaire, dès que la Société comporte plusieurs associés, et inversement.",
  );

  article(ctx, "ARTICLE 2 - Objet");
  ecrire(ctx, "La Société a pour objet, en France et à l'étranger, directement ou indirectement :");
  espace(ctx, 4);
  if (activites.length > 0) activites.forEach((act) => puce(ctx, act.texte));
  else ecrire(ctx, d.objet_social as string);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Il est expressément précisé que la société n'exercera aucune des activités soumises à qualification professionnelle au sens de l'article 16 de la loi n° 96-603 du 5 juillet 1996 et de ses textes d'application, ni aucune autre activité réglementée, sauf à justifier préalablement des qualifications, autorisations, déclarations et assurances légalement requises. La société pourra en toute hypothèse confier l'exécution de telles prestations à des entreprises tierces dûment qualifiées et assurées.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Et plus généralement, toutes opérations industrielles, commerciales, financières, mobilières ou immobilières, se rattachant directement ou indirectement à l'objet social ci-dessus ou à tous objets similaires, connexes ou complémentaires, ou susceptibles d'en favoriser l'extension ou le développement, ainsi que la participation de la Société à toutes entreprises ou opérations pouvant se rattacher à cet objet.",
  );

  article(ctx, "ARTICLE 3 - Dénomination sociale");
  ecrire(ctx, `La dénomination de la Société est : ${d.denomination}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Tous les actes et documents émanant de la Société et destinés aux tiers, et notamment les lettres, factures, devis, annonces et publications diverses, doivent indiquer la dénomination sociale précédée ou suivie immédiatement des mots « société à responsabilité limitée à associé unique » ou de l'abréviation « EURL », de l'énonciation du montant du capital social, ainsi que du numéro d'immatriculation de la Société au Registre du commerce et des sociétés.",
  );

  article(ctx, "ARTICLE 4 - Siège social");
  ecrire(ctx, `Le siège social est fixé : ${d.siege_adresse}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Il pourra être transféré en tout autre lieu du territoire national par simple décision de la gérance, laquelle est habilitée à modifier les statuts en conséquence, sous réserve de ratification par la plus prochaine décision de l'associé unique ou, en cas de pluralité d'associés, de la plus prochaine assemblée générale extraordinaire.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "La gérance peut créer, déplacer ou supprimer tous établissements, agences, succursales, bureaux ou dépôts, en France comme à l'étranger.",
  );

  article(ctx, "ARTICLE 5 - Durée");
  ecrire(
    ctx,
    `La durée de la Société est fixée à ${montantEnLettresFr(Number(d.duree_annees))} (${
      d.duree_annees
    }) années à compter de son immatriculation au Registre du commerce et des sociétés, sauf prorogation ou dissolution anticipée. Un an au moins avant la date d'expiration de la Société, la gérance doit provoquer une décision de l'associé unique ou, en cas de pluralité d'associés, une assemblée générale extraordinaire, à l'effet de décider si la Société doit être prorogée.`,
  );

  article(ctx, "ARTICLE 6 - Exercice social");
  ecrire(ctx, `L'exercice social commence le ${ouverture} et se termine le ${cloture} de chaque année.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Par exception, le premier exercice social commencera à compter de la date d'immatriculation de la Société au Registre du commerce et des sociétés et sera clos le ${dateEnLettresFr(
      d.date_cloture_premier_exercice,
    )}.${
      duree === "superieure"
        ? " Sa durée sera donc supérieure à douze mois."
        : duree === "inferieure"
          ? " Sa durée sera donc inférieure à douze mois."
          : ""
    }`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les opérations réalisées pour le compte de la Société en formation, telles qu'elles figurent en annexe des présents statuts, et reprises par la Société du fait de son immatriculation, seront rattachées à ce premier exercice.",
  );

  article(ctx, "TITRE II - APPORTS - CAPITAL SOCIAL - PARTS SOCIALES");

  article(ctx, "ARTICLE 7 - Apports");
  ecrire(
    ctx,
    `${nomCompletPhysique(a)}, associé${e} unique, apporte à la Société la somme en numéraire de ${montantEnLettresFr(
      capital,
    )} (${capital} €), correspondant à la souscription de la totalité des ${montantEnLettresFr(
      nbParts,
    )} (${nbParts}) parts sociales composant le capital social.`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    `Cette somme a été intégralement versée et déposée, pour le compte de la Société en formation, auprès de ${d.banque_depot}, ainsi qu'en atteste le certificat de dépôt des fonds établi par ledit établissement, lequel demeurera annexé aux présents statuts.`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les fonds seront retirés par la gérance sur présentation de l'extrait d'immatriculation de la Société au Registre du commerce et des sociétés.",
  );

  article(ctx, "ARTICLE 8 - Capital social");
  ecrire(ctx, `Le capital social est fixé à la somme de ${montantEnLettresFr(capital)} (${capital} €).`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Il est divisé en ${montantEnLettresFr(nbParts)} (${nbParts}) parts sociales de ${montantEnLettresFr(
      nominal,
    )} (${nominal} €) de valeur nominale chacune, numérotées de 1 à ${nbParts}, entièrement souscrites et intégralement libérées, et attribuées en totalité à l'associé${e} unique, ${nomCompletPhysique(
      a,
    )}.`,
  );

  article(ctx, "ARTICLE 9 - Origine des fonds - Information du conjoint de l'associé");
  if (variante === "A") {
    ecrire(
      ctx,
      `L'associé${e} unique déclare que les fonds apportés au capital social lui appartiennent en propre et qu'aucune disposition légale ou conventionnelle ne subordonne leur emploi à l'information ou au consentement d'un tiers.`,
    );
  } else {
    ecrire(
      ctx,
      `Conformément aux dispositions de l'article 1832-2 du Code civil, l'associé${e} unique déclare que les fonds apportés au capital social proviennent de biens communs de la communauté existant entre ${
        elle ? "elle" : "lui"
      }-même et ${elle ? "son" : "son"} conjoint${
        a.conjoint_civilite === "Madame" ? "e" : ""
      } mentionné${a.conjoint_civilite === "Madame" ? "e" : ""} au début des présents statuts.`,
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      `L'associé${e} unique déclare avoir informé son conjoint, préalablement à la souscription des parts sociales, de l'emploi de fonds communs à cette souscription. Justification de cette information est expressément donnée dans le présent acte, dont son conjoint reconnaît avoir eu connaissance.`,
    );
    if (variante === "B") {
      espace(ctx, 4);
      ecrire(
        ctx,
        `Le conjoint de l'associé${e} unique déclare, aux termes de la déclaration figurant en annexe des présents statuts, renoncer expressément à la faculté de revendiquer la qualité d'associé pour la moitié des parts sociales souscrites au moyen de fonds communs.`,
      );
    }
    espace(ctx, 4);
    ecrire(
      ctx,
      "À défaut de renonciation, et si le conjoint venait à notifier à la Société son intention de revendiquer la qualité d'associé pour la moitié des parts souscrites au moyen de fonds communs, cette revendication serait soumise à l'agrément prévu à l'article 15 des présents statuts, l'agrément de l'associé souscripteur ne valant pas agrément du conjoint revendiquant.",
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      "Il est rappelé que la qualité d'associé, dans les rapports entre les époux, est attachée à la personne du souscripteur, tandis que la valeur patrimoniale des parts sociales demeure commune.",
    );
  }

  article(ctx, "ARTICLE 10 - Modification du capital social");
  ecrire(ctx, "10.1 - Augmentation du capital", { bold: true });
  espace(ctx, 2);
  [
    "Le capital social peut être augmenté, en une ou plusieurs fois, par décision de l'associé unique ou, en cas de pluralité d'associés, par décision collective extraordinaire, soit par apports en numéraire ou en nature, soit par incorporation de tout ou partie des bénéfices ou réserves disponibles, au moyen de la création de parts sociales nouvelles ou de l'élévation de la valeur nominale des parts existantes.",
    "Les parts nouvelles peuvent être créées au pair ou avec prime d'émission ; dans ce dernier cas, la décision d'augmentation du capital fixe le montant de la prime et détermine son affectation.",
    "Le capital social doit être intégralement libéré avant toute souscription de parts nouvelles à libérer en numéraire. En cas d'augmentation de capital par souscription de parts sociales en numéraire, les fonds provenant de la libération sont déposés dans les conditions et selon les modalités légales.",
    "Si l'augmentation de capital est réalisée, en tout ou partie, au moyen d'apports en nature, l'évaluation de chaque apport est faite au vu d'un rapport établi sous sa responsabilité par un commissaire aux apports désigné dans les conditions légales, sauf dispense légalement admise.",
    "En cas de pluralité d'associés, chaque associé dispose, proportionnellement au nombre de parts qu'il possède, d'un droit de préférence à la souscription des parts nouvelles émises en représentation d'apports en numéraire. Ce droit peut être cédé sous réserve de l'agrément du cessionnaire, ou faire l'objet d'une renonciation individuelle notifiée à la Société.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });
  ecrire(ctx, "10.2 - Réduction du capital", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Le capital social peut être réduit, pour quelque cause et de quelque manière que ce soit, par décision de l'associé unique ou, en cas de pluralité d'associés, par décision collective extraordinaire. En aucun cas, la réduction ne peut porter atteinte à l'égalité des associés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas de réduction du capital motivée par des pertes, ou de constatation de capitaux propres devenus inférieurs à la moitié du capital social, il sera procédé conformément aux dispositions des articles L. 223-2, L. 223-42 et L. 223-43 du Code de commerce.",
  );

  article(ctx, "ARTICLE 11 - Représentation des parts sociales");
  ecrire(
    ctx,
    "Les parts sociales ne peuvent être représentées par des titres négociables. Les droits de l'associé résultent seulement des présents statuts, des actes modificatifs ultérieurs et des cessions de parts régulièrement notifiées et publiées.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Une copie ou un extrait de ces actes et pièces est délivré à tout associé sur sa demande et à ses frais. La Société peut émettre des parts sociales en rémunération des apports en industrie qui lui sont effectués. Ces parts, émises sans valeur nominale, ne sont pas prises en compte pour la formation du capital social ; elles sont attribuées à titre personnel, sont incessibles et sont annulées en cas de décès de leur titulaire comme en cas de cessation des prestations dues par ce dernier.",
  );

  article(ctx, "ARTICLE 12 - Droits et obligations attachés aux parts sociales");
  [
    "Chaque part sociale donne droit à une fraction des bénéfices et de l'actif social proportionnellement au nombre de parts existantes.",
    "Les droits et obligations attachés aux parts suivent celles-ci en quelques mains qu'elles passent. La propriété d'une part emporte de plein droit adhésion aux statuts et aux décisions régulièrement prises par l'associé unique ou par la collectivité des associés.",
    "Les représentants, ayants droit, conjoint et héritiers d'un associé ne peuvent, sous quelque prétexte que ce soit, requérir l'apposition des scellés sur les biens et valeurs de la Société, ni en demander le partage ou la licitation.",
    "L'associé n'est responsable qu'à concurrence du montant de ses apports.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 13 - Indivisibilité des parts - Indivision - Démembrement de propriété");
  ecrire(
    ctx,
    "Les parts sociales sont indivisibles à l'égard de la Société, qui ne reconnaît qu'un seul propriétaire pour chacune d'elles.",
  );
  espace(ctx, 4);
  ecrire(ctx, "13.1 - Indivision", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Les copropriétaires indivis de parts sociales sont tenus de désigner l'un d'entre eux, ou un tiers, pour les représenter auprès de la Société ; le nom du représentant est notifié à la Société par lettre recommandée avec demande d'avis de réception, ainsi que toute révocation ou modification. À défaut d'entente, il appartient à l'indivisaire le plus diligent de faire désigner par voie de justice un mandataire chargé de les représenter.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Tant que cette désignation n'a pas été notifiée à la Société, celle-ci peut valablement s'abstenir de convoquer les indivisaires et de leur adresser toute information ; les parts indivises ne sont alors pas prises en compte pour le calcul du quorum et de la majorité.",
  );
  espace(ctx, 4);
  ecrire(ctx, "13.2 - Usufruit et nue-propriété", { bold: true });
  espace(ctx, 2);
  [
    "En cas de démembrement du droit de propriété d'une ou plusieurs parts sociales, le droit de vote appartient à l'usufruitier pour toutes les décisions ordinaires, notamment celles relatives à l'affectation des résultats et à la distribution des bénéfices, et au nu-propriétaire pour toutes les décisions extraordinaires, notamment celles portant modification des statuts, augmentation ou réduction du capital, transformation, fusion, dissolution de la Société ou agrément d'un nouvel associé.",
    "Toutefois, l'usufruitier et le nu-propriétaire peuvent convenir entre eux de toute autre répartition du droit de vote, à condition d'en informer la Société par lettre recommandée avec demande d'avis de réception, en temps utile avant la décision concernée, et sous réserve que l'usufruitier ne soit pas privé du droit de voter les décisions relatives à l'affectation des bénéfices.",
    "Quelle que soit la répartition retenue, le nu-propriétaire et l'usufruitier sont l'un et l'autre convoqués à toutes les assemblées et disposent du même droit d'information et de communication que l'associé en pleine propriété.",
    "Le droit de participer aux décisions collectives ne peut être supprimé au nu-propriétaire.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 14 - Comptes courants d'associés");
  [
    "L'associé unique ou, en cas de pluralité d'associés, chacun des associés, peut laisser ou mettre à la disposition de la Société toutes sommes dont celle-ci peut avoir besoin. Ces avances ne peuvent en aucun cas être assimilées à des apports en capital.",
    "Les conditions de retrait de ces sommes et leur rémunération éventuelle sont fixées, selon le cas, par décision de l'associé unique ou d'accord commun entre la gérance et l'associé intéressé, sous réserve, en cas de pluralité d'associés, d'une décision collective.",
    "Les conventions d'avances en compte courant sont soumises, le cas échéant, à la procédure de contrôle des conventions prévue à l'article L. 223-19 du Code de commerce. Il est rappelé qu'il est interdit à l'associé personne physique, ainsi qu'au gérant, de contracter des emprunts auprès de la Société, de se faire consentir par elle un découvert en compte courant ou autrement, ou de faire cautionner ou avaliser par elle ses engagements envers les tiers, à peine de nullité du contrat.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "TITRE III - CESSION ET TRANSMISSION DES PARTS SOCIALES");

  article(ctx, "ARTICLE 15 - Cession des parts sociales entre vifs");
  ecrire(ctx, "15.1 - Forme de la cession", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "La cession des parts sociales s'opère par acte authentique ou sous seing privé. Elle est rendue opposable à la Société dans les formes de l'article 1690 du Code civil ; toutefois, la signification peut être remplacée par le dépôt d'un original de l'acte de cession au siège social contre remise par le gérant d'une attestation de ce dépôt.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Pour être opposable aux tiers, la cession doit en outre faire l'objet des formalités de publicité légales, notamment du dépôt au Registre du commerce et des sociétés de deux copies certifiées conformes des statuts mis à jour.",
  );
  espace(ctx, 6);
  ecrire(ctx, "15.2 - Agrément", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Tant que la Société ne comporte qu'un seul associé, celui-ci peut céder librement tout ou partie de ses parts sociales.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas de pluralité d'associés, les parts sociales sont librement cessibles entre associés. Elles ne peuvent être cédées, à titre onéreux ou à titre gratuit, à un cessionnaire n'ayant pas déjà la qualité d'associé, quel que soit son degré de parenté avec le cédant, y compris au profit du conjoint, d'un ascendant ou d'un descendant, qu'avec le consentement de la majorité des associés représentant au moins la moitié des parts sociales.",
  );
  if (qualification) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "Pour l'appréciation de l'agrément, il est expressément stipulé que constitue un motif légitime de refus l'incapacité du cessionnaire à assurer la continuité des activités de la Société, appréciée au regard des qualifications professionnelles dont il dispose personnellement ou dont dispose la personne qu'il s'engage à faire employer par la Société, ainsi qu'au regard du maintien, au bénéfice de la Société, des garanties d'assurance appropriées.",
    );
  }
  espace(ctx, 6);
  ecrire(ctx, "15.3 - Procédure d'agrément", { bold: true });
  espace(ctx, 2);
  [
    "Le projet de cession est notifié à la Société et à chacun des associés par acte extrajudiciaire ou par lettre recommandée avec demande d'avis de réception, avec indication des nom(s), prénom(s), profession(s) et domicile du cessionnaire proposé, du nombre de parts dont la cession est envisagée et du prix offert.",
    "Dans les huit jours de cette notification, la gérance convoque l'assemblée des associés ou consulte ceux-ci par écrit sur le projet. La décision de la Société est notifiée au cédant par lettre recommandée avec demande d'avis de réception. À défaut de notification dans le délai de trois mois à compter de la dernière des notifications, le consentement à la cession est réputé acquis.",
    "Si la Société a refusé de consentir à la cession, les associés sont tenus, dans le délai de trois mois à compter de ce refus, d'acquérir ou de faire acquérir les parts à un prix payable comptant et fixé conformément à l'article 1843-4 du Code civil, les frais d'expertise étant à la charge de la Société, ou fixé d'un commun accord entre les parties. La Société peut également, avec le consentement de l'associé cédant, décider dans le même délai de réduire son capital du montant de la valeur nominale des parts de cet associé et de racheter ces parts. À la demande de la gérance, ce délai peut être prolongé par décision de justice, sans que la ou les prolongations puissent excéder six mois.",
    "Si, à l'expiration du délai imparti, aucune des solutions prévues ci-dessus n'est intervenue, l'associé peut réaliser la cession initialement projetée.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 16 - Transmission des parts sociales par décès");
  ecrire(ctx, "16.1 - Continuation de la Société", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "La Société n'est pas dissoute par le décès de son associé unique ou de l'un de ses associés. Elle continue de plein droit avec ses héritiers, légataires et ayants droit, y compris son conjoint survivant, ainsi qu'avec les associés survivants s'il en existe.",
  );
  if (qualification) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "Il est expressément stipulé que l'absence, chez les héritiers, légataires, ayants droit ou conjoint survivant, des qualifications professionnelles ou de l'assurabilité nécessaires à l'exercice des activités de la Société ne constitue en aucun cas une cause de dissolution de la Société, ni un obstacle à la transmission de la valeur patrimoniale des parts sociales. Elle ouvre uniquement les facultés et obligations prévues à l'article 16.5.",
    );
  }
  espace(ctx, 6);
  ecrire(ctx, "16.2 - Agrément des héritiers en cas de pluralité d'associés", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    `Lorsque la Société comporte plusieurs associés, les héritiers, légataires, ayants droit et le conjoint survivant d'un associé décédé ne peuvent devenir associés qu'après avoir été agréés par les associés survivants représentant plus de la moitié des parts sociales.${
      qualification
        ? " L'incapacité à assurer la continuité des activités de la Société, appréciée dans les termes de l'article 15.2, constitue un motif légitime de refus d'agrément."
        : ""
    }`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "La procédure d'agrément et, en cas de refus, l'obligation d'acquisition ou de rachat des parts s'exercent dans les conditions et selon les délais prévus par les articles L. 223-13 et L. 223-14 du Code de commerce sans qu'il soit institué de délai statutaire supplémentaire.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Cette clause d'agrément est sans application lorsque la Société ne comporte qu'un seul associé, la transmission des parts s'opérant alors de plein droit au profit des héritiers, légataires, ayants droit et du conjoint survivant.",
  );
  espace(ctx, 6);
  ecrire(ctx, "16.3 - Justification des qualités héréditaires", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Les héritiers, légataires, ayants droit et le conjoint survivant justifient de leurs qualités auprès de la Société par la production d'un acte de notoriété, d'un extrait d'intitulé d'inventaire, d'un acte de partage ou de tout autre acte notarié établissant lesdites qualités, sans préjudice du droit, pour la gérance, de requérir de tout notaire la délivrance d'expéditions ou d'extraits de tous actes établissant ces qualités.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Aucun délai n'est imparti pour cette justification. Tant qu'elle n'est pas intervenue, la Société peut valablement suspendre l'exercice des droits attachés aux parts transmises, à l'exception du droit d'information, sans que cette suspension puisse être source de responsabilité pour quiconque.",
  );
  espace(ctx, 6);
  ecrire(ctx, "16.4 - Représentation de l'indivision successorale", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Les parts recueillies en indivision par plusieurs héritiers ou ayants droit sont représentées, dans les conditions de l'article 13.1 des présents statuts, par un mandataire unique désigné par les indivisaires. À défaut d'accord entre eux, la désignation peut être demandée en justice par l'indivisaire le plus diligent, à tout moment.",
  );
  espace(ctx, 6);
  ecrire(ctx, "16.5 - Sort de l'activité et continuité de la gérance", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "En cas de décès du gérant, associé unique ou associé, les actes de gestion courante et conservatoire peuvent être accomplis par le mandataire à effet posthume s'il en a été désigné un, par l'exécuteur testamentaire, ou par le mandataire de l'indivision successorale, sans qu'aucune formalité préalable soit exigée par la Société.",
  );
  if (qualification) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "Aussi longtemps que la Société ne dispose pas, en la personne de son gérant, d'un mandataire, d'un préposé ou d'un salarié, des qualifications professionnelles et des garanties d'assurance des activités visées à l'article 2, l'exercice des activités de la Société est suspendu de plein droit. Pendant cette suspension, la Société n'accepte aucune mission nouvelle relevant de ces activités et ne poursuit les missions en cours que dans la mesure où elles demeurent effectivement couvertes par les garanties d'assurance en vigueur. Cette suspension ne fait obstacle ni à la poursuite des activités de la Société, ni à l'accomplissement de tous actes conservatoires, ni au recouvrement des créances et au règlement des dettes de la Société.",
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      "Les héritiers, légataires, ayants droit et le conjoint survivant, ou bien le mandataire les représentant, disposent, sans condition de délai et à leur seule initiative, de la faculté de mettre en œuvre l'une des solutions suivantes, ou plusieurs d'entre elles successivement :",
    );
    espace(ctx, 4);
    [
      "désigner en qualité de gérant une personne, associée ou non, justifiant des qualifications professionnelles requises et acceptée par l'entreprise d'assurance, dans les conditions de l'article 19 des présents statuts ;",
      "faire employer par la Société un ou plusieurs salariés justifiant de ces qualifications et leur confier la direction technique des missions relevant de l'objet de la Société, sous réserve de l'accord préalable de l'assureur ;",
      "céder à un tiers qualifié le fonds de commerce, la clientèle, les contrats en cours et les moyens d'exploitation attachés aux activités de la Société ;",
      "restreindre l'objet social de la Société ;",
      "céder tout ou partie des parts sociales dans les conditions de l'article 15, ou prononcer la dissolution anticipée de la Société dans les conditions de l'article 34.",
    ].forEach((t) => puce(ctx, t));
    ecrire(
      ctx,
      "Il est expressément stipulé que l'absence d'exercice de l'une de ces facultés, quelle qu'en soit la durée, ne constitue ni une faute, ni un motif de dissolution, ni une cause de responsabilité à l'égard de la Société ou des tiers.",
    );
  }
  espace(ctx, 6);
  ecrire(ctx, "16.6 - Attribution préférentielle et faculté de rachat", { bold: true });
  espace(ctx, 2);
  if (qualification) {
    ecrire(
      ctx,
      "Celui des héritiers, légataires, ayants droit ou le conjoint survivant qui justifie des qualifications professionnelles requises, ou qui participait effectivement à l'exploitation à la date du décès, pourra demander l'attribution préférentielle des parts sociales dans les conditions des articles 831 et suivants du Code civil, à charge de soulte.",
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      "À défaut d'attribution préférentielle, tout héritier, légataire, ayant droit ou le conjoint survivant qui ne dispose pas de ces qualifications pourra, à tout moment, demander le rachat de tout ou partie de ses parts, soit par un autre ayant droit, soit par un tiers agréé, soit par la Société elle-même au moyen d'une réduction de capital décidée dans les conditions légales. Le prix sera fixé d'un commun accord ou, à défaut, conformément à l'article 1843-4 du Code civil, les frais d'expertise étant à la charge de la Société. Un délai de paiement pourra être accordé à la Société dans les limites autorisées par la loi.",
    );
  } else {
    ecrire(
      ctx,
      "Celui des héritiers, légataires, ayants droit ou le conjoint survivant qui participait effectivement à l'exploitation à la date du décès pourra demander l'attribution préférentielle des parts sociales dans les conditions des articles 831 et suivants du Code civil, à charge de soulte. À défaut, tout héritier, légataire, ayant droit ou le conjoint survivant pourra demander le rachat de tout ou partie de ses parts, soit par un autre ayant droit, soit par un tiers agréé, soit par la Société elle-même au moyen d'une réduction de capital décidée dans les conditions légales. Le prix sera fixé d'un commun accord ou, à défaut, conformément à l'article 1843-4 du Code civil, les frais d'expertise étant à la charge de la Société.",
    );
  }
  espace(ctx, 6);
  ecrire(ctx, "16.7 - Mandat à effet posthume", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "L'associé est expressément invité à désigner, par acte notarié et en application des articles 812 et suivants du Code civil, un mandataire à effet posthume chargé d'administrer ses parts sociales et, le cas échéant, d'exercer les prérogatives attachées à la gérance pendant la période de règlement de la succession, ainsi qu'à organiser par testament les modalités de transmission ou de cession de l'activité de la Société.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "La Société reconnaîtra la qualité et les pouvoirs de ce mandataire sur simple production de l'acte de désignation, sans autre formalité.",
  );

  article(
    ctx,
    "ARTICLE 17 - Dissolution de la communauté du vivant de l'associé - Représentation des mineurs",
  );
  ecrire(ctx, "17.1 - Dissolution de la communauté du vivant de l'associé", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "En cas de dissolution de la communauté de biens existant entre l'associé et son conjoint, pour cause de divorce, de séparation de corps, de séparation judiciaire de biens, de changement de régime matrimonial ou pour toute autre cause, l'attribution de parts communes à l'époux ou ex-époux qui n'avait pas la qualité d'associé est soumise, en cas de pluralité d'associés, à l'agrément prévu à l'article 15.2 des présents statuts, l'agrément de l'époux souscripteur ne valant pas agrément de l'époux attributaire.",
  );
  if (qualification) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "L'associé qui exerce effectivement l'activité de la Société, ou qui justifie des qualifications professionnelles nécessaires à son exercice, bénéficiera à sa demande de l'attribution préférentielle de l'intégralité des parts sociales, en application des articles 1476 et 831 et suivants du Code civil, à charge de soulte. Les parties reconnaissent expressément que la qualification professionnelle et l'assurabilité constituent, au sens de ces textes, l'aptitude à gérer l'entreprise et à s'y maintenir.",
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      "Lorsque la Société ne comporte qu'un seul associé et que l'attribution intervient au profit du conjoint ne disposant pas des qualifications requises, la suspension de plein droit prévue à l'article 16.5 s'applique, et l'attributaire dispose, sans condition de délai, des facultés énoncées au même article.",
    );
  }
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas de refus d'agrément, il est procédé conformément aux dispositions de l'article 15.3 des présents statuts, la valeur des parts étant déterminée à la date la plus proche possible de l'attribution.",
  );
  espace(ctx, 6);
  ecrire(ctx, "17.2 - Représentation des associés mineurs ou majeurs protégés", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Les parts sociales appartenant à un associé mineur non émancipé sont représentées par son ou ses administrateurs légaux, dans les conditions prévues par les articles 382 et suivants du Code civil ; les actes qui excèdent les pouvoirs d'administration légale, notamment l'apport en société, la cession des parts, la renonciation à un droit ou tout acte de disposition, requièrent l'autorisation préalable du juge des tutelles. Les parts appartenant à un majeur protégé sont représentées par la personne investie de sa protection, dans les conditions et limites de la mesure applicable.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les représentants légaux d'associés juridiquement incapables peuvent participer au vote même s'ils ne sont pas eux-mêmes associés.",
  );

  article(ctx, "ARTICLE 18 - Nantissement des parts sociales");
  ecrire(
    ctx,
    "Si la Société a donné son consentement à un projet de nantissement de parts sociales, ce consentement emportera agrément du cessionnaire en cas de réalisation forcée des parts nanties, à moins que la Société ne préfère, après la cession, acquérir ces parts sans délai en vue de réduire son capital.",
  );
  espace(ctx, 4);
  ecrire(ctx, "Le nantissement des parts sociales est constaté et rendu opposable dans les formes prévues par la loi.");

  article(ctx, "TITRE IV - GÉRANCE");

  article(ctx, "ARTICLE 19 - Désignation des gérants");
  ecrire(
    ctx,
    "La Société est gérée et administrée par un ou plusieurs gérants, personnes physiques, associés ou non, avec ou sans limitation de la durée de leur mandat.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le ou les premiers gérants sont désignés dans les conditions prévues à l'article 38 des présents statuts. En cours de vie sociale, le gérant est désigné par décision de l'associé unique ou, en cas de pluralité d'associés, par décision des associés représentant plus de la moitié des parts sociales, sans que cette décision puisse faire l'objet d'une seconde consultation à la simple majorité des votes émis.",
  );
  if (qualification) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "Toute nomination de gérant est subordonnée à la justification, par la personne désignée, des qualifications, titres, diplômes ou expérience professionnelle nécessaires à l'exercice des activités de la Société, ou à l'engagement pris par elle de confier la direction technique de ces activités à un salarié ou à un préposé en justifiant.",
    );
  }

  article(ctx, "ARTICLE 20 - Pouvoirs de la gérance");
  [
    "Dans ses rapports avec les tiers, le gérant est investi des pouvoirs les plus étendus pour représenter la Société et agir en son nom en toute circonstance, sans avoir à justifier de pouvoirs spéciaux, sous réserve des pouvoirs que la loi attribue à l'associé unique ou à la collectivité des associés.",
    "En cas de pluralité de gérants, chacun d'eux détient séparément ces pouvoirs ; l'opposition formée par l'un d'eux aux actes de ses collègues est sans effet à l'égard des tiers, à moins qu'il ne soit établi que ces derniers en ont eu connaissance.",
    "Toutefois, lorsque la Société comporte plusieurs associés et à titre de règlement intérieur, sans que cette clause puisse être opposée aux tiers ni invoquée par eux, les opérations suivantes devront être autorisées au préalable par décision collective ordinaire : tout achat, vente ou échange d'immeubles ou de fonds de commerce ; toute constitution d'hypothèque ou de nantissement ; toute prise ou mise en location-gérance ; tout cautionnement, aval ou garantie consenti au profit de tiers ; l'apport de tout ou partie des biens sociaux à une société constituée ou à constituer.",
    "Le gérant est expressément habilité à mettre les statuts en harmonie avec les dispositions impératives de la loi et des règlements, sous réserve de ratification de ces modifications par décision de l'associé unique ou, en cas de pluralité d'associés, par les associés représentant plus des trois quarts des parts sociales.",
    "Le gérant consacre aux affaires sociales le temps et les soins nécessaires ; il peut, sous sa responsabilité personnelle, déléguer temporairement ses pouvoirs à toute personne de son choix pour un ou plusieurs objets spéciaux et limités.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 21 - Durée des fonctions - Cessation");
  ecrire(
    ctx,
    "La durée des fonctions du gérant est fixée par la décision qui le nomme ; à défaut de précision, elle est illimitée.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le gérant est révocable par décision de l'associé unique ou, en cas de pluralité d'associés, par décision des associés représentant plus de la moitié des parts sociales. Si la révocation est décidée sans juste motif, elle peut donner lieu à des dommages-intérêts. En outre, le gérant est révocable par les tribunaux pour cause légitime, à la demande de tout associé.",
  );
  if (qualification) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "Constituent un juste motif de révocation du gérant, sans indemnité, la perte, le retrait, le non-renouvellement ou la résiliation, pour une cause qui lui est imputable, des qualifications professionnelles ou des garanties d'assurance des activités visées à l'article 2, ainsi que le fait d'accepter ou de poursuivre une mission relevant de l'objet de la Société en l'absence d'assurance.",
    );
  }
  espace(ctx, 4);
  [
    "Les fonctions du gérant cessent par son décès, son interdiction, sa déconfiture, sa faillite personnelle, une incompatibilité de fonctions, sa révocation ou sa démission. Le gérant peut démissionner de ses fonctions à charge d'en informer par écrit l'associé unique ou chacun des associés, dans un délai raisonnable tenant compte des nécessités de la continuité de l'exploitation.",
    "La cessation des fonctions du gérant n'entraîne pas la dissolution de la Société. Elle n'ouvre droit à aucune indemnité, sauf décision contraire de l'associé unique ou de la collectivité des associés.",
    "En cas de cessation des fonctions du gérant, pour quelque cause que ce soit, l'associé unique ou la collectivité des associés est habilité à modifier les statuts en vue de supprimer le nom du gérant, à la majorité simple des associés représentant plus de la moitié des parts sociales.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 22 - Rémunération de la gérance");
  ecrire(
    ctx,
    "Chaque gérant a droit, en rémunération de ses fonctions, à un traitement fixe, proportionnel, ou à la fois fixe et proportionnel, à passer par frais généraux, dont les modalités d'attribution et le montant sont fixés par décision de l'associé unique ou par décision collective ordinaire des associés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "La gérance a droit, en outre, au remboursement de ses frais de représentation, de déplacement et de mission, sur justificatifs ou selon les barèmes en vigueur.",
  );
  if (gerantAssocie) {
    espace(ctx, 4);
    ecrire(
      ctx,
      "Il est rappelé que le gérant associé unique d'une société à responsabilité limitée relève, pour sa protection sociale, du régime des travailleurs indépendants.",
    );
  }

  article(ctx, "ARTICLE 23 - Conventions entre la Société et son gérant ou son associé");
  [
    "Lorsque la Société ne comporte qu'un seul associé et que celui-ci est également gérant, les conventions intervenues, directement ou par personne interposée, entre la Société et lui-même sont seulement mentionnées au registre des décisions, conformément à l'article L. 223-19, alinéa 3, du Code de commerce.",
    "Dans les autres cas, ces conventions sont soumises à la procédure de contrôle prévue aux articles L. 223-19 et L. 223-20 du Code de commerce : le gérant ou, s'il en existe un, le commissaire aux comptes présente un rapport sur ces conventions ; l'associé intéressé ne peut prendre part au vote et ses parts ne sont pas prises en compte pour le calcul de la majorité. Les conventions non approuvées produisent néanmoins leurs effets, à charge pour le gérant et, s'il y a lieu, pour l'associé contractant, d'en supporter les conséquences préjudiciables à la Société.",
    "Ces dispositions ne sont pas applicables aux conventions portant sur des opérations courantes conclues à des conditions normales.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 24 - Responsabilité de la gérance");
  ecrire(
    ctx,
    "Le ou les gérants sont responsables envers la Société ou envers les tiers, soit des infractions aux dispositions légales et réglementaires, soit des violations des statuts, soit des fautes commises dans leur gestion, dans les conditions fixées par les articles L. 223-22 et suivants du Code de commerce.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "En cas d'ouverture d'une procédure collective à l'encontre de la Société, le gérant, ou l'associé qui s'est immiscé dans la gestion, peut être tenu de tout ou partie des dettes sociales et encourir les interdictions et déchéances prévues par la loi.",
  );

  article(ctx, "TITRE V - DÉCISIONS DE L'ASSOCIÉ UNIQUE ET DÉCISIONS COLLECTIVES");

  article(ctx, "ARTICLE 25 - Décisions de l'associé unique");
  [
    "L'associé unique exerce seul les pouvoirs dévolus par la loi à l'assemblée des associés. Il ne peut déléguer ces pouvoirs.",
    "Ses décisions, quelle qu'en soit la nature, sont constatées par des procès-verbaux ou des actes écrits datés et signés par lui, et répertoriés dans un registre coté et paraphé tenu au siège social, dans les conditions prévues par la réglementation. Les décisions prises en violation de ces dispositions peuvent être annulées à la demande de tout intéressé.",
    "Lorsque l'associé unique n'est pas gérant, le gérant établit un rapport sur les opérations soumises à approbation et le lui adresse quinze jours au moins avant l'établissement de la décision.",
    "Lorsque l'associé unique assume personnellement la gérance, le dépôt au Registre du commerce et des sociétés, dans le délai de six mois à compter de la clôture de l'exercice, de l'inventaire et des comptes annuels dûment signés vaut approbation des comptes, conformément à l'article L. 223-31 du Code de commerce.",
    "Les décisions prises par l'associé unique sont opposables aux tiers à compter de leur date.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 26 - Décisions collectives en cas de pluralité d'associés");
  ecrire(
    ctx,
    "Dès lors que la Société comporte plusieurs associés, les décisions collectives sont prises en assemblée ou, à l'exception de celles statuant sur les comptes annuels, par consultation écrite si la gérance le décide. Les décisions collectives sont qualifiées d'extraordinaires lorsqu'elles ont pour objet la modification des statuts ; elles sont qualifiées d'ordinaires dans tous les autres cas.",
  );
  espace(ctx, 6);
  ecrire(ctx, "26.1 - Décisions ordinaires", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Les décisions ordinaires sont adoptées par un ou plusieurs associés représentant plus de la moitié des parts sociales. Si cette majorité n'est pas obtenue à la première consultation, les associés sont consultés une seconde fois et les décisions sont prises à la majorité des votes émis, quelle que soit la proportion du capital représenté, mais ne peuvent porter que sur les questions ayant fait l'objet de la première consultation.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Toutefois, les décisions relatives à la nomination ou à la révocation de la gérance requièrent, en toute hypothèse, l'accord d'associés représentant plus de la moitié des parts sociales, sans seconde consultation possible à la simple majorité des votes émis.",
  );
  espace(ctx, 6);
  ecrire(ctx, "26.2 - Décisions extraordinaires", { bold: true });
  espace(ctx, 2);
  [
    "Les décisions extraordinaires ne peuvent être valablement adoptées que si les associés présents ou représentés possèdent au moins le quart des parts sociales. À défaut de ce quorum, une deuxième assemblée doit être convoquée dans les deux mois de la première, le quorum requis étant alors le cinquième des parts sociales.",
    "Les modifications statutaires sont décidées à la majorité des deux tiers des parts détenues par les associés présents ou représentés.",
    "Par exception, l'agrément des cessions ou mutations de parts sociales est donné à la majorité des associés représentant au moins la moitié des parts sociales, et l'augmentation du capital par incorporation de bénéfices ou de réserves est valablement décidée par les associés représentant seulement la moitié des parts sociales.",
    "La transformation de la Société en société en nom collectif, en société en commandite simple ou par actions, en société par actions simplifiée, le changement de nationalité de la Société et l'augmentation des engagements des associés exigent l'unanimité de ceux-ci.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 27 - Assemblées générales");
  [
    "Les assemblées d'associés sont convoquées par la gérance ou, à défaut, par le commissaire aux comptes s'il en existe un, ou encore par un mandataire désigné en justice à la demande de tout associé.",
    "La réunion d'une assemblée peut être demandée par un ou plusieurs associés représentant au moins la moitié des parts sociales, ou à la fois le quart en nombre des associés et le quart des parts sociales.",
    "Les associés sont convoqués quinze jours au moins avant la réunion, par lettre recommandée ou par tout moyen de communication électronique auquel ils ont préalablement consenti, la convocation comportant l'ordre du jour arrêté par son auteur ainsi que le texte des résolutions proposées.",
    "L'assemblée appelée à statuer sur les comptes doit être réunie dans le délai de six mois à compter de la clôture de l'exercice, sauf prolongation accordée par décision de justice.",
    "Chaque associé a le droit de participer aux décisions et dispose d'un nombre de voix égal à celui des parts qu'il possède. Il peut se faire représenter par son conjoint ou par un autre associé, à moins que la Société ne comprenne que les deux époux ou seulement deux associés, auquel cas la représentation par toute autre personne est admise.",
    "L'assemblée est présidée par le gérant ou l'un des gérants s'il est associé ; à défaut, par l'associé présent et acceptant qui possède ou représente le plus grand nombre de parts sociales.",
    "Toute assemblée irrégulièrement convoquée peut être annulée ; toutefois, l'action en nullité n'est pas recevable lorsque tous les associés étaient présents ou représentés et que leur droit de communication a été respecté.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 28 - Procès-verbaux et registre des décisions");
  [
    "Toute décision de l'associé unique ou toute délibération de l'assemblée des associés est constatée par un procès-verbal indiquant la date et le lieu, l'identité de l'auteur de la décision ou des associés présents et représentés avec le nombre de parts détenues par chacun, les documents et rapports soumis, un résumé des débats, le texte des résolutions et le résultat des votes.",
    "Les procès-verbaux et actes de décision sont établis et conservés sur un registre spécial tenu au siège social, coté et paraphé dans les conditions réglementaires, ou sur des feuilles mobiles numérotées sans discontinuité et paraphées dans les mêmes conditions. Toute addition, suppression, substitution ou interversion de feuilles est interdite.",
    "Les copies ou extraits sont valablement certifiés conformes par un gérant et, au cours de la liquidation, par le liquidateur.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 29 - Information de l'associé");
  [
    "Quinze jours au moins avant la date de la décision ou de l'assemblée appelée à statuer sur les comptes d'un exercice, la gérance adresse à l'associé unique ou à chacun des associés les comptes annuels, le cas échéant le rapport de gestion, le texte des résolutions proposées et, s'il en existe, le rapport du commissaire aux comptes. L'inventaire est tenu au siège social à sa disposition.",
    "À compter de cette communication, tout associé a la faculté de poser par écrit des questions auxquelles la gérance est tenue de répondre.",
    "Tout associé a le droit, à toute époque, de prendre connaissance par lui-même, au siège social, des comptes annuels, inventaires, rapports et procès-verbaux concernant les trois derniers exercices, et d'en prendre copie, à l'exception de l'inventaire.",
    "Tout associé non gérant peut, deux fois par exercice, poser au gérant des questions écrites sur tout fait de nature à compromettre la continuité de l'exploitation. Un ou plusieurs associés représentant au moins le dixième du capital social peuvent demander en justice la désignation d'un expert chargé de présenter un rapport sur une ou plusieurs opérations de gestion.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "TITRE VI - CONTRÔLE - COMPTES SOCIAUX - RÉGIME FISCAL");

  article(ctx, "ARTICLE 30 - Commissaire aux comptes");
  ecrire(
    ctx,
    "La nomination d'un commissaire aux comptes titulaire, et le cas échéant d'un suppléant, est obligatoire dans les cas et selon les seuils prévus par la loi et les règlements. Elle est facultative dans les autres cas et peut être décidée par l'associé unique ou par décision collective ordinaire ; elle peut également être demandée en justice par un ou plusieurs associés représentant au moins le dixième du capital social.",
  );
  espace(ctx, 4);
  ecrire(ctx, "Le commissaire aux comptes exerce ses fonctions et est révoqué dans les conditions prévues par la loi.");

  article(ctx, "ARTICLE 31 - Comptes sociaux");
  [
    "Il est tenu une comptabilité régulière des opérations sociales, conformément à la loi et aux usages du commerce.",
    "À la clôture de chaque exercice, la gérance dresse l'inventaire des divers éléments de l'actif et du passif existant à cette date, ainsi que les comptes annuels comprenant le bilan, le compte de résultat et l'annexe, en se conformant aux dispositions légales et réglementaires.",
    "Conformément à l'article L. 232-1, IV, du Code de commerce, la Société est dispensée de l'établissement d'un rapport de gestion tant que l'associé unique, personne physique, assume personnellement la gérance et que les seuils réglementaires ne sont pas dépassés ; les informations relatives aux événements importants survenus depuis la clôture demeurent portées à la connaissance de l'associé.",
    "Les comptes annuels et, le cas échéant, les autres documents requis sont déposés au Registre du commerce et des sociétés dans le mois suivant leur approbation, ou dans les deux mois en cas de dépôt par voie électronique. La Société pourra, dans les cas et conditions prévus par la loi, demander que ses comptes annuels ne soient pas rendus publics.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 32 - Régime fiscal");
  if (!isOption) {
    ecrire(
      ctx,
      "L'associé unique étant une personne physique, les résultats de la Société sont imposés entre ses mains dans les conditions prévues à l'article 8 du Code général des impôts, selon le régime fiscal des sociétés de personnes.",
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      "La Société conserve la faculté d'opter ultérieurement pour son assujettissement à l'impôt sur les sociétés dans les conditions prévues aux articles 206, 3 et 239 du Code général des impôts.",
    );
  } else {
    [
      "La Société opte expressément, dès sa constitution, pour son assujettissement à l'impôt sur les sociétés conformément aux dispositions des articles 206, 3 et 239 du Code général des impôts.",
      "En conséquence, les bénéfices sociaux sont déterminés et imposés selon les règles applicables aux sociétés soumises à l'impôt sur les sociétés, à l'exclusion du régime des sociétés de personnes visé à l'article 8, 4° du Code général des impôts.",
      "La gérance est expressément mandatée pour accomplir toutes les formalités nécessaires à la prise d'effet de cette option, et notamment pour la notifier au service des impôts des entreprises compétent dans les délais légaux, et en tout état de cause avant la fin du troisième mois du premier exercice au titre duquel elle doit s'appliquer, ou pour l'exercer lors de l'accomplissement des formalités de création de la Société.",
      "Une copie de la notification de cette option et de l'accusé de réception correspondant sera conservée au siège social et annexée au registre des décisions de l'associé unique.",
    ].forEach((t) => {
      ecrire(ctx, t);
      espace(ctx, 4);
    });
  }

  article(ctx, "ARTICLE 33 - Affectation et répartition des résultats");
  [
    "Les produits nets de l'exercice, déduction faite des frais généraux et autres charges de la Société, y compris tous amortissements et provisions, constituent le bénéfice.",
    "Sur ce bénéfice, diminué le cas échéant des pertes antérieures, il est prélevé cinq pour cent au moins pour doter la réserve légale. Ce prélèvement cesse d'être obligatoire lorsque la réserve légale atteint le dixième du capital social ; il reprend son cours si, pour une cause quelconque, la réserve légale descend au-dessous de ce dixième.",
    "Le bénéfice distribuable est constitué par le bénéfice de l'exercice, diminué des pertes antérieures et des sommes portées en réserve en application de la loi ou des statuts, et augmenté du report à nouveau bénéficiaire.",
    "Ce bénéfice est à la disposition de l'associé unique ou, en cas de pluralité d'associés, de la collectivité des associés, qui peut décider de le distribuer, de le reporter à nouveau ou de l'affecter à tous postes de réserves générales ou spéciales dont l'emploi est déterminé.",
    "Les dividendes sont mis en paiement dans un délai maximal de neuf mois à compter de la clôture de l'exercice, sauf prolongation par décision de justice.",
    "Les pertes de l'exercice, s'il en existe, sont inscrites au report à nouveau pour être imputées sur les bénéfices des exercices ultérieurs jusqu'à apurement complet.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "TITRE VII - DISSOLUTION - LIQUIDATION - CONTESTATIONS");

  article(ctx, "ARTICLE 34 - Dissolution");
  [
    "La Société est dissoute à l'arrivée de son terme statutaire, sauf prorogation, ou par décision anticipée de l'associé unique ou, en cas de pluralité d'associés, par décision collective extraordinaire.",
    "L'existence de pertes ayant pour effet de réduire les capitaux propres à un montant inférieur à la moitié du capital social peut entraîner la dissolution judiciaire de la Société dans les conditions prévues aux articles L. 223-2 et L. 223-42 du Code de commerce.",
    "Si le nombre des associés vient à être supérieur à cent, la Société doit, dans l'année, être transformée en société d'une autre forme ; à défaut, elle est dissoute.",
    "Il est expressément rappelé que, l'associé unique étant une personne physique, la dissolution de la Société entraîne sa liquidation dans les conditions de droit commun, la transmission universelle du patrimoine prévue à l'article 1844-5 du Code civil n'étant pas applicable.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 35 - Liquidation");
  [
    "La Société entre en liquidation dès l'instant de sa dissolution. Sa dénomination est alors suivie des mots « société en liquidation ». La personnalité morale subsiste pour les besoins de la liquidation et jusqu'à la clôture de celle-ci.",
    "Le ou les liquidateurs sont désignés par la décision qui prononce la dissolution. Ils sont investis des pouvoirs les plus étendus, sous réserve des dispositions légales, pour réaliser l'actif, payer le passif et répartir le solde disponible.",
    "L'associé unique ou la collectivité des associés conserve les mêmes attributions qu'au cours de la vie sociale ; les pouvoirs de la gérance et, le cas échéant, du commissaire aux comptes prennent fin à compter de la dissolution.",
    "En fin de liquidation, il est statué sur les comptes définitifs, sur le quitus du liquidateur et la décharge de son mandat, et il est constaté la clôture de la liquidation. Le solde de liquidation est réparti entre les associés proportionnellement au nombre de leurs parts sociales.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 36 - Contestations");
  ecrire(
    ctx,
    "Toutes les contestations relatives aux affaires sociales, survenant pendant la durée de la Société ou de sa liquidation, entre les associés, ou entre un associé et la Société, ou entre un associé et la gérance, seront jugées conformément à la loi et soumises à la juridiction des tribunaux compétents dans les conditions du droit commun.",
  );

  article(ctx, "TITRE VIII - DISPOSITIONS TRANSITOIRES");

  article(ctx, "ARTICLE 37 - Personnalité morale - Immatriculation");
  [
    "Conformément à la loi, la Société ne jouira de la personnalité morale qu'à dater de son immatriculation au Registre du commerce et des sociétés.",
    "La gérance est tenue de requérir cette immatriculation dans les plus courts délais et d'accomplir à cet effet toutes les formalités nécessaires.",
    "Tous pouvoirs sont donnés à la gérance, à l'associé unique ou au porteur d'un original ou d'une copie des présents statuts, à l'effet de procéder à toutes les formalités de publicité, de dépôt et d'immatriculation prescrites par la loi, ainsi que de signer et déposer toutes pièces requises.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 38 - Nomination du premier gérant");
  const g = gerantAssocie ? a : (gt as Associe);
  const eg = accord(g);
  ecrire(
    ctx,
    `Est nommé${eg} premier${feminin(g) ? "ère" : ""} gérant${eg} de la Société, pour une durée illimitée : ${nomCompletPhysique(
      g,
    )}, né${eg} le ${dateEnLettresFr(g.date_naissance)} à ${g.lieu_naissance}, de nationalité ${
      g.nationalite
    }, demeurant ${g.adresse}.`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    `${nomCompletPhysique(g)}, intervenant aux présentes, déclare accepter ces fonctions et n'être frappé${eg} d'aucune interdiction, incapacité, déchéance ou incompatibilité susceptible de lui interdire l'exercice d'un mandat social ou d'une activité commerciale.${
      gerantAssocie ? "" : " Sa signature est apposée au pied des présents statuts en qualité d'intervenant."
    }`,
  );

  article(ctx, "ARTICLE 39 - Actes accomplis pour le compte de la Société en formation");
  [
    "L'état des actes accomplis pour le compte de la Société en formation, avec l'indication, pour chacun d'eux, de l'engagement qui en résulte pour la Société, figure en annexe des présents statuts et a été présenté à l'associé unique avant la signature des statuts.",
    "L'immatriculation de la Société au Registre du commerce et des sociétés emportera reprise de plein droit, par la Société, de l'ensemble de ces engagements.",
    "La gérance est en outre expressément autorisée, dès la signature des présents statuts, à réaliser tous les actes et engagements entrant dans l'objet social et conformes à l'intérêt de la Société, à charge pour elle d'en rendre compte à l'associé unique.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 40 - Frais");
  ecrire(
    ctx,
    "Les frais, droits et honoraires des présents statuts et de leurs suites seront supportés par la Société, portés au compte de résultat du premier exercice.",
  );

  article(ctx, "ARTICLE 41 - Publicité - Pouvoirs");
  ecrire(
    ctx,
    "Pour faire publier la constitution de la Société conformément à la loi, tous pouvoirs sont donnés à la gérance ainsi qu'au porteur d'un original ou d'une copie des présents statuts.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "L'associé unique peut également donner tous pouvoirs à tiers de son choix, par procuration ad hoc, à l'effet de procéder en son nom à l'ensemble des formalités de constitution, de signer la déclaration de création auprès du guichet unique des formalités des entreprises, de faire publier l'avis de constitution dans un support habilité à recevoir les annonces légales et, plus généralement, de faire le nécessaire.",
  );
  espace(ctx, 10);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 4);
  ecrire(
    ctx,
    "En autant d'originaux que nécessaire pour l'accomplissement des formalités légales, dont un original destiné à la Société et un original destiné à l'associé unique.",
  );
  espace(ctx, 14);
  ecrire(ctx, `L'associé${e} unique${gerantAssocie ? ` et gérant${e} de la Société` : ""}`, { bold: true });
  ecrire(ctx, nomCompletPhysique(a));
  espace(ctx, 24);
  if (!gerantAssocie && gt) {
    ecrire(ctx, `${feminin(gt) ? "La gérante" : "Le gérant"}, intervenant aux présentes`, { bold: true });
    ecrire(ctx, nomCompletPhysique(gt));
    espace(ctx, 24);
  }

  article(ctx, "ANNEXE 1 - ÉTAT DES ACTES ACCOMPLIS POUR LE COMPTE DE LA SOCIÉTÉ EN FORMATION");
  ecrire(
    ctx,
    `Conformément à l'article 39 des statuts, l'état des actes accomplis pour le compte de la société ${d.denomination} en formation, et des engagements qui en résultent, s'établit comme suit :`,
  );
  espace(ctx, 6);
  [
    "Souscrire toute assurance nécessaire à l'activité de la Société ;",
    "Ouvrir tout compte bancaire au nom de la Société, y déposer les fonds correspondant aux apports et le faire fonctionner ;",
    "Engager et régler les dépenses courantes nécessaires à la mise en fonctionnement de la Société, ainsi que les frais et honoraires de constitution ;",
    "Signer tout bail, convention d'occupation ou avenant nécessaire à l'installation de la Société ;",
    "Procéder ou faire procéder à toutes les formalités de constitution prescrites par la loi, souscrire la déclaration de constitution auprès du guichet unique des formalités des entreprises, procéder à la publication de l'avis de constitution et requérir l'immatriculation de la Société au Registre du commerce et des sociétés ;",
    ...(isOption
      ? [
          "Notifier au service des impôts des entreprises l'option pour l'assujettissement à l'impôt sur les sociétés prévue par les statuts ;",
        ]
      : []),
    "Plus généralement, encaisser et régler toutes sommes, souscrire toutes déclarations, signer toutes pièces et faire le nécessaire aux fins ci-dessus.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    "L'immatriculation de la Société au Registre du commerce et des sociétés emportera reprise de plein droit de l'ensemble de ces engagements.",
  );
  espace(ctx, 10);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 14);
  ecrire(ctx, `L'associé${e} unique`, { bold: true });
  ecrire(ctx, nomCompletPhysique(a));

  controlerClauses(ctx, "EURL");
  return fin(ctx);
}

/* --------------------- STATUTS SCI (gabarit cabinet) --------------------- */

async function statutsSci(d: Dossier, associes: Associe[]) {
  const manquants = champsManquantsStatutsSci(d, associes);
  if (manquants.length > 0) {
    throw new Error(
      `Statuts non générés — informations manquantes : ${manquants
        .map((m) => `${m.champ} (étape « ${m.etape} »)`)
        .join(" ; ")}.`,
    );
  }

  const parts = associesEffectifs(d, associes);
  const gerants = associes.filter((a) => a.est_dirigeant);
  const capital = Number(d.capital_montant);
  const nominal = Number(d.valeur_part);
  const nbParts = parts.reduce((s, a) => s + (Number(a.nb_titres) || 0), 0);
  const [jourCloture, moisCloture] = (d.date_cloture_exercice ?? "31/12").split("/");
  const ouverture = jourMoisEnLettresFr(1, (Number(moisCloture) % 12) + 1);
  const cloture = jourMoisEnLettresFr(Number(jourCloture), Number(moisCloture));
  const isOption = d.regime_fiscal_sci === "IS";
  const activites = activitesDuDossier(d);
  const nomDe = (a: Associe) =>
    a.type === "personne_morale" ? (a.denomination ?? "") : nomCompletPhysique(a);

  const ctx = await creerCtxNu();

  ecrire(ctx, d.denomination as string, { size: 15, bold: true });
  espace(ctx, 6);
  ecrire(ctx, `Société civile immobilière au capital de ${capital} euros`);
  ecrire(ctx, `Siège social : ${d.siege_adresse}`);
  ecrire(ctx, "Société en cours de constitution (Ci-après la « Société »)");
  espace(ctx, 14);
  ecrire(ctx, "STATUTS CONSTITUTIFS", { size: 16, bold: true });
  espace(ctx, 6);
  ecrire(ctx, "Certifié conforme à l'original", { size: 10, color: GRIS });
  espace(ctx, 14);

  article(ctx, "LES SOUSSIGNÉS");
  parts.forEach((a, i) => {
    if (i > 0) {
      ecrire(ctx, "Et,");
      espace(ctx, 4);
    }
    comparutionSarl(a).forEach((l) => ecrire(ctx, l));
    espace(ctx, 6);
  });
  ecrire(ctx, "Ci-après désignés ensemble les « Associés »,");
  espace(ctx, 6);
  ecrire(
    ctx,
    "Ont établi ainsi qu'il suit les statuts de la société civile devant exister entre eux et entre les propriétaires des parts sociales créées lors de la constitution et en cours de vie sociale.",
  );

  article(ctx, "TITRE I - FORME - OBJET - DÉNOMINATION - DURÉE - SIÈGE");

  article(ctx, "ARTICLE 1 - FORME");
  ecrire(
    ctx,
    "Il est formé entre les propriétaires des parts sociales ci-après créées et de celles qui pourront l'être ultérieurement une société civile régie par les articles 1832 à 1870-1 du Code civil, par le décret n° 78-704 du 3 juillet 1978, par toutes dispositions légales ou réglementaires qui viendraient à modifier ces textes, ainsi que par les présents statuts.",
  );

  article(ctx, "ARTICLE 2 - OBJET");
  ecrire(ctx, "La Société a pour objet, en France et à l'étranger :");
  espace(ctx, 4);
  if (activites.length > 0) activites.forEach((act) => puce(ctx, act.texte));
  else if (d.objet_social?.trim()) puce(ctx, d.objet_social);
  [
    "L'acquisition, la détention, la gestion et l'administration, par voie de location ou par tout autre moyen, de tous biens et droits immobiliers, bâtis ou non bâtis, à usage d'habitation, professionnel, commercial ou mixte, qu'ils soient meublés ou non, exploités en location saisonnière ou de longue durée ;",
    "La mise à disposition, à titre gratuit ou onéreux, au profit des associés ou de tiers, de tout ou partie des biens appartenant à la Société, conformément à la loi et aux dispositions des présents statuts ;",
    "La construction, l'aménagement, la rénovation, la réhabilitation, la transformation ou l'agrandissement de tout immeuble appartenant à la Société ;",
    "La prise de participation, sous quelque forme que ce soit, dans toutes sociétés ou groupements ayant un objet immobilier, ainsi que la gestion de ces participations ;",
    "Et, exceptionnellement, l'aliénation de tout ou partie des biens et droits immobiliers appartenant à la Société, dès lors que ces opérations ne présentent pas un caractère habituel et spéculatif ;",
    "L'obtention de tous financements nécessaires à la réalisation de l'objet social et la constitution, à cet effet, de toutes garanties réelles ou personnelles ;",
    "Et, plus généralement, toutes opérations financières, mobilières ou immobilières se rattachant directement ou indirectement à cet objet et susceptibles d'en favoriser la réalisation, à condition toutefois d'en respecter le caractère civil.",
  ].forEach((t) => puce(ctx, t));

  article(ctx, "ARTICLE 3 - DÉNOMINATION SOCIALE");
  ecrire(ctx, `La Société prend la dénomination de : ${d.denomination}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Cette dénomination doit figurer sur tous les actes et documents émanant de la Société et destinés aux tiers ; elle doit être précédée ou suivie des mots « Société civile immobilière » ou de l'abréviation « S.C.I. » ainsi que de l'indication du capital social.",
  );

  article(ctx, "ARTICLE 4 - DURÉE");
  ecrire(
    ctx,
    `La durée de la Société est fixée à ${montantEnLettresFr(Number(d.duree_annees))} (${
      d.duree_annees
    }) années à compter de son immatriculation au Registre du commerce et des sociétés, sauf prorogation ou dissolution anticipée.`,
  );

  article(ctx, "ARTICLE 5 - SIÈGE SOCIAL");
  ecrire(ctx, `Le siège social est fixé au ${d.siege_adresse}.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    "Il peut être transféré en tout autre endroit du même département ou d'un département limitrophe par simple décision de la gérance, sous réserve de ratification par la plus prochaine décision collective des associés, et en tout autre lieu par décision collective extraordinaire des associés.",
  );

  article(ctx, "TITRE II - APPORTS - CAPITAL SOCIAL - PARTS SOCIALES");

  article(ctx, "ARTICLE 6 - APPORTS");
  ecrire(ctx, "Les Associés font apport à la Société, en numéraire, des sommes suivantes :");
  espace(ctx, 4);
  parts.forEach((a) => {
    const montant = Number(a.montant_apport) || 0;
    ecrire(ctx, `${nomDe(a)}, la somme de ${montantEnLettresFr(montant)} (${montant} €) ;`);
  });
  espace(ctx, 4);
  ecrire(
    ctx,
    `Soit un total d'apports en numéraire de ${montantEnLettresFr(capital)} (${capital} €), correspondant à ${montantEnLettresFr(
      nbParts,
    )} (${nbParts}) parts sociales de ${montantEnLettresFr(nominal)} (${nominal} €) chacune.`,
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Ces apports sont intégralement libérés dès la signature des présents statuts. Les Associés se donnent mutuellement acte de la libération intégrale de leurs apports respectifs.",
  );

  // Article 1832-2 du Code civil : information, renonciation ou revendication du conjoint.
  for (const a of associes.filter((p) => conjointInformeSci(p))) {
    espace(ctx, 6);
    const elleA = feminin(a);
    ecrire(
      ctx,
      `Conformément aux dispositions de l'article 1832-2 du Code civil, ${nomCompletPhysique(
        a,
      )} déclare que les fonds ${elleA ? "qu'elle apporte" : "qu'il apporte"} proviennent de biens communs de la communauté existant entre ${
        elleA ? "elle" : "lui"
      }-même et son conjoint, ${a.conjoint_civilite ?? ""} ${a.conjoint_prenom ?? ""} ${
        a.conjoint_nom ?? ""
      }.`
        .replace(/\s+/g, " ")
        .trim(),
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      `${elleA ? "Elle" : "Il"} déclare avoir informé son conjoint, préalablement à la souscription des parts sociales, de l'emploi de fonds communs à cette souscription ; justification de cette information est expressément donnée dans le présent acte, dont son conjoint reconnaît avoir eu connaissance.`,
    );
    espace(ctx, 4);
    if (a.conjoint_revendique === true) {
      ecrire(
        ctx,
        `${a.conjoint_civilite ?? ""} ${a.conjoint_prenom ?? ""} ${
          a.conjoint_nom ?? ""
        } revendique expressément la qualité d'associé pour la moitié des parts souscrites au moyen de fonds communs ; ${
          elleA ? "elle" : "il"
        } est en conséquence associé de la Société à hauteur de ladite moitié, ainsi qu'il ressort de la répartition figurant à l'article 7.`
          .replace(/\s+/g, " ")
          .trim(),
      );
    } else {
      ecrire(
        ctx,
        `${a.conjoint_civilite ?? ""} ${a.conjoint_prenom ?? ""} ${
          a.conjoint_nom ?? ""
        } déclare, aux termes de la déclaration figurant en annexe des présents statuts, renoncer expressément à la faculté de revendiquer la qualité d'associé pour la moitié des parts souscrites au moyen de fonds communs.`
          .replace(/\s+/g, " ")
          .trim(),
      );
      espace(ctx, 4);
      ecrire(
        ctx,
        "À défaut de renonciation, la revendication ultérieure de la qualité d'associé par le conjoint serait soumise à l'agrément prévu à l'article 11 des présents statuts, l'agrément de l'associé souscripteur ne valant pas agrément du conjoint revendiquant.",
      );
    }
  }

  article(ctx, "ARTICLE 7 - CAPITAL SOCIAL");
  ecrire(
    ctx,
    `Le capital social est fixé à la somme de ${montantEnLettresFr(capital)} (${capital} €). Il est divisé en ${montantEnLettresFr(
      nbParts,
    )} (${nbParts}) parts sociales de ${montantEnLettresFr(
      nominal,
    )} (${nominal} €) chacune, numérotées de 1 à ${nbParts}, intégralement souscrites, libérées et attribuées aux Associés en représentation de leurs apports respectifs, à savoir :`,
  );
  espace(ctx, 6);
  repartitionParts(parts).forEach((l) =>
    ecrire(ctx, `${nomDe(l.associe)} : parts numérotées de ${l.debut} à ${l.fin}, soit ${l.parts} parts sociales.`),
  );
  espace(ctx, 4);
  ecrire(ctx, `TOTAL : ${nbParts} parts sociales, soit ${capital} euros.`, { bold: true });
  espace(ctx, 6);
  ecrire(
    ctx,
    "Les Associés déclarent expressément que les parts sociales ainsi attribuées correspondent exactement à leurs apports et qu'elles sont réparties entre eux dans les proportions ci-dessus.",
  );

  article(ctx, "ARTICLE 8 - AUGMENTATION ET RÉDUCTION DU CAPITAL");
  ecrire(
    ctx,
    "Le capital social peut être augmenté, par décision collective extraordinaire des associés, par la création de parts sociales nouvelles ou par élévation du nominal des parts existantes, soit au moyen d'apports en numéraire ou en nature, soit par compensation avec des créances liquides et exigibles sur la Société, soit par incorporation de réserves ou de bénéfices.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Le capital social peut également être réduit, pour quelque cause et de quelque manière que ce soit, par décision collective extraordinaire des associés, notamment par voie de remboursement ou de rachat partiel des parts, de réduction de leur nombre ou de leur valeur nominale.",
  );

  article(ctx, "ARTICLE 9 - COMPTES COURANTS D'ASSOCIÉS");
  [
    "La Société peut recevoir de ses associés des fonds en dépôt sous forme d'avances en compte courant. Les comptes courants d'associés ne peuvent en aucun cas être débiteurs.",
    "Les conditions de fonctionnement, de rémunération et de remboursement de ces comptes courants sont fixées par décision collective ordinaire des associés, la rémunération éventuelle ne pouvant excéder le taux d'intérêt admis en déduction en application de l'article 39-1-3° du Code général des impôts.",
    "À défaut de convention particulière, le remboursement peut être demandé à tout moment, sous réserve que la trésorerie de la Société le permette et que ce remboursement ne compromette ni son équilibre financier, ni le respect de ses engagements bancaires.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 10 - PARTS SOCIALES");
  [
    "Il ne sera créé aucun titre représentatif des parts sociales. Les droits de chaque associé résultent uniquement des présents statuts, des actes modifiant le capital social et des actes constatant les cessions de parts régulièrement consenties. Une copie ou un extrait de ces actes, certifié par la gérance, peut être délivré à tout associé sur sa demande et à ses frais.",
    "Les parts sociales sont indivisibles à l'égard de la Société. Les copropriétaires indivis d'une part sociale sont tenus de se faire représenter auprès de la Société par un seul d'entre eux ou par un mandataire commun choisi parmi les autres associés.",
    "Les parts appartenant à un associé mineur non émancipé ou à un majeur protégé sont représentées, pour l'exercice de l'ensemble des droits attachés à ces parts, par son représentant légal ou par la personne chargée de sa protection, dans les conditions du droit commun.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });
  ecrire(ctx, "Démembrement de propriété", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Lorsque les parts sociales font l'objet d'un démembrement de propriété, le droit de vote appartient à l'usufruitier pour les décisions collectives ordinaires et pour les décisions extraordinaires suivantes :",
  );
  espace(ctx, 4);
  [
    "La gestion locative des biens sociaux ;",
    "L'affectation et la répartition des résultats ;",
    "L'augmentation du capital par apports nouveaux et la réduction du capital non motivée par des pertes ;",
    "Les modifications des statuts touchant aux droits d'usufruit grevant les parts sociales ;",
    "La nomination et la révocation de la gérance.",
  ].forEach((t) => puce(ctx, t));
  ecrire(ctx, "Le droit de vote appartient au nu-propriétaire pour toutes les autres décisions.");
  espace(ctx, 4);
  ecrire(
    ctx,
    "Dans tous les cas, l'usufruitier et le nu-propriétaire sont l'un et l'autre convoqués à toute décision collective et peuvent y participer, conformément à l'article 1844 du Code civil, sans que le nu-propriétaire puisse être privé de son droit de participer aux décisions collectives.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les droits et obligations attachés à chaque part la suivent en quelque main qu'elle passe. La propriété d'une part emporte de plein droit adhésion aux présents statuts et aux décisions collectives régulièrement prises.",
  );

  article(ctx, "TITRE III - CESSION ET TRANSMISSION DES PARTS - RESPONSABILITÉ");

  article(ctx, "ARTICLE 11 - CESSION DE PARTS SOCIALES");
  [
    "La cession de parts sociales est constatée par acte authentique ou sous seing privé. Conformément à l'article 1690 du Code civil, elle doit être signifiée à la Société ou acceptée par elle dans un acte authentique. Elle n'est opposable aux tiers qu'après accomplissement de ces formalités et dépôt de l'acte de cession au Registre du commerce et des sociétés.",
    "Les parts sociales sont librement cessibles entre associés, ainsi qu'au profit des ascendants et des descendants du cédant.",
    "Toute autre cession, y compris au profit du conjoint du cédant, est soumise à l'agrément préalable des associés statuant en la forme extraordinaire.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });
  ecrire(ctx, "Procédure d'agrément", { bold: true });
  espace(ctx, 2);
  [
    "L'associé cédant notifie son projet à la Société et à chacun des associés par lettre recommandée avec demande d'avis de réception, en indiquant les nom, prénoms, profession, domicile et nationalité du cessionnaire proposé — ou, s'il s'agit d'une personne morale, sa dénomination, son siège et son numéro d'immatriculation — ainsi que le nombre de parts dont la cession est envisagée et le prix convenu.",
    "Dans les quinze jours de cette notification, la gérance consulte les associés. La décision, qui n'a pas à être motivée, est notifiée au cédant par lettre recommandée avec demande d'avis de réception. À défaut de notification dans un délai de deux mois à compter de la notification du projet, l'agrément est réputé acquis.",
    "Si l'agrément est accordé, la cession doit être régularisée dans le mois de sa notification ; à défaut, le cessionnaire doit à nouveau être soumis à l'agrément.",
    "Si l'agrément est refusé, les associés disposent d'un délai de trois mois pour se porter acquéreurs des parts. En cas de demandes excédant le nombre de parts offertes, la gérance procède à une répartition proportionnelle au nombre de parts détenues par chaque demandeur, dans la limite de sa demande.",
    "Si aucun associé ne se porte acquéreur dans ce délai, la Société peut faire acquérir les parts par un tiers désigné à l'unanimité des associés autres que le cédant, ou procéder elle-même à leur rachat en vue de leur annulation, cette décision étant également prise à l'unanimité des associés autres que le cédant.",
    "Le nom du ou des acquéreurs proposés, ou l'offre de rachat par la Société, ainsi que le prix offert, sont notifiés au cédant par la gérance par lettre recommandée avec demande d'avis de réception. En cas de contestation sur le prix, celui-ci est fixé conformément à l'article 1843-4 du Code civil, sans préjudice du droit du cédant de conserver ses parts.",
    "Si aucune offre d'achat n'est faite au cédant dans un délai de six mois à compter de la notification du projet de cession à la Société, l'agrément est réputé acquis.",
    "Tout projet de nantissement de parts sociales est soumis à agrément dans les mêmes conditions. Le consentement donné au projet de nantissement emporte agrément du cessionnaire en cas de réalisation forcée des parts nanties.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 12 - TRANSMISSION DES PARTS SOCIALES PAR DÉCÈS");
  ecrire(
    ctx,
    "La Société n'est pas dissoute par le décès d'un associé. Elle continue entre les associés survivants et les ayants droit de l'associé décédé, dans les conditions ci-après.",
  );
  espace(ctx, 4);
  ecrire(ctx, "Transmission de plein droit", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Le conjoint survivant et les héritiers en ligne directe de l'associé décédé deviennent associés de plein droit, sans qu'aucun agrément soit requis.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "L'agrément des autres héritiers et des légataires s'exerce dans les conditions et selon la procédure prévues à l'article 11 des présents statuts.",
  );

  article(ctx, "ARTICLE 13 - RESPONSABILITÉ DES ASSOCIÉS");
  [
    "Dans leurs rapports entre eux, les associés ne sont tenus des dettes et engagements sociaux que dans la proportion du nombre de parts qu'ils possèdent.",
    "À l'égard des tiers, les associés répondent indéfiniment des dettes sociales à proportion de leurs droits sociaux à la date de l'exigibilité de la dette ou au jour de la cessation des paiements, conformément à l'article 1857 du Code civil. Cette responsabilité n'est pas solidaire.",
    "Les créanciers de la Société ne peuvent poursuivre le paiement des dettes sociales contre un associé qu'après avoir préalablement et vainement poursuivi la Société.",
    "Les Associés déclarent avoir été expressément informés de la portée de cette responsabilité indéfinie et de ses conséquences sur leur patrimoine personnel.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "TITRE IV - JOUISSANCE DES BIENS SOCIAUX - RETRAIT - UNIPERSONNALITÉ");

  article(ctx, "ARTICLE 14 - MISE À DISPOSITION DES BIENS SOCIAUX");
  [
    "La Société peut mettre tout ou partie de ses biens et droits immobiliers à la disposition d'un ou plusieurs associés, à titre onéreux.",
    "Les conditions de cette mise à disposition, notamment sa durée, le montant de la redevance ou du loyer, la répartition des charges et des travaux et les obligations d'assurance, sont arrêtées par décision collective ordinaire des associés.",
    "Toute mise à disposition consentie à titre gratuit requiert une décision collective extraordinaire, les associés ayant été préalablement informés de ses conséquences fiscales pour la Société comme pour le bénéficiaire.",
    "Le bénéficiaire ne peut céder, prêter ni sous-louer le bien sans l'autorisation écrite de la Société. Il justifie à tout moment d'une assurance couvrant les risques liés à l'occupation et à l'usage du bien.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 15 - INCAPACITÉ - LIQUIDATION JUDICIAIRE - RETRAIT D'UN ASSOCIÉ");
  [
    "L'absence, l'incapacité civile, la déconfiture, le redressement ou la liquidation judiciaire, ou encore la faillite personnelle d'un ou plusieurs associés ne met pas fin à la Société. À moins que les associés n'en prononcent la dissolution, celle-ci continue entre les autres associés, à charge par eux de rembourser à l'associé concerné ou à son représentant la valeur de ses parts, soit par voie de réduction du capital, soit par voie de rachat, cette valeur étant déterminée dans les conditions de l'article 1843-4 du Code civil.",
    "Le montant du remboursement est payable dans les trois mois de la détermination définitive de la valeur et porte intérêt au taux légal à compter du jour de l'événement ayant ouvert le droit au rachat.",
    "Le décès d'un associé est régi par l'article 12 des présents statuts.",
    "Les héritiers et représentants d'un associé décédé, absent ou frappé d'incapacité ne peuvent, ni pendant la vie sociale, ni au cours des opérations de liquidation, faire apposer les scellés sur les biens de la Société, en demander la licitation ou le partage, ni s'immiscer d'aucune manière dans son administration. Ils doivent, pour l'exercice de leurs droits, s'en rapporter aux comptes annuels et aux décisions collectives des associés. La même interdiction s'applique aux créanciers personnels des associés.",
    "Le retrait total ou partiel d'un associé doit être autorisé à l'unanimité de ses coassociés ou, à défaut, être décidé par justice pour justes motifs. L'associé qui se retire n'a droit qu'au remboursement de la valeur de ses parts, déterminée à défaut d'accord amiable conformément à l'article 1843-4 du Code civil.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 16 - RÉUNION DE TOUTES LES PARTS EN UNE SEULE MAIN");
  [
    "L'appartenance de l'usufruit de toutes les parts sociales à une même personne est sans conséquence sur l'existence de la Société.",
    "La réunion de toutes les parts sociales en une seule main n'entraîne pas la dissolution immédiate de la Société. Toutefois, à défaut de régularisation dans le délai d'un an, tout intéressé peut demander la dissolution judiciaire de la Société.",
    "La dissolution de la Société devenue unipersonnelle entraîne, si l'associé unique est une personne morale, la transmission universelle du patrimoine de la Société à cet associé unique, sans qu'il y ait lieu à liquidation, dans les conditions de l'article 1844-5 du Code civil.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "TITRE V - GÉRANCE");

  article(ctx, "ARTICLE 17 - GÉRANCE");
  ecrire(ctx, "1. Nomination", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "La Société est gérée et administrée par un ou plusieurs gérants, personnes physiques ou morales, associés ou non, nommés par décision collective ordinaire des associés.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les fonctions du gérant sont exercées pour une durée indéterminée, sauf décision contraire lors de sa nomination.",
  );
  espace(ctx, 6);
  ecrire(ctx, "2. Pouvoirs", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "La gérance dispose des pouvoirs les plus étendus pour la gestion des biens et des affaires de la Société et pour accomplir ou autoriser tous les actes et opérations relatifs à son objet. En cas de pluralité de gérants, ceux-ci exercent séparément ces pouvoirs, sauf le droit pour chacun de s'opposer à une opération avant qu'elle ne soit conclue.",
  );
  espace(ctx, 4);
  ecrire(ctx, "La gérance peut notamment, sans autorisation préalable des associés :");
  espace(ctx, 4);
  [
    "Acquérir, vendre, échanger ou apporter tous biens et droits immobiliers ;",
    "Acquérir et céder toute mitoyenneté, stipuler et accepter toutes servitudes ;",
    "Contracter tous emprunts pour le compte de la Société ;",
    "Consentir toutes hypothèques, tous privilèges et toutes autres garanties sur les actifs sociaux ;",
    "Consentir, renouveler et résilier tous baux et conventions d'occupation.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    "Dans ses rapports avec les tiers, la Société est engagée par les actes de la gérance entrant dans l'objet social.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Toutefois, à compter du jour où la Société comptera plus de deux associés, la vente et l'apport de tout bien immobilier social devront être préalablement autorisés par une décision collective extraordinaire des associés, cette limitation étant inopposable aux tiers.",
  );
  espace(ctx, 6);
  ecrire(ctx, "3. Cessation des fonctions", { bold: true });
  espace(ctx, 2);
  [
    "Les fonctions du gérant cessent par son décès, son incapacité civile, sa déconfiture, son redressement ou sa liquidation judiciaire, sa faillite personnelle, sa révocation ou sa démission.",
    "La démission du gérant n'a pas à être motivée ; il doit en informer les associés trois mois au moins à l'avance par lettre recommandée avec demande d'avis de réception.",
    "Le gérant est révocable par décision collective ordinaire des associés. Si la révocation est décidée sans juste motif, elle peut donner lieu à des dommages et intérêts. Le gérant est en outre révocable par décision de justice pour cause légitime, à la demande de tout associé.",
    "En cas de vacance de la gérance, la nomination du ou des nouveaux gérants est décidée par les associés, réunis à l'initiative de l'associé le plus diligent dans le mois de la vacance.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });
  ecrire(ctx, "4. Rémunération", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "Le gérant peut recevoir, en rémunération de ses fonctions, un traitement fixe, proportionnel ou à la fois fixe et proportionnel, porté aux frais généraux. Les modalités et le montant de cette rémunération sont fixés par décision collective ordinaire des associés. Le gérant a droit, en outre, au remboursement de ses frais de représentation et de déplacement sur justificatifs.",
  );

  article(ctx, "TITRE VI - DÉCISIONS COLLECTIVES DES ASSOCIÉS");

  article(ctx, "ARTICLE 18 - FORME DES DÉCISIONS COLLECTIVES");
  ecrire(
    ctx,
    "Les décisions excédant les pouvoirs de la gérance sont prises par les associés et résultent, au choix de la gérance, soit d'une assemblée générale, soit d'une consultation écrite.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les associés peuvent également, d'un commun accord, prendre toute décision collective à l'unanimité par acte sous seing privé ou notarié.",
  );

  article(ctx, "ARTICLE 19 - DROIT D'INFORMATION DES ASSOCIÉS");
  [
    "Les associés ont le droit d'obtenir, au moins une fois par an, communication des livres et documents sociaux, et de poser par écrit des questions sur la gestion sociale, auxquelles il doit être répondu par écrit dans le délai d'un mois.",
    "Quinze jours au moins avant l'assemblée générale annuelle, la gérance adresse à chaque associé un rapport sur l'activité de la Société, les comptes annuels, le rapport du commissaire aux comptes s'il en existe un, et le texte des projets de résolutions.",
    "Préalablement à toute autre décision collective, la gérance tient à la disposition des associés, au siège social, le texte des résolutions proposées et tous documents utiles à leur information. Ces documents leur sont adressés sur simple demande.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 20 - ASSEMBLÉES GÉNÉRALES");
  [
    "L'assemblée générale représente l'universalité des associés ; ses décisions obligent tous les associés, même absents, incapables ou dissidents.",
    "Les assemblées générales sont convoquées par la gérance, au siège social ou en tout autre lieu indiqué dans la convocation. Un ou plusieurs associés représentant au moins le quart du capital social peuvent demander à la gérance, par lettre recommandée, la convocation d'une assemblée générale.",
    "Les convocations sont adressées à chaque associé quinze jours au moins avant la réunion, par lettre recommandée ou par tout autre moyen écrit, y compris courrier électronique, permettant d'établir la date de leur réception. La convocation indique l'ordre du jour ; les modifications statutaires proposées y sont explicitement mentionnées. La convocation peut être verbale et l'assemblée réunie sans délai si tous les associés sont présents ou représentés.",
    "L'assemblée peut se tenir par visioconférence ou par tout moyen de télécommunication permettant l'identification des associés et la retransmission continue et simultanée des délibérations. Les associés participant par ces moyens sont réputés présents.",
    "Chaque associé peut assister à l'assemblée ou s'y faire représenter par toute personne de son choix munie d'un pouvoir écrit.",
    "L'assemblée est présidée par le gérant ou, s'il n'est pas associé, par l'associé présent et acceptant possédant ou représentant le plus grand nombre de parts.",
    "Les délibérations sont constatées par des procès-verbaux signés par le gérant et, le cas échéant, par le président de séance. À défaut de feuille de présence, les procès-verbaux sont en outre signés par tous les associés présents et par les mandataires.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 21 - CONSULTATIONS PAR CORRESPONDANCE");
  [
    "La gérance peut consulter les associés par correspondance. Elle leur adresse, par lettre recommandée ou par tout autre moyen écrit permettant d'établir la date de réception, le texte des résolutions proposées accompagné de tous renseignements et explications utiles.",
    "Les associés disposent d'un délai de quinze jours à compter de la réception pour émettre leur vote par écrit. Tout associé n'ayant pas répondu dans ce délai est réputé s'être abstenu.",
    "Le procès-verbal de la consultation est établi par la gérance, qui y annexe les votes des associés. Les décisions ainsi prises doivent, pour être valables, réunir les conditions de majorité prévues pour les assemblées générales.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 22 - DÉCISIONS COLLECTIVES ORDINAIRES");
  [
    "Les associés sont réunis au moins une fois par an, dans les six mois de la clôture de l'exercice, à l'effet de prendre connaissance du rapport de la gérance, de statuer sur les comptes annuels et de décider de l'affectation du résultat.",
    "Les associés nomment et révoquent les gérants, fixent leur rémunération et délibèrent sur toutes questions inscrites à l'ordre du jour qui ne relèvent pas de la compétence extraordinaire.",
    "Les décisions ordinaires sont adoptées par un ou plusieurs associés représentant plus de la moitié des parts sociales. Si cette majorité n'est pas atteinte, les associés sont consultés une seconde fois et les décisions sont alors prises à la majorité des votes émis, quel que soit le nombre de parts représentées.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 23 - DÉCISIONS COLLECTIVES EXTRAORDINAIRES");
  ecrire(
    ctx,
    "Les décisions extraordinaires peuvent apporter aux statuts toutes modifications, sans exception ni réserve. Elles sont notamment compétentes pour décider :",
  );
  espace(ctx, 4);
  [
    "L'augmentation ou la réduction du capital social ;",
    "La prorogation ou la dissolution anticipée de la Société ;",
    "La transformation de la Société ou sa fusion avec d'autres sociétés ;",
    "La modification de la répartition des bénéfices ;",
    "L'agrément des cessions de parts sociales dans les cas prévus à l'article 11.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    "Les décisions extraordinaires sont adoptées par un ou plusieurs associés représentant les deux tiers au moins des parts sociales.",
  );
  espace(ctx, 4);
  ecrire(
    ctx,
    "Toutefois, les décisions qui augmentent les engagements des associés ne peuvent être prises qu'à l'unanimité, conformément à l'article 1836 du Code civil.",
  );

  article(ctx, "TITRE VII - EXERCICE SOCIAL - COMPTES - RÉGIME FISCAL - RÉSULTATS");

  article(ctx, "ARTICLE 24 - EXERCICE SOCIAL");
  ecrire(ctx, `L'exercice social commence le ${ouverture} et se termine le ${cloture} de chaque année.`);
  espace(ctx, 4);
  ecrire(
    ctx,
    `Par exception, le premier exercice social comprendra le temps écoulé depuis l'immatriculation de la Société au Registre du commerce et des sociétés jusqu'au ${dateEnLettresFr(
      d.date_cloture_premier_exercice,
    )}.`,
  );

  article(ctx, "ARTICLE 25 - COMPTES SOCIAUX");
  ecrire(ctx, "Il est tenu au siège social une comptabilité régulière des opérations sociales.");
  espace(ctx, 4);
  ecrire(
    ctx,
    "À la clôture de chaque exercice, la gérance dresse l'inventaire de l'actif et du passif, le bilan, le compte de résultat et l'annexe. Ces documents, accompagnés d'un rapport de la gérance sur l'activité de la Société, sont soumis aux associés dans les six mois de la clôture de l'exercice.",
  );

  article(ctx, "ARTICLE 26 - COMMISSAIRE AUX COMPTES");
  ecrire(
    ctx,
    "La nomination d'un commissaire aux comptes est obligatoire dans les cas prévus par la loi. En dehors de ces cas, elle peut être décidée par décision collective ordinaire des associés. Le commissaire aux comptes exerce ses fonctions dans les conditions prévues par la loi.",
  );

  article(ctx, "ARTICLE 27 - RÉGIME FISCAL");
  if (!isOption) {
    ecrire(
      ctx,
      "Les résultats de la Société sont imposés entre les mains de ses associés, dans les conditions prévues à l'article 8 du Code général des impôts, selon le régime fiscal des sociétés de personnes, chacun des associés étant personnellement imposé pour la part des bénéfices sociaux correspondant à ses droits dans la Société.",
    );
    espace(ctx, 4);
    ecrire(
      ctx,
      "La Société conserve la faculté d'opter ultérieurement pour son assujettissement à l'impôt sur les sociétés dans les conditions prévues aux articles 206, 3 et 239 du Code général des impôts, les Associés déclarant avoir été informés de la portée d'une telle option et des conditions dans lesquelles il peut y être renoncé.",
    );
  } else {
    [
      "La Société opte, dès sa constitution, pour son assujettissement à l'impôt sur les sociétés, dans les conditions prévues aux articles 206-3 et 239 du Code général des impôts.",
      "La présente option, souscrite et signée par tous les associés, vaut notification au service des impôts des entreprises compétent. La gérance est expressément mandatée pour en assurer la notification et pour porter cette option sur la déclaration de constitution déposée auprès du guichet unique des formalités des entreprises.",
      "Les Associés déclarent avoir été informés de la portée de cette option : il ne peut y être renoncé au-delà du cinquième exercice suivant celui au titre duquel elle a été exercée, et la renonciation, une fois le délai expiré, n'est plus possible, l'option devenant alors irrévocable.",
    ].forEach((t) => {
      ecrire(ctx, t);
      espace(ctx, 4);
    });
  }
  espace(ctx, 4);
  ecrire(
    ctx,
    "Les Associés déclarent en outre que la Société n'entend exercer, à la date des présentes, aucune option pour l'assujettissement à la taxe sur la valeur ajoutée au titre de la location de ses locaux, telle que prévue à l'article 260-2° du Code général des impôts. Les revenus locatifs de la Société seront en conséquence exonérés de taxe sur la valeur ajoutée et la Société ne pourra opérer aucune déduction de la taxe grevant ses acquisitions, travaux et charges. Cette option pourra, le cas échéant, être exercée ultérieurement par la gérance sur décision collective ordinaire des associés.",
  );

  article(ctx, "ARTICLE 28 - AFFECTATION ET RÉPARTITION DES RÉSULTATS");
  [
    "Le bénéfice net de l'exercice est constitué par les produits nets, sous déduction des frais généraux, des autres charges de la Société, des amortissements et des provisions.",
    "Le bénéfice distribuable est constitué par le bénéfice net de l'exercice, diminué des pertes antérieures et augmenté du report bénéficiaire.",
    "Les associés décident souverainement de son affectation : distribution, report à nouveau ou dotation à tous comptes de réserves. Les sommes distribuées sont réparties entre les associés proportionnellement au nombre de parts détenues par chacun d'eux ; elles sont inscrites à leur crédit dans les livres sociaux ou versées effectivement à la date fixée par les associés ou, à défaut, par la gérance.",
    "Les pertes sont supportées par les associés dans les mêmes proportions ; elles sont comptablement imputées sur les bénéfices non répartis, sur les réserves, ou reportées à nouveau.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });
  ecrire(ctx, "Parts démembrées", { bold: true });
  espace(ctx, 2);
  ecrire(
    ctx,
    "En cas de démembrement de la propriété des parts, les sommes distribuées prélevées sur le bénéfice de l'exercice reviennent à l'usufruitier. Celles prélevées sur les réserves ou sur le report à nouveau reviennent au nu-propriétaire, l'usufruitier en ayant la jouissance sous forme de quasi-usufruit au sens de l'article 587 du Code civil, à charge pour lui d'en restituer la valeur à l'extinction de l'usufruit.",
  );

  article(ctx, "TITRE VIII - DISSOLUTION - CONTESTATIONS - DISPOSITIONS DIVERSES");

  article(ctx, "ARTICLE 29 - DISSOLUTION - LIQUIDATION");
  [
    "À l'expiration de la Société ou en cas de dissolution anticipée, les associés, statuant en la forme extraordinaire, nomment un ou plusieurs liquidateurs dont ils déterminent les pouvoirs et la rémunération.",
    "À défaut de désignation, les fonctions de liquidateur sont exercées par le gérant en exercice.",
    "Pendant la liquidation, les pouvoirs des associés se poursuivent pour tout ce qui concerne les opérations de liquidation ; ils approuvent les comptes de liquidation et donnent quitus au liquidateur.",
    "Le produit de la réalisation de l'actif est employé à l'extinction du passif envers les tiers. Les associés sont ensuite remboursés du montant de leurs apports. Le solde, constituant le boni de liquidation, est réparti entre les associés dans les mêmes proportions que leur participation aux bénéfices.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 30 - CONTESTATIONS");
  ecrire(
    ctx,
    "Toutes contestations qui pourraient s'élever entre les associés, ou entre la Société et les associés, relativement aux affaires sociales, pendant la durée de la Société ou au cours de sa liquidation, seront soumises à la juridiction compétente selon les règles du droit commun.",
  );

  article(ctx, "ARTICLE 31 - JOUISSANCE DE LA PERSONNALITÉ MORALE");
  ecrire(
    ctx,
    "Conformément à la loi, la Société ne jouira de la personnalité morale qu'à compter de son immatriculation au Registre du commerce et des sociétés.",
  );

  article(ctx, "ARTICLE 32 - ENGAGEMENTS POUR LE COMPTE DE LA SOCIÉTÉ EN FORMATION");
  [
    "L'état des actes déjà accomplis pour le compte de la Société en formation, avec l'indication pour chacun d'eux de l'engagement qui en résulte pour la Société, figure en Annexe 1 des présentes. Cet état a été présenté aux Associés préalablement à la signature des statuts.",
    "La signature des présents statuts emportera reprise automatique de ces engagements par la Société dès son immatriculation au Registre du commerce et des sociétés.",
    "Les Associés donnent en outre mandat exprès au gérant, dans les termes de l'Annexe 1, à l'effet de prendre pour le compte de la Société en formation les engagements qui y sont énumérés. Ces engagements seront également repris de plein droit par la Société du fait de son immatriculation.",
  ].forEach((t) => {
    ecrire(ctx, t);
    espace(ctx, 4);
  });

  article(ctx, "ARTICLE 33 - FRAIS");
  ecrire(
    ctx,
    "Les frais, droits et honoraires des présents statuts et de leurs suites, ainsi que l'ensemble des frais de constitution, sont pris en charge par la Société et inscrits, selon leur nature, à l'actif ou en charges de son premier exercice.",
  );

  article(ctx, "ARTICLE 34 - PUBLICITÉ - POUVOIRS");
  ecrire(
    ctx,
    "Les Associés donnent tous pouvoirs à la gérance, ainsi qu'au porteur d'un original, d'une copie ou d'un extrait des présents statuts, à l'effet d'accomplir toutes les formalités de publicité, de dépôt et d'immatriculation prescrites par la loi.",
  );

  article(ctx, "DISPOSITION NON STATUTAIRE - NOMINATION DU PREMIER GÉRANT");
  ecrire(
    ctx,
    "Les dispositions qui suivent ne constituent pas une clause statutaire. Leur modification ultérieure ne requiert donc aucune modification des présents statuts.",
  );
  espace(ctx, 6);
  gerants.forEach((g) => {
    if (g.type === "personne_morale") {
      ecrire(ctx, "Est nommée première gérante de la Société, pour une durée indéterminée :");
      espace(ctx, 4);
      ecrire(
        ctx,
        `La société ${g.denomination ?? ""}, ${g.forme ?? ""}, dont le siège social est situé ${
          g.siege ?? ""
        }, immatriculée au Registre du commerce et des sociétés sous le numéro ${
          g.siren ?? ""
        }, représentée par ${g.representant ?? ""} (la « Gérante »).`
          .replace(/\s+/g, " ")
          .trim(),
      );
      espace(ctx, 4);
      ecrire(
        ctx,
        "La Gérante, prise en la personne de son représentant, déclare accepter ces fonctions et n'être frappée d'aucune incompatibilité, interdiction, déchéance ou mesure susceptible de faire obstacle à cette nomination.",
      );
    } else {
      const eg = accord(g);
      ecrire(
        ctx,
        `Est nommé${eg} premier${feminin(g) ? "ère" : ""} gérant${eg} de la Société, pour une durée indéterminée :`,
      );
      espace(ctx, 4);
      ecrire(
        ctx,
        `${nomCompletPhysique(g)}, né${eg} le ${dateEnLettresFr(g.date_naissance)} à ${
          g.lieu_naissance ?? ""
        }, de nationalité ${g.nationalite ?? ""}, demeurant ${g.adresse ?? ""} (${
          feminin(g) ? "la « Gérante »" : "le « Gérant »"
        }).`
          .replace(/\s+/g, " ")
          .trim(),
      );
      espace(ctx, 4);
      ecrire(
        ctx,
        `${feminin(g) ? "La Gérante" : "Le Gérant"} déclare accepter ces fonctions et n'être frappé${eg} d'aucune incompatibilité, interdiction, déchéance ou mesure susceptible de faire obstacle à cette nomination.`,
      );
    }
    espace(ctx, 6);
  });

  espace(ctx, 6);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 4);
  const nbExemplaires = parts.length + 1;
  ecrire(
    ctx,
    `En ${montantEnLettresFr(nbExemplaires)} (${nbExemplaires}) exemplaires originaux, dont un pour chaque associé et un pour la Société.`,
  );
  espace(ctx, 14);
  const signaturesSci = () => {
    for (const a of parts) {
      const estGerant = gerants.some((g) => g.id === a.id);
      ecrire(
        ctx,
        `${nomDe(a)} — Associé${accord(a)}${
          estGerant ? ` et gérant${accord(a)}` : ""
        } — Agissant en son nom personnel`,
      );
      espace(ctx, 22);
    }
    for (const g of gerants.filter((x) => !x.est_associe)) {
      ecrire(ctx, `${nomDe(g)} — ${feminin(g) ? "Gérante" : "Gérant"} non associé${accord(g)}`);
      espace(ctx, 22);
    }
  };
  signaturesSci();

  article(ctx, "ANNEXE 1 - MANDAT - ACTES À ACCOMPLIR POUR LE COMPTE DE LA SOCIÉTÉ EN FORMATION");
  ecrire(
    ctx,
    `Les Associés soussignés, agissant en qualité d'associés de la société civile immobilière ${d.denomination}, au capital de ${capital} euros, en cours de constitution, dont le siège social est situé ${d.siege_adresse}, donnent mandat exprès au gérant à l'effet de prendre, pour le compte de la Société en formation, les engagements suivants :`,
  );
  espace(ctx, 6);
  [
    "Négocier et signer toute promesse unilatérale ou synallagmatique de vente portant sur l'acquisition d'un bien immobilier, verser toute indemnité d'immobilisation ou tout dépôt de garantie, et réitérer l'acquisition par acte authentique ;",
    "Solliciter, négocier, accepter et souscrire tout prêt destiné à financer cette acquisition et les travaux s'y rapportant, signer toute offre de prêt et tout acte de prêt ;",
    "Consentir toute hypothèque conventionnelle, tout privilège de prêteur de deniers et toute autre garantie réelle ou personnelle exigée par l'établissement prêteur ;",
    "Souscrire toute assurance nécessaire, notamment l'assurance des biens immobiliers de la Société et l'assurance emprunteur ;",
    "Ouvrir tout compte bancaire au nom de la Société, y déposer les fonds correspondant aux apports et le faire fonctionner ;",
    "Engager et régler les dépenses courantes nécessaires à la mise en fonctionnement de la Société, ainsi que les frais et honoraires de constitution ;",
    "Signer tout bail, convention d'occupation ou avenant portant sur les biens de la Société ;",
    "Procéder ou faire procéder à toutes les formalités de constitution prescrites par la loi, souscrire la déclaration de constitution auprès du guichet unique des formalités des entreprises, procéder à la publication de l'avis de constitution et requérir l'immatriculation de la Société au Registre du commerce et des sociétés ;",
    ...(isOption
      ? [
          "Notifier au service des impôts des entreprises l'option pour l'assujettissement à l'impôt sur les sociétés prévue à l'article 27 des statuts ;",
        ]
      : []),
    "Plus généralement, encaisser et régler toutes sommes, souscrire toutes déclarations, signer toutes pièces et faire le nécessaire aux fins ci-dessus.",
  ].forEach((t) => puce(ctx, t));
  ecrire(
    ctx,
    `Le gérant tiendra avec exactitude la comptabilité de ces opérations, dont le bénéfice et les charges seront repris par la Société du fait même de son immatriculation au Registre du commerce et des sociétés de ${d.greffe_ville}.`,
  );
  espace(ctx, 10);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 14);
  signaturesSci();

  article(ctx, "ANNEXE 2 - LISTE DES SOUSCRIPTEURS");
  repartitionParts(parts).forEach((l) => {
    const a = l.associe;
    const montant = Number(a.montant_apport) || 0;
    ecrire(
      ctx,
      `${comparutionCourte(a)} — ${l.parts} part${l.parts > 1 ? "s" : ""} de ${nominal} €, soit ${montant} €, intégralement libérée${
        l.parts > 1 ? "s" : ""
      }.`,
    );
    espace(ctx, 4);
  });
  ecrire(ctx, `TOTAL : ${nbParts} parts - ${capital} €`, { bold: true });
  espace(ctx, 10);
  ecrire(ctx, `Fait à ${d.ville_signature}, le ${dateEnLettresFr(d.date_signature)}.`, { bold: true });
  espace(ctx, 14);
  signaturesSci();

  controlerClauses(ctx, "SCI");
  return fin(ctx);
}

/* ------------------------------ STATUTS ------------------------------ */

async function statuts(d: Dossier, associes: Associe[]) {
  const forme = d.forme_juridique as Forme;
  if (isSas(forme)) return statutsSas(d, associes);
  if (isSarl(forme) && associesEffectifs(d, associes).length > 1)
    return statutsSarl(d, associes);
  if (isEurl(forme) && !basculeSarlRequise(d, associes)) return statutsEurl(d, associes);
  if (isEurl(forme)) return statutsSarl(d, associes);
  if (isSciForme(forme)) return statutsSci(d, associes);


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


/**
 * Inscrit dans les métadonnées du PDF la version du gabarit appliqué et la date
 * d'entrée en vigueur des règles de conformité utilisées, afin de savoir
 * a posteriori sous quel jeu de règles le document a été produit.
 */
async function estampillerMetadonnees(
  octets: Uint8Array,
  type: string,
  dossier: Dossier,
  associes: Associe[],
): Promise<Uint8Array> {
  try {
    const gabarit = type === "statuts" ? gabaritApplique(dossier, associes) : null;
    const version = gabarit ? VERSIONS_GABARIT[gabarit] : `MOTEUR-${VERSION_MOTEUR}`;
    const pdf = await PDFDocument.load(octets as unknown as ArrayBuffer);
    const maintenant = new Date();
    pdf.setTitle(`${type} — ${dossier.denomination || "dossier"}`);
    pdf.setAuthor("CREA EXPERT");
    pdf.setCreator("CREA EXPERT — moteur documentaire");
    pdf.setProducer(`CREA EXPERT ${VERSION_MOTEUR}`);
    pdf.setSubject(
      `Gabarit ${version} — règles de conformité en vigueur au ${DATE_REGLES_CONFORMITE}`,
    );
    pdf.setKeywords([
      `gabarit=${gabarit ?? "generique"}`,
      `version_gabarit=${version}`,
      `regles_conformite=${DATE_REGLES_CONFORMITE}`,
      `rendu=${RENDU.filigrane ? "projet" : "valide"}`,
      `genere_le=${maintenant.toISOString()}`,
    ]);
    pdf.setCreationDate(maintenant);
    pdf.setModificationDate(maintenant);
    return await pdf.save();
  } catch {
    // Les métadonnées sont une traçabilité de confort : jamais un blocage.
    return octets;
  }
}

export async function genererPdf(
  type: string,
  dossier: Dossier,
  associes: Associe[],
  associeId: string | null,
): Promise<Uint8Array> {
  const octets = await construirePdf(type, dossier, associes, associeId);
  return estampillerMetadonnees(octets, type, dossier, associes);
}

async function construirePdf(
  type: string,
  dossier: Dossier,
  associes: Associe[],
  associeId: string | null,
): Promise<Uint8Array> {
  RENDU = renduPour(dossier);
  const cible = associes.find((a) => a.id === associeId);
  switch (type) {
    case "statuts": {
      // Garde centrale : aucun chemin (aperçu, page Documents, autre) ne peut
      // produire des statuts incomplets ou non conformes.
      const motifs = motifsRefusStatuts(dossier, associes);
      if (motifs.length > 0) throw new Error(messageRefusStatuts(motifs));
      return statuts(dossier, associes);
    }
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
