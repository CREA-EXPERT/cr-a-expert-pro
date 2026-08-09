// Détection d'un hôte d'aperçu (conception) — partagée client/serveur.
export function estHoteApercu(host: string): boolean {
  const h = (host ?? "").toLowerCase();
  return (
    h === "localhost" ||
    h.startsWith("localhost:") ||
    h === "127.0.0.1" ||
    h.startsWith("127.0.0.1:") ||
    h.includes("id-preview--") ||
    h.endsWith("-dev.lovable.app") ||
    h.includes("-dev.lovable.app:")
  );
}
