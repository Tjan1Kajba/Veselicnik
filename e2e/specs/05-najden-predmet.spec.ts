import { test, expect } from "@playwright/test";
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
import { field, loginUi } from "../helpers/ui";

test.describe("TC-NAJDENO-001: Dodajanje najdenega predmeta", () => {
  let adminToken: string;
  let userToken: string;
  let veselica: { id: string; ime: string };
  let jed: { id: string; ime: string };
  const najdeniPredmeti: string[] = [];

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
    userToken = (await loginTestUser()).token;

    veselica = await createVeselica(adminToken, { ime_veselice: uniqueName("Veselica najdeno") });
    expect((await prijavaNaVeselico(userToken, veselica.id)).status).toBe(200);

    const ime = uniqueName("Klobasa z zeljem");
    const r = await http("POST", `${URLS.food}/menu`, {
      token: adminToken,
      json: { name: ime, description: "Testna jed", price: 6.5, available: true, veselica_id: veselica.id },
    });
    expect(r.status).toBe(200);
    jed = { id: r.body.id, ime };
  });

  test.afterAll(async () => {
    for (const id of najdeniPredmeti) {
      await http("DELETE", `${URLS.izgubljeni}/found/${id}`, { token: userToken }).catch(() => undefined);
    }
    await http("DELETE", `${URLS.food}/menu/${jed.id}`, { token: adminToken }).catch(() => undefined);
    await cleanupVeselice(adminToken, [veselica.id]);
  });

  test("glavni scenarij: uporabnik prijavi najden predmet (POST /found)", async ({ page }) => {
    const ime = uniqueName("Črna denarnica");
    const opis = "Usnjena denarnica, najdena pri glavnem vhodu.";
    let predmetId = "";

    await test.step("1. Prijava kot testuser1 in odprtje /izgubljeni-najdeni, stran se naloži", async () => {
      await loginUi(page, TESTUSER.username, TESTUSER.password);
      await page.goto("/izgubljeni-najdeni");
      await expect(page.getByText("Seznam predmetov")).toBeVisible();
      await expect(page.getByRole("button", { name: /Prijava najdbe/ })).toBeVisible();
    });

    await test.step("2-3. Prijava najdenega predmeta: POST /found vrne ID predmeta", async () => {
      // Obrazec v vmesniku pri najdbi vedno pokliče sestavljeni klic /foundAndOrderFood (glej variacijo),
      // zato glavni klic POST /found izvedemo neposredno z žetonom prijavljenega uporabnika.
      const r = await http("POST", `${URLS.izgubljeni}/found`, {
        token: userToken,
        json: { name: ime, description: opis, veselica_id: veselica.id },
      });
      expect(r.status).toBe(201);
      predmetId = r.body.foundItem._id;
      expect(predmetId).toBeTruthy();
      najdeniPredmeti.push(predmetId);
    });

    await test.step("4. Predmet je viden na seznamu v vmesniku", async () => {
      await page.reload();
      await page.getByText(ime).first().waitFor({ state: "visible" }).catch(async () => {
        // seznam najdenih je lahko za zavihkom; po potrebi preklopimo prikaz
        await page.getByRole("button", { name: /najden/i }).first().click();
      });
      await expect(page.getByText(ime).first()).toBeVisible();
    });

    await test.step("5. GET /found/{id}: podrobnosti ustrezajo vnosu, predmet je povezan z avtorjem", async () => {
      const r = await http("GET", `${URLS.izgubljeni}/found/${predmetId}`, { token: userToken });
      expect(r.status).toBe(200);
      expect(r.body.type).toBe("found");
      expect(r.body.name).toBe(ime);
      expect(r.body.description).toBe(opis);
      expect(r.body.veselica_id).toBe(veselica.id);
      const profil = await http("GET", `${URLS.user}/uporabnik/prijavljen`, { token: userToken });
      expect(r.body.user_id).toBe(profil.body.user.id);
    });

    await test.step("6. GET /found brez žetona je zavrnjen (dostop zahteva prijavo)", async () => {
      const r = await http("GET", `${URLS.izgubljeni}/found`);
      expect(r.status).toBe(401);
    });
  });

  test("variacija: sestavljeni klic POST /foundAndOrderFood prek vmesnika ustvari brezplačno naročilo", async ({ page }) => {
    const ime = uniqueName("Najdeni ključi");
    await loginUi(page, TESTUSER.username, TESTUSER.password);
    await page.goto("/izgubljeni-najdeni");
    await page.getByRole("button", { name: /Prijava najdbe/ }).click();

    await page.getByPlaceholder("npr. Denarnica").fill(ime);
    await field(page, "Na kateri veselici je bil predmet najden").locator("select").selectOption(veselica.id);
    await field(page, "Veselica za nagrado").locator("select").selectOption(veselica.id);
    await field(page, "Izberi hrano").locator("select").selectOption(jed.ime);
    await page.getByPlaceholder("Dodajte opis predmeta...").fill("Svežnja z dvema ključema");

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/foundAndOrderFood") && r.request().method() === "POST"
      ),
      page.getByRole("button", { name: /Dodaj predmet/ }).click(),
    ]);
    expect(res.status()).toBe(201);
    const telo = await res.json();
    najdeniPredmeti.push(telo.foundItem._id);
    expect(telo.foundItem.type).toBe("found");
    expect(telo.foodOrderResponse, "odgovor storitve za hrano").toBeTruthy();

    const naročila = await http("GET", `${URLS.food}/orders/user/${TESTUSER.username}`, { token: userToken });
    expect(naročila.status).toBe(200);
    const darilo = naročila.body.find((n: any) => n.id === telo.foodOrderResponse.id);
    expect(darilo, "naročilo za nagrado").toBeDefined();
    expect(darilo.status).toBe("Darilo");
    expect(darilo.paid).toBe(true);
    expect(darilo.id_veselica).toBe(veselica.id);
  });

  test("API: če naročilo hrane ne uspe, je najden predmet vseeno shranjen", async () => {
    const ime = uniqueName("Najdena kapa");
    const r = await http("POST", `${URLS.izgubljeni}/foundAndOrderFood`, {
      token: userToken,
      json: {
        name: ime,
        description: "Jed ne obstaja v meniju",
        userId: TESTUSER.username,
        veselica_id: veselica.id,
        food_name: "jed_ki_ne_obstaja_xyz",
      },
    });
    expect(r.status).toBe(201);
    najdeniPredmeti.push(r.body.foundItem._id);
    expect(r.body.foundItem.name).toBe(ime);
    expect(r.body.foodOrderResponse).toBeNull();
  });

  test("negativno: brez žetona najdenega predmeta ni mogoče prijaviti", async () => {
    const r = await http("POST", `${URLS.izgubljeni}/found`, {
      json: { name: "Brez žetona", description: "x", veselica_id: veselica.id },
    });
    expect(r.status).toBe(401);
  });

  test("negativno: tuj uporabnik ne more izbrisati najdenega predmeta", async () => {
    const lastnik = await http("POST", `${URLS.izgubljeni}/found`, {
      token: userToken,
      json: { name: uniqueName("Zaščiten predmet"), description: "x", veselica_id: veselica.id },
    });
    expect(lastnik.status).toBe(201);
    najdeniPredmeti.push(lastnik.body.foundItem._id);

    const tujec = await http("POST", `${URLS.user}/uporabnik/registracija`, {
      json: { uporabnisko_ime: "testuser2", email: "testuser2@test.si", geslo: "Geslo123" },
    });
    expect([200, 400]).toContain(tujec.status);
    const tujToken = (await http("POST", `${URLS.user}/uporabnik/prijava`, {
      json: { uporabnisko_ime_ali_email: "testuser2", geslo: "Geslo123" },
    })).body.access_token;

    const r = await http("DELETE", `${URLS.izgubljeni}/found/${lastnik.body.foundItem._id}`, { token: tujToken });
    expect(r.status).toBe(403);
  });
});
