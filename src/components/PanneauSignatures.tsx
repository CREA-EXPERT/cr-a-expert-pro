import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LABEL_SIGNATURE,
  texteCause,
  type SignataireRow,
  type SignatureRow,
} from "@/lib/signatures";
import {
  corrigerAdresseSignataire,
  preparerEtEnvoyerSignature,
  relancerSignaturesEnEchec,
  renvoyerLienSignature,
} from "@/lib/signature.functions";

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

const dateFr = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("fr-FR") : "—";

/** État de progression d'un signataire, dans le vocabulaire du cabinet. */
type Etat = "prepare" | "envoye" | "relance" | "echec" | "epuise" | "succes";

const LIBELLE_ETAT: Record<Etat, string> = {
  prepare: "Préparé",
  envoye: "Envoyé",
  relance: "Relancé",
  echec: "En échec",
  epuise: "Relances épuisées",
  succes: "Signé",
};

function etatSignataire(l: SignataireRow, max: number, relances: number): Etat {
  if (l.horodatage) return "succes";
  const tentatives = l.tentatives_envoi ?? 0;
  if (l.dernier_resultat === "echec") return tentatives >= max ? "epuise" : "echec";
  if (tentatives === 0) return "prepare";
  return relances > 0 ? "relance" : "envoye";
}

