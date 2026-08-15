import { expect, test } from "@playwright/test";

/**
 * Encadrés pédagogiques : ouverture et fermeture au chevron, accès clavier des
 * champs révélés, et mémorisation locale de l'état après rechargement.
 */

const TITRES = [
  "Qu'est-ce que l'objet social ?",
  "À quoi sert le capital social ?",
  "Ce qu'implique une libération partielle",
  "Apports en nature et apports en industrie",
  "Un contrat de mariage a été signé devant notaire.",
];

async function ouvrirBanc(page: import("@playwright/test").Page) {
  await page.goto("/dev/encadres", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });
}

test("chaque encadré se déplie puis se replie via le chevron", async ({ page }) => {
  await ouvrirBanc(page);
  for (const titre of TITRES) {
    const bouton = page.getByRole("button", { name: titre });
    await expect(bouton).toHaveAttribute("aria-expanded", "false");
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-expanded", "true");
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-expanded", "false");
  }
});

test("l'encadré s'ouvre au clavier et ses champs sont atteignables au clavier", async ({ page }) => {
  await ouvrirBanc(page);
  const bouton = page.getByRole("button", { name: "Qu'est-ce que l'objet social ?" });
  await bouton.focus();
  await page.keyboard.press("Enter");
  await expect(bouton).toHaveAttribute("aria-expanded", "true");

  const champ = page.getByLabel("Champ Qu'est-ce que l'objet social ?");
  await expect(champ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(champ).toBeFocused();
  await page.keyboard.type("saisie clavier");
  await expect(champ).toHaveValue("saisie clavier");
});

test("l'état déplié est retrouvé après rechargement de la page", async ({ page }) => {
  await ouvrirBanc(page);
  const bouton = page.getByRole("button", { name: "À quoi sert le capital social ?" });
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });
  const apres = page.getByRole("button", { name: "À quoi sert le capital social ?" });
  await expect(apres).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Qu'est-ce que l'objet social ?" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  await apres.click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "À quoi sert le capital social ?" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("les champs du contrat de mariage signalent les incohérences", async ({ page }) => {
  await ouvrirBanc(page);
  await page.getByRole("button", { name: "Un contrat de mariage a été signé devant notaire." }).click();

  await expect(page.getByText("Indiquez l'étude notariale (nom de l'office et commune).")).toBeVisible();
  await expect(page.getByText("Indiquez le nom du notaire ayant reçu l'acte.")).toBeVisible();

  await page.getByLabel("Étude notariale").fill("SCP Martin & Associés, Nancy");
  await page.getByLabel("Nom du notaire").fill("Maître Claire Martin");
  await page.getByLabel("Date du contrat").fill("2099-01-01");
  await expect(
    page.getByText("La date de l'acte ne peut pas être postérieure à aujourd'hui."),
  ).toBeVisible();

  await page.getByLabel("Date du contrat").fill("2015-06-30");
  await expect(
    page.getByText("La date de l'acte ne peut pas être postérieure à aujourd'hui."),
  ).toHaveCount(0);
});
