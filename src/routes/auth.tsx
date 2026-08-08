import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Créer un compte ou se connecter — CREA EXPERT" },
      {
        name: "description",
        content:
          "Accédez à votre espace CREA EXPERT pour compléter votre dossier de création de société et suivre son avancement.",
      },
      { property: "og:title", content: "Votre espace CREA EXPERT" },
      { property: "og:description", content: "Connexion et création de compte." },
    ],
  }),
  component: Auth,
});

const inscriptionSchema = z.object({
  prenom: z.string().trim().min(1, "Le prénom est obligatoire.").max(80),
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(80),
  email: z.string().trim().email("Adresse électronique invalide.").max(255),
  telephone: z.string().trim().max(30).optional(),
  motdepasse: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères.").max(128),
});

function Auth() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const cible = search.redirect ?? "/tableau-de-bord";

  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [pass, setPass] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPass,
    });
    setBusy(false);
    if (error) {
      toast.error("Identifiants incorrects ou compte non confirmé.");
      return;
    }
    navigate({ to: cible as string, replace: true });
  }

  async function inscription(e: React.FormEvent) {
    e.preventDefault();
    if (!rgpd) {
      toast.error("Vous devez accepter le traitement de vos données pour créer un compte.");
      return;
    }
    const parsed = inscriptionSchema.safeParse({ prenom, nom, email, telephone, motdepasse: pass });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire incomplet.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.motdepasse,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          prenom: parsed.data.prenom,
          nom: parsed.data.nom,
          telephone: parsed.data.telephone ?? null,
          consent_marketing: marketing,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("already")
          ? "Un compte existe déjà avec cette adresse."
          : "La création du compte a échoué.",
      );
      return;
    }
    if (data.session) {
      navigate({ to: cible as string, replace: true });
      return;
    }
    setConfirmation(true);
  }

  return (
    <PageShell>
      <div className="container-page max-w-md py-14">
        <h1 className="font-serif text-3xl">Votre espace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Créez votre compte pour compléter votre dossier et suivre son avancement.
        </p>

        {confirmation ? (
          <div className="mt-8 rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Vérifiez votre boîte de réception</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Un message de confirmation vient d'être envoyé à <strong>{email}</strong>. Cliquez sur
              le lien qu'il contient pour activer votre compte, puis connectez-vous.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setConfirmation(false)}>
              Revenir
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="inscription" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inscription">Créer un compte</TabsTrigger>
              <TabsTrigger value="connexion">Se connecter</TabsTrigger>
            </TabsList>

            <TabsContent value="inscription">
              <form onSubmit={inscription} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={80} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse électronique</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Téléphone (facultatif)</Label>
                  <Input id="tel" type="tel" autoComplete="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">Mot de passe</Label>
                  <Input id="pass" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={8} maxLength={128} required />
                  <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
                </div>

                <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
                  <Checkbox id="rgpd" checked={rgpd} onCheckedChange={(v) => setRgpd(v === true)} className="mt-0.5" />
                  <Label htmlFor="rgpd" className="text-sm font-normal leading-relaxed">
                    J'accepte le traitement de mes données dans les conditions décrites par la{" "}
                    <Link to="/confidentialite" className="underline underline-offset-2">
                      politique de confidentialité
                    </Link>
                    . (obligatoire)
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox id="mkt" checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5" />
                  <Label htmlFor="mkt" className="text-sm font-normal leading-relaxed">
                    J'accepte de recevoir des informations par email. (facultatif)
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Création…" : "Créer mon compte"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="connexion">
              <form onSubmit={connexion} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lemail">Adresse électronique</Label>
                  <Input id="lemail" type="email" autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lpass">Mot de passe</Label>
                  <Input id="lpass" type="password" autoComplete="current-password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Connexion…" : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}