function telecharger(nom: string, donnees: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([donnees], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Suivi cabinet de la signature électronique simple : progression par
 * signataire et par dossier, relances, alertes de plafond et journal d'audit
 * exportable.
 */
export function PanneauSignatures({ dossierId }: { dossierId: string }) {
  const qc = useQueryClient();
  const preparer = useServerFn(preparerEtEnvoyerSignature);
  const renvoyer = useServerFn(renvoyerLienSignature);
  const relancerTout = useServerFn(relancerSignaturesEnEchec);
  const corriger = useServerFn(corrigerAdresseSignataire);
  const [edition, setEdition] = useState<{ id: string; email: string } | null>(null);

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
        .limit(500);
      const { data: reglages } = await supabase
        .from("params_signature")
        .select("max_tentatives, intervalle_relance_heures, relance_auto_active")
        .limit(1)
        .maybeSingle();
      return {
        sigs: (sigs ?? []) as SignatureRow[],
        signataires: (signataires ?? []) as SignataireRow[],
        journal: (journal ?? []) as JournalRow[],
        max: reglages?.max_tentatives ?? 3,
        intervalle: reglages?.intervalle_relance_heures ?? 6,
        autoActive: reglages?.relance_auto_active ?? true,
      };
    },
  });

  const max = data?.max ?? 3;
  const journal = useMemo(() => data?.journal ?? [], [data]);
  const signataires = useMemo(() => data?.signataires ?? [], [data]);

  /** Nombre de relances déjà tentées pour un signataire. */
  const relancesDe = (signataireId: string) =>
    journal.filter((j) => j.signataire_id === signataireId && j.declencheur !== "manuel").length;

  const etats = useMemo(() => {
    const m = new Map<string, Etat>();
    signataires.forEach((l) => m.set(l.id, etatSignataire(l, max, relancesDe(l.id))));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signataires, journal, max]);

  const compte = (e: Etat) => [...etats.values()].filter((v) => v === e).length;
  const epuises = signataires.filter((l) => etats.get(l.id) === "epuise");

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

  const relancer = async (signataireId: string, forcer = false) => {
    try {
      const r = await renvoyer({ data: { signataireId, forcer } });
      if (r.envoye) toast.success("Nouveau lien envoyé.");
      else toast.error(texteCause(r.cause));
      rafraichir();
    } catch {
      toast.error("Le lien n'a pas pu être renvoyé. Vous pouvez réessayer.");
    }
  };

  const enregistrerAdresse = async () => {
    if (!edition) return;
    try {
      const r = await corriger({ data: { signataireId: edition.id, email: edition.email.trim() } });
      if (r.envoye) toast.success("Adresse corrigée et lien renvoyé.");
      else toast.error(texteCause(r.cause));
      setEdition(null);
      rafraichir();
    } catch {
      toast.error("L'adresse n'a pas pu être enregistrée. Vérifiez son format.");
    }
  };

  const relancerEchecs = async (signatureId: string) => {
    try {
      const r = await relancerTout({ data: { signatureId } });
      if (r.traites === 0) toast.message("Aucune relance nécessaire pour ce document.");
      else
        toast[r.envoyes > 0 ? "success" : "error"](
          `${r.envoyes} relance(s) envoyée(s), ${r.echoues} encore en échec.`,
        );
      rafraichir();
    } catch {
      toast.error("La relance n'a pas abouti. Vous pouvez réessayer.");
    }
  };

  const nomDe = (id: string | null) =>
    signataires.find((s) => s.id === id)?.signataire_nom ?? "—";
  const documentDe = (id: string) => (data?.sigs ?? []).find((s) => s.id === id)?.libelle ?? "—";

  const exporterCsv = () => {
    const entetes = [
      "Date",
      "Dossier",
      "Document",
      "Signataire",
      "Destinataire (masqué)",
      "Tentative",
      "Déclencheur",
      "Résultat",
      "Cause",
    ];
    const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lignes = journal.map((j) =>
      [
        dateFr(j.created_at),
        dossierId,
        documentDe(j.signature_id),
        nomDe(j.signataire_id),
        j.destinataire_masque,
        String(j.tentative),
        LIBELLE_DECLENCHEUR[j.declencheur] ?? j.declencheur,
        j.resultat === "succes" ? "envoyé" : "échec",
        j.resultat === "succes" ? "" : texteCause(j.cause),
      ]
        .map(echapper)
        .join(";"),
    );
    telecharger(
      `journal-emails-signature-${dossierId}.csv`,
      "\uFEFF" + [entetes.map(echapper).join(";"), ...lignes].join("\r\n"),
      "text/csv;charset=utf-8",
    );
  };

  const exporterPdf = async () => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
    const gris = rgb(0.42, 0.44, 0.5);
    let page = pdf.addPage([841.89, 595.28]);
    let y = 545;
    const ecrire = (texte: string, taille: number, police = font, couleur = rgb(0, 0, 0)) => {
      if (y < 40) {
        page = pdf.addPage([841.89, 595.28]);
        y = 545;
      }
      page.drawText(texte.replace(/[^\x20-\xFF]/g, "-"), {
        x: 40,
        y,
        size: taille,
        font: police,
        color: couleur,
      });
      y -= taille + 6;
    };

    ecrire("Journal des envois d'emails de signature", 16, gras);
    ecrire(`Dossier ${dossierId} — édité le ${new Date().toLocaleString("fr-FR")}`, 9, font, gris);
    ecrire(
      "Adresses volontairement masquées (minimisation des données personnelles).",
      9,
      font,
      gris,
    );
    y -= 6;
    ecrire(
      "Date | Document | Signataire | Destinataire | Tentative | Déclencheur | Résultat",
      9,
      gras,
    );
    journal.forEach((j) => {
      ecrire(
        `${dateFr(j.created_at)} | ${documentDe(j.signature_id).slice(0, 34)} | ${nomDe(
          j.signataire_id,
        ).slice(0, 24)} | ${j.destinataire_masque} | ${j.tentative}/${max} | ${
          LIBELLE_DECLENCHEUR[j.declencheur] ?? j.declencheur
        } | ${j.resultat === "succes" ? "envoyé" : `échec — ${texteCause(j.cause)}`}`,
        8,
      );
    });

    const octets = await pdf.save();
    telecharger(
      `journal-emails-signature-${dossierId}.pdf`,
      new Uint8Array(octets).slice().buffer,
      "application/pdf",
    );

  };

  const resume: { etat: Etat; valeur: number }[] = [
    { etat: "prepare", valeur: compte("prepare") },
    { etat: "envoye", valeur: compte("envoye") },
    { etat: "relance", valeur: compte("relance") },
    { etat: "echec", valeur: compte("echec") },
    { etat: "epuise", valeur: compte("epuise") },
    { etat: "succes", valeur: compte("succes") },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-serif text-xl">Signature électronique</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Chaque signataire requis reçoit un lien nominatif, valable 72 heures. L'ordre de signature
        est libre ; le document est finalisé lorsque tous ont signé. En cas d'échec d'envoi, une
        relance est possible dans la limite de {max} tentative(s) par signataire
        {data?.autoActive
          ? `, avec une relance automatique toutes les ${data?.intervalle ?? 6} heures`
          : " (relance automatique désactivée)"}
        .
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {resume.map((r) => (
          <div key={r.etat} className="rounded-md border border-border bg-background p-3">
            <dt className="text-xs text-muted-foreground">{LIBELLE_ETAT[r.etat]}</dt>
            <dd
              className={`text-lg font-medium ${
                r.etat === "epuise" && r.valeur > 0 ? "text-destructive" : ""
              }`}
            >
              {r.valeur}
            </dd>
          </div>
        ))}
      </dl>

      {epuises.length > 0 && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            {epuises.length} signataire(s) ne reçoivent plus de relance automatique
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Le plafond de {max} tentative(s) est atteint. Deux actions sont possibles : réessayer un
            envoi malgré le plafond, ou corriger l'adresse email — la correction remet le compteur à
            zéro et renvoie aussitôt le lien.
          </p>
          <ul className="mt-3 space-y-2">
            {epuises.map((l) => (
              <li
                key={l.id}
                className="rounded-md border border-border bg-background p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p>{l.signataire_nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {documentDe(l.signature_id)} — {texteCause(l.derniere_cause)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => relancer(l.id, true)}>
                      Réessayer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEdition({ id: l.id, email: l.signataire_email ?? "" })
                      }
                    >
                      Corriger l'adresse
                    </Button>
                  </div>
                </div>
                {edition?.id === l.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="email"
                      value={edition.email}
                      onChange={(e) => setEdition({ id: l.id, email: e.target.value })}
                      placeholder="nouvelle.adresse@exemple.fr"
                      className="max-w-xs"
                    />
                    <Button size="sm" onClick={enregistrerAdresse}>
                      Enregistrer et renvoyer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdition(null)}>
                      Annuler
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {(data?.sigs ?? []).map((s) => {
          const lignes = signataires.filter((x) => x.signature_id === s.id);
          const enEchec = lignes.filter((l) => etats.get(l.id) === "echec");
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
                    const etat = etats.get(l.id) ?? "prepare";
                    const plafond = etat === "epuise";
                    return (
                      <li
                        key={l.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm">{l.signataire_nom}</p>
                            <Badge
                              variant={
                                etat === "succes"
                                  ? "default"
                                  : etat === "echec" || etat === "epuise"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {LIBELLE_ETAT[etat]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {l.horodatage
                              ? `Signé le ${dateFr(l.horodatage)} — ${
                                  l.methode === "trace" ? "tracé manuscrit" : "saisie du nom"
                                }`
                              : l.signataire_email
                                ? "En attente de signature"
                                : "Adresse email manquante"}
                          </p>
                          {!l.horodatage && (
                            <p className="text-xs text-muted-foreground">
                              {tentatives} tentative(s) d'envoi sur {max} — dont{" "}
                              {relancesDe(l.id)} relance(s) — dernière le {dateFr(l.dernier_essai_le)}
                            </p>
                          )}
                          {!l.horodatage && l.dernier_resultat === "echec" && (
                            <p className="text-xs text-destructive">
                              {texteCause(l.derniere_cause)}
                              {plafond
                                ? " Plafond de tentatives atteint : réessayez ou corrigez l'adresse ci-dessus."
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

      {journal.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Journal des envois</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exporterCsv}>
                Exporter en CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exporterPdf}>
                Exporter en PDF
              </Button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Trace d'audit des tentatives d'envoi. Les adresses email n'y figurent que sous forme
            masquée, conformément au principe de minimisation des données.
          </p>
          <ul className="mt-3 space-y-1">
            {journal.slice(0, 50).map((j) => (
              <li key={j.id} className="text-xs text-muted-foreground">
                {dateFr(j.created_at)} — {j.destinataire_masque} — tentative {j.tentative} (
                {LIBELLE_DECLENCHEUR[j.declencheur] ?? j.declencheur}) —{" "}
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
