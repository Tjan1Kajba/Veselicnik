import { test, expect } from "@playwright/test";
import { ADMIN, TESTUSER, URLS, ensureTestUser, http, loginAdmin } from "../helpers/api";
import { expectToast, loginUi } from "../helpers/ui";

const ADMIN_ONLY_HREFS = ["/veselice", "/menu", "/glasba", "/prizes", "/draws"];
const NAPACNI_PODATKI = "Napačno uporabniško ime/email ali geslo";

test.describe("TC-PRIJAVA-001: Prijava uporabnika", () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test("glavni scenarij: prijava z uporabniškim imenom", async ({ page, context }) => {
    await test.step("1. Neprijavljen uporabnik je s / preusmerjen na /login", async () => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step("2. Vnos uporabniškega imena in gesla (geslo je maskirano)", async () => {
      await page.locator("#usernameOrEmail").fill(TESTUSER.username);
      await page.locator("#password").fill(TESTUSER.password);
      await expect(page.locator("#password")).toHaveAttribute("type", "password");
    });

    const odgovor = await test.step("3. Klik na gumb za prijavo pošlje POST /uporabnik/prijava", async () => {
      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().endsWith("/uporabnik/prijava") && r.request().method() === "POST"
        ),
        page.locator("form button[type=submit]").click(),
      ]);
      expect(res.status()).toBe(200);
      return res;
    });

    await test.step("4. Odgovor vsebuje žetona in podatke uporabnika brez gesla", async () => {
      const telo = await odgovor.json();
      expect(telo.access_token).toBeTruthy();
      expect(telo.refresh_token).toBeTruthy();
      expect(telo.user.uporabnisko_ime).toBe(TESTUSER.username);
      expect(telo.user.tip_uporabnika).toBe("normal");
      const surovo = JSON.stringify(telo);
      expect(surovo).not.toContain("zakodirano_geslo");
      expect(surovo).not.toContain(TESTUSER.password);
    });

    await test.step("5. Obstaja piškotek session_token (HttpOnly, približno 24 ur)", async () => {
      const piskotek = (await context.cookies()).find((c) => c.name === "session_token");
      expect(piskotek, "piškotek session_token").toBeDefined();
      expect(piskotek!.httpOnly).toBe(true);
      const preostaloSekund = piskotek!.expires - Date.now() / 1000;
      expect(preostaloSekund).toBeGreaterThan(23 * 3600);
      expect(preostaloSekund).toBeLessThan(25 * 3600);
    });

    await test.step("6. Obvestilo o uspehu in samo strani za navadnega uporabnika", async () => {
      await expectToast(page, "Prijava uspešna. Preusmerjam ...");
      await expect(page).toHaveURL(/\/uporabnik$/);
      await expect(page.getByText(TESTUSER.email)).toBeVisible();
      for (const href of ADMIN_ONLY_HREFS) {
        await expect(page.locator(`a[href="${href}"]`), `povezava ${href}`).toHaveCount(0);
      }
    });

    await test.step("7. Po osvežitvi strani uporabnik ostane prijavljen", async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/uporabnik$/);
      await expect(page.getByText(TESTUSER.email)).toBeVisible();
    });
  });

  test("variacija: prijava z e-pošto namesto uporabniškega imena", async ({ page }) => {
    await loginUi(page, TESTUSER.email, TESTUSER.password);
    await expect(page.getByText(TESTUSER.email)).toBeVisible();
  });

  test("variacija: prijava administratorja prikaže administratorske strani", async ({ page }) => {
    const { user } = await loginAdmin();
    expect(user.tip_uporabnika).toBe("admin");

    await loginUi(page, ADMIN.username, ADMIN.password);
    for (const href of ADMIN_ONLY_HREFS) {
      await expect(page.locator(`a[href="${href}"]`).first(), `povezava ${href}`).toBeVisible();
    }
  });

  for (const primer of [
    { naziv: "napačno geslo", uporabnik: TESTUSER.username, geslo: "napacnoGeslo1" },
    { naziv: "neobstoječ uporabnik", uporabnik: "ta_uporabnik_ne_obstaja", geslo: "Geslo123" },
  ]) {
    test(`variacija: ${primer.naziv} zavrne prijavo brez žetonov in piškotka`, async ({ page, context }) => {
      await page.goto("/login");
      await page.locator("#usernameOrEmail").fill(primer.uporabnik);
      await page.locator("#password").fill(primer.geslo);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith("/uporabnik/prijava")),
        page.locator("form button[type=submit]").click(),
      ]);

      expect(res.status()).toBe(401);
      expect((await res.json()).detail).toBe(NAPACNI_PODATKI);
      await expect(page.locator(".error-message")).toContainText(NAPACNI_PODATKI);
      await expect(page).toHaveURL(/\/login$/);
      expect((await context.cookies()).some((c) => c.name === "session_token")).toBe(false);
    });
  }

  test("API: prijava vrne žetona, brez gesla v odgovoru", async () => {
    const r = await http("POST", `${URLS.user}/uporabnik/prijava`, {
      json: { uporabnisko_ime_ali_email: TESTUSER.username, geslo: TESTUSER.password },
    });
    expect(r.status).toBe(200);
    expect(r.body.token_type).toBe("bearer");
    expect(r.body.expires_in).toBe(30 * 60);
  });
});
