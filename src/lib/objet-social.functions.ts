import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { redigerObjetSocialServeur } from "./ai-objet.server";

const Entree = z.object({
  activite: z.string().min(3).max(600),
  forme: z.string().max(20),
});

/**
 * Rédige une proposition d'objet social à partir de la description d'activité.
 * Sortie strictement informative : le texte reste modifiable par le client et
 * peut être relu par le cabinet.
 */
export const redigerObjetSocial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data }) => redigerObjetSocialServeur(data.activite, data.forme));
