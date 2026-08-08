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
        content: "Faites le test d'orientation, ou choisissez directement votre forme juridique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Commencer,
});

function Commencer() {
  return (
    <PageShell>
      <div className="container-page max-w-4xl py-12">
        <h1 className="font-serif text-4xl leading-tight">
          Quelle forme juridique est la plus pertinente pour vous ?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground">
          Deux chemins, à vous de choisir. Aucun n'est obligatoire pour créer votre société.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="flex flex-col rounded-lg border border-border bg-surface p-6">
            <Compass className="size-6 text-accent" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-4 font-serif text-2xl">Aidez-moi à choisir</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Test gratuit de 2 minutes — optionnel. Cinq questions, puis une restitution
              comparative et neutre entre les formes qui correspondent à votre situation.
            </p>
            <div className="mt-5">
              <Button asChild size="lg">
                <Link to="/simulateur">Faire le test</Link>
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
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </div>
    </PageShell>
  );
}
