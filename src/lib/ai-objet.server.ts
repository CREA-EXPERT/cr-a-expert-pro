import { createLovableAiGatewayProvider } from "./ai-gateway.server";

/** Modèle de rédaction assistée (passerelle IA Lovable). Serveur uniquement. */
export function createLovableAiGatewayModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Assistance à la rédaction indisponible pour le moment.");
  return createLovableAiGatewayProvider(key)("google/gemini-3.6-flash");
}
