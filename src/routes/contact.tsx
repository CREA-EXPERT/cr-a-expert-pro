import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { envoyerMessageContact } from "@/lib/contact.functions";
import {
  CATEGORIES_CONTACT,
  EMAIL_CABINET,
  EMAIL_CONTACT,
  declencheEnvoi,
  type CategorieContact,
} from "@/lib/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — CREA EXPERT" },
      {
        name: "description",
        content:
          "Adressez votre demande à CREA EXPERT : amélioration, bug, dossier en cours, paiement, ou consultation avec un expert-comptable.",
      },
      { property: "og:title", content: "Contact — CREA EXPERT" },
      {
        property: "og:description",
        content: "Suggestions, bugs, dossier en cours, paiement, ou consultation payante avec un expert-comptable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://crea-expert.fr/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const { user } = useAuth();
  const [categorie, setCategorie] = useState<CategorieContact>("amelioration");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [piege, setPiege] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [recap, setRecap] = useState<{
    reference: string;
    categorie: string;
    email: string;
    dossier_id: string | null;
    message: string;
    horodatage: string;
  } | null>(null);
  const [dossierId, setDossierId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail((e) => e || (user.email as string));
    if (!user) {
      setDossierId(null);
      return;
    }
    let actif = true;
    supabase
      .from("dossiers")
      .select("id")
      .eq("user_id", user.id)
      .order("date_derniere_activite", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (actif) setDossierId((data?.[0]?.id as string | undefined) ?? null);
      });
    return () => {
      actif = false;
    };
  }, [user]);

  const avecEnvoi = declencheEnvoi(categorie);
  const dossierSansCompte = categorie === "dossier" && !user;

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("Merci de détailler votre demande en quelques mots.");
      return;
    }
    setEnvoi(true);
    try {
      const reponse = await envoyerMessageContact({
        data: {
          categorie,
          message: message.trim().slice(0, 2000),
          email: email.trim(),
          dossier_id: categorie === "dossier" ? dossierId : null,
          user_id: user?.id ?? null,
          piege: piege || undefined,
        },
      });
      setEnvoi(false);
      if (!reponse.ok) {
        toast.error(
          reponse.raison === "trop_de_demandes"
            ? "Trop de messages envoyés depuis cet appareil. Réessayez dans une heure."
            : "Votre message n'a pas pu être transmis.",
        );
        return;
      }
      setRecap(reponse.recapitulatif ?? null);
      setMessage("");
      setConfirme(true);
    } catch {
      setEnvoi(false);
      toast.error("Votre message n'a pas pu être transmis.");
    }
  }

  return (
    <PageShell>
      <div className="container-page max-w-3xl space-y-10 py-12">
        <header>
          <h1 className="font-serif text-4xl">Contact</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Indiquez l'objet de votre message : chaque demande est orientée vers la bonne réponse.
          </p>
        </header>

        <section className="space-y-3">
          <Label htmlFor="contact-objet">Quel est l'objet de votre message ?</Label>
          <select
            id="contact-objet"
            data-testid="contact-objet"
            value={categorie}
            onChange={(e) => {
              setCategorie(e.target.value as CategorieContact);
              setConfirme(false);
            }}
            className="h-11 w-full rounded-md border border-input bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES_CONTACT.map((c) => (
              <option key={c.cle} value={c.cle}>
                {c.libelle}
              </option>
            ))}
          </select>
        </section>

        {!avecEnvoi && (
          <section className="space-y-5" data-testid="bloc-avis">
            <p className="text-base leading-relaxed text-justify">
              Pour toute question sur votre situation (choix de forme, fiscalité, régime social…),
              la bonne réponse suppose une analyse par un professionnel.
            </p>
            <ConsultationExpertCard />
            <p className="text-sm text-muted-foreground">
              Vous cherchez d'abord une information générale et gratuite ?{" "}
              <Link to="/simulateur" className="underline underline-offset-2">
                Comparer les formes juridiques
              </Link>
              .
            </p>
          </section>
        )}

        {avecEnvoi && confirme && (
          <section
            role="status"
            data-testid="contact-confirmation"
            className="rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="font-serif text-xl">Message transmis</h2>
            <p className="mt-2 text-base leading-relaxed">
              Votre message a bien été transmis au cabinet. Une réponse vous parviendra à l'adresse
              indiquée.
            </p>
            {recap && (
              <>
                <p className="mt-4 text-base">
                  Numéro de demande :{" "}
                  <span className="font-mono font-semibold" data-testid="contact-reference">
                    {recap.reference}
                  </span>
                </p>
                <dl className="mt-4 divide-y divide-border rounded-md border border-border">
                  <div className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-sm text-muted-foreground">Objet</dt>
                    <dd className="text-sm">
                      {CATEGORIES_CONTACT.find((c) => c.cle === recap.categorie)?.libelle ??
                        recap.categorie}
                    </dd>
                  </div>
                  <div className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-sm text-muted-foreground">Adresse indiquée</dt>
                    <dd className="text-sm">{recap.email}</dd>
                  </div>
                  {recap.dossier_id && (
                    <div className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
                      <dt className="text-sm text-muted-foreground">Dossier joint</dt>
                      <dd className="font-mono text-sm">{recap.dossier_id}</dd>
                    </div>
                  )}
                  <div className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-sm text-muted-foreground">Envoyé le</dt>
                    <dd className="text-sm">
                      {new Date(recap.horodatage).toLocaleString("fr-FR")}
                    </dd>
                  </div>
                  <div className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-sm text-muted-foreground">Message</dt>
                    <dd className="whitespace-pre-wrap text-sm">{recap.message}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Conservez ce numéro : il identifie votre demande dans nos échanges.
                </p>
              </>
            )}
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                setConfirme(false);
                setRecap(null);
              }}
            >
              Envoyer un autre message
            </Button>
          </section>
        )}

        {avecEnvoi && !confirme && (
          <form onSubmit={soumettre} className="space-y-5" data-testid="contact-formulaire">
            {dossierSansCompte && (
              <p className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
                Pour une question sur votre dossier en cours,{" "}
                <Link to="/auth" className="underline underline-offset-2">
                  connectez-vous à votre compte
                </Link>{" "}
                : votre dossier sera automatiquement joint à votre message.
              </p>
            )}
            {categorie === "dossier" && dossierId && (
              <p className="text-sm text-muted-foreground">
                Dossier joint automatiquement : <span className="font-mono">{dossierId}</span>
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="contact-email">Adresse électronique</Label>
              <Input
                id="contact-email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Votre message</Label>
              <Textarea
                id="contact-message"
                rows={7}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{message.length} / 2000 caractères</p>
            </div>

            <input
              type="text"
              name="societe_web"
              value={piege}
              onChange={(e) => setPiege(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            <Button type="submit" disabled={envoi || dossierSansCompte}>
              {envoi ? "Envoi…" : "Envoyer mon message"}
            </Button>
          </form>
        )}

        <section className="rounded-lg border border-border bg-muted/40 p-5">
          <h2 className="font-serif text-lg">Vos données personnelles</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Pour exercer vos droits sur vos données (accès, rectification, suppression, export),
            utilisez l'espace{" "}
            <Link to="/mon-compte" className="underline underline-offset-2">
              « Mes données »
            </Link>{" "}
            de votre compte ou écrivez à {EMAIL_CONTACT} — démarche gratuite. Voir la{" "}
            <Link to="/confidentialite" className="underline underline-offset-2">
              politique de confidentialité
            </Link>
            .
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Les travaux de conseil et de création sont réalisés par le cabinet d'expertise comptable
            partenaire ({EMAIL_CABINET}), à qui vos demandes sont transmises. Le cabinet ne répond
            pas aux sollicitations directes : l'assistance d'un expert-comptable se réserve et se
            règle via la consultation ci-dessus.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
