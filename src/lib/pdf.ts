import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { euro, isSas, type Forme } from "./domain";
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

function filigrane(page: PDFPage, font: PDFFont) {
  page.drawText("PROJET — soumis à la validation du cabinet", {
    x: 60,
    y: 300,
    size: 24,
    font,
    color: rgb(0.86, 0.86, 0.88),
    rotate: degrees(38),
  });
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

/* ------------------------------ STATUTS ------------------------------ */

async function statuts(d: Dossier, associes: Associe[]) {
  const forme = d.forme_juridique as Forme;
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
  ecrire(ctx, "Personnes physiques détenant, directement ou indirectement, plus de 25 % du capital ou des droits de vote, ou exerçant un pouvoir de contrôle :");
  espace(ctx, 8);
  associes
    .filter((a) => a.type === "personne_physique" && a.est_associe)
    .forEach((a) => {
      const pct = ((Number(a.montant_apport) / capital) * 100).toFixed(2);
      ecrire(ctx, `— ${identite(a)} : ${pct} % du capital.`);
    });
  espace(ctx, 8);
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
  ecrire(ctx, `Je soussigné(e) [prénom et nom du conjoint], conjoint(e) de ${a ? nomComplet(a) : "[associé]"},`);
  espace(ctx, 8);
  ecrire(ctx, `déclare renoncer expressément à revendiquer la qualité d'associé pour les parts souscrites au moyen de fonds communs dans la société ${d.denomination || "[dénomination]"}.`);
  aValider(ctx, "portée de la renonciation");
  espace(ctx, 20);
  ecrire(ctx, `Fait le ${dateFr(d.date_signature)}.`, { bold: true });
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
];

export async function genererPdf(
  type: string,
  dossier: Dossier,
  associes: Associe[],
  associeId: string | null,
): Promise<Uint8Array> {
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
