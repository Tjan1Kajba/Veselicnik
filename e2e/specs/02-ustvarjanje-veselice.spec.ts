import { test, expect } from "@playwright/test";
import {
  ADMIN,
  TESTUSER,
  URLS,
  cleanupVeselice,
  ensureTestUser,
  futureLocal,
  getVeselica,
  http,
  loginAdmin,
  loginTestUser,
  uniqueName,
} from "../helpers/api";
import { expectToast, field, loginUi } from "../helpers/ui";

test.describe("TC-VESELICA-001: Ustvarjanje veselice", () => {
  let adminToken: string;
  const ustvarjene: string[] = [];

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
  });

  test.afterAll(async () => {
    await cleanupVeselice(adminToken, ustvarjene);
  });

  test("glavni scenarij: administrator ustvari veselico in jo vidi uporabnik", async ({ page, browser }) => {
    const ime = uniqueName("Poletna veselica 2026");
    const lokacija = "Gasilski dom Maribor";
    const opis = "Glasba v živo, hrana in srečelov.";
    let veselicaId = "";

    await test.step("1. Prijava kot admin, prikazane so administratorske strani", async () => {
      await loginUi(page, ADMIN.username, ADMIN.password);
      await expect(page.locator('a[href="/veselice"]').first()).toBeVisible();
    });

    await test.step("2. Stran /veselice: obrazec in seznam, starostna omejitev je privzeto 18", async () => {
      await page.goto("/veselice");
      await page.getByRole("button", { name: /Nova veselica/ }).click();
      await expect(field(page, "Minimalna starost za vstop").locator("input")).toHaveValue("18");
    });

    await test.step("3. Izpolnitev vseh polj in potrditev pošlje POST /veselice", async () => {
      await page.getByPlaceholder("npr. Novoletska zabava 2025").fill(ime);
      await field(page, "Datum in ura").locator("input").fill(futureLocal(30));
      await page.getByPlaceholder("npr. Ljubljana, Kongresni trg 1").fill(lokacija);
      await page.getByPlaceholder("0 = brez omejitve").fill("100");
      await field(page, "Minimalna starost za vstop").locator("input").fill("18");
      await page.getByPlaceholder("Dodajte opis dogodka, temo, posebnosti...").fill(opis);

      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().endsWith("/veselice") && r.request().method() === "POST"
        ),
        page.getByRole("button", { name: /Ustvari veselico/ }).click(),
      ]);
      expect(res.status()).toBe(200);
      const telo = await res.json();
      expect(telo.id).toBeTruthy();
      veselicaId = telo.id;
      ustvarjene.push(veselicaId);
    });

    await test.step("4. Obvestilo o uspehu in nova veselica na seznamu", async () => {
      await expectToast(page, "Veselica uspešno ustvarjena!");
      await expect(page.getByRole("heading", { name: ime })).toBeVisible();
    });

    await test.step("5. GET /veselice/{id}: podrobnosti ustrezajo vnosu, seznam udeležencev je prazen", async () => {
      const r = await getVeselica(adminToken, veselicaId);
      expect(r.status).toBe(200);
      expect(r.body.ime_veselice).toBe(ime);
      expect(r.body.lokacija).toBe(lokacija);
      expect(r.body.opis_dogodka).toBe(opis);
      expect(r.body.max_udelezencev).toBe(100);
      expect(r.body.starost_za_vstop).toBe(18);
      expect(r.body.st_pirjaveljenih).toBe(0);
      expect(r.body.prijavljeni_uporabniki).toEqual([]);
      expect(r.body.prijavljeni_uporabniki_podatki).toEqual([]);
      expect(new Date(r.body.cas).getTime()).toBeGreaterThan(Date.now());
    });

    await test.step("6. Navaden uporabnik vidi veselico, upravljanje /veselice mu ni dostopno", async () => {
      const kontekst = await browser.newContext({ baseURL: URLS.frontend });
      const stran = await kontekst.newPage();
      try {
        await loginUi(stran, TESTUSER.username, TESTUSER.password);
        await stran.goto("/veselice-pregled");
        await expect(stran.getByText(ime).first()).toBeVisible();

        await stran.goto("/veselice");
        await expectToast(stran, "Nimate dostopa do te strani.");
        await expect(stran).toHaveURL(/\/uporabnik$/);
      } finally {
        await kontekst.close();
      }
    });
  });

  test("variacija: največ udeležencev = 0 pomeni brez omejitve", async () => {
    const ime = uniqueName("Veselica brez omejitve");
    const r = await http("POST", `${URLS.user}/veselice`, {
      token: adminToken,
      json: { cas: new Date(Date.now() + 86_400_000).toISOString(), lokacija: "Celje", ime_veselice: ime, max_udelezencev: 0 },
    });
    expect(r.status).toBe(200);
    ustvarjene.push(r.body.id);
    expect(r.body.max_udelezencev).toBe(0);
  });

  test("variacija: izpuščena starostna omejitev je privzeto 18", async () => {
    const ime = uniqueName("Veselica privzeta starost");
    const r = await http("POST", `${URLS.user}/veselice`, {
      token: adminToken,
      json: { cas: new Date(Date.now() + 86_400_000).toISOString(), lokacija: "Koper", ime_veselice: ime },
    });
    expect(r.status).toBe(200);
    ustvarjene.push(r.body.id);
    expect(r.body.starost_za_vstop).toBe(18);
  });

  test("negativno: navaden uporabnik ne more ustvariti veselice", async () => {
    const { token } = await loginTestUser();
    const r = await http("POST", `${URLS.user}/veselice`, {
      token,
      json: { cas: new Date(Date.now() + 86_400_000).toISOString(), lokacija: "Kranj", ime_veselice: "Nedovoljeno" },
    });
    expect(r.status).toBe(403);
  });

  test("negativno: brez žetona je ustvarjanje zavrnjeno", async () => {
    const r = await http("POST", `${URLS.user}/veselice`, {
      json: { cas: new Date(Date.now() + 86_400_000).toISOString(), lokacija: "Kranj", ime_veselice: "Brez žetona" },
    });
    expect(r.status).toBe(401);
  });
});
