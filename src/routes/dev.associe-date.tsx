import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AssocieIdentite } from "@/components/AssocieIdentite";
import { Button } from "@/components/ui/button";
import { estHoteApercu } from "@/lib/apercu";
import type { Associe } from "@/lib/documents";

export const Route = createFileRoute("/dev/associe-date")({
  head: () => ({
    meta: [
      { title: "Banc d'essai — saisie de la date de naissance | CREA EXPERT" },
      {
        name: "description",
        content:
          "Page technique d'aperçu servant aux tests automatisés de la saisie d'identité des associés.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Banc d'essai — saisie de la date de naissance" },
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

const CLE = "dev-associe-date";

function associeInitial(): Associe {
  const brouillon =
    typeof window !== "undefined" ? window.sessionStorage.getItem(CLE) : null;
  const base = {
    id: "test",
    type: "personne_physique",
    prenoms: [],
    prenom: "",
    nom: "",
    date_naissance: null,
  } as unknown as Associe;
  return brouillon ? ({ ...base, ...JSON.parse(brouillon) } as Associe) : base;
}

/**
 * Banc d'essai réservé aux hôtes d'aperçu : il reproduit la saisie d'identité
 * d'un associé, la « navigation » (démontage puis remontage du formulaire) et
 * la soumission, afin d'automatiser les vérifications sur mobile.
 */
function BancEssai() {
  const [visible, setVisible] = useState(true);
  const [associe, setAssocie] = useState<Associe>(associeInitial);
  const [soumis, setSoumis] = useState<string | null>(null);

  if (typeof window !== "undefined" && !estHoteApercu(window.location.host)) {
    return <p className="p-6">Page indisponible.</p>;
  }

  function majAssocie(v: Partial<Associe>) {
    setAssocie((a) => {
      const suivant = { ...a, ...v } as Associe;
      window.sessionStorage.setItem(
        CLE,
        JSON.stringify({ date_naissance: suivant.date_naissance, nom: suivant.nom }),
      );
      return suivant;
    });
  }

  return (
    <main className="container-page space-y-4 py-8">
      <h1 className="font-serif text-2xl">Banc d'essai — identité de l'associé</h1>
      {visible && <AssocieIdentite associe={associe} onChange={majAssocie} />}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setVisible((v) => !v)}>
          Simuler une navigation
        </Button>
        <Button
          type="button"
          disabled={!associe.date_naissance}
          onClick={() => setSoumis(associe.date_naissance ?? null)}
        >
          Soumettre
        </Button>
      </div>
      <p data-testid="valeur-courante">{associe.date_naissance ?? ""}</p>
      <p data-testid="valeur-soumise">{soumis ?? ""}</p>
    </main>
  );
}
