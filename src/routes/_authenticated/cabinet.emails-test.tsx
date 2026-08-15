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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listerEmailsTest,
  purgerEmailsTest,
  reenvoyerEmailTest,
} from "@/lib/emails-test.functions";

export const Route = createFileRoute("/_authenticated/cabinet/emails-test")({
  head: () => ({
    meta: [
      { title: "Boîte de réception de test — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Lecture des emails interceptés en environnement de test, filtrables par dossier, étiquette et période.",
      },
      { property: "og:title", content: "Boîte de réception de test — CREA EXPERT" },
      { property: "og:description", content: "Emails interceptés en environnement de test." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailsTest,
});

type EmailTest = {
  id: string;
  dossier_id: string | null;
  destinataire: string;
  sujet: string;
  corps: string;
  tag: string;
  pour_cabinet: boolean;
  ordre: number;
  created_at: string;
};

/** Conversion HTML → texte lisible, pour l'affichage en lecture seule et le CSV. */
function enTexte(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function exporterCsv(emails: EmailTest[]) {
  const entetes = [
    "date",
    "destinataire",
    "etiquette",
    "pour_cabinet",
    "dossier",
    "objet",
    "contenu_texte",
  ];
  const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lignes = emails.map((e) =>
    [
      new Date(e.created_at).toLocaleString("fr-FR"),
      e.destinataire,
      e.tag,
      e.pour_cabinet ? "oui" : "non",
      e.dossier_id ?? "",
      e.sujet,
      enTexte(e.corps),
    ]
      .map(echapper)
      .join(";"),
  );
  const contenu = "\uFEFF" + [entetes.join(";"), ...lignes].join("\r\n");
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `emails-test-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EmailsTest() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user);
  const lister = useServerFn(listerEmailsTest);
  const renvoyer = useServerFn(reenvoyerEmailTest);
  const purger = useServerFn(purgerEmailsTest);

  const [dossierId, setDossierId] = useState("");
  const [tag, setTag] = useState("");
  const [recherche, setRecherche] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [page, setPage] = useState(1);
  const [parPage] = useState(25);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtres = {
    ...(dossierId.trim() ? { dossierId: dossierId.trim() } : {}),
    ...(tag.trim() ? { tag: tag.trim() } : {}),
    ...(recherche.trim() ? { recherche: recherche.trim() } : {}),
    ...(du ? { du } : {}),
    ...(au ? { au } : {}),
    page,
    parPage,
  };

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["emails-test", filtres],
    enabled: isAdmin,
    queryFn: () => lister({ data: filtres }),
  });

  function majFiltre(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(1);
    };
  }

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

  async function lancerPurge() {
    setBusy(true);
    try {
      const r = await purger({ data: { confirmation: "PURGER" as const } });
      toast.success(`${r.supprimes} message(s) supprimé(s).`);
      setPage(1);
      await refetch();
    } catch {
      toast.error("La purge a échoué.");
    } finally {
      setBusy(false);
    }
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
          <p className="mt-3 text-base text-muted-foreground">
            La boîte de réception de test est réservée à l'administrateur.
          </p>
          <Button asChild className="mt-6">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const emails = (data?.emails ?? []) as EmailTest[];
  const total = data?.total ?? 0;
  const nbPages = Math.max(1, Math.ceil(total / parPage));

  return (
    <PageShell>
      <div className="container-page max-w-4xl space-y-6 py-10">
        <header>
          <h1 className="font-serif text-3xl">Boîte de réception de test</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-justify text-muted-foreground">
            Emails interceptés en environnement de test automatisé : aucun envoi réel n'a eu lieu.
            Le renvoi force un envoi réel du message sélectionné.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="filtre-dossier">Dossier (identifiant)</Label>
            <Input
              id="filtre-dossier"
              value={dossierId}
              onChange={(e) => majFiltre(setDossierId)(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-tag">Étiquette</Label>
            <Input
              id="filtre-tag"
              value={tag}
              onChange={(e) => majFiltre(setTag)(e.target.value)}
              placeholder="dossier_ouvert"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-destinataire">Destinataire</Label>
            <Input
              id="filtre-destinataire"
              value={recherche}
              onChange={(e) => majFiltre(setRecherche)(e.target.value)}
              placeholder="client+test@example.fr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-du">Du</Label>
            <Input
              id="filtre-du"
              type="date"
              value={du}
              onChange={(e) => majFiltre(setDu)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-au">Au</Label>
            <Input
              id="filtre-au"
              type="date"
              value={au}
              onChange={(e) => majFiltre(setAu)(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={emails.length === 0}
            onClick={() => exporterCsv(emails)}
          >
            Exporter en CSV
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={busy}>
                Purger les messages des dossiers de test
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Purger la boîte de test ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tous les messages interceptés rattachés à un dossier marqué comme dossier de test
                  seront définitivement supprimés. Les messages liés aux dossiers réels ne sont pas
                  concernés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => void lancerPurge()}>
                  Confirmer la purge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <span className="text-sm text-muted-foreground">
            {isLoading ? "Chargement…" : `${total} message(s) — page ${page} sur ${nbPages}.`}
          </span>
        </div>

        <ul className="space-y-3">
          {emails.map((email) => (
            <li key={email.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{email.tag}</Badge>
                {email.pour_cabinet ? <Badge variant="outline">Cabinet</Badge> : null}
                <span className="text-sm font-medium">{email.sujet}</span>
              </div>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="font-medium">Destinataire :</dt>
                  <dd>{email.destinataire}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Reçu le :</dt>
                  <dd>{new Date(email.created_at).toLocaleString("fr-FR")}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Étiquette :</dt>
                  <dd>{email.tag}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Dossier :</dt>
                  <dd>{email.dossier_id ?? "—"}</dd>
                </div>
              </dl>
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
                <div className="mt-3 space-y-3 rounded-md bg-muted/40 p-3">
                  <p className="text-sm font-medium">Objet : {email.sujet}</p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {enTexte(email.corps)}
                  </pre>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Page précédente
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= nbPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Page suivante
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
