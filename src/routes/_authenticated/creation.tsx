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
  CABINET,
  FORMES,
  FORMES_COMMUNAUTE,
  MOIS,
  REGIMES_AVEC_CONTRAT,
  REGIMES_MARIAGE,
  REGIMES_PACS,
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
  minimumLegal,
  rolesPour,
  type Forme,
} from "@/lib/domain";
import { AdresseSiege } from "@/components/AdresseSiege";
import { dateEnLettresFr } from "@/lib/nombres";
import { avertissementPremierExercice, clotureParDefaut } from "@/lib/statuts-sas";

import {
  apportCogestion,
  construireDocuments,
  estCommunautaire,
  type Associe,
  type Dossier,
} from "@/lib/documents";
import { EncadrePliable } from "@/components/EncadrePliable";
import { VerifDenomination } from "@/components/VerifDenomination";
import { MentionObligatoire, Requis } from "@/components/Obligatoire";
import { analyserChecklist, estMineur, piecesEnDrafts } from "@/lib/checklist";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { etatServices } from "@/lib/services.functions";

import { SituationChecklist } from "@/components/SituationChecklist";
import { construireSignatures } from "@/lib/signatures";
import {
  coutParForme,
  missionMensuelleHt,
  penaliteCreationHt,
  prixRelectureHt,
  tarifMap,
  useTarifs,
} from "@/lib/tarifs";
import { NAF } from "@/lib/naf";
import { AssocieIdentite } from "@/components/AssocieIdentite";
import { BlocActivite } from "@/components/BlocActivite";
import { SelecteurOffre } from "@/components/SelecteurOffre";
import { offreParCode, prixOffreHt, useOffres, type CodeOffre } from "@/lib/offres";
import {
  activitesDuDossier,
  derivesActivites,
  libelleActivite,
  nouvelleActivite,
  type Activite,
} from "@/lib/activites";
import { RecommandationDialog } from "@/components/RecommandationDialog";
import {
  EncadreCloture,
  EncadreCompositionForme,
  EncadreDemembrement,
  EncadreGouvernance,
  EncadreJustificatifs,
  EncadreMineur,
  EncadreRegimes,
  EncadreRelectureLimites,
  EncadreResponsabilite,
  EncadreSignatureElectronique,
  EncadreTva,
} from "@/components/EncadresPedago";
import { estCodeReglemente } from "@/lib/naf-reglemente";
import { analyserActivite } from "@/lib/activite.functions";
import { estHoteApercu } from "@/lib/apercu";
import { CLES_EI, CLES_SOCIETE, TITRES, type Cle } from "@/lib/etapes";
import { ApercuStatuts } from "@/components/ApercuStatuts";

import { z } from "zod";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Sparkle, Trash2 } from "lucide-react";

const searchSchema = z.object({
  forme: z.string().optional(),
  /** Étape à ouvrir directement (guide de correction). */
  etape: z.number().int().positive().optional(),
});

export const Route = createFileRoute("/_authenticated/creation")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Créer ma société — CREA EXPERT" },
      {
        name: "description",
        content: "Parcours guidé de création de société, sauvegardé à chaque étape.",
      },
      { property: "og:title", content: "Créer ma société — CREA EXPERT" },
      { property: "og:description", content: "Complétez votre dossier de création en ligne." },
    ],
  }),
  component: Creation,
});

const champ = "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm";

/** Déplace un élément d'une liste, sans la modifier sur place. */
function deplacer<T>(liste: T[], de: number, vers: number) {
  const copie = [...liste];
  const [item] = copie.splice(de, 1);
  copie.splice(vers, 0, item as T);
  return copie;
}

