import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EncadrePliable } from "@/components/EncadrePliable";
import { ZoneDepot } from "@/components/ZoneDepot";
import {
  BandeauMentionManuscrite,
  JustificatifsDomicileAdmis,
  RappelValidite,
} from "@/components/AvertissementsPieces";
import {
  LIBELLE_STATUT,
  aRedeposer,
  categorieControle,
  estPieceIdentite,
  normaliserStatut,
} from "@/lib/pieces";
import type { DocumentRow } from "@/lib/documents";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";

export type Face = "recto" | "verso";

const horodatage = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** Nombre de jours avant expiration en dessous duquel le dépôt est bloqué. */
const MARGE_JOURS = 15;

export function expirationBloquante(date: string | null | undefined) {
  if (!date) return null;
  const fin = new Date(`${date}T00:00:00`);
  if (Number.isNaN(fin.getTime())) return "La date d'expiration saisie n'est pas valide.";
  const jours = Math.floor((fin.getTime() - Date.now()) / 86_400_000);
  if (jours < 0)
    return "Cette pièce est expirée : le greffe rejetterait le dossier. Déposez une pièce en cours de validité.";
  if (jours < MARGE_JOURS)
    return `Cette pièce expire dans ${jours} jour(s). Déposez une pièce valable au moins ${MARGE_JOURS} jours.`;
  return null;
}

/**
 * Ligne de dépôt d'une pièce, façon guichet unique :
 * à gauche ce qui est demandé, à droite la zone de dépôt.
 */
