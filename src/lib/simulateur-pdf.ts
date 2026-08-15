/**
 * Export PDF du comparatif de formes juridiques : tableau critère par critère,
 * synthèse et disclaimer intégral. Aucun texte n'est écrit en dur ici :
 * tout provient de `simulateur-textes.ts` et du moteur de comparaison.
 */

import {
  DISCLAIMER_SIMULATEUR,
  MENTION_LEGITIMITE,
  PASTILLES,
  SIMULATEUR_SOUS_TITRE,
  SIMULATEUR_TEXTES_VERSION,
  SIMULATEUR_TITRE,
  type NiveauPastille,
} from "./simulateur-textes";
import type { Restitution2 } from "./simulateur-moteur";

/** Les pastilles unicode ne sont pas encodables en WinAnsi : équivalents ASCII. */
const SIGNE_PDF: Record<NiveauPastille, string> = {
  correspond: "(+)",
  neutre: "(=)",
  vigilance: "(!)",
};

function assainir(t: string) {
  return t
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/[●◐○]/g, "");
}

export async function genererPdfComparatif({
  restitution,
  colonnes,
  prenom,
}: {
  restitution: Restitution2;
  colonnes: { sas: string; sarl: string };
  prenom?: string;
}): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const LARGEUR = 595.28;
  const HAUTEUR = 841.89;
  const MARGE = 48;
  const utile = LARGEUR - MARGE * 2;
  const gris = rgb(0.36, 0.35, 0.33);
  const noir = rgb(0.11, 0.1, 0.09);

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;

  function nouvellePage() {
    page = pdf.addPage([LARGEUR, HAUTEUR]);
    y = HAUTEUR - MARGE;
  }

  function lignes(texte: string, taille: number, largeur: number, police = regular) {
    const mots = assainir(texte).split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let courante = "";
    for (const mot of mots) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) > largeur && courante) {
        out.push(courante);
        courante = mot;
      } else {
        courante = essai;
      }
    }
    if (courante) out.push(courante);
    return out;
  }

  function ecrire(
    texte: string,
    {
      taille = 10,
      police = regular,
      couleur = noir,
      x = MARGE,
      largeur = utile,
      interligne = 1.35,
      apres = 6,
    }: {
      taille?: number;
      police?: typeof regular;
      couleur?: ReturnType<typeof rgb>;
      x?: number;
      largeur?: number;
      interligne?: number;
      apres?: number;
    } = {},
  ) {
    for (const l of lignes(texte, taille, largeur, police)) {
      if (y < MARGE + 40) nouvellePage();
      y -= taille * interligne;
      page.drawText(l, { x, y, size: taille, font: police, color: couleur });
    }
    y -= apres;
  }

  ecrire(SIMULATEUR_TITRE, { taille: 20, police: bold, apres: 4 });
  ecrire(SIMULATEUR_SOUS_TITRE, { taille: 10, couleur: gris, apres: 10 });
  if (prenom) ecrire(`Comparatif établi pour ${prenom}.`, { taille: 10, apres: 8 });
  ecrire(DISCLAIMER_SIMULATEUR, { taille: 8.5, couleur: gris, apres: 6 });
  ecrire(MENTION_LEGITIMITE, { taille: 8.5, couleur: gris, apres: 14 });

  const colLibelle = utile * 0.26;
  const colTexte = (utile - colLibelle) / 2 - 8;

  ecrire("Comparaison critère par critère", { taille: 13, police: bold, apres: 8 });

  // En-tête de tableau
  if (y < MARGE + 60) nouvellePage();
  y -= 12;
  page.drawText("Critère", { x: MARGE, y, size: 9.5, font: bold, color: noir });
  page.drawText(assainir(colonnes.sas), {
    x: MARGE + colLibelle,
    y,
    size: 9.5,
    font: bold,
    color: noir,
  });
  page.drawText(assainir(colonnes.sarl), {
    x: MARGE + colLibelle + colTexte + 8,
    y,
    size: 9.5,
    font: bold,
    color: noir,
  });
  y -= 8;

  for (const ligne of restitution.lignes) {
    const gauche = lignes(ligne.libelle, 9, colLibelle - 8, bold);
    const milieu = lignes(
      `${SIGNE_PDF[ligne.sas.niveau]} ${PASTILLES[ligne.sas.niveau].libelle} — ${ligne.sas.texte}`,
      8.5,
      colTexte,
    );
    const droite = lignes(
      `${SIGNE_PDF[ligne.sarl.niveau]} ${PASTILLES[ligne.sarl.niveau].libelle} — ${ligne.sarl.texte}`,
      8.5,
      colTexte,
    );
    const hauteurBloc = Math.max(gauche.length * 12, milieu.length * 11, droite.length * 11) + 12;
    if (y - hauteurBloc < MARGE + 30) nouvellePage();

    page.drawLine({
      start: { x: MARGE, y },
      end: { x: LARGEUR - MARGE, y },
      thickness: 0.5,
      color: rgb(0.85, 0.84, 0.82),
    });

    let yb = y - 12;
    gauche.forEach((l, i) => {
      page.drawText(l, { x: MARGE, y: yb - i * 12, size: 9, font: bold, color: noir });
    });
    milieu.forEach((l, i) => {
      page.drawText(l, {
        x: MARGE + colLibelle,
        y: yb - i * 11,
        size: 8.5,
        font: regular,
        color: noir,
      });
    });
    droite.forEach((l, i) => {
      page.drawText(l, {
        x: MARGE + colLibelle + colTexte + 8,
        y: yb - i * 11,
        size: 8.5,
        font: regular,
        color: noir,
      });
    });
    yb -= hauteurBloc;
    y = yb;
  }

  y -= 14;
  ecrire(
    Object.values(PASTILLES)
      .map((p, i) => `${Object.values(SIGNE_PDF)[i]} ${p.libelle}`)
      .join("   ·   "),
    { taille: 8, couleur: gris, apres: 12 },
  );

  ecrire("Synthèse", { taille: 13, police: bold, apres: 6 });
  ecrire(restitution.synthese, { taille: 10, apres: 14 });

  ecrire(DISCLAIMER_SIMULATEUR, { taille: 8.5, couleur: gris, apres: 10 });
  ecrire(
    `Textes v${SIMULATEUR_TEXTES_VERSION} — document établi le ${new Date().toLocaleDateString("fr-FR")}.`,
    { taille: 8, couleur: gris, apres: 0 },
  );

  pdf.setTitle(`${SIMULATEUR_TITRE} — CREA EXPERT`);
  pdf.setSubject("Information générale, ne constitue pas un conseil personnalisé");
  pdf.setKeywords([`textes:${SIMULATEUR_TEXTES_VERSION}`, "comparatif", "information generale"]);

  const octets = await pdf.save();
  return new Blob([octets as unknown as BlobPart], { type: "application/pdf" });
}

export function telechargerBlob(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}
