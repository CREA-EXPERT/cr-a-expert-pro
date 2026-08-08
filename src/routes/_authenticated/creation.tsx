import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/Disclaimer";
import { CallbackDialog } from "@/components/CallbackDialog";
import {
  FORMES,
  FORMES_COMMUNAUTE,
  MOIS,
  OBJETS_TYPES,
  REGIMES,
  REGIMES_COMMUNAUTAIRES,
  REGIME_DEFAUT,
  SITUATIONS,
  TVA_OPTIONS,
  dernierJourDuMois,
  euro,
  fonctionsPour,
  isCivile,
  isEI,
  isSas,
  liberationMin,
  type Forme,
} from "@/lib/domain";
import { construireDocuments, type Associe, type Dossier } from "@/lib/documents";
import {
  coutParForme,
  missionMensuelleHt,
  penaliteCreationHt,
  prixRelectureHt,
  tarifMap,
  useTarifs,
} from "@/lib/tarifs";
import { NafSelect } from "@/components/NafSelect";
import { AssocieIdentite } from "@/components/AssocieIdentite";
import {
  EncadreCloture,
  EncadreCompositionForme,
  EncadreDemembrement,
  EncadreGouvernance,
  EncadreTva,
} from "@/components/EncadresPedago";
import { estCodeReglemente } from "@/lib/naf-reglemente";
import { redigerObjetSocial } from "@/lib/objet-social.functions";
import { z } from "zod";
import { ArrowLeft, ExternalLink, Plus, Sparkle, Trash2 } from "lucide-react";


const searchSchema = z.object({ forme: z.string().optional() });

export const Route = createFileRoute("/_authenticated/creation")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Créer ma société — CREA EXPERT" },
      { name: "description", content: "Parcours guidé de création de société, sauvegardé à chaque étape." },
      { property: "og:title", content: "Créer ma société — CREA EXPERT" },
      { property: "og:description", content: "Complétez votre dossier de création en ligne." },
    ],
  }),
  component: Creation,
});

type Cle =
  | "forme"
  | "denomination"
  | "siege"
  | "objet"
  | "capital"
  | "associes"
  | "direction"
  | "options"
  | "mission"
  | "validation"
  | "paiement"
  | "recap";

const CLES_SOCIETE: Cle[] = [
  "forme",
  "denomination",
  "siege",
  "objet",
  "capital",
  "associes",
  "direction",
  "options",
  "mission",
  "validation",
  "paiement",
  "recap",
];

const CLES_EI: Cle[] = [
  "forme",
  "denomination",
  "siege",
  "objet",
  "associes",
  "options",
  "mission",
  "validation",
  "paiement",
  "recap",
];

const TITRES: Record<Cle, string> = {
  forme: "Forme juridique",
  denomination: "Dénomination (nom de la société)",
  siege: "Siège social",
  objet: "Objet social",
  capital: "Capital",
  associes: "Associés",
  direction: "Direction",
  options: "Options fiscales et sociales",
  mission: "Lettre de mission",
  validation: "Validation de votre dossier",
  paiement: "Frais légaux et moyen de paiement",
  recap: "Récapitulatif",
};

const champ = "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm";

