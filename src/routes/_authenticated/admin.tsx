import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles, type Role } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tarif } from "@/lib/tarifs";
import { tarifAVerifier } from "@/lib/tarifs";
import type { DocumentRule } from "@/lib/documents";
import { champsIncomplets, mentionsLegalesCompletes } from "@/lib/editeur";
import { etatServices } from "@/lib/services.functions";
import { PanneauConservation } from "@/components/PanneauConservation";
import { ReglagesRelanceSignature } from "@/components/ReglagesRelanceSignature";



export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — CREA EXPERT" },
      {
        name: "description",
        content: "Paramétrage des frais légaux, des règles documentaires et des rôles utilisateurs.",
      },
      { property: "og:title", content: "Administration — CREA EXPERT" },
      { property: "og:description", content: "Paramétrage des frais légaux, règles documentaires et rôles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const ROLES: Role[] = ["client", "cabinet", "admin"];
const ROLE_LABEL: Record<Role, string> = { client: "Client", cabinet: "Cabinet", admin: "Administrateur" };

function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user);

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
      <div className="container-page max-w-5xl py-10">
        <h1 className="font-serif text-3xl">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paramètres applicatifs : frais légaux, règles documentaires et rôles des utilisateurs.
        </p>

        <BandeauMentionsLegales />
        <BandeauServices />

        <Tabs defaultValue="tarifs" className="mt-8">
          <TabsList>
            <TabsTrigger value="tarifs">Frais légaux</TabsTrigger>
            <TabsTrigger value="regles">Règles documentaires</TabsTrigger>
            <TabsTrigger value="roles">Rôles</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
            <TabsTrigger value="conservation">Conservation</TabsTrigger>
          </TabsList>

          <TabsContent value="tarifs" className="mt-6">
            <OngletTarifs />
          </TabsContent>
          <TabsContent value="regles" className="mt-6">
            <OngletRegles />
          </TabsContent>
          <TabsContent value="roles" className="mt-6">
            <OngletRoles currentUserId={user?.id ?? null} />
          </TabsContent>
          <TabsContent value="signatures" className="mt-6">
            <OngletSignatures />
          </TabsContent>
          <TabsContent value="conservation" className="mt-6">
            <PanneauConservation />
          </TabsContent>
        </Tabs>

      </div>
    </PageShell>
  );
}

function BandeauMentionsLegales() {
  if (mentionsLegalesCompletes()) return null;
  const manquants = champsIncomplets();
  return (
    <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
      <p className="font-medium">
        Mentions légales incomplètes — publication interdite en l'état (art. 6, III LCEN)
      </p>
      <ul className="mt-2 list-inside list-disc text-sm">
        {manquants.map((champ) => (
          <li key={champ}>{champ}</li>
        ))}
      </ul>
    </div>
  );
}

function BandeauServices() {
  const appelerEtatServices = useServerFn(etatServices);
  const { data } = useQuery({
    queryKey: ["admin-etat-services"],
    queryFn: () => appelerEtatServices(),
  });

  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Service email : {data?.email ? "configuré" : "non configuré"} · Enregistrement du moyen de paiement :{" "}
      {data?.paiement ? "configuré" : "non configuré"}
    </p>
  );
}

/* ---------------- Frais légaux ---------------- */

