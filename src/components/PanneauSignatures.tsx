import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LABEL_SIGNATURE,
  texteCause,
  type SignataireRow,
  type SignatureRow,
} from "@/lib/signatures";
import {
  preparerEtEnvoyerSignature,
  relancerSignaturesEnEchec,
  renvoyerLienSignature,
} from "@/lib/signature.functions";

/** Plafond de tentatives d'envoi par signataire (aligné sur le moteur serveur). */
const MAX_TENTATIVES = 3;

type JournalRow = {
  id: string;
  signature_id: string;
  signataire_id: string | null;
  destinataire_masque: string;
  tentative: number;
  declencheur: string;
  resultat: string;
  cause: string | null;
  created_at: string;
};

const LIBELLE_DECLENCHEUR: Record<string, string> = {
  manuel: "envoi manuel",
  relance_manuelle: "relance manuelle",
  relance_auto: "relance automatique",
};

/**
 * Suivi cabinet de la signature électronique simple : envoi des liens
 * nominatifs, état par signataire, tentatives d'envoi et journal d'audit.
 */
export function PanneauSignatures({ dossierId }: { dossierId: string }) {
  const qc = useQueryClient();
  const preparer = useServerFn(preparerEtEnvoyerSignature);
  const renvoyer = useServerFn(renvoyerLienSignature);
  const relancerTout = useServerFn(relancerSignaturesEnEchec);

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
      const { data: journal } = await supabase
        .from("journal_emails_signature")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false })
        .limit(50);
      return {
        sigs: (sigs ?? []) as SignatureRow[],
        signataires: (signataires ?? []) as SignataireRow[],
        journal: (journal ?? []) as JournalRow[],
      };
    },
  });

  const rafraichir = () => qc.invalidateQueries({ queryKey: ["signatures-cabinet", dossierId] });

  const envoyer = async (signatureId: string) => {
    try {
      const r = await preparer({ data: { signatureId } });
      const echecs = r.echecs ?? 0;
      const cause = "cause" in r ? r.cause : null;
      if (r.blocage) toast.error(r.blocage);
      else if (r.envoyes === 0 && echecs > 0) toast.error(texteCause(cause));
      else if (r.envoyes === 0)
        toast.message("Document préparé. Aucun email n'a pu être envoyé (adresse manquante).");
      else if (echecs > 0)
        toast.warning(`${r.envoyes} envoi(s) réussi(s), ${echecs} en échec. ${texteCause(cause)}`);
      else toast.success(`Lien de signature envoyé à ${r.envoyes} signataire(s).`);

      rafraichir();
    } catch {
      toast.error("L'envoi n'a pas abouti. Vous pouvez réessayer.");
    }
  };

  const relancer = async (signataireId: string) => {
    try {
      const r = await renvoyer({ data: { signataireId } });
      if (r.envoye) toast.success("Nouveau lien envoyé.");
      else toast.error(texteCause(r.cause));
      rafraichir();
    } catch {
      toast.error("Le lien n'a pas pu être renvoyé. Vous pouvez réessayer.");
    }
  };

  const relancerEchecs = async (signatureId: string) => {
    try {
      const r = await relancerTout({ data: { signatureId } });
      if (r.traites === 0) toast.message("Aucune relance nécessaire pour ce document.");
      else toast[r.envoyes > 0 ? "success" : "error"](
        `${r.envoyes} relance(s) envoyée(s), ${r.echoues} encore en échec.`,
      );
      rafraichir();
    } catch {
      toast.error("La relance n'a pas abouti. Vous pouvez réessayer.");
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-serif text-xl">Signature électronique</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Chaque signataire requis reçoit un lien nominatif, valable 72 heures. L'ordre de signature
        est libre ; le document est finalisé lorsque tous ont signé. En cas d'échec d'envoi, une
        relance est possible dans la limite de {MAX_TENTATIVES} tentatives par signataire.
      </p>

      <ul className="mt-4 space-y-3">
        {(data?.sigs ?? []).map((s) => {
          const lignes = (data?.signataires ?? []).filter((x) => x.signature_id === s.id);
          const enEchec = lignes.filter(
            (l) =>
              !l.horodatage &&
              l.dernier_resultat === "echec" &&
              (l.tentatives_envoi ?? 0) < MAX_TENTATIVES,
          );
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
                  {enEchec.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => relancerEchecs(s.id)}>
                      Relancer les envois en échec ({enEchec.length})
                    </Button>
                  )}
                  {s.statut !== "signe" && (
                    <Button size="sm" variant="outline" onClick={() => envoyer(s.id)}>
                      {lignes.length === 0 ? "Préparer et envoyer" : "Renvoyer à tous"}
                    </Button>
                  )}
                </div>
              </div>

              {lignes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {lignes.map((l) => {
                    const tentatives = l.tentatives_envoi ?? 0;
                    const plafond = tentatives >= MAX_TENTATIVES;
                    return (
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
                          {!l.horodatage && (
                            <p className="text-xs text-muted-foreground">
                              {tentatives} tentative(s) d'envoi sur {MAX_TENTATIVES}
                              {l.dernier_essai_le
                                ? ` — dernière le ${new Date(l.dernier_essai_le).toLocaleString("fr-FR")}`
                                : ""}
                            </p>
                          )}
                          {!l.horodatage && l.dernier_resultat === "echec" && (
                            <p className="text-xs text-destructive">
                              {texteCause(l.derniere_cause)}
                              {plafond
                                ? " Plafond de tentatives atteint : contactez le signataire par un autre moyen ou corrigez son adresse."
                                : ""}
                            </p>
                          )}
                          {l.hash_document && (
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              Empreinte SHA-256 : {l.hash_document}
                            </p>
                          )}
                        </div>
                        {!l.horodatage && l.signataire_email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={plafond}
                            onClick={() => relancer(l.id)}
                          >
                            {plafond ? "Relances épuisées" : "Renvoyer le lien"}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {(data?.sigs ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">Aucun document à signer pour ce dossier.</li>
        )}
      </ul>

      {(data?.journal ?? []).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Journal des envois</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Trace d'audit des tentatives d'envoi. Les adresses email n'y figurent que sous forme
            masquée, conformément au principe de minimisation des données.
          </p>
          <ul className="mt-3 space-y-1">
            {(data?.journal ?? []).map((j) => (
              <li key={j.id} className="text-xs text-muted-foreground">
                {new Date(j.created_at).toLocaleString("fr-FR")} — {j.destinataire_masque} —
                tentative {j.tentative} ({LIBELLE_DECLENCHEUR[j.declencheur] ?? j.declencheur}) —{" "}
                <span className={j.resultat === "succes" ? "text-foreground" : "text-destructive"}>
                  {j.resultat === "succes" ? "envoyé" : `échec — ${texteCause(j.cause)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
