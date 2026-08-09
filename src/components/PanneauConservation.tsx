import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lancerPurge, lireJournalPurge } from "@/lib/purge.functions";
import { CONSERVATION } from "@/lib/conservation";

const LIBELLES: Record<string, string> = {
  archivage_kyc: "Archivage KYC (cabinet engagé)",
  retrait_copie_operationnelle: "Retrait des copies opérationnelles archivées",
  piece_identite_sans_kyc: "Pièces d'identité — dossiers sans cabinet",
  archive_kyc_echue: "Archives KYC échues (5 ans)",
  demandes_contact: "Demandes de contact non converties",
  comptes_inactifs: "Comptes inactifs anonymisés",
  resume_execution: "Résumé de l'exécution",
};

export function PanneauConservation() {
  const lancer = useServerFn(lancerPurge);
  const lire = useServerFn(lireJournalPurge);
  const [busy, setBusy] = useState<"test" | "reel" | null>(null);

  const journal = useQuery({
    queryKey: ["journal-purge"],
    queryFn: () => lire(),
  });

  async function executer(dryRun: boolean) {
    setBusy(dryRun ? "test" : "reel");
    try {
      const r = await lancer({ data: { dryRun } });
      toast.success(
        dryRun
          ? `Simulation terminée : ${r.total} élément(s) seraient traités.`
          : `Purge terminée : ${r.total} élément(s) traités.`,
      );
      await journal.refetch();
    } catch {
      toast.error("L'exécution n'a pas abouti. Consultez le journal des purges.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
          <h2 className="font-serif text-xl">Durées de conservation appliquées</h2>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>
            Archive KYC (dossier pris en charge par le cabinet) : {CONSERVATION.KYC_ANNEES} ans après
            la fin de la relation d'affaires, puis purge.
          </li>
          <li>
            Pièce d'identité, dossier terminal sans cabinet engagé :{" "}
            {CONSERVATION.PIECE_ID_SANS_KYC_JOURS} jours.
          </li>
          <li>
            Dossier abandonné sans cabinet engagé : {CONSERVATION.DOSSIER_ABANDONNE_JOURS} jours.
          </li>
          <li>Demandes de contact non converties : {CONSERVATION.DEMANDE_CONTACT_JOURS} jours.</li>
          <li>
            Comptes sans connexion : anonymisation après {CONSERVATION.COMPTE_INACTIF_JOURS} jours.
          </li>
          <li>Facturation : conservée 10 ans, jamais supprimée. Statuts et preuves de signature : conservés.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Les pièces d'un dossier suivi par le cabinet et encore actif ne sont jamais purgées : elles
          servent la vigilance en cours.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => executer(true)} disabled={busy !== null}>
            {busy === "test" ? <Loader2 className="animate-spin" strokeWidth={1.5} /> : <Play strokeWidth={1.5} />}
            Simuler (mode test)
          </Button>
          <Button onClick={() => executer(false)} disabled={busy !== null}>
            {busy === "reel" ? <Loader2 className="animate-spin" strokeWidth={1.5} /> : <Play strokeWidth={1.5} />}
            Exécuter la purge
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type de donnée</th>
              <th className="p-3 font-medium">Éléments</th>
              <th className="p-3 font-medium">Mode</th>
            </tr>
          </thead>
          <tbody>
            {(journal.data ?? []).map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {new Date(l.date_execution).toLocaleString("fr-FR")}
                </td>
                <td className="p-3">{LIBELLES[l.type_donnee] ?? l.type_donnee}</td>
                <td className="p-3">{l.nombre_elements_supprimes}</td>
                <td className="p-3">{l.dry_run ? "Test" : "Réel"}</td>
              </tr>
            ))}
            {(journal.data ?? []).length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  Aucune exécution journalisée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Le journal ne contient aucune donnée personnelle : uniquement des compteurs et des
        informations techniques.
      </p>
    </div>
  );
}
