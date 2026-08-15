# Créa Expert Pro

Tu es un développeur full-stack senior. Construis la V1 complète de CREA EXPERT,

plateforme française de création de société en ligne, en respectant strictement la

mémoire projet (Knowledge). Si un point est ambigu, pose-moi la question AVANT de

coder ce point ; construis le reste sans attendre.

════════════════════════════════════════════

1. RÔLES ET SÉCURITÉ

════════════════════════════════════════════

Trois rôles : "client", "cabinet", "admin".

- Auth Supabase par email + mot de passe. À l'inscription : prénom, nom, email,

  téléphone (optionnel), case à cocher RGPD obligatoire ("J'accepte le traitement de

  mes données…", lien vers la politique de confidentialité), case optionnelle

  "J'accepte de recevoir des informations par email".

- Row Level Security sur toutes les tables : un client ne voit que ses dossiers ;

  le rôle cabinet voit tous les dossiers ; admin voit tout + édite les paramètres.

════════════════════════════════════════════

2. MODÈLE DE DONNÉES (Supabase)

════════════════════════════════════════════

- profiles : id, role, prenom, nom, email, telephone, consent_marketing, created_at

- params_tarifs : id, cle, libelle, montant_ht, montant_ttc, editable par admin.

  Lignes initiales (tarifs 2026, France métropole) :

  annonce_SASU = 142.00 HT / 170.40 TTC

  annonce_SAS = 199.00 HT / 238.80 TTC

  annonce_EURL = 124.00 HT / 148.80 TTC

  annonce_SARL = 148.00 HT / 177.60 TTC

  annonce_SCI = 191.00 HT / 229.20 TTC

  greffe_societe_commerciale = 35.59 TTC

  greffe_societe_civile = 63.54 TTC

  benef_effectifs = 20.34 TTC

  mission_compta_mensuelle = 199.00 HT (engagement 3 mois)

- simulations : id, email, reponses (jsonb), resultat, created_at

- dossiers : id, user_id, forme_juridique (SASU/SAS/EURL/SARL/SCI),

  denomination, sigle, siege_type (domicile_dirigeant / domiciliataire / local),

  siege_adresse, domiciliataire_nom, domiciliataire_agrement,

  objet_social, duree_annees (défaut 99), capital_montant, capital_liberation,

  date_cloture_exercice (défaut 31/12), option_fiscale (IS/IR),

  regime_tva (franchise / réel simplifié / réel normal), demande_acre (bool),

  statut (voir §7), created_at, updated_at

- associes : id, dossier_id, type (personne_physique / personne_morale),

  -- personne physique : civilite, prenom, nom, nom_naissance, date_naissance,

  lieu_naissance, nationalite, adresse, email, situation_matrimoniale

  (celibataire / marie / pacse / divorce / veuf), regime_matrimonial

  (communaute_legale / communaute_universelle / separation_biens /

  participation_acquets / indivision_pacs / separation_pacs / non_applicable),

  apport_fonds_communs (bool)

  -- personne morale : denomination, forme, siren, siege, representant

  -- commun : nb_titres, montant_apport, est_dirigeant (bool),

  fonction (president / gerant / directeur_general)

- documents : id, dossier_id, associe_id (nullable), type_document, obligatoire (bool),

  origine (a_fournir / genere), fichier_url (nullable),

  statut_document (a_fournir / recu / valide / rejete), motif_rejet, updated_at

- document_rules : id, condition_champ, condition_valeur, type_document, libelle_client,

  aide_client (texte pédagogique affiché au client). Éditable par admin.

- callbacks : id, user_id, telephone, creneau_souhaite, statut (a_traiter / traite),

  created_at

- events_dossier : id, dossier_id, type_event, message, created_at (timeline)

════════════════════════════════════════════

3. PAGE D'ACCUEIL (publique)

════════════════════════════════════════════

Hero :

Titre : "Créez votre société en ligne. Honoraires offerts."

Sous-titre, même bloc visuel, même hiérarchie de lecture :

"Seuls les frais de greffe et d'annonce légale — incompressibles et dus quelle que

soit la solution choisie — restent à votre charge, refacturés à l'euro près.

En contrepartie : une mission comptable de 3 mois à 199 € HT/mois auprès de notre

cabinet d'expertise comptable partenaire."

Deux CTA : "Commencer" et "Être rappelé".

Bloc "Combien ça coûte vraiment" (obligatoire, au-dessus de la ligne de flottaison

sur desktop) : tableau alimenté par params_tarifs —

colonne 1 : forme juridique ; colonne 2 : annonce légale TTC ; colonne 3 : frais de

greffe + bénéficiaires effectifs TTC ; colonne 4 : total des frais légaux TTC ;

dernière ligne : "Honoraires de création : 0 €" ;

encart : "Mission comptable : 199 € HT/mois, engagement 3 mois, sans reconduction

forcée. Soit un coût total de démarrage de [total frais légaux] + 597 € HT de

comptabilité sur 3 mois."

Bloc réassurance : "Réalisé par un cabinet d'expertise comptable français", "Votre dossier est revu et validé par

un expert-comptable inscrit à l'Ordre avant tout dépôt", "Données hébergées en

Union européenne".

Bloc "Comment ça marche" en 5 étapes : 1. Simulez votre forme juridique —

2. Complétez votre dossier en ligne — 3. Déposez vos pièces — 4. Un expert-comptable

valide tout — 5. Votre société est immatriculée.

FAQ (accordéon) : rédige 8 questions/réponses factuelles et prudentes, notamment

"Pourquoi est-ce offert ?" (réponse honnête : le modèle repose sur la mission

comptable), "Que se passe-t-il après les 3 mois ?" (libre de poursuivre ou non),

"Qui rédige mes statuts ?" (documents générés à partir de vos réponses puis validés

par un expert-comptable), "Puis-je créer seul(e) ou à plusieurs ?".

Footer : liens Mentions légales, Politique de confidentialité, CGU (pages créées

avec une structure complète et des textes provisoires balisés [À COMPLÉTER]).

Bouton témoin désactivé "Assistant IA — Bientôt disponible" en bas à droite.

════════════════════════════════════════════

4. SIMULATEUR (accessible sans compte, email requis pour le résultat)

════════════════════════════════════════════

Parcours en questions successives, une par écran, barre de progression :

Q1. Serez-vous seul(e) ou à plusieurs ? (seul → axe SASU vs EURL ;

      à plusieurs → axe SAS vs SARL)

Q2. Votre activité : prestation de services / commerce / activité immobilière

      patrimoniale (→ oriente l'information vers la SCI) / autre

Q3. Prévoyez-vous de vous verser une rémunération dès le début ? (oui / non / je ne sais pas)

Q4. Votre priorité : protection sociale du dirigeant / cotisations réduites /

      flexibilité des statuts / je ne sais pas

Q5. Prévoyez-vous de faire entrer des investisseurs ? (oui / non / peut-être)

Écran de restitution APRÈS saisie de l'email (champ obligatoire + consentement) :

- Présentation NEUTRE et comparative des 2 formes de l'axe concerné : tableau

  "points communs / différences" (régime social du dirigeant, dividendes,

  formalisme, flexibilité statutaire) SANS désigner de "meilleure" forme.

- Une phrase de tendance factuelle maximum, du type : "Au regard de vos réponses,

  les créateurs dans votre situation s'orientent le plus souvent vers […]",

  immédiatement suivie du disclaimer obligatoire (Knowledge, règle 1).

- Particularité à afficher quand la situation "marié(e) sous communauté" apparaîtra

  plus tard dans le dossier : en SARL/EURL/SCI, l'accord ou l'information du conjoint

  peut être requis pour un apport de fonds communs ; pas en SAS/SASU.

- Enregistrer la simulation en base (table simulations) et afficher "Résultat envoyé

  à votre adresse email" (envoi réel différé — simuler).

- CTA : "Créer ma société maintenant" → inscription / connexion.

════════════════════════════════════════════

5. PARCOURS DE CRÉATION (connecté) — formulaire multi-étapes

════════════════════════════════════════════

Wizard avec sauvegarde automatique à chaque étape, navigation retour possible,

barre de progression, et à droite (desktop) un panneau "Votre dossier" récapitulatif

qui se remplit en direct.

Étape 1 — Forme juridique : choix SASU / SAS / EURL / SARL / SCI (pré-rempli si

arrivée depuis le simulateur, modifiable). Lien "Refaire la simulation".

Étape 2 — Dénomination : champ dénomination + sigle optionnel. Encart pédagogique :

"Vérifiez la disponibilité avant de continuer" avec 3 liens externes ouvrant dans

un nouvel onglet : annuaire-entreprises.data.gouv.fr, data.inpi.fr (marques),

recherche de nom de domaine. Case à cocher obligatoire : "J'ai vérifié la

disponibilité de ma dénomination".

Étape 3 — Siège social : 3 options radio avec textes pédagogiques :

a) "Chez le dirigeant" (option mise en avant pour les petits projets : simple et

     sans coût ; mention : possible au domicile du représentant légal ; si le bail ou

     le règlement de copropriété s'y oppose, limité à 5 ans) → champ adresse

b) "Société de domiciliation" → adresse + nom du domiciliataire + n° d'agrément

c) "Local commercial ou professionnel" → adresse

