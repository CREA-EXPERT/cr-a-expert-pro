/** Pilotage de la purge des dossiers de test (rôle administrateur uniquement). */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function verifierAdmin(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
    };
  };
}, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Action réservée à l'administrateur.");
}

export const listerDossiersDeTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { listerDossiersTest } = await import("./purge-test.server");
    return listerDossiersTest();
  });

export const purgerUnDossierTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ dossierId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { purgerDossierTest } = await import("./purge-test.server");
    return purgerDossierTest(data.dossierId);
  });

export const purgerTousDossiersTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ confirmation: z.literal("TEST") }).parse(data))
  .handler(async ({ context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { listerDossiersTest, purgerDossierTest } = await import("./purge-test.server");
    const dossiers = await listerDossiersTest();
    let fichiers = 0;
    for (const d of dossiers) {
      const r = await purgerDossierTest(d.id);
      fichiers += r.fichiersSupprimes;
    }
    return { dossiers: dossiers.length, fichiers };
  });
