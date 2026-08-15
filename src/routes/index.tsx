import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { FriseCouts } from "@/components/FriseCouts";
import { FormesDetail } from "@/components/FormesDetail";
import { SyntheseImmobilier } from "@/components/SyntheseImmobilier";
import { Disclaimer } from "@/components/Disclaimer";
import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import { BandeauAutorite } from "@/components/BandeauAutorite";
import { RecommandationDialog } from "@/components/RecommandationDialog";
import { LIBELLE_DIPLOMES } from "@/lib/editeur";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CREA EXPERT — Créez votre société en ligne, honoraires offerts" },
      {
        name: "description",
        content:
          "Créez votre SASU, SAS, EURL, SARL, SCI ou entreprise individuelle en ligne. Honoraires de création offerts, frais légaux refacturés à l'euro près, mission comptable de 3 mois à 199 € HT/mois.",
      },
      { property: "og:title", content: "CREA EXPERT — Créez votre société en ligne" },
      {
        property: "og:description",
        content:
          "Honoraires de création offerts. Seuls les frais légaux obligatoires restent à votre charge, sans marge. Un cabinet inscrit à l'Ordre vous accompagne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://crea-expert.fr/" }],
  }),
  component: Accueil,
});

const BADGES = [
  `🇫🇷 ${LIBELLE_DIPLOMES}`,
  "Par vous-même, ou accompagné par un cabinet inscrit à l'Ordre des experts-comptables",
  "Données hébergées en Europe (respect RGPD) et non commercialisées",
];

const ETAPES = [
  {
    n: 1,
    t: "Comparer les formes juridiques (facultatif)",
    d: "Un comparatif pédagogique, critère par critère. Cette étape est optionnelle : si vous savez déjà quelle forme créer, passez directement au dossier.",
  },
  {
    n: 2,
    t: "Complétez votre dossier en ligne",
    d: "Un formulaire guidé, sauvegardé à chaque étape.",
  },
  {
    n: 3,
    t: "Déposez vos pièces",
    d: "Une checklist personnalisée, avec une aide pour chaque document.",
  },
  {
    n: 4,
    t: "Vous validez vos documents",
    d: "Vous validez vous-même vos documents pour aller plus vite, ou demandez leur relecture par un expert-comptable (en option).",
  },
  {
    n: 5,
    t: "Votre société est immatriculée",
    d: "Vous suivez l'avancement depuis votre espace. Le greffe du tribunal peut prendre plusieurs jours, voire plusieurs semaines, pour immatriculer une entreprise, et demander des documents complémentaires en cours d'examen.",
  },
];

