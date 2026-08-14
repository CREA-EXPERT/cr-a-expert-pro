import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyserActiviteServeur } from "./ai-activite.server";

const Entree = z.object({
  description: z.string().min(1).max(600),
  forme: z.string().max(20),
});

/**
 * Analyse une activité décrite en quelques mots : rédaction de l'objet social,
 * code d'activité indicatif et caractère réglementé. Information générale.
 */
export const analyserActivite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data }) => analyserActiviteServeur(data.description, data.forme));
