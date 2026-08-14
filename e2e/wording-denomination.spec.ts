import { expect, test } from "@playwright/test";

/**
 * Le wording des avertissements de dénomination doit être rigoureusement
 * identique dans le récapitulatif final et dans les emails de progression,
 * et rester informatif : jamais un blocage.
 */
const CAS = ["proche", "terme", "cumul"] as const;

function normaliser(t: string) {
  return t.replace(/\s+/g, " ").trim();
}

test("wording identique entre récapitulatif et emails, sans blocage", async ({ page }) => {
  await page.goto("/dev/wording-denomination", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });

  for (const cas of CAS) {
    const recap = page.getByTestId(`recap-${cas}`);
    const email = page.getByTestId(`email-${cas}`);
    const preambule = normaliser((await page.getByTestId(`preambule-${cas}`).innerText()) ?? "");

    const phrases = await recap.locator("li").allInnerTexts();
    expect(phrases.length).toBeGreaterThan(0);

    const texteEmail = normaliser(await email.innerText());
    expect(texteEmail).toContain(preambule);

    for (const phrase of phrases) {
      expect(texteEmail).toContain(normaliser(phrase));
    }

    // Aucun vocabulaire de blocage, des deux côtés.
    for (const texte of [normaliser(await recap.innerText()), texteEmail]) {
      expect(texte).not.toMatch(/bloqu|refus|interdit|impossible d'immatriculer/i);
    }
  }
});
