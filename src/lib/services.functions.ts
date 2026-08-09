import { createServerFn } from "@tanstack/react-start";

/**
 * Indique si les services externes (email, paiement, captcha) sont configurés.
 * Aucune valeur de secret n'est renvoyée : uniquement leur présence.
 */
export const etatServices = createServerFn({ method: "GET" }).handler(async () => ({
  email: Boolean(process.env["RESEND_API_KEY"] && process.env["LOVABLE_API_KEY"]),
  paiement: Boolean(process.env["STRIPE_SECRET_KEY"]),
  captcha: Boolean(process.env["TURNSTILE_SITE_KEY"]),
}));
