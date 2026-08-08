import { NAF } from "./naf";

/**
 * Codes NAF (préfixes) correspondant à des activités le plus souvent réglementées :
 * diplôme, qualification, agrément, autorisation administrative, inscription à un ordre
 * ou assurance obligatoire. Liste indicative, tenue à jour manuellement — elle sert
 * uniquement à déclencher une vérification par le cabinet.
 */
const PREFIXES_REGLEMENTES = [
  "01.6", "02.4", "03.1", "03.2", // agriculture, pêche : autorisations et licences
  "10.1", "10.5", "10.7", "11.0", "12.0", // denrées animales, lait, boulangerie, boissons alcoolisées, tabac
  "20.5", "21.1", "21.2", // produits chimiques, pharmacie
  "24.4", "25.4", "30.3", // métaux précieux, armement, aéronautique
  "35.1", "35.2", "35.3", "36.0", "37.0", "38.1", "38.2", "38.3", "39.0", // énergie, eau, déchets, dépollution
  "41.2", "42.1", "42.2", "42.9", "43.", // bâtiment et travaux publics (qualification, assurance décennale)
  "45.2", "45.4", // entretien et réparation de véhicules
  "46.1", "46.2", "46.3", "47.2", "47.3", "47.7", "47.8", // intermédiaires, alimentaire, carburants, tabac, marchés
  "49.3", "49.4", "50.", "51.", "52.2", "53.", // transports de personnes et de marchandises, poste
  "55.", "56.3", // hébergement, débits de boissons
  "58.1", "59.", "60.", // édition, cinéma, audiovisuel
  "64.", "65.", "66.", // banque, assurance, courtage, intermédiation financière
  "68.3", // agences immobilières, syndics, administrateurs de biens (carte professionnelle)
  "69.", "70.2", "71.1", "71.2", // juridique, comptable, conseil réglementé, architecture, contrôle technique
  "74.9", "75.0", // expertise, vétérinaires
  "78.", "79.1", "79.9", // travail temporaire, agences de voyage
  "80.1", "80.2", "80.3", // sécurité privée, enquêtes
  "81.2", // désinfection, dératisation
  "82.9", "84.", // recouvrement, administration
  "85.1", "85.2", "85.3", "85.4", "85.5", // enseignement, auto-écoles, formation réglementée
  "86.", "87.", "88.", // santé, hébergement médico-social, action sociale
  "92.0", // jeux de hasard
  "93.1", "93.2", // sport encadré, parcs d'attractions
  "94.", "96.0", "97.0", // organisations, soins du corps, tatouage, pompes funèbres
];

export function estCodeReglemente(code: string | null | undefined) {
  if (!code) return false;
  return PREFIXES_REGLEMENTES.some((p) => code.startsWith(p));
}

export function libelleNaf(code: string | null | undefined) {
  if (!code) return null;
  return NAF.find((n) => n.code === code)?.label ?? null;
}
