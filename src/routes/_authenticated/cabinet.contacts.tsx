import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES_CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/_authenticated/cabinet/contacts")({
  head: () => ({
    meta: [
      { title: "Journal des demandes de contact — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Historique des messages reçus depuis la page de contact, avec export CSV.",
      },
      { property: "og:title", content: "Journal des demandes de contact — CREA EXPERT" },
      { property: "og:description", content: "Suivi des demandes entrantes du site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalContacts,
});

const LIBELLE_CATEGORIE = Object.fromEntries(
  CATEGORIES_CONTACT.map((c) => [c.cle, c.libelle]),
) as Record<string, string>;

function champCsv(valeur: string | null | undefined) {
  return `"${(valeur ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function JournalContacts() {
  const { user } = useAuth();
  const { isCabinet, loading: rolesLoading } = useRoles(user);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("toutes");

  const { data, isLoading } = useQuery({
    queryKey: ["journal-contacts"],
    enabled: isCabinet,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes_contact")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      const okCat = categorie === "toutes" || d.categorie === categorie;
      const okQ =
        q === "" ||
        d.reference.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.message.toLowerCase().includes(q) ||
        (d.dossier_id ?? "").toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [data, recherche, categorie]);

  function exporterCsv() {
    const entetes = [
      "reference",
      "date",
      "categorie",
      "email",
      "dossier_id",
      "user_id",
      "envoye",
      "test",
      "objet",
      "message",
    ];
    const corps = lignes.map((d) =>
      [
        d.reference,
        new Date(d.created_at).toISOString(),
        LIBELLE_CATEGORIE[d.categorie] ?? d.categorie,
        d.email,
        d.dossier_id ?? "",
        d.user_id ?? "",
        d.envoye ? "oui" : "non",
        d.test ? "oui" : "non",
        d.objet ?? "",
        d.message,
      ]
        .map(champCsv)
        .join(";"),
    );
    const contenu = `\uFEFF${entetes.join(";")}\n${corps.join("\n")}`;
    const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `demandes-contact-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rolesLoading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!isCabinet) {
    return (
      <PageShell>
        <div className="container-page max-w-xl py-14">
          <h1 className="font-serif text-3xl">Accès réservé</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Cet espace est réservé aux collaborateurs du cabinet partenaire.
          </p>
          <Button asChild className="mt-6">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container-page space-y-8 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">Demandes reçues depuis la page Contact</h1>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Amélioration, bug, dossier en cours, paiement : seules ces catégories déclenchent un
              message. Les demandes d'avis sont orientées vers la consultation avec un
              expert-comptable et n'apparaissent pas ici.
            </p>
          </div>
          <Button variant="outline" onClick={exporterCsv} disabled={lignes.length === 0}>
            Exporter en CSV
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-[1fr_18rem]">
          <div className="space-y-1.5">
            <Label htmlFor="recherche-contact">Rechercher</Label>
            <Input
              id="recherche-contact"
              placeholder="Numéro de demande, adresse, contenu…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-categorie">Catégorie</Label>
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger id="filtre-categorie">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {CATEGORIES_CONTACT.filter((c) => c.prefixe).map((c) => (
                  <SelectItem key={c.cle} value={c.cle}>
                    {c.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : lignes.length === 0 ? (
          <p className="text-muted-foreground">Aucune demande ne correspond à votre recherche.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Numéro</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Catégorie</th>
                  <th className="p-3 font-medium">Adresse</th>
                  <th className="p-3 font-medium">Dossier</th>
                  <th className="p-3 font-medium">Envoi</th>
                  <th className="p-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="p-3 font-mono whitespace-nowrap">{d.reference}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {new Date(d.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="p-3">
                      {LIBELLE_CATEGORIE[d.categorie] ?? d.categorie}
                      {d.test && (
                        <Badge className="ml-2" variant="secondary">
                          TEST
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">{d.email}</td>
                    <td className="p-3 font-mono text-xs">{d.dossier_id ?? "—"}</td>
                    <td className="p-3">{d.envoye ? "Transmis" : "Non transmis"}</td>
                    <td className="max-w-md p-3 whitespace-pre-wrap">{d.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
