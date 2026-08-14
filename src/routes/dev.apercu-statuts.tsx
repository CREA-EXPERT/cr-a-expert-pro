import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ApercuStatuts } from "@/components/ApercuStatuts";
import { Button } from "@/components/ui/button";
import { estHoteApercu } from "@/lib/apercu";
import type { Associe, Dossier } from "@/lib/documents";

export const Route = createFileRoute("/dev/apercu-statuts")({
  head: () => ({
    meta: [
      { title: "Banc d'essai — aperçu des statuts | CREA EXPERT" },
      {
        name: "description",
        content:
          "Page technique d'aperçu servant aux tests automatisés de la génération du projet de statuts.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Banc d'essai — aperçu des statuts" },
      {
        property: "og:description",
        content: "Page technique d'aperçu réservée aux tests automatisés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BancEssai,
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

const INCOMPLET = {
  id: "d-test",
  forme_juridique: "SAS",
  denomination: "",
  siege_adresse: "12 rue des Lilas, 69003 Lyon",
  objet_social: "Conseil aux entreprises.",
  capital_montant: 1000,
  valeur_part: 10,
  banque_depot: "",
  ville_signature: "Lyon",
  date_cloture_premier_exercice: "2027-12-31",
  date_signature: "2026-08-01",
  date_consentements: "2026-08-01",
} as unknown as Dossier;

const COMPLEMENT = { denomination: "ESSAI CONSEIL", banque_depot: "Banque de l'Ouest" };

/**
 * Banc d'essai réservé aux hôtes d'aperçu : il reproduit l'écran de récapitulatif
 * avec un dossier d'abord incomplet, puis complété d'un clic, afin de vérifier
 * automatiquement le blocage, la reprise de génération et le journal.
 */
function BancEssai() {
  const [dossier, setDossier] = useState<Dossier>(INCOMPLET);
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);

  if (typeof window !== "undefined" && !estHoteApercu(window.location.host)) {
    return <p className="p-6">Page indisponible.</p>;
  }

  return (
    <main className="container-page space-y-4 py-8" data-hydrated={pret ? "1" : "0"}>
      <h1 className="font-serif text-2xl">Banc d'essai — aperçu des statuts</h1>
      <Button
        type="button"
        variant="outline"
        onClick={() => setDossier((d) => ({ ...d, ...COMPLEMENT }) as Dossier)}
      >
        Compléter le dossier
      </Button>
      <ApercuStatuts dossier={dossier} associes={[ASSOCIE]} />
    </main>
  );
}
