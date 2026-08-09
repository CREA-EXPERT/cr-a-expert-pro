import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Réglage administrable des relances d'emails de signature. */
export function ReglagesRelanceSignature() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["params-signature"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("params_signature")
        .select("id, max_tentatives, intervalle_relance_heures, relance_auto_active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [maxTentatives, setMax] = useState("3");
  const [intervalle, setIntervalle] = useState("6");
  const [actif, setActif] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMax(String(data.max_tentatives));
    setIntervalle(String(data.intervalle_relance_heures));
    setActif(data.relance_auto_active);
  }, [data]);

  const enregistrer = async () => {
    if (!data?.id) return;
    const n = Number(maxTentatives);
    const h = Number(intervalle);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      toast.error("Le nombre de tentatives doit être compris entre 1 et 10.");
      return;
    }
    if (!Number.isInteger(h) || h < 1 || h > 168) {
      toast.error("L'intervalle doit être compris entre 1 et 168 heures.");
      return;
    }

    setEnregistrement(true);
    const { error } = await supabase
      .from("params_signature")
      .update({
        max_tentatives: n,
        intervalle_relance_heures: h,
        relance_auto_active: actif,
      })
      .eq("id", data.id);
    setEnregistrement(false);
    if (error) {
      toast.error("Les réglages n'ont pas pu être enregistrés.");
      return;
    }
    toast.success("Réglages de relance enregistrés.");
    refetch();
  };

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="font-serif text-lg">Relance des emails de signature</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Ces réglages s'appliquent aux convocations de signature : nombre maximal d'envois par
        signataire (envoi initial compris) et délai minimal avant une nouvelle tentative
        automatique. Le planificateur passe toutes les heures et ne relance que les envois en échec
        dont le délai est écoulé.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="max-tentatives">Nombre maximal de tentatives (1 à 10)</Label>
          <Input
            id="max-tentatives"
            type="number"
            min={1}
            max={10}
            value={maxTentatives}
            onChange={(e) => setMax(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="intervalle-relance">Intervalle entre relances, en heures (1 à 168)</Label>
          <Input
            id="intervalle-relance"
            type="number"
            min={1}
            max={168}
            value={intervalle}
            onChange={(e) => setIntervalle(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Switch id="relance-auto" checked={actif} onCheckedChange={setActif} />
        <Label htmlFor="relance-auto" className="text-sm font-normal">
          Activer la relance automatique (les relances manuelles restent toujours possibles)
        </Label>
      </div>

      <Button className="mt-5" onClick={enregistrer} disabled={enregistrement}>
        {enregistrement ? "Enregistrement…" : "Enregistrer les réglages"}
      </Button>
    </div>
  );
}