const FAQ = [
  {
    q: "Pourquoi est-ce offert ?",
    r: "Parce que notre modèle économique ne repose pas sur les honoraires de création, mais sur la mission comptable. Vous ne payez pas d'honoraires pour la constitution ; en contrepartie, vous vous engagez sur une mission comptable de 3 mois à 199 € HT/mois auprès du cabinet d'expertise comptable partenaire. Les frais légaux (annonce légale, greffe, bénéficiaires effectifs) restent à votre charge et vous sont refacturés à l'euro près.",
  },
  {
    q: "Que se passe-t-il après les 3 mois ?",
    r: "Vous êtes libre. L'engagement porte sur 3 mois ; à leur terme, vous décidez de poursuivre la mission comptable (rien à faire de votre part), ou d'y mettre fin, sans reconduction forcée et sans pénalité.",
  },
  {
    q: "Qui rédige mes statuts ?",
    r: "Vos documents sont générés à partir de vos réponses. Vous pouvez les valider vous-même, ou demander leur relecture par un expert-comptable (option payante, avec engagement de sa responsabilité).",
  },
  {
    q: "Puis-je créer sans souscrire à la mission comptable ?",
    r: "Non. Notre modèle est simple et assumé : la création est offerte parce que le cabinet vous accompagne ensuite en comptabilité pendant au moins 3 mois. Si vous ne souhaitez pas d'accompagnement comptable, notre offre n'est pas adaptée à votre situation.",
  },
  {
    q: "Puis-je créer seul(e) ou à plusieurs ?",
    r: "Les deux. Seul, vous pouvez créer une SASU, une EURL ou une entreprise individuelle. À plusieurs, une SAS, une SARL ou une SCI — cette dernière se crée à partir de deux associés.",
  },
  {
    q: "Une SCI est-elle traitée de la même façon ?",
    r: "Le principe est identique : honoraires de création offerts, frais légaux refacturés à l'euro près, engagement sur une mission comptable de 3 mois à 199 € HT/mois. Pour une SCI, cette mission de 3 mois couvre l'exercice annuel complet, le travail comptable étant concentré sur la déclaration annuelle.",
  },

  {
    q: "Concrètement, comment se déroule une création, étape par étape ?",
    r: "1) Vous complétez votre dossier en ligne (forme juridique, associés, siège, activité, capital, gouvernance). 2) Vos documents sont générés à partir de vos réponses : statuts, formulaires, attestations. 3) Vous les validez vous-même, ou vous demandez leur relecture par un expert-comptable (option payante). 4) Vous déposez le capital social auprès de votre banque, qui délivre une attestation de dépôt des fonds. 5) L'annonce légale est publiée. 6) Le dossier complet est déposé auprès du guichet des formalités des entreprises, qui le transmet au greffe. 7) Après immatriculation, vous recevez votre extrait Kbis et votre numéro SIREN.",
  },
  {
    q: "Quelles pièces dois-je fournir ?",
    r: "La liste exacte dépend de votre situation et vous est affichée dans votre espace, pièce par pièce : pièce d'identité de chaque associé et dirigeant, justificatif de jouissance du siège (bail, attestation de domiciliation ou justificatif de domicile), attestation de dépôt des fonds, et selon les cas des pièces complémentaires (attestation de non-condamnation, justificatif de diplôme pour une activité réglementée, acte de mariage, etc.).",
  },
  {
    q: "Combien de temps prend une création ?",
    r: "Le parcours en ligne se complète généralement en moins de 30 minutes. Ensuite, les délais ne dépendent plus de nous : dépôt du capital en banque (de quelques jours à quelques semaines selon l'établissement), publication de l'annonce légale (généralement sous 24 à 48 heures), puis traitement par l'administration et le greffe, qui peut aller de quelques jours à plusieurs semaines selon les périodes et le greffe compétent. Aucun délai d'immatriculation ne peut être garanti.",
  },
  {
    q: "Qu'est-ce qui peut allonger les délais ?",
    r: "Les trois causes les plus fréquentes : des pièces manquantes ou illisibles, un délai bancaire long pour le dépôt du capital, et une demande de pièce complémentaire ou rectificative de l'administration. Dans ce dernier cas, vous êtes prévenu dans votre espace et accompagné jusqu'à la régularisation.",
  },
  {
    q: "Quand puis-je commencer mon activité ?",
    r: "Une société n'acquiert la personnalité morale qu'à compter de son immatriculation au registre du commerce et des sociétés. Les actes accomplis avant l'immatriculation le sont pour le compte de la société en formation et doivent ensuite être repris par celle-ci.",
  },

  {
    q: "Les frais légaux sont-ils les mêmes partout ?",
    r: "Les frais de greffe et de déclaration des bénéficiaires effectifs sont fixés par voie réglementaire : ils sont identiques quel que soit le prestataire. Le tarif de l'annonce légale est forfaitaire par forme juridique pour la France métropolitaine. Ces montants sont révisés, généralement au 1er janvier ; notre grille est mise à jour en conséquence.",
  },
  {
    q: "Mon activité est-elle éligible ?",
    r: "Le parcours en ligne couvre les activités non réglementées avec des apports en numéraire. Si votre activité est réglementée, si vous réalisez un apport en nature ou si votre situation présente une particularité, le dossier est orienté vers le cabinet pour un accompagnement dédié.",
  },
  {
    q: "Où sont hébergées mes données ?",
    r: "Vos données et vos pièces justificatives sont hébergées dans l'Union européenne. Elles sont accessibles à vous-même et au cabinet d'expertise comptable en charge de votre dossier.",
  },
];

