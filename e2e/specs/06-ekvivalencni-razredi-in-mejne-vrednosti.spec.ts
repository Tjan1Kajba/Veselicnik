import { test, expect } from "@playwright/test";
import {
  ADMIN,
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
import { expectToast, field, loginUi, openVeselica } from "../helpers/ui";

/*
 * Črna škatla: particioniranje na ekvivalenčne razrede in analiza mejnih vrednosti.
 *
 * Iz dokumentacije izhajata samo dve pravili: pri "največ prijavljenih" 0 pomeni brez omejitve,
 * privzeta starostna omejitev je 18. Vse ostale meje so PREDPOSTAVKE (P) iz analize testnih primerov:
 *   - največ prijavljenih: celo število 0-1000
 *   - minimalna starost: celo število 0-99
 *   - ime veselice in besedilna polja: 1-100 znakov, samo presledki niso veljavni
 * Zaledje teh meja (zaenkrat) ne uveljavlja (preverja samo tip podatka). Primeri, ki to pravilo
 * preverjajo, so zato označeni kot "pričakovano neuspešni" (test.fail). Ko razvijalci mejo uveljavijo,
 * test javi "nepričakovano uspešen" in oznako je treba odstraniti.
 */

const dolg = (n: number, znak = "A") => znak.repeat(n);

type Primer = {
  naziv: string;
  vrednost: unknown;
  ok: boolean; // ali specifikacija vrednost sprejme
  p?: boolean; // pravilo je predpostavka, ki ga zaledje ne uveljavlja
};

// ---------------------------------------------------------------------------
// TC-VESELICA-001: številski in besedilni vnosi pri ustvarjanju veselice
// ---------------------------------------------------------------------------
test.describe("TC-VESELICA-001: ekvivalenčni razredi in mejne vrednosti", () => {
  let adminToken: string;
  const ustvarjene: string[] = [];

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
  });
  test.afterAll(async () => {
    await cleanupVeselice(adminToken, ustvarjene);
  });

  async function ustvari(polja: Record<string, unknown>) {
    const r = await http("POST", `${URLS.user}/veselice`, {
      token: adminToken,
      json: {
        cas: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        lokacija: "Maribor",
        ime_veselice: uniqueName("EC"),
        ...polja,
      },
    });
    if (r.status === 200 && r.body?.id) ustvarjene.push(r.body.id);
    return r;
  }

  /** Preveri sprejem ali zavrnitev, zavrnitev mora biti 4xx (nikoli 5xx). */
  function preveri(r: { status: number; body: any }, p: Primer, polje: string) {
    if (p.p) test.fail(true, `Pravilo (P) ni uveljavljeno v zaledju: ${p.naziv}`);
    if (p.ok) {
      expect(r.status, `${p.naziv} mora biti sprejeto`).toBe(200);
      expect(r.body[polje]).toBe(p.vrednost);
    } else {
      expect(r.status, `${p.naziv} ne sme povzročiti napake strežnika`).toBeLessThan(500);
      expect(r.status, `${p.naziv} mora biti zavrnjeno`).toBeGreaterThanOrEqual(400);
    }
  }

  // A) Maksimalno število prijavljenih: EC1-EC7, meje 0/1 in 1000/1001
  const maxPrimeri: Primer[] = [
    { naziv: "EC1 negativno (-5)", vrednost: -5, ok: false, p: true },
    { naziv: "meja pod 0 (-1)", vrednost: -1, ok: false, p: true },
    { naziv: "EC2/meja 0 (brez omejitve)", vrednost: 0, ok: true },
    { naziv: "meja 1", vrednost: 1, ok: true },
    { naziv: "EC3 tipična vrednost (100)", vrednost: 100, ok: true },
    { naziv: "meja 999", vrednost: 999, ok: true },
    { naziv: "meja 1000", vrednost: 1000, ok: true },
    { naziv: "meja 1001", vrednost: 1001, ok: false, p: true },
    { naziv: "EC4 nad zgornjo mejo (5000)", vrednost: 5000, ok: false, p: true },
    { naziv: "EC5 decimalno (12,5)", vrednost: 12.5, ok: false },
    { naziv: "EC6 neštevilsko (abc)", vrednost: "abc", ok: false },
  ];
  for (const p of maxPrimeri) {
    test(`max prijavljenih: ${p.naziv}`, async () => {
      const r = await ustvari({ max_udelezencev: p.vrednost });
      preveri(r, p, "max_udelezencev");
    });
  }

  test("max prijavljenih: EC7 izpuščeno polje je brez omejitve (0)", async () => {
    const r = await ustvari({});
    expect(r.status).toBe(200);
    expect(r.body.max_udelezencev).toBe(0);
  });

  test("max prijavljenih = 1: druga prijava je zavrnjena (veselica je polna)", async () => {
    const r = await ustvari({ max_udelezencev: 1 });
    expect(r.status).toBe(200);
    const uporabnik = await loginTestUser();
    expect((await prijavaNaVeselico(uporabnik.token, r.body.id)).status).toBe(200);
    const drugi = await http("POST", `${URLS.user}/uporabnik/registracija`, {
      json: { uporabnisko_ime: "testuser2", email: "testuser2@test.si", geslo: "Geslo123" },
    });
    expect([200, 400]).toContain(drugi.status);
    const t2 = (
      await http("POST", `${URLS.user}/uporabnik/prijava`, {
        json: { uporabnisko_ime_ali_email: "testuser2", geslo: "Geslo123" },
      })
    ).body.access_token;
    const polna = await prijavaNaVeselico(t2, r.body.id);
    expect(polna.status).toBe(400);
    expect(JSON.stringify(polna.body)).toContain("polna");
  });

  test("max prijavljenih = 0: veliko prijav ni omejenih (brez zapisa N / največ)", async () => {
    const r = await ustvari({ max_udelezencev: 0 });
    expect(r.status).toBe(200);
    const uporabnik = await loginTestUser();
    expect((await prijavaNaVeselico(uporabnik.token, r.body.id)).status).toBe(200);
  });

  // B) Minimalna starost: EC1-EC6, meje 0/1, 17/18/19, 99/100
  const starostPrimeri: Primer[] = [
    { naziv: "EC1 negativno (-3)", vrednost: -3, ok: false, p: true },
    { naziv: "meja pod 0 (-1)", vrednost: -1, ok: false, p: true },
    { naziv: "meja 0", vrednost: 0, ok: true },
    { naziv: "meja 1", vrednost: 1, ok: true },
    { naziv: "EC2 mladoletni (10)", vrednost: 10, ok: true },
    { naziv: "meja 17", vrednost: 17, ok: true },
    { naziv: "EC3/meja 18 (privzeto)", vrednost: 18, ok: true },
    { naziv: "meja 19", vrednost: 19, ok: true },
    { naziv: "EC4 (21)", vrednost: 21, ok: true },
    { naziv: "meja 98", vrednost: 98, ok: true },
    { naziv: "meja 99", vrednost: 99, ok: true },
    { naziv: "meja 100", vrednost: 100, ok: false, p: true },
    { naziv: "EC5 nad zgornjo mejo (150)", vrednost: 150, ok: false, p: true },
    { naziv: "EC6 decimalno (17,5)", vrednost: 17.5, ok: false },
    { naziv: "EC6 neštevilsko (abc)", vrednost: "abc", ok: false },
  ];
  for (const p of starostPrimeri) {
    test(`minimalna starost: ${p.naziv}`, async () => {
      const r = await ustvari({ starost_za_vstop: p.vrednost });
      preveri(r, p, "starost_za_vstop");
    });
  }

  test("minimalna starost: izpuščeno polje uporabi privzeto vrednost 18", async () => {
    const r = await ustvari({});
    expect(r.status).toBe(200);
    expect(r.body.starost_za_vstop).toBe(18);
  });

  // C) Ime veselice (besedilo)
  const imePrimeri: Primer[] = [
    { naziv: "prazno ime", vrednost: "", ok: false, p: true },
    { naziv: "samo presledki", vrednost: "   ", ok: false, p: true },
    { naziv: "meja 1 znak", vrednost: "A", ok: true },
    { naziv: "meja 100 znakov", vrednost: dolg(100), ok: true },
    { naziv: "meja 101 znakov", vrednost: dolg(101), ok: false, p: true },
    { naziv: "posebni znaki in šumniki", vrednost: "Čaj & šola <b>", ok: true },
  ];
  for (const p of imePrimeri) {
    test(`ime veselice: ${p.naziv}`, async () => {
      const r = await ustvari({ ime_veselice: p.vrednost });
      preveri(r, p, "ime_veselice");
    });
  }

  // UI: brskalnik sam preveri obvezna polja in spodnjo mejo števil (min="0")
  test("UI: prazno obvezno polje in negativno število ne pošljeta zahteve", async ({ page }) => {
    await loginUi(page, ADMIN.username, ADMIN.password);
    await page.goto("/veselice");
    await page.getByRole("button", { name: /Nova veselica/ }).click();

    let poslano = 0;
    page.on("request", (rq) => {
      if (rq.url().endsWith("/veselice") && rq.method() === "POST") poslano++;
    });

    // prazno ime: obrazec se ne sme poslati
    await page.getByRole("button", { name: /Ustvari veselico/ }).click();
    expect(await page.getByPlaceholder("npr. Novoletska zabava 2025").evaluate((e: HTMLInputElement) => e.validity.valueMissing)).toBe(true);

    // izpolni obvezna polja, nato mejna vrednost -1
    await page.getByPlaceholder("npr. Novoletska zabava 2025").fill(uniqueName("Meja UI"));
    await field(page, "Datum in ura").locator("input").fill("2026-12-20T20:00");
    await page.getByPlaceholder("npr. Ljubljana, Kongresni trg 1").fill("Celje");
    const max = page.getByPlaceholder("0 = brez omejitve");
    await max.fill("-1");
    await page.getByRole("button", { name: /Ustvari veselico/ }).click();
    expect(await max.evaluate((e: HTMLInputElement) => e.validity.rangeUnderflow)).toBe(true);
    expect(poslano, "zahteva ne sme biti poslana").toBe(0);

    // meja 0 je sprejeta
    await max.fill("0");
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/veselice") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Ustvari veselico/ }).click(),
    ]);
    expect(res.status()).toBe(200);
    const telo = await res.json();
    ustvarjene.push(telo.id);
    expect(telo.max_udelezencev).toBe(0);
    await expectToast(page, "Veselica uspešno ustvarjena!");
  });
});

