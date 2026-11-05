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
} from "../helpers/api";
import { expectToast, loginUi, openVeselica } from "../helpers/ui";

const SKLADBA = "Bela Ciganka";
const IZVAJALEC = "Ansambel Lojzeta Slaka";

test.describe("TC-GLASBA-001: Oddaja glasbene želje", () => {
  let adminToken: string;
  let veselica: { id: string; ime: string };
  let drugaVeselica: { id: string; ime: string };
  const ustvarjeneZelje: string[] = [];

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
    veselica = await createVeselica(adminToken, { ime_veselice: `Poletna veselica glasba ${Date.now()}` });
    drugaVeselica = await createVeselica(adminToken, { ime_veselice: `Druga veselica glasba ${Date.now()}` });
  });

  test.afterAll(async () => {
    const { token } = await loginTestUser();
    for (const id of ustvarjeneZelje) {
      await http("DELETE", `${URLS.music}/music/requests/${id}`, { token }).catch(() => undefined);
    }
    await cleanupVeselice(adminToken, [veselica.id, drugaVeselica.id]);
  });

  test("glavni scenarij: uporabnik odda glasbeno željo (prek nakupa srečke) in je javno vidna", async ({ page }) => {
    // Vmesnik glasbeno željo odda samo ob nakupu srečke (POST /ticketsAndMusicRequest),
    // ta pa na music-service pošlje POST /music/requests.
    await test.step("1. Prijava kot testuser1, izbira veselice na /veselice-pregled", async () => {
      await loginUi(page, TESTUSER.username, TESTUSER.password);
      await page.goto("/veselice-pregled");
      await openVeselica(page, veselica.ime, veselica.id);
      await expect(page).toHaveURL(new RegExp(`/veselice/${veselica.id}$`));
    });

    await test.step("Predpogoj: prijava na veselico", async () => {
      await page.getByRole("button", { name: /Prijavi se na veselico/ }).click();
      await expectToast(page, "Uspešno ste se prijavili na veselico!");
    });

    await test.step("2. Vnos skladbe in izvajalca v razdelku za glasbeno željo", async () => {
      await page.getByRole("button", { name: /Kupi srečko/ }).click();
      await page.getByPlaceholder("Ime pesmi").fill(SKLADBA);
      await page.getByPlaceholder("Izvajalec").fill(IZVAJALEC);
      await expect(page.getByRole("button", { name: /Kupi srečko/ })).toBeEnabled();
    });

    await test.step("3. Potrditev: POST /ticketsAndMusicRequest uspe in vrne ID želje", async () => {
      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/ticketsAndMusicRequest") && r.request().method() === "POST"
        ),
        page.getByRole("button", { name: /Kupi srečko/ }).click(),
      ]);
      expect(res.status()).toBe(201);
      const telo = await res.json();
      expect(telo.ticket._id).toBeTruthy();
      expect(telo.musicRequestResponse.id).toBeTruthy();
      ustvarjeneZelje.push(telo.musicRequestResponse.id);
    });

    await test.step("4. Obvestilo o uspehu in želja je vidna na strani veselice", async () => {
      await expectToast(page, "Srečka in glasbena želja uspešno ustvarjeni!");
      await expect(page.getByText(SKLADBA).first()).toBeVisible();
      await expect(page.getByText(IZVAJALEC).first()).toBeVisible();
    });

    await test.step("5. GET /music/requests/veselica/{id} brez žetona vsebuje novo željo", async () => {
      const r = await http("GET", `${URLS.music}/music/requests/veselica/${veselica.id}`);
      expect(r.status).toBe(200);
      const zelja = r.body.find((z: any) => z.song_name === SKLADBA);
      expect(zelja, "nova želja na seznamu").toBeDefined();
      expect(zelja.artist).toBe(IZVAJALEC);
      expect(zelja.id_veselica).toBe(veselica.id);
      expect(zelja.user_id).toBe(TESTUSER.username);
      expect(zelja.votes).toBe(0);
    });

    await test.step("6. Isti klic za drugo veselico nove želje ne vrne", async () => {
      const r = await http("GET", `${URLS.music}/music/requests/veselica/${drugaVeselica.id}`);
      expect(r.status).toBe(200);
      expect(r.body.some((z: any) => z.song_name === SKLADBA)).toBe(false);
    });
  });

  test("API: POST /music/requests z žetonom ustvari željo", async () => {
    const { token } = await loginTestUser();
    const r = await http("POST", `${URLS.music}/music/requests`, {
      token,
      json: { song_name: "Zlati zvonovi", artist: "Avsenik", id_veselica: veselica.id },
    });
    expect(r.status).toBe(200);
    expect(r.body.id).toBeTruthy();
    expect(r.body.id_veselica).toBe(veselica.id);
    ustvarjeneZelje.push(r.body.id);

    const seznam = await http("GET", `${URLS.music}/music/requests/veselica/${veselica.id}`);
    expect(seznam.body.some((z: any) => z.id === r.body.id)).toBe(true);
  });

  test("negativno: oddaja brez žetona je zavrnjena", async () => {
    const r = await http("POST", `${URLS.music}/music/requests`, {
      json: { song_name: "Brez žetona", artist: "X", id_veselica: veselica.id },
    });
    expect([401, 403]).toContain(r.status);
  });

  test("negativno: manjkajoče ime skladbe je zavrnjeno (422)", async () => {
    const { token } = await loginTestUser();
    const r = await http("POST", `${URLS.music}/music/requests`, {
      token,
      json: { artist: "Samo izvajalec", id_veselica: veselica.id },
    });
    expect(r.status).toBe(422);
  });

  test("variacija: več želj istega uporabnika", async () => {
    const { token } = await loginTestUser();
    for (const naslov of ["Pesem A", "Pesem B"]) {
      const r = await http("POST", `${URLS.music}/music/requests`, {
        token,
        json: { song_name: naslov, artist: "Izvajalec", id_veselica: drugaVeselica.id },
      });
      expect(r.status).toBe(200);
      ustvarjeneZelje.push(r.body.id);
    }
    const seznam = await http("GET", `${URLS.music}/music/requests/veselica/${drugaVeselica.id}`);
    const imena = seznam.body.map((z: any) => z.song_name);
    expect(imena).toEqual(expect.arrayContaining(["Pesem A", "Pesem B"]));
  });
});
