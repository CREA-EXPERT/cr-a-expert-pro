import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ZoneTrace } from "@/components/ZoneTrace";
import { ouvrirSignature, signerAvecLien } from "@/lib/signature.functions";

export const Route = createFileRoute("/signer/$jeton")({
  head: () => ({
    meta: [
      { title: "Signer un document — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Signature électronique simple d'un document de création de société, avec preuve horodatée conservée.",
      },
      { property: "og:title", content: "Signer un document — CREA EXPERT" },
      {
        property: "og:description",
        content: "Espace de signature nominatif et sécurisé de votre dossier de création.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageSignature,
});

function PageSignature() {
  const { jeton } = Route.useParams();
  const ouvrir = useServerFn(ouvrirSignature);
  const signer = useServerFn(signerAvecLien);

  const [methode, setMethode] = useState<"trace" | "saisie">("trace");
  const [nom, setNom] = useState("");
  const [trace, setTrace] = useState<string | null>(null);
  const [consentement, setConsentement] = useState(false);
  const [fait, setFait] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["signature", jeton],
    queryFn: () => ouvrir({ data: { jeton } }),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await signer({
        data: {
          jeton,
          methode,
          consentement: true as const,
          nom: nom.trim(),
          ...(methode === "trace" && trace ? { tracePng: trace } : {}),
        },
      });
      if (!r.signe) throw new Error(messageRefus(r.raison));
      return r;
    },
    onSuccess: () => {
      setFait(true);
      toast.success("Votre signature a bien été enregistrée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="container-page max-w-3xl py-16">
          <p className="text-muted-foreground">Chargement du document…</p>
        </div>
      </PageShell>
    );
  }

  if (!data?.valide) {
    return (
      <PageShell>
        <div className="container-page max-w-2xl space-y-4 py-16">
          <h1 className="font-serif text-3xl">Lien de signature indisponible</h1>
          <p className="leading-relaxed text-muted-foreground">
            {data?.raison === "lien_expire"
              ? "Ce lien a dépassé sa durée de validité. Demandez-nous un nouveau lien : il vous sera renvoyé par email."
              : "Ce lien n'est pas valide. Vérifiez que vous avez ouvert le lien reçu par email, sans le modifier."}
          </p>
        </div>
      </PageShell>
    );
  }

  const pretASigner =
    consentement && nom.trim().length >= 2 && (methode === "saisie" || Boolean(trace));

  return (
    <PageShell>
      <div className="container-page max-w-3xl space-y-6 py-12">
        <header className="space-y-1">
          <h1 className="font-serif text-3xl">{data.libelle}</h1>
          <p className="text-muted-foreground">
            {data.denomination} — signataire : {data.signataireNom}
          </p>
        </header>

        {data.aide && <p className="leading-relaxed text-muted-foreground">{data.aide}</p>}

        {data.blocage && (
          <Alert>
            <AlertDescription>{data.blocage}</AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-md border border-border bg-muted/30">
          {data.url ? (
            <object data={data.url} type="application/pdf" className="h-[60vh] w-full">
              <iframe src={data.url} title={`Aperçu de ${data.libelle}`} className="h-[60vh] w-full" />
            </object>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Le document n'est pas encore disponible. Réessayez dans quelques instants.
            </p>
          )}
        </div>

        {fait || data.dejaSigne ? (
          <Alert>
            <AlertDescription>
              Ce document est signé de votre part. La preuve associée (horodatage et empreinte du
              document) est conservée. Le document sera finalisé lorsque tous les signataires auront
              signé.
            </AlertDescription>
          </Alert>
        ) : (
          <section className="space-y-5 rounded-lg border border-border bg-surface p-5">
            <p className="text-sm leading-relaxed">
              Signature électronique simple : en signant, vous vous engagez ; une preuve (horodatage
              et empreinte du document) est conservée.
            </p>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consentement"
                checked={consentement}
                onCheckedChange={(v) => setConsentement(v === true)}
              />
              <Label htmlFor="consentement" className="text-sm font-normal leading-relaxed">
                J'ai lu le document et je consens à le signer électroniquement.
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={methode === "trace" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethode("trace")}
              >
                Tracer ma signature
              </Button>
              <Button
                type="button"
                variant={methode === "saisie" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethode("saisie")}
              >
                Saisir mon nom
              </Button>
            </div>

            {methode === "trace" && <ZoneTrace onTrace={setTrace} />}

            <div className="space-y-2">
              <Label htmlFor="nom">Nom et prénom du signataire</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={data.signataireNom}
              />
            </div>

            <Button
              disabled={!pretASigner || Boolean(data.blocage) || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Enregistrement…" : "Signer le document"}
            </Button>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function messageRefus(raison: string | null) {
  switch (raison) {
    case "lien_expire":
      return "Ce lien a dépassé sa durée de validité. Demandez-nous un nouveau lien.";
    case "chronologie":
      return "L'ordre des dates du dossier doit être corrigé avant de signer les statuts.";
    case "document_indisponible":
      return "Le document n'est pas disponible pour le moment. Réessayez dans quelques instants.";
    default:
      return "Ce lien n'est pas valide.";
  }
}
