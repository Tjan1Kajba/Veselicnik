import { test, expect, Page } from "@playwright/test";
import {
  TESTUSER,
  URLS,
  cleanupVeselice,
  createVeselica,
  ensureTestUser,
  http,
  loginAdmin,
  loginTestUser,
  prijavaNaVeselico,
  uniqueName,
} from "../helpers/api";
import { expectToast, loginUi, openVeselica } from "../helpers/ui";

const CENA_KLOBASE = 6.5;
const CENA_SOKA = 2.2;

test.describe("TC-HRANA-001: Naročevanje hrane", () => {
  let adminToken: string;
  let userToken: string;
  let veselica: { id: string; ime: string };
  let klobasa: { id: string; ime: string };
  let sok: { id: string; ime: string };
  const naročila: string[] = [];

  async function dodajJed(ime: string, cena: number) {
    const r = await http("POST", `${URLS.food}/menu`, {
      token: adminToken,
      json: { name: ime, description: "Testna jed", price: cena, available: true, veselica_id: veselica.id },
    });
    expect(r.status).toBe(200);
    return { id: r.body.id as string, ime };
  }

  /** Kartica jedi v razdelku "Naroči hrano" na strani veselice. */
  const kartica = (page: Page, ime: string) =>
    page.getByRole("heading", { level: 4, name: ime }).locator("xpath=../..");
  // gumba v kartici: 1. je "-", 2. je "+"
  const plus = (page: Page, ime: string) => kartica(page, ime).getByRole("button").nth(1);

  async function odpriVeselicoKotUporabnik(page: Page) {
    await loginUi(page, TESTUSER.username, TESTUSER.password);
    await page.locator('a[href="/veselice-pregled"]').first().click();
    await expect(page).toHaveURL(/\/veselice-pregled$/);
    await openVeselica(page, veselica.ime, veselica.id);
    await expect(page.getByRole("heading", { name: "Naroči hrano" })).toBeVisible();
  }

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
    userToken = (await loginTestUser()).token;

    veselica = await createVeselica(adminToken, { ime_veselice: uniqueName("TEST hrana") });
    // Predpogoj: testuser1 je prijavljen na veselico, v meniju sta razpoložljivi jedi.
    expect((await prijavaNaVeselico(userToken, veselica.id)).status).toBe(200);
    klobasa = await dodajJed(uniqueName("Klobasa z zeljem"), CENA_KLOBASE);
    sok = await dodajJed(uniqueName("Jabolčni sok"), CENA_SOKA);
  });

  test.afterAll(async () => {
    for (const id of naročila) {
      await http("DELETE", `${URLS.food}/orders/${id}`, { token: userToken }).catch(() => undefined);
    }
    for (const jed of [klobasa, sok]) {
      if (jed) await http("DELETE", `${URLS.food}/menu/${jed.id}`, { token: adminToken }).catch(() => undefined);
    }
    await cleanupVeselice(adminToken, [veselica.id]);
  });

  test("glavni scenarij: uporabnik naroči jed, naročilo je shranjeno s ceno iz menija", async ({ page }) => {
    let narociloId = "";

    await test.step("1-3. Prijava kot testuser1, Veselice, klik na veselico: prikazan je razdelek za naročanje", async () => {
      await odpriVeselicoKotUporabnik(page);
      await expect(kartica(page, klobasa.ime)).toBeVisible();
    });

    await test.step("4. Klik na + pri jedi: jed je dodana v naročilo, količina je 1", async () => {
      await plus(page, klobasa.ime).click();
      await expect(kartica(page, klobasa.ime).locator("span").filter({ hasText: /^1$/ })).toBeVisible();
      await expect(page.getByText("Povzetek naročila")).toBeVisible();
    });

    await test.step("5. Klik na Oddaj naročilo pošlje POST /orders, obvestilo o uspehu", async () => {
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith("/orders") && r.request().method() === "POST"),
        page.getByRole("button", { name: /Oddaj naročilo/ }).click(),
      ]);
      expect(res.status()).toBe(200);
      const telo = await res.json();
      narociloId = telo.id;
      expect(narociloId).toBeTruthy();
      naročila.push(narociloId);
      expect(telo.user_id).toBe(TESTUSER.username);
      expect(telo.id_veselica).toBe(veselica.id);
      await expectToast(page, "Naročilo uspešno ustvarjeno!");
    });

    await test.step("6. Stran /narocila: naročilo je na seznamu (jed, količina 1)", async () => {
      await expect(page).toHaveURL(/\/narocila$/);
      const karticaNarocila = page.getByText(klobasa.ime).locator("xpath=ancestor::div[contains(., 'Naročilo #')][1]");
      await expect(page.getByText(klobasa.ime)).toBeVisible();
      await expect(karticaNarocila.getByText("× 1")).toBeVisible();
    });

    await test.step("7. GET /orders/user/{user_id}: naročilo vsebuje jed, skupna cena je izračunana na strežniku", async () => {
      const r = await http("GET", `${URLS.food}/orders/user/${TESTUSER.username}`, { token: userToken });
      expect(r.status).toBe(200);
      const n = r.body.find((x: any) => x.id === narociloId);
      expect(n, "naročilo na seznamu").toBeDefined();
      expect(n.items).toEqual([expect.objectContaining({ item_id: klobasa.ime, quantity: 1 })]);
      expect(n.total_price).toBeCloseTo(CENA_KLOBASE, 2);
      expect(n.id_veselica).toBe(veselica.id);
      expect(n.paid).toBe(false);
    });
  });

  test("variacija: več jedi v istem naročilu", async ({ page }) => {
    await odpriVeselicoKotUporabnik(page);
    await plus(page, klobasa.ime).click();
    await plus(page, sok.ime).click();

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/orders") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Oddaj naročilo/ }).click(),
    ]);
    expect(res.status()).toBe(200);
    const telo = await res.json();
    naročila.push(telo.id);
    expect(telo.total_price).toBeCloseTo(CENA_KLOBASE + CENA_SOKA, 2);

    const r = await http("GET", `${URLS.food}/orders/user/${TESTUSER.username}`, { token: userToken });
    const n = r.body.find((x: any) => x.id === telo.id);
    expect(n.items.map((i: any) => i.item_id).sort()).toEqual([klobasa.ime, sok.ime].sort());
  });

  test("variacija: večja količina (trikrat klik na +)", async ({ page }) => {
    await odpriVeselicoKotUporabnik(page);
    for (let i = 0; i < 3; i++) await plus(page, klobasa.ime).click();
    await expect(kartica(page, klobasa.ime).locator("span").filter({ hasText: /^3$/ })).toBeVisible();

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/orders") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Oddaj naročilo/ }).click(),
    ]);
    expect(res.status()).toBe(200);
    const telo = await res.json();
    naročila.push(telo.id);
    expect(telo.total_price).toBeCloseTo(3 * CENA_KLOBASE, 2);

    const r = await http("GET", `${URLS.food}/orders/user/${TESTUSER.username}`, { token: userToken });
    expect(r.body.find((x: any) => x.id === telo.id).items[0].quantity).toBe(3);
  });

  test("negativno: uporabnik, ki ni prijavljen na veselico, naročila ne more oddati", async () => {
    const r0 = await http("POST", `${URLS.user}/uporabnik/registracija`, {
      json: { uporabnisko_ime: "testuser2", email: "testuser2@test.si", geslo: "Geslo123" },
    });
    expect([200, 400]).toContain(r0.status);
    const prijava = await http("POST", `${URLS.user}/uporabnik/prijava`, {
      json: { uporabnisko_ime_ali_email: "testuser2", geslo: "Geslo123" },
    });
    const r = await http("POST", `${URLS.food}/orders`, {
      token: prijava.body.access_token,
      json: { user_id: "temp", items: [{ item_id: klobasa.ime, quantity: 1 }], status: "created", paid: false },
    });
    expect(r.status).toBe(400);
    expect(r.status).toBeLessThan(500);
    expect(JSON.stringify(r.body)).toContain("not registered");
  });

  test("negativno: brez žetona naročila ni mogoče oddati", async () => {
    const r = await http("POST", `${URLS.food}/orders`, {
      json: { user_id: "temp", items: [{ item_id: klobasa.ime, quantity: 1 }], status: "created", paid: false },
    });
    expect([401, 403]).toContain(r.status);
  });

  test("negativno: neobstoječa jed je zavrnjena (404)", async () => {
    const r = await http("POST", `${URLS.food}/orders`, {
      token: userToken,
      json: { user_id: "temp", items: [{ item_id: "jed_ki_ne_obstaja_xyz", quantity: 1 }], status: "created", paid: false },
    });
    expect(r.status).toBe(404);
  });
});
