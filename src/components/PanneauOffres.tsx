import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { euro } from "@/lib/domain";
import { offresQuery, parametresQuery, type Offre, type ParametresTarifs } from "@/lib/offres";

/** Édition des deux offres et des paramètres tarifaires généraux. */
export function PanneauOffres() {
  const qc = useQueryClient();
  const { data: offres } = useQuery(offresQuery);
  const { data: params } = useQuery(parametresQuery);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-serif text-xl">Offres de création</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deux prix indépendants par offre : l'un s'applique lorsque le client confie sa
          comptabilité au cabinet, l'autre lorsqu'il ne la confie pas.
        </p>
        <div className="mt-4 space-y-4">
          {(offres ?? []).map((o) => (
            <LigneOffre key={o.id} o={o} onEnregistre={() => qc.invalidateQueries(offresQuery)} />
          ))}
        </div>
      </section>

      {params && (
        <BlocParametres params={params} onEnregistre={() => qc.invalidateQueries(parametresQuery)} />
      )}
    </div>
  );
}

function LigneOffre({ o, onEnregistre }: { o: Offre; onEnregistre: () => void }) {
  const [sans, setSans] = useState(String(o.prix_ht_sans_compta));
  const [avec, setAvec] = useState(String(o.prix_ht_avec_compta));
  const [badge, setBadge] = useState(o.badge ?? "");
  const [busy, setBusy] = useState(false);

  async function enregistrer() {
    setBusy(true);
    const { error } = await supabase
      .from("offres_creation")
      .update({
        prix_ht_sans_compta: Number(sans) || 0,
        prix_ht_avec_compta: Number(avec) || 0,
        badge: badge.trim() || null,
      })
      .eq("id", o.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Offre mise à jour.");
      onEnregistre();
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-medium">{o.libelle}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`sans-${o.id}`}>Prix HT sans comptabilité</Label>
          <Input
            id={`sans-${o.id}`}
            inputMode="decimal"
            value={sans}
            onChange={(e) => setSans(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`avec-${o.id}`}>Prix HT avec comptabilité</Label>
          <Input
            id={`avec-${o.id}`}
            inputMode="decimal"
            value={avec}
            onChange={(e) => setAvec(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`badge-${o.id}`}>Badge (facultatif)</Label>
          <Input
            id={`badge-${o.id}`}
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="Recommandé par le cabinet"
          />
        </div>
      </div>
      <Button className="mt-3" variant="outline" disabled={busy} onClick={enregistrer}>
        Enregistrer
      </Button>
    </div>
  );
}

function BlocParametres({
  params,
  onEnregistre,
}: {
  params: ParametresTarifs;
  onEnregistre: () => void;
}) {
  const [compta, setCompta] = useState(String(params.prix_compta_ht));
  const [duree, setDuree] = useState(String(params.duree_engagement_mois));
  const [tva, setTva] = useState(String(params.tva_taux));
  const [refac, setRefac] = useState(String(params.refac_creation_ht));
  const [busy, setBusy] = useState(false);

  async function enregistrer() {
    setBusy(true);
    const { error } = await supabase
      .from("parametres_tarifs")
      .update({
        prix_compta_ht: Number(compta) || 0,
        duree_engagement_mois: Number(duree) || 0,
        tva_taux: Number(tva) || 0,
        refac_creation_ht: Number(refac) || 0,
      })
      .eq("id", params.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Paramètres mis à jour.");
      onEnregistre();
    }
  }

  return (
    <section>
      <h2 className="font-serif text-xl">Paramètres tarifaires</h2>
      <div className="mt-3 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="p-compta">Comptabilité HT / mois</Label>
          <Input id="p-compta" value={compta} onChange={(e) => setCompta(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-duree">Engagement (mois)</Label>
          <Input id="p-duree" value={duree} onChange={(e) => setDuree(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-tva">TVA (%)</Label>
          <Input id="p-tva" value={tva} onChange={(e) => setTva(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-refac">Refacturation interne HT</Label>
          <Input id="p-refac" value={refac} onChange={(e) => setRefac(e.target.value)} />
        </div>
      </div>
      <Button className="mt-3" variant="outline" disabled={busy} onClick={enregistrer}>
        Enregistrer les paramètres
      </Button>
    </section>
  );
}

const LIB_STATUT: Record<string, string> = {
  a_facturer: "À facturer",
  facturee: "Facturée",
  reglee: "Réglée",
};

/** Suivi des refacturations internes créées à l'attribution du SIREN. */
export function PanneauRefacturations() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["refacturations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refacturations_intragroupe")
        .select("*, dossiers(denomination, siren)")
        .order("cree_le", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function changer(id: string, statut: string) {
    const { error } = await supabase
      .from("refacturations_intragroupe")
      .update({ statut })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Statut mis à jour.");
      qc.invalidateQueries({ queryKey: ["refacturations"] });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl">Refacturations internes</h2>
        <p className="mt-1 text-sm text-muted-foreground text-justify">
          Une ligne est créée automatiquement lorsqu'un dossier passe en « immatriculé » et que le
          client a confié sa comptabilité au cabinet. L'application ne génère aucune facture ni
          aucun paiement : ce tableau est un suivi de gestion interne.
        </p>
      </div>
      {(data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune refacturation pour le moment.</p>
      )}
      <ul className="space-y-2">
        {(data ?? []).map((r) => {
          const d = r.dossiers as { denomination: string; siren: string | null } | null;
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium">{d?.denomination ?? "Dossier"}</p>
                <p className="text-sm text-muted-foreground">
                  {r.emetteur} → {r.destinataire} — {r.motif} — {euro(Number(r.montant_ht))} HT
                  {d?.siren ? ` — SIREN ${d.siren}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{LIB_STATUT[r.statut] ?? r.statut}</span>
                {r.statut !== "facturee" && r.statut !== "reglee" && (
                  <Button size="sm" variant="outline" onClick={() => changer(r.id, "facturee")}>
                    Marquer facturée
                  </Button>
                )}
                {r.statut !== "reglee" && (
                  <Button size="sm" variant="outline" onClick={() => changer(r.id, "reglee")}>
                    Marquer réglée
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