function Creation() {
  const navigate = useNavigate();
  const { forme: formeInitiale } = Route.useSearch();
  const { data: tarifs } = useTarifs();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [etape, setEtape] = useState(1);
  const [certifie, setCertifie] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nomAcceptation, setNomAcceptation] = useState("");
  const [lueMission, setLueMission] = useState(false);
  const [descriptionActivite, setDescriptionActivite] = useState("");
  const [redaction, setRedaction] = useState(false);


  const { data: rules } = useQuery({
    queryKey: ["document_rules"],
    queryFn: async () => (await supabase.from("document_rules").select("*")).data ?? [],
  });

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      if (!sess.user) return;
      const { data: existants } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      let d = existants?.[0] ?? null;
      if (!d) {
        const { data: cree, error } = await supabase
          .from("dossiers")
          .insert({ user_id: sess.user.id })
          .select("*")
          .single();
        if (error) {
          toast.error("Impossible de créer le dossier.");
          return;
        }
        d = cree;
      }
      if (formeInitiale && FORMES.some((f) => f.value === formeInitiale) && d.forme_juridique !== formeInitiale) {
        await supabase.from("dossiers").update({ forme_juridique: formeInitiale }).eq("id", d.id);
        d = { ...d, forme_juridique: formeInitiale };
      }
      setDossier(d);
      setNomAcceptation(d.lettre_mission_nom ?? "");
      const nb = (isEI(d.forme_juridique) ? CLES_EI : CLES_SOCIETE).length;
      setEtape(Math.min(Math.max(d.etape_courante, 1), nb));
      const { data: as } = await supabase.from("associes").select("*").eq("dossier_id", d.id).order("created_at");
      setAssocies(as ?? []);
    })();
  }, [formeInitiale]);

  async function patch(valeurs: Partial<Dossier>) {
    if (!dossier) return;
    const suivant = { ...dossier, ...valeurs } as Dossier;
    setDossier(suivant);
    await supabase.from("dossiers").update(valeurs).eq("id", dossier.id);
  }

  async function allerA(n: number) {
    setEtape(n);
    await patch({ etape_courante: n });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function ajouterAssocie(type: "personne_physique" | "personne_morale") {
    if (!dossier) return;
    const { data, error } = await supabase
      .from("associes")
      .insert({ dossier_id: dossier.id, type })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Ajout impossible.");
      return;
    }
    setAssocies((a) => [...a, data]);
  }

  async function majAssocie(id: string, valeurs: Partial<Associe>) {
    setAssocies((list) => list.map((a) => (a.id === id ? { ...a, ...valeurs } : a)));
    await supabase.from("associes").update(valeurs).eq("id", id);
  }

  async function supprimerAssocie(id: string) {
    setAssocies((list) => list.filter((a) => a.id !== id));
    await supabase.from("associes").delete().eq("id", id);
  }

  async function proposerObjet() {
    if (!dossier) return;
    setRedaction(true);
    try {
      const res = await redigerObjetSocial({
        data: {
          activite: descriptionActivite.trim(),
          forme: dossier.forme_juridique,
          ...(dossier.code_naf
            ? { naf: `${dossier.code_naf} — ${dossier.code_naf_libelle ?? ""}`.trim() }
            : {}),
        },
      });

      if (res?.texte) {
        await patch({ objet_social: res.texte });
        toast.success("Proposition rédigée. Relisez-la et adaptez-la si nécessaire.");
      } else {
        toast.error(res?.erreur ?? "Aucune proposition n'a pu être générée.");
      }
    } catch {
      toast.error("L'assistance à la rédaction est momentanément indisponible.");
    } finally {
      setRedaction(false);
    }
  }

  const totalApports = useMemo(

    () => associes.filter((a) => a.est_associe).reduce((s, a) => s + Number(a.montant_apport || 0), 0),
    [associes],
  );
  const ei = dossier ? isEI(dossier.forme_juridique) : false;
  const capitalOk = dossier ? Math.abs(totalApports - Number(dossier.capital_montant)) < 0.01 : false;

  async function validerDossier() {
    if (!dossier || !rules) return;
    if (!certifie) {
      toast.error("Vous devez certifier l'exactitude des informations.");
      return;
    }
    if (!ei && !capitalOk) {
      toast.error("Le total des apports doit être égal au capital social.");
      return;
    }
    if (!dossier.lettre_mission_acceptee_le) {
      toast.error("La lettre de mission doit être acceptée avant de valider le dossier.");
      return;
    }
    if (!dossier.voie_validation) {
      toast.error("Choisissez la voie de validation de votre dossier.");
      return;
    }
    setBusy(true);
    const auto = dossier.voie_validation === "auto";
    const drafts = construireDocuments(dossier, associes, rules);
    await supabase.from("documents").delete().eq("dossier_id", dossier.id).eq("statut_document", "a_fournir");
    await supabase.from("documents").insert(drafts);
    const maj = auto
      ? {
          statut: "dossier_valide_client",
          autovalidation_le: new Date().toISOString(),
          relecture_statut: "non_demandee",
        }
      : { statut: "dossier_valide_client", relecture_statut: "demandee" };
    await supabase.from("dossiers").update(maj).eq("id", dossier.id);
    setDossier({ ...dossier, ...maj } as Dossier);
    await supabase.from("events_dossier").insert({
      dossier_id: dossier.id,
      type_event: "dossier_valide_client",
      message: auto
        ? "Dossier validé par le client sans relecture du cabinet. Les documents portent la mention indiquant qu'ils n'ont pas été revus par un professionnel."
        : "Dossier validé par le client. Relecture par le cabinet demandée. La liste des pièces à fournir a été générée.",
    });
    setBusy(false);
    toast.success("Dossier validé. Votre checklist de documents est prête.");
    navigate({ to: "/documents" });
  }

  if (!dossier) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement de votre dossier…</div>
      </PageShell>
    );
  }

  const forme = dossier.forme_juridique as Forme;
  const libMin = liberationMin(forme);
  const cles = ei ? CLES_EI : CLES_SOCIETE;
  const nbEtapes = cles.length;
  const cle = cles[Math.min(etape, nbEtapes) - 1] as Cle;
  const titreEtape =
    ei && cle === "associes"
      ? "L'entrepreneur"
      : ei && cle === "denomination"
        ? "Nom commercial"
        : TITRES[cle];
  const cout = coutParForme(tarifs, forme);
  const relectureHt = prixRelectureHt(tarifs);
  const relecture = dossier.voie_validation === "cabinet" ? relectureHt * 1.2 : 0;

  return (
    <PageShell withFooter={false}>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-6">
            <Progress value={(etape / nbEtapes) * 100} />
            <p className="mt-2 text-sm text-muted-foreground">
              Étape {etape} sur {nbEtapes} — {titreEtape}
            </p>
          </div>

          {etape > 1 && (
            <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => allerA(etape - 1)}>
              <ArrowLeft strokeWidth={1.5} /> Retour
            </Button>
          )}

          <h1 className="font-serif text-3xl">{titreEtape}</h1>

          {/* 1 — FORME */}
          {cle === "forme" && (
            <div className="mt-6 space-y-3">
              {FORMES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => patch({ forme_juridique: f.value })}
                  className={`w-full rounded-lg border px-5 py-4 text-left transition-colors hover:border-accent ${
                    forme === f.value ? "border-accent bg-accent/5" : "border-border bg-surface"
                  }`}
                >
                  <span className="font-semibold">{f.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{f.desc}</span>
                </button>
              ))}
              <Link to="/simulateur" className="inline-block text-sm underline underline-offset-2">
                Refaire la simulation
              </Link>
              <Disclaimer />
            </div>
          )}

          {/* 2 — DENOMINATION */}
          {cle === "denomination" && (
            <div className="mt-6 space-y-4">
              {ei && (
                <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                  En entreprise individuelle, vous exercez sous votre nom de famille. Un nom
                  commercial peut être ajouté pour votre communication ; il n'est pas obligatoire.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="denom">
                  {ei ? "Nom commercial (facultatif)" : "Dénomination sociale"}
                </Label>
                <Input id="denom" maxLength={120} value={dossier.denomination} onChange={(e) => patch({ denomination: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sigle">{ei ? "Enseigne (facultatif)" : "Sigle (facultatif)"}</Label>
                <Input id="sigle" maxLength={40} value={dossier.sigle ?? ""} onChange={(e) => patch({ sigle: e.target.value })} />
              </div>
              <div className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
                <p className="font-medium">Vérifiez que ce nom est disponible</p>
                <p className="mt-2">
                  Un nom identique ou similaire à une marque déjà déposée pour des produits ou
                  services proches expose à une action en contrefaçon et à l'interdiction d'utiliser
                  le nom, même après immatriculation. La recherche est gratuite dans la base des
                  marques de l'INPI.
                </p>
                <p className="mt-2">
                  <a
                    href="https://data.inpi.fr/search?displayStyle=LIST&type=MARQUES"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                  >
                    Rechercher dans la base des marques (INPI)
                    <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
                  </a>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Articles L. 713-2 à L. 713-6 du code de la propriété intellectuelle : usage
                  interdit d'un signe identique à une marque pour des produits ou services
                  identiques, et d'un signe identique ou similaire s'il existe un risque de
                  confusion ; protection étendue aux marques renommées, sous réserve de l'usage de
                  bonne foi de son nom patronymique et de l'usage antérieur d'un signe local.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="verif" checked={dossier.denomination_verifiee} onCheckedChange={(v) => patch({ denomination_verifiee: v === true })} className="mt-0.5" />
                <Label htmlFor="verif" className="text-sm font-normal">
                  J'ai vérifié dans la base de l'INPI qu'aucune marque antérieure ne s'oppose à
                  l'usage de ce nom, et j'en assume la responsabilité. (obligatoire)
                </Label>
              </div>


            </div>
          )}

          {/* 3 — SIEGE */}
          {cle === "siege" && (
            <div className="mt-6 space-y-4">
              {[
                {
                  v: "domicile_dirigeant",
                  t: "Chez le dirigeant",
                  d: "Simple et sans coût, adapté aux petits projets. La domiciliation est possible au domicile du représentant légal ; si le bail ou le règlement de copropriété s'y oppose, elle est limitée à 5 ans.",
                },
                { v: "domiciliataire", t: "Société de domiciliation", d: "Une adresse professionnelle fournie par un prestataire agréé, avec un contrat et un numéro d'agrément." },
                { v: "local", t: "Local commercial ou professionnel", d: "Vous disposez d'un bail ou d'un titre d'occupation à votre nom." },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => patch({ siege_type: o.v })}
                  className={`w-full rounded-lg border px-5 py-4 text-left ${dossier.siege_type === o.v ? "border-accent bg-accent/5" : "border-border bg-surface"}`}
                >
                  <span className="font-semibold">{o.t}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{o.d}</span>
                </button>
              ))}
              {dossier.siege_type && (
                <div className="space-y-2">
                  <Label htmlFor="adr">Adresse du siège</Label>
                  <Textarea id="adr" maxLength={300} value={dossier.siege_adresse ?? ""} onChange={(e) => patch({ siege_adresse: e.target.value })} />
                </div>
              )}
              {dossier.siege_type === "domiciliataire" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dnom">Nom du domiciliataire</Label>
                    <Input id="dnom" maxLength={120} value={dossier.domiciliataire_nom ?? ""} onChange={(e) => patch({ domiciliataire_nom: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dag">Numéro d'agrément</Label>
                    <Input id="dag" maxLength={60} value={dossier.domiciliataire_agrement ?? ""} onChange={(e) => patch({ domiciliataire_agrement: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4 — OBJET */}
          {cle === "objet" && (
            <div className="mt-6 space-y-5">
              <div className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
                <p className="font-medium">Qu'est-ce que l'objet social ?</p>
                <p className="mt-2">
                  L'objet social décrit l'ensemble des activités que votre structure est autorisée à
                  exercer. Il est inscrit dans les statuts et publié : tout ce qui n'y figure pas
                  sort du cadre autorisé et suppose une modification statutaire, avec les frais
                  correspondants. Rédigez-le donc suffisamment large pour couvrir vos activités
                  connexes et vos développements prévisibles, sans y faire figurer d'activité
                  réglementée que vous n'êtes pas en droit d'exercer. L'objet social détermine
                  également votre code d'activité (APE) et, dans une large mesure, votre convention
                  collective.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Activité principale (nomenclature NAF de l'INSEE)</Label>
                <NafSelect
                  value={dossier.code_naf}
                  onChange={(n) => {
                    const regl = estCodeReglemente(n.code);
                    patch({
                      code_naf: n.code,
                      code_naf_libelle: n.label,
                      ...(regl
                        ? { activite_reglementee: true, routage_cabinet: true }
                        : {}),
                    });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Ce code est déclaratif : l'INSEE attribue le code APE définitif au vu de
                  l'activité réellement exercée.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Partez d'un objet type, ou décrivez votre activité et laissez l'assistant en
                  proposer une rédaction que vous pourrez modifier librement.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OBJETS_TYPES.map((o) => (
                    <button
                      key={o.titre}
                      type="button"
                      onClick={() => patch({ objet_social: o.texte })}
                      className="rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm hover:border-accent"
                    >
                      {o.titre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-4">
                <Label htmlFor="descr" className="text-sm font-medium">
                  Décrivez votre activité en quelques mots
                </Label>
                <Textarea
                  id="descr"
                  rows={3}
                  maxLength={600}
                  className="mt-2"
                  placeholder="Ex. : je crée des sites internet pour des artisans et j'assure leur maintenance."
                  value={descriptionActivite}
                  onChange={(e) => setDescriptionActivite(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={redaction || descriptionActivite.trim().length < 10}
                    onClick={proposerObjet}
                  >
                    <Sparkle strokeWidth={1.5} />
                    {redaction ? "Rédaction en cours…" : "Proposer une rédaction"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Proposition automatique, à relire et à adapter : elle ne constitue pas un
                    conseil juridique.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objet">Objet social</Label>
                <Textarea id="objet" rows={6} maxLength={1500} value={dossier.objet_social ?? ""} onChange={(e) => patch({ objet_social: e.target.value })} />
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="regl"
                  checked={dossier.activite_reglementee}
                  onCheckedChange={(v) => patch({ activite_reglementee: v === true, routage_cabinet: v === true || dossier.apport_nature })}
                  className="mt-0.5"
                />
                <Label htmlFor="regl" className="text-sm font-normal">Mon activité est réglementée.</Label>
              </div>

              {dossier.activite_reglementee ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-warning/50 bg-warning/10 p-4 text-sm leading-relaxed">
                    <p className="font-medium">Activité réglementée : une pièce justificative sera demandée</p>
                    <p className="mt-2">
                      L'exercice de cette activité est subordonné à une condition de diplôme, de
                      qualification, d'agrément ou d'autorisation. Une pièce justificative est ajoutée
                      à votre liste de documents ; selon l'activité, il s'agit de l'un des documents
                      suivants :
                    </p>
                    <ul className="mt-2 space-y-1 pl-5 [&>li]:list-disc">
                      <li>diplôme, titre ou certificat de qualification professionnelle ;</li>
                      <li>carte professionnelle (immobilier, sécurité privée, transport…) ;</li>
                      <li>agrément, licence ou autorisation administrative préfectorale ;</li>
                      <li>attestation d'inscription à un ordre ou à un organisme professionnel ;</li>
                      <li>attestation d'assurance de responsabilité civile professionnelle ou décennale ;</li>
                      <li>justificatif d'expérience professionnelle lorsqu'il remplace le diplôme.</li>
                    </ul>
                    <p className="mt-2">
                      Votre dossier est orienté vers le cabinet, qui vous indique la pièce exacte
                      attendue et vérifie sa conformité avant dépôt.
                    </p>
                  </div>

                  <div className="rounded-md border border-border bg-surface p-4">
                    <p className="text-sm font-medium">Sur quoi repose votre qualification ?</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        { v: "diplome", t: "Un diplôme ou un titre" },
                        { v: "experience", t: "Une expérience professionnelle" },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => patch({ justificatif_type: o.v })}
                          className={`rounded-md border px-3 py-2.5 text-left text-sm ${dossier.justificatif_type === o.v ? "border-accent bg-accent/5" : "border-border bg-background"}`}
                        >
                          {o.t}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="justif" className="text-sm font-normal">
                        Précisez (intitulé du diplôme et année, ou fonctions exercées, employeur et
                        durée)
                      </Label>
                      <Textarea
                        id="justif"
                        rows={3}
                        maxLength={500}
                        value={dossier.justificatif_detail ?? ""}
                        onChange={(e) => patch({ justificatif_detail: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cette information oriente la relecture du cabinet ; le justificatif lui-même
                        se dépose à l'étape « Mes documents ».
                      </p>
                    </div>
                  </div>
                </div>
              ) : (

                <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                  Certaines activités sont réglementées et exigent un diplôme, une qualification ou
                  une autorisation. Si c'est votre cas, cochez la case ci-dessus : votre dossier sera
                  orienté vers le cabinet et la pièce justificative correspondante vous sera demandée.
                </p>
              )}
              <Disclaimer />
            </div>
          )}

          {/* 5 — CAPITAL */}
          {cle === "capital" && (
            <div className="mt-6 space-y-5">
              <div className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed">
                <p className="font-medium">À quoi sert le capital social ?</p>
                <p className="mt-2">
                  Le capital social correspond à la somme des apports des associés. Il constitue les
                  premières ressources de la société, détermine la répartition des droits de vote et
                  des dividendes, et sert de repère aux banques, aux bailleurs et aux clients. La loi
                  ne fixe aucun minimum (1 € suffit) pour les formes proposées ici, mais un capital
                  très faible se remarque : il figure sur tous les documents officiels et peut
                  compliquer l'obtention d'un financement. Un capital cohérent avec les besoins de
                  démarrage est généralement retenu. Les sommes déposées ne sont pas bloquées :
                  elles sont libérées sur le compte de la société dès l'immatriculation et servent à
                  financer l'activité.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cap">Montant du capital social (minimum 1 €)</Label>
                <Input id="cap" type="number" min={1} step="1" value={dossier.capital_montant} onChange={(e) => patch({ capital_montant: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">Valeur suggérée : 1 000 €.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib">Libération à la constitution (%)</Label>
                <Input id="lib" type="number" min={libMin} max={100} value={dossier.capital_liberation} onChange={(e) => patch({ capital_liberation: Number(e.target.value) })} />
                <p className="text-sm leading-relaxed">
                  Règle applicable : {isSas(forme) ? "en SAS et SASU, au moins 50 % des apports en numéraire doivent être libérés à la constitution, le solde dans les 5 ans suivant l'immatriculation." : forme === "SCI" ? "en SCI, la libération des apports est fixée librement par les statuts ; le solde reste dû selon les modalités qu'ils prévoient." : "en SARL et EURL, au moins 20 % des apports en numéraire doivent être libérés à la constitution, le solde dans les 5 ans suivant l'immatriculation."}
                </p>
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                  <p className="font-medium">Ce qu'implique une libération partielle</p>
                  <ul className="mt-2 space-y-1 pl-5 [&>li]:list-disc">
                    <li>
                      Le solde non libéré reste une dette exigible : le dirigeant peut l'appeler à
                      tout moment, et un liquidateur ou un créancier le réclamera en cas de
                      difficulté.
                    </li>
                    <li>
                      À défaut de libération intégrale dans les 5 ans, tout intéressé peut demander
                      en justice que la société y soit contrainte.
                    </li>
                    <li>
                      Tant que le capital n'est pas intégralement libéré, la société ne peut pas
                      bénéficier du taux réduit d'impôt sur les sociétés de 15 %.
                    </li>
                    <li>
                      Une libération partielle est mentionnée publiquement et pèse sur la crédibilité
                      financière de la société.
                    </li>
                  </ul>
                </div>
              </div>
              <div className="rounded-md border border-border bg-surface p-4 text-sm leading-relaxed">
                <p className="font-medium">Apports en nature et apports en industrie</p>
                <p className="mt-2">
                  Le parcours en ligne traite les apports en numéraire (sommes d'argent). Un apport
                  en nature (bien, matériel, fonds de commerce, titres) suppose une évaluation et,
                  au-delà de certains seuils, l'intervention d'un commissaire aux apports. Un apport
                  en industrie (savoir-faire, travail) ne concourt pas à la formation du capital et
                  exige une rédaction statutaire spécifique. Dans ces deux cas, le dossier est
                  accompagné directement par le cabinet.
                </p>
                <div className="mt-3">
                  <CallbackDialog label="Être rappelé à ce sujet" size="sm" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="nature"
                  checked={dossier.apport_nature}
                  onCheckedChange={(v) => patch({ apport_nature: v === true, routage_cabinet: v === true || dossier.activite_reglementee || dossier.apport_industrie })}
                  className="mt-0.5"
                />
                <Label htmlFor="nature" className="text-sm font-normal">
                  Je souhaite réaliser un apport en nature.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="industrie"
                  checked={dossier.apport_industrie}
                  onCheckedChange={(v) => patch({ apport_industrie: v === true, routage_cabinet: v === true || dossier.activite_reglementee || dossier.apport_nature })}
                  className="mt-0.5"
                />
                <Label htmlFor="industrie" className="text-sm font-normal">
                  Un associé réalise un apport en industrie.
                </Label>
              </div>
              <Disclaimer />
            </div>
          )}


          {/* 6 — ASSOCIES ET GERANCE */}
          {cle === "associes" && (
            <div className="mt-6 space-y-5">
              {!ei && (
                <>
                  <EncadreGouvernance forme={forme} />
                  <EncadreCompositionForme forme={forme} />
                  <EncadreDemembrement />
                </>
              )}

              <div className="flex flex-wrap gap-2">
                {(!ei || associes.length === 0) && (
                  <Button variant="outline" onClick={() => ajouterAssocie("personne_physique")}>
                    <Plus strokeWidth={1.5} /> {ei ? "Renseigner mon identité" : "Ajouter une personne physique"}
                  </Button>
                )}
                {!ei && (
                  <Button variant="outline" onClick={() => ajouterAssocie("personne_morale")}>
                    <Plus strokeWidth={1.5} /> Ajouter une personne morale
                  </Button>
                )}
              </div>

              {associes.map((a) => (
                <div key={a.id} className="space-y-4 rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{a.type === "personne_morale" ? "Personne morale" : "Personne physique"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => supprimerAssocie(a.id)} aria-label="Supprimer">
                      <Trash2 strokeWidth={1.5} />
                    </Button>
                  </div>

                  {a.type === "personne_physique" ? (
                    <>
                      <AssocieIdentite associe={a} onChange={(v) => majAssocie(a.id, v)} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select className={champ} value={a.situation_matrimoniale ?? ""} onChange={(e) => majAssocie(a.id, { situation_matrimoniale: e.target.value })}>
                          <option value="">Situation matrimoniale…</option>
                          {SITUATIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {a.situation_matrimoniale === "marie" && (
                          <select className={champ} value={a.regime_matrimonial ?? ""} onChange={(e) => majAssocie(a.id, { regime_matrimonial: e.target.value })}>
                            <option value="">Régime matrimonial…</option>
                            {REGIMES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
                        {a.situation_matrimoniale === "marie" &&
                          REGIMES_COMMUNAUTAIRES.includes(a.regime_matrimonial ?? "") &&
                          FORMES_COMMUNAUTE.includes(forme) && (
                            <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/50 p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox id={`fc-${a.id}`} checked={a.apport_fonds_communs} onCheckedChange={(v) => majAssocie(a.id, { apport_fonds_communs: v === true })} className="mt-0.5" />
                                <Label htmlFor={`fc-${a.id}`} className="text-sm font-normal">
                                  L'apport provient de fonds communs du couple.
                                </Label>
                              </div>
                              <p className="text-sm">
                                Dans ce cas, votre conjoint doit être informé de l'apport. Un courrier
                                d'information sera généré et devra être signé avant la signature des
                                statuts.
                              </p>
                            </div>
                          )}
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Dénomination" maxLength={120} value={a.denomination ?? ""} onChange={(e) => majAssocie(a.id, { denomination: e.target.value })} />
                      <Input placeholder="Forme" maxLength={40} value={a.forme ?? ""} onChange={(e) => majAssocie(a.id, { forme: e.target.value })} />
                      <Input placeholder="SIREN" maxLength={20} value={a.siren ?? ""} onChange={(e) => majAssocie(a.id, { siren: e.target.value })} />
                      <Input placeholder="Siège" maxLength={200} value={a.siege ?? ""} onChange={(e) => majAssocie(a.id, { siege: e.target.value })} />
                      <Input placeholder="Représentant" maxLength={120} value={a.representant ?? ""} onChange={(e) => majAssocie(a.id, { representant: e.target.value })} />
                    </div>
                  )}

                  {!ei && (
                    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-sm font-medium">Détention de titres</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre de titres</Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={a.nb_titres}
                            onChange={(e) => {
                              const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              majAssocie(a.id, {
                                nb_titres: n,
                                montant_apport: Number((n * valeurPart).toFixed(2)),
                                est_associe: n > 0,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Montant de l'apport (€)</Label>
                          <Input type="number" readOnly value={Number(a.montant_apport)} />
                          <p className="text-xs text-muted-foreground">
                            Calculé : nombre de titres × valeur d'une part ({euro(valeurPart)}).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-60">
                        <Checkbox id={`ass-${a.id}`} checked={a.nb_titres > 0} disabled />
                        <Label htmlFor={`ass-${a.id}`} className="text-sm font-normal">
                          Associé — déterminé automatiquement par la détention de titres
                        </Label>
                      </div>
                    </div>
                  )}

                  {!ei && (
                    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-sm font-medium">Gérance</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Checkbox
                          id={`dir-${a.id}`}
                          checked={a.est_dirigeant}
                          disabled={a.type === "personne_morale" && !isSas(forme) && forme !== "SCI"}
                          onCheckedChange={(v) => majAssocie(a.id, { est_dirigeant: v === true, ...(v === true ? {} : { fonction: null }) })}
                        />
                        <Label htmlFor={`dir-${a.id}`} className="text-sm font-normal">
                          Cette personne exerce un mandat de direction.
                        </Label>
                        {a.est_dirigeant && (
                          <select
                            className={`${champ} sm:w-64`}
                            value={a.fonction ?? ""}
                            onChange={(e) => choisirFonction(a.id, e.target.value)}
                          >
                            <option value="">Fonction…</option>
                            {fonctionsPour(forme).map((f) => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {a.type === "personne_morale" && !isSas(forme) && forme !== "SCI" && (
                        <p className="text-xs text-muted-foreground">
                          En SARL et EURL, le gérant est obligatoirement une personne physique.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {!ei && (
                <p className={`rounded-md border p-3 text-sm ${capitalOk ? "border-success/40 bg-success/8" : "border-destructive/40 bg-destructive/8"}`}>
                  Total des apports : {euro(totalApports)} — capital social : {euro(Number(dossier.capital_montant))}.
                  {capitalOk ? " Les montants correspondent." : " Les deux montants doivent être identiques pour continuer."}
                </p>
              )}
              {!ei && dirigeants.length === 0 && (
                <p className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
                  Aucun dirigeant n'est désigné : {isSas(forme) ? "une SAS ou une SASU doit avoir un président." : "votre société doit avoir au moins un gérant."}
                </p>
              )}
              {ei && (
                <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                  L'entreprise individuelle n'a ni capital social, ni associé : seules vos
                  informations personnelles sont nécessaires. Depuis le 15 mai 2022, votre
                  patrimoine personnel est de plein droit distinct de votre patrimoine
                  professionnel.
                </p>
              )}
            </div>
          )}

          {/* 8 — OPTIONS */}
          {cle === "options" && (
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cloture">Mois de clôture de l'exercice</Label>
                <select
                  id="cloture"
                  className={champ}
                  value={String(dossier.cloture_mois)}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    patch({ cloture_mois: m, date_cloture_exercice: dernierJourDuMois(m) });
                  }}
                >
                  {MOIS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {`${m} — clôture au ${dernierJourDuMois(i + 1).replace("/", "/")}`}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Clôture retenue : le {dossier.date_cloture_exercice}, dernier jour du mois.
                </p>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="etendu"
                    checked={dossier.exercice_etendu}
                    onCheckedChange={(v) => patch({ exercice_etendu: v === true })}
                    className="mt-0.5"
                  />
                  <Label htmlFor="etendu" className="text-sm font-normal">
                    Je souhaite un premier exercice étendu (plus de 12 mois).
                  </Label>
                </div>
                <p className="text-sm leading-relaxed">
                  Sans exercice étendu, le premier exercice est clos à la première échéance du{" "}
                  {dossier.date_cloture_exercice} suivant l'immatriculation. Un exercice ne peut
                  comporter qu'un seul franchissement du 31 décembre : sa durée ne peut donc pas
                  dépasser 24 mois.
                </p>
              </div>

              <EncadreCloture />

              <div className="space-y-2">
                <Label>Option fiscale</Label>
                <p className="text-sm">{REGIME_DEFAUT[forme]}</p>
                <div className="flex gap-2">
                  {["IS", "IR"].map((o) => (
                    <Button key={o} type="button" variant={dossier.option_fiscale === o ? "default" : "outline"} onClick={() => patch({ option_fiscale: o })}>
                      {o}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Régime de TVA</Label>
                {TVA_OPTIONS.map((t) => (
                  <button key={t.value} type="button" onClick={() => patch({ regime_tva: t.value })} className={`w-full rounded-lg border px-4 py-3 text-left ${dossier.regime_tva === t.value ? "border-accent bg-accent/5" : "border-border bg-surface"}`}>
                    <span className="font-medium">{t.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{t.desc}</span>
                  </button>
                ))}
              </div>

              {dossier.regime_tva && dossier.regime_tva !== "franchise" && (
                <div className="space-y-2">
                  <Label>Périodicité des déclarations de TVA</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "mensuelle", t: "Mensuelle" },
                      { v: "trimestrielle", t: "Trimestrielle" },
                    ].map((o) => (
                      <Button
                        key={o.v}
                        type="button"
                        variant={dossier.periodicite_tva === o.v ? "default" : "outline"}
                        onClick={() => patch({ periodicite_tva: o.v })}
                      >
                        {o.t}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La périodicité effective dépend du régime retenu et du montant de TVA due sur
                    l'année ; elle est confirmée par l'administration.
                  </p>
                </div>
              )}

              <EncadreTva immobilier={isCivile(forme)} />

              <div className="space-y-2 rounded-md border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox id="acre" checked={dossier.demande_acre} onCheckedChange={(v) => patch({ demande_acre: v === true })} className="mt-0.5" />
                  <Label htmlFor="acre" className="text-sm font-normal">Je souhaite demander l'ACRE.</Label>
                </div>
                <p className="text-sm">
                  L'ACRE est une exonération partielle et temporaire de certaines cotisations
                  sociales, soumise à conditions d'éligibilité appréciées par l'organisme compétent.
                </p>
              </div>

              <div className="rounded-md border border-accent/40 bg-accent/10 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="relecture-options"
                    checked={dossier.relecture_options}
                    onCheckedChange={(v) =>
                      patch({ relecture_options: v === true, ...(v === true ? { voie_validation: "cabinet" } : {}) })
                    }
                    className="mt-0.5"
                  />
                  <Label htmlFor="relecture-options" className="text-sm font-normal leading-relaxed">
                    Ces choix, comme tous les autres et vos statuts, seront revus avec vous par
                    l'expert-comptable si vous cochez cette case (coût : {euro(relectureOptionsHt)} HT,
                    déductible du résultat de la société et récupérable par l'associé qui a avancé les
                    fonds à la société) ; sinon, vous avancez par vous-même, sans frais additionnels.
                  </Label>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Information générale — ne constitue pas un conseil. Votre dossier peut être revu
                  par un expert-comptable, si vous le souhaitez (option payante).
                </p>
              </div>
            </div>
          )}

          {/* LETTRE DE MISSION */}
          {cle === "mission" && (
            <div className="mt-6 space-y-5">
              <p className="text-base leading-relaxed">
                La mission comptable est la contrepartie des honoraires de création offerts. Lisez
                la lettre de mission, puis acceptez-la en indiquant votre nom complet.
              </p>
              <div className="space-y-3 rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed">
                <p><strong>Objet.</strong> Mission de présentation des comptes annuels réalisée par le cabinet d'expertise comptable partenaire, inscrit à l'Ordre : tenue, comptes annuels, déclarations fiscales courantes et conseil au fil de l'eau.</p>
                <p><strong>Honoraires.</strong> {euro(missionMensuelleHt(tarifs))} HT par mois, TVA de 20 % en sus.</p>
                <p><strong>Durée et résiliation.</strong> Engagement initial de trois mois, puis résiliation libre par chaque partie, sans frais ni justification.</p>
                <p><strong>Honoraires de création offerts sous condition.</strong> En cas de non-respect de l'engagement de 3 mois ou de défaut de paiement, les honoraires de création deviennent exigibles à hauteur de {euro(penaliteCreationHt(tarifs))} HT.</p>
                <p><strong>Frais légaux.</strong> Annonce légale, greffe et bénéficiaires effectifs sont refacturés à l'euro près, sans marge.</p>
              </div>

              {dossier.lettre_mission_acceptee_le ? (
                <p className="rounded-md border border-success/40 bg-success/8 p-3 text-sm">
                  Lettre de mission acceptée par {dossier.lettre_mission_nom} le{" "}
                  {new Date(dossier.lettre_mission_acceptee_le).toLocaleString("fr-FR")}.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="lue" checked={lueMission} onCheckedChange={(v) => setLueMission(v === true)} className="mt-0.5" />
                    <Label htmlFor="lue" className="text-sm font-normal leading-relaxed">
                      J'ai lu la lettre de mission et j'accepte la mission comptable de 3 mois à{" "}
                      {euro(missionMensuelleHt(tarifs))} HT/mois, contrepartie des honoraires de
                      création offerts.
                    </Label>
                  </div>
                  <div className="space-y-2 sm:max-w-sm">
                    <Label htmlFor="nom-accept">Nom complet (valant acceptation)</Label>
                    <Input id="nom-accept" maxLength={120} value={nomAcceptation} onChange={(e) => setNomAcceptation(e.target.value)} />
                  </div>
                  <Button
                    onClick={() => {
                      if (!lueMission || nomAcceptation.trim().length < 3) {
                        toast.error("Cochez la case et indiquez votre nom complet.");
                        return;
                      }
                      patch({
                        lettre_mission_nom: nomAcceptation.trim(),
                        lettre_mission_acceptee_le: new Date().toISOString(),
                      });
                      toast.success("Lettre de mission acceptée.");
                    }}
                  >
                    Accepter la lettre de mission
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                La signature électronique sera disponible ultérieurement ; l'acceptation en ligne est
                horodatée et conservée dans votre dossier.
              </p>
            </div>
          )}

          {/* VOIE DE VALIDATION */}
          {cle === "validation" && (
            <div className="mt-6 space-y-4">
              <p className="text-base leading-relaxed">
                La relecture par l'expert-comptable est facultative. Choisissez la voie qui vous
                convient : vous pourrez toujours demander une relecture plus tard.
              </p>
              {[
                {
                  v: "cabinet",
                  t: `Relecture par l'expert-comptable — ${euro(relectureHt)} HT`,
                  d: "Un expert-comptable inscrit à l'Ordre contrôle vos pièces et vos documents avant le dépôt. La mention « PROJET » est retirée après sa validation.",
                },
                {
                  v: "auto",
                  t: "Je valide moi-même mon dossier — sans frais",
                  d: "Vos documents sont générés immédiatement et portent la mention : « Document généré à partir des réponses du déclarant — non revu par un professionnel. » Vous restez responsable de leur exactitude.",
                },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => patch({ voie_validation: o.v })}
                  className={`w-full rounded-lg border px-5 py-4 text-left ${dossier.voie_validation === o.v ? "border-accent bg-accent/5" : "border-border bg-surface"}`}
                >
                  <span className="font-semibold">{o.t}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{o.d}</span>
                </button>
              ))}
              <Disclaimer />
            </div>
          )}

          {/* PAIEMENT SIMULE */}
          {cle === "paiement" && (
            <div className="mt-6 space-y-5">
              <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
                {[
                  ["Honoraires de création", "0 € — offerts en contrepartie de la mission comptable de 3 mois à " + euro(missionMensuelleHt(tarifs)) + " HT/mois"],
                  ["Annonce légale", ei ? "Sans objet (aucune annonce en entreprise individuelle)" : euro(cout.annonceTtc)],
                  ["Greffe", euro(cout.greffeTtc)],
                  ["Bénéficiaires effectifs", ei ? "Sans objet" : euro(cout.benefTtc)],
                  ["Relecture par l'expert-comptable", relecture ? euro(relecture) + " TTC" : "Non demandée"],
                  ["Total dû aujourd'hui", euro(cout.totalTtc + relecture)],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 p-3 sm:grid-cols-[16rem_1fr]">
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                Les frais légaux sont refacturés à l'euro près, sans marge. Ils sont dus quelle que
                soit la solution retenue pour créer votre société.
              </p>
              {dossier.moyen_de_paiement_enregistre ? (
                <p className="rounded-md border border-success/40 bg-success/8 p-3 text-sm">
                  Moyen de paiement enregistré (simulation — aucun prélèvement n'est effectué).
                </p>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      patch({ moyen_de_paiement_enregistre: true });
                      toast.success("Moyen de paiement enregistré (simulation).");
                    }}
                  >
                    Enregistrer mon moyen de paiement (simulation)
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Le paiement réel par carte bancaire sera activé ultérieurement. Aucune donnée
                    bancaire n'est collectée à ce stade.
                  </p>
                </div>
              )}
              <Button variant="outline" disabled>
                Payer par carte bancaire — bientôt disponible
              </Button>
            </div>
          )}

          {/* 9 — RECAP */}
          {cle === "recap" && (
            <div className="mt-6 space-y-4">
              <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
                {[
                  ["Forme juridique", forme],
                  ["Dénomination", dossier.denomination || "—"],
                  ["Sigle", dossier.sigle || "—"],
                  ["Siège", dossier.siege_adresse || "—"],
                  ["Objet social", dossier.objet_social || "—"],
                  ...(ei
                    ? []
                    : ([
                        ["Durée", `${dossier.duree_annees} ans`],
                        ["Capital", euro(Number(dossier.capital_montant))],
                        ["Libération", `${dossier.capital_liberation} %`],
                      ] as string[][])),
                  ["Clôture d'exercice", dossier.date_cloture_exercice],
                  ["Option fiscale", dossier.option_fiscale || "—"],
                  ["Régime de TVA", TVA_OPTIONS.find((t) => t.value === dossier.regime_tva)?.label ?? "—"],
                  ["ACRE", dossier.demande_acre ? "Demandée" : "Non demandée"],
                  ["Associés", associes.map((a) => (a.type === "personne_morale" ? a.denomination : `${a.prenom} ${a.nom}`)).join(", ") || "—"],
                  ["Lettre de mission", dossier.lettre_mission_acceptee_le ? `Acceptée par ${dossier.lettre_mission_nom}` : "Non acceptée"],
                  ["Validation", dossier.voie_validation === "auto" ? "Sans relecture du cabinet" : dossier.voie_validation === "cabinet" ? `Relecture par l'expert-comptable (${euro(relectureHt)} HT)` : "—"],
                  ["Moyen de paiement", dossier.moyen_de_paiement_enregistre ? "Enregistré (simulation)" : "Non enregistré"],
                ].map(([k, v]) => (
                  <div key={k as string} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="text-sm">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex items-start gap-3">
                <Checkbox id="certif" checked={certifie} onCheckedChange={(v) => setCertifie(v === true)} className="mt-0.5" />
                <Label htmlFor="certif" className="text-sm font-normal">
                  Je certifie l'exactitude des informations saisies.
                </Label>
              </div>

              <Button size="lg" onClick={validerDossier} disabled={busy}>
                {busy ? "Validation…" : "Valider mon dossier"}
              </Button>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            {cle !== "recap" && <Button onClick={() => allerA(etape + 1)}>Continuer</Button>}
            <CallbackDialog variant="ghost" />
          </div>
        </div>

        {/* PANNEAU RECAP */}
        <aside className="h-fit rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="font-serif text-xl">Votre dossier</h2>
          {dossier.routage_cabinet && <Badge className="mt-3">Accompagnement cabinet requis</Badge>}
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ["Forme", forme],
              ["Dénomination", dossier.denomination || "—"],
              ["Siège", dossier.siege_adresse || "—"],
              ...(ei ? [] : ([["Capital", euro(Number(dossier.capital_montant))]] as string[][])),
              ["Associés", String(associes.length)],
              ["Dirigeants", String(associes.filter((a) => a.est_dirigeant).length)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </PageShell>
  );
}
