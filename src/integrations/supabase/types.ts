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
          apport_fonds_communs: boolean
          civilite: string | null
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
          montant_apport: number
          nationalite: string | null
          nb_titres: number
          nom: string | null
          nom_naissance: string | null
          prenom: string | null
          regime_matrimonial: string | null
          representant: string | null
          siege: string | null
          siren: string | null
          situation_matrimoniale: string | null
          type: string
        }
        Insert: {
          adresse?: string | null
          apport_fonds_communs?: boolean
          civilite?: string | null
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
          montant_apport?: number
          nationalite?: string | null
          nb_titres?: number
          nom?: string | null
          nom_naissance?: string | null
          prenom?: string | null
          regime_matrimonial?: string | null
          representant?: string | null
          siege?: string | null
          siren?: string | null
          situation_matrimoniale?: string | null
          type?: string
        }
        Update: {
          adresse?: string | null
          apport_fonds_communs?: boolean
          civilite?: string | null
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
          montant_apport?: number
          nationalite?: string | null
          nb_titres?: number
          nom?: string | null
          nom_naissance?: string | null
          prenom?: string | null
          regime_matrimonial?: string | null
          representant?: string | null
          siege?: string | null
          siren?: string | null
          situation_matrimoniale?: string | null
          type?: string
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
          created_at: string
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
        }
        Insert: {
          aide_client?: string | null
          associe_id?: string | null
          created_at?: string
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
        }
        Update: {
          aide_client?: string | null
          associe_id?: string | null
          created_at?: string
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
          activite_reglementee: boolean
          apport_industrie: boolean
          apport_nature: boolean
          autovalidation_le: string | null
          capital_liberation: number
          capital_montant: number
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
          domiciliataire_agrement: string | null
          domiciliataire_nom: string | null
          duree_annees: number
          etape_courante: number
          forme_juridique: string
          id: string
          lettre_mission_acceptee_le: string | null
          lettre_mission_nom: string | null
          moyen_de_paiement_enregistre: boolean
          objet_social: string | null
          option_fiscale: string | null
          regime_tva: string | null
          relecture_statut: string
          routage_cabinet: boolean
          siege_adresse: string | null
          siege_type: string | null
          sigle: string | null
          statut: string
          updated_at: string
          user_id: string
          valide_le: string | null
          valide_par: string | null
          voie_validation: string | null
        }
        Insert: {
          activite_reglementee?: boolean
          apport_industrie?: boolean
          apport_nature?: boolean
          autovalidation_le?: string | null
          capital_liberation?: number
          capital_montant?: number
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
          domiciliataire_agrement?: string | null
          domiciliataire_nom?: string | null
          duree_annees?: number
          etape_courante?: number
          forme_juridique?: string
          id?: string
          lettre_mission_acceptee_le?: string | null
          lettre_mission_nom?: string | null
          moyen_de_paiement_enregistre?: boolean
          objet_social?: string | null
          option_fiscale?: string | null
          regime_tva?: string | null
          relecture_statut?: string
          routage_cabinet?: boolean
          siege_adresse?: string | null
          siege_type?: string | null
          sigle?: string | null
          statut?: string
          updated_at?: string
          user_id: string
          valide_le?: string | null
          valide_par?: string | null
          voie_validation?: string | null
        }
        Update: {
          activite_reglementee?: boolean
          apport_industrie?: boolean
          apport_nature?: boolean
          autovalidation_le?: string | null
          capital_liberation?: number
          capital_montant?: number
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
          domiciliataire_agrement?: string | null
          domiciliataire_nom?: string | null
          duree_annees?: number
          etape_courante?: number
          forme_juridique?: string
          id?: string
          lettre_mission_acceptee_le?: string | null
          lettre_mission_nom?: string | null
          moyen_de_paiement_enregistre?: boolean
          objet_social?: string | null
          option_fiscale?: string | null
          regime_tva?: string | null
          relecture_statut?: string
          routage_cabinet?: boolean
          siege_adresse?: string | null
          siege_type?: string | null
          sigle?: string | null
          statut?: string
          updated_at?: string
          user_id?: string
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
