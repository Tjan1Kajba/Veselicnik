import { expect, Page } from "@playwright/test";

/** Prijava prek obrazca /login; počaka na preusmeritev na /uporabnik. */
export async function loginUi(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator("#usernameOrEmail").fill(username);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL("**/uporabnik", { timeout: 20_000 }),
    page.locator("form button[type=submit]").click(),
  ]);
}

/** Skupina polj (label + input) v obrazcih po besedilu oznake. */
export const field = (page: Page, label: string) =>
  page.locator(".input-group").filter({ hasText: label });

/** Pojavno obvestilo (Toastify). */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}

/** Na seznamu veselic klikne kartico; če klik ne odpre podrobnosti, odpre stran neposredno. */
export async function openVeselica(page: Page, ime: string, id: string) {
  await page.getByText(ime).first().click();
  await page
    .waitForURL(`**/veselice/${id}`, { timeout: 5_000 })
    .catch(() => page.goto(`/veselice/${id}`));
}
