
-- ROLES
CREATE TYPE public.app_role AS ENUM ('client','cabinet','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom text NOT NULL DEFAULT '',
  nom text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telephone text,
  consent_marketing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('cabinet','admin'))
$$;

CREATE POLICY "profiles_select_self_or_staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_self_or_staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auto profil + rôle client à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, prenom, nom, email, telephone, consent_marketing)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'prenom',''),
    COALESCE(NEW.raw_user_meta_data->>'nom',''),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'telephone',
    COALESCE((NEW.raw_user_meta_data->>'consent_marketing')::boolean,false))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'client')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PARAMS TARIFS
CREATE TABLE public.params_tarifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle text NOT NULL UNIQUE,
  libelle text NOT NULL,
  montant_ht numeric(10,2),
  montant_ttc numeric(10,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.params_tarifs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.params_tarifs TO authenticated;
GRANT ALL ON public.params_tarifs TO service_role;
ALTER TABLE public.params_tarifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tarifs_public_read" ON public.params_tarifs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tarifs_admin_write" ON public.params_tarifs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER params_tarifs_updated BEFORE UPDATE ON public.params_tarifs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.params_tarifs (cle, libelle, montant_ht, montant_ttc) VALUES
 ('annonce_SASU','Annonce légale SASU',142.00,170.40),
 ('annonce_SAS','Annonce légale SAS',199.00,238.80),
 ('annonce_EURL','Annonce légale EURL',124.00,148.80),
 ('annonce_SARL','Annonce légale SARL',148.00,177.60),
 ('annonce_SCI','Annonce légale SCI',191.00,229.20),
 ('greffe_societe_commerciale','Frais de greffe — société commerciale',NULL,35.59),
 ('greffe_societe_civile','Frais de greffe — société civile',NULL,63.54),
 ('benef_effectifs','Déclaration des bénéficiaires effectifs',NULL,20.34),
 ('mission_compta_mensuelle','Mission comptable mensuelle (engagement 3 mois)',199.00,NULL);

-- SIMULATIONS
CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultat text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.simulations TO anon;
GRANT SELECT, INSERT ON public.simulations TO authenticated;
GRANT ALL ON public.simulations TO service_role;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "simulations_insert_any" ON public.simulations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "simulations_staff_read" ON public.simulations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- DOSSIERS
CREATE TABLE public.dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  forme_juridique text NOT NULL DEFAULT 'SASU',
  denomination text NOT NULL DEFAULT '',
  sigle text,
  denomination_verifiee boolean NOT NULL DEFAULT false,
  siege_type text,
  siege_adresse text,
  domiciliataire_nom text,
  domiciliataire_agrement text,
  objet_social text,
  activite_reglementee boolean NOT NULL DEFAULT false,
  apport_nature boolean NOT NULL DEFAULT false,
  duree_annees integer NOT NULL DEFAULT 99,
  capital_montant numeric(12,2) NOT NULL DEFAULT 1000,
  capital_liberation numeric(5,2) NOT NULL DEFAULT 100,
  date_cloture_exercice text NOT NULL DEFAULT '31/12',
  date_signature date,
  date_depot_fonds date,
  date_parution date,
  option_fiscale text,
  regime_tva text,
  demande_acre boolean NOT NULL DEFAULT false,
  routage_cabinet boolean NOT NULL DEFAULT false,
  statut text NOT NULL DEFAULT 'brouillon',
  etape_courante integer NOT NULL DEFAULT 1,
  valide_par text,
  valide_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossiers TO authenticated;
GRANT ALL ON public.dossiers TO service_role;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dossiers_owner_all" ON public.dossiers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "dossiers_staff_read" ON public.dossiers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "dossiers_staff_update" ON public.dossiers FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER dossiers_updated BEFORE UPDATE ON public.dossiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_dossier(_dossier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = _dossier_id AND d.user_id = auth.uid())
$$;

-- ASSOCIES
CREATE TABLE public.associes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'personne_physique',
  civilite text, prenom text, nom text, nom_naissance text,
  date_naissance date, lieu_naissance text, nationalite text DEFAULT 'Française',
  adresse text, email text,
  situation_matrimoniale text, regime_matrimonial text DEFAULT 'non_applicable',
  apport_fonds_communs boolean NOT NULL DEFAULT false,
  denomination text, forme text, siren text, siege text, representant text,
  nb_titres integer NOT NULL DEFAULT 0,
  montant_apport numeric(12,2) NOT NULL DEFAULT 0,
  est_dirigeant boolean NOT NULL DEFAULT false,
  est_associe boolean NOT NULL DEFAULT true,
  fonction text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.associes TO authenticated;
GRANT ALL ON public.associes TO service_role;
ALTER TABLE public.associes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "associes_owner_all" ON public.associes FOR ALL TO authenticated
  USING (public.owns_dossier(dossier_id)) WITH CHECK (public.owns_dossier(dossier_id));
CREATE POLICY "associes_staff_read" ON public.associes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  associe_id uuid REFERENCES public.associes(id) ON DELETE CASCADE,
  type_document text NOT NULL,
  libelle text NOT NULL,
  aide_client text,
  obligatoire boolean NOT NULL DEFAULT true,
  origine text NOT NULL DEFAULT 'a_fournir',
  fichier_url text,
  statut_document text NOT NULL DEFAULT 'a_fournir',
  motif_rejet text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_owner_all" ON public.documents FOR ALL TO authenticated
  USING (public.owns_dossier(dossier_id)) WITH CHECK (public.owns_dossier(dossier_id));
CREATE POLICY "documents_staff_read" ON public.documents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "documents_staff_update" ON public.documents FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOCUMENT RULES
CREATE TABLE public.document_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_champ text NOT NULL,
  condition_valeur text,
  type_document text NOT NULL,
  libelle_client text NOT NULL,
  aide_client text,
  origine text NOT NULL DEFAULT 'a_fournir',
  obligatoire boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.document_rules TO authenticated;
GRANT ALL ON public.document_rules TO service_role;
ALTER TABLE public.document_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_read_auth" ON public.document_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "rules_admin_write" ON public.document_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.document_rules (condition_champ, condition_valeur, type_document, libelle_client, aide_client, origine, ordre) VALUES
 ('par_personne_physique',NULL,'piece_identite','Pièce d''identité recto-verso en cours de validité, avec mention manuscrite','Écrivez À LA MAIN sur la copie : « J''atteste sur l''honneur que la présente copie est conforme à l''original », ajoutez la date du jour et votre signature. La pièce doit être en cours de validité.','a_fournir',10),
 ('par_dirigeant',NULL,'non_condamnation','Déclaration de non-condamnation et attestation de filiation','Ce document est généré à partir de vos réponses. Il devra être signé par le dirigeant concerné.','genere',20),
 ('par_personne_morale',NULL,'kbis_associe','Extrait Kbis de moins de 3 mois','Extrait Kbis de la société associée, daté de moins de 3 mois.','a_fournir',30),
 ('par_personne_morale',NULL,'statuts_associe','Statuts certifiés conformes','Statuts à jour de la société associée, certifiés conformes par son représentant légal.','a_fournir',31),
 ('par_personne_morale',NULL,'decision_souscription','Décision de l''organe autorisant la souscription','Procès-verbal ou décision autorisant la souscription au capital de la nouvelle société.','a_fournir',32),
 ('siege_type','domicile_dirigeant','justificatif_domicile','Justificatif de domicile de moins de 3 mois','Facture d''électricité, de gaz, d''eau, de téléphone fixe ou d''internet, ou quittance de loyer, au nom du dirigeant.','a_fournir',40),
 ('siege_type','domicile_dirigeant','attestation_domiciliation','Attestation de domiciliation','Ce document est généré à partir de vos réponses.','genere',41),
 ('siege_type','domiciliataire','contrat_domiciliation','Contrat de domiciliation','Contrat signé avec la société de domiciliation, mentionnant son numéro d''agrément.','a_fournir',42),
 ('siege_type','local','bail','Bail ou titre d''occupation','Bail commercial, bail professionnel ou tout titre d''occupation du local.','a_fournir',43),
 ('conjoint_fonds_communs',NULL,'courrier_conjoint','Courrier d''information du conjoint','Ce document est généré à partir de vos réponses et doit être signé avant la signature des statuts.','genere',50),
 ('conjoint_fonds_communs',NULL,'renonciation_conjoint','Renonciation du conjoint à la qualité d''associé (le cas échéant)','À signer uniquement si le conjoint renonce à revendiquer la qualité d''associé.','genere',51),
 ('toujours',NULL,'statuts','Statuts','Générés à partir de vos réponses, puis revus par le cabinet avant signature.','genere',60),
 ('forme_sas',NULL,'liste_souscripteurs','Liste des souscripteurs','Générée à partir de la répartition du capital.','genere',61),
 ('toujours',NULL,'depot_fonds','Attestation de dépôt des fonds','Délivrée par votre banque ou un notaire après dépôt du capital. Nous vous guidons à cette étape.','a_fournir',62),
 ('toujours',NULL,'parution_annonce','Attestation de parution de l''annonce légale','Transmise par le support d''annonces légales après publication.','a_fournir',63),
 ('toujours',NULL,'beneficiaires_effectifs','Déclaration des bénéficiaires effectifs','Générée à partir de la répartition du capital.','genere',64),
 ('toujours',NULL,'pouvoir','Pouvoir pour les formalités','Généré à partir de vos réponses.','genere',65);

-- CALLBACKS
CREATE TABLE public.callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  telephone text NOT NULL,
  creneau_souhaite text,
  statut text NOT NULL DEFAULT 'a_traiter',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.callbacks TO anon;
GRANT SELECT, INSERT, UPDATE ON public.callbacks TO authenticated;
GRANT ALL ON public.callbacks TO service_role;
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "callbacks_insert_any" ON public.callbacks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "callbacks_select_own_or_staff" ON public.callbacks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "callbacks_staff_update" ON public.callbacks FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- EVENTS
CREATE TABLE public.events_dossier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type_event text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.events_dossier TO authenticated;
GRANT ALL ON public.events_dossier TO service_role;
ALTER TABLE public.events_dossier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_owner_read" ON public.events_dossier FOR SELECT TO authenticated
  USING (public.owns_dossier(dossier_id) OR public.is_staff(auth.uid()));
CREATE POLICY "events_insert" ON public.events_dossier FOR INSERT TO authenticated
  WITH CHECK (public.owns_dossier(dossier_id) OR public.is_staff(auth.uid()));
