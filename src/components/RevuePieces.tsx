import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { VisionneusePiece, type PieceApercu } from "@/components/VisionneusePiece";
import { deciderPiece, liensPiecesDossier } from "@/lib/pieces.functions";
import { LIBELLE_STATUT, estImage, normaliserStatut } from "@/lib/pieces";
import { analyserChecklist } from "@/lib/checklist";
import type { Associe, DocumentRow, Dossier } from "@/lib/documents";
import { FileText } from "lucide-react";

const SANS_PERSONNE = "Dossier (société)";

/**
 * Revue rapide des pièces déposées, réservée aux rôles habilités.
 * Aperçu en ligne via liens signés générés en lot côté serveur.
 */
export function RevuePieces({
  dossier,
  associes,
  docs,
  onChangement,
}: {
  dossier: Dossier;
  associes: Associe[];
  docs: DocumentRow[];
  onChangement: () => void;
}) {
  const [liens, setLiens] = useState<Record<string, string>>({});
  const [index, setIndex] = useState<number | null>(null);
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);

  const deposees = useMemo(
    () =>
      docs.filter((d) => d.fichier_url).sort((a, b) => a.libelle.localeCompare(b.libelle, "fr")),
    [docs],
  );

  const nomPersonne = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of associes) {
      m.set(
        a.id,
        a.type === "personne_morale"
          ? (a.denomination ?? "Personne morale")
          : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé",
      );
    }
    return m;
  }, [associes]);

  useEffect(() => {
    let actif = true;
    liensPiecesDossier({ data: { dossierId: dossier.id } })
      .then((r) => actif && setLiens(r.liens))
      .catch(() => actif && toast.error("Les aperçus n'ont pas pu être chargés."));
    return () => {
      actif = false;
    };
  }, [dossier.id, docs.length]);

  const apercus: PieceApercu[] = deposees.map((d) => ({
    id: d.id,
    libelle: d.libelle,
    personne: d.associe_id ? (nomPersonne.get(d.associe_id) ?? SANS_PERSONNE) : SANS_PERSONNE,
    chemin: d.fichier_url,
    ...(liens[d.id] ? { url: liens[d.id] as string } : {}),
  }));

  const groupes = useMemo(() => {
    const map = new Map<string, PieceApercu[]>();
    apercus.forEach((p) => {
      const lot = map.get(p.personne) ?? [];
      lot.push(p);
      map.set(p.personne, lot);
    });
    return [...map.entries()];
  }, [JSON.stringify(apercus.map((a) => [a.id, a.url ? 1 : 0]))]);

  const attendues = useMemo(
    () => analyserChecklist(dossier, associes).pieces.filter((p) => p.statut === "a_televerser"),
    [dossier, associes],
  );

  async function decider(
    documentId: string,
    decision: "en_revue" | "valide" | "a_corriger" | "refuse",
  ) {
    setEnCours(documentId);
    try {
      const r = await deciderPiece({
        data: { documentId, decision, motif: motifs[documentId] ?? "" },
      });
      setMotifs((m) => ({ ...m, [documentId]: "" }));
      toast.success(
        decision === "valide"
          ? "Pièce validée."
          : decision === "en_revue"
            ? "Pièce prise en revue."
            : r.emailEnvoye
              ? "Décision enregistrée, le client a été notifié par email."
              : "Décision enregistrée. Le client la verra dans son espace.",
      );
      onChangement();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'action n'a pas abouti.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-serif text-xl">Revue des pièces</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {deposees.length} pièce(s) déposée(s) sur {attendues.length} attendue(s) par la checklist.
        Les aperçus sont ouverts par liens signés temporaires, sans quitter cet écran.
      </p>

      {groupes.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Aucune pièce déposée pour l'instant.</p>
      )}

      {groupes.map(([personne, lot]) => (
        <div key={personne} className="mt-5">
          <h3 className="text-sm font-medium">{personne}</h3>
          <ul className="mt-2 space-y-3">
            {lot.map((p) => {
              const doc = deposees.find((d) => d.id === p.id) as DocumentRow;
              const statut = normaliserStatut(doc.statut_document);
              const badge = LIBELLE_STATUT[statut];
              const position = apercus.findIndex((a) => a.id === p.id);
              return (
                <li key={p.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setIndex(position)}
                      className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Agrandir la pièce ${p.libelle}`}
                    >
                      {p.url && estImage(p.chemin) ? (
                        <img src={p.url} alt="" className="size-full object-cover" />
                      ) : (
                        <FileText
                          className="size-6 text-muted-foreground"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.libelle}</p>
                      <Badge className={`mt-1 ${badge.cls}`} variant="secondary">
                        {badge.label}
                      </Badge>
                      {doc.motif_rejet && (
                        <p className="mt-1 text-xs text-destructive">Motif : {doc.motif_rejet}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setIndex(position)}>
                          Ouvrir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={enCours === p.id}
                          onClick={() => decider(p.id, "en_revue")}
                        >
                          En revue
                        </Button>
                        <Button
                          size="sm"
                          disabled={enCours === p.id}
                          onClick={() => decider(p.id, "valide")}
                        >
                          Valider
                        </Button>
                        <Input
                          className="h-9 w-56"
                          placeholder="Motif (à corriger / refuser)"
                          aria-label={`Motif pour ${p.libelle}`}
                          value={motifs[p.id] ?? ""}
                          onChange={(e) => setMotifs((m) => ({ ...m, [p.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={enCours === p.id}
                          onClick={() => decider(p.id, "a_corriger")}
                        >
                          À corriger
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={enCours === p.id}
                          onClick={() => decider(p.id, "refuse")}
                        >
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-6 rounded-md border border-border bg-background p-3">
        <p className="text-sm font-medium">Checklist attendue</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {attendues.map((p) => {
            const doc = docs.find((d) => d.type_document === p.code);
            const statut = normaliserStatut(doc?.statut_document);
            return (
              <li key={p.code}>
                — {p.libelle}
                {p.personne ? ` (${p.personne})` : ""} : {LIBELLE_STATUT[statut].label}
              </li>
            );
          })}
          {attendues.length === 0 && <li>Aucune pièce à téléverser pour cette situation.</li>}
        </ul>
      </div>

      <VisionneusePiece
        pieces={apercus}
        index={index}
        onIndex={setIndex}
        onFermer={() => setIndex(null)}
      />
    </section>
  );
}
