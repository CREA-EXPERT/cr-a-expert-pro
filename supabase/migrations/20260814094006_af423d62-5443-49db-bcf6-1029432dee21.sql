ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS date_expiration date,
  ADD COLUMN IF NOT EXISTS fichier_verso_url text,
  ADD COLUMN IF NOT EXISTS verification_statut text NOT NULL DEFAULT 'non_lance';

CREATE TABLE IF NOT EXISTS public.verifications_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type_controle text NOT NULL,
  resultat text NOT NULL CHECK (resultat IN ('conforme','doute','non_conforme')),
  motif text NOT NULL DEFAULT '',
  modele text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verifications_pieces TO authenticated;
GRANT ALL ON public.verifications_pieces TO service_role;
ALTER TABLE public.verifications_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Le client voit les verifications de son dossier"
  ON public.verifications_pieces FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = dossier_id AND d.user_id = auth.uid())
    OR private.has_role(auth.uid(), 'cabinet') OR private.has_role(auth.uid(), 'admin')
  );

CREATE TABLE IF NOT EXISTS public.motifs_rejet_greffe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  date_rejet date NOT NULL DEFAULT current_date,
  motif_texte text NOT NULL,
  categorie text NOT NULL CHECK (categorie IN ('piece_identite','justificatif_domicile','statuts','annonce_legale','beneficiaires_effectifs','autre')),
  piece_concernee text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.motifs_rejet_greffe TO authenticated;
GRANT ALL ON public.motifs_rejet_greffe TO service_role;
ALTER TABLE public.motifs_rejet_greffe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Le cabinet consulte les motifs de rejet"
  ON public.motifs_rejet_greffe FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'cabinet') OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Le cabinet enregistre les motifs de rejet"
  ON public.motifs_rejet_greffe FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'cabinet') OR private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.relances_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  envoye_le timestamptz NOT NULL DEFAULT now(),
  pieces_listees text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.relances_pieces TO authenticated;
GRANT ALL ON public.relances_pieces TO service_role;
ALTER TABLE public.relances_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Le cabinet consulte les relances"
  ON public.relances_pieces FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'cabinet') OR private.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_verifications_document ON public.verifications_pieces(document_id);
CREATE INDEX IF NOT EXISTS idx_relances_dossier ON public.relances_pieces(dossier_id, envoye_le DESC);
CREATE INDEX IF NOT EXISTS idx_motifs_rejet_dossier ON public.motifs_rejet_greffe(dossier_id, date_rejet DESC);