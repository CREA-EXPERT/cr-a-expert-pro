import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EncadrePliable } from "@/components/EncadrePliable";
import { ContratMariageChamps } from "@/components/ContratMariageChamps";
import type { Associe } from "@/lib/documents";

export const Route = createFileRoute("/dev/encadres")({
  head: () => ({
    meta: [
      { title: "Banc d'essai — encadrés pliables | CREA EXPERT" },
      {
        name: "description",
        content:
          "Page technique reproduisant les encadrés pédagogiques repliables pour les tests automatisés.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Banc d'essai — encadrés pliables" },
      {
        property: "og:description",
        content: "Page technique de test des encadrés pédagogiques repliables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BancEncadres,
});

const TITRES = [
  "Qu'est-ce que l'objet social ?",
  "À quoi sert le capital social ?",
  "Ce qu'implique une libération partielle",
  "Apports en nature et apports en industrie",
];

const ASSOCIE_BASE = {
  id: "a-test",
  type: "personne_physique",
  situation_matrimoniale: "marie",
  contrat_mariage: true,
  contrat_mariage_etude: "",
  contrat_mariage_notaire: "",
  contrat_mariage_date: "",
} as unknown as Associe;

function BancEncadres() {
  const [associe, setAssocie] = useState<Associe>(ASSOCIE_BASE);

  return (
    <main data-hydrated="1" className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Encadrés pédagogiques</h1>
      {TITRES.map((t) => (
        <EncadrePliable key={t} titre={t}>
          <p>Contenu pédagogique de démonstration pour « {t} ».</p>
          <input aria-label={`Champ ${t}`} className="h-10 w-full rounded-md border px-3" />
        </EncadrePliable>
      ))}
      <EncadrePliable titre="Un contrat de mariage a été signé devant notaire.">
        <ContratMariageChamps
          associe={associe}
          maj={(v) => setAssocie((a) => ({ ...a, ...v }) as Associe)}
        />
      </EncadrePliable>
    </main>
  );
}
