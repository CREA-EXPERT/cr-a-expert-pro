import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { AvertissementRejet } from "@/components/AvertissementsPieces";
import { normaliserStatut, aRedeposer, LIBELLE_STATUT } from "@/lib/pieces";
import { activitesDuDossier, libelleActivite } from "@/lib/activites";
import type { Associe, Dossier, DocumentRow } from "@/lib/documents";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verification-finale")({
  head: () => ({
    meta: [
      { title: "Vérification finale de votre dossier — CREA EXPERT" },
      {
        name: "description",
        content:
          "Contrôlez votre dossier de création point par point avant transmission : identités, siège, capital, objet social et pièces justificatives.",
      },
      { property: "og:title", content: "Vérification finale de votre dossier — CREA EXPERT" },
      {
        property: "og:description",
        content: "Le contrôle complet de votre dossier avant transmission au cabinet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationFinale,
});

type Etat = "ok" | "attente" | "manquant";

type LigneControle = {
  cle: string;
  libelle: string;
  detail: string;
  etat: Etat;
  lien: "/creation" | "/documents";
};

const ICONE: Record<Etat, typeof CircleCheck> = {
  ok: CircleCheck,
  attente: CircleAlert,
  manquant: CircleX,
};

const COULEUR: Record<Etat, string> = {
  ok: "text-success",
  attente: "text-warning",
  manquant: "text-destructive",
};

function Ligne({ ligne }: { ligne: LigneControle }) {
  const Icone = ICONE[ligne.etat];
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icone
          className={`mt-0.5 size-5 shrink-0 ${COULEUR[ligne.etat]}`}
          strokeWidth={1.5}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-medium">{ligne.libelle}</p>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {ligne.detail}
          </p>
        </div>
      </div>
      {ligne.etat !== "ok" && (
        <Link to={ligne.lien} className="text-sm underline underline-offset-2">
          Corriger
        </Link>
      )}
    </li>
  );
}

function Section({ titre, lignes }: { titre: string; lignes: LigneControle[] }) {
  if (lignes.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl">{titre}</h2>
      <ul className="space-y-3">
        {lignes.map((l) => (
          <Ligne key={l.cle} ligne={l} />
        ))}
      </ul>
    </section>
  );
}

function VerificationFinale() {
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [chargement, setChargement] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ds } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      const d = ds?.[0] ?? null;
      setDossier(d);
      if (d) {
        const [{ data: as }, { data: dc }] = await Promise.all([
          supabase.from("associes").select("*").eq("dossier_id", d.id),
          supabase.from("documents").select("*").eq("dossier_id", d.id).order("created_at"),
        ]);
        setAssocies(as ?? []);
        setDocs(dc ?? []);
      }
      setChargement(false);
    })();
  }, []);

  if (chargement) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!dossier) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">
          Aucun dossier en cours. Complétez d'abord votre parcours de création.
        </div>
      </PageShell>
    );
  }

  const personnes: LigneControle[] = associes.map((a) => {
    const nom =
      a.type === "personne_morale"
        ? (a.denomination ?? "")
        : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim();
    const manque: string[] = [];
    if (!nom) manque.push("identité");
    if (a.type === "personne_physique" && !a.date_naissance) manque.push("date de naissance");
    if (!a.adresse) manque.push("adresse");
    const roles = [a.est_associe ? "associé" : null, a.est_dirigeant ? "dirigeant" : null]
      .filter(Boolean)
      .join(" et ");
    return {
      cle: a.id,
      libelle: nom || "Personne sans identité renseignée",
      detail:
        manque.length > 0
          ? `Informations manquantes : ${manque.join(", ")}.`
          : `${roles || "Participant"} — né(e) le ${a.date_naissance ?? "—"}, ${a.adresse ?? ""} ${a.adresse_code_postal ?? ""} ${a.adresse_ville ?? ""}`.trim(),
      etat: manque.length > 0 ? "manquant" : "ok",
      lien: "/creation",
    };
  });
  if (associes.length === 0)
    personnes.push({
      cle: "aucun-associe",
      libelle: "Associés et dirigeants",
      detail: "Aucune personne n'a été enregistrée sur ce dossier.",
      etat: "manquant",
      lien: "/creation",
    });

  const siegeComplet = Boolean(
    dossier.siege_voie && dossier.siege_code_postal && dossier.siege_ville,
  );
  const societe: LigneControle[] = [
    {
      cle: "siege",
      libelle: "Siège social et domiciliation",
      detail: siegeComplet
        ? `${dossier.siege_voie}, ${dossier.siege_code_postal} ${dossier.siege_ville} — ${dossier.siege_type ?? "mode de domiciliation non précisé"}`
        : "L'adresse du siège est incomplète.",
      etat: siegeComplet ? "ok" : "manquant",
      lien: "/creation",
    },
    {
      cle: "forme",
      libelle: "Forme juridique et dénomination",
      detail: `${dossier.forme_juridique} — ${dossier.denomination || "dénomination non renseignée"}`,
      etat: dossier.denomination ? "ok" : "manquant",
      lien: "/creation",
    },
    {
      cle: "capital",
      libelle: "Capital et répartition",
      detail:
        dossier.capital_montant > 0
          ? `${dossier.capital_montant} € répartis entre ${associes.filter((a) => a.est_associe).length} associé(s), ${associes.reduce((s, a) => s + (a.nb_titres ?? 0), 0)} titre(s) au total.`
          : "Le capital social n'est pas renseigné.",
      etat: dossier.capital_montant > 0 ? "ok" : "manquant",
      lien: "/creation",
    },
    {
      cle: "objet",
      libelle: "Objet social",
      detail:
        activitesDuDossier(dossier).length > 0
          ? activitesDuDossier(dossier)
              .map((a, i) => libelleActivite(a, i))
              .join(" · ")
          : (dossier.objet_social ?? "Aucune activité décrite."),
      etat: activitesDuDossier(dossier).length > 0 || dossier.objet_social ? "ok" : "manquant",
      lien: "/creation",
    },
  ];

  const pieces: LigneControle[] = docs
    .filter((d) => d.origine === "a_fournir")
    .map((d) => {
      const statut = normaliserStatut(d.statut_document);
      const etat: Etat =
        statut === "valide"
          ? "ok"
          : !d.fichier_url || aRedeposer(statut)
            ? d.obligatoire
              ? "manquant"
              : "attente"
            : d.atteste_conforme
              ? "attente"
              : d.obligatoire
                ? "manquant"
                : "attente";
      return {
        cle: d.id,
        libelle: d.libelle,
        detail:
          d.verification_statut === "en_cours"
            ? "Vérification automatique en cours…"
            : `${LIBELLE_STATUT[statut].label}${d.motif_rejet ? ` — ${d.motif_rejet}` : ""}${!d.obligatoire ? " (facultative)" : ""}`,
        etat,
        lien: "/documents",
      };
    });

  const bloquants = [...personnes, ...societe, ...pieces].filter((l) => l.etat === "manquant");
  const dejaTransmis = [
    "en_revue_cabinet",
    "valide_cabinet",
    "pret_au_depot",
    "depose",
    "immatricule",
  ].includes(dossier.statut);

  async function transmettre() {
    if (!dossier || bloquants.length > 0) return;
    setBusy(true);
    await supabase.from("dossiers").update({ statut: "en_revue_cabinet" }).eq("id", dossier.id);
    await supabase.from("events_dossier").insert({
      dossier_id: dossier.id,
      type_event: "pieces_transmises",
      message:
        "Dossier transmis au cabinet après vérification finale par le client : identités, siège, capital, objet social et pièces contrôlés.",
    });
    setBusy(false);
    toast.success("Votre dossier est transmis au cabinet.");
    navigate({ to: "/tableau-de-bord" });
  }

  return (
    <PageShell>
      <div className="container-page max-w-3xl space-y-8 px-4 py-10">
        <header className="space-y-3">
          <h1 className="font-serif text-3xl">Vérification finale de votre dossier</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Contrôlez chaque élément avant transmission. Une coche verte signale un élément complet,
            un point orange un élément en attente de contrôle, une croix rouge un élément à
            corriger.
          </p>
        </header>

        <AvertissementRejet />

        <Section titre="Associés et dirigeants" lignes={personnes} />
        <Section titre="La société" lignes={societe} />
        <Section titre="Pièces justificatives" lignes={pieces} />

        <section className="rounded-lg border border-accent/40 bg-accent/8 p-6">
          {dejaTransmis ? (
            <p className="max-w-prose text-sm leading-relaxed">
              Votre dossier a déjà été transmis au cabinet. Vous pouvez continuer à déposer des
              pièces complémentaires depuis « Mes documents ».
            </p>
          ) : (
            <>
              <p className="max-w-prose text-sm leading-relaxed">
                {bloquants.length === 0
                  ? "Tous les points de contrôle sont au vert : vous pouvez transmettre votre dossier."
                  : `Transmission impossible : ${bloquants.length} élément(s) restent à corriger — ${bloquants
                      .slice(0, 4)
                      .map((b) => b.libelle)
                      .join(", ")}${bloquants.length > 4 ? "…" : ""}.`}
              </p>
              <Button
                className="mt-4"
                disabled={bloquants.length > 0 || busy}
                onClick={transmettre}
              >
                {busy ? "Transmission…" : "Transmettre mon dossier"}
              </Button>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