export function LigneDepot({
  doc,
  personne,
  transmis,
  mentionOk,
  onMention,
  onFichier,
  onAttester,
  onSupprimerVerso,
  onExpiration,
  apercus,
}: {
  doc: DocumentRow;
  personne: string | null;
  transmis: boolean;
  mentionOk: boolean;
  onMention: (v: boolean) => void;
  onFichier: (fichier: File, face: Face) => void;
  onAttester: (v: boolean) => void;
  onSupprimerVerso: () => void;
  onExpiration: (v: string) => void;
  apercus: { recto?: string; verso?: string };
}) {
  const statut = normaliserStatut(doc.statut_document);
  const badge = LIBELLE_STATUT[statut];
  const kyc = estPieceIdentite(doc.type_document);
  const categorie = categorieControle(doc.type_document);
  const [expiration, setExpiration] = useState(doc.date_expiration ?? "");
  const blocageExpiration = kyc ? expirationBloquante(expiration) : null;
  const depotBloque = transmis || (kyc && (!mentionOk || Boolean(blocageExpiration)));

  return (
    <li className="rounded-lg border border-border bg-surface p-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ce qui est demandé */}
        <div className="space-y-3">
          <div>
            <p className="font-medium">{doc.libelle}</p>
            {personne && <p className="text-sm text-muted-foreground">Concerne : {personne}</p>}
            {!doc.obligatoire && (
              <p className="text-sm text-muted-foreground">Pièce facultative</p>
            )}
          </div>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${badge.cls}`}>
            {badge.label}
          </span>

          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {kyc
              ? "Copie recto ET verso (double page pour un passeport), entièrement lisible, document complet dans le cadre."
              : "Document complet et lisible, sans page manquante."}{" "}
            Formats acceptés : PDF, JPG ou PNG, 10 Mo maximum par fichier.
          </p>
          {kyc && <RappelValidite />}
          {categorie === "domicile" && (
            <>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Le justificatif doit dater de moins de trois mois (avis d'imposition et taxe
                foncière : année en cours).
              </p>
              <JustificatifsDomicileAdmis />
            </>
          )}

          {kyc && (
            <div className="space-y-2">
              <Label htmlFor={`exp-${doc.id}`}>Date d'expiration de la pièce</Label>
              <Input
                id={`exp-${doc.id}`}
                type="date"
                value={expiration}
                disabled={transmis}
                onChange={(e) => {
                  setExpiration(e.target.value);
                  onExpiration(e.target.value);
                }}
              />
              {blocageExpiration && (
                <p className="max-w-prose text-sm text-destructive">{blocageExpiration}</p>
              )}
            </div>
          )}

          {doc.aide_client && (
            <EncadrePliable titre="Pourquoi cette pièce est-elle demandée ?">
              <p>{doc.aide_client}</p>
            </EncadrePliable>
          )}
        </div>

        {/* Zone de dépôt */}
        <div className="space-y-3">
          {kyc && (
            <>
              <BandeauMentionManuscrite />
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`kyc-${doc.id}`}
                  className="mt-0.5"
                  checked={mentionOk}
                  disabled={transmis}
                  onCheckedChange={(v) => onMention(v === true)}
                />
                <Label htmlFor={`kyc-${doc.id}`} className="text-sm font-normal leading-relaxed">
                  J'ai recopié à la main la mention de conformité sur la copie, puis je l'ai datée
                  et signée.
                </Label>
              </div>
            </>
          )}

          <ZoneDepot
            multiple={false}
            disabled={depotBloque}
            libelle={
              kyc
                ? doc.fichier_url
                  ? "Remplacer le recto"
                  : "Déposer le recto (ou la double page du passeport)"
                : doc.fichier_url
                  ? "Déposer une nouvelle version"
                  : "Glissez le fichier ici"
            }
            aide={
              depotBloque
                ? transmis
                  ? "Vos pièces ont été transmises."
                  : (blocageExpiration ??
                    "Cochez d'abord la case de mention manuscrite pour débloquer le dépôt.")
                : "PDF, JPG ou PNG — 10 Mo maximum."
            }
            className="p-4"
            onFichiers={(fs) => fs[0] && onFichier(fs[0], "recto")}
          />

          {kyc && (
            <ZoneDepot
              multiple={false}
              disabled={depotBloque}
              libelle={doc.fichier_verso_url ? "Remplacer le verso" : "Déposer le verso"}
              aide="Non requis pour un passeport. Le robot analyse les deux faces ensemble."
              className="p-4"
              onFichiers={(fs) => fs[0] && onFichier(fs[0], "verso")}
            />
          )}

          {(apercus.recto || apercus.verso) && (
            <div className="flex flex-wrap gap-3">
              {apercus.recto && (
                <img
                  src={apercus.recto}
                  alt={`Aperçu du fichier déposé pour ${doc.libelle}`}
                  className="h-24 w-auto rounded-md border border-border object-cover"
                />
              )}
              {apercus.verso && (
                <img
                  src={apercus.verso}
                  alt={`Aperçu du verso déposé pour ${doc.libelle}`}
                  className="h-24 w-auto rounded-md border border-border object-cover"
                />
              )}
            </div>
          )}

          {doc.fichier_verso_url && !transmis && (
            <Button type="button" size="sm" variant="ghost" onClick={onSupprimerVerso}>
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden /> Retirer le verso
            </Button>
          )}

          {doc.verification_statut === "en_cours" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden />
              Vérification automatique en cours…
            </p>
          )}
          {["conforme", "doute"].includes(doc.verification_statut ?? "") && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              Vérification automatique effectuée — votre pièce sera contrôlée par notre équipe.
            </p>
          )}

          <div className="flex items-start gap-3">
            <Checkbox
              id={`att-${doc.id}`}
              className="mt-0.5"
              checked={doc.atteste_conforme}
              disabled={!doc.fichier_url || transmis}
              onCheckedChange={(v) => onAttester(v === true)}
            />
            <Label htmlFor={`att-${doc.id}`} className="text-sm font-normal leading-relaxed">
              Je certifie que cette pièce est complète, lisible, en cours de validité et conforme à
              l'original.
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Déposée le {horodatage(doc.depose_le)} · cochée conforme le {horodatage(doc.atteste_le)}{" "}
            · acceptée par le cabinet le {horodatage(doc.valide_le)}
          </p>
        </div>
      </div>

      {aRedeposer(statut) && doc.motif_rejet && (
        <p className="mt-4 max-w-prose rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm leading-relaxed">
          <strong>{statut === "refuse" ? "Pièce refusée" : "Pièce à corriger"} :</strong>{" "}
          {doc.motif_rejet}
        </p>
      )}
    </li>
  );
}
