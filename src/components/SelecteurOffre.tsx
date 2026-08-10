import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { euro } from "@/lib/domain";
import {
  offreParCode,
  prixBarreHt,
  prixOffreHt,
  useOffres,
  useParametresTarifs,
  type CodeOffre,
  type Offre,
} from "@/lib/offres";

const CONTENU: Record<string, string[]> = {
  creation_seule: [
    "Création complète de votre société via la plateforme",
    "Statuts validés par vos soins : la responsabilité de leur contenu vous revient, le cabinet n'est pas engagé sur les statuts",
    "Pas de relecture par un expert-comptable",
    "Garantie : remboursement intégral si la création n'aboutit pas",
  ],
  creation_ec: [
    "Tout le contenu de l'offre « Création »",
    "Relecture des statuts par un expert-comptable inscrit à l'Ordre : ce qui va, ce qui manque, ce qu'il convient d'ajouter ou de modifier",
    "Lettre de mission dédiée à la relecture, responsabilité du cabinet engagée",
    "Jusqu'à 3 emails et 3 appels d'assistance (plafond contractuel)",
  ],
};

/**
 * Écran unique de sélection d'offre : deux cartes et un interrupteur « comptabilité ».
 * Tous les montants proviennent des tables d'administration (rien n'est codé en dur).
 */
export function SelecteurOffre({
  offre,
  avecCompta,
  onChange,
  disabled = false,
}: {
  offre: string | null;
  avecCompta: boolean;
  onChange: (v: { offre?: CodeOffre; avec_compta?: boolean }) => void;
  disabled?: boolean;
}) {
  const { data: offres } = useOffres();
  const { data: params } = useParametresTarifs();

  const prixCompta = Number(params?.prix_compta_ht ?? 199);
  const duree = params?.duree_engagement_mois ?? 3;
  const tva = Number(params?.tva_taux ?? 20);
  const ttc = (ht: number) => ht * (1 + tva / 100);

  return (
    <div className="space-y-5">
      {/* INTERRUPTEUR COMPTABILITÉ */}
      <div className="rounded-lg border border-accent/40 bg-accent/8 p-5">
        <div className="flex items-start gap-4">
          <Switch
            id="interrupteur-compta"
            checked={avecCompta}
            disabled={disabled}
            onCheckedChange={(v) => onChange({ avec_compta: v === true })}
            aria-describedby="interrupteur-compta-aide"
          />
          <div>
            <Label htmlFor="interrupteur-compta" className="text-base font-medium leading-relaxed">
              {avecCompta
                ? "✓ Je confie aussi ma comptabilité au cabinet — ma création coûte moins cher."
                : "Je confie aussi ma comptabilité au cabinet — ma création coûte moins cher."}
            </Label>
            <p id="interrupteur-compta-aide" className="mt-2 text-sm leading-relaxed text-justify">
              Comptabilité : {euro(prixCompta)} HT/mois. Engagement {duree} mois, puis résiliation
              libre et sans frais.
            </p>
          </div>
        </div>
      </div>

      {/* CARTES */}
      <div className="grid gap-4 md:grid-cols-2">
        {(offres ?? []).map((o) => (
          <CarteOffre
            key={o.id}
            o={o}
            choisie={offre === o.code}
            avecCompta={avecCompta}
            disabled={disabled}
            prixCompta={prixCompta}
            ttc={ttc}
            tva={tva}
            onChoisir={() => onChange({ offre: o.code as CodeOffre })}
          />
        ))}
        {(offres ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Chargement des offres…</p>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground text-justify">
        Les frais légaux obligatoires (greffe, annonce légale, déclaration des bénéficiaires
        effectifs) s'ajoutent dans tous les cas au prix de création : ils sont fixés par la
        réglementation et vous sont refacturés à l'euro près, sans marge.
      </p>
      {offre && offreParCode(offres, offre) && (
        <p className="text-sm">
          Offre retenue : <strong>{offreParCode(offres, offre)?.libelle}</strong>. Vous pouvez la
          modifier tant que vous n'avez pas signé.
        </p>
      )}
    </div>
  );
}

function CarteOffre({
  o,
  choisie,
  avecCompta,
  disabled,
  prixCompta,
  tva,
  ttc,
  onChoisir,
}: {
  o: Offre;
  choisie: boolean;
  avecCompta: boolean;
  disabled: boolean;
  prixCompta: number;
  tva: number;
  ttc: (ht: number) => number;
  onChoisir: () => void;
}) {
  const prix = prixOffreHt(o, avecCompta);
  const barre = prixBarreHt(o, avecCompta);
  const offerte = avecCompta && prix === 0;

  return (
    <button
      type="button"
      onClick={onChoisir}
      disabled={disabled}
      aria-pressed={choisie}
      className={`flex h-full flex-col rounded-lg border p-5 text-left transition-colors ${
        choisie ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/50"
      } ${o.badge ? "ring-1 ring-accent/30" : ""} ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl">{o.libelle}</h3>
        {o.badge && <Badge>{o.badge}</Badge>}
      </div>

      <div className="mt-4">
        {barre !== null && (
          <p className="text-sm text-muted-foreground">
            <span className="line-through">{euro(barre)} HT</span>
          </p>
        )}
        <p className="font-serif text-3xl">{offerte ? "Offerte" : `${euro(prix)} HT`}</p>
        <p className="text-xs text-muted-foreground">
          {offerte
            ? "0 € — TVA sans objet"
            : `+ TVA ${tva} % — soit ${euro(ttc(prix))} TTC`}
        </p>
        {avecCompta && (
          <p className="mt-2 text-sm">+ {euro(prixCompta)} HT/mois de comptabilité</p>
        )}
        {offerte && (
          <p className="mt-2 text-sm leading-relaxed">
            Vous réglez seulement le 1<sup>er</sup> mois de comptabilité ({euro(prixCompta)} HT) à
            la commande.
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm leading-relaxed">
        {(CONTENU[o.code] ?? []).map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="text-accent">
              •
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <span
        className={`mt-5 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ${
          choisie ? "bg-accent text-accent-foreground" : "border border-border"
        }`}
      >
        {choisie ? "Offre sélectionnée" : "Choisir cette offre"}
      </span>
    </button>
  );
}
