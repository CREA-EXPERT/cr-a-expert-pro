import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyserReglementationServeur } from "./ai-reglemente.server";

const Entree = z.object({
  activite: z.string().min(3).max(600),
  naf: z.string().max(200).optional(),
});

/**
 * Indique si une activité décrite librement relève, en règle générale, d'une
 * activité réglementée. Information générique, sans conseil personnalisé.
 */
export const analyserReglementation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data }) => analyserReglementationServeur(data.activite, data.naf));
