import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CallbackDialog } from "@/components/CallbackDialog";
import { isEI, isSas } from "@/lib/domain";
import { apportCogestion, estCommunautaire, type Associe, type Dossier } from "@/lib/documents";
import { analyserChecklist, estMineur } from "@/lib/checklist";
import { activitesDuDossier, activitesReglementees, libelleActivite } from "@/lib/activites";
import { ApercuChecklist } from "@/components/ApercuChecklist";

const champ = "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm";

function Bloc({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold">{titre}</h3>
        {aide && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{aide}</p>}
      </div>
      {children}
    </section>
  );
}

function Case({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <Label htmlFor={id} className="text-sm font-normal leading-relaxed">
        {label}
      </Label>
    </div>
  );
}

/**
 * Questionnaire de situation : ses réponses déterminent, pièce par pièce, ce qui
 * est obligatoire, ce qui est généré par la plateforme et ce qui n'est pas exigé.
 */
export function SituationChecklist({
  dossier,
  associes,
  patch,
  majAssocie,
}: {
  dossier: Dossier;
  associes: Associe[];
  patch: (v: Partial<Dossier>) => void | Promise<void>;
  majAssocie: (id: string, v: Partial<Associe>) => void | Promise<void>;
}) {
  const ei = isEI(dossier.forme_juridique);
  const sas = isSas(dossier.forme_juridique);
  const physiques = associes.filter((a) => a.type === "personne_physique");
  const analyse = analyserChecklist(dossier, associes);
  const reglementees = activitesReglementees(activitesDuDossier(dossier));

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground text-justify">
        Les pièces demandées au guichet unique dépendent de votre situation. Répondez à ces
        questions : la liste ci-dessous se met à jour immédiatement et indique, pour chaque
        document, s'il est obligatoire dans votre cas, s'il est généré par nos soins, ou s'il n'y a
        rien à fournir.
      </p>

      {!ei && (
        <Bloc
          titre="Siège social"
          aide="Le justificatif attendu dépend du mode d'occupation des locaux."
        >
          <Case
            id="heberge"
            label="Le dirigeant est hébergé par un tiers à l'adresse du siège."
            checked={dossier.siege_heberge}
            onChange={(v) => patch({ siege_heberge: v })}
          />
        </Bloc>
      )}

      {!ei && (
        <Bloc
          titre="Nomination des dirigeants"
          aide="Nommer le premier dirigeant directement dans les statuts évite un acte séparé."
        >
          <Case
            id="nomme"
            label="Le ou les premiers dirigeants sont nommés dans les statuts."
            checked={dossier.dirigeant_nomme_statuts}
            onChange={(v) => patch({ dirigeant_nomme_statuts: v })}
          />
        </Bloc>
      )}

      {!ei && (
        <Bloc
          titre="Nature des apports et du fonds"
          aide="Les apports autres qu'en numéraire déclenchent des pièces et des formalités supplémentaires."
        >
          {dossier.apport_nature && (
            <Case
              id="dispense"
              label="Les associés décident à l'unanimité de se dispenser de commissaire aux apports : aucun apport en nature n'excède 30 000 € et leur total n'excède pas la moitié du capital."
              checked={dossier.dispense_commissaire_apports}
              onChange={(v) => patch({ dispense_commissaire_apports: v })}
            />
          )}
          <Case
            id="immeuble"
            label="Un immeuble est apporté à la société (acte notarié et publicité foncière obligatoires)."
            checked={dossier.apport_immeuble}
            onChange={(v) => patch({ apport_immeuble: v, routage_cabinet: v || dossier.routage_cabinet })}
          />
          <div className="space-y-1">
            <Label className="text-xs">Fonds de commerce</Label>
            <select
              className={champ}
              value={dossier.fonds_commerce ?? "aucun"}
              onChange={(e) => patch({ fonds_commerce: e.target.value })}
            >
              <option value="aucun">Aucun fonds de commerce</option>
              <option value="achat">Achat d'un fonds de commerce</option>
              <option value="apport">Apport d'un fonds de commerce</option>
              <option value="location_gerance">Location-gérance d'un fonds</option>
            </select>
          </div>
          {apportCogestion(dossier) && associes.some(estCommunautaire) && (
            <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3">
              <Label className="text-xs">
                Le bien apporté est-il un bien commun du couple ?
              </Label>
              <select
                className={champ}
                value={dossier.bien_commun_apport ?? "non"}
                onChange={(e) =>
                  patch({
                    bien_commun_apport: e.target.value,
                    routage_cabinet:
                      e.target.value === "je_ne_sais_pas" ? true : dossier.routage_cabinet,
                  })
                }
              >
                <option value="non">Non, il s'agit d'un bien propre</option>
                <option value="oui">Oui, il s'agit d'un bien commun</option>
                <option value="je_ne_sais_pas">Je ne sais pas</option>
              </select>
              {dossier.bien_commun_apport === "oui" && (
                <div className="space-y-1">
                  <Label className="text-xs">Désignation du bien apporté</Label>
                  <Input
                    maxLength={200}
                    value={dossier.bien_commun_designation ?? ""}
                    onChange={(e) => patch({ bien_commun_designation: e.target.value })}
                  />
                </div>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                L'apport d'un bien commun exige le consentement exprès du conjoint (art. 1424 du
                Code civil). Si vous ne savez pas, votre dossier est orienté vers la revue d'un
                professionnel. Information générale, pas un conseil.
              </p>
            </div>
          )}
        </Bloc>
      )}

      <Bloc
        titre="Activité"
        aide="Certaines activités supposent un diplôme, un agrément ou une qualification."
      >
        <Case
          id="artisanale"
          label="L'activité est artisanale et figure parmi les métiers exigeant une qualification (loi du 5 juillet 1996)."
          checked={dossier.activite_artisanale}
          onChange={(v) => patch({ activite_artisanale: v })}
        />
        {reglementees.length > 0 && (
          <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm leading-relaxed">
            <p className="font-medium">
              Activités réglementées déclarées à l'étape « Objet social »
            </p>
            <ul className="mt-2 space-y-1 pl-5 [&>li]:list-disc">
              {reglementees.map((a, i) => (
                <li key={a.id}>
                  {libelleActivite(a, i)} — justificatif attendu :{" "}
                  {a.justificatif_type === "diplome"
                    ? "diplôme ou titre"
                    : a.justificatif_type === "experience"
                      ? "expérience professionnelle"
                      : "à préciser à l'étape « Objet social »"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Récapitulatif en lecture seule : modifiez ces informations à l'étape « Objet social ».
            </p>
          </div>
        )}
      </Bloc>


      <Bloc
        titre="Autres entreprises et interdiction de gérer"
        aide="Aucune pièce supplémentaire n'est demandée, mais le numéro SIREN existant doit être renseigné au guichet unique."
      >
        <Case
          id="deja"
          label="Le dirigeant est déjà immatriculé à un registre pour une autre entreprise."
          checked={dossier.dirigeant_deja_immatricule}
          onChange={(v) => patch({ dirigeant_deja_immatricule: v })}
        />
        {dossier.dirigeant_deja_immatricule && (
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="siren">
              Numéro SIREN existant
            </Label>
            <Input
              id="siren"
              maxLength={14}
              inputMode="numeric"
              value={dossier.siren_existant ?? ""}
              onChange={(e) => patch({ siren_existant: e.target.value })}
            />
          </div>
        )}
        <Case
          id="interdiction"
          label="Je confirme ne faire l'objet d'aucune interdiction de gérer."
          checked={dossier.sans_interdiction_gerer}
          onChange={(v) => patch({ sans_interdiction_gerer: v })}
        />
      </Bloc>

      {physiques.length > 0 && (
        <Bloc
          titre="Situation de chaque personne physique"
          aide="Nationalité, protection juridique, émancipation et statut du conjoint : ces réponses conditionnent des pièces propres à chaque personne."
        >
          <div className="space-y-4">
            {physiques.map((a) => (
              <div key={a.id} className="space-y-3 rounded-md border border-border bg-background p-3">
                <p className="text-sm font-medium">
                  {`${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé sans nom"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nationalité</Label>
                    <select
                      className={champ}
                      value={a.zone_nationalite}
                      onChange={(e) => majAssocie(a.id, { zone_nationalite: e.target.value })}
                    >
                      <option value="france">Française</option>
                      <option value="ue">Union européenne, EEE ou Suisse</option>
                      <option value="tiers">Pays tiers</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mesure de protection juridique</Label>
                    <select
                      className={champ}
                      value={a.mesure_protection}
                      onChange={(e) => majAssocie(a.id, { mesure_protection: e.target.value })}
                    >
                      <option value="aucune">Aucune</option>
                      <option value="curatelle">Curatelle</option>
                      <option value="tutelle">Tutelle</option>
                    </select>
                  </div>
                </div>

                {a.zone_nationalite === "tiers" && (
                  <Case
                    id={`res-${a.id}`}
                    label="Cette personne réside en France."
                    checked={a.reside_en_france}
                    onChange={(v) => majAssocie(a.id, { reside_en_france: v })}
                  />
                )}

                {estMineur(a) && (
                  <Case
                    id={`ema-${a.id}`}
                    label="Ce mineur est émancipé par décision de justice."
                    checked={a.mineur_emancipe}
                    onChange={(v) => majAssocie(a.id, { mineur_emancipe: v })}
                  />
                )}

                {(ei || dossier.forme_juridique === "SARL" || dossier.forme_juridique === "EURL") && (
                  <>
                    <Case
                      id={`conj-${a.id}`}
                      label="Son conjoint, marié ou pacsé, travaille régulièrement dans l'entreprise."
                      checked={a.conjoint_travaille}
                      onChange={(v) => majAssocie(a.id, { conjoint_travaille: v })}
                    />
                    {a.conjoint_travaille && (
                      <div className="space-y-1">
                        <Label className="text-xs">Statut du conjoint</Label>
                        <select
                          className={champ}
                          value={a.conjoint_statut ?? ""}
                          onChange={(e) => majAssocie(a.id, { conjoint_statut: e.target.value || null })}
                        >
                          <option value="">Choisir…</option>
                          <option value="collaborateur">Conjoint collaborateur</option>
                          <option value="salarie">Conjoint salarié</option>
                          <option value="associe">Conjoint associé</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {sas && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              En SAS et SASU, aucune formalité liée au conjoint n'est exigée, quelle que soit la
              situation matrimoniale des associés.
            </p>
          )}
        </Bloc>
      )}

      {analyse.blocages.length > 0 && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="text-sm font-semibold">Points à traiter avant de poursuivre</h3>
          {analyse.blocages.map((b) => (
            <div key={b.titre}>
              <p className="text-sm font-medium">{b.titre}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.message}</p>
            </div>
          ))}
          <CallbackDialog label="Être rappelé par le cabinet" size="sm" />
        </div>
      )}

      <ApercuChecklist dossier={dossier} associes={associes} />
    </div>
  );
}
