export function BandeauAutorite() {
  return (
    <section
      aria-label="Qui conçoit et administre ce service"
      className="border-b border-border bg-surface"
    >
      <div className="container-page flex items-center justify-center gap-3 py-3.5">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        <p className="text-center text-sm font-medium leading-snug tracking-tight text-foreground sm:text-base">
          Un outil conçu et administré par des experts-comptables
        </p>
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
      </div>
    </section>
  );
}
