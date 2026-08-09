import { EDITEUR } from "@/lib/editeur";

const REASSURANCES = [
  "Professionnels qualifiés",
  "Revue possible par un expert-comptable",
  "Données hébergées dans l'Union européenne",
  "100 % France",
];

/**
 * Bandeau d'autorité affiché au-dessus du hero.
 *
 * Attribution stricte : l'inscription au tableau de l'Ordre concerne le cabinet
 * d'expertise comptable partenaire et ses experts-comptables, jamais la société
 * éditrice du logiciel. Le nom du cabinet et son numéro d'inscription sont lus
 * depuis `EDITEUR` et restent « [À COMPLÉTER] » tant qu'ils ne sont pas fournis.
 */
export function BandeauAutorite() {
  const { nom, inscriptionOrdre } = EDITEUR.cabinetPartenaire;

  return (
    <section
      aria-label="Qui conçoit et administre ce service"
      className="border-b border-border bg-background"
    >
      <div className="container-page py-5">
        <p className="max-w-3xl font-serif text-base leading-relaxed text-foreground sm:text-lg">
          Un outil conçu et administré par des experts-comptables — au sein d'un cabinet d'expertise
          comptable inscrit à l'Ordre des experts-comptables.
        </p>
        <ul className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
          {REASSURANCES.map((r, i) => (
            <li key={r} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-border">
                  ·
                </span>
              )}
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Cabinet d'expertise comptable partenaire : {nom} — inscription au tableau de l'Ordre des
          experts-comptables : {inscriptionOrdre}.
        </p>
      </div>
    </section>
  );
}
