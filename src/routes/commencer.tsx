import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { FORMES } from "@/lib/domain";
import { Disclaimer } from "@/components/Disclaimer";
import { Compass, ListChecks } from "lucide-react";

export const Route = createFileRoute("/commencer")({
  head: () => ({
    meta: [
      { title: "Quelle forme juridique est la plus pertinente pour vous ? — CREA EXPERT" },
      {
        name: "description",
        content:
          "Deux chemins pour démarrer : un test gratuit de 2 minutes pour vous aider à choisir, ou la sélection directe de la forme que vous voulez créer.",
      },
      {
        property: "og:title",
        content: "Quelle forme juridique est la plus pertinente pour vous ? — CREA EXPERT",
      },
      {
        property: "og:description",
        content: "Comparez les formes juridiques critère par critère, ou choisissez directement la forme que vous souhaitez créer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://crea-expert.fr/commencer" }],
  }),
  component: Commencer,
});

function Commencer() {
  return (
    <PageShell>
      <div className="container-page max-w-4xl py-12">
        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-balance">
          Quelle forme juridique est la plus pertinente pour vous&nbsp;?
        </h1>

        <p className="mt-4 text-base leading-relaxed text-foreground text-justify">
          Deux chemins, à vous de choisir.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="flex flex-col rounded-lg border border-border bg-surface p-6">
            <Compass className="size-6 text-accent" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-4 font-serif text-2xl">Comparer les formes juridiques</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-justify">
              Un comparateur pédagogique, critère par critère, pour comprendre les différences entre
              les formes juridiques au regard de vos priorités.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-justify">
              Il ne s'agit pas d'un conseil, mais de grands principes qui doivent faire l'objet
              d'une étude au cas par cas avec l'aide d'un professionnel compétent. Ceci est une
              information générale, pas un conseil personnalisé.
            </p>
            <div className="mt-5">
              <Button asChild size="lg">
                <Link to="/simulateur">Comparer les formes juridiques</Link>
              </Button>
            </div>
          </section>

          <section className="flex flex-col rounded-lg border border-border bg-surface p-6">
            <ListChecks className="size-6 text-accent" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-4 font-serif text-2xl">Je sais déjà ce que je veux créer</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sélectionnez votre forme : vous accédez directement au formulaire de création, forme
              préremplie.
            </p>
            <ul className="mt-5 grid gap-2">
              {FORMES.map((f) => (
                <li key={f.value}>
                  <Link
                    to="/auth"
                    search={{ redirect: "/creation", forme: f.value }}
                    className="block rounded-md border border-border bg-background px-4 py-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{f.desc}</span>
                    {f.value === "SCI" && (
                      <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                        Au moins deux associés.
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-serif text-2xl">Vous préférez en parler ?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-justify">
            Réservez un entretien avec un expert-comptable du cabinet partenaire : il examine votre
            situation et répond à vos questions. C'est le seul cadre dans lequel un avis
            personnalisé peut vous être donné.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link to="/rendez-vous">Faire appel à un expert-comptable</Link>
          </Button>
        </div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </div>
    </PageShell>
  );
}