// ---------------------------------------------------------------------------
// TC-PRIJAVA-001: ekvivalenčni razredi in mejne vrednosti pri prijavi
// ---------------------------------------------------------------------------
test.describe("TC-PRIJAVA-001: ekvivalenčni razredi in mejne vrednosti", () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  const prijava = (up: unknown, geslo: unknown) =>
    http("POST", `${URLS.user}/uporabnik/prijava`, {
      json: { uporabnisko_ime_ali_email: up, geslo },
    });

  const veljavni = [
    { naziv: "EC1 uporabniško ime + pravilno geslo", up: TESTUSER.username },
    { naziv: "EC2 e-pošta + pravilno geslo", up: TESTUSER.email },
  ];
  for (const p of veljavni) {
    test(`veljavno: ${p.naziv}`, async () => {
      const r = await prijava(p.up, TESTUSER.password);
      expect(r.status).toBe(200);
      expect(r.body.access_token).toBeTruthy();
    });
  }

  const neveljavni: { naziv: string; up: unknown; geslo: unknown }[] = [
    { naziv: "EC3 napačno geslo", up: TESTUSER.username, geslo: "Napacno1" },
    { naziv: "EC4 neobstoječ uporabnik", up: "ni_takega_uporabnika", geslo: TESTUSER.password },
    { naziv: "EC5 prazno uporabniško ime", up: "", geslo: TESTUSER.password },
    { naziv: "EC6 prazno geslo", up: TESTUSER.username, geslo: "" },
    { naziv: "EC7 obe polji prazni", up: "", geslo: "" },
    { naziv: "EC8 drugačna velikost črk (TESTUSER1)", up: "TESTUSER1", geslo: TESTUSER.password },
    { naziv: "meja: geslo 1 znak", up: TESTUSER.username, geslo: "G" },
    { naziv: "meja: geslo 200 znakov", up: TESTUSER.username, geslo: dolg(200, "g") },
    { naziv: "geslo s presledkom na koncu", up: TESTUSER.username, geslo: `${TESTUSER.password} ` },
    { naziv: "vstavljanje SQL (' OR '1'='1)", up: "' OR '1'='1", geslo: "' OR '1'='1" },
  ];
  for (const p of neveljavni) {
    test(`zavrnjeno: ${p.naziv}`, async () => {
      const r = await prijava(p.up, p.geslo);
      expect(r.status, "napačni podatki dajo 401, ne napake strežnika").toBe(401);
      expect(JSON.stringify(r.body)).not.toContain("access_token");
    });
  }

  test("zavrnjeno: objekt namesto niza (NoSQL vbrizg) ni 5xx in ne prijavi", async () => {
    const r = await prijava({ $ne: null }, { $ne: null });
    expect(r.status).toBe(422);
    expect(JSON.stringify(r.body)).not.toContain("access_token");
  });

  test("UI: prazni polji ne pošljeta zahteve (obvezni polji)", async ({ page }) => {
    let poslano = 0;
    page.on("request", (rq) => {
      if (rq.url().endsWith("/uporabnik/prijava") && rq.method() === "POST") poslano++;
    });
    await page.goto("/login");
    await page.locator("form button[type=submit]").click();
    expect(await page.locator("#usernameOrEmail").evaluate((e: HTMLInputElement) => e.validity.valueMissing)).toBe(true);

    await page.locator("#usernameOrEmail").fill(TESTUSER.username);
    await page.locator("form button[type=submit]").click();
    expect(await page.locator("#password").evaluate((e: HTMLInputElement) => e.validity.valueMissing)).toBe(true);
    expect(poslano).toBe(0);
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ---------------------------------------------------------------------------
// TC-GLASBA-001: ekvivalenčni razredi in mejne vrednosti pri srečki z glasbeno željo
// ---------------------------------------------------------------------------
test.describe("TC-GLASBA-001: ekvivalenčni razredi in mejne vrednosti", () => {
  let adminToken: string;
  let userToken: string;
  let veselica: { id: string; ime: string };
  const zelje: string[] = [];
  const srecke: string[] = [];

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
    userToken = (await loginTestUser()).token;
    veselica = await createVeselica(adminToken, { ime_veselice: uniqueName("EC glasba") });
    await prijavaNaVeselico(userToken, veselica.id); // 400 je v redu, če je že prijavljen
  });

  test.afterAll(async () => {
    for (const id of zelje) {
      await http("DELETE", `${URLS.music}/music/requests/${id}`, { token: userToken }).catch(() => undefined);
    }
    for (const id of srecke) {
      await http("DELETE", `${URLS.srecke}/tickets/${id}`, { token: userToken }).catch(() => undefined);
    }
    await cleanupVeselice(adminToken, [veselica.id]);
  });

  const kupi = async (songName: unknown, artist: unknown) => {
    const r = await http("POST", `${URLS.srecke}/ticketsAndMusicRequest`, {
      token: userToken,
      json: { veselica_id: veselica.id, songName, artist },
    });
    if (r.status === 201) {
      if (r.body?.musicRequestResponse?.id) zelje.push(r.body.musicRequestResponse.id);
      if (r.body?.ticket?._id) srecke.push(r.body.ticket._id);
    }
    return r;
  };

  const veljavni = [
    { naziv: "EC1 običajna vrednost", pesem: "Bela Ciganka", izvajalec: "Ansambel Lojzeta Slaka" },
    { naziv: "EC6 posebni znaki in šumniki", pesem: "Čebelica & Šmarnice", izvajalec: "Ž.Š." },
    { naziv: "EC7 samo številke", pesem: "99", izvajalec: "1234" },
    { naziv: "meja 1 znak", pesem: "A", izvajalec: "B" },
    { naziv: "meja 100 znakov", pesem: dolg(100), izvajalec: dolg(100, "B") },
  ];
  for (const p of veljavni) {
    test(`veljavno: ${p.naziv}`, async () => {
      const r = await kupi(p.pesem, p.izvajalec);
      expect(r.status).toBe(201);
      expect(r.body.ticket._id).toBeTruthy();
      expect(r.body.musicRequestResponse.id).toBeTruthy();
    });
  }

  const neveljavni: { naziv: string; pesem: unknown; izvajalec: unknown; p?: boolean }[] = [
    { naziv: "EC2 prazna pesem", pesem: "", izvajalec: "Queen" },
    { naziv: "EC3 prazen izvajalec", pesem: "Bohemian Rhapsody", izvajalec: "" },
    { naziv: "EC4 obe polji prazni", pesem: "", izvajalec: "" },
    { naziv: "EC5 samo presledki", pesem: "   ", izvajalec: "   ", p: true },
    { naziv: "meja 101 znakov (pesem)", pesem: dolg(101), izvajalec: "Queen", p: true },
    { naziv: "meja 101 znakov (izvajalec)", pesem: "Pesem", izvajalec: dolg(101), p: true },
  ];
  for (const p of neveljavni) {
    test(`zavrnjeno: ${p.naziv}`, async () => {
      if (p.p) test.fail(true, "Pravilo (P) ni uveljavljeno v zaledju (prazni presledki, dolžina)");
      const r = await kupi(p.pesem, p.izvajalec);
      expect(r.status).toBeLessThan(500);
      expect(r.status, `${p.naziv} mora biti zavrnjeno`).toBe(400);
    });
  }

  test("zavrnjena zahteva ne ustvari srečke (stanje se ne spremeni)", async () => {
    const pred = await http("GET", `${URLS.srecke}/tickets`, { token: userToken });
    const r = await kupi("", "");
    expect(r.status).toBe(400);
    const po = await http("GET", `${URLS.srecke}/tickets`, { token: userToken });
    expect(po.body.length).toBe(pred.body.length);
  });

  test("dvakrat ista pesem: zabeleži se dejansko stanje (specifikacija ne določa)", async () => {
    const ime = uniqueName("Podvojena pesem");
    const a = await kupi(ime, "Izvajalec");
    const b = await kupi(ime, "Izvajalec");
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const seznam = await http("GET", `${URLS.music}/music/requests/veselica/${veselica.id}`);
    const stevilo = seznam.body.filter((z: any) => z.song_name === ime).length;
    test.info().annotations.push({ type: "dejansko stanje", description: `želj z isto pesmijo: ${stevilo}` });
  });

  // UI: gumb "Kupi srečko" je neaktiven, dokler nista izpolnjeni obe polji
  test("UI: gumb je neaktiven pri praznem polju, presledkih in aktiven pri obeh izpolnjenih", async ({ page }) => {
    await loginUi(page, TESTUSER.username, TESTUSER.password);
    await page.goto("/veselice-pregled");
    await openVeselica(page, veselica.ime, veselica.id);
    await page.getByRole("button", { name: /Kupi srečko/ }).click();

    const pesem = page.getByPlaceholder("Ime pesmi");
    const izvajalec = page.getByPlaceholder("Izvajalec");
    const gumb = page.getByRole("button", { name: /Kupi srečko/ });

    await expect(gumb, "EC4 obe polji prazni").toBeDisabled();
    await pesem.fill("Bohemian Rhapsody");
    await expect(gumb, "EC3 prazen izvajalec").toBeDisabled();
    await pesem.fill("");
    await izvajalec.fill("Queen");
    await expect(gumb, "EC2 prazna pesem").toBeDisabled();
    await pesem.fill("   ");
    await izvajalec.fill("   ");
    await expect(gumb, "EC5 samo presledki").toBeDisabled();
    await pesem.fill("A");
    await izvajalec.fill("B");
    await expect(gumb, "meja 1 znak").toBeEnabled();
  });
});
