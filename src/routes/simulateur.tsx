import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Disclaimer } from "@/components/Disclaimer";
import { CallbackDialog } from "@/components/CallbackDialog";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/simulateur")({
  head: () => ({
    meta: [
      { title: "Simulateur de forme juridique — CREA EXPERT" },
      {
        name: "description",
        content:
          "Cinq questions pour comparer les formes juridiques adaptées à votre projet : SASU, EURL, SAS, SARL ou SCI. Information générale, sans conseil personnalisé.",
      },
      { property: "og:title", content: "Simulateur de forme juridique — CREA EXPERT" },
      {
        property: "og:description",
        content: "Comparez SASU/EURL ou SAS/SARL de façon neutre, à partir de vos réponses.",
      },
    ],
  }),
  component: Simulateur,
});

type Reponses = Record<string, string>;

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

type Axe = { a: string; b: string };

function axeDe(r: Reponses): Axe {
  if (r["activite"] === "immobilier") return { a: "SCI", b: r["seul"] === "seul" ? "EURL" : "SARL" };
  return r["seul"] === "seul" ? { a: "SASU", b: "EURL" } : { a: "SAS", b: "SARL" };
}

function tendance(r: Reponses, axe: Axe): string {
  if (r["activite"] === "immobilier") return "SCI";
  const versSas =
    r["priorite"] === "protection" ||
    r["priorite"] === "flexibilite" ||
    r["investisseurs"] === "oui" ||
    r["investisseurs"] === "peutetre";
  return versSas ? axe.a : axe.b;
}

const COMPARAISON: Record<string, { social: string; dividendes: string; formalisme: string; flexibilite: string }> = {
  SASU: {
    social: "Le président est assimilé salarié : régime général de la sécurité sociale, sans cotisation en l'absence de rémunération.",
    dividendes: "Les dividendes ne supportent pas de cotisations sociales.",
    formalisme: "Formalisme de fonctionnement allégé, fixé par les statuts.",
    flexibilite: "Grande liberté statutaire ; les règles doivent être rédigées avec soin.",
  },
  SAS: {
    social: "Le président est assimilé salarié : régime général de la sécurité sociale.",
    dividendes: "Les dividendes ne supportent pas de cotisations sociales.",
    formalisme: "Formalisme allégé, largement défini par les statuts.",
    flexibilite: "Grande liberté statutaire, adaptée à l'entrée d'investisseurs.",
  },
  EURL: {
    social: "Le gérant associé unique relève du régime des travailleurs non salariés, avec une cotisation minimale.",
    dividendes: "La fraction de dividendes excédant 10 % du capital et des sommes en compte courant est soumise à cotisations sociales.",
    formalisme: "Fonctionnement encadré par la loi.",
    flexibilite: "Cadre légal plus rigide, mais plus prévisible.",
  },
  SARL: {
    social: "Le gérant majoritaire relève des travailleurs non salariés ; le gérant minoritaire ou égalitaire est assimilé salarié.",
    dividendes: "Pour le gérant majoritaire, la fraction excédant 10 % du capital et des comptes courants est soumise à cotisations sociales.",
    formalisme: "Fonctionnement encadré par la loi.",
    flexibilite: "Cadre légal plus rigide, moins adapté à l'entrée d'investisseurs.",
  },
  SCI: {
    social: "Le gérant non rémunéré ne relève d'aucun régime au titre de ce mandat ; s'il est rémunéré, il relève des travailleurs non salariés.",
    dividendes: "Les résultats sont, par défaut, imposés entre les mains des associés à l'impôt sur le revenu.",
    formalisme: "Société civile : fonctionnement encadré, comptabilité allégée selon l'option fiscale.",
    flexibilite: "Statuts adaptables à une détention familiale ou patrimoniale.",
  },
};

function Simulateur() {
  const [etape, setEtape] = useState(0);
  const [reponses, setReponses] = useState<Reponses>({});
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [resultat, setResultat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = QUESTIONS.length + 1;
  const axe = axeDe(reponses);

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
    const t = tendance(reponses, axe);
    const { error } = await supabase.from("simulations").insert({
      email: parsed.data,
      reponses,
      resultat: t,
    });
    setBusy(false);
    if (error) {
      toast.error("L'enregistrement de la simulation a échoué.");
      return;
    }
    setResultat(t);
  }

  const question = QUESTIONS[etape];

  return (
    <PageShell>
      <div className="container-page max-w-2xl py-10">
        <div className="mb-8">
          <Progress value={((Math.min(etape, total) + (resultat ? 1 : 0)) / total) * 100} />
          <p className="mt-2 text-sm text-muted-foreground">
            {resultat ? "Résultat" : `Question ${Math.min(etape + 1, total)} sur ${total}`}
          </p>
        </div>

        {!resultat && question && (
          <div>
            {etape > 0 && (
              <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setEtape((e) => e - 1)}>
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
                    reponses[question.id] === o.v ? "border-accent bg-accent/5" : "border-border bg-surface"
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
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setEtape((e) => e - 1)} type="button">
              <ArrowLeft strokeWidth={1.5} /> Retour
            </Button>
            <h1 className="font-serif text-3xl">Recevoir votre restitution</h1>
            <p className="text-base">
              Indiquez votre adresse électronique pour afficher et recevoir la comparaison des formes
              juridiques correspondant à vos réponses.
            </p>
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
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
              <Checkbox id="sim-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
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

        {resultat && (
          <div className="space-y-6">
            <h1 className="font-serif text-3xl">Votre restitution</h1>
            <p className="rounded-md border border-success/40 bg-success/8 px-3 py-2 text-sm">
              Résultat envoyé à votre adresse email.
            </p>

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Comparaison des deux formes juridiques</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="p-3 font-medium">Critère</th>
                    <th scope="col" className="p-3 font-medium">{axe.a}</th>
                    <th scope="col" className="p-3 font-medium">{axe.b}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Régime social du dirigeant", "social"],
                    ["Dividendes", "dividendes"],
                    ["Formalisme", "formalisme"],
                    ["Flexibilité statutaire", "flexibilite"],
                  ].map(([libelle, cle]) => (
                    <tr key={cle} className="border-b border-border align-top">
                      <th scope="row" className="p-3 font-medium">{libelle}</th>
                      <td className="p-3">{COMPARAISON[axe.a]?.[cle as "social"]}</td>
                      <td className="p-3">{COMPARAISON[axe.b]?.[cle as "social"]}</td>
                    </tr>
                  ))}
                  <tr className="align-top">
                    <th scope="row" className="p-3 font-medium">Points communs</th>
                    <td className="p-3" colSpan={2}>
                      Responsabilité limitée aux apports, capital libre, possibilité de créer avec un
                      capital de 1 €, dépôt du capital préalable et immatriculation au registre
                      compétent.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-base">
              Au regard de vos réponses, les créateurs dans votre situation s'orientent le plus
              souvent vers la <strong>{resultat}</strong>.
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