function Creation() {
  const navigate = useNavigate();
  const { forme: formeInitiale, etape: etapeDemandee } = Route.useSearch();
  const { data: tarifs } = useTarifs();
  const { data: offres } = useOffres();
  const { user } = useAuth();
  const { isAdmin } = useRoles(user);
  const { data: services } = useQuery({
    queryKey: ["etat-services"],
    queryFn: () => etatServices(),
  });
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [etape, setEtape] = useState(1);
  const [certifie, setCertifie] = useState(false);
  const [piecesOk, setPiecesOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nomAcceptation, setNomAcceptation] = useState("");
  const [lueMission, setLueMission] = useState(false);
  const [renonceRetractation, setRenonceRetractation] = useState(false);
  const [descriptionActivite, setDescriptionActivite] = useState("");
  const [redaction, setRedaction] = useState(false);
  /** Erreurs de l'étape courante, affichées sous les champs concernés. */
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

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
      if (
        formeInitiale &&
        FORMES.some((f) => f.value === formeInitiale) &&
        d.forme_juridique !== formeInitiale
      ) {
        await supabase.from("dossiers").update({ forme_juridique: formeInitiale }).eq("id", d.id);
        d = { ...d, forme_juridique: formeInitiale };
      }
      setDossier(d);
      setNomAcceptation(d.lettre_mission_nom ?? "");
      const nb = (isEI(d.forme_juridique) ? CLES_EI : CLES_SOCIETE).length;
      setEtape(Math.min(Math.max(etapeDemandee ?? d.etape_courante, 1), nb));
      const { data: as } = await supabase
        .from("associes")
        .select("*")
        .eq("dossier_id", d.id)
        .order("created_at");
      setAssocies(as ?? []);
    })();
  }, [formeInitiale, etapeDemandee]);

  async function patch(valeurs: Partial<Dossier>) {
    if (!dossier) return;
    const suivant = { ...dossier, ...valeurs } as Dossier;
    setDossier(suivant);
    await supabase.from("dossiers").update(valeurs).eq("id", dossier.id);
  }

  /** Le retour en arrière est toujours libre : aucune validation n'est exigée. */
  async function allerA(n: number) {
    setEtape(n);
    setErreurs({});
    await patch({ etape_courante: n });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Raccourcis de conception : réservés à un administrateur sur un hôte d'aperçu,
   * pour parcourir le site sans remplir chaque contrôle obligatoire.
   */
  const modeConception =
    isAdmin && typeof window !== "undefined" && estHoteApercu(window.location.host);

  /** Supprime le dossier de test en cours et en recrée un vierge. */
  async function reinitialiserDossierTest() {
    if (!dossier) return;
    await supabase.from("associes").delete().eq("dossier_id", dossier.id);
    await supabase.from("dossiers").delete().eq("id", dossier.id);
    toast.success("Formulaire réinitialisé.");
    window.location.reload();
  }

  /** Contrôles de l'étape courante. Renvoie les erreurs par champ. */
  function controlerEtape(c: Cle): Record<string, string> {
    const e: Record<string, string> = {};
    if (!dossier) return e;
    const d = dossier;
    if (c === "denomination") {
      if (!isEI(d.forme_juridique) && !d.denomination.trim())
        e["denomination"] = "La dénomination sociale est obligatoire.";
      if (!d.denomination_verifiee)
        e["denomination_verifiee"] = "Confirmez la vérification de disponibilité auprès de l'INPI.";
    }
    if (c === "siege") {
      if (!d.siege_type) e["siege_type"] = "Choisissez le type de siège social.";
      const adresseSaisie = Boolean(
        (d.siege_voie ?? "").trim() &&
        (d.siege_code_postal ?? "").trim() &&
        (d.siege_ville ?? "").trim(),
      );
      if (!adresseSaisie && !(d.siege_adresse ?? "").trim())
        e["siege_adresse"] = "Renseignez l'adresse complète du siège (voie, code postal, commune).";
      if (d.siege_type === "domiciliataire") {
        if (!(d.domiciliataire_nom ?? "").trim())
          e["domiciliataire_nom"] = "Indiquez le nom du domiciliataire.";
        if (!(d.domiciliataire_agrement ?? "").trim())
          e["domiciliataire_agrement"] = "Indiquez le numéro d'agrément du domiciliataire.";
      }
    }
    if (c === "objet") {
      const liste = (d.objets_social ?? []).map((t) => t.trim()).filter(Boolean);
      if (liste.length === 0 && !(d.objet_social ?? "").trim())
        e["objets"] = "Indiquez au moins une activité.";
      const manquants = activitesDuDossier(d).filter(
        (a) =>
          a.reglementee &&
          (!a.justificatif_type || (a.justificatif_detail ?? "").trim().length < 3),
      );
      if (manquants.length > 0)
        e["justificatifs"] =
          `Pour chaque activité réglementée, indiquez la nature du justificatif (diplôme ou expérience) et précisez-la : ${manquants
            .map((a, i) => libelleActivite(a, i))
            .join(" ; ")}.`;
      if (!d.objets_confirmes_le)
        e["objets_confirmes"] = "Confirmez que la liste des activités est exacte pour continuer.";
    }

    if (c === "capital") {
      const montant = Number(d.capital_montant);
      const lib = Number(d.capital_liberation);
      const min = liberationMin(d.forme_juridique as Forme);
      if (!(montant >= 1)) e["capital_montant"] = "Le capital social doit être d'au moins 1 €.";
      if (!(lib >= min))
        e["capital_liberation"] = `La libération minimale de cette forme est de ${min} %.`;
      if (lib > 100) e["capital_liberation"] = "La libération ne peut pas dépasser 100 %.";
    }
    if (c === "associes") {
      const eiForme = isEI(d.forme_juridique);
      if (!eiForme && Math.abs(totalApports - Number(d.capital_montant)) >= 0.01)
        e["apports"] = "Le total des apports doit être égal au capital social.";
      if (!eiForme && !associes.some((a) => a.est_dirigeant))
        e["dirigeants"] = "Désignez au moins un dirigeant.";
      if (
        isSas(d.forme_juridique) &&
        !associes.some((a) => a.est_dirigeant && a.fonction === "president")
      )
        e["president"] = "Une SAS ou une SASU ne peut pas être créée sans président.";
      const incomplet = associes.some(
        (a) =>
          a.type === "personne_physique" &&
          (!(a.nom ?? "").trim() ||
            !(a.prenom ?? "").trim() ||
            !a.date_naissance ||
            !(a.lieu_naissance ?? "").trim() ||
            !(a.nationalite ?? "").trim() ||
            !(a.adresse ?? "").trim()),
      );
      if (incomplet)
        e["identites"] =
          "Complétez, pour chaque personne physique, les nom, prénom, date et lieu de naissance, nationalité et adresse.";
    }
    if (c === "mission") {
      if (!d.lettre_mission_acceptee_le)
        e["mission"] = "Acceptez la lettre de mission pour continuer.";
      if ((d.telephone_contact ?? "").replace(/\D/g, "").length < 9)
        e["telephone"] = "Indiquez un numéro de téléphone valide.";
      if (!d.renonciation_retractation_le)
        e["retractation"] = "Cette demande expresse est nécessaire pour démarrer la prestation.";
    }
    if (c === "validation" && !d.offre) e["voie"] = "Choisissez votre offre pour continuer.";

    return e;
  }

  /** Avance d'une étape après contrôle. Les erreurs s'affichent sous les champs. */
  async function continuer(c: Cle) {
    const e = controlerEtape(c);
    setErreurs(e);
    if (Object.keys(e).length > 0) {
      toast.error("Certaines informations doivent être complétées avant de continuer.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    await allerA(etape + 1);
  }

  /** Message d'erreur affiché sous un champ. */
  function Err({ nom }: { nom: string }) {
    if (!erreurs[nom]) return null;
    return <p className="text-sm font-medium text-destructive">{erreurs[nom]}</p>;
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
    setAssocies((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        const suivant = { ...a, ...valeurs };
        // Contrôle d'âge dès la saisie de la date de naissance de l'associé.
        if (valeurs.date_naissance && !estMineur(a) && estMineur(suivant)) {
          toast.info(
            "Cet associé est mineur : la création en ligne n'est pas possible. Rapprochez-vous d'un expert-comptable ou d'un professionnel du droit, ou retirez le mineur pour poursuivre.",
            { duration: 9000 },
          );
        }
        return suivant;
      }),
    );
    await supabase.from("associes").update(valeurs).eq("id", id);
  }

  async function supprimerAssocie(id: string) {
    setAssocies((list) => list.filter((a) => a.id !== id));
    await supabase.from("associes").delete().eq("id", id);
  }

  const activites: Activite[] = useMemo(
    () => (dossier ? activitesDuDossier(dossier) : []),
    [dossier],
  );

  /**
   * Enregistre la liste d'activités et recalcule les champs dérivés (objet social
   * consolidé, caractère réglementé, routage cabinet, code d'activité principal).
   */
  async function majActivites(liste: Activite[]) {
    if (!dossier) return;
    await patch({
      ...derivesActivites(liste, dossier.apport_nature || dossier.apport_industrie),
      objets_confirmes_le: null,
    } as Partial<Dossier>);
  }

  async function ajouterActivite(a: Activite) {
    await majActivites([...activites, a]);
  }

  async function modifierActivite(id: string, valeurs: Partial<Activite>) {
    await majActivites(activites.map((a) => (a.id === id ? { ...a, ...valeurs } : a)));
  }

  /**
   * Ajoute une activité à partir de sa description en quelques mots : l'assistant
   * rédige le bloc statutaire, propose un code d'activité et signale si l'activité
   * est, en règle générale, réglementée. Tout reste modifiable.
   */
  async function ajouterDepuisDescription() {
    if (!dossier) return;
    const description = descriptionActivite.trim();
    if (description.length < 5) return;
    setRedaction(true);
    try {
      const res = await analyserActivite({ data: { description, forme: dossier.forme_juridique } });
      if (!res?.texte) {
        toast.error(res?.erreur ?? "Aucune proposition n'a pu être générée.");
        return;
      }
      const officiel = res.naf_code ? (NAF.find((n) => n.code === res.naf_code) ?? null) : null;
      const code = officiel?.code ?? null;
      await ajouterActivite(
        nouvelleActivite({
          source: "libre",
          texte: res.texte,
          naf_code: code,
          naf_libelle: officiel?.label ?? res.naf_libelle ?? null,
          reglementee: res.reglementee || estCodeReglemente(code),
          justificatif_detail: res.reglementee && res.motif ? res.motif.slice(0, 500) : null,
        }),
      );
      setDescriptionActivite("");
      toast.success("Activité ajoutée. Relisez la rédaction et adaptez-la si nécessaire.");
    } catch {
      toast.error("L'assistance à la rédaction est momentanément indisponible.");
    } finally {
      setRedaction(false);
    }
  }

  const totalApports = useMemo(
    () =>
      associes.filter((a) => a.est_associe).reduce((s, a) => s + Number(a.montant_apport || 0), 0),
    [associes],
  );
  const dirigeants = useMemo(() => associes.filter((a) => a.est_dirigeant), [associes]);
  const ei = dossier ? isEI(dossier.forme_juridique) : false;
  const valeurPart = Math.max(0.01, Number(dossier?.valeur_part ?? 1));
  const capitalOk = dossier
    ? Math.abs(totalApports - Number(dossier.capital_montant)) < 0.01
    : false;
  const sas = dossier ? isSas(dossier.forme_juridique) : false;
  /** En SAS et SASU, un président est obligatoire : sans lui, aucune immatriculation possible. */
  const presidentDesigne = associes.some((a) => a.est_dirigeant && a.fonction === "president");
  const mineurs = useMemo(() => associes.filter(estMineur), [associes]);

  /** En SAS et SASU, il ne peut y avoir qu'un seul président : la fonction est exclusive. */
  async function choisirFonction(id: string, fonction: string) {
    if (fonction === "president") {
      const autres = associes.filter((a) => a.id !== id && a.fonction === "president");
      for (const a of autres) await majAssocie(a.id, { fonction: null });
    }
    await majAssocie(id, { fonction: fonction || null });
  }

  async function validerDossier() {
    if (!dossier || !rules) return;
    /**
     * Contrôle final de cohérence : le raccourci de conception permet seulement de
     * naviguer, il ne dispense d'aucune règle de saisie et n'écrase aucune donnée.
     * À la première incohérence, l'utilisateur est ramené à l'étape concernée.
     */
    for (let i = 0; i < cles.length; i++) {
      const c = cles[i]!;
      const e = controlerEtape(c);
      if (Object.keys(e).length > 0) {
        setErreurs(e);
        setEtape(i + 1);
        await patch({ etape_courante: i + 1 });
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.error(`Étape « ${TITRES[c]} » : ${Object.values(e)[0]}`);
        return;
      }
    }

    if (!certifie) {
      toast.error("Vous devez certifier l'exactitude des informations.");
      return;
    }
    if (!piecesOk) {
      toast.error(
        "Vous devez vous engager à déposer tous les justificatifs légaux applicables avant le dépôt du dossier.",
      );
      return;
    }
    if (!dossier.telephone_contact?.trim()) {
      toast.error(
        "Le numéro de téléphone est obligatoire avant la signature de la lettre de mission.",
      );
      return;
    }
    const blocages = analyserChecklist(dossier, associes).blocages;
    if (blocages.length > 0) {
      toast.error(blocages[0]!.titre);
      return;
    }
    if (mineurs.length > 0) {
      toast.error(
        "Un associé mineur est renseigné : rapprochez-vous d'un expert-comptable ou d'un professionnel du droit, ou retirez le ou les mineurs pour poursuivre en ligne.",
      );
      return;
    }
    if (!ei && !capitalOk) {
      toast.error("Le total des apports doit être égal au capital social.");
      return;
    }
    if (sas && !presidentDesigne) {
      toast.error("Une SAS ou une SASU ne peut pas être créée sans président.");
      return;
    }
    if (!ei && !sas && dirigeants.length === 0) {
      toast.error("Votre société doit avoir au moins un gérant.");
      return;
    }
    if (!dossier.lettre_mission_acceptee_le) {
      toast.error("La lettre de mission doit être acceptée avant de valider le dossier.");
      return;
    }
    if (!dossier.offre) {
      toast.error("Choisissez votre offre pour continuer.");
      return;
    }

    setBusy(true);
    const auto = dossier.voie_validation === "auto";
    const drafts = piecesEnDrafts(dossier, associes);
    await supabase
      .from("documents")
      .delete()
      .eq("dossier_id", dossier.id)
      .eq("statut_document", "a_fournir");
    await supabase.from("documents").insert(drafts);
    const signatures = construireSignatures(dossier, associes);
    await supabase
      .from("signatures_electroniques")
      .upsert(signatures, { onConflict: "dossier_id,type_document", ignoreDuplicates: true });

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
    await supabase.from("events_dossier").insert({
      dossier_id: dossier.id,
      type_event: "checklist_generee",
      message: `Checklist documentaire générée : ${drafts.filter((d) => d.origine === "a_fournir").length} justificatif(s) à fournir et ${signatures.length} document(s) à signer électroniquement.`,
    });
    setBusy(false);
    toast.success("Dossier validé. Votre checklist de documents est prête.");
    navigate({ to: "/documents" });
  }

  if (!dossier) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">
          Chargement de votre dossier…
        </div>
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
  /** Aperçu dynamique de la checklist, recalculé à chaque réponse. */
  const apercuChecklist = piecesEnDrafts(dossier, associes);
  const apercuSignatures = construireSignatures(dossier, associes);

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
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2"
              onClick={() => allerA(etape - 1)}
            >
              <ArrowLeft strokeWidth={1.5} /> Retour
            </Button>
          )}

          <h1 className="font-serif text-3xl">{titreEtape}</h1>

          {/* 1 — FORME */}
          {cle === "forme" && (
            <div className="mt-6 space-y-3">
              <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-medium">Pour qui créez-vous cette société ?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { v: "moi", t: "Je crée une société pour moi" },
                    { v: "tiers", t: "Je crée une société pour le compte d'un tiers" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() =>
                        patch({
                          pour_qui: o.v,
                          ...(o.v === "tiers" ? { routage_cabinet: true } : {}),
                        })
                      }
                      className={`rounded-md border px-3 py-2.5 text-left text-sm ${dossier.pour_qui === o.v ? "border-accent bg-accent/5" : "border-border bg-background"}`}
                    >
                      {o.t}
                    </button>
                  ))}
                </div>
              </div>

              {FORMES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    const roles = rolesPour(f.value).map((r) => r.v);
                    patch({
                      forme_juridique: f.value,
                      ...(dossier.role_demandeur && !roles.includes(dossier.role_demandeur)
                        ? { role_demandeur: null }
                        : {}),
                    });
                  }}
                  className={`w-full rounded-lg border px-5 py-4 text-left transition-colors hover:border-accent ${
                    forme === f.value ? "border-accent bg-accent/5" : "border-border bg-surface"
                  }`}
                >
                  <span className="font-semibold">{f.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{f.desc}</span>
                </button>
              ))}

              <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-medium">Quel sera votre rôle dans la direction ?</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {minimumLegal(forme)}
                </p>
                {ei ? (
                  <p className="text-sm leading-relaxed">
                    En entreprise individuelle, il n'y a ni dirigeant ni associé à désigner : vous
                    êtes l'unique exploitant de l'entreprise.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {rolesPour(forme).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => patch({ role_demandeur: o.v })}
                          className={`rounded-md border px-3 py-2.5 text-left text-sm ${dossier.role_demandeur === o.v ? "border-accent bg-accent/5" : "border-border bg-background"}`}
                        >
                          {o.t}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ce choix oriente le parcours ; la désignation définitive des dirigeants et des
                      associés se fait à l'étape « Associés et gérance ».
                    </p>
                  </>
                )}
              </div>

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
                  {!ei && <Requis />}
                </Label>
                <Input
                  id="denom"
                  maxLength={120}
                  value={dossier.denomination}
                  onChange={(e) => patch({ denomination: e.target.value })}
                />
                <Err nom="denomination" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sigle">{ei ? "Enseigne (facultatif)" : "Sigle (facultatif)"}</Label>
                <Input
                  id="sigle"
                  maxLength={40}
                  value={dossier.sigle ?? ""}
                  onChange={(e) => patch({ sigle: e.target.value })}
                />
              </div>
              <VerifDenomination
                denomination={dossier.denomination ?? ""}
                codesNaf={activites.map((a) => a.naf_code)}
                onRisque={(niveau) => patch({ denomination_risque: niveau })}
              />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="verif"
                  checked={dossier.denomination_verifiee}
                  onCheckedChange={(v) => patch({ denomination_verifiee: v === true })}
                  className="mt-0.5"
                />
                <Label htmlFor="verif" className="text-sm font-normal">
                  J'ai pris connaissance de ces informations et vérifié, dans la base des marques de
                  l'INPI, qu'aucune marque antérieure ne crée de risque de confusion avec ce nom.
                  J'en assume la responsabilité.
                  <Requis />
                </Label>
              </div>
              <Err nom="denomination_verifiee" />
              <MentionObligatoire />
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
                {
                  v: "domiciliataire",
                  t: "Société de domiciliation",
                  d: "Une adresse professionnelle fournie par un prestataire agréé, avec un contrat et un numéro d'agrément.",
                },
                {
                  v: "local",
                  t: "Local commercial ou professionnel",
                  d: "Vous disposez d'un bail ou d'un titre d'occupation à votre nom.",
                },
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
              <Err nom="siege_type" />
              {dossier.siege_type && <AdresseSiege dossier={dossier} patch={patch} />}
              <Err nom="siege_adresse" />

              {dossier.siege_type === "domiciliataire" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dnom">Nom du domiciliataire</Label>
                    <Input
                      id="dnom"
                      maxLength={120}
                      value={dossier.domiciliataire_nom ?? ""}
                      onChange={(e) => patch({ domiciliataire_nom: e.target.value })}
                    />
                    <Err nom="domiciliataire_nom" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dag">Numéro d'agrément</Label>
                    <Input
                      id="dag"
                      maxLength={60}
                      value={dossier.domiciliataire_agrement ?? ""}
                      onChange={(e) => patch({ domiciliataire_agrement: e.target.value })}
                    />
                    <Err nom="domiciliataire_agrement" />
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

              <div className="rounded-md border border-border bg-surface p-4">
                <Label htmlFor="descr" className="text-sm font-medium">
                  Ajouter une activité — décrivez-la en quelques mots
                </Label>
                <p className="mt-1 text-sm text-muted-foreground text-justify">
                  Votre société peut exercer une seule activité ou plusieurs. La première de la
                  liste est l'activité principale ; les suivantes sont des activités accessoires.
                  Décrivez ici une activité à la fois : l'assistant en déduit un code d'activité
                  INSEE estimé (non officiel), rédige le paragraphe à insérer dans les statuts et
                  indique si l'activité est, en règle générale, réglementée. Vous pouvez tout
                  modifier ensuite.
                </p>
                <Textarea
                  id="descr"
                  rows={3}
                  maxLength={600}
                  className="mt-3"
                  placeholder="Ex. : je crée des sites internet pour des artisans et j'assure leur maintenance."
                  value={descriptionActivite}
                  onChange={(e) => setDescriptionActivite(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    disabled={redaction || descriptionActivite.trim().length < 10}
                    onClick={ajouterDepuisDescription}
                  >
                    <Sparkle strokeWidth={1.5} />
                    {redaction ? "Analyse en cours…" : "Ajouter cette activité"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      ajouterActivite(nouvelleActivite({ source: "libre", texte: "" }))
                    }
                  >
                    <Plus strokeWidth={1.5} /> Saisir moi-même une activité
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Rédaction et code d'activité proposés à titre informatif, à relire et à adapter :
                  ils ne constituent pas un conseil juridique.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Vos activités, dans l'ordre</Label>
                {activites.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucune activité pour l'instant : décrivez-en une ci-dessus.
                  </p>
                )}
                {activites.map((a, i) => (
                  <BlocActivite
                    key={a.id}
                    activite={a}
                    index={i}
                    dernier={i === activites.length - 1}
                    onChange={(valeurs) => modifierActivite(a.id, valeurs)}
                    onMonter={() => majActivites(deplacer(activites, i, i - 1))}
                    onDescendre={() => majActivites(deplacer(activites, i, i + 1))}
                    onSupprimer={() => majActivites(activites.filter((x) => x.id !== a.id))}
                  />
                ))}
                <Err nom="objets" />
                <Err nom="justificatifs" />

                {activites.length > 0 && (
                  <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed text-justify">
                    Objet social retenu dans vos statuts, dans cet ordre :{" "}
                    {activites
                      .map((a) => a.texte.trim())
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="objets-confirmes"
                    checked={Boolean(dossier.objets_confirmes_le)}
                    onCheckedChange={(v) =>
                      patch({ objets_confirmes_le: v === true ? new Date().toISOString() : null })
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="objets-confirmes"
                    className="text-sm font-normal leading-relaxed text-justify"
                  >
                    J'ai relu la liste ci-dessus : elle correspond exactement aux activités que la
                    société exercera, sans activité oubliée ni activité qui n'a plus lieu d'y
                    figurer.
                  </Label>
                </div>
                <div className="mt-2">
                  <Err nom="objets_confirmes" />
                </div>
              </div>

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
                  des dividendes, et sert de repère aux banques, aux bailleurs et aux clients. La
                  loi ne fixe aucun minimum (1 € suffit) pour les formes proposées ici, mais un
                  capital très faible se remarque : il figure sur tous les documents officiels et
                  peut compliquer l'obtention d'un financement. Un capital cohérent avec les besoins
                  de démarrage est généralement retenu. Les sommes déposées ne sont pas bloquées :
                  elles sont libérées sur le compte de la société dès l'immatriculation et servent à
                  financer l'activité.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cap">Montant du capital social (minimum 1 €)</Label>
                <Input
                  id="cap"
                  type="number"
                  min={1}
                  step="1"
                  value={dossier.capital_montant}
                  onChange={(e) =>
                    patch({ capital_montant: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
                <Err nom="capital_montant" />

                <p className="text-xs text-muted-foreground">Valeur suggérée : 1 000 €.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valpart">Valeur nominale d'une part ou action (€)</Label>
                <Input
                  id="valpart"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={Number(dossier.valeur_part)}
                  onChange={(e) =>
                    patch({ valeur_part: Math.max(0.01, Number(e.target.value) || 1) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  1 € par défaut : le nombre de titres est alors égal au montant apporté, ce qui
                  simplifie les répartitions ultérieures. Aucun montant négatif n'est accepté. Le
                  capital retenu représente{" "}
                  {Math.floor(
                    Number(dossier.capital_montant) / Math.max(0.01, Number(dossier.valeur_part)),
                  )}{" "}
                  titres au total.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib">Libération à la constitution (%)</Label>
                <Input
                  id="lib"
                  type="number"
                  min={libMin}
                  max={100}
                  value={dossier.capital_liberation}
                  onChange={(e) => patch({ capital_liberation: Number(e.target.value) })}
                />
                <Err nom="capital_liberation" />

                <p className="text-sm leading-relaxed">
                  Règle applicable :{" "}
                  {isSas(forme)
                    ? "en SAS et SASU, au moins 50 % des apports en numéraire doivent être libérés à la constitution, le solde dans les 5 ans suivant l'immatriculation."
                    : forme === "SCI"
                      ? "en SCI, la libération des apports est fixée librement par les statuts ; le solde reste dû selon les modalités qu'ils prévoient."
                      : "en SARL et EURL, au moins 20 % des apports en numéraire doivent être libérés à la constitution, le solde dans les 5 ans suivant l'immatriculation."}
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
                      Une libération partielle est mentionnée publiquement et pèse sur la
                      crédibilité financière de la société.
                    </li>
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banque">Établissement bancaire de dépôt des fonds</Label>
                <Input
                  id="banque"
                  value={dossier.banque_depot ?? ""}
                  onChange={(e) => patch({ banque_depot: e.target.value })}
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground">
                  Nom de la banque où le capital sera déposé (ex. Qonto, Crédit Agricole de
                  Lorraine). Cette mention figure dans les statuts.
                </p>
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
                  onCheckedChange={(v) =>
                    patch({
                      apport_nature: v === true,
                      routage_cabinet:
                        v === true || dossier.activite_reglementee || dossier.apport_industrie,
                    })
                  }
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
                  onCheckedChange={(v) =>
                    patch({
                      apport_industrie: v === true,
                      routage_cabinet:
                        v === true || dossier.activite_reglementee || dossier.apport_nature,
                    })
                  }
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
              <EncadreRegimes />
              <EncadreMineur />

              {["apports", "dirigeants", "president", "identites"].some((k) => erreurs[k]) && (
                <div className="space-y-1 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                  <Err nom="apports" />
                  <Err nom="dirigeants" />
                  <Err nom="president" />
                  <Err nom="identites" />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(!ei || associes.length === 0) && (
                  <Button variant="outline" onClick={() => ajouterAssocie("personne_physique")}>
                    <Plus strokeWidth={1.5} />{" "}
                    {ei ? "Renseigner mon identité" : "Ajouter une personne physique"}
                  </Button>
                )}
                {!ei && (
                  <Button variant="outline" onClick={() => ajouterAssocie("personne_morale")}>
                    <Plus strokeWidth={1.5} /> Ajouter une personne morale
                  </Button>
                )}
              </div>

              {associes.map((a) => (
                <div
                  key={a.id}
                  className="space-y-4 rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {a.type === "personne_morale" ? "Personne morale" : "Personne physique"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => supprimerAssocie(a.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 strokeWidth={1.5} />
                    </Button>
                  </div>

                  {a.type === "personne_physique" ? (
                    <>
                      <AssocieIdentite associe={a} onChange={(v) => majAssocie(a.id, v)} />
                      {estMineur(a) && <EncadreMineur signale />}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          className={champ}
                          value={a.situation_matrimoniale ?? ""}
                          onChange={(e) =>
                            majAssocie(a.id, {
                              situation_matrimoniale: e.target.value,
                              regime_matrimonial: "non_applicable",
                              contrat_mariage: false,
                            })
                          }
                        >
                          <option value="">Situation matrimoniale…</option>
                          {SITUATIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {(a.situation_matrimoniale === "marie" ||
                          a.situation_matrimoniale === "pacse") && (
                          <select
                            className={champ}
                            value={a.regime_matrimonial ?? ""}
                            onChange={(e) =>
                              majAssocie(a.id, {
                                regime_matrimonial: e.target.value,
                                contrat_mariage: REGIMES_AVEC_CONTRAT.includes(e.target.value),
                              })
                            }
                          >
                            <option value="">
                              {a.situation_matrimoniale === "pacse"
                                ? "Régime du PACS…"
                                : "Régime matrimonial…"}
                            </option>
                            {(a.situation_matrimoniale === "pacse"
                              ? REGIMES_PACS
                              : REGIMES_MARIAGE
                            ).map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {a.situation_matrimoniale === "marie" && (
                          <div className="sm:col-span-2 grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`dm-${a.id}`}>
                                Date du mariage
                              </Label>
                              <Input
                                id={`dm-${a.id}`}
                                type="date"
                                value={a.date_mariage ?? ""}
                                onChange={(e) =>
                                  majAssocie(a.id, { date_mariage: e.target.value || null })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`lm-${a.id}`}>
                                Lieu du mariage (commune)
                              </Label>
                              <Input
                                id={`lm-${a.id}`}
                                maxLength={120}
                                value={a.lieu_mariage ?? ""}
                                onChange={(e) => majAssocie(a.id, { lieu_mariage: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`cjdn-${a.id}`}>
                                Date de naissance du conjoint
                              </Label>
                              <Input
                                id={`cjdn-${a.id}`}
                                type="date"
                                value={a.conjoint_date_naissance ?? ""}
                                onChange={(e) =>
                                  majAssocie(a.id, {
                                    conjoint_date_naissance: e.target.value || null,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`cjln-${a.id}`}>
                                Lieu de naissance du conjoint (commune)
                              </Label>
                              <Input
                                id={`cjln-${a.id}`}
                                maxLength={120}
                                value={a.conjoint_lieu_naissance ?? ""}
                                onChange={(e) =>
                                  majAssocie(a.id, { conjoint_lieu_naissance: e.target.value })
                                }
                              />
                            </div>
                            <p className="sm:col-span-2 text-xs text-muted-foreground">
                              Ces informations figurent dans la comparution des statuts.
                            </p>
                          </div>
                        )}

                        {(a.situation_matrimoniale === "marie" ||
                          a.situation_matrimoniale === "pacse") && (
                          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`cjc-${a.id}`}>
                                Civilité {a.situation_matrimoniale === "pacse" ? "du partenaire" : "du conjoint"}
                              </Label>
                              <select
                                id={`cjc-${a.id}`}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={a.conjoint_civilite ?? ""}
                                onChange={(e) =>
                                  majAssocie(a.id, { conjoint_civilite: e.target.value || null })
                                }
                              >
                                <option value="">—</option>
                                {["Monsieur", "Madame"].map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`cjp-${a.id}`}>
                                Prénom {a.situation_matrimoniale === "pacse" ? "du partenaire" : "du conjoint"}
                              </Label>
                              <Input
                                id={`cjp-${a.id}`}
                                maxLength={80}
                                value={a.conjoint_prenom ?? ""}
                                onChange={(e) => majAssocie(a.id, { conjoint_prenom: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs" htmlFor={`cjn-${a.id}`}>
                                Nom {a.situation_matrimoniale === "pacse" ? "du partenaire" : "du conjoint"}
                              </Label>
                              <Input
                                id={`cjn-${a.id}`}
                                maxLength={120}
                                value={a.conjoint_nom ?? ""}
                                onChange={(e) => majAssocie(a.id, { conjoint_nom: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {(a.situation_matrimoniale === "marie" ||
                          a.situation_matrimoniale === "pacse") && (
                          <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/40 p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`ctr-${a.id}`}
                                checked={a.contrat_mariage}
                                onCheckedChange={(v) =>
                                  majAssocie(a.id, { contrat_mariage: v === true })
                                }
                                className="mt-0.5"
                              />
                              <Label
                                htmlFor={`ctr-${a.id}`}
                                className="text-sm font-normal leading-relaxed"
                              >
                                {a.situation_matrimoniale === "pacse"
                                  ? "Une convention de PACS particulière a été signée (régime de l'indivision)."
                                  : "Un contrat de mariage a été signé devant notaire."}
                              </Label>
                            </div>
                            {a.contrat_mariage && (
                              <Input
                                maxLength={200}
                                placeholder={
                                  a.situation_matrimoniale === "pacse"
                                    ? "Date de la convention et, le cas échéant, notaire"
                                    : "Date du contrat et nom du notaire"
                                }
                                value={a.contrat_mariage_detail ?? ""}
                                onChange={(e) =>
                                  majAssocie(a.id, { contrat_mariage_detail: e.target.value })
                                }
                              />
                            )}
                            <p className="text-sm text-muted-foreground text-justify">
                              {a.situation_matrimoniale === "pacse"
                                ? "À défaut de convention particulière, le PACS relève de la séparation des patrimoines : chacun reste propriétaire de ce qu'il acquiert."
                                : "À défaut de contrat de mariage, vous relevez de la communauté légale réduite aux acquêts : les biens et revenus acquis pendant le mariage sont communs."}
                            </p>
                          </div>
                        )}

                        {a.situation_matrimoniale === "marie" &&
                          a.regime_matrimonial === "regime_etranger" && (
                            <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/50 p-3">
                              <Label className="text-sm">
                                Votre régime comporte-t-il une masse commune de biens (communauté) ?
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { v: "oui", t: "Oui" },
                                  { v: "non", t: "Non" },
                                  { v: "je_ne_sais_pas", t: "Je ne sais pas" },
                                ].map((o) => (
                                  <Button
                                    key={o.v}
                                    type="button"
                                    size="sm"
                                    variant={
                                      a.regime_etranger_communautaire === o.v
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      majAssocie(a.id, {
                                        regime_etranger_communautaire: o.v,
                                        ...(o.v === "non" ? { apport_fonds_communs: false } : {}),
                                      })
                                    }
                                  >
                                    {o.t}
                                  </Button>
                                ))}
                              </div>
                              <EncadrePliable titre="Pourquoi cette question ?">
                                <p>
                                  De nombreux régimes légaux étrangers comportent une masse commune
                                  de biens. Présumer une séparation exposerait l'apport à une
                                  contestation. Si vous ne savez pas, votre dossier est soumis à la
                                  revue d'un professionnel. Information générale, pas un conseil.
                                </p>
                              </EncadrePliable>
                            </div>
                          )}

                        {a.situation_matrimoniale === "pacse" && (
                          <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/50 p-3">
                            <Label className="text-xs" htmlFor={`pacs-${a.id}`}>
                              Date de conclusion du PACS
                            </Label>
                            <Input
                              id={`pacs-${a.id}`}
                              type="date"
                              value={a.date_pacs ?? ""}
                              onChange={(e) => {
                                const v = e.target.value || null;
                                const avant2007 = Boolean(v && v < "2007-01-01");
                                majAssocie(a.id, {
                                  date_pacs: v,
                                  ...(avant2007 && !a.regime_matrimonial?.endsWith("_pacs")
                                    ? {
                                        regime_matrimonial: "indivision_pacs",
                                        contrat_mariage: true,
                                      }
                                    : {}),
                                  ...(avant2007 && a.regime_matrimonial === "separation_pacs"
                                    ? { regime_matrimonial: "indivision_pacs" }
                                    : {}),
                                });
                              }}
                            />
                            {a.date_pacs && a.date_pacs < "2007-01-01" && (
                              <p className="text-sm leading-relaxed">
                                Votre PACS a été conclu avant 2007 : sauf convention modificative,
                                il relève de la présomption d'indivision. Vous pouvez corriger le
                                régime si vous disposez d'une convention.
                              </p>
                            )}
                          </div>
                        )}

                        {(a.situation_matrimoniale === "veuf" ||
                          a.situation_matrimoniale === "divorce") && (
                          <div className="sm:col-span-2">
                            <EncadrePliable titre="Communauté ou succession non liquidée : ce qu'il faut savoir">
                              <p>
                                Si la communauté ou la succession n'est pas encore liquidée, les
                                fonds peuvent être en indivision : l'accord des co-indivisaires est
                                alors nécessaire pour l'apport. En cas de doute, demandez la revue
                                par l'expert-comptable. Information générale, pas un conseil.
                              </p>
                            </EncadrePliable>
                          </div>
                        )}

                        {(a.situation_matrimoniale === "marie" ||
                          a.situation_matrimoniale === "pacse") &&
                          (estCommunautaire(a) || a.regime_matrimonial === "indivision_pacs") &&
                          (FORMES_COMMUNAUTE.includes(forme) ||
                            a.regime_matrimonial === "indivision_pacs") && (
                            <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/50 p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`fc-${a.id}`}
                                  checked={a.apport_fonds_communs}
                                  onCheckedChange={(v) =>
                                    majAssocie(a.id, { apport_fonds_communs: v === true })
                                  }
                                  className="mt-0.5"
                                />
                                <Label htmlFor={`fc-${a.id}`} className="text-sm font-normal">
                                  L'apport provient de fonds communs ou indivis du couple.
                                </Label>
                              </div>
                              <p className="text-sm text-justify">
                                {a.situation_matrimoniale === "pacse"
                                  ? "Dans ce cas, le consentement de votre partenaire co-indivisaire est requis (art. 815-3 du Code civil). Un consentement sera généré et devra être signé avant la signature des statuts."
                                  : "Dans ce cas, votre conjoint doit être averti de l'apport (art. 1832-2 du Code civil), et cet avertissement est justifié dans les statuts. Un courrier d'information sera généré et devra être signé avant la signature des statuts."}
                              </p>
                              {a.apport_fonds_communs && (
                                <div className="space-y-1">
                                  <Label className="text-xs" htmlFor={`cj-${a.id}`}>
                                    {a.situation_matrimoniale === "pacse"
                                      ? "Prénom et nom du partenaire"
                                      : "Prénom et nom du conjoint"}
                                  </Label>
                                  <Input
                                    id={`cj-${a.id}`}
                                    maxLength={120}
                                    value={a.conjoint_nom ?? ""}
                                    onChange={(e) =>
                                      majAssocie(a.id, { conjoint_nom: e.target.value })
                                    }
                                  />
                                </div>
                              )}
                              {forme === "SARL" &&
                                a.situation_matrimoniale === "marie" &&
                                a.apport_fonds_communs && (
                                  <div className="space-y-2 rounded-md border border-border bg-background p-3">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`rev-${a.id}`}
                                        checked={a.conjoint_revendique === true}
                                        onCheckedChange={(v) =>
                                          majAssocie(a.id, { conjoint_revendique: v === true })
                                        }
                                        className="mt-0.5"
                                      />
                                      <Label
                                        htmlFor={`rev-${a.id}`}
                                        className="text-sm font-normal leading-relaxed"
                                      >
                                        Le conjoint revendique la qualité d'associé pour la moitié
                                        des parts souscrites (art. 1832-2 du Code civil).
                                      </Label>
                                    </div>
                                    <p className="text-sm text-justify text-muted-foreground">
                                      {a.conjoint_revendique
                                        ? "Le conjoint devient associé : la moitié des parts que vous souscrivez lui est attribuée dans les statuts, il figure dans la comparution et signe les actes. Sa date et son lieu de naissance sont obligatoires. Le dossier est soumis à la revue du cabinet."
                                        : "À défaut de revendication, une clause de renonciation figure dans les statuts. Le conjoint pourra revendiquer cette qualité ultérieurement dans les conditions légales."}
                                    </p>
                                  </div>
                                )}
                            </div>
                          )}
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Dénomination"
                        maxLength={120}
                        value={a.denomination ?? ""}
                        onChange={(e) => majAssocie(a.id, { denomination: e.target.value })}
                      />
                      <Input
                        placeholder="Forme"
                        maxLength={40}
                        value={a.forme ?? ""}
                        onChange={(e) => majAssocie(a.id, { forme: e.target.value })}
                      />
                      <Input
                        placeholder="SIREN"
                        maxLength={20}
                        value={a.siren ?? ""}
                        onChange={(e) => majAssocie(a.id, { siren: e.target.value })}
                      />
                      <Input
                        placeholder="Siège"
                        maxLength={200}
                        value={a.siege ?? ""}
                        onChange={(e) => majAssocie(a.id, { siege: e.target.value })}
                      />
                      <Input
                        placeholder="Représentant"
                        maxLength={120}
                        value={a.representant ?? ""}
                        onChange={(e) => majAssocie(a.id, { representant: e.target.value })}
                      />
                      <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/50 p-3">
                        <Label className="text-xs" htmlFor={`be-${a.id}`}>
                          Personnes physiques qui contrôlent cette société (une par ligne)
                        </Label>
                        <Textarea
                          id={`be-${a.id}`}
                          rows={3}
                          maxLength={600}
                          placeholder="Prénom NOM — nature du contrôle (détention, direction…)"
                          value={a.beneficiaires_indirects ?? ""}
                          onChange={(e) =>
                            majAssocie(a.id, { beneficiaires_indirects: e.target.value })
                          }
                        />
                        <EncadrePliable titre="Pourquoi identifier ces personnes ?">
                          <p>
                            Le registre des bénéficiaires effectifs remonte la chaîne de détention
                            jusqu'aux personnes physiques (art. L. 561-2-2 et R. 561-1 du code
                            monétaire et financier). Votre dossier est soumis à la revue d'un
                            professionnel pour vérifier cette chaîne. Information générale, pas un
                            conseil.
                          </p>
                        </EncadrePliable>
                      </div>
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
                          disabled={
                            a.type === "personne_morale" && !isSas(forme) && forme !== "SCI"
                          }
                          onCheckedChange={(v) =>
                            majAssocie(a.id, {
                              est_dirigeant: v === true,
                              ...(v === true ? {} : { fonction: null }),
                            })
                          }
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
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
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
                <p
                  className={`rounded-md border p-3 text-sm ${capitalOk ? "border-success/40 bg-success/8" : "border-destructive/40 bg-destructive/8"}`}
                >
                  Total des apports : {euro(totalApports)} — capital social :{" "}
                  {euro(Number(dossier.capital_montant))}.
                  {capitalOk
                    ? " Les montants correspondent."
                    : " Les deux montants doivent être identiques pour continuer."}
                </p>
              )}
              {!ei && dirigeants.length === 0 && (
                <p className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-justify">
                  Aucun dirigeant n'est désigné :{" "}
                  {isSas(forme)
                    ? "une SAS ou une SASU doit avoir un président."
                    : "votre société doit avoir au moins un gérant."}
                </p>
              )}
              {sas && !presidentDesigne && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm leading-relaxed text-justify">
                  <strong>Condition obligatoire :</strong> une SAS ou une SASU doit obligatoirement
                  avoir un président, personne physique ou personne morale. Sans président désigné,
                  les statuts sont incomplets et le greffe rejette l'immatriculation : la validation
                  du dossier restera bloquée tant que la fonction n'est pas attribuée à l'un des
                  associés ou dirigeants renseignés ci-dessus.
                </p>
              )}
              {mineurs.length > 0 && <EncadreMineur signale />}
              {ei && (
                <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed text-justify">
                  L'entreprise individuelle n'a ni capital social, ni associé : seules vos
                  informations personnelles sont nécessaires. Depuis le 15 mai 2022, votre
                  patrimoine personnel est de plein droit distinct de votre patrimoine
                  professionnel.
                </p>
              )}
            </div>
          )}

          {/* 8 — OPTIONS */}
          {cle === "situation" && (
            <div className="mt-6">
              <SituationChecklist
                dossier={dossier}
                associes={associes}
                patch={patch}
                majAssocie={majAssocie}
              />
            </div>
          )}

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
                    <Button
                      key={o}
                      type="button"
                      variant={dossier.option_fiscale === o ? "default" : "outline"}
                      onClick={() => patch({ option_fiscale: o })}
                    >
                      {o}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Régime de TVA</Label>
                {TVA_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => patch({ regime_tva: t.value })}
                    className={`w-full rounded-lg border px-4 py-3 text-left ${dossier.regime_tva === t.value ? "border-accent bg-accent/5" : "border-border bg-surface"}`}
                  >
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
                  <Checkbox
                    id="acre"
                    checked={dossier.demande_acre}
                    onCheckedChange={(v) => patch({ demande_acre: v === true })}
                    className="mt-0.5"
                  />
                  <Label htmlFor="acre" className="text-sm font-normal">
                    Je souhaite demander l'ACRE.
                  </Label>
                </div>
                <p className="text-sm">
                  L'ACRE est une exonération partielle et temporaire de certaines cotisations
                  sociales, soumise à conditions d'éligibilité appréciées par l'organisme compétent.
                </p>
              </div>

              <div className="rounded-md border border-accent/40 bg-accent/10 p-4">
                <p className="text-sm leading-relaxed">
                  Ces choix fiscaux et sociaux, vos statuts et la cohérence de vos pièces peuvent
                  être revus par un expert-comptable dans le cadre d'une prestation unique : la
                  relecture complète du dossier, {euro(relectureHt)} HT ({euro(relectureHt * 1.2)}{" "}
                  TTC, TVA 20 % en sus du montant HT). Elle se choisit à l'étape « Validation ».
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Information générale — ne constitue pas un conseil.
                </p>
              </div>
            </div>
          )}

          {/* LETTRE DE MISSION */}
          {cle === "mission" && (
            <div className="mt-6 space-y-5">
              <p className="text-base leading-relaxed text-justify">
                La mission comptable est la contrepartie des honoraires de création offerts. La
                lettre de mission comporte des mentions obligatoires : l'identité de la société, son
                activité, son adresse et les régimes fiscaux retenus. Elle ne peut donc être établie
                qu'une fois ces informations renseignées.
              </p>

              {!dossier.denomination.trim() ? (
                <p className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm leading-relaxed text-justify">
                  La dénomination de votre société n'est pas renseignée. Revenez à l'étape «
                  Dénomination » : sans nom de société, la lettre de mission ne peut pas mentionner
                  l'identité du client et n'est pas valable.
                </p>
              ) : (
                <>
                  <div className="space-y-3 rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-justify">
                    <p>
                      <strong>Client.</strong> {dossier.denomination} ({dossier.forme_juridique} en
                      cours de constitution)
                      {dossier.siege_adresse ? `, siège : ${dossier.siege_adresse}` : ""}.
                    </p>
                    <p>
                      <strong>Activité.</strong>{" "}
                      {dossier.objet_social?.slice(0, 300) ||
                        "À compléter à l'étape « Objet social »."}
                      {dossier.code_naf ? ` (code d'activité ${dossier.code_naf})` : ""}
                    </p>
                    <p>
                      <strong>Exercice social.</strong> Clôture au {dossier.date_cloture_exercice}
                      {dossier.exercice_etendu
                        ? " — premier exercice étendu (plus de 12 mois, un seul franchissement du 31 décembre)"
                        : ""}
                      .
                    </p>
                    <p>
                      <strong>Imposition des bénéfices.</strong>{" "}
                      {dossier.option_fiscale?.trim() ||
                        "Impôt sur les sociétés (IS), régime réel simplifié par défaut"}
                      {!dossier.option_fiscale?.trim()
                        ? ` — régime de droit commun de la forme choisie : ${REGIME_DEFAUT[dossier.forme_juridique]}`
                        : ""}
                    </p>
                    <p>
                      <strong>Taxe sur la valeur ajoutée.</strong>{" "}
                      {TVA_OPTIONS.find((t) => t.value === dossier.regime_tva)?.label ??
                        "Régime réel simplifié (régime par défaut)"}{" "}
                      — déclaration{" "}
                      {dossier.periodicite_tva ??
                        "trimestrielle (périodicité par défaut du réel simplifié)"}
                      .
                    </p>
                    <p>
                      <strong>Objet.</strong> Mission de présentation des comptes annuels réalisée
                      par le cabinet d'expertise comptable partenaire, inscrit à l'Ordre : tenue,
                      comptes annuels, déclarations fiscales courantes et conseil au fil de l'eau.
                    </p>
                    <p>
                      <strong>Honoraires.</strong> {euro(missionMensuelleHt(tarifs))} HT par mois,
                      TVA de 20 % en sus.
                    </p>
                    <p>
                      <strong>Durée et résiliation.</strong> Engagement initial de trois mois, puis
                      résiliation libre par chaque partie, sans frais ni justification.
                    </p>
                    <p>
                      <strong>Honoraires de création offerts sous condition.</strong> En cas de
                      non-respect de l'engagement de 3 mois ou de défaut de paiement, les honoraires
                      de création deviennent exigibles à hauteur de{" "}
                      {euro(penaliteCreationHt(tarifs))} HT.
                    </p>
                    <p>
                      <strong>Frais légaux.</strong> Annonce légale, greffe et bénéficiaires
                      effectifs sont refacturés à l'euro près, sans marge.
                    </p>
                  </div>

                  <EncadreResponsabilite />

                  {dossier.lettre_mission_acceptee_le ? (
                    <p className="rounded-md border border-success/40 bg-success/8 p-3 text-sm">
                      Lettre de mission acceptée par {dossier.lettre_mission_nom} le{" "}
                      {new Date(dossier.lettre_mission_acceptee_le).toLocaleString("fr-FR")}.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2 sm:max-w-sm">
                        <Label htmlFor="tel-contact">
                          Numéro de téléphone{" "}
                          <span className="text-destructive">(obligatoire)</span>
                        </Label>
                        <Input
                          id="tel-contact"
                          type="tel"
                          required
                          aria-required="true"
                          maxLength={20}
                          placeholder="06 12 34 56 78"
                          value={dossier.telephone_contact ?? ""}
                          onChange={(e) => patch({ telephone_contact: e.target.value })}
                        />
                        <Err nom="telephone" />
                        <p className="text-sm text-muted-foreground text-justify">
                          Ce numéro est obligatoire avant la signature de la lettre de mission : le
                          cabinet doit pouvoir vous joindre pour la mission comptable et, le cas
                          échéant, pour la relecture de votre dossier.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="lue"
                          checked={lueMission}
                          onCheckedChange={(v) => setLueMission(v === true)}
                          className="mt-0.5"
                        />
                        <Label htmlFor="lue" className="text-sm font-normal leading-relaxed">
                          J'ai lu la lettre de mission et j'accepte la mission comptable de 3 mois à{" "}
                          {euro(missionMensuelleHt(tarifs))} HT/mois, contrepartie des honoraires de
                          création offerts.
                        </Label>
                      </div>
                      <div className="space-y-2 sm:max-w-sm">
                        <Label htmlFor="nom-accept">Nom complet (valant acceptation)</Label>
                        <Input
                          id="nom-accept"
                          maxLength={120}
                          value={nomAcceptation}
                          onChange={(e) => setNomAcceptation(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (!lueMission || nomAcceptation.trim().length < 3) {
                            toast.error("Cochez la case et indiquez votre nom complet.");
                            return;
                          }
                          if ((dossier.telephone_contact ?? "").replace(/\D/g, "").length < 9) {
                            toast.error("Indiquez un numéro de téléphone valide avant d'accepter.");
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
                      <Err nom="mission" />
                    </div>
                  )}

                  <div className="rounded-md border border-border bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="retractation"
                        checked={
                          Boolean(dossier.renonciation_retractation_le) || renonceRetractation
                        }
                        disabled={Boolean(dossier.renonciation_retractation_le)}
                        onCheckedChange={(v) => {
                          setRenonceRetractation(v === true);
                          if (v === true)
                            patch({ renonciation_retractation_le: new Date().toISOString() });
                        }}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="retractation"
                        className="text-sm font-normal leading-relaxed text-justify"
                      >
                        Je demande expressément que l'exécution de la prestation commence
                        immédiatement, avant l'expiration du délai de rétractation de quatorze
                        jours, et je reconnais que je perdrai mon droit de rétractation une fois la
                        prestation pleinement exécutée ; si je me rétracte avant, je devrai le prix
                        correspondant au service déjà fourni (articles L. 221-18, L. 221-25 et L.
                        221-28, 1° du code de la consommation).
                      </Label>
                    </div>
                    <div className="mt-2">
                      <Err nom="retractation" />
                    </div>
                    {dossier.renonciation_retractation_le && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Demande recueillie le{" "}
                        {new Date(dossier.renonciation_retractation_le).toLocaleString("fr-FR")}.
                      </p>
                    )}
                  </div>
                </>
              )}
              <p className="text-sm text-muted-foreground text-justify">
                La signature électronique sera disponible ultérieurement ; l'acceptation en ligne
                est horodatée et conservée dans votre dossier.
              </p>
            </div>
          )}

          {/* CHOIX DE L'OFFRE */}
          {cle === "validation" && (
            <div className="mt-6 space-y-4">
              <p className="text-base leading-relaxed">
                Choisissez votre offre. L'interrupteur ci-dessous indique si vous confiez également
                votre comptabilité au cabinet : les prix des deux offres s'ajustent en conséquence.
              </p>
              <SelecteurOffre
                offre={dossier.offre}
                avecCompta={dossier.avec_compta}
                onChange={(v: { offre?: CodeOffre; avec_compta?: boolean }) => {
                  const code = v.offre ?? (dossier.offre as CodeOffre | null);
                  const avec = v.avec_compta ?? dossier.avec_compta;
                  const o = offreParCode(offres, code);
                  patch({
                    ...(v.offre ? { offre: v.offre } : {}),
                    ...(v.avec_compta !== undefined ? { avec_compta: v.avec_compta } : {}),
                    prix_creation_ht: prixOffreHt(o, avec),
                    relecture_incluse: code === "creation_ec",
                    voie_validation: code === "creation_ec" ? "cabinet" : "auto",
                  });
                }}
              />
              <Err nom="voie" />
              {dossier.offre === "creation_ec" && <EncadreRelectureLimites />}
              {dossier.offre === "creation_seule" && <EncadreResponsabilite />}
              <Disclaimer />
            </div>
          )}

          {/* FRAIS LÉGAUX ET MOYEN DE PAIEMENT */}
          {cle === "paiement" && (
            <div className="mt-6 space-y-5">
              <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
                {[
                  [
                    "Honoraires de création",
                    "0 € HT (0 € TTC) — offerts en contrepartie de la mission comptable de 3 mois à " +
                      euro(missionMensuelleHt(tarifs)) +
                      " HT/mois (soit " +
                      euro(missionMensuelleHt(tarifs) * 1.2) +
                      " TTC/mois)",
                  ],
                  [
                    "Annonce légale",
                    ei
                      ? "Sans objet (aucune annonce en entreprise individuelle)"
                      : `${euro(cout.annonceTtc / 1.2)} HT — soit ${euro(cout.annonceTtc)} TTC (TVA 20 %)`,
                  ],
                  ["Greffe", `${euro(cout.greffeTtc)} TTC — tarif réglementé, taxes comprises`],
                  [
                    "Bénéficiaires effectifs",
                    ei
                      ? "Sans objet"
                      : `${euro(cout.benefTtc)} TTC — tarif réglementé, taxes comprises`,
                  ],
                  [
                    "Relecture complète du dossier par un expert-comptable",
                    relecture
                      ? `${euro(relectureHt)} HT — soit ${euro(relecture)} TTC (TVA 20 %)`
                      : "Non demandée",
                  ],
                  ["Total dû aujourd'hui", `${euro(cout.totalTtc + relecture)} TTC`],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 p-3 sm:grid-cols-[16rem_1fr]">
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed text-justify">
                Chaque montant ci-dessus précise s'il est exprimé hors taxes (HT) ou toutes taxes
                comprises (TTC). Les tarifs du greffe et des bénéficiaires effectifs sont des tarifs
                réglementés, exprimés taxes comprises. Les frais légaux sont refacturés à l'euro
                près, sans marge. Ils sont dus quelle que soit la solution retenue pour créer votre
                société.
              </p>
              <p className="rounded-md border border-border bg-surface p-4 text-sm leading-relaxed text-justify">
                Aucun prélèvement n'est effectué aujourd'hui. Votre carte est enregistrée en
                garantie de l'engagement de 3 mois de la mission comptable ; les frais légaux et, le
                cas échéant, la relecture vous seront facturés séparément et toujours annoncés avant
                tout débit.
              </p>
              {dossier.moyen_de_paiement_enregistre ? (
                <p className="rounded-md border border-success/40 bg-success/8 p-3 text-sm">
                  Moyen de paiement enregistré le{" "}
                  {dossier.moyen_de_paiement_enregistre_le
                    ? new Date(dossier.moyen_de_paiement_enregistre_le).toLocaleString("fr-FR")
                    : "—"}
                  . Aucun montant n'a été prélevé.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
                    L'enregistrement du moyen de paiement sera activé à l'ouverture du service.
                  </p>
                  {isAdmin && (
                    <div className="rounded-md border border-warning/50 bg-warning/10 p-3">
                      <p className="text-sm font-medium">Administration — mode test interne</p>
                      <Button
                        className="mt-2"
                        variant="outline"
                        onClick={async () => {
                          await patch({
                            moyen_de_paiement_enregistre: true,
                            moyen_de_paiement_enregistre_le: new Date().toISOString(),
                          });
                          await supabase.from("events_dossier").insert({
                            dossier_id: dossier.id,
                            type_event: "paiement_mode_test",
                            message:
                              "Moyen de paiement marqué comme enregistré en mode test interne par un administrateur. Aucune carte bancaire n'a été collectée.",
                          });
                          toast.success("Marqué comme enregistré (mode test interne).");
                        }}
                      >
                        Marquer comme enregistré (mode test interne)
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Service de paiement : {services?.paiement ? "configuré" : "non configuré"}.
                </p>
              )}
            </div>
          )}

          {/* 9 — RECAP */}
          {cle === "recap" && (
            <div className="mt-6 space-y-4">
              {!ei && (
                <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="villesig">Ville de signature des actes</Label>
                    <Input
                      id="villesig"
                      value={dossier.ville_signature ?? dossier.siege_ville ?? ""}
                      onChange={(e) => patch({ ville_signature: e.target.value })}
                      maxLength={80}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pré-remplie avec la ville du siège social ; modifiable.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cloture1">Clôture du premier exercice</Label>
                    <Input
                      id="cloture1"
                      type="date"
                      value={
                        dossier.date_cloture_premier_exercice ??
                        clotureParDefaut(dossier.date_cloture_exercice)
                      }
                      onChange={(e) => patch({ date_cloture_premier_exercice: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Par défaut, le {dateEnLettresFr(clotureParDefaut(dossier.date_cloture_exercice))}.
                      Le premier exercice ne devrait pas se clore au-delà du 31 décembre de l'année
                      civile suivant l'immatriculation.
                    </p>
                    {avertissementPremierExercice(dossier) && (
                      <p className="text-xs text-destructive">
                        {avertissementPremierExercice(dossier)}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                  [
                    "Clôture d'exercice",
                    `${dossier.date_cloture_exercice}${dossier.exercice_etendu ? " — premier exercice étendu" : ""}`,
                  ],
                  [
                    "Périodicité de TVA",
                    dossier.periodicite_tva === "mensuelle"
                      ? "Mensuelle"
                      : dossier.periodicite_tva === "trimestrielle"
                        ? "Trimestrielle"
                        : "—",
                  ],
                  [
                    "Création",
                    dossier.pour_qui === "tiers" ? "Pour le compte d'un tiers" : "Pour moi-même",
                  ],
                  ["Option fiscale", dossier.option_fiscale || "—"],
                  [
                    "Régime de TVA",
                    TVA_OPTIONS.find((t) => t.value === dossier.regime_tva)?.label ?? "—",
                  ],
                  ["ACRE", dossier.demande_acre ? "Demandée" : "Non demandée"],
                  [
                    "Associés",
                    associes
                      .map((a) =>
                        a.type === "personne_morale" ? a.denomination : `${a.prenom} ${a.nom}`,
                      )
                      .join(", ") || "—",
                  ],
                  [
                    "Lettre de mission",
                    dossier.lettre_mission_acceptee_le
                      ? `Acceptée par ${dossier.lettre_mission_nom}`
                      : "Non acceptée",
                  ],
                  [
                    "Validation",
                    dossier.voie_validation === "auto"
                      ? "Sans relecture du cabinet"
                      : dossier.voie_validation === "cabinet"
                        ? `Relecture par l'expert-comptable (${euro(relectureHt)} HT)`
                        : "—",
                  ],
                  [
                    "Moyen de paiement",
                    dossier.moyen_de_paiement_enregistre
                      ? "Enregistré (simulation)"
                      : "Non enregistré",
                  ],
                ].map(([k, v]) => (
                  <div key={k as string} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="text-sm">{v}</dd>
                  </div>
                ))}
              </dl>

              <section className="rounded-lg border border-border bg-surface p-5">
                <h3 className="font-serif text-xl">Les justificatifs qui vous seront demandés</h3>
                <p className="mt-1 text-sm text-muted-foreground text-justify">
                  Cette liste est construite à partir de vos réponses : elle change si votre
                  situation change. Après validation, elle apparaîtra dans « Mes documents » et le
                  dossier ne pourra pas être transmis au cabinet tant que chaque pièce obligatoire
                  n'aura pas été déposée puis attestée conforme.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {apercuChecklist.length === 0 && (
                    <li className="text-muted-foreground">
                      Complétez vos réponses pour voir la liste.
                    </li>
                  )}
                  {apercuChecklist.map((d, i) => (
                    <li key={`${d.type_document}-${i}`} className="flex items-start gap-2">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                      <span>
                        {d.libelle}
                        {!d.obligatoire && (
                          <span className="text-muted-foreground"> — facultatif</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted-foreground text-justify">
                  S'y ajoutent {apercuSignatures.length} document(s) que nous préparons et vous
                  ferons signer électroniquement :{" "}
                  {apercuSignatures.map((s) => s.libelle).join(", ")}.
                </p>
              </section>

              <ApercuStatuts dossier={dossier} associes={associes} />

              <EncadreJustificatifs />
              <EncadreSignatureElectronique />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="certif"
                  checked={certifie}
                  onCheckedChange={(v) => setCertifie(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="certif" className="text-sm font-normal">
                  Je certifie l'exactitude des informations saisies.
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pieces"
                  checked={piecesOk}
                  onCheckedChange={(v) => setPiecesOk(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="pieces" className="text-sm font-normal text-justify">
                  Je m'engage à déposer, dans « Mes documents », tous les justificatifs légaux
                  applicables à ma situation avant le dépôt du dossier : justificatif de domicile de
                  moins de trois mois (sauf taxe foncière) et copie recto-verso lisible et valide de
                  la pièce d'identité de chaque associé et dirigeant, portant la mention manuscrite
                  « certifiée conforme à l'original », datée et signée.
                </Label>
              </div>

              <Button size="lg" onClick={validerDossier} disabled={busy}>
                {busy ? "Validation…" : "Valider mon dossier"}
              </Button>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            {cle !== "recap" && <Button onClick={() => continuer(cle)}>Continuer</Button>}
            <CallbackDialog variant="ghost" />
            <RecommandationDialog variant="ghost" />
          </div>

          {modeConception && (
            <div className="mt-4 rounded-md border border-dashed border-warning/60 bg-warning/10 p-3">
              <p className="text-xs font-medium">Mode conception (administrateur, aperçu)</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {cle !== "recap" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => allerA(etape + 1)}
                  >
                    Passer cette étape pour voir la page suivante
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={reinitialiserDossierTest}>
                  Réinitialiser le formulaire
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Ces raccourcis ne sont visibles qu'en aperçu, pour un compte administrateur. Passer
                une étape ne modifie ni n'efface aucune donnée déjà saisie : seule la position dans
                le parcours change, et l'ensemble des contrôles obligatoires est revérifié à la
                validation finale du dossier.
              </p>
            </div>
          )}
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
