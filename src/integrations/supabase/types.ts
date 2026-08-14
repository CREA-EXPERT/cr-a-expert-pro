export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      archives_facturation: {
        Row: {
          anonymise_le: string
          conserver_jusqu_au: string
          created_at: string
          denomination: string
          dossier_cree_le: string | null
          dossier_ref: string
          forme_juridique: string
          id: string
          lettre_mission_acceptee_le: string | null
          moyen_de_paiement_enregistre: boolean
          relecture_statut: string | null
        }
        Insert: {
          anonymise_le?: string
          conserver_jusqu_au?: string
          created_at?: string
          denomination?: string
          dossier_cree_le?: string | null
          dossier_ref: string
          forme_juridique?: string
          id?: string
          lettre_mission_acceptee_le?: string | null
          moyen_de_paiement_enregistre?: boolean
          relecture_statut?: string | null
        }
        Update: {
          anonymise_le?: string
          conserver_jusqu_au?: string
          created_at?: string
          denomination?: string
          dossier_cree_le?: string | null
          dossier_ref?: string
          forme_juridique?: string
          id?: string
          lettre_mission_acceptee_le?: string | null
          moyen_de_paiement_enregistre?: boolean
          relecture_statut?: string | null
        }
        Relationships: []
      }
      associes: {
        Row: {
          adresse: string | null
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_ville: string | null
          apport_fonds_communs: boolean
          beneficiaires_indirects: string | null
          civilite: string | null
          conjoint_civilite: string | null
          conjoint_date_naissance: string | null
          conjoint_lieu_naissance: string | null
          conjoint_nom: string | null
          conjoint_prenom: string | null
          conjoint_revendique: boolean
          conjoint_statut: string | null
          conjoint_travaille: boolean
          contrat_mariage: boolean
          contrat_mariage_detail: string | null
          created_at: string
          date_mariage: string | null
          date_naissance: string | null
          date_pacs: string | null
          denomination: string | null
          dossier_id: string
          email: string | null
          est_associe: boolean
          est_dirigeant: boolean
          fonction: string | null
          forme: string | null
          id: string
          lieu_mariage: string | null
          lieu_naissance: string | null
          mesure_protection: string
          mineur_emancipe: boolean
          montant_apport: number
          nationalite: string | null
          nb_titres: number
          nom: string | null
          nom_naissance: string | null
          prenom: string | null
          prenoms: string[]
          regime_etranger_communautaire: string | null
          regime_matrimonial: string | null
          representant: string | null
          reside_en_france: boolean
          siege: string | null
          siren: string | null
          situation_matrimoniale: string | null
          type: string
          zone_nationalite: string
        }
        Insert: {
          adresse?: string | null
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_ville?: string | null
          apport_fonds_communs?: boolean
          beneficiaires_indirects?: string | null
          civilite?: string | null
          conjoint_civilite?: string | null
          conjoint_date_naissance?: string | null
          conjoint_lieu_naissance?: string | null
          conjoint_nom?: string | null
          conjoint_prenom?: string | null
          conjoint_revendique?: boolean
          conjoint_statut?: string | null
          conjoint_travaille?: boolean
          contrat_mariage?: boolean
          contrat_mariage_detail?: string | null
          created_at?: string
          date_mariage?: string | null
          date_naissance?: string | null
          date_pacs?: string | null
          denomination?: string | null
          dossier_id: string
          email?: string | null
          est_associe?: boolean
          est_dirigeant?: boolean
          fonction?: string | null
          forme?: string | null
          id?: string
          lieu_mariage?: string | null
          lieu_naissance?: string | null
          mesure_protection?: string
          mineur_emancipe?: boolean
          montant_apport?: number
          nationalite?: string | null
          nb_titres?: number
          nom?: string | null
          nom_naissance?: string | null
          prenom?: string | null
          prenoms?: string[]
          regime_etranger_communautaire?: string | null
          regime_matrimonial?: string | null
          representant?: string | null
          reside_en_france?: boolean
          siege?: string | null
          siren?: string | null
          situation_matrimoniale?: string | null
          type?: string
          zone_nationalite?: string
        }
        Update: {
          adresse?: string | null
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_ville?: string | null
          apport_fonds_communs?: boolean
          beneficiaires_indirects?: string | null
          civilite?: string | null
          conjoint_civilite?: string | null
          conjoint_date_naissance?: string | null
          conjoint_lieu_naissance?: string | null
          conjoint_nom?: string | null
          conjoint_prenom?: string | null
          conjoint_revendique?: boolean
          conjoint_statut?: string | null
          conjoint_travaille?: boolean
          contrat_mariage?: boolean
          contrat_mariage_detail?: string | null
          created_at?: string
          date_mariage?: string | null
          date_naissance?: string | null
          date_pacs?: string | null
          denomination?: string | null
          dossier_id?: string
          email?: string | null
          est_associe?: boolean
          est_dirigeant?: boolean
          fonction?: string | null
          forme?: string | null
          id?: string
          lieu_mariage?: string | null
          lieu_naissance?: string | null
          mesure_protection?: string
          mineur_emancipe?: boolean
          montant_apport?: number
          nationalite?: string | null
          nb_titres?: number
          nom?: string | null
          nom_naissance?: string | null
          prenom?: string | null
          prenoms?: string[]
          regime_etranger_communautaire?: string | null
          regime_matrimonial?: string | null
          representant?: string | null
          reside_en_france?: boolean
          siege?: string | null
          siren?: string | null
          situation_matrimoniale?: string | null
          type?: string
          zone_nationalite?: string
        }
        Relationships: [
          {
            foreignKeyName: "associes_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      callbacks: {
        Row: {
          created_at: string
          creneau_souhaite: string | null
          id: string
          statut: string
          telephone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          creneau_souhaite?: string | null
          id?: string
          statut?: string
          telephone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          creneau_souhaite?: string | null
          id?: string
          statut?: string
          telephone?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_rules: {
        Row: {
          aide_client: string | null
          condition_champ: string
          condition_valeur: string | null
          created_at: string
          id: string
          libelle_client: string
          obligatoire: boolean
          ordre: number
          origine: string
          type_document: string
        }
        Insert: {
          aide_client?: string | null
          condition_champ: string
          condition_valeur?: string | null
          created_at?: string
          id?: string
          libelle_client: string
          obligatoire?: boolean
          ordre?: number
          origine?: string
          type_document: string
        }
        Update: {
          aide_client?: string | null
          condition_champ?: string
          condition_valeur?: string | null
          created_at?: string
          id?: string
          libelle_client?: string
          obligatoire?: boolean
          ordre?: number
          origine?: string
          type_document?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          aide_client: string | null
          associe_id: string | null
          atteste_conforme: boolean
          atteste_le: string | null
          created_at: string
          date_expiration: string | null
          depose_le: string | null
          dossier_id: string
          fichier_url: string | null
          fichier_verso_url: string | null
          id: string
          libelle: string
          motif_rejet: string | null
          obligatoire: boolean
          origine: string
          statut_document: string
          type_document: string
          updated_at: string
          valide_le: string | null
          verification_statut: string
        }
        Insert: {
          aide_client?: string | null
          associe_id?: string | null
          atteste_conforme?: boolean
          atteste_le?: string | null
          created_at?: string
          date_expiration?: string | null
          depose_le?: string | null
          dossier_id: string
          fichier_url?: string | null
          fichier_verso_url?: string | null
          id?: string
          libelle: string
          motif_rejet?: string | null
          obligatoire?: boolean
          origine?: string
          statut_document?: string
          type_document: string
          updated_at?: string
          valide_le?: string | null
          verification_statut?: string
        }
        Update: {
          aide_client?: string | null
          associe_id?: string | null
          atteste_conforme?: boolean
          atteste_le?: string | null
          created_at?: string
          date_expiration?: string | null
          depose_le?: string | null
          dossier_id?: string
          fichier_url?: string | null
          fichier_verso_url?: string | null
          id?: string
          libelle?: string
          motif_rejet?: string | null
          obligatoire?: boolean
          origine?: string
          statut_document?: string
          type_document?: string
          updated_at?: string
          valide_le?: string | null
          verification_statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_associe_id_fkey"
            columns: ["associe_id"]
            isOneToOne: false
            referencedRelation: "associes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_kyc: {
        Row: {
          archive_le: string
          associe_id: string | null
          categorie: string
          chemin_archive: string | null
          conserver_jusqu_au: string | null
          created_at: string
          date_fin_relation: string | null
          document_id: string | null
          dossier_id: string
          id: string
          libelle: string
          metadonnees: Json
          type_document: string
        }
        Insert: {
          archive_le?: string
          associe_id?: string | null
          categorie: string
          chemin_archive?: string | null
          conserver_jusqu_au?: string | null
          created_at?: string
          date_fin_relation?: string | null
          document_id?: string | null
          dossier_id: string
          id?: string
          libelle: string
          metadonnees?: Json
          type_document: string
        }
        Update: {
          archive_le?: string
          associe_id?: string | null
          categorie?: string
          chemin_archive?: string | null
          conserver_jusqu_au?: string | null
          created_at?: string
          date_fin_relation?: string | null
          document_id?: string | null
          dossier_id?: string
          id?: string
          libelle?: string
          metadonnees?: Json
          type_document?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_kyc_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          activite_artisanale: boolean
          activite_reglementee: boolean
          activites: Json
          apport_immeuble: boolean
          apport_industrie: boolean
          apport_nature: boolean
          autovalidation_le: string | null
          avec_compta: boolean
          banque_depot: string | null
          bien_commun_apport: string | null
          bien_commun_designation: string | null
          cabinet_engage: boolean
          capital_liberation: number
          capital_montant: number
          cloture_mois: number
          code_naf: string | null
          code_naf_libelle: string | null
          created_at: string
          date_archivage_kyc: string | null
          date_cloture_exercice: string
          date_cloture_premier_exercice: string | null
          date_consentements: string | null
          date_depot_fonds: string | null
          date_derniere_activite: string
          date_fin_relation: string | null
          date_parution: string | null
          date_signature: string | null
          date_statut: string
          demande_acre: boolean
          denomination: string
          denomination_risque: string | null
          denomination_verifiee: boolean
          dirigeant_deja_immatricule: boolean
          dirigeant_nomme_statuts: boolean
          dispense_commissaire_apports: boolean
          domiciliataire_agrement: string | null
          domiciliataire_nom: string | null
          duree_annees: number
          entite_contractante: string
          etape_courante: number
          exercice_etendu: boolean
          fonds_commerce: string
          forme_juridique: string
          gerant_est_associe_unique: boolean
          greffe_ville: string | null
          id: string
          justificatif_detail: string | null
          justificatif_type: string | null
          lettre_mission_acceptee_le: string | null
          lettre_mission_nom: string | null
          location_meublee: boolean
          mention_depot_capital: string | null
          moyen_de_paiement_enregistre: boolean
          moyen_de_paiement_enregistre_le: string | null
          objet_social: string | null
          objets_confirmes_le: string | null
          objets_social: string[]
          offre: string | null
          option_fiscale: string | null
          periodicite_tva: string | null
          pour_qui: string
          prix_creation_ht: number
          regime_fiscal_eurl: string | null
          regime_fiscal_sci: string | null
          regime_tva: string | null
          reglementee_source: string | null
          relecture_incluse: boolean
          relecture_statut: string
          renonciation_retractation_le: string | null
          role_demandeur: string | null
          routage_cabinet: boolean
          sans_interdiction_gerer: boolean
          siege_adresse: string | null
          siege_adresse_verifiee: boolean
          siege_code_postal: string | null
          siege_complement: string | null
          siege_heberge: boolean
          siege_pays: string
          siege_type: string | null
          siege_ville: string | null
          siege_voie: string | null
          sigle: string | null
          siren: string | null
          siren_attribue_le: string | null
          siren_existant: string | null
          statut: string
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          telephone_contact: string | null
          updated_at: string
          user_id: string
          valeur_part: number
          valide_le: string | null
          valide_par: string | null
          ville_signature: string | null
          voie_validation: string | null
        }
        Insert: {
          activite_artisanale?: boolean
          activite_reglementee?: boolean
          activites?: Json
          apport_immeuble?: boolean
          apport_industrie?: boolean
          apport_nature?: boolean
          autovalidation_le?: string | null
          avec_compta?: boolean
          banque_depot?: string | null
          bien_commun_apport?: string | null
          bien_commun_designation?: string | null
          cabinet_engage?: boolean
          capital_liberation?: number
          capital_montant?: number
          cloture_mois?: number
          code_naf?: string | null
          code_naf_libelle?: string | null
          created_at?: string
          date_archivage_kyc?: string | null
          date_cloture_exercice?: string
          date_cloture_premier_exercice?: string | null
          date_consentements?: string | null
          date_depot_fonds?: string | null
          date_derniere_activite?: string
          date_fin_relation?: string | null
          date_parution?: string | null
          date_signature?: string | null
          date_statut?: string
          demande_acre?: boolean
          denomination?: string
          denomination_risque?: string | null
          denomination_verifiee?: boolean
          dirigeant_deja_immatricule?: boolean
          dirigeant_nomme_statuts?: boolean
          dispense_commissaire_apports?: boolean
          domiciliataire_agrement?: string | null
          domiciliataire_nom?: string | null
          duree_annees?: number
          entite_contractante?: string
          etape_courante?: number
          exercice_etendu?: boolean
          fonds_commerce?: string
          forme_juridique?: string
          gerant_est_associe_unique?: boolean
          greffe_ville?: string | null
          id?: string
          justificatif_detail?: string | null
          justificatif_type?: string | null
          lettre_mission_acceptee_le?: string | null
          lettre_mission_nom?: string | null
          location_meublee?: boolean
          mention_depot_capital?: string | null
          moyen_de_paiement_enregistre?: boolean
          moyen_de_paiement_enregistre_le?: string | null
          objet_social?: string | null
          objets_confirmes_le?: string | null
          objets_social?: string[]
          offre?: string | null
          option_fiscale?: string | null
          periodicite_tva?: string | null
          pour_qui?: string
          prix_creation_ht?: number
          regime_fiscal_eurl?: string | null
          regime_fiscal_sci?: string | null
          regime_tva?: string | null
          reglementee_source?: string | null
          relecture_incluse?: boolean
          relecture_statut?: string
          renonciation_retractation_le?: string | null
          role_demandeur?: string | null
          routage_cabinet?: boolean
          sans_interdiction_gerer?: boolean
          siege_adresse?: string | null
          siege_adresse_verifiee?: boolean
          siege_code_postal?: string | null
          siege_complement?: string | null
          siege_heberge?: boolean
          siege_pays?: string
          siege_type?: string | null
          siege_ville?: string | null
          siege_voie?: string | null
          sigle?: string | null
          siren?: string | null
          siren_attribue_le?: string | null
          siren_existant?: string | null
          statut?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          telephone_contact?: string | null
          updated_at?: string
          user_id: string
          valeur_part?: number
          valide_le?: string | null
          valide_par?: string | null
          ville_signature?: string | null
          voie_validation?: string | null
        }
        Update: {
          activite_artisanale?: boolean
          activite_reglementee?: boolean
          activites?: Json
          apport_immeuble?: boolean
          apport_industrie?: boolean
          apport_nature?: boolean
          autovalidation_le?: string | null
          avec_compta?: boolean
          banque_depot?: string | null
          bien_commun_apport?: string | null
          bien_commun_designation?: string | null
          cabinet_engage?: boolean
          capital_liberation?: number
          capital_montant?: number
          cloture_mois?: number
          code_naf?: string | null
          code_naf_libelle?: string | null
          created_at?: string
          date_archivage_kyc?: string | null
          date_cloture_exercice?: string
          date_cloture_premier_exercice?: string | null
          date_consentements?: string | null
          date_depot_fonds?: string | null
          date_derniere_activite?: string
          date_fin_relation?: string | null
          date_parution?: string | null
          date_signature?: string | null
          date_statut?: string
          demande_acre?: boolean
          denomination?: string
          denomination_risque?: string | null
          denomination_verifiee?: boolean
          dirigeant_deja_immatricule?: boolean
          dirigeant_nomme_statuts?: boolean
          dispense_commissaire_apports?: boolean
          domiciliataire_agrement?: string | null
          domiciliataire_nom?: string | null
          duree_annees?: number
          entite_contractante?: string
          etape_courante?: number
          exercice_etendu?: boolean
          fonds_commerce?: string
          forme_juridique?: string
          gerant_est_associe_unique?: boolean
          greffe_ville?: string | null
          id?: string
          justificatif_detail?: string | null
          justificatif_type?: string | null
          lettre_mission_acceptee_le?: string | null
          lettre_mission_nom?: string | null
          location_meublee?: boolean
          mention_depot_capital?: string | null
          moyen_de_paiement_enregistre?: boolean
          moyen_de_paiement_enregistre_le?: string | null
          objet_social?: string | null
          objets_confirmes_le?: string | null
          objets_social?: string[]
          offre?: string | null
          option_fiscale?: string | null
          periodicite_tva?: string | null
          pour_qui?: string
          prix_creation_ht?: number
          regime_fiscal_eurl?: string | null
          regime_fiscal_sci?: string | null
          regime_tva?: string | null
          reglementee_source?: string | null
          relecture_incluse?: boolean
          relecture_statut?: string
          renonciation_retractation_le?: string | null
          role_demandeur?: string | null
          routage_cabinet?: boolean
          sans_interdiction_gerer?: boolean
          siege_adresse?: string | null
          siege_adresse_verifiee?: boolean
          siege_code_postal?: string | null
          siege_complement?: string | null
          siege_heberge?: boolean
          siege_pays?: string
          siege_type?: string | null
          siege_ville?: string | null
          siege_voie?: string | null
          sigle?: string | null
          siren?: string | null
          siren_attribue_le?: string | null
          siren_existant?: string | null
          statut?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          telephone_contact?: string | null
          updated_at?: string
          user_id?: string
          valeur_part?: number
          valide_le?: string | null
          valide_par?: string | null
          ville_signature?: string | null
          voie_validation?: string | null
        }
        Relationships: []
      }
      events_dossier: {
        Row: {
          created_at: string
          dossier_id: string
          id: string
          message: string
          type_event: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          message: string
          type_event: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          message?: string
          type_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_dossier_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_emails_signature: {
        Row: {
          cause: string | null
          created_at: string
          declencheur: string
          destinataire_masque: string
          dossier_id: string
          id: string
          resultat: string
          signataire_id: string | null
          signature_id: string
          tentative: number
        }
        Insert: {
          cause?: string | null
          created_at?: string
          declencheur?: string
          destinataire_masque: string
          dossier_id: string
          id?: string
          resultat: string
          signataire_id?: string | null
          signature_id: string
          tentative?: number
        }
        Update: {
          cause?: string | null
          created_at?: string
          declencheur?: string
          destinataire_masque?: string
          dossier_id?: string
          id?: string
          resultat?: string
          signataire_id?: string | null
          signature_id?: string
          tentative?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_emails_signature_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_emails_signature_signataire_id_fkey"
            columns: ["signataire_id"]
            isOneToOne: false
            referencedRelation: "signatures_signataires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_emails_signature_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures_electroniques"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_purge: {
        Row: {
          created_at: string
          date_execution: string
          details_techniques: Json
          dry_run: boolean
          execution_id: string
          id: string
          nombre_elements_supprimes: number
          type_donnee: string
        }
        Insert: {
          created_at?: string
          date_execution?: string
          details_techniques?: Json
          dry_run?: boolean
          execution_id: string
          id?: string
          nombre_elements_supprimes?: number
          type_donnee: string
        }
        Update: {
          created_at?: string
          date_execution?: string
          details_techniques?: Json
          dry_run?: boolean
          execution_id?: string
          id?: string
          nombre_elements_supprimes?: number
          type_donnee?: string
        }
        Relationships: []
      }
      journal_rgpd: {
        Row: {
          action: string
          code_erreur: string | null
          created_at: string
          id: string
          nb_elements: number
          resultat: string
          user_id: string
        }
        Insert: {
          action: string
          code_erreur?: string | null
          created_at?: string
          id?: string
          nb_elements?: number
          resultat: string
          user_id: string
        }
        Update: {
          action?: string
          code_erreur?: string | null
          created_at?: string
          id?: string
          nb_elements?: number
          resultat?: string
          user_id?: string
        }
        Relationships: []
      }
      motifs_rejet_greffe: {
        Row: {
          categorie: string
          created_at: string
          date_rejet: string
          dossier_id: string
          id: string
          motif_texte: string
          piece_concernee: string | null
        }
        Insert: {
          categorie: string
          created_at?: string
          date_rejet?: string
          dossier_id: string
          id?: string
          motif_texte: string
          piece_concernee?: string | null
        }
        Update: {
          categorie?: string
          created_at?: string
          date_rejet?: string
          dossier_id?: string
          id?: string
          motif_texte?: string
          piece_concernee?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motifs_rejet_greffe_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_cabinet: {
        Row: {
          created_at: string
          denomination: string
          dossier_id: string
          email_envoye_le: string | null
          id: string
          lu: boolean
          message: string
          motif_principal: string | null
          type_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          denomination?: string
          dossier_id: string
          email_envoye_le?: string | null
          id?: string
          lu?: boolean
          message: string
          motif_principal?: string | null
          type_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          denomination?: string
          dossier_id?: string
          email_envoye_le?: string | null
          id?: string
          lu?: boolean
          message?: string
          motif_principal?: string | null
          type_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_cabinet_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      offres_creation: {
        Row: {
          actif: boolean
          badge: string | null
          code: string
          created_at: string
          id: string
          libelle: string
          ordre: number
          prix_ht_avec_compta: number
          prix_ht_sans_compta: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          badge?: string | null
          code: string
          created_at?: string
          id?: string
          libelle: string
          ordre?: number
          prix_ht_avec_compta?: number
          prix_ht_sans_compta?: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          badge?: string | null
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          ordre?: number
          prix_ht_avec_compta?: number
          prix_ht_sans_compta?: number
          updated_at?: string
        }
        Relationships: []
      }
      parametres_tarifs: {
        Row: {
          created_at: string
          duree_engagement_mois: number
          id: string
          prix_compta_ht: number
          refac_creation_ht: number
          singleton: boolean
          tva_taux: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duree_engagement_mois?: number
          id?: string
          prix_compta_ht?: number
          refac_creation_ht?: number
          singleton?: boolean
          tva_taux?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duree_engagement_mois?: number
          id?: string
          prix_compta_ht?: number
          refac_creation_ht?: number
          singleton?: boolean
          tva_taux?: number
          updated_at?: string
        }
        Relationships: []
      }
      params_signature: {
        Row: {
          created_at: string
          id: string
          intervalle_relance_heures: number
          max_tentatives: number
          relance_auto_active: boolean
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervalle_relance_heures?: number
          max_tentatives?: number
          relance_auto_active?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intervalle_relance_heures?: number
          max_tentatives?: number
          relance_auto_active?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      params_tarifs: {
        Row: {
          cle: string
          id: string
          libelle: string
          montant_ht: number | null
          montant_ttc: number | null
          source: string | null
          updated_at: string
          verifie_le: string | null
        }
        Insert: {
          cle: string
          id?: string
          libelle: string
          montant_ht?: number | null
          montant_ttc?: number | null
          source?: string | null
          updated_at?: string
          verifie_le?: string | null
        }
        Update: {
          cle?: string
          id?: string
          libelle?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          source?: string | null
          updated_at?: string
          verifie_le?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          consent_marketing: boolean
          created_at: string
          email: string
          id: string
          nom: string
          prenom: string
          telephone: string | null
        }
        Insert: {
          consent_marketing?: boolean
          created_at?: string
          email?: string
          id: string
          nom?: string
          prenom?: string
          telephone?: string | null
        }
        Update: {
          consent_marketing?: boolean
          created_at?: string
          email?: string
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          cle: string
          created_at: string
          id: string
          ip: string
        }
        Insert: {
          cle: string
          created_at?: string
          id?: string
          ip: string
        }
        Update: {
          cle?: string
          created_at?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      recommandations: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          page: string
          traite: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          page?: string
          traite?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          page?: string
          traite?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      refacturations_intragroupe: {
        Row: {
          cree_le: string
          date_siren: string | null
          destinataire: string
          dossier_id: string
          emetteur: string
          id: string
          montant_ht: number
          motif: string
          statut: string
          updated_at: string
        }
        Insert: {
          cree_le?: string
          date_siren?: string | null
          destinataire?: string
          dossier_id: string
          emetteur?: string
          id?: string
          montant_ht: number
          motif?: string
          statut?: string
          updated_at?: string
        }
        Update: {
          cree_le?: string
          date_siren?: string | null
          destinataire?: string
          dossier_id?: string
          emetteur?: string
          id?: string
          montant_ht?: number
          motif?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refacturations_intragroupe_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      relances_pieces: {
        Row: {
          created_at: string
          dossier_id: string
          envoye_le: string
          id: string
          pieces_listees: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          envoye_le?: string
          id?: string
          pieces_listees?: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          envoye_le?: string
          id?: string
          pieces_listees?: string
        }
        Relationships: [
          {
            foreignKeyName: "relances_pieces_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures_electroniques: {
        Row: {
          aide_client: string | null
          created_at: string
          dossier_id: string
          envoye_le: string | null
          fichier_signe: string | null
          hash_document: string | null
          id: string
          libelle: string
          ordre: number
          provider: string | null
          provider_ref: string | null
          signe_le: string | null
          statut: string
          type_document: string
          updated_at: string
        }
        Insert: {
          aide_client?: string | null
          created_at?: string
          dossier_id: string
          envoye_le?: string | null
          fichier_signe?: string | null
          hash_document?: string | null
          id?: string
          libelle: string
          ordre?: number
          provider?: string | null
          provider_ref?: string | null
          signe_le?: string | null
          statut?: string
          type_document: string
          updated_at?: string
        }
        Update: {
          aide_client?: string | null
          created_at?: string
          dossier_id?: string
          envoye_le?: string | null
          fichier_signe?: string | null
          hash_document?: string | null
          id?: string
          libelle?: string
          ordre?: number
          provider?: string | null
          provider_ref?: string | null
          signe_le?: string | null
          statut?: string
          type_document?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_electroniques_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures_signataires: {
        Row: {
          adresse_ip: string | null
          associe_id: string | null
          consentement: boolean
          created_at: string
          dernier_essai_le: string | null
          dernier_resultat: string | null
          derniere_cause: string | null
          envoye_le: string | null
          hash_document: string | null
          horodatage: string | null
          id: string
          jeton_expire_le: string | null
          jeton_hash: string | null
          methode: string | null
          signataire_email: string | null
          signataire_nom: string
          signature_id: string
          tentatives_envoi: number
          user_agent: string | null
        }
        Insert: {
          adresse_ip?: string | null
          associe_id?: string | null
          consentement?: boolean
          created_at?: string
          dernier_essai_le?: string | null
          dernier_resultat?: string | null
          derniere_cause?: string | null
          envoye_le?: string | null
          hash_document?: string | null
          horodatage?: string | null
          id?: string
          jeton_expire_le?: string | null
          jeton_hash?: string | null
          methode?: string | null
          signataire_email?: string | null
          signataire_nom: string
          signature_id: string
          tentatives_envoi?: number
          user_agent?: string | null
        }
        Update: {
          adresse_ip?: string | null
          associe_id?: string | null
          consentement?: boolean
          created_at?: string
          dernier_essai_le?: string | null
          dernier_resultat?: string | null
          derniere_cause?: string | null
          envoye_le?: string | null
          hash_document?: string | null
          horodatage?: string | null
          id?: string
          jeton_expire_le?: string | null
          jeton_hash?: string | null
          methode?: string | null
          signataire_email?: string | null
          signataire_nom?: string
          signature_id?: string
          tentatives_envoi?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_signataires_associe_id_fkey"
            columns: ["associe_id"]
            isOneToOne: false
            referencedRelation: "associes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_signataires_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures_electroniques"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          corps_email: string | null
          created_at: string
          email: string
          email_envoye_le: string | null
          email_erreur: string | null
          id: string
          prenom: string | null
          reponses: Json
          resultat: string | null
        }
        Insert: {
          corps_email?: string | null
          created_at?: string
          email: string
          email_envoye_le?: string | null
          email_erreur?: string | null
          id?: string
          prenom?: string | null
          reponses?: Json
          resultat?: string | null
        }
        Update: {
          corps_email?: string | null
          created_at?: string
          email?: string
          email_envoye_le?: string | null
          email_erreur?: string | null
          id?: string
          prenom?: string | null
          reponses?: Json
          resultat?: string | null
        }
        Relationships: []
      }
      traces_verification_identite: {
        Row: {
          created_at: string
          date_suppression: string
          date_verification: string | null
          dossier_id: string
          id: string
          piece_verifiee: boolean
          type_piece: string
        }
        Insert: {
          created_at?: string
          date_suppression?: string
          date_verification?: string | null
          dossier_id: string
          id?: string
          piece_verifiee?: boolean
          type_piece: string
        }
        Update: {
          created_at?: string
          date_suppression?: string
          date_verification?: string | null
          dossier_id?: string
          id?: string
          piece_verifiee?: boolean
          type_piece?: string
        }
        Relationships: [
          {
            foreignKeyName: "traces_verification_identite_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verifications_pieces: {
        Row: {
          created_at: string
          document_id: string
          dossier_id: string
          id: string
          modele: string | null
          motif: string
          resultat: string
          type_controle: string
        }
        Insert: {
          created_at?: string
          document_id: string
          dossier_id: string
          id?: string
          modele?: string | null
          motif?: string
          resultat: string
          type_controle: string
        }
        Update: {
          created_at?: string
          document_id?: string
          dossier_id?: string
          id?: string
          modele?: string | null
          motif?: string
          resultat?: string
          type_controle?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_pieces_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_pieces_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "client" | "cabinet" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["client", "cabinet", "admin"],
    },
  },
} as const
