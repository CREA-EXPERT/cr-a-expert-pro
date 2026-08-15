import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import { CABINET, RELECTURE_LIMITES } from "@/lib/domain";
import { EncadrePliable } from "@/components/EncadrePliable";

/** Rappel de responsabilité : sans recours à un professionnel, l'utilisateur assume seul. */
export function EncadreResponsabilite({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed text-justify">
        En l'absence de recours à un professionnel, les choix effectués et les documents produits
        relèvent de votre seule responsabilité : ni CREA EXPERT, ni {CABINET.mention}, ne peuvent en
        répondre.
      </p>
    );
  }
  return (
    <EncadrePliable titre="Qui est responsable de quoi">
      <p>
        CREA EXPERT met à votre disposition un outil de saisie, des informations générales et des
        modèles de documents. Tant que vous ne sollicitez pas la relecture d'un professionnel, les
        réponses saisies, les options retenues et les documents générés relèvent de votre{" "}
        <strong>seule responsabilité</strong> : ni CREA EXPERT, ni {CABINET.mention}, ne peuvent
        voir leur responsabilité engagée à ce titre.
      </p>
      <p className="mt-2">
        Dès lors que vous demandez la relecture, l'expert-comptable examine votre dossier et engage
        sa responsabilité professionnelle dans les limites de la lettre de mission acceptée.
      </p>
    </EncadrePliable>
  );
}

/** Associé mineur : hors périmètre, orientation vers le cabinet. */
export function EncadreMineur({ signale = false }: { signale?: boolean }) {
  const corps = (
    <>
      <p>
        Un mineur peut détenir des parts ou des actions, mais il ne peut pas les souscrire seul :
      </p>
      <ul className="mt-2 space-y-1 pl-5 [&>li]:list-disc">
        <li>
          <strong>Mineur non émancipé</strong> : la souscription est faite par ses représentants
          légaux (administration légale) ; leur accord conjoint est requis.
        </li>
        <li>
          Dans une société à risque illimité (SCI, SNC), la prise de participation est un acte de
          disposition qui suppose l'<strong>autorisation du juge des tutelles</strong>, car le
          mineur y répondrait des dettes sociales.
        </li>
        <li>
          Le mineur ne peut être ni gérant, ni président : le mandat social est réservé aux
          personnes capables, sauf mineur <strong>émancipé</strong> et dans les limites propres à
          chaque forme (l'émancipé ne peut être commerçant que sur autorisation).
        </li>
        <li>
          Les apports, la répartition des titres et les conventions ultérieures peuvent relever du{" "}
          <strong>contrôle du juge</strong> et, en cas de donation ou de démembrement, de
          l'intervention d'un notaire.
        </li>
      </ul>
      <p className="mt-2">
        Par protection des personnes concernées, <strong>nous ne prenons pas en charge</strong> les
        créations comportant un associé mineur. Deux possibilités : vous rapprocher d'un
        expert-comptable ou d'un professionnel du droit (notaire, avocat) pour être accompagné, ou
        retirer le ou les associés mineurs afin de poursuivre la création en ligne.{" "}
        {CABINET.mention}.
      </p>
      <div className="mt-3">
        <ConsultationExpertCard variante="inline" />
      </div>
    </>
  );

  if (!signale) {
    return (
      <EncadrePliable titre="Associé mineur : des obligations particulières s'appliquent">
        {corps}
      </EncadrePliable>
    );
  }

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm leading-relaxed text-justify">
      <p className="font-medium">
        Un associé mineur a été détecté : ce parcours ne peut pas aboutir en ligne
      </p>
      <div className="mt-2">{corps}</div>
    </div>
  );
}


