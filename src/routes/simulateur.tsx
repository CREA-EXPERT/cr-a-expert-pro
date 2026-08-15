import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { EncadrePliable } from "@/components/EncadrePliable";
import { CallbackDialog } from "@/components/CallbackDialog";
import {
  DISCLAIMER_SIMULATEUR,
  LIBELLE_BOUTON_RELECTURE,
  MENTION_LEGITIMITE,
  QUESTIONS,
  SECTIONS,
  SIMULATEUR_SOUS_TITRE,
  SIMULATEUR_TEXTES_VERSION,
  SIMULATEUR_TITRE,
  PASTILLES,
  emailRestitutionHtml,
} from "@/lib/simulateur-textes";
import {
  colonnes,
  construireRestitution,
  legendePastilles,
  lignesPourEmail,
} from "@/lib/simulateur-moteur";
import { construireJournalSimulation } from "@/lib/simulateur-journal";
import { NOTE_REMBOURSEMENT } from "@/lib/restitution";
import { enregistrerSimulation } from "@/lib/public-forms.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/simulateur")({
  head: () => ({
    meta: [
      { title: "Comparer les formes juridiques — CREA EXPERT" },
      { name: "description", content: SIMULATEUR_SOUS_TITRE },
      { property: "og:title", content: "Comparer les formes juridiques — CREA EXPERT" },
      { property: "og:description", content: SIMULATEUR_SOUS_TITRE },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://crea-expert.fr/simulateur" }],
  }),
  component: Simulateur,
});

type Reponses = Record<string, string>;

const TURNSTILE_SITE_KEY = import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined;

function BlocDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-border bg-muted/50 p-4 ${compact ? "text-xs" : "text-sm"} leading-relaxed`}
    >
      <p className="text-justify">{DISCLAIMER_SIMULATEUR}</p>
      <p className="mt-2 text-xs">
        <Link to="/tarifs" className="underline underline-offset-2">
          Offre de relecture par un expert-comptable
        </Link>
        {" · "}
        <Link to="/cgu" className="underline underline-offset-2">
          CGU
        </Link>
      </p>
    </div>
  );
}

function Simulateur() {
  const [reponses, setReponses] = useState<Reponses>({});
  const [index, setIndex] = useState(0);
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [societeWeb, setSocieteWeb] = useState("");
  const [affiche, setAffiche] = useState(false);
  const [emailEnvoye, setEmailEnvoye] = useState(false);
  const [busy, setBusy] = useState(false);

  const visibles = useMemo(
    () => QUESTIONS.filter((q) => (q.visibleSi ? q.visibleSi(reponses) : true)),
    [reponses],
  );
  const total = visibles.length + 1;
  const question = visibles[Math.min(index, visibles.length)];
  const restit = useMemo(() => construireRestitution(reponses), [reponses]);
  const col = colonnes(reponses);

  const section = question ? SECTIONS.find((s) => s.id === question.section) : undefined;
  const premiereDeSection =
    question && visibles.findIndex((q) => q.section === question.section) === index;

  function repondre(id: string, v: string) {
    setReponses((r) => ({ ...r, [id]: v }));
    setIndex((i) => i + 1);
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      toast.error("Merci d'indiquer une adresse électronique valide.");
      return;
    }
    if (!consent) {
      toast.error("Votre consentement est nécessaire pour recevoir votre comparatif.");
      return;
    }
    setBusy(true);
    const html = emailRestitutionHtml({
      prenom: prenom.trim(),
      lignes: lignesPourEmail(restit),
      synthese: restit.synthese,
    });
    const journal = construireJournalSimulation({
      email: parsed.data,
      reponses,
      formeRetenue: restit.formeRetenue,
      restitutionTexte: html,
    });

    try {
      const reponseServeur = await enregistrerSimulation({
        data: {
          email: parsed.data,
          prenom: prenom.trim() || undefined,
          reponses,
          resultat: restit.formeRetenue ?? "comparatif",
          corps_email: html,
          journal,
          piege: societeWeb || undefined,
        },
      });
      setBusy(false);
      if (!reponseServeur.ok) {
        toast.error(
          reponseServeur.raison === "trop_de_demandes"
            ? "Trop de demandes envoyées depuis cet appareil. Réessayez dans une heure."
            : "L'enregistrement de votre comparatif a échoué.",
        );
        return;
      }
      setEmailEnvoye(Boolean(reponseServeur.emailEnvoye));
      setAffiche(true);
    } catch {
      setBusy(false);
      toast.error("L'enregistrement de votre comparatif a échoué.");
    }
  }

  return (
    <PageShell>
      <div className="container-page max-w-4xl py-10">
        <div className="mb-6">
          <Progress
            value={((affiche ? total : Math.min(index, visibles.length)) / total) * 100}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {affiche
              ? "Votre comparatif"
              : question
                ? `Section ${section?.id} — ${section?.titre} · Question ${index + 1} sur ${total}`
                : `Dernière étape sur ${total}`}
          </p>
        </div>

        {!affiche && (
          <>
            <h1 className="font-serif text-3xl">{SIMULATEUR_TITRE}</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground text-justify">
              {SIMULATEUR_SOUS_TITRE}
            </p>
            <div className="mt-5">
              <BlocDisclaimer />
            </div>
          </>
        )}

        {!affiche && question && (
          <div className="mt-8">
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft strokeWidth={1.5} /> Retour
              </Button>
            )}

            {premiereDeSection && section?.intro && (
              <p className="mb-5 rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-justify">
                {section.intro}
              </p>
            )}

            <h2 className="font-serif text-2xl leading-snug">{question.intitule}</h2>

            <div className="mt-5 grid gap-3">
              {question.options.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  data-testid="option-simulateur"
                  onClick={() => repondre(question.id, o.v)}
                  className={`rounded-lg border px-5 py-4 text-left text-base transition-colors hover:border-accent hover:bg-accent/5 ${
                    reponses[question.id] === o.v
                      ? "border-accent bg-accent/5"
                      : "border-border bg-surface"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {!question.obligatoire && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
                onClick={() => setIndex((i) => i + 1)}
              >
                Passer cette question
              </Button>
            )}

            {question.pourquoi && (
              <EncadrePliable titre="Pourquoi cette question ?" className="mt-5">
                <p className="text-justify">{question.pourquoi}</p>
              </EncadrePliable>
            )}
          </div>
        )}

        {!affiche && !question && (
          <form onSubmit={envoyer} className="mt-8 space-y-5">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              type="button"
            >
              <ArrowLeft strokeWidth={1.5} /> Retour
            </Button>
            <h2 className="font-serif text-2xl">Recevoir votre comparatif</h2>
            <p className="text-base leading-relaxed text-justify">
              Indiquez votre adresse électronique pour afficher et recevoir le comparatif, critère
              par critère, des formes juridiques au regard des priorités que vous avez déclarées.
            </p>
            <div className="space-y-2">
              <Label htmlFor="sim-prenom">Prénom</Label>
              <Input
                id="sim-prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-email">Adresse électronique</Label>
              <Input
                id="sim-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <input
              type="text"
              name="societe_web"
              value={societeWeb}
              onChange={(e) => setSocieteWeb(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />
            {TURNSTILE_SITE_KEY && (
              <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
            )}
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
              <Checkbox
                id="sim-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="sim-consent" className="text-sm font-normal leading-relaxed">
                J'accepte le traitement de mon adresse électronique pour recevoir ce comparatif,
                dans les conditions de la{" "}
                <Link to="/confidentialite" className="underline underline-offset-2">
                  politique de confidentialité
                </Link>
                .
              </Label>
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Enregistrement…" : "Afficher mon comparatif"}
            </Button>
          </form>
        )}

        {affiche && (
          <div className="space-y-6">
            <p className="rounded-md border border-success/40 bg-success/8 px-3 py-2 text-sm">
              {emailEnvoye
                ? "Comparatif envoyé à votre adresse électronique."
                : "Votre comparatif s'affiche ci-dessous ; l'envoi par email peut prendre quelques minutes."}
            </p>

            <h1 className="font-serif text-3xl leading-snug">{SIMULATEUR_TITRE}</h1>
            <p className="text-base leading-relaxed text-justify">{SIMULATEUR_SOUS_TITRE}</p>

            <BlocDisclaimer />

            <p className="text-sm text-muted-foreground">{MENTION_LEGITIMITE}</p>

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <caption className="sr-only">
                  Comparaison par critère entre {col.sas} et {col.sarl}
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="p-3 font-medium">
                      Critère
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      {col.sas}
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      {col.sarl}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {restit.lignes.map((l) => (
                    <tr key={l.id} className="border-b border-border align-top last:border-0">
                      <th scope="row" className="p-3 font-medium">
                        {l.libelle}
                      </th>
                      {[l.sas, l.sarl].map((c, i) => (
                        <td key={i} className="p-3 text-justify">
                          <span className="mb-1 block font-medium">
                            <span aria-hidden>{PASTILLES[c.niveau].signe}</span>{" "}
                            {PASTILLES[c.niveau].libelle}
                          </span>
                          {c.texte}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {legendePastilles()
                .map((p) => `${p.signe} ${p.libelle}`)
                .join(" · ")}
            </p>

            <p className="rounded-lg border border-border bg-muted/50 p-4 text-base leading-relaxed text-justify">
              {restit.synthese}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/tarifs">{LIBELLE_BOUTON_RELECTURE}</Link>
              </Button>
              <CallbackDialog size="lg" />
            </div>

            <BlocDisclaimer />

            <p className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed text-justify">
              {NOTE_REMBOURSEMENT}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ redirect: "/creation" }}>
                  Créer ma société maintenant
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">Textes v{SIMULATEUR_TEXTES_VERSION}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
