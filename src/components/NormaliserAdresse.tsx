import { useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

type Suggestion = { label: string; voie: string; cp: string; ville: string };

/**
 * Normalisation d'une adresse personnelle auprès de la Base Adresse Nationale
 * (service public gratuit). L'utilisateur reste libre de conserver sa saisie :
 * les adresses étrangères ou non référencées ne sont jamais bloquées.
 */
export function NormaliserAdresse({
  voie,
  codePostal,
  ville,
  pays,
  onRetenir,
}: {
  voie: string;
  codePostal: string;
  ville: string;
  pays: string;
  onRetenir: (v: { adresse: string; adresse_code_postal: string; adresse_ville: string }) => void;
}) {
  const [etat, setEtat] = useState<"idle" | "chargement" | "ok" | "aucun" | "erreur" | "retenu">(
    "idle",
  );
  const [propositions, setPropositions] = useState<Suggestion[]>([]);

  if (pays && pays !== "France") return null;

  const verifier = async () => {
    const requete = [voie, codePostal, ville].filter(Boolean).join(" ").trim();
    if (requete.length < 5) {
      setEtat("aucun");
      return;
    }
    setEtat("chargement");
    try {
      const r = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(requete)}&limit=5`,
      );
      if (!r.ok) throw new Error("indisponible");
      const j = (await r.json()) as {
        features: { properties: { label: string; name: string; postcode: string; city: string } }[];
      };
      const items = (j.features ?? []).map((f) => ({
        label: f.properties.label,
        voie: f.properties.name,
        cp: f.properties.postcode,
        ville: f.properties.city,
      }));
      setPropositions(items);
      setEtat(items.length > 0 ? "ok" : "aucun");
    } catch {
      setEtat("erreur");
    }
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={verifier}>
        {etat === "chargement" ? (
          <Loader2 className="animate-spin" strokeWidth={1.5} />
        ) : (
          <MapPin strokeWidth={1.5} />
        )}
        Vérifier l'adresse
      </Button>
      {etat === "retenu" && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <Check className="size-4" strokeWidth={1.5} aria-hidden /> Adresse normalisée retenue.
        </p>
      )}
      {etat === "aucun" && (
        <p className="text-sm text-muted-foreground">
          Aucune adresse correspondante n'a été trouvée. Vous pouvez conserver votre saisie.
        </p>
      )}
      {etat === "erreur" && (
        <p className="text-sm text-muted-foreground">
          Le service de vérification est momentanément indisponible. Votre saisie est conservée.
        </p>
      )}
      {etat === "ok" && (
        <ul className="space-y-1">
          {propositions.map((p) => (
            <li key={p.label}>
              <button
                type="button"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-muted/60"
                onClick={() => {
                  onRetenir({
                    adresse: p.voie,
                    adresse_code_postal: p.cp,
                    adresse_ville: p.ville,
                  });
                  setPropositions([]);
                  setEtat("retenu");
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
