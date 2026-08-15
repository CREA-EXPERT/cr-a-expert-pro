import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMAIL_CABINET } from "./config";

function fichiers(racine: string, acc: string[] = []) {
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) fichiers(chemin, acc);
    else if (/\.(ts|tsx)$/.test(nom)) acc.push(chemin);
  }
  return acc;
}

describe("destinataire des emails internes au cabinet", () => {
  it("centralise l'adresse du cabinet", () => {
    expect(EMAIL_CABINET).toBe("contact@crea-expert.fr");
  });

  it("n'écrit l'adresse du cabinet en dur que dans la configuration", () => {
    const fautifs = fichiers("src").filter(
      (f) =>
        !f.endsWith("src/lib/config.ts") &&
        !f.endsWith("emails-cabinet.test.ts") &&
        /destinataire:\s*"contact@crea-expert\.fr"/.test(readFileSync(f, "utf8")),
    );
    expect(fautifs).toEqual([]);
  });

  it("envoie la notification de contact à EMAIL_CABINET, jamais à un compte utilisateur", () => {
    const source = readFileSync("src/lib/contact.functions.ts", "utf8");
    expect(source).toContain('await import("./config")');
    expect(source).toContain("destinataire: EMAIL_CABINET");
    expect(source).toContain("pourCabinet: true");
    expect(source).not.toMatch(/destinataire:\s*(profil|user|compte|data\.email)/);
  });

  it("adresse les notifications de conformité au cabinet et non aux profils admin", () => {
    const source = readFileSync("src/lib/notifications.server.ts", "utf8");
    expect(source).toContain("return [EMAIL_CABINET]");
    expect(source).not.toContain('.from("profiles")');
    expect(source).not.toContain('.in("role"');
  });

  it("ne s'appuie sur aucune adresse fictive dans le code d'envoi", () => {
    const fautifs = fichiers("src")
      .filter((f) => !f.endsWith(".test.ts") && !f.endsWith("types.ts"))
      .filter((f) => {
        const t = readFileSync(f, "utf8");
        return /crea-expert\.test|admin\.demo/.test(t) && /envoyerEmail|destinataire/.test(t);
      });
    expect(fautifs).toEqual([]);
  });
});