Étape 4 — Objet social : bibliothèque de 12 objets types rédigés (conseil aux

entreprises, développement informatique, e-commerce, bâtiment second œuvre non

réglementé, restauration, transport léger de marchandises, formation non

réglementée, marketing digital, gestion immobilière patrimoniale (SCI), artisanat

d'art, services à la personne non réglementés, activité de holding) + zone libre.

Avertissement : "Certaines activités sont réglementées et exigent un diplôme ou une

autorisation ; votre dossier sera alors orienté vers le cabinet."

Champ oui/non : "Votre activité est-elle réglementée ?" → si oui, marquer le dossier

"routage_cabinet = true".

Étape 5 — Capital : montant (min 1 €, valeur suggérée 1 000 €), libération totale ou

partielle (SARL/EURL min 20 %, SAS/SASU min 50 % à la constitution — afficher la

règle), apports en numéraire uniquement en V1. Si l'utilisateur indique vouloir

faire un apport en nature → routage_cabinet = true avec message explicatif.

Étape 6 — Associés : liste dynamique "Ajouter un associé" (personne physique ou

morale) avec tous les champs du modèle de données. Pour chaque personne physique :

situation matrimoniale ; si "marié(e)" → régime matrimonial ; si régime

communautaire ET forme SARL/EURL/SCI → question "L'apport provient-il de fonds

communs du couple ?" avec encart pédagogique : "Dans ce cas, votre conjoint doit

être informé de l'apport. Un courrier d'information sera généré et devra être signé

avant la signature des statuts." Le total des titres doit égaler le capital

(contrôle bloquant).

Étape 7 — Direction : désigner le(s) dirigeant(s) parmi les associés ou un tiers

(formulaire identique personne physique). SASU/SAS = président (+ DG optionnel) ;

EURL/SARL = gérant(s) ; SCI = gérant(s).

Étape 8 — Options fiscales et sociales : exercice social (clôture par défaut 31/12,

date du 1er exercice calculée), option IS/IR selon la forme (afficher le régime par

défaut de la forme choisie, information générique), régime de TVA (3 choix avec une

phrase d'explication chacun), demande d'ACRE (oui/non + encart d'information

générique). Bandeau : "Ces choix seront revus avec vous par l'expert-comptable."

Étape 9 — Récapitulatif complet + case "Je certifie l'exactitude des informations"

- bouton "Valider mon dossier".

À tout moment dans le wizard : bouton "Être rappelé" (ouvre une modale : téléphone

- créneau souhaité → table callbacks + message de confirmation).

════════════════════════════════════════════

6. MOTEUR DOCUMENTAIRE — checklist dynamique

════════════════════════════════════════════

À la validation de l'étape 9, générer les lignes "documents" du dossier à partir de

document_rules. Règles initiales à insérer :

POUR CHAQUE dirigeant et associé personne physique :

- "Pièce d'identité recto-verso en cours de validité, avec mention manuscrite"

  (a_fournir). Aide : "Écrivez À LA MAIN sur la copie : « J'atteste sur l'honneur

  que la présente copie est conforme à l'original », ajoutez la date du jour et

  votre signature. La pièce doit être en cours de validité."

POUR CHAQUE dirigeant :

- "Déclaration de non-condamnation et attestation de filiation" (genere)

POUR CHAQUE associé personne morale :

- "Extrait Kbis de moins de 3 mois" (a_fournir)

- "Statuts certifiés conformes" (a_fournir)

- "Décision de l'organe autorisant la souscription" (a_fournir)

SI siege_type = domicile_dirigeant :

- "Justificatif de domicile de moins de 3 mois" (a_fournir)

- "Attestation de domiciliation" (genere)

SI siege_type = domiciliataire :

- "Contrat de domiciliation" (a_fournir)

SI siege_type = local :

- "Bail ou titre d'occupation" (a_fournir)

SI associé marié régime communautaire + apport fonds communs + forme SARL/EURL/SCI :

- "Courrier d'information du conjoint" (genere)

- "Renonciation du conjoint à la qualité d'associé (le cas échéant)" (genere)

TOUJOURS :

- "Statuts" (genere)

- "Liste des souscripteurs" (genere, SAS/SASU uniquement)

- "Attestation de dépôt des fonds" (a_fournir). Aide : "Délivrée par votre banque

  ou un notaire après dépôt du capital. Nous vous guidons à cette étape."

- "Attestation de parution de l'annonce légale" (a_fournir en V1)

- "Déclaration des bénéficiaires effectifs" (genere)

- "Pouvoir pour les formalités" (genere)

Écran "Mes documents" : deux sections ("À nous fournir" / "Générés pour vous"),

chaque ligne avec statut coloré, zone drag & drop (PDF, JPG, PNG, 10 Mo max, upload

vers Supabase Storage), texte d'aide dépliable, et pour les documents rejetés le

motif du cabinet bien visible.

Génération V1 des documents "genere" : produire des PDF simples par fusion de champs

(bibliothèque client-side type pdf-lib ou jsPDF), mise en page sobre, filigrane

"PROJET — soumis à la validation du cabinet". Pour les statuts : gabarit par forme

juridique avec les clauses essentielles (dénomination, forme, objet, siège, durée,

capital et répartition, dirigeance, exercice social, signature) et des zones balisées

[CLAUSE À VALIDER PAR LE CABINET] pour tout le reste. Ne rédige AUCUNE clause

"créative" : structure + fusion de données uniquement.

Règle de dates à respecter dans les documents générés : les statuts et leurs annexes

(déclaration de non-condamnation, liste des souscripteurs, pouvoir, courriers au

conjoint) portent tous LA MÊME date de signature (champ unique "date de signature"

choisi par le client, par défaut vide) ; l'attestation de dépôt des fonds doit être

antérieure ou du même jour ; l'attestation de parution postérieure ou du même jour.

Afficher un contrôle de cohérence bloquant si l'ordre n'est pas respecté.

════════════════════════════════════════════

7. STATUTS DU DOSSIER ET TABLEAU DE BORD

════════════════════════════════════════════

Statuts (machine à états, dans l'ordre) : brouillon → dossier_valide_client →

pieces_en_cours → en_revue_cabinet → valide_cabinet → pret_au_depot → depose →

immatricule. + statut transverse routage_cabinet (badge "Accompagnement cabinet

requis").

Dashboard client : carte de statut avec timeline verticale des events_dossier,

prochaine action attendue mise en évidence, accès "Mes documents", bouton

"Être rappelé", et deux boutons témoins désactivés : "Payer les frais légaux —

Bientôt disponible" et "Signer mes documents — Bientôt disponible".

════════════════════════════════════════════

8. ESPACE CABINET (rôle cabinet)

════════════════════════════════════════════

- Liste des dossiers avec filtres par statut, recherche par nom/dénomination.

- Fiche dossier : toutes les données, toutes les pièces visualisables, pour chaque

  pièce deux actions : "Valider" / "Rejeter" (motif obligatoire, notifié au client

  dans sa timeline).

- Quand toutes les pièces sont validées : bouton unique "VALIDER LE DOSSIER"

  (passe le dossier en valide_cabinet, horodaté, avec le nom du validateur) —

  c'est l'acte de validation par l'expert-comptable, il doit être tracé.

- Vue "Demandes de rappel" (table callbacks) avec bouton "Marquer traité".

════════════════════════════════════════════

9. ADMIN

════════════════════════════════════════════

- CRUD sur params_tarifs et document_rules.

- Gestion des rôles utilisateurs.

════════════════════════════════════════════

10. DESIGN

════════════════════════════════════════════

Sobre, épuré, institutionnel et rassurant : fond blanc cassé, bleu nuit profond en

couleur principale, une seule couleur d'accent discrète, typographie lisible,

beaucoup d'air, aucune illustration fantaisiste. Icônes fines. Les montants et

conditions tarifaires sont toujours en pleine lisibilité (jamais grisés, jamais en

petit). Mobile-first irréprochable : le wizard doit être agréable au pouce.

════════════════════════════════════════════

11. CE QUE TU NE FAIS PAS

════════════════════════════════════════════

Pas de Stripe, pas de signature électronique, pas d'appel à l'API INPI, pas de

chatbot, pas d'envoi d'email réel, pas de clause juridique inventée. Boutons témoins

désactivés uniquement. Si tu estimes qu'un élément manque pour bien construire,

pose-moi la question avant de coder cet élément.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6fe38a4e-a8a8-4369-8871-79fb667bdaca).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
