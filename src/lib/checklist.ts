import { activitesDuDossier, activitesReglementees, libelleActivite } from "./activites";
import { isCivile, isEI, isSas, REGIMES_COMMUNAUTAIRES } from "./domain";
import type { Associe, Dossier, DocumentDraft } from "./documents";

/**
 * Moteur de checklist des pièces justificatives du guichet unique (INPI).
 * Les pièces affichées dépendent de la forme juridique et des réponses de
 * situation renseignées dans le parcours de création.
 */

export type StatutPiece = "a_televerser" | "genere" | "guichet_unique" | "rien_a_fournir";

export const LIBELLE_STATUT_PIECE: Record<StatutPiece, string> = {
  a_televerser: "À téléverser",
  genere: "Générée par CREA EXPERT",
  guichet_unique: "Remplie en ligne au guichet unique",
  rien_a_fournir: "Rien à fournir",
};

export type Piece = {
  /** Identifiant technique, unique par pièce et par personne concernée. */
  code: string;
  libelle: string;
  /** Pourquoi cette pièce est demandée, en une phrase. */
  pourquoi: string;
  /** Exigences de forme : validité, ancienneté, mentions manuscrites. */
  exigences?: string;
  statut: StatutPiece;
  obligatoire: boolean;
  associeId: string | null;
  personne?: string;
  ordre: number;
};

export type Blocage = { titre: string; message: string };

export type Analyse = {
  pieces: Piece[];
  /** Contrôles bloquants : le dossier ne peut pas suivre le parcours standard. */
  blocages: Blocage[];
  /** Situations explicitement sans pièce à fournir, affichées pour rassurer. */
  riens: string[];
};

const nomDe = (a: Associe) =>
  a.type === "personne_morale"
    ? (a.denomination ?? "Personne morale")
    : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé";

/** Un associé est mineur si ses 18 ans sont dans le futur. */
export function estMineur(a: Associe) {
  if (a.type !== "personne_physique" || !a.date_naissance) return false;
  const n = new Date(a.date_naissance);
  if (Number.isNaN(n.getTime())) return false;
  return new Date(n.getFullYear() + 18, n.getMonth(), n.getDate()) > new Date();
}

/** Objet commercial : détermine les interdictions applicables aux mineurs. */
const estCommerciale = (forme: string) => !isCivile(forme);

