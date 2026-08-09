// Détection d'un hôte d'aperçu (conception) — partagée client/serveur.
export function estHoteApercu(host: string): boolean {
  const h = (host ?? "").toLowerCase();
  const sansPort = h.split(":")[0] ?? h;
  return (
    sansPort === "localhost" ||
    sansPort === "127.0.0.1" ||
    sansPort.includes("preview--") || // couvre aussi « id-preview-- »
    sansPort.endsWith("-dev.lovable.app")
  );
}