function OngletTarifs() {
  const qc = useQueryClient();
  const [brouillons, setBrouillons] = useState<Record<string, Partial<Tarif>>>({});
  const [nouveau, setNouveau] = useState({ cle: "", libelle: "", montant_ht: "", montant_ttc: "" });

  const { data: tarifs = [], isLoading } = useQuery({
    queryKey: ["admin-tarifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("params_tarifs")
        .select("id, cle, libelle, montant_ht, montant_ttc, source, verifie_le")
        .order("cle");
      if (error) throw error;
      return (data ?? []) as Tarif[];
    },
  });

  const valeur = (t: Tarif, champ: keyof Tarif) => (brouillons[t.id]?.[champ] ?? t[champ]) as string | number | null;

  const CHAMPS_TEXTE: (keyof Tarif)[] = ["libelle", "cle", "source", "verifie_le"];

  function maj(id: string, champ: keyof Tarif, v: string) {
    setBrouillons((b) => ({
      ...b,
      [id]: { ...b[id], [champ]: CHAMPS_TEXTE.includes(champ) ? (v === "" ? null : v) : v === "" ? null : Number(v) },
    }));
  }

  async function enregistrer(t: Tarif) {
    const patch = brouillons[t.id];
    if (!patch) return;
    const { error } = await supabase.from("params_tarifs").update(patch).eq("id", t.id);
    if (error) { toast.error("Enregistrement impossible."); return; }
    setBrouillons((b) => {
      const c = { ...b };
      delete c[t.id];
      return c;
    });
    toast.success("Paramètre enregistré.");
    qc.invalidateQueries({ queryKey: ["admin-tarifs"] });
  }

  async function supprimer(id: string) {
    const { error } = await supabase.from("params_tarifs").delete().eq("id", id);
    if (error) { toast.error("Suppression impossible."); return; }
    toast.success("Paramètre supprimé.");
    qc.invalidateQueries({ queryKey: ["admin-tarifs"] });
  }

  async function ajouter() {
    if (!nouveau.cle.trim() || !nouveau.libelle.trim()) { toast.error("Clé et libellé obligatoires."); return; }
    const { error } = await supabase.from("params_tarifs").insert({
      cle: nouveau.cle.trim(),
      libelle: nouveau.libelle.trim(),
      montant_ht: nouveau.montant_ht === "" ? null : Number(nouveau.montant_ht),
      montant_ttc: nouveau.montant_ttc === "" ? null : Number(nouveau.montant_ttc),
    });
    if (error) { toast.error("Création impossible (clé déjà utilisée ?)."); return; }
    setNouveau({ cle: "", libelle: "", montant_ht: "", montant_ttc: "" });
    toast.success("Paramètre ajouté.");
    qc.invalidateQueries({ queryKey: ["admin-tarifs"] });
  }

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ces montants sont repris partout dans l'application. Ils évoluent généralement au 1<sup>er</sup> janvier :
        mettez-les à jour ici plutôt que dans le code.
      </p>

      {tarifs.map((t) => (
        <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor={`cle-${t.id}`}>Clé</Label>
              <Input id={`cle-${t.id}`} value={String(valeur(t, "cle") ?? "")} onChange={(e) => maj(t.id, "cle", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`lib-${t.id}`}>Libellé</Label>
              <Input id={`lib-${t.id}`} value={String(valeur(t, "libelle") ?? "")} onChange={(e) => maj(t.id, "libelle", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ht-${t.id}`}>Montant HT (€)</Label>
              <Input
                id={`ht-${t.id}`}
                type="number"
                step="0.01"
                value={valeur(t, "montant_ht") ?? ""}
                onChange={(e) => maj(t.id, "montant_ht", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ttc-${t.id}`}>Montant TTC (€)</Label>
              <Input
                id={`ttc-${t.id}`}
                type="number"
                step="0.01"
                value={valeur(t, "montant_ttc") ?? ""}
                onChange={(e) => maj(t.id, "montant_ttc", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`src-${t.id}`}>Source du barème</Label>
              <Input
                id={`src-${t.id}`}
                value={String(valeur(t, "source") ?? "")}
                onChange={(e) => maj(t.id, "source", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ver-${t.id}`}>Vérifié le</Label>
              <Input
                id={`ver-${t.id}`}
                type="date"
                value={String(valeur(t, "verifie_le") ?? "")}
                onChange={(e) => maj(t.id, "verifie_le", e.target.value)}
              />
            </div>
          </div>
          {tarifAVerifier(t) && (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
              Montant non vérifié contre le barème en vigueur — la promesse de refacturation à l'euro près impose
              une vérification annuelle (les tarifs sont révisés en principe au 1er janvier).
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => enregistrer(t)} disabled={!brouillons[t.id]}>
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => supprimer(t.id)}>
              Supprimer
            </Button>
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-border p-4">
        <h3 className="font-medium">Ajouter un paramètre</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_1fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="n-cle">Clé</Label>
            <Input id="n-cle" value={nouveau.cle} onChange={(e) => setNouveau({ ...nouveau, cle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-lib">Libellé</Label>
            <Input id="n-lib" value={nouveau.libelle} onChange={(e) => setNouveau({ ...nouveau, libelle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-ht">Montant HT (€)</Label>
            <Input id="n-ht" type="number" step="0.01" value={nouveau.montant_ht} onChange={(e) => setNouveau({ ...nouveau, montant_ht: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-ttc">Montant TTC (€)</Label>
            <Input id="n-ttc" type="number" step="0.01" value={nouveau.montant_ttc} onChange={(e) => setNouveau({ ...nouveau, montant_ttc: e.target.value })} />
          </div>
        </div>
        <Button className="mt-3" size="sm" onClick={ajouter}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Règles documentaires ---------------- */

const REGLE_VIDE = {
  condition_champ: "toujours",
  condition_valeur: "",
  type_document: "",
  libelle_client: "",
  aide_client: "",
  origine: "a_fournir",
  obligatoire: true,
  ordre: 100,
};

function OngletRegles() {
  const qc = useQueryClient();
  const [brouillons, setBrouillons] = useState<Record<string, Partial<DocumentRule>>>({});
  const [nouvelle, setNouvelle] = useState({ ...REGLE_VIDE });

  const { data: regles = [], isLoading } = useQuery({
    queryKey: ["admin-regles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_rules").select("*").order("ordre");
      if (error) throw error;
      return (data ?? []) as DocumentRule[];
    },
  });

  function maj(id: string, champ: keyof DocumentRule, v: unknown) {
    setBrouillons((b) => ({ ...b, [id]: { ...b[id], [champ]: v } }));
  }

  async function enregistrer(r: DocumentRule) {
    const patch = brouillons[r.id];
    if (!patch) return;
    const { error } = await supabase.from("document_rules").update(patch).eq("id", r.id);
    if (error) { toast.error("Enregistrement impossible."); return; }
    setBrouillons((b) => {
      const c = { ...b };
      delete c[r.id];
      return c;
    });
    toast.success("Règle enregistrée.");
    qc.invalidateQueries({ queryKey: ["admin-regles"] });
  }

  async function supprimer(id: string) {
    const { error } = await supabase.from("document_rules").delete().eq("id", id);
    if (error) { toast.error("Suppression impossible."); return; }
    toast.success("Règle supprimée.");
    qc.invalidateQueries({ queryKey: ["admin-regles"] });
  }

  async function ajouter() {
    if (!nouvelle.type_document.trim() || !nouvelle.libelle_client.trim())
      { toast.error("Type de document et libellé client obligatoires."); return; }
    const { error } = await supabase.from("document_rules").insert({
      ...nouvelle,
      condition_valeur: nouvelle.condition_valeur || null,
      aide_client: nouvelle.aide_client || null,
      ordre: Number(nouvelle.ordre),
    });
    if (error) { toast.error("Création impossible."); return; }
    setNouvelle({ ...REGLE_VIDE });
    toast.success("Règle ajoutée.");
    qc.invalidateQueries({ queryKey: ["admin-regles"] });
  }

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;

  const val = <K extends keyof DocumentRule>(r: DocumentRule, champ: K) => (brouillons[r.id]?.[champ] ?? r[champ]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Chaque règle ajoute une pièce à la liste du client lorsque la condition est remplie (champ du dossier et
        valeur attendue). « Toujours » applique la règle à tous les dossiers.
      </p>

      {regles.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Champ label="Condition (champ)" id={`cc-${r.id}`} value={String(val(r, "condition_champ") ?? "")} onChange={(v) => maj(r.id, "condition_champ", v)} />
            <Champ label="Condition (valeur)" id={`cv-${r.id}`} value={String(val(r, "condition_valeur") ?? "")} onChange={(v) => maj(r.id, "condition_valeur", v || null)} />
            <Champ label="Type de document" id={`td-${r.id}`} value={String(val(r, "type_document") ?? "")} onChange={(v) => maj(r.id, "type_document", v)} />
            <Champ label="Libellé client" id={`lc-${r.id}`} value={String(val(r, "libelle_client") ?? "")} onChange={(v) => maj(r.id, "libelle_client", v)} />
            <Champ label="Aide client" id={`ac-${r.id}`} value={String(val(r, "aide_client") ?? "")} onChange={(v) => maj(r.id, "aide_client", v || null)} />
            <div className="space-y-1.5">
              <Label htmlFor={`or-${r.id}`}>Origine</Label>
              <Select value={String(val(r, "origine"))} onValueChange={(v) => maj(r.id, "origine", v)}>
                <SelectTrigger id={`or-${r.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_fournir">À fournir par le client</SelectItem>
                  <SelectItem value="genere">Généré par la plateforme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Champ label="Ordre" id={`od-${r.id}`} type="number" value={String(val(r, "ordre") ?? "")} onChange={(v) => maj(r.id, "ordre", Number(v))} />
            <div className="flex items-center gap-3 pt-6">
              <Switch id={`ob-${r.id}`} checked={Boolean(val(r, "obligatoire"))} onCheckedChange={(v) => maj(r.id, "obligatoire", v)} />
              <Label htmlFor={`ob-${r.id}`}>Obligatoire</Label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => enregistrer(r)} disabled={!brouillons[r.id]}>
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => supprimer(r.id)}>
              Supprimer
            </Button>
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-border p-4">
        <h3 className="font-medium">Ajouter une règle</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Champ label="Condition (champ)" id="n-cc" value={nouvelle.condition_champ} onChange={(v) => setNouvelle({ ...nouvelle, condition_champ: v })} />
          <Champ label="Condition (valeur)" id="n-cv" value={nouvelle.condition_valeur} onChange={(v) => setNouvelle({ ...nouvelle, condition_valeur: v })} />
          <Champ label="Type de document" id="n-td" value={nouvelle.type_document} onChange={(v) => setNouvelle({ ...nouvelle, type_document: v })} />
          <Champ label="Libellé client" id="n-lc" value={nouvelle.libelle_client} onChange={(v) => setNouvelle({ ...nouvelle, libelle_client: v })} />
          <Champ label="Aide client" id="n-ac" value={nouvelle.aide_client} onChange={(v) => setNouvelle({ ...nouvelle, aide_client: v })} />
          <div className="space-y-1.5">
            <Label htmlFor="n-or">Origine</Label>
            <Select value={nouvelle.origine} onValueChange={(v) => setNouvelle({ ...nouvelle, origine: v })}>
              <SelectTrigger id="n-or">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_fournir">À fournir par le client</SelectItem>
                <SelectItem value="genere">Généré par la plateforme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Champ label="Ordre" id="n-od" type="number" value={String(nouvelle.ordre)} onChange={(v) => setNouvelle({ ...nouvelle, ordre: Number(v) })} />
          <div className="flex items-center gap-3 pt-6">
            <Switch id="n-ob" checked={nouvelle.obligatoire} onCheckedChange={(v) => setNouvelle({ ...nouvelle, obligatoire: v })} />
            <Label htmlFor="n-ob">Obligatoire</Label>
          </div>
        </div>
        <Button className="mt-3" size="sm" onClick={ajouter}>
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function Champ({
  label,
  id,
  value,
  onChange,
  type,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------------- Rôles ---------------- */

function OngletRoles({ currentUserId }: { currentUserId: string | null }) {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-utilisateurs"],
    queryFn: async () => {
      const [{ data: profils, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, prenom, nom, email, created_at").order("created_at"),
        supabase.from("user_roles").select("id, user_id, role"),
      ]);
      if (error) throw error;
      return { profils: profils ?? [], roles: (roles ?? []) as { id: string; user_id: string; role: Role }[] };
    },
  });

  async function changerRole(userId: string, role: Role) {
    const { error: errIns } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (errIns && !errIns.message.includes("duplicate")) {
      toast.error("Attribution impossible.");
      return;
    }
    const { error: errDel } = await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", role);
    if (errDel) {
      toast.error(
        errDel.message.includes("dernier administrateur")
          ? "Impossible de retirer le dernier administrateur."
          : "Mise à jour impossible.",
      );
      qc.invalidateQueries({ queryKey: ["admin-utilisateurs"] });
      return;
    }
    toast.success("Rôle mis à jour.");
    qc.invalidateQueries({ queryKey: ["admin-utilisateurs"] });
  }

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;

  const q = filtre.trim().toLowerCase();
  const profils = (data?.profils ?? []).filter(
    (p) =>
      q === "" ||
      p.email.toLowerCase().includes(q) ||
      `${p.prenom} ${p.nom}`.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Le tout premier compte créé sur la plateforme reçoit automatiquement le rôle administrateur. Vous pouvez
        ensuite attribuer un rôle à n'importe quel utilisateur. Le dernier administrateur ne peut pas être rétrogradé.
      </p>
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="filtre-users">Rechercher un utilisateur</Label>
        <Input id="filtre-users" placeholder="Nom ou e-mail" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Utilisateur</th>
              <th className="p-3 font-medium">E-mail</th>
              <th className="p-3 font-medium">Inscription</th>
              <th className="p-3 font-medium">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {profils.map((p) => {
              const roles = (data?.roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role);
              const roleCourant: Role = roles.includes("admin")
                ? "admin"
                : roles.includes("cabinet")
                  ? "cabinet"
                  : "client";
              return (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3">
                    {`${p.prenom} ${p.nom}`.trim() || "—"}
                    {p.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}
                  </td>
                  <td className="p-3">{p.email}</td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-3">
                    <Select value={roleCourant} onValueChange={(v) => changerRole(p.id, v as Role)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
            {profils.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={4}>
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Signatures électroniques ---------------- */

type SignatureLigne = {
  id: string;
  provider: string | null;
  provider_ref: string | null;
  signe_le: string | null;
  statut: string | null;
  libelle: string | null;
  dossier_id: string | null;
  dossiers: { denomination: string | null } | null;
};

function OngletSignatures() {
  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ["admin-signatures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signatures_electroniques")
        .select("id, provider, provider_ref, signe_le, statut, libelle, dossier_id, dossiers(denomination)")
        .order("signe_le", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as SignatureLigne[];
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4">
      <ReglagesRelanceSignature />

      <p className="text-sm text-muted-foreground">Suivi des documents à signer.</p>



      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Dossier</th>
              <th className="p-3 font-medium">Document</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Prestataire</th>
              <th className="p-3 font-medium">Référence</th>
              <th className="p-3 font-medium">Signé le</th>
            </tr>
          </thead>
          <tbody>
            {signatures.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="p-3">{s.dossiers?.denomination ?? "—"}</td>
                <td className="p-3">{s.libelle ?? "—"}</td>
                <td className="p-3">{s.statut ?? "—"}</td>
                <td className="p-3">{s.provider ?? "—"}</td>
                <td className="p-3">{s.provider_ref ?? "—"}</td>
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {s.signe_le ? new Date(s.signe_le).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
            {signatures.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  Aucune signature enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
