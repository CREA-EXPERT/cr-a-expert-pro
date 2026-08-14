import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Disclaimer } from "@/components/Disclaimer";
import { CallbackDialog } from "@/components/CallbackDialog";
import { corpsEmail, restitution, NOTE_REMBOURSEMENT, type Restitution } from "@/lib/restitution";
import { enregistrerSimulation } from "@/lib/public-forms.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/simulateur")({
  head: () => ({
    meta: [
      { title: "Test d'orientation — quelle forme juridique ? — CREA EXPERT" },
      {
        name: "description",
        content:
          "Test gratuit et optionnel de 2 minutes : cinq questions pour comparer les formes juridiques adaptées à votre projet. Information générale, sans conseil personnalisé.",
      },
      { property: "og:title", content: "Test d'orientation — CREA EXPERT" },
      {
        property: "og:description",
        content: "Comparez SASU/EURL ou SAS/SARL de façon neutre, à partir de vos réponses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://crea-expert.fr/simulateur" }],
  }),
  component: Simulateur,
});

type Reponses = Record<string, string>;

const TURNSTILE_SITE_KEY = import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined;

const QUESTIONS = [
  {
    id: "seul",
    intitule: "Serez-vous seul(e) ou à plusieurs ?",
    options: [
      { v: "seul", l: "Seul(e)" },
      { v: "plusieurs", l: "À plusieurs" },
    ],
  },
  {
    id: "activite",
    intitule: "Quelle sera votre activité ?",
    options: [
      { v: "services", l: "Prestation de services" },
      { v: "commerce", l: "Commerce" },
      { v: "immobilier", l: "Activité immobilière patrimoniale" },
      { v: "autre", l: "Autre" },
    ],
  },
  {
    id: "remuneration",
    intitule: "Prévoyez-vous de vous verser une rémunération dès le début ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
      { v: "nsp", l: "Je ne sais pas" },
    ],
  },
  {
    id: "priorite",
    intitule: "Quelle est votre priorité ?",
    options: [
      { v: "protection", l: "Protection sociale du dirigeant" },
      { v: "cotisations", l: "Cotisations réduites" },
      { v: "flexibilite", l: "Flexibilité des statuts" },
      { v: "nsp", l: "Je ne sais pas" },
    ],
  },
  {
    id: "investisseurs",
    intitule: "Prévoyez-vous de faire entrer des investisseurs ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
      { v: "peutetre", l: "Peut-être" },
    ],
  },
] as const;

function immobilierSolo(r: Reponses): boolean {
  return r["activite"] === "immobilier" && r["seul"] === "seul";
}

function tendance(r: Reponses, res: Restitution): string {
  if (r["activite"] === "immobilier") {
    return r["seul"] === "seul" ? "immobilier_solo" : "SCI";
  }
  const versSas =
    r["priorite"] === "protection" ||
    r["priorite"] === "flexibilite" ||
    r["investisseurs"] === "oui" ||
    r["investisseurs"] === "peutetre";
  return versSas ? res.a : res.b;
}

