import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldQuestion } from "lucide-react";
import { analyserReglementation } from "@/lib/reglemente.functions";
import type { AnalyseReglementation } from "@/lib/ai-reglemente.server";

/**
 * Vérification informative : l'utilisateur décrit son activité et l'assistant
 * indique si elle est, en règle générale, réglementée, ainsi que les diplômes
 * ou justificatifs habituellement exigés.
 */
export function VerifReglementation({
  activite,
  naf,
  auto = false,
  onResultat,
}: {
  activite: string;
  naf?: string | null;
  /** Lance la vérification automatiquement dès que le texte de l'activité change. */
  auto?: boolean;
  onResultat?: (reglementee: boolean, resume: string) => void;
}) {
  const [texte, setTexte] = useState("");
  const [encours, setEncours] = useState(false);
  const [analyse, setAnalyse] = useState<AnalyseReglementation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const description = (texte.trim() || activite.trim()).slice(0, 600);
  const dejaAnalyse = useRef<string | null>(null);

  /**
   * Vérification automatique : dès qu'un texte d'activité est généré ou modifié,
   * l'assistant contrôle son caractère potentiellement réglementé, sans action
   * de l'utilisateur. Chaque texte n'est analysé qu'une fois.
   */
  useEffect(() => {
    if (!auto) return;
    const cible = activite.trim().slice(0, 600);
    if (cible.length < 15 || dejaAnalyse.current === cible || texte.trim()) return;
    dejaAnalyse.current = cible;
    const t = setTimeout(() => {
      void verifier();
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, activite, texte]);

  async function verifier() {
    if (description.length < 5) return;
    setEncours(true);
    setErreur(null);
    try {
      const res = await analyserReglementation({
        data: { activite: description, ...(naf ? { naf } : {}) },
      });
      if (res?.analyse) {
        setAnalyse(res.analyse);
        onResultat?.(
          res.analyse.reglementee === "oui",
          [res.analyse.explication, ...res.analyse.exigences].join(" "),
        );
      } else {
        setErreur(res?.erreur ?? "La vérification n'a pas abouti.");
      }
    } catch {
      setErreur("La vérification est momentanément indisponible.");
    } finally {
      setEncours(false);
    }
  }

  const ton =
    analyse?.reglementee === "oui"
      ? "border-warning/50 bg-warning/10"
      : analyse?.reglementee === "non"
        ? "border-success/40 bg-success/8"
        : "border-border bg-muted/50";

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <ShieldQuestion className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
        {auto ? "Vérification du caractère réglementé" : "Vous ne savez pas si votre activité est réglementée ?"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {auto
          ? "Le texte de l'activité ci-dessus est contrôlé automatiquement : l'assistant indique s'il s'agit, en règle générale, d'une activité réglementée. Vous pouvez relancer la vérification ou préciser votre métier ci-dessous."
          : ""}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Décrivez votre métier en quelques mots (par exemple « expert-comptable », « coiffeur à
        domicile », « agent immobilier »). L'assistant vous indique si l'activité est en règle
        générale réglementée, et quel diplôme ou justificatif est habituellement exigé.
      </p>
      <Label htmlFor="verif-regl" className="sr-only">
        Décrivez votre activité
      </Label>
      <Textarea
        id="verif-regl"
        rows={2}
        maxLength={600}
        className="mt-3"
        placeholder={activite ? "Laissez vide pour réutiliser votre description ci-dessus." : "Ex. : je coupe les cheveux à domicile."}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={encours || description.length < 5}
          onClick={verifier}
        >
          {encours ? "Vérification en cours…" : auto ? "Relancer la vérification" : "Vérifier ma réglementation"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Information générale et non exhaustive — ne constitue pas un conseil.
        </span>
      </div>

      {erreur && <p className="mt-3 text-sm text-destructive">{erreur}</p>}

      {analyse && (
        <div className={`mt-4 rounded-md border p-4 text-sm leading-relaxed ${ton}`}>
          <p className="font-medium">
            {analyse.reglementee === "oui"
              ? "Attention : cette activité est en règle générale réglementée."
              : analyse.reglementee === "non"
                ? "Cette activité n'apparaît pas comme réglementée."
                : "Il subsiste un doute sur le caractère réglementé de cette activité."}
          </p>
          {analyse.activite && (
            <p className="mt-1 text-xs text-muted-foreground">Activité analysée : {analyse.activite}</p>
          )}
          <p className="mt-2 text-justify">{analyse.explication}</p>
          {analyse.exigences.length > 0 && (
            <>
              <p className="mt-2 font-medium">Conditions habituellement exigées</p>
              <ul className="mt-1 space-y-1 pl-5 [&>li]:list-disc">
                {analyse.exigences.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </>
          )}
          {analyse.justificatifs.length > 0 && (
            <>
              <p className="mt-2 font-medium">Justificatifs correspondants</p>
              <ul className="mt-1 space-y-1 pl-5 [&>li]:list-disc">
                {analyse.justificatifs.map((j) => (
                  <li key={j}>{j}</li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Réponse générée automatiquement, à titre d'information générale et non exhaustive. En
            l'absence de recours à un professionnel, la responsabilité de la déclaration vous
            incombe seul.
          </p>
        </div>
      )}
    </div>
  );
}
