import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayModel } from "./ai-objet.server";

const Entree = z.object({
  activite: z.string().min(3).max(600),
  forme: z.string().max(20),
});

/**
 * Rédige une proposition d'objet social à partir de la description d'activité.
 * Sortie strictement informative : le texte reste modifiable par le client et
 * relu par le cabinet.
 */
export const redigerObjetSocial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data }) => {
    try {
      const model = createLovableAiGatewayModel();
      const result = streamText({
        model,
        system:
          "Tu rédiges des objets sociaux pour des sociétés françaises. " +
          "Réponds uniquement par le texte de l'objet social, en français, sans titre, sans guillemets, " +
          "sans commentaire et sans conseil juridique. Un seul paragraphe de 40 à 90 mots, " +
          "rédigé à l'infinitif nominal (« La conception, la vente… »), suffisamment large pour couvrir " +
          "les activités connexes, et terminé par : « et, plus généralement, toutes opérations " +
          "industrielles, commerciales, financières, mobilières ou immobilières se rattachant " +
          "directement ou indirectement à cet objet ou susceptibles d'en faciliter la réalisation. » " +
          "N'invente aucune mention d'agrément ou d'activité réglementée.",
        prompt: `Forme juridique : ${data.forme}. Activité décrite par le créateur : ${data.activite}`,
      });
      const texte = await result.text;
      return { texte: texte.trim(), erreur: null as string | null };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      return { texte: "", erreur: message.slice(0, 300) };
    }
  });