function Simulateur() {
  const [etape, setEtape] = useState(0);
  const [reponses, setReponses] = useState<Reponses>({});
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [societeWeb, setSocieteWeb] = useState("");
  const [resultat, setResultat] = useState<string | null>(null);
  const [emailEnvoye, setEmailEnvoye] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = QUESTIONS.length + 1;
  const res = restitution(reponses["seul"] !== "plusieurs");
  const immobilier = reponses["activite"] === "immobilier";
  const solo = immobilierSolo(reponses);

  function repondre(id: string, v: string) {
    setReponses((r) => ({ ...r, [id]: v }));
    setEtape((e) => e + 1);
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      toast.error("Merci d'indiquer une adresse électronique valide.");
      return;
    }
    if (!consent) {
      toast.error("Votre consentement est nécessaire pour recevoir le résultat.");
      return;
    }
    setBusy(true);
    const t = tendance(reponses, res);
    try {
      const reponseServeur = await enregistrerSimulation({
        data: {
          email: parsed.data,
          prenom: prenom.trim() || undefined,
          reponses,
          resultat: t,
          corps_email: corpsEmail(prenom.trim(), res),
          piege: societeWeb || undefined,
        },
      });
      setBusy(false);
      if (!reponseServeur.ok) {
        if (reponseServeur.raison === "trop_de_demandes") {
          toast.error("Trop de demandes envoyées depuis cet appareil. Réessayez dans une heure.");
        } else {
          toast.error("L'enregistrement de la simulation a échoué.");
        }
        return;
      }
      setEmailEnvoye(Boolean(reponseServeur.emailEnvoye));
      setResultat(t);
    } catch {
      setBusy(false);
      toast.error("L'enregistrement de la simulation a échoué.");
    }
  }

  const question = QUESTIONS[etape];

  return (
    <PageShell>
      <div className="container-page max-w-3xl py-10">
        <div className="mb-8">
          <Progress value={((Math.min(etape, total) + (resultat ? 1 : 0)) / total) * 100} />
          <p className="mt-2 text-sm text-muted-foreground">
            {resultat
              ? "Résultat"
              : `Test gratuit de 2 minutes — optionnel · Question ${Math.min(etape + 1, total)} sur ${total}`}
          </p>
        </div>

        {!resultat && question && (
          <div>
            {etape > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2"
                onClick={() => setEtape((e) => e - 1)}
              >
                <ArrowLeft strokeWidth={1.5} /> Retour
              </Button>
            )}
            <h1 className="font-serif text-3xl">{question.intitule}</h1>
            <div className="mt-6 grid gap-3">
              {question.options.map((o) => (
                <button
                  key={o.v}
                  type="button"
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
          </div>
        )}

        {!resultat && !question && (
          <form onSubmit={envoyer} className="space-y-5">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setEtape((e) => e - 1)}
              type="button"
            >
              <ArrowLeft strokeWidth={1.5} /> Retour
            </Button>
            <h1 className="font-serif text-3xl">Recevoir votre restitution</h1>
            <p className="text-base">
              Indiquez votre adresse électronique pour afficher et recevoir la comparaison des
              formes juridiques correspondant à vos réponses.
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
                J'accepte le traitement de mon adresse électronique pour recevoir le résultat de
                cette simulation, dans les conditions de la{" "}
                <Link to="/confidentialite" className="underline underline-offset-2">
                  politique de confidentialité
                </Link>
                .
              </Label>
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Enregistrement…" : "Afficher ma restitution"}
            </Button>
          </form>
        )}

        {resultat && solo && (
          <div className="space-y-6">
            <p className="rounded-md border border-success/40 bg-success/8 px-3 py-2 text-sm">
              {emailEnvoye
                ? "Résultat envoyé à votre adresse email."
                : "Votre résultat s'affiche ci-dessous ; l'envoi par email sera activé prochainement."}
            </p>

            <h1 className="font-serif text-3xl leading-snug">Immobilier en solo</h1>

            <p className="rounded-md border border-border bg-muted/50 p-4 text-base leading-relaxed">
              La société civile immobilière (SCI) n'est pas possible seul(e) : elle exige au moins
              deux associés (article 1832 du code civil).
            </p>

            <p className="text-base leading-relaxed">
              Pour porter un projet immobilier seul(e), trois voies existent, à égalité :
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface p-4">
                <h2 className="font-serif text-lg">Détention en direct</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  Location meublée ou nue en nom propre, le cas échéant sous forme d'entreprise
                  individuelle.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <h2 className="font-serif text-lg">SASU ou EURL à l'IS</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  Pour une activité immobilière à caractère commercial, exercée à l'impôt sur les
                  sociétés.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <h2 className="font-serif text-lg">SCI à plusieurs</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  En s'associant avec un proche, même très minoritaire, pour réunir les deux
                  associés requis.
                </p>
              </div>
            </div>

            <p className="rounded-md border border-accent/40 bg-accent/8 p-3 text-base font-medium">
              Le choix dépend de votre situation ; un expert-comptable peut en discuter avec vous.
            </p>
            <CallbackDialog size="lg" />

            <p className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
              {NOTE_REMBOURSEMENT}
            </p>

            <Disclaimer />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth" search={{ redirect: "/creation" }}>
                  Créer ma société maintenant
                </Link>
              </Button>
            </div>
          </div>
        )}

        {resultat && !solo && (
          <div className="space-y-6">
            <p className="rounded-md border border-success/40 bg-success/8 px-3 py-2 text-sm">
              {emailEnvoye
                ? "Résultat envoyé à votre adresse email."
                : "Votre résultat s'affiche ci-dessous ; l'envoi par email sera activé prochainement."}
            </p>

            {immobilier && (
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                Votre activité étant immobilière et patrimoniale, la société civile immobilière
                (SCI) est la structure la plus couramment utilisée. La comparaison ci-dessous reste
                utile si vous hésitez avec une société commerciale.
              </p>
            )}

            <h1 className="font-serif text-3xl leading-snug">{res.titre}</h1>
            <p className="text-lg leading-relaxed">{res.sousTitre}</p>
            <p className="rounded-md border border-accent/40 bg-accent/8 p-3 text-base font-medium">
              {res.mention}
            </p>

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <caption className="sr-only">
                  Comparaison entre {res.a} et {res.b}
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="p-3 font-medium">
                      Critère
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      {res.a}
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      {res.b}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {res.lignes.map((l) => (
                    <tr key={l.critere} className="border-b border-border align-top last:border-0">
                      <th scope="row" className="p-3 font-medium">
                        {l.critere}
                      </th>
                      <td className="p-3">{l.a}</td>
                      <td className="p-3">{l.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-border bg-surface p-5">
              <h2 className="font-serif text-xl">{res.encadreTitre}</h2>
              <p className="mt-2 text-base leading-relaxed">{res.encadreTexte}</p>
            </div>

            <p className="text-base">
              Au regard de vos réponses, les créateurs dans votre situation s'orientent le plus
              souvent vers la <strong>{resultat}</strong>.
            </p>

            <p className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
              {NOTE_REMBOURSEMENT}
            </p>

            <Disclaimer />

            <div className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
              <strong>À noter pour la suite :</strong> si vous êtes marié(e) sous un régime de
              communauté et que votre apport provient de fonds communs, l'information ou l'accord de
              votre conjoint peut être requis en SARL, EURL et SCI. Cette formalité n'existe pas en
              SAS et en SASU. La question vous sera posée lors de la constitution du dossier.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth" search={{ redirect: "/creation" }}>
                  Créer ma société maintenant
                </Link>
              </Button>
              <CallbackDialog size="lg" />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
