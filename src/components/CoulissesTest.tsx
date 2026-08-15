import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lireCoulisses } from "@/lib/coulisses.functions";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

function poids(taille: number | null) {
  if (taille === null) return "—";
  if (taille < 1024) return `${taille} o`;
  if (taille < 1024 * 1024) return `${Math.round(taille / 1024)} Ko`;
  return `${(taille / (1024 * 1024)).toFixed(1)} Mo`;
}

function date(valeur?: string | null) {
  return valeur ? new Date(valeur).toLocaleString("fr-FR") : "—";
}

/**
 * Panneau « Coulisses du test » : où vont les fichiers, quels emails partent,
 * quels statuts se succèdent et où sont les traces de signature.
 */
export function CoulissesTest({ dossierId }: { dossierId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const lire = useServerFn(lireCoulisses);

  const { data, isLoading, error } = useQuery({
    queryKey: ["coulisses", dossierId],
    enabled: ouvert,
    queryFn: () => lire({ data: { dossierId } }),
  });

  return (
    <section
      data-testid="coulisses-test"
      className="rounded-lg border border-amber-300/70 bg-amber-50/60 p-5"
    >
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-center gap-2 text-left"
      >
        {ouvert ? (
          <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden />
        ) : (
          <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
        )}
        <span className="font-serif text-xl">Coulisses du test</span>
      </button>
      <p className="mt-1 pl-6 text-sm text-muted-foreground">
        Stockage, emails, statuts et signatures de ce dossier de test.
      </p>

      {ouvert && (
        <div className="mt-5 space-y-6 pl-6 text-sm">
          {isLoading && <p className="text-muted-foreground">Chargement…</p>}
          {error && <p className="text-destructive">Lecture impossible pour ce dossier.</p>}

          {data && (
            <>
              <div>
                <h3 className="font-medium">Stockage ({data.fichiers.length} fichier(s))</h3>
                {data.fichiers.length === 0 ? (
                  <p className="mt-1 text-muted-foreground">Aucun fichier stocké.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.fichiers.map((f) => (
                      <li key={`${f.bucket}/${f.chemin}`} className="flex flex-wrap gap-x-3">
                        <span className="font-mono text-xs">{f.bucket}</span>
                        <span className="font-mono text-xs break-all">{f.chemin}</span>
                        <span className="text-muted-foreground">{poids(f.taille)}</span>
                        <span className="text-muted-foreground">{date(f.horodatage)}</span>
                        {f.url && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            Voir
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-medium">Emails ({data.emails.length})</h3>
                {data.emails.length === 0 ? (
                  <p className="mt-1 text-muted-foreground">Aucun email envoyé.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {data.emails.map((e) => (
                      <li key={e.id}>
                        <span className="font-medium">{e.sujet}</span> → {e.destinataire} ·{" "}
                        {e.statut} · {date(e.created_at)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-medium">Statuts ({data.statuts.length})</h3>
                <ul className="mt-2 space-y-1">
                  {data.statuts.map((s) => (
                    <li key={s.id}>
                      <span className="font-mono text-xs">{s.type_event}</span> · {date(s.created_at)}
                      <span className="block text-muted-foreground">{s.message}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-medium">Signatures</h3>
                {data.signatures.length === 0 ? (
                  <p className="mt-1 text-muted-foreground">Aucune signature préparée.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {data.signatures.map((s) => (
                      <li key={s.id}>
                        <p className="font-medium">
                          {s.libelle} — {s.statut}
                        </p>
                        <p className="text-muted-foreground">
                          Envoyé : {date(s.envoye_le)} · Signé : {date(s.signe_le)} · Fichier :{" "}
                          <span className="font-mono text-xs">{s.fichier_signe ?? "—"}</span>
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {s.signataires.map((p) => (
                            <li key={p.id} className="text-muted-foreground">
                              {p.signataire_nom} · {p.methode ?? "en attente"} ·{" "}
                              {date(p.horodatage)} · empreinte{" "}
                              <span className="font-mono text-xs">
                                {p.hash_document ? p.hash_document.slice(0, 16) : "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <Button variant="outline" size="sm" onClick={() => setOuvert(false)}>
            Replier
          </Button>
        </div>
      )}
    </section>
  );
}
