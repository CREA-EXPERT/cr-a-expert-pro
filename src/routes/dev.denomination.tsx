import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { VerifDenomination } from "@/components/VerifDenomination";
import { Button } from "@/components/ui/button";
import { estHoteApercu } from "@/lib/apercu";
import type { Associe, Dossier } from "@/lib/documents";
import { motifsRefusStatuts } from "@/lib/statuts-controles";
import type { NiveauRisqueDenomination } from "@/lib/denomination";

export const Route = createFileRoute("/dev/denomination")({
  head: () => ({
    meta: [
      { title: "Banc d'essai — dénomination | CREA EXPERT" },
      {
        name: "description",
        content:
          "Page technique reproduisant la vérification de la dénomination pour les tests automatisés.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Banc d'essai — dénomination" },
      {
        property: "og:description",
        content: "Page technique de vérification de la dénomination réservée aux tests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BancDenomination,
});

const ASSOCIE = {
  id: "a-test",
  type: "personne_physique",
  est_associe: true,
  est_dirigeant: true,
  fonction: "president",
  civilite: "Monsieur",
  prenom: "Jean",
  prenoms: ["Jean"],
  nom: "Durand",
  date_naissance: "1980-05-12",
  lieu_naissance: "Lyon",
  nationalite: "française",
  adresse: "12 rue des Lilas, 69003 Lyon",
  situation_matrimoniale: "celibataire",
  nb_titres: 100,
  montant_apport: 1000,
} as unknown as Associe;

const DOSSIER = {
  id: "d-test",
  forme_juridique: "SAS",
  denomination: "ESSAI CONSEIL",
  siege_adresse: "12 rue des Lilas, 69003 Lyon",
  objet_social: "Conseil aux entreprises.",
  capital_montant: 1000,
  valeur_part: 10,
  banque_depot: "Banque de l'Ouest",
  ville_signature: "Lyon",
  date_cloture_premier_exercice: "2027-12-31",
  date_signature: "2026-08-01",
  date_consentements: "2026-08-01",
} as unknown as Dossier;

/** Banc d'essai : la dénomination n'est jamais un motif de blocage. */
function BancDenomination() {
  const [pret, setPret] = useState(false);
  const [risque, setRisque] = useState<NiveauRisqueDenomination | null>(null);
  useEffect(() => setPret(true), []);

  if (typeof window !== "undefined" && !estHoteApercu(window.location.host)) {
    return <p className="p-6">Page indisponible.</p>;
  }

  const motifs = motifsRefusStatuts(
    { ...DOSSIER, denomination_risque: risque } as unknown as Dossier,
    [ASSOCIE],
  );

  return (
    <main className="container-page space-y-4 py-8" data-hydrated={pret ? "1" : "0"}>
      <h1 className="font-serif text-2xl">Banc d'essai — dénomination</h1>
      <VerifDenomination
        denomination="ESSAI CONSEIL"
        codesNaf={["70.22Z"]}
        onRisque={(n) => setRisque(n)}
      />
      <Button type="button" disabled={motifs.length > 0}>
        Générer les statuts
      </Button>
    </main>
  );
}
