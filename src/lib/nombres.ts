/**
 * Écriture des nombres et des dates en toutes lettres françaises.
 * Utilisé par les actes générés (montants en lettres, dates en clair).
 */

import { MOIS } from "./domain";

const UNITES = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];

const DIZAINES: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
  7: "soixante",
  8: "quatre-vingt",
  9: "quatre-vingt",
};

/** Nombres de 0 à 99. */
function souscent(n: number): string {
  if (n < 17) return UNITES[n] as string;
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) {
    const base = DIZAINES[d] as string;
    const reste = souscent(10 + u);
    return u === 1 && d === 7 ? `${base} et onze` : `${base}-${reste}`;
  }
  const base = DIZAINES[d] as string;
  if (u === 0) return d === 8 ? "quatre-vingts" : base;
  if (u === 1 && d !== 8) return `${base} et un`;
  return `${base}-${UNITES[u]}`;
}

/** Nombres de 0 à 999. */
function souscentmille(n: number): string {
  if (n < 100) return souscent(n);
  const c = Math.floor(n / 100);
  const reste = n % 100;
  const tete = c === 1 ? "cent" : `${UNITES[c]} cent`;
  if (reste === 0) return c === 1 ? "cent" : `${tete}s`;
  return `${tete} ${souscent(reste)}`;
}

/**
 * Écrit un entier positif en toutes lettres (0 à 999 999 999).
 * « mille » est invariable ; « cent » et « vingt » s'accordent quand ils terminent le nombre.
 */
export function nombreEnLettresFr(valeur: number): string {
  const n = Math.floor(Math.abs(valeur));
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "zéro";
  if (n > 999_999_999) return n.toLocaleString("fr-FR");

  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const morceaux: string[] = [];

  if (millions > 0)
    morceaux.push(millions === 1 ? "un million" : `${souscentmille(millions)} millions`);
  if (milliers > 0) morceaux.push(milliers === 1 ? "mille" : `${souscentmille(milliers)} mille`);
  if (reste > 0) morceaux.push(souscentmille(reste));

  return morceaux.join(" ");
}

/** Montant en euros écrit en lettres, centimes inclus le cas échéant. */
export function montantEnLettresFr(valeur: number): string {
  const entier = Math.floor(Math.abs(valeur));
  const centimes = Math.round((Math.abs(valeur) - entier) * 100);
  const base = nombreEnLettresFr(entier);
  if (centimes === 0) return base;
  return `${base} euros et ${nombreEnLettresFr(centimes)} centimes`;
}

/** Date ISO écrite en clair : « 14 août 2026 », « 1er janvier 2027 ». */
export function dateEnLettresFr(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  const jour = Number(j);
  const mois = MOIS[Number(m) - 1] ?? "";
  return `${jour === 1 ? "1er" : jour} ${mois} ${a}`;
}

/** Jour et mois en clair, sans année : « 31 décembre ». */
export function jourMoisEnLettresFr(jour: number, mois: number): string {
  return `${jour === 1 ? "1er" : jour} ${MOIS[mois - 1] ?? ""}`;
}