/** Régimes matrimoniaux et PACS : contrat ou non, conséquences sur les apports. */
export function EncadreRegimes() {
  return (
    <EncadrePliable titre="Mariage, PACS et contrat : pourquoi la question est posée">
      <p>
        À défaut de contrat de mariage, les époux sont soumis à la{" "}
        <strong>communauté légale réduite aux acquêts</strong> : les biens acquis et les revenus
        perçus pendant le mariage sont communs. Avec un contrat reçu par notaire, ils peuvent
        retenir la <strong>séparation de biens</strong>, la{" "}
        <strong>participation aux acquêts</strong>, la <strong>communauté universelle</strong> ou
        une séparation assortie d'une <strong>société d'acquêts</strong>. Les mariages anciens
        peuvent relever de la communauté de meubles et acquêts, et un mariage célébré à l'étranger
        d'un régime étranger.
      </p>
      <p className="mt-2">
        Pour le <strong>PACS</strong>, le régime légal est la{" "}
        <strong>séparation des patrimoines</strong> ; les partenaires peuvent lui préférer, par
        convention, le régime de l'<strong>indivision</strong> des biens acquis ensemble.
      </p>
      <p className="mt-2">
        Ces éléments déterminent l'origine des fonds apportés : lorsqu'un apport provient d'une
        masse commune ou indivise, le conjoint ou le partenaire doit être informé et peut, dans
        certaines formes de sociétés, revendiquer la qualité d'associé. C'est pourquoi le régime
        exact et l'existence d'un contrat sont demandés ici.
      </p>
      <MentionPro />
    </EncadrePliable>
  );
}

/** Limites de la prestation de relecture par l'expert-comptable. */
export function EncadreRelectureLimites() {
  return (
    <p className="rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed text-justify">
      Pour que les échanges restent efficaces et que votre création aboutisse rapidement, la
      relecture comprend jusqu'à{" "}
      <strong>{RELECTURE_LIMITES.appels} entretiens téléphoniques</strong> et{" "}
      <strong>{RELECTURE_LIMITES.mails} échanges par courriel</strong>. C'est très largement
      suffisant pour arrêter les choix d'une création courante : préparez vos questions, l'objectif
      est de décider vite et bien. Au-delà, l'accompagnement se poursuit dans le cadre de la mission
      comptable.
    </p>
  );
}

function MentionPro() {
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Encadré pédagogique — information générale et non exhaustive, qui ne constitue pas un conseil.
      Pour toute précision adaptée à votre situation, parlez-en à un professionnel, notamment à
      notre expert-comptable partenaire.
    </p>
  );
}

/** Qui dirige, qui détient : gérance, présidence, autres mandataires, associés. */
export function EncadreGouvernance({ forme }: { forme: string }) {
  const sas = forme === "SAS" || forme === "SASU";
  return (
    <EncadrePliable titre="Comprendre la gérance, la présidence et l'associé">
      <p>
        <strong>Le gérant</strong> est le dirigeant d'une SARL, d'une EURL ou d'une SCI. Il
        représente la société vis-à-vis des tiers, signe les contrats, embauche, déclare et engage
        la société dans la limite de l'objet social. Lorsque plusieurs personnes exercent cette
        fonction, on parle de <strong>co-gérants</strong> : chacun dispose en principe des mêmes
        pouvoirs et peut agir seul, sauf répartition prévue par les statuts, qui n'est opposable aux
        tiers que dans certaines limites.
      </p>

      <p className="mt-2">
        <strong>Le président</strong> est le dirigeant de la SAS et de la SASU. La loi impose un
        président et un seul : c'est le représentant légal de la société. Il peut être une personne
        physique ou une personne morale.
      </p>

      <p className="mt-2">
        <strong>Les autres mandataires sociaux.</strong> En SAS et SASU, les statuts peuvent
        également prévoir un ou plusieurs <strong>directeurs généraux</strong> et{" "}
        <strong>directeurs généraux délégués</strong>, dont les pouvoirs sont définis par les
        statuts ou par la décision de nomination. Ce sont des mandataires sociaux, comme le
        président ou le gérant : ils ne sont pas salariés au titre de ce mandat, ils sont révocables
        selon les modalités statutaires, et leur responsabilité peut être engagée.
      </p>

      <p className="mt-2">
        <strong>L'associé</strong> n'est pas un dirigeant : il détient des titres (parts sociales ou
        actions), vote en assemblée et perçoit d'éventuels dividendes. Les deux qualités sont
        indépendantes : on peut être gérant ou co-gérant <em>sans</em> détenir la moindre part, et
        on peut être associé <em>sans</em> participer à la gérance. Beaucoup de dirigeants cumulent
        les deux, ce n'est pas une obligation.
      </p>

      <p className="mt-2">
        <strong>Rôle, avantages et limites de la gérance.</strong> Diriger, c'est décider vite, sans
        avoir à réunir les associés pour la gestion courante, et incarner la société auprès des
        banques, des clients et de l'administration. En contrepartie, le dirigeant supporte les
        obligations : tenue des comptes, déclarations dans les délais, respect de l'objet social et
        de l'intérêt de la société. Sa responsabilité civile peut être recherchée en cas de faute de
        gestion, sa responsabilité fiscale ou pénale en cas de manquements graves, et une
        insuffisance d'actif peut lui être imputée en cas de liquidation fautive. Le statut social
        et le traitement fiscal de la rémunération diffèrent également selon la forme et le
        pourcentage détenu{" "}
        {sas
          ? "(président de SAS/SASU assimilé salarié)"
          : "(gérant majoritaire de SARL : travailleur non salarié)"}
        .
      </p>

      <MentionPro />
    </EncadrePliable>
  );
}

