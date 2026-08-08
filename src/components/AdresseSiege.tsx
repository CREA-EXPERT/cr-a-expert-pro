import { useState } from "react";
import { Check, Loader2, MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dossier } from "@/lib/documents";

type Suggestion = { label: string; voie: string; cp: string; ville: string };

/** Adresse du siège saisie champ par champ, avec contrôle d'existence auprès
 *  de la Base Adresse Nationale (service public français, données en France). */
export function AdresseSiege({
  dossier,
  patch,
}: {
  dossier: Dossier;
  patch: (v: Partial<Dossier>) => void | Promise<void>;
}) {
  const [etat, setEtat] = useState<"idle" | "chargement" | "ok" | "aucun" | "erreur">("idle");
  const [propositions, setPropositions] = useState<Suggestion[]>([]);

  const composer = (v: Partial<Dossier>) => {
    const voie = v.siege_voie ?? dossier.siege_voie ?? "";
    const comp = v.siege_complement ?? dossier.siege_complement ?? "";
    const cp = v.siege_code_postal ?? dossier.siege_code_postal ?? "";
    const ville = v.siege_ville ?? dossier.siege_ville ?? "";
    const ligne = [voie, comp, [cp, ville].filter(Boolean).join(" "), "France"]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    return { ...v, siege_pays: "France", siege_adresse: ligne };
  };

  const maj = (v: Partial<Dossier>) => {
    setEtat("idle");
    setPropositions([]);
    void patch({ ...composer(v), siege_adresse_verifiee: false });
  };

  const verifier = async () => {
    const requete = [dossier.siege_voie, dossier.siege_code_postal, dossier.siege_ville]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (requete.length < 5) {
      setEtat("aucun");
      return;
    }
    setEtat("chargement");
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(requete)}&limit=5`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("indisponible");
      const j = (await r.json()) as {
        features: { properties: { label: string; name: string; postcode: string; city: string; score: number } }[];
      };
      const items: Suggestion[] = (j.features ?? []).map((f) => ({
        label: f.properties.label,
        voie: f.properties.name,
        cp: f.properties.postcode,
        ville: f.properties.city,
      }));
      setPropositions(items);
      const exact = j.features?.[0];
      if (exact && exact.properties.score >= 0.85) {
        const p = exact.properties;
        void patch(
          composer({
            siege_voie: p.name,
            siege_code_postal: p.postcode,
            siege_ville: p.city,
            siege_adresse_verifiee: true,
          }),
        );
        setEtat("ok");
      } else {
        setEtat(items.length ? "aucun" : "aucun");
      }
    } catch {
      setEtat("erreur");
    }
  };

  const choisir = (s: Suggestion) => {
    void patch(
      composer({
        siege_voie: s.voie,
        siege_code_postal: s.cp,
        siege_ville: s.ville,
        siege_adresse_verifiee: true,
      }),
    );
    setPropositions([]);
    setEtat("ok");
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium">Adresse du siège</p>

      <div className="space-y-2">
        <Label htmlFor="voie">Adresse (numéro et voie)</Label>
        <Input
          id="voie"
          maxLength={160}
          placeholder="12 rue de la Paix"
          value={dossier.siege_voie ?? ""}
          onChange={(e) => maj({ siege_voie: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comp">Complément d'adresse (facultatif)</Label>
        <Input
          id="comp"
          maxLength={160}
          placeholder="Bâtiment B, 3e étage, boîte 12"
          value={dossier.siege_complement ?? ""}
          onChange={(e) => maj({ siege_complement: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cp">Code postal</Label>
          <Input
            id="cp"
            inputMode="numeric"
            maxLength={5}
            value={dossier.siege_code_postal ?? ""}
            onChange={(e) => maj({ siege_code_postal: e.target.value.replace(/\D/g, "") })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ville">Ville</Label>
          <Input
            id="ville"
            maxLength={120}
            value={dossier.siege_ville ?? ""}
            onChange={(e) => maj({ siege_ville: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pays">Pays</Label>
          <Input id="pays" value="France" readOnly disabled />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Le siège doit être situé en France : c'est lui qui détermine le greffe compétent.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => void verifier()} disabled={etat === "chargement"}>
          {etat === "chargement" ? (
            <Loader2 className="animate-spin" strokeWidth={1.5} />
          ) : (
            <MapPin strokeWidth={1.5} />
          )}
          Vérifier l'adresse
        </Button>
        {dossier.siege_adresse_verifiee && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4" strokeWidth={1.5} aria-hidden /> Adresse reconnue
          </span>
        )}
        {etat === "erreur" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <TriangleAlert className="size-4" strokeWidth={1.5} aria-hidden /> Vérification
            indisponible pour le moment.
          </span>
        )}
      </div>

      {propositions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm">Adresses correspondantes — sélectionnez la vôtre :</p>
          <div className="space-y-2">
            {propositions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => choisir(s)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:border-accent"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {etat === "aucun" && propositions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Cette adresse n'a pas été retrouvée dans la base officielle. Vérifiez la saisie ; si
          l'adresse est récente, vous pouvez poursuivre, le cabinet la contrôlera.
        </p>
      )}
    </div>
  );
}
