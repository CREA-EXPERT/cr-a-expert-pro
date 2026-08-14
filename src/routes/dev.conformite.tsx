import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TableauConformite, type LigneDossier } from "@/components/TableauConformite";
import { MotifCorrigible } from "@/components/MotifCorrigible";
import { estHoteApercu } from "@/lib/apercu";
import type { Dossier } from "@/lib/documents";
import type { MotifRefus } from "@/lib/statuts-controles";

export const Route = createFileRoute("/dev/conformite")({
  head: () => ({
    meta: [
      { title: "Banc d'essai — suivi de conformité | CREA EXPERT" },
      {
        name: "description",
        content:
          "Page technique reproduisant le suivi de conformité pour les tests automatisés (filtres, tri, export).",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Banc d'essai — suivi de conformité" },
      {
        property: "og:description",
        content: "Page technique de suivi de conformité réservée aux tests automatisés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BancConformite,
});

const DOSSIER = {
  id: "d-test",
  forme_juridique: "SAS",
  denomination: "ESSAI CONSEIL",
} as unknown as Dossier;

const MOTIFS: MotifRefus[] = [
  { texte: "Dénomination sociale", etape: "Dénomination" },
  { texte: "Banque de dépôt des fonds", etape: "Capital" },
];

const LIGNES: LigneDossier[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    denomination: "ALPHA CONSEIL",
    forme: "SAS",
    refus: 3,
    reussites: 1,
    motifs: ["Dénomination sociale"],
    dernier: "2026-08-10T10:00:00.000Z",
    premierEssai: "2026-08-09T10:00:00.000Z",
    valideLe: "2026-08-11T10:00:00.000Z",
    delaiHeures: 48,
    journal: [
      {
        date: "2026-08-10T10:00:00.000Z",
        conforme: false,
        message: "Génération des statuts bloquée — 1 point à traiter : Dénomination sociale.",
        motifs: ["Dénomination sociale"],
        gabarit: "SAS",
        version: "SAS-2026.1",
        auteur: "client@example.fr",
      },
    ],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    denomination: "BETA IMMOBILIER",
    forme: "SCI",
    refus: 0,
    reussites: 2,
    motifs: [],
    dernier: "2026-08-12T10:00:00.000Z",
    premierEssai: "2026-08-12T09:00:00.000Z",
    valideLe: null,
    delaiHeures: null,
    journal: [
      {
        date: "2026-08-12T10:00:00.000Z",
        conforme: true,
        message: "Projet de statuts généré — gabarit Société civile immobilière.",
        motifs: [],
        gabarit: "SCI",
        version: "SCI-2026.1",
        auteur: "client@example.fr",
      },
    ],
  },
];

/** Banc d'essai réservé aux hôtes d'aperçu : suivi de conformité sur données fixes. */
function BancConformite() {
  const [pret, setPret] = useState(false);
  const [debut, setDebut] = useState("2026-05-01");
  const [fin, setFin] = useState("2026-12-31");
  useEffect(() => setPret(true), []);

  if (typeof window !== "undefined" && !estHoteApercu(window.location.host)) {
    return <p className="p-6">Page indisponible.</p>;
  }

  return (
    <main className="container-page space-y-6 py-8" data-hydrated={pret ? "1" : "0"}>
      <h1 className="font-serif text-2xl">Banc d'essai — suivi de conformité</h1>

      <div data-testid="motif-prioritaire" className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Point à corriger en priorité</p>
        <p className="mt-2 text-sm">
          <MotifCorrigible texte="Dénomination sociale" dossier={DOSSIER} motifs={MOTIFS} />
        </p>
      </div>

      <div
        data-testid="refus-telechargement"
        role="alert"
        className="rounded-lg border border-border p-4"
      >
        <p className="text-sm font-medium">Statuts — téléchargement refusé (2 points à traiter)</p>
        <ul className="mt-2 space-y-1 text-sm">
          {MOTIFS.map((m) => (
            <li key={m.texte}>
              <MotifCorrigible texte={m.texte} dossier={DOSSIER} motifs={MOTIFS} />
            </li>
          ))}
        </ul>
      </div>

      <TableauConformite
        lignes={LIGNES}
        debut={debut}
        fin={fin}
        onPeriode={(d, f) => {
          setDebut(d);
          setFin(f);
        }}
      />
    </main>
  );
}
