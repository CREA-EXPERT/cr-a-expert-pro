import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { listerEmailsTest, reenvoyerEmailTest } from "@/lib/emails-test.functions";

export const Route = createFileRoute("/_authenticated/cabinet/emails-test")({
  head: () => ({
    meta: [
      { title: "Boîte de réception de test — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Lecture des emails interceptés en environnement de test, filtrables par dossier et par étiquette.",
      },
      { property: "og:title", content: "Boîte de réception de test — CREA EXPERT" },
      { property: "og:description", content: "Emails interceptés en environnement de test." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailsTest,
});

function EmailsTest() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user);
  const lister = useServerFn(listerEmailsTest);
  const renvoyer = useServerFn(reenvoyerEmailTest);

  const [dossierId, setDossierId] = useState("");
  const [tag, setTag] = useState("");
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtres = {
    ...(dossierId.trim() ? { dossierId: dossierId.trim() } : {}),
    ...(tag.trim() ? { tag: tag.trim() } : {}),
    ...(recherche.trim() ? { recherche: recherche.trim() } : {}),
  };

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["emails-test", filtres],
    enabled: isAdmin,
    queryFn: () => lister({ data: filtres }),
  });

  async function retenter(id: string) {
    setBusy(true);
    try {
      const r = await renvoyer({ data: { id } });
      if (r.envoye) toast.success("Message renvoyé hors environnement de test.");
      else if (r.raison === "non_configure")
        toast.error("Envoi impossible : la connexion d'envoi n'est pas configurée.");
      else toast.error("Le renvoi a échoué.");
      await refetch();
    } catch {
      toast.error("Le renvoi a échoué.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  if (!isAdmin) {
    return (
      <PageShell titre="Accès réservé">
        <p className="text-muted-foreground">
          Cette page est réservée à l'administrateur.{" "}
          <Link to="/tableau-de-bord" className="underline">
            Retour au tableau de bord
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const emails = data?.emails ?? [];

  return (
    <PageShell
      titre="Boîte de réception de test"
      sousTitre="Emails interceptés en environnement de test automatisé (aucun envoi réel n'a eu lieu)."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtre-dossier">Dossier (identifiant)</Label>
          <Input
            id="filtre-dossier"
            value={dossierId}
            onChange={(e) => setDossierId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtre-tag">Étiquette</Label>
          <Input
            id="filtre-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="dossier_ouvert"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtre-destinataire">Destinataire</Label>
          <Input
            id="filtre-destinataire"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="client+test@example.fr"
          />
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {isLoading ? "Chargement…" : `${emails.length} message(s).`}
      </p>

      <ul className="mt-3 space-y-3">
        {emails.map((email) => (
          <li key={email.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{email.tag}</Badge>
              {email.pour_cabinet ? <Badge variant="outline">Cabinet</Badge> : null}
              <span className="text-sm font-medium">{email.sujet}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {email.destinataire} — {new Date(email.created_at).toLocaleString("fr-FR")}
              {email.dossier_id ? ` — dossier ${email.dossier_id.slice(0, 8)}…` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOuvert(ouvert === email.id ? null : email.id)}
              >
                {ouvert === email.id ? "Masquer le contenu" : "Voir le contenu"}
              </Button>
              <Button size="sm" disabled={busy} onClick={() => retenter(email.id)}>
                Re-tenter l'envoi réel
              </Button>
            </div>
            {ouvert === email.id ? (
              <div
                className="prose prose-sm mt-3 max-w-none rounded-md bg-muted/40 p-3"
                // Contenu produit par l'application elle-même, jamais par un tiers.
                dangerouslySetInnerHTML={{ __html: email.corps }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
