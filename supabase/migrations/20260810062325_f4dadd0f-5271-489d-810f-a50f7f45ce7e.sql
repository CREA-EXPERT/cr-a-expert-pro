CREATE TABLE public.offres_creation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  libelle text NOT NULL,
  prix_ht_sans_compta numeric NOT NULL DEFAULT 0,
  prix_ht_avec_compta numeric NOT NULL DEFAULT 0,
  badge text,
  actif boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offres_creation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offres_creation TO authenticated;
GRANT ALL ON public.offres_creation TO service_role;
ALTER TABLE public.offres_creation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offres lisibles par tous" ON public.offres_creation FOR SELECT USING (true);
CREATE POLICY "offres modifiables par admin" ON public.offres_creation FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER offres_creation_updated BEFORE UPDATE ON public.offres_creation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.offres_creation (code, libelle, prix_ht_sans_compta, prix_ht_avec_compta, badge, ordre) VALUES
  ('creation_seule', 'Création', 199, 0, NULL, 1),
  ('creation_ec', 'Création + Expert-comptable', 498, 299, 'Recommandé par le cabinet', 2);

CREATE TABLE public.parametres_tarifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  prix_compta_ht numeric NOT NULL DEFAULT 199,
  duree_engagement_mois integer NOT NULL DEFAULT 3,
  tva_taux numeric NOT NULL DEFAULT 20,
  refac_creation_ht numeric NOT NULL DEFAULT 199,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parametres_tarifs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.parametres_tarifs TO authenticated;
GRANT ALL ON public.parametres_tarifs TO service_role;
ALTER TABLE public.parametres_tarifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parametres lisibles par tous" ON public.parametres_tarifs FOR SELECT USING (true);
CREATE POLICY "parametres modifiables par admin" ON public.parametres_tarifs FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER parametres_tarifs_updated BEFORE UPDATE ON public.parametres_tarifs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.parametres_tarifs (singleton) VALUES (true);

ALTER TABLE public.dossiers
  ADD COLUMN offre text CHECK (offre IN ('creation_seule','creation_ec')),
  ADD COLUMN avec_compta boolean NOT NULL DEFAULT true,
  ADD COLUMN relecture_incluse boolean NOT NULL DEFAULT false,
  ADD COLUMN prix_creation_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN entite_contractante text NOT NULL DEFAULT 'ODEON' CHECK (entite_contractante IN ('ODEON','CREA_EXPERT')),
  ADD COLUMN siren text,
  ADD COLUMN siren_attribue_le timestamptz;

CREATE TABLE public.refacturations_intragroupe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  emetteur text NOT NULL DEFAULT 'CREA_EXPERT',
  destinataire text NOT NULL DEFAULT 'ODEON',
  motif text NOT NULL DEFAULT 'Création sous-traitée',
  montant_ht numeric NOT NULL,
  statut text NOT NULL DEFAULT 'a_facturer' CHECK (statut IN ('a_facturer','facturee','reglee')),
  date_siren timestamptz,
  cree_le timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dossier_id)
);
GRANT SELECT, UPDATE ON public.refacturations_intragroupe TO authenticated;
GRANT ALL ON public.refacturations_intragroupe TO service_role;
ALTER TABLE public.refacturations_intragroupe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refac lisible admin cabinet" ON public.refacturations_intragroupe FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'cabinet'));
CREATE POLICY "refac modifiable admin" ON public.refacturations_intragroupe FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER refac_updated BEFORE UPDATE ON public.refacturations_intragroupe
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refacturer_creation_intragroupe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant numeric;
BEGIN
  IF NEW.statut = 'immatricule' AND COALESCE(OLD.statut, '') <> 'immatricule' AND NEW.avec_compta THEN
    SELECT refac_creation_ht INTO v_montant FROM public.parametres_tarifs LIMIT 1;
    INSERT INTO public.refacturations_intragroupe (dossier_id, montant_ht, date_siren)
    VALUES (NEW.id, COALESCE(v_montant, 199), COALESCE(NEW.siren_attribue_le, now()))
    ON CONFLICT (dossier_id) DO NOTHING;
  END IF;
  -- TODO : cas SANS COMPTA avec offre 'creation_ec' (creation realisee par CREA EXPERT mais
  -- facturee au client) : regle de refacturation symetrique a ajouter apres arbitrage.
  RETURN NEW;
END; $$;

CREATE TRIGGER dossiers_refacturation_intragroupe
  AFTER UPDATE OF statut ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.refacturer_creation_intragroupe();