import { CallbackDialog } from "@/components/CallbackDialog";

const CADRE = "rounded-md border border-border bg-muted/50 p-4 text-sm leading-relaxed";

function MentionPro() {
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Encadré pédagogique — information générale et non exhaustive, qui ne constitue pas un conseil.
      Pour toute précision adaptée à votre situation, parlez-en à un professionnel, notamment à notre
      expert-comptable partenaire.
    </p>
  );
}

/** Qui dirige, qui détient : gérance, présidence, autres mandataires, associés. */
export function EncadreGouvernance({ forme }: { forme: string }) {
  const sas = forme === "SAS" || forme === "SASU";
  return (
    <div className={CADRE}>
      <p className="font-medium">Comprendre la gérance, la présidence et l'associé</p>

      <p className="mt-2">
        <strong>Le gérant</strong> est le dirigeant d'une SARL, d'une EURL ou d'une SCI. Il
        représente la société vis-à-vis des tiers, signe les contrats, embauche, déclare et engage la
        société dans la limite de l'objet social. Lorsque plusieurs personnes exercent cette
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
        indépendantes : on peut être gérant ou co-gérant <em>sans</em> détenir la moindre part, et on
        peut être associé <em>sans</em> participer à la gérance. Beaucoup de dirigeants cumulent les
        deux, ce n'est pas une obligation.
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
        pourcentage détenu {sas ? "(président de SAS/SASU assimilé salarié)" : "(gérant majoritaire de SARL : travailleur non salarié)"}.
      </p>

      <MentionPro />
    </div>
  );
}

/** Règles de composition : combien de dirigeants, combien d'associés, selon la forme. */
export function EncadreCompositionForme({ forme }: { forme: string }) {
  const texte: Record<string, string> = {
    SASU:
      "SASU : un associé unique, et un président et un seul. Des directeurs généraux peuvent être nommés si les statuts le prévoient.",
    SAS: "SAS : deux associés ou plus, et un président et un seul. Des directeurs généraux et directeurs généraux délégués peuvent être nommés si les statuts le prévoient.",
    EURL:
      "EURL : un associé unique et un seul, personne physique ou morale. Un ou plusieurs gérants, obligatoirement personnes physiques ; le gérant peut être l'associé ou un tiers.",
    SARL:
      "SARL : de 2 à 100 associés. Un ou plusieurs gérants (co-gérance possible), obligatoirement personnes physiques.",
    SCI: "SCI : deux associés au minimum. Un ou plusieurs gérants, associés ou non, personnes physiques ou morales.",
    EI: "Entreprise individuelle : ni associé, ni dirigeant au sens sociétaire — vous exercez en votre nom propre.",
  };
  return (
    <p className="rounded-md border border-border bg-surface p-3 text-sm leading-relaxed">
      {texte[forme] ?? texte["SAS"]}
    </p>
  );
}

/** Démembrement, usufruit, transmission : orientation vers un professionnel. */
export function EncadreDemembrement() {
  return (
    <div className="rounded-md border border-warning/50 bg-warning/10 p-4 text-sm leading-relaxed">
      <p className="font-medium">Usufruit, nue-propriété, transmission : demandez à être rappelé</p>
      <p className="mt-2">
        Répartir les titres entre usufruitier et nu-propriétaire, faire entrer des enfants au
        capital, préparer une donation ou une transmission familiale sont des schémas parfaitement
        légaux et souvent pertinents, mais techniques : la rédaction des statuts, la répartition des
        droits de vote et des dividendes, et le traitement fiscal doivent être calibrés dès la
        création. Mal montés, ils se corrigent difficilement et coûtent cher. Les cas les plus
        complexes appellent également l'intervention d'un notaire.
      </p>
      <p className="mt-2">
        Ce parcours en ligne traite les répartitions simples, en pleine propriété. Si vous envisagez
        un démembrement ou si vous vous posez des questions de transmission, demandez à être rappelé
        par un expert-comptable avant de poursuivre.
      </p>
      <div className="mt-3">
        <CallbackDialog label="Être rappelé par un expert-comptable" size="sm" />
      </div>
    </div>
  );
}

/** Choix de la date de clôture de l'exercice. */
export function EncadreCloture() {
  return (
    <div className={CADRE}>
      <p className="font-medium">Choisir sa date de clôture</p>
      <p className="mt-2">
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
        Toutes les dates de clôture proposées ici correspondent au <strong>dernier jour du mois</strong>.
      </p>
      <p className="mt-2">
        <strong>Premier exercice étendu (plus de 12 mois).</strong> Le premier exercice peut être
        allongé jusqu'à ce que la première clôture choisie soit atteinte. Avantages : on repousse la
        première liasse fiscale et les premiers frais de clôture, et l'entreprise dispose d'un
        premier exercice complet et représentatif. Inconvénients : les résultats du premier exercice
        se cumulent sur une période longue, ce qui peut concentrer l'imposition, et retarde d'autant
        la première image comptable officielle pour une banque. Un exercice ne peut légalement
        comporter qu'<strong>un seul franchissement du 31 décembre</strong> : sa durée totale ne peut
        donc pas dépasser 24 mois.
      </p>
      <MentionPro />
    </div>
  );
}

/** TVA : périodicité, avantages/inconvénients, cas de l'immobilier. */
export function EncadreTva({ immobilier }: { immobilier: boolean }) {
  return (
    <div className={CADRE}>
      <p className="font-medium">Comprendre la TVA</p>
      <p className="mt-2">
        <strong>Être assujetti à la TVA</strong> vous permet de récupérer la TVA sur vos achats,
        vos investissements et vos frais : c'est presque toujours favorable lorsque vos clients sont
        des professionnels, qui la récupèrent eux aussi. À l'inverse, si vos clients sont des
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
          face à des locataires professionnels assujettis : l'option permet alors de récupérer la TVA
          sur l'acquisition et sur les travaux, souvent des montants importants. Attention à la
          régularisation par <strong>vingtièmes</strong> : la TVA déduite sur un immeuble se
          régularise sur une période de 20 ans, et une revente ou une cessation d'activité avant son
          terme peut obliger à reverser les vingtièmes restants — sauf lorsque la cession est
          elle-même soumise à la TVA, ce qui neutralise la régularisation.
        </p>
      )}
      <MentionPro />
    </div>
  );
}
