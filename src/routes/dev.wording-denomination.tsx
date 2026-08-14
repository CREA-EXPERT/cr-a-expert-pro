import { createFileRoute } from "@tanstack/react-router";
import { PREAMBULE_INFO_DENOMINATION, blocInfoDenominationHtml } from "@/lib/relances.texte";
import { revuesDenomination } from "@/lib/denomination";

export const Route = createFileRoute("/dev/wording-denomination")({
  head: () => ({
    meta: [
      { title: "Banc d'essai — wording dénomination | CREA EXPERT" },
      {
        name: "description",
        content:
          "Page technique comparant le wording des avertissements de dénomination entre le récapitulatif et les emails.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Banc d'essai — wording dénomination" },
      {
        property: "og:description",
        content: "Comparaison technique des textes d'information sur la dénomination.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BancWording,
});

/** Cas couverts : risque d'activité proche, terme réglementé, les deux. */
const CAS = [
  { cle: "proche", denomination: "ESSAI CONSEIL", risque: "proche" },
  { cle: "terme", denomination: "BANQUE ESSAI", risque: "eloigne" },
  { cle: "cumul", denomination: "CABINET EXPERT-COMPTABLE ESSAI", risque: "proche" },
] as const;

/** Texte brut d'un fragment HTML d'email, pour comparaison stricte avec l'écran. */
function texteHtml(html: string) {
  return html
    .replace(/<\/(p|li|ul)>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function BancWording() {
  return (
    <main data-hydrated="1" className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="font-serif text-2xl">Wording des avertissements de dénomination</h1>
      {CAS.map((c) => {
        const revues = revuesDenomination(c.denomination, c.risque);
        return (
          <section key={c.cle} className="space-y-4" data-testid={`cas-${c.cle}`}>
            <h2 className="font-serif text-xl">{c.denomination}</h2>

            <div
              className="space-y-2 rounded-lg border border-warning/50 bg-warning/10 p-4"
              data-testid={`recap-${c.cle}`}
            >
              <h3 className="font-serif text-lg">Points soumis à la revue d'un professionnel</h3>
              <ul className="space-y-1 text-sm leading-relaxed">
                {revues.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Information générale — ne constitue pas un conseil. Votre dossier sera revu par un
                expert-comptable.
              </p>
            </div>

            <div
              className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed"
              data-testid={`email-${c.cle}`}
            >
              {texteHtml(blocInfoDenominationHtml(revues))}
            </div>

            <p className="text-sm text-muted-foreground" data-testid={`preambule-${c.cle}`}>
              {PREAMBULE_INFO_DENOMINATION}
            </p>
          </section>
        );
      })}
    </main>
  );
}
