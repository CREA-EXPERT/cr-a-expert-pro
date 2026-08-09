import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LABEL_SIGNATURE, type SignataireRow, type SignatureRow } from "@/lib/signatures";
import { preparerEtEnvoyerSignature, renvoyerLienSignature } from "@/lib/signature.functions";

/**
 * Suivi cabinet de la signature électronique simple : envoi des liens
 * nominatifs, état par signataire et preuves recueillies.
 */
export function PanneauSignatures({ dossierId }: { dossierId: string }) {
  const qc = useQueryClient();
  const preparer = useServerFn(preparerEtEnvoyerSignature);
  const renvoyer = useServerFn(renvoyerLienSignature);

  const { data } = useQuery({
    queryKey: ["signatures-cabinet", dossierId],
    queryFn: async () => {
      const { data: sigs } = await supabase
        .from("signatures_electroniques")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("ordre");
      const ids = (sigs ?? []).map((s) => s.id);
      const { data: signataires } = ids.length
        ? await supabase.from("signatures_signataires").select("*").in("signature_id", ids)
        : { data: [] };
      return {
        sigs: (sigs ?? []) as SignatureRow[],
        signataires: (signataires ?? []) as SignataireRow[],
      };
    },
  });

  const rafraichir = () => qc.invalidateQueries({ queryKey: ["signatures-cabinet", dossierId] });

  const envoyer = async (signatureId: string) => {
    try {
      const r = await preparer({ data: { signatureId } });
      if (r.blocage) toast.error(r.blocage);
      else if (r.envoyes === 0)
        toast.message("Document préparé. Aucun email n'a pu être envoyé (adresse manquante).");
      else toast.success(`Lien de signature envoyé à ${r.envoyes} signataire(s).`);
      rafraichir();
    } catch {
      toast.error("L'envoi n'a pas abouti.");
    }
  };

  const relancer = async (signataireId: string) => {
    try {
      const r = await renvoyer({ data: { signataireId } });
      toast[r.envoye ? "success" : "error"](
        r.envoye ? "Nouveau lien envoyé." : "Le lien n'a pas pu être renvoyé.",
      );
      rafraichir();
    } catch {
      toast.error("Le lien n'a pas pu être renvoyé.");
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-serif text-xl">Signature électronique</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Chaque signataire requis reçoit un lien nominatif, valable 72 heures. L'ordre de signature
        est libre ; le document est finalisé lorsque tous ont signé.
      </p>

      <ul className="mt-4 space-y-3">
        {(data?.sigs ?? []).map((s) => {
          const lignes = (data?.signataires ?? []).filter((x) => x.signature_id === s.id);
          return (
            <li key={s.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{s.libelle}</p>
                  <p className="text-xs text-muted-foreground">
                    {lignes.filter((l) => l.horodatage).length} / {lignes.length || "?"} signature(s)
                    recueillie(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.statut === "signe" ? "default" : "secondary"}>
                    {LABEL_SIGNATURE(s.statut)}
                  </Badge>
                  {s.statut !== "signe" && (
                    <Button size="sm" variant="outline" onClick={() => envoyer(s.id)}>
                      {lignes.length === 0 ? "Préparer et envoyer" : "Renvoyer à tous"}
                    </Button>
                  )}
                </div>
              </div>

              {lignes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {lignes.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3"
                    >
                      <div>
                        <p className="text-sm">{l.signataire_nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.horodatage
                            ? `Signé le ${new Date(l.horodatage).toLocaleString("fr-FR")} — ${
                                l.methode === "trace" ? "tracé manuscrit" : "saisie du nom"
                              }`
                            : l.signataire_email
                              ? "En attente de signature"
                              : "Adresse email manquante"}
                        </p>
                        {l.hash_document && (
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            Empreinte SHA-256 : {l.hash_document}
                          </p>
                        )}
                      </div>
                      {!l.horodatage && l.signataire_email && (
                        <Button size="sm" variant="ghost" onClick={() => relancer(l.id)}>
                          Renvoyer le lien
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {(data?.sigs ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">Aucun document à signer pour ce dossier.</li>
        )}
      </ul>
    </section>
  );
}