/** Règles de composition : combien de dirigeants, combien d'associés, selon la forme. */
export function EncadreCompositionForme({ forme }: { forme: string }) {
  const texte: Record<string, string> = {
    SASU: "SASU : un associé unique, et un président et un seul. Des directeurs généraux peuvent être nommés si les statuts le prévoient.",
    SAS: "SAS : deux associés ou plus, et un président et un seul. Des directeurs généraux et directeurs généraux délégués peuvent être nommés si les statuts le prévoient.",
    EURL: "EURL : un associé unique et un seul, personne physique ou morale. Un ou plusieurs gérants, obligatoirement personnes physiques ; le gérant peut être l'associé ou un tiers.",
    SARL: "SARL : de 2 à 100 associés. Un ou plusieurs gérants (co-gérance possible), obligatoirement personnes physiques.",
    SCI: "SCI : deux associés au minimum. Un ou plusieurs gérants, associés ou non, personnes physiques ou morales.",
    EI: "Entreprise individuelle : ni associé, ni dirigeant au sens sociétaire — vous exercez en votre nom propre.",
  };
  return (
    <p className="rounded-md border border-border bg-surface p-3 text-sm leading-relaxed text-justify">
      {texte[forme] ?? texte["SAS"]}
    </p>
  );
}

/** Démembrement, usufruit, transmission : orientation vers un professionnel. */
export function EncadreDemembrement() {
  return (
    <EncadrePliable
      ton="accent"
      titre="Usufruit, nue-propriété, transmission : faites le point avec un expert-comptable"
    >
      <p>
        Répartir les titres entre usufruitier et nu-propriétaire, faire entrer des enfants au
        capital, préparer une donation ou une transmission familiale sont des schémas parfaitement
        légaux et souvent pertinents, mais techniques : la rédaction des statuts, la répartition des
        droits de vote et des dividendes, et le traitement fiscal doivent être calibrés dès la
        création. Mal montés, ils se corrigent difficilement et coûtent cher. Les cas les plus
        complexes appellent également l'intervention d'un notaire.
      </p>
      <p className="mt-2">
        Ce parcours en ligne traite les répartitions simples, en pleine propriété. Si vous envisagez
        un démembrement ou si vous vous posez des questions de transmission, réservez une
        consultation avec un expert-comptable avant de poursuivre.
      </p>
      <div className="mt-3">
        <ConsultationExpertCard variante="inline" />
      </div>
    </EncadrePliable>
  );
}