export function analyserChecklist(dossier: Dossier, associes: Associe[]): Analyse {
  const pieces: Piece[] = [];
  const blocages: Blocage[] = [];
  const riens: string[] = [];
  let n = 0;
  const add = (p: Omit<Piece, "ordre" | "associeId"> & { associeId?: string | null }) =>
    pieces.push({ ...p, associeId: p.associeId ?? null, ordre: (n += 10) });

  const forme = dossier.forme_juridique;
  const ei = isEI(forme);
  const sas = isSas(forme);
  const civile = isCivile(forme);
  const physiques = associes.filter((a) => a.type === "personne_physique");
  const morales = associes.filter((a) => a.type === "personne_morale");
  const dirigeants = physiques.filter((a) => a.est_dirigeant);

  /* ---------------- Socle commun aux sociétés ---------------- */
  if (!ei) {
    add({
      code: "statuts",
      libelle: "Statuts signés par tous les associés",
      pourquoi:
        "Les statuts fixent les règles de fonctionnement de la société ; le guichet unique exige un exemplaire daté et signé.",
      exigences:
        "Un exemplaire daté et signé de tous les associés, chaque page paraphée en cas de signature manuscrite. Chronologie à respecter : dépôt des fonds, puis signature des statuts, puis annonce légale.",
      statut: "genere",
      obligatoire: true,
    });
  }

  for (const a of dirigeants) {
    add({
      code: `identite_dirigeant_${a.id}`,
      libelle: "Copie de la pièce d'identité du dirigeant",
      pourquoi: "Le greffe doit pouvoir vérifier l'identité de la personne qui dirigera l'entreprise.",
      exigences:
        "Carte nationale d'identité recto-verso ou passeport en cours de validité, avec la mention manuscrite « J'atteste sur l'honneur que la présente copie est conforme à l'original », datée et signée.",
      statut: "a_televerser",
      obligatoire: true,
      associeId: a.id,
      personne: nomDe(a),
    });
    add({
      code: `non_condamnation_${a.id}`,
      libelle: "Déclaration de non-condamnation et attestation de filiation",
      pourquoi:
        "Chaque dirigeant déclare n'avoir aucune interdiction de gérer et indique les nom et prénoms de ses parents (art. A. 123-51 du Code de commerce).",
      exigences: "Document daté et signé de la main du dirigeant.",
      statut: "genere",
      obligatoire: true,
      associeId: a.id,
      personne: nomDe(a),
    });
  }

  /* ---------------- Siège social ---------------- */
  const siege = dossier.siege_type ?? "";
  if (siege === "domicile_dirigeant" || ei) {
    add({
      code: "justificatif_siege",
      libelle: "Justificatif de jouissance du siège (domicile du dirigeant)",
      pourquoi: "Le guichet unique vérifie que l'entreprise dispose bien d'une adresse.",
      exigences:
        "Facture d'électricité, de gaz, d'eau, de box ou de téléphone fixe, quittance de loyer, avis de taxe foncière ou attestation d'assurance habitation, de moins de 3 mois et au nom du dirigeant.",
      statut: "a_televerser",
      obligatoire: true,
    });
    if (!ei) {
      add({
        code: "attestation_domiciliation",
        libelle: "Attestation de domiciliation",
        pourquoi:
          "Le dirigeant autorise la société à fixer son siège à son domicile (art. L. 123-11-1 du Code de commerce).",
        statut: "genere",
        obligatoire: true,
      });
    }
    if (dossier.siege_heberge) {
      add({
        code: "attestation_hebergement",
        libelle: "Attestation d'hébergement et pièces de l'hébergeant",
        pourquoi: "Le dirigeant étant hébergé, l'occupant du logement doit confirmer l'accord.",
        exigences:
          "Attestation d'hébergement signée, justificatif de domicile de l'hébergeant de moins de 3 mois et copie de sa pièce d'identité.",
        statut: "a_televerser",
        obligatoire: true,
      });
    }
  }
  if (siege === "local") {
    add({
      code: "bail",
      libelle: "Bail signé ou titre de propriété du local",
      pourquoi: "Il prouve que la société a le droit d'occuper le local indiqué comme siège.",
      exigences: "Document signé, en cours de validité.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (siege === "domiciliataire") {
    add({
      code: "contrat_domiciliation",
      libelle: "Contrat de domiciliation",
      pourquoi: "La société de domiciliation doit être agréée pour héberger votre siège.",
      exigences: "Contrat signé mentionnant le numéro d'agrément préfectoral du domiciliataire.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (siege === "mise_a_disposition") {
    add({
      code: "mise_a_disposition",
      libelle: "Attestation de mise à disposition des locaux",
      pourquoi: "Une autre société met des locaux à votre disposition : elle doit l'attester.",
      exigences: "Attestation signée par le représentant de la société, accompagnée de son justificatif d'occupation.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }

  /* ---------------- Annonce, bénéficiaires, nomination ---------------- */
  if (!ei) {
    add({
      code: "parution_annonce",
      libelle: "Attestation de parution de l'annonce légale",
      pourquoi: "La constitution doit être portée à la connaissance des tiers dans un support habilité du département du siège.",
      statut: "a_televerser",
      obligatoire: true,
    });
    add({
      code: "beneficiaires_effectifs",
      libelle: "Déclaration des bénéficiaires effectifs",
      pourquoi:
        "Elle identifie les personnes physiques détenant plus de 25 % du capital ou des droits de vote, ou exerçant un contrôle.",
      exigences: "Aucun document à téléverser : la déclaration est remplie directement en ligne sur le guichet unique.",
      statut: "guichet_unique",
      obligatoire: true,
    });
    if (!dossier.dirigeant_nomme_statuts) {
      add({
        code: "acte_nomination",
        libelle: "Acte de nomination du ou des dirigeants",
        pourquoi: "Le dirigeant n'étant pas désigné dans les statuts, la décision des associés doit être produite.",
        exigences: "Procès-verbal daté et signé. Nommer le premier dirigeant dans les statuts évite cette pièce.",
        statut: "genere",
        obligatoire: true,
      });
    }
  }

  /* ---------------- Personnes morales ---------------- */
  for (const a of morales) {
    add({
      code: `kbis_${a.id}`,
      libelle: "Extrait d'immatriculation (Kbis) de l'associé personne morale",
      pourquoi: "Le guichet unique vérifie l'existence et le représentant légal de la société associée.",
      exigences: "Extrait de moins de 3 mois, ou équivalent étranger traduit en français.",
      statut: "a_televerser",
      obligatoire: true,
      associeId: a.id,
      personne: nomDe(a),
    });
    add({
      code: `identite_representant_${a.id}`,
      libelle: "Pièce d'identité du représentant permanent",
      pourquoi: "La personne physique qui représente la société associée doit être identifiée.",
      exigences: "Copie en cours de validité avec mention manuscrite de conformité, datée et signée.",
      statut: "a_televerser",
      obligatoire: true,
      associeId: a.id,
      personne: nomDe(a),
    });
  }

  /* ---------------- Capital et apports ---------------- */
  if (!ei && !civile) {
    add({
      code: "depot_fonds",
      libelle: "Attestation de dépôt des fonds",
      pourquoi: `Elle prouve la libération des apports en numéraire (minimum ${sas ? 50 : 20} % à la constitution, solde dans les 5 ans).`,
      exigences: "Délivrée par une banque ou un notaire, datée avant la signature des statuts.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (civile) {
    riens.push(
      "Société civile immobilière : aucune attestation de dépôt des fonds n'est exigée pour l'immatriculation. L'ouverture d'un compte dédié reste conseillée.",
    );
  }
  if (sas) {
    add({
      code: "liste_souscripteurs",
      libelle: "Liste des souscripteurs d'actions",
      pourquoi: "Elle récapitule, pour chaque associé, le nombre d'actions souscrites et le montant versé.",
      statut: "genere",
      obligatoire: true,
    });
  }

  if (!ei && dossier.apport_nature) {
    if (dossier.dispense_commissaire_apports) {
      riens.push(
        "Apports en nature avec dispense de commissaire aux apports : aucun rapport à fournir, mais la description et l'évaluation de chaque apport doivent figurer dans les statuts. La dispense suppose qu'aucun apport n'excède 30 000 € et que le total des apports en nature n'excède pas la moitié du capital.",
      );
    } else {
      add({
        code: "rapport_commissaire_apports",
        libelle: "Rapport du commissaire aux apports",
        pourquoi: "Il fait la preuve de la valeur des biens apportés au capital, annexé aux statuts.",
        exigences: "Rapport signé du commissaire aux apports, annexé aux statuts.",
        statut: "a_televerser",
        obligatoire: true,
      });
    }
  }
  if (dossier.apport_immeuble) {
    add({
      code: "acte_notarie_immeuble",
      libelle: "Acte notarié d'apport d'immeuble",
      pourquoi: "L'apport d'un bien immobilier impose un acte notarié et une publication au service de la publicité foncière.",
      exigences: "Statuts établis par notaire ; les statuts sous seing privé ne suffisent pas.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (dossier.fonds_commerce === "achat") {
    add({
      code: "acte_cession_fonds",
      libelle: "Acte de cession du fonds de commerce et avis de parution",
      pourquoi: "L'achat d'un fonds doit être enregistré et publié pour être opposable aux créanciers du vendeur.",
      exigences: "Acte enregistré auprès de l'administration fiscale et attestation de parution de l'avis de cession.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (dossier.fonds_commerce === "location_gerance") {
    add({
      code: "contrat_location_gerance",
      libelle: "Contrat de location-gérance et avis de parution",
      pourquoi: "L'exploitation d'un fonds appartenant à un tiers doit être publiée.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (dossier.fonds_commerce === "apport") {
    add({
      code: "apport_fonds",
      libelle: "Acte d'apport du fonds de commerce",
      pourquoi: "L'apport d'un fonds suit le régime des apports en nature et ses formalités de publicité propres.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }

  /* ---------------- Conjoint et régimes matrimoniaux ---------------- */
  const communaute = (a: Associe) =>
    a.situation_matrimoniale === "marie" && REGIMES_COMMUNAUTAIRES.includes(a.regime_matrimonial ?? "");
  if (sas) {
    riens.push(
      "SAS ou SASU : aucune formalité liée au conjoint, quelle que soit la situation matrimoniale des associés — les actions sont librement négociables.",
    );
  } else if (!ei) {
    for (const a of physiques.filter((p) => communaute(p) && p.apport_fonds_communs)) {
      add({
        code: `information_conjoint_${a.id}`,
        libelle: "Justificatif d'information du conjoint",
        pourquoi:
          "L'apport de biens communs oblige à informer le conjoint, qui peut revendiquer la qualité d'associé (art. 1832-2 du Code civil).",
        exigences:
          "Lettre d'information avec accusé de réception ou attestation contresignée par le conjoint ; une renonciation à revendiquer la qualité d'associé peut y être jointe.",
        statut: "genere",
        obligatoire: true,
        associeId: a.id,
        personne: nomDe(a),
      });
    }
    const separes = physiques.filter(
      (p) => p.situation_matrimoniale === "marie" && !REGIMES_COMMUNAUTAIRES.includes(p.regime_matrimonial ?? ""),
    );
    if (separes.length > 0)
      riens.push("Associé marié en séparation de biens : aucune pièce supplémentaire n'est à fournir.");
    const pacses = physiques.filter((p) => p.situation_matrimoniale === "pacse");
    if (pacses.length > 0)
      riens.push(
        "Associé pacsé : le régime légal depuis 2007 est la séparation de patrimoines, aucune pièce n'est à fournir. En cas de PACS soumis à l'indivision, l'accord du partenaire co-indivisaire est requis.",
      );
  }

  const conjointsTravail = physiques.filter((a) => a.conjoint_travaille);
  if (conjointsTravail.length > 0 && (ei || forme === "SARL" || forme === "EURL")) {
    for (const a of conjointsTravail) {
      add({
        code: `statut_conjoint_${a.id}`,
        libelle: "Déclaration du statut du conjoint",
        pourquoi:
          "Le conjoint qui travaille régulièrement dans l'entreprise doit être déclaré sous un statut (collaborateur, salarié ou associé).",
        exigences:
          "Statut déclaré dans le formulaire du guichet unique, accompagné d'une attestation sur l'honneur du conjoint collaborateur le cas échéant.",
        statut: "a_televerser",
        obligatoire: true,
        associeId: a.id,
        personne: nomDe(a),
      });
    }
  }

  /* ---------------- Situations personnelles ---------------- */
  for (const a of physiques) {
    if (estMineur(a)) {
      if (a.mineur_emancipe) {
        add({
          code: `emancipation_${a.id}`,
          libelle: "Jugement d'émancipation",
          pourquoi: "Un mineur émancipé doit prouver son émancipation pour agir seul.",
          exigences: estCommerciale(forme)
            ? "Copie du jugement, incluant l'autorisation d'être commerçant délivrée par le juge des tutelles ou le président du tribunal judiciaire (art. L. 121-2 C. com.)."
            : "Copie du jugement d'émancipation.",
          statut: "a_televerser",
          obligatoire: true,
          associeId: a.id,
          personne: nomDe(a),
        });
      } else if (a.est_dirigeant) {
        blocages.push({
          titre: `${nomDe(a)} — mineur non émancipé désigné dirigeant`,
          message:
            "Un mineur non émancipé ne peut être ni commerçant ni dirigeant. Retirez-lui le mandat social, ou demandez à être rappelé pour étudier une autre solution.",
        });
      } else {
        add({
          code: `mineur_autorisation_${a.id}`,
          libelle: "Autorisation des deux représentants légaux",
          pourquoi: "Un mineur non émancipé peut être associé, mais les actes sont signés par ses deux parents.",
          exigences:
            "Autorisation écrite des deux parents, copie de leurs pièces d'identité, pièce d'identité du mineur et livret de famille ou acte de naissance.",
          statut: "a_televerser",
          obligatoire: true,
          associeId: a.id,
          personne: nomDe(a),
        });
      }
    }

    if (a.mesure_protection === "tutelle") {
      blocages.push({
        titre: `${nomDe(a)} — majeur sous tutelle`,
        message:
          "Une personne sous tutelle ne peut être ni commerçante ni dirigeante. Ce dossier sort du parcours standard : demandez à être rappelé.",
      });
    }
    if (a.mesure_protection === "curatelle") {
      add({
        code: `curatelle_${a.id}`,
        libelle: "Jugement de curatelle et accord du curateur",
        pourquoi: "Les apports d'une personne sous curatelle nécessitent l'assistance de son curateur.",
        exigences: "Copie du jugement et autorisation ou contreseing du curateur.",
        statut: "a_televerser",
        obligatoire: true,
        associeId: a.id,
        personne: nomDe(a),
      });
      blocages.push({
        titre: `${nomDe(a)} — mesure de curatelle`,
        message:
          "Ce dossier appelle un accompagnement particulier. Nous vous recommandons un échange avec le cabinet avant de poursuivre.",
      });
    }

    if (a.zone_nationalite === "tiers") {
      if (a.reside_en_france) {
        add({
          code: `titre_sejour_${a.id}`,
          libelle: "Titre de séjour autorisant une activité indépendante",
          pourquoi:
            "Un ressortissant d'un pays tiers résidant en France doit disposer d'un titre l'autorisant à exercer une activité commerciale ou indépendante.",
          exigences:
            "Titre en cours de validité : carte « entrepreneur / profession libérale », carte de résident, ou « vie privée et familiale ».",
          statut: "a_televerser",
          obligatoire: true,
          associeId: a.id,
          personne: nomDe(a),
        });
      } else {
        add({
          code: `passeport_${a.id}`,
          libelle: "Passeport en cours de validité",
          pourquoi:
            "Un dirigeant non-résident n'a plus besoin de carte de commerçant étranger : son passeport suffit.",
          statut: "a_televerser",
          obligatoire: true,
          associeId: a.id,
          personne: nomDe(a),
        });
      }
    } else if (a.zone_nationalite === "ue") {
      riens.push(
        "Ressortissant de l'Union européenne, de l'EEE ou de Suisse : la pièce d'identité ou le passeport suffit, aucune autorisation supplémentaire.",
      );
    }
  }

  /* ---------------- Activité ---------------- */
  const reglementees = activitesReglementees(activitesDuDossier(dossier));
  if (reglementees.length > 0) {
    // Une pièce distincte par activité réglementée, libellée avec son intitulé.
    reglementees.forEach((a, i) => {
      const intitule = libelleActivite(a, i);
      add({
        code: `titre_reglemente_${a.id}`,
        libelle: `Justificatif — ${intitule}`,
        pourquoi: `L'activité « ${intitule} » est réglementée : l'autorité compétente doit avoir délivré le titre correspondant.`,
        exigences:
          a.justificatif_type === "experience"
            ? "Justificatif d'expérience professionnelle (attestations d'employeur, bulletins de salaire ou contrats) couvrant la durée exigée."
            : a.justificatif_type === "diplome"
              ? "Diplôme, titre ou certificat de qualification, en cours de validité."
              : "Diplôme, titre, agrément, autorisation ou carte professionnelle délivré par l'autorité compétente, en cours de validité.",
        statut: "a_televerser",
        obligatoire: true,
      });
    });
  } else if (dossier.activite_reglementee) {
    add({
      code: "titre_reglemente",
      libelle: "Diplôme, agrément, autorisation ou carte professionnelle",
      pourquoi: "L'activité choisie est réglementée : l'autorité compétente doit avoir délivré le titre correspondant.",
      exigences: "Document délivré par l'autorité compétente, en cours de validité.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }
  if (dossier.activite_artisanale) {
    add({
      code: "jqpa",
      libelle: "Justification de la qualification professionnelle artisanale",
      pourquoi:
        "Les métiers artisanaux listés par la loi du 5 juillet 1996 exigent une qualification pour être exercés.",
      exigences:
        "Diplôme (CAP, BEP ou équivalent), ou justificatif de 3 ans d'expérience dans le métier, ou attestation et diplôme d'un salarié qualifié rattaché. Le stage de préparation à l'installation n'est plus obligatoire.",
      statut: "a_televerser",
      obligatoire: true,
    });
  }

  /* ---------------- Entreprise individuelle ---------------- */
  if (ei) {
    const exploitant = physiques[0];
    add({
      code: "identite_exploitant",
      libelle: "Copie de la pièce d'identité de l'entrepreneur",
      pourquoi: "Le guichet unique doit identifier la personne qui exerce l'activité.",
      exigences:
        "Pièce en cours de validité, recto-verso, avec la mention manuscrite de conformité à l'original, datée et signée.",
      statut: "a_televerser",
      obligatoire: true,
      ...(exploitant ? { associeId: exploitant.id, personne: nomDe(exploitant) } : {}),
    });
    add({
      code: "non_condamnation_ei",
      libelle: "Déclaration de non-condamnation et attestation de filiation",
      pourquoi: "Elle atteste l'absence d'interdiction de gérer et indique la filiation de l'entrepreneur.",
      statut: "genere",
      obligatoire: true,
    });
    riens.push(
      "Entreprise individuelle : ni statuts, ni capital, ni annonce légale, ni déclaration des bénéficiaires effectifs. Depuis la loi du 14 février 2022, le patrimoine professionnel est séparé de plein droit et la résidence principale est insaisissable de droit (art. L. 526-1 C. com.) : aucune déclaration notariée d'insaisissabilité n'est à fournir.",
    );
  }

  if (dossier.dirigeant_deja_immatricule) {
    riens.push(
      "Dirigeant déjà immatriculé à un registre : aucune pièce supplémentaire, le numéro SIREN existant est simplement renseigné dans le formulaire du guichet unique.",
    );
  }

  return { pieces, blocages, riens };
}

/** Règles transverses affichées en permanence pour éviter les rejets. */
export const REGLES_ANTI_REJET = [
  "Pièce d'identité en cours de validité, lisible, recto-verso, avec la mention manuscrite de conformité, datée et signée.",
  "Justificatif de siège ou de domicile de moins de 3 mois au jour du dépôt (l'avis de taxe foncière fait exception).",
  "Chronologie : dépôt des fonds, puis signature des statuts qui citent l'attestation, puis annonce légale, puis dépôt au guichet unique.",
  "Concordance stricte des noms, prénoms, adresses et orthographes entre toutes les pièces.",
  "Signatures manuscrites ou électroniques ; chaque page des statuts paraphée en cas de signature manuscrite.",
  "Aucun enregistrement fiscal préalable des statuts, sauf acte notarié ou apport d'immeuble ou de fonds de commerce.",
  "Formats acceptés : PDF, JPG ou PNG, 10 Mo maximum par fichier.",
];

/** Convertit les pièces à téléverser en lignes de la table « documents ». */
export function piecesEnDrafts(dossier: Dossier, associes: Associe[]): DocumentDraft[] {
  return analyserChecklist(dossier, associes)
    .pieces.filter((p) => p.statut === "a_televerser")
    .map((p) => ({
      dossier_id: dossier.id,
      associe_id: p.associeId,
      type_document: p.code,
      libelle: p.personne ? `${p.libelle} — ${p.personne}` : p.libelle,
      aide_client: [p.pourquoi, p.exigences].filter(Boolean).join(" "),
      obligatoire: p.obligatoire,
      origine: "a_fournir",
      statut_document: "a_fournir",
    }));
}
