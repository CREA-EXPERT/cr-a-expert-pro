/**
 * Constantes de configuration transverses de la plateforme.
 * Source unique : ne jamais dupliquer ces valeurs ailleurs.
 */

/**
 * Boîte du cabinet destinataire de TOUS les emails internes (contact,
 * notifications de conformité, alertes). Ne concerne jamais les emails
 * adressés aux clients, qui utilisent l'adresse du dossier.
 *
 * En mode test (dossier `est_test`), la règle du mode test prime : sujet
 * préfixé « [TEST] » et envoi vers l'alias de test uniquement.
 */
export const EMAIL_CABINET = "contact@crea-expert.fr";