/** Choix de la date de clôture de l'exercice. */
export function EncadreCloture() {
  return (
    <EncadrePliable titre="Choisir sa date de clôture">
      <p>
        L'essentiel des sociétés clôturent au <strong>31 décembre</strong> : les comptes coïncident
        avec l'année civile et avec l'année fiscale des associés, les échéances sont connues de tous
        et les traitements sont standards. C'est le choix par défaut, et le plus simple.
      </p>
      <p className="mt-2">
        <strong>Clôturer à une autre date</strong> peut se justifier lorsque l'activité est
        saisonnière : on clôture en creux d'activité, quand les stocks et les travaux en cours sont
        au plus bas, ce qui donne des comptes plus lisibles et une charge administrative mieux
        répartie. Les inconvénients : décalage avec l'année civile des déclarations personnelles,
        comparaisons sectorielles moins immédiates, et vigilance accrue sur le suivi des échéances.
      </p>
      <p className="mt-2">
        Toutes les dates de clôture proposées ici correspondent au{" "}
        <strong>dernier jour du mois</strong>.
      </p>
      <p className="mt-2">
        <strong>Premier exercice étendu (plus de 12 mois).</strong> Le premier exercice peut être
        allongé jusqu'à ce que la première clôture choisie soit atteinte. Avantages : on repousse la
        première liasse fiscale et les premiers frais de clôture, et l'entreprise dispose d'un
        premier exercice complet et représentatif. Inconvénients : les résultats du premier exercice
        se cumulent sur une période longue, ce qui peut concentrer l'imposition, et retarde d'autant
        la première image comptable officielle pour une banque. Un exercice ne peut légalement
        comporter qu'<strong>un seul franchissement du 31 décembre</strong> : sa durée totale ne
        peut donc pas dépasser 24 mois.
      </p>
      <MentionPro />
    </EncadrePliable>
  );
}

