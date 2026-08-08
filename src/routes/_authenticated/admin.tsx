import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tarif } from "@/lib/tarifs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration des tarifs — CREA EXPERT" },
      { name: "description", content: "Mise à jour des montants légaux : annonce légale, greffe, bénéficiaires effectifs." },
      { property: "og:title", content: "Administration des tarifs — CREA EXPERT" },
      { property: "og:description", content: "Paramétrage des frais légaux applicables." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("params_tarifs")
      .select("id, cle, libelle, montant_ht, montant_ttc")
      .order("cle")
      .then(({ data }) => setTarifs((data ?? []) as Tarif[]));
  }, [isAdmin]);

  async function enregistrer() {
    setEnregistrement(true);
    for (const t of tarifs) {
      const { error } = await supabase
        .from("params_tarifs")
        .update({ libelle: t.libelle, montant_ht: t.montant_ht, montant_ttc: t.montant_ttc })
        .eq("id", t.id);
      if (error) {
        setEnregistrement(false);
        toast.error("Enregistrement impossible.");
        return;
      }
    }
    setEnregistrement(false);
    toast.success("Paramètres enregistrés.");
  }

  function maj(id: string, champ: "libelle" | "montant_ht" | "montant_ttc", valeur: string) {
    setTarifs((ts) =>
      ts.map((t) =>
        t.id === id
          ? { ...t, [champ]: champ === "libelle" ? valeur : valeur === "" ? null : Number(valeur) }
          : t,
      ),
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="container-page max-w-xl py-14">
          <h1 className="font-serif text-3xl">Accès réservé</h1>
          <p className="mt-3 text-muted-foreground">Cet espace est réservé aux administrateurs.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container-page max-w-3xl py-10">
        <h1 className="font-serif text-3xl">Paramètres des frais légaux</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ces montants sont repris partout dans l'application. Ils évoluent généralement au 1<sup>er</sup> janvier :
          mettez-les à jour ici plutôt que dans le code.
        </p>

        <div className="mt-6 space-y-4">
          {tarifs.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Clé : {t.cle}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor={`lib-${t.id}`}>Libellé</Label>
                  <Input id={`lib-${t.id}`} value={t.libelle} onChange={(e) => maj(t.id, "libelle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ht-${t.id}`}>Montant HT (€)</Label>
                  <Input
                    id={`ht-${t.id}`}
                    type="number"
                    step="0.01"
                    value={t.montant_ht ?? ""}
                    onChange={(e) => maj(t.id, "montant_ht", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ttc-${t.id}`}>Montant TTC (€)</Label>
                  <Input
                    id={`ttc-${t.id}`}
                    type="number"
                    step="0.01"
                    value={t.montant_ttc ?? ""}
                    onChange={(e) => maj(t.id, "montant_ttc", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          {tarifs.length === 0 && <p className="text-muted-foreground">Aucun paramètre enregistré.</p>}
        </div>

        <Button className="mt-6" onClick={enregistrer} disabled={enregistrement || tarifs.length === 0}>
          {enregistrement ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </PageShell>
  );
}