function Accueil() {
  return (
    <PageShell>
      <BandeauAutorite />

      {/* HERO */}
      <section className="border-b border-border bg-surface">
        <div className="container-page py-14 lg:py-20">
          <p className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            CREA EXPERT
          </p>
          <h1 className="mt-3 max-w-4xl whitespace-nowrap font-serif text-3xl leading-tight text-balance sm:text-4xl lg:text-5xl">
            Créez votre société en ligne. Honoraires offerts*.
          </h1>

          <ul className="mt-7 grid gap-3 sm:grid-cols-3">
            {BADGES.map((b) => (
              <li
                key={b}
                className="rounded-lg border border-border bg-background px-4 py-3.5 text-sm leading-relaxed text-foreground"
              >
                {b}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-base leading-relaxed text-justify text-foreground">
            *Vous n'avez aucun honoraire à payer au cabinet pour la création. Restent à votre charge
            les frais légaux obligatoires (annonce légale, greffe, bénéficiaires effectifs), fixés
            par la loi et intégralement reversés aux organismes concernés : le cabinet n'en perçoit
            pas un centime et n'y prend aucune marge. En contrepartie, vous vous engagez sur une
            mission comptable pour un minimum de 3 mois (199 € HT/mois) avec reconduction tacite. Le
            premier mois de tenue comptable est dû à l'issue du processus de création.
          </p>

          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-start">
            <Button asChild size="lg">
              <Link to="/commencer">Créer ma société</Link>
            </Button>
            <ConsultationExpertCard variante="inline" taille="lg" className="max-w-md" />
            <RecommandationDialog variant="outline" size="lg" />
          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="border-b border-border py-14">
        <div className="container-page">
          <h2 className="font-serif text-2xl sm:text-3xl">Comment ça marche</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-5">
            {ETAPES.map((e) => (
              <li key={e.n} className="border-t-2 border-accent/50 pt-4">
                <span className="text-sm font-semibold text-accent">
                  {String(e.n).padStart(2, "0")}
                </span>
                <h3 className="mt-1 text-base font-semibold">{e.t}</h3>
                <p className="mt-1.5 text-left text-sm leading-relaxed text-muted-foreground">{e.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FRISE DES COUTS */}
      <FriseCouts />

      {/* DELAIS */}
      <section className="border-y border-border bg-surface py-12">
        <div className="container-page">
          <h2 className="font-serif text-2xl sm:text-3xl">Combien de temps ça prend</h2>
          <p className="mt-4 text-base leading-relaxed">
            Votre parcours en ligne prend moins de 30 minutes. Le délai d'immatriculation dépend
            ensuite de l'administration : de 24 heures à plusieurs semaines. L'administration peut
            demander des pièces complémentaires ou rectificatives ; nous vous accompagnons jusqu'au
            bout.
          </p>
        </div>
      </section>

      {/* FORMES JURIDIQUES */}
      <section className="border-t border-border py-14">
        <div className="container-page">
          <h2 className="font-serif text-2xl sm:text-3xl">
            Les formes juridiques que nous créons en ligne
          </h2>
          <p className="mt-4 text-base leading-relaxed">
            Dépliez chaque forme pour en connaître les caractéristiques, les avantages, les
            inconvénients et les obligations. Ces éléments sont des faits juridiques, applicables à
            tous : ils ne constituent pas une recommandation adaptée à votre situation.
          </p>
          <FormesDetail />
          <p className="mt-6 text-base leading-relaxed">
            D'autres formes juridiques existent (SA, SNC, sociétés en commandite, sociétés
            d'exercice libéral…) ; nous ne les proposons pas en ligne. Si votre projet l'exige, le
            cabinet peut vous accompagner sur devis.
          </p>
          <Disclaimer className="mt-6" />
        </div>
      </section>

      {/* IMMOBILIER : LMNP, SARL DE FAMILLE, SCI */}
      <SyntheseImmobilier />

      {/* FAQ */}
      <section className="border-t border-border py-14">
        <div className="container-page">
          <h2 className="font-serif text-2xl sm:text-3xl">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-justify text-base leading-relaxed text-foreground">
                  {f.r}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-start">
            <Button asChild size="lg">
              <Link to="/commencer">Créer ma société</Link>
            </Button>
            <ConsultationExpertCard variante="inline" taille="lg" className="max-w-md" />
            <RecommandationDialog variant="outline" size="lg" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
