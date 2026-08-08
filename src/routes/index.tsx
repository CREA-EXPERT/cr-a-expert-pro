import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { TableauFraisLegaux } from "@/components/TableauFraisLegaux";
import { CallbackDialog } from "@/components/CallbackDialog";
import { MapPin, ShieldCheck, Server } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CREA EXPERT — Créez votre société en ligne, honoraires offerts" },
      {
        name: "description",
        content:
          "Créez votre SASU, SAS, EURL, SARL ou SCI en ligne. Honoraires de création offerts, frais légaux refacturés à l'euro près, mission comptable de 3 mois à 199 € HT/mois.",
      },
      { property: "og:title", content: "CREA EXPERT — Créez votre société en ligne" },
      {
        property: "og:description",
        content:
          "Honoraires de création offerts. Seuls les frais de greffe et d'annonce légale restent à votre charge. Un expert-comptable valide chaque dossier.",
      },
    ],
  }),
  component: Accueil,
});

const ETAPES = [
  { n: 1, t: "Simulez votre forme juridique", d: "Cinq questions, une restitution comparative et neutre." },
  { n: 2, t: "Complétez votre dossier en ligne", d: "Un formulaire guidé, sauvegardé à chaque étape." },
  { n: 3, t: "Déposez vos pièces", d: "Une checklist personnalisée, avec une aide pour chaque document." },
  { n: 4, t: "Un expert-comptable valide tout", d: "Chaque pièce est contrôlée avant le dépôt." },
  { n: 5, t: "Votre société est immatriculée", d: "Vous suivez l'avancement depuis votre espace." },
];

const FAQ = [
  {
    q: "Pourquoi est-ce offert ?",
    r: "Parce que notre modèle économique ne repose pas sur les honoraires de création, mais sur la mission comptable. Vous ne payez pas d'honoraires pour la constitution ; en contrepartie, vous vous engagez sur une mission comptable de 3 mois à 199 € HT/mois auprès du cabinet d'expertise comptable partenaire. Les frais légaux (annonce légale, greffe, bénéficiaires effectifs) restent à votre charge et vous sont refacturés à l'euro près.",
  },
  {
    q: "Que se passe-t-il après les 3 mois ?",
    r: "Vous êtes libre. L'engagement porte sur 3 mois ; à leur terme, vous décidez de poursuivre la mission comptable ou d'y mettre fin, sans reconduction forcée et sans pénalité.",
  },
  {
    q: "Qui rédige mes statuts ?",
    r: "Les statuts sont générés à partir des réponses que vous saisissez dans le parcours, selon un gabarit correspondant à la forme juridique choisie. Ils portent la mention « PROJET » tant qu'ils n'ont pas été revus et validés par le cabinet d'expertise comptable. Aucune clause n'est ajoutée sans validation d'un professionnel.",
  },
  {
    q: "Puis-je créer seul(e) ou à plusieurs ?",
    r: "Les deux. Seul, vous pouvez créer une SASU ou une EURL. À plusieurs, une SAS ou une SARL. Pour une activité immobilière patrimoniale, la SCI se crée à partir de deux associés.",
  },
  {
    q: "Combien de temps prend une création ?",
    r: "Le délai dépend principalement de la rapidité de dépôt de vos pièces, du dépôt du capital en banque et du délai de traitement du greffe compétent. Le parcours en ligne se complète généralement en moins d'une heure.",
  },
  {
    q: "Les frais légaux sont-ils les mêmes partout ?",
    r: "Les frais de greffe et de déclaration des bénéficiaires effectifs sont fixés par voie réglementaire : ils sont identiques quel que soit le prestataire. Le tarif de l'annonce légale est forfaitaire par forme juridique pour la France métropolitaine. Ces montants sont révisés, généralement au 1er janvier ; notre grille est mise à jour en conséquence.",
  },
  {
    q: "Mon activité est-elle éligible ?",
    r: "Le parcours en ligne couvre les activités non réglementées avec des apports en numéraire. Si votre activité est réglementée, si vous réalisez un apport en nature ou si votre situation présente une particularité, le dossier est orienté vers le cabinet pour un accompagnement dédié.",
  },
  {
    q: "Où sont hébergées mes données ?",
    r: "Vos données et vos pièces justificatives sont hébergées dans l'Union européenne. Elles sont accessibles à vous-même et au cabinet d'expertise comptable en charge de votre dossier.",
  },
];

function Accueil() {
  return (
    <PageShell>
      {/* HERO */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:py-20">
          <div>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
              Créez votre société en ligne.
              <br />
              Honoraires offerts.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground">
              Seuls les frais de greffe et d'annonce légale — incompressibles et dus quelle que soit
              la solution choisie — restent à votre charge, refacturés à l'euro près. En
              contrepartie : une mission comptable de 3 mois à 199 € HT/mois auprès de notre cabinet
              d'expertise comptable partenaire.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/simulateur">Commencer</Link>
              </Button>
              <CallbackDialog size="lg" />
            </div>
          </div>

          <TableauFraisLegaux />
        </div>
      </section>

      {/* REASSURANCE */}
      <section className="container-page py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: MapPin,
              t: "100 % réalisé en France",
              d: "Le traitement de votre dossier, la revue des pièces et l'accompagnement sont assurés en France.",
            },
            {
              icon: ShieldCheck,
              t: "Validé par un expert-comptable",
              d: "Votre dossier est revu et validé par un expert-comptable inscrit à l'Ordre avant tout dépôt.",
            },
            {
              icon: Server,
              t: "Données hébergées en Union européenne",
              d: "Vos informations et vos pièces justificatives ne quittent pas l'Union européenne.",
            },
          ].map((b) => (
            <div key={b.t} className="rounded-lg border border-border bg-surface p-6">
              <b.icon className="size-6 text-accent" strokeWidth={1.5} aria-hidden />
              <h2 className="mt-4 text-base font-semibold">{b.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="border-y border-border bg-surface py-14">
        <div className="container-page">
          <h2 className="font-serif text-3xl">Comment ça marche</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-5">
            {ETAPES.map((e) => (
              <li key={e.n} className="border-t-2 border-accent/50 pt-4">
                <span className="text-sm font-semibold text-accent">{String(e.n).padStart(2, "0")}</span>
                <h3 className="mt-1 text-base font-semibold">{e.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{e.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-14">
        <h2 className="font-serif text-3xl">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="mt-6 max-w-3xl">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-foreground">
                {f.r}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/simulateur">Commencer ma simulation</Link>
          </Button>
          <CallbackDialog size="lg" />
        </div>
      </section>
    </PageShell>
  );
}
