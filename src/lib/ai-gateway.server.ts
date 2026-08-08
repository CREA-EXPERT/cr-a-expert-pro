import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Provider AI SDK connecté à la passerelle IA de Lovable (usage serveur uniquement). */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}