/** TVA : périodicité, avantages/inconvénients, cas de l'immobilier. */
export function EncadreTva({ immobilier }: { immobilier: boolean }) {
  return (
    <EncadrePliable titre="Comprendre la TVA">
      <p>
        <strong>Être assujetti à la TVA</strong> vous permet de récupérer la TVA sur vos achats, vos
        investissements et vos frais : c'est presque toujours favorable lorsque vos clients sont des
        professionnels, qui la récupèrent eux aussi. À l'inverse, si vos clients sont des
        particuliers, facturer la TVA renchérit votre prix de 20 % à qualité égale : la franchise en
        base est alors souvent préférable, au prix de la perte du droit à déduction et d'un plafond
        de chiffre d'affaires à surveiller.
      </p>
      <p className="mt-2">
        <strong>Périodicité.</strong> Au régime réel normal, la déclaration est{" "}
        <strong>mensuelle</strong> ; elle peut être <strong>trimestrielle</strong> lorsque la TVA
        due sur l'année reste inférieure au seuil réglementaire. Le mensuel accélère les
        remboursements de crédit de TVA (utile en phase d'investissement) ; le trimestriel allège la
        charge administrative et la trésorerie à suivre.
      </p>
      <p className="mt-2">
        <strong>Délais et sanctions.</strong> La déclaration et le paiement s'effectuent par voie
        électronique à une date limite fixée chaque mois ou chaque trimestre par l'administration.
        Un retard ou un défaut de déclaration entraîne un intérêt de retard, une majoration de 10 %
        en l'absence de mise en demeure, portée à 40 % en cas de dépôt tardif après mise en demeure
        et à 80 % en cas d'activité occulte, ainsi qu'une amende forfaitaire par déclaration
        manquante ou inexacte. Le non-respect de l'obligation de télédéclarer ou de télépayer donne
        lieu à une majoration distincte. Ces obligations sont tenues par le cabinet dans le cadre de
        la mission comptable.
      </p>
      {immobilier && (
        <p className="mt-2">
          <strong>Cas de l'immobilier.</strong> La location nue à usage d'habitation est exonérée de
          TVA, et la location nue à usage professionnel l'est également sauf option : la plupart des
          sociétés immobilières fonctionnent donc <strong>sans TVA</strong>. C'est souvent plus
          avantageux, car les loyers ne sont pas majorés pour un locataire particulier qui ne
          récupère rien, et la gestion déclarative est allégée. Opter pour la TVA n'a d'intérêt que
          face à des locataires professionnels assujettis : l'option permet alors de récupérer la
          TVA sur l'acquisition et sur les travaux, souvent des montants importants. Attention à la
          régularisation par <strong>vingtièmes</strong> : la TVA déduite sur un immeuble se
          régularise sur une période de 20 ans, et une revente ou une cessation d'activité avant son
          terme peut obliger à reverser les vingtièmes restants — sauf lorsque la cession est
          elle-même soumise à la TVA, ce qui neutralise la régularisation.
        </p>
      )}
      <MentionPro />
    </EncadrePliable>
  );
}

/** Rappel des justificatifs légaux à déposer avant tout dépôt du dossier. */
export function EncadreJustificatifs() {
  return (
    <EncadrePliable titre="Les justificatifs à déposer">
      <p>
        Tous les justificatifs légaux applicables à votre situation doivent être déposés dans « Mes
        documents » <strong>avant</strong> que votre dossier puisse être déposé. Un dossier
        incomplet est systématiquement rejeté par le greffe, ce qui fait perdre du temps et peut
        obliger à republier certaines formalités.
      </p>
      <p className="mt-2">
        <strong>Justificatif de domicile du siège.</strong> Il doit dater de{" "}
        <strong>moins de trois mois</strong>, à l'exception de l'avis de taxe foncière, admis pour
        l'année en cours. Sont valables : une facture d'énergie (électricité, gaz), une facture
        d'eau, une facture de téléphonie fixe ou mobile ou d'accès à internet, un avis d'imposition
        ou de taxe foncière, une quittance de loyer émise par un bailleur professionnel, ou une
        attestation d'assurance habitation. Les factures d'achat, les relevés bancaires et les
        courriers publicitaires ne sont pas acceptés.
      </p>
      <p className="mt-2">
        <strong>Pièces d'identité des associés et dirigeants.</strong> Il faut une copie{" "}
        <strong>recto-verso</strong>, en cours de validité, entièrement lisible (carte nationale
        d'identité, passeport ou titre de séjour), portant la mention manuscrite{" "}
        <strong>« certifiée conforme à l'original »</strong> suivie de la date et de la{" "}
        <strong>signature</strong> du titulaire. Une copie tronquée, floue ou expirée entraîne le
        rejet du dossier.
      </p>
      <MentionPro />
    </EncadrePliable>
  );
}

/** Documents que la plateforme fera signer électroniquement (fonction à venir). */
export function EncadreSignatureElectronique() {
  return (
    <EncadrePliable
      titre="Documents signés électroniquement — envoyés par nos soins"
      badge={null}
      ton="accent"
    >
      <p>
        Vous n'avez pas à les rédiger : nous les préparons à partir de vos réponses et nous vous les
        adressons pour signature électronique. Chaque signataire reçoit un lien personnel par
        courriel ; la signature vaut engagement et la preuve (horodatage et empreinte du document)
        est conservée dans votre dossier.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>l'attestation de non-condamnation et de filiation de chaque dirigeant ;</li>
        <li>l'attestation de domiciliation du siège social ;</li>
        <li>la demande de confidentialité de l'adresse personnelle des associés ;</li>
        <li>
          le mandat autorisant le dépôt du dossier sur le guichet unique (accès seul, limité à cette
          formalité).
        </li>
      </ul>
      <p className="mt-2 text-muted-foreground">
        Les statuts sont également signés par l'ensemble des associés. L'ordre de signature est
        libre : chacun signe quand il le souhaite, et le document est finalisé lorsque tous les
        signataires ont signé.
      </p>
    </EncadrePliable>
  );
}
