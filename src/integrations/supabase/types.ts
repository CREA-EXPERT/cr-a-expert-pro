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
      associes: {
        Row: {
          adresse: string | null
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_ville: string | null
          apport_fonds_communs: boolean
          civilite: string | null
          conjoint_statut: string | null
          conjoint_travaille: boolean
          contrat_mariage: boolean
          contrat_mariage_detail: string | null
          created_at: string
          date_naissance: string | null
          denomination: string | null
          dossier_id: string
          email: string | null
          est_associe: boolean
          est_dirigeant: boolean
          fonction: string | null
          forme: string | null
          id: string
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
          civilite?: string | null
          conjoint_statut?: string | null
          conjoint_travaille?: boolean
          contrat_mariage?: boolean
          contrat_mariage_detail?: string | null
          created_at?: string
          date_naissance?: string | null
          denomination?: string | null
          dossier_id: string
          email?: string | null
          est_associe?: boolean
          est_dirigeant?: boolean
          fonction?: string | null
          forme?: string | null
          id?: string
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
          civilite?: string | null
          conjoint_statut?: string | null
          conjoint_travaille?: boolean
          contrat_mariage?: boolean
          contrat_mariage_detail?: string | null
          created_at?: string
          date_naissance?: string | null
          denomination?: string | null
          dossier_id?: string
          email?: string | null
          est_associe?: boolean
          est_dirigeant?: boolean
          fonction?: string | null
          forme?: string | null
          id?: string
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
          depose_le: string | null
          dossier_id: string
          fichier_url: string | null
          id: string
          libelle: string
          motif_rejet: string | null
          obligatoire: boolean
          origine: string
          statut_document: string
          type_document: string
          updated_at: string
          valide_le: string | null
        }
        Insert: {
          aide_client?: string | null
          associe_id?: string | null
          atteste_conforme?: boolean
          atteste_le?: string | null
          created_at?: string
          depose_le?: string | null
          dossier_id: string
          fichier_url?: string | null
          id?: string
          libelle: string
          motif_rejet?: string | null
          obligatoire?: boolean
          origine?: string
          statut_document?: string
          type_document: string
          updated_at?: string
          valide_le?: string | null
        }
        Update: {
          aide_client?: string | null
          associe_id?: string | null
          atteste_conforme?: boolean
          atteste_le?: string | null
          created_at?: string
          depose_le?: string | null
          dossier_id?: string
          fichier_url?: string | null
          id?: string
          libelle?: string
          motif_rejet?: string | null
          obligatoire?: boolean
          origine?: string
          statut_document?: string
          type_document?: string
          updated_at?: string
          valide_le?: string | null
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
      dossiers: {
        Row: {
          activite_artisanale: boolean
          activite_reglementee: boolean
          apport_immeuble: boolean
          apport_industrie: boolean
          apport_nature: boolean
          autovalidation_le: string | null
          capital_liberation: number
          capital_montant: number
          cloture_mois: number
          code_naf: string | null
          code_naf_libelle: string | null
          created_at: string
          date_cloture_exercice: string
          date_depot_fonds: string | null
          date_parution: string | null
          date_signature: string | null
          demande_acre: boolean
          denomination: string
          denomination_verifiee: boolean
          dirigeant_deja_immatricule: boolean
          dirigeant_nomme_statuts: boolean
          dispense_commissaire_apports: boolean
          domiciliataire_agrement: string | null
          domiciliataire_nom: string | null
          duree_annees: number
          etape_courante: number
          exercice_etendu: boolean
          fonds_commerce: string
          forme_juridique: string
          id: string
          justificatif_detail: string | null
          justificatif_type: string | null
          lettre_mission_acceptee_le: string | null
          lettre_mission_nom: string | null
          moyen_de_paiement_enregistre: boolean
          objet_social: string | null
          objets_social: string[]
          option_fiscale: string | null
          periodicite_tva: string | null
          pour_qui: string
          regime_tva: string | null
          relecture_options: boolean
          relecture_statut: string
          role_demandeur: string | null
          routage_cabinet: boolean
          sans_interdiction_gerer: boolean
          siege_adresse: string | null
          siege_heberge: boolean
          siege_type: string | null
          sigle: string | null
          siren_existant: string | null
          statut: string
          telephone_contact: string | null
          updated_at: string
          user_id: string
          valeur_part: number
          valide_le: string | null
          valide_par: string | null
          voie_validation: string | null
        }
        Insert: {
          activite_artisanale?: boolean
          activite_reglementee?: boolean
          apport_immeuble?: boolean
          apport_industrie?: boolean
          apport_nature?: boolean
          autovalidation_le?: string | null
          capital_liberation?: number
          capital_montant?: number
          cloture_mois?: number
          code_naf?: string | null
          code_naf_libelle?: string | null
          created_at?: string
          date_cloture_exercice?: string
          date_depot_fonds?: string | null
          date_parution?: string | null
          date_signature?: string | null
          demande_acre?: boolean
          denomination?: string
          denomination_verifiee?: boolean
          dirigeant_deja_immatricule?: boolean
          dirigeant_nomme_statuts?: boolean
          dispense_commissaire_apports?: boolean
          domiciliataire_agrement?: string | null
          domiciliataire_nom?: string | null
          duree_annees?: number
          etape_courante?: number
          exercice_etendu?: boolean
          fonds_commerce?: string
          forme_juridique?: string
          id?: string
          justificatif_detail?: string | null
          justificatif_type?: string | null
          lettre_mission_acceptee_le?: string | null
          lettre_mission_nom?: string | null
          moyen_de_paiement_enregistre?: boolean
          objet_social?: string | null
          objets_social?: string[]
          option_fiscale?: string | null
          periodicite_tva?: string | null
          pour_qui?: string
          regime_tva?: string | null
          relecture_options?: boolean
          relecture_statut?: string
          role_demandeur?: string | null
          routage_cabinet?: boolean
          sans_interdiction_gerer?: boolean
          siege_adresse?: string | null
          siege_heberge?: boolean
          siege_type?: string | null
          sigle?: string | null
          siren_existant?: string | null
          statut?: string
          telephone_contact?: string | null
          updated_at?: string
          user_id: string
          valeur_part?: number
          valide_le?: string | null
          valide_par?: string | null
          voie_validation?: string | null
        }
        Update: {
          activite_artisanale?: boolean
          activite_reglementee?: boolean
          apport_immeuble?: boolean
          apport_industrie?: boolean
          apport_nature?: boolean
          autovalidation_le?: string | null
          capital_liberation?: number
          capital_montant?: number
          cloture_mois?: number
          code_naf?: string | null
          code_naf_libelle?: string | null
          created_at?: string
          date_cloture_exercice?: string
          date_depot_fonds?: string | null
          date_parution?: string | null
          date_signature?: string | null
          demande_acre?: boolean
          denomination?: string
          denomination_verifiee?: boolean
          dirigeant_deja_immatricule?: boolean
          dirigeant_nomme_statuts?: boolean
          dispense_commissaire_apports?: boolean
          domiciliataire_agrement?: string | null
          domiciliataire_nom?: string | null
          duree_annees?: number
          etape_courante?: number
          exercice_etendu?: boolean
          fonds_commerce?: string
          forme_juridique?: string
          id?: string
          justificatif_detail?: string | null
          justificatif_type?: string | null
          lettre_mission_acceptee_le?: string | null
          lettre_mission_nom?: string | null
          moyen_de_paiement_enregistre?: boolean
          objet_social?: string | null
          objets_social?: string[]
          option_fiscale?: string | null
          periodicite_tva?: string | null
          pour_qui?: string
          regime_tva?: string | null
          relecture_options?: boolean
          relecture_statut?: string
          role_demandeur?: string | null
          routage_cabinet?: boolean
          sans_interdiction_gerer?: boolean
          siege_adresse?: string | null
          siege_heberge?: boolean
          siege_type?: string | null
          sigle?: string | null
          siren_existant?: string | null
          statut?: string
          telephone_contact?: string | null
          updated_at?: string
          user_id?: string
          valeur_part?: number
          valide_le?: string | null
          valide_par?: string | null
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
      params_tarifs: {
        Row: {
          cle: string
          id: string
          libelle: string
          montant_ht: number | null
          montant_ttc: number | null
          updated_at: string
        }
        Insert: {
          cle: string
          id?: string
          libelle: string
          montant_ht?: number | null
          montant_ttc?: number | null
          updated_at?: string
        }
        Update: {
          cle?: string
          id?: string
          libelle?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          updated_at?: string
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
      signatures_electroniques: {
        Row: {
          aide_client: string | null
          created_at: string
          dossier_id: string
          envoye_le: string | null
          id: string
          libelle: string
          ordre: number
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
          id?: string
          libelle: string
          ordre?: number
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
          id?: string
          libelle?: string
          ordre?: number
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
      simulations: {
        Row: {
          corps_email: string | null
          created_at: string
          email: string
          id: string
          prenom: string | null
          reponses: Json
          resultat: string | null
        }
        Insert: {
          corps_email?: string | null
          created_at?: string
          email: string
          id?: string
          prenom?: string | null
          reponses?: Json
          resultat?: string | null
        }
        Update: {
          corps_email?: string | null
          created_at?: string
          email?: string
          id?: string
          prenom?: string | null
          reponses?: Json
          resultat?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_dossier: { Args: { _dossier_id: string }; Returns: boolean }
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
