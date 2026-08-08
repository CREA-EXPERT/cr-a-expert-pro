import { FORMES, euro, type Forme } from "@/lib/domain";
import { coutParForme, missionMensuelleHt, useTarifs } from "@/lib/tarifs";

export function TableauFraisLegaux({ formeMiseEnAvant }: { formeMiseEnAvant?: Forme }) {
  const { data: tarifs, isLoading } = useTarifs();
  const mission = missionMensuelleHt(tarifs);
  const couts = FORMES.map((f) => coutParForme(tarifs, f.value));
  const reference = formeMiseEnAvant
    ? couts.find((c) => c.forme === formeMiseEnAvant)
    : couts.reduce((a, b) => (a.totalTtc < b.totalTtc ? a : b));

  return (
    <section aria-labelledby="cout-titre" className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7">
      <h2 id="cout-titre" className="font-serif text-2xl">
        Combien ça coûte vraiment
      </h2>
      <p className="mt-2 max-w-2xl text-base text-foreground">
        Les frais ci-dessous sont des frais légaux incompressibles, dus quelle que soit la solution
        choisie. Nous les refacturons à l'euro près.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-base">
          <caption className="sr-only">
            Frais légaux par forme juridique, en euros toutes taxes comprises
          </caption>
          <thead>
            <tr className="border-b border-border text-sm">
              <th scope="col" className="py-3 pr-4 font-medium">
                Forme juridique
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Annonce légale TTC
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Greffe + bénéficiaires effectifs TTC
              </th>
              <th scope="col" className="py-3 font-medium">
                Total frais légaux TTC
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  Chargement de la grille tarifaire…
                </td>
              </tr>
            )}
            {!isLoading &&
              couts.map((c) => (
                <tr
                  key={c.forme}
                  className={`border-b border-border ${c.forme === formeMiseEnAvant ? "bg-muted/60" : ""}`}
                >
                  <th scope="row" className="py-3 pr-4 font-medium">
                    {c.forme}
                  </th>
                  <td className="py-3 pr-4 tabular-nums">{euro(c.annonceTtc)}</td>
                  <td className="py-3 pr-4 tabular-nums">{euro(c.greffeEtBenef)}</td>
                  <td className="py-3 font-semibold tabular-nums">{euro(c.totalTtc)}</td>
                </tr>
              ))}
            <tr>
              <th scope="row" className="py-3 pr-4 font-medium">
                Honoraires de création
              </th>
              <td colSpan={3} className="py-3 font-semibold">
                0 €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-md border border-accent/40 bg-accent/8 p-4">
        <p className="legal-note">
          <strong>Mission comptable : {euro(mission)} HT/mois, engagement 3 mois, sans reconduction
          forcée.</strong>{" "}
          Soit un coût total de démarrage de {euro(reference?.totalTtc ?? 0)} de frais légaux
          {formeMiseEnAvant ? ` en ${formeMiseEnAvant}` : " (forme la moins coûteuse)"} + {euro(mission * 3)} HT
          de comptabilité sur 3 mois.
        </p>
      </div>
    </section>
  );
}
