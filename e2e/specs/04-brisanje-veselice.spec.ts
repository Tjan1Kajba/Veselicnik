import { test, expect } from "@playwright/test";
import {
  ADMIN,
  TESTUSER,
  URLS,
  cleanupVeselice,
  createVeselica,
  deleteVeselica,
  ensureTestUser,
  getVeselica,
  http,
  loginAdmin,
  loginTestUser,
  prijavaNaVeselico,
  uniqueName,
} from "../helpers/api";
import { expectToast, loginUi } from "../helpers/ui";

test.describe("TC-VESELICA-101: Brisanje veselice", () => {
  let adminToken: string;
  const zaCiscenje: string[] = [];

  test.beforeAll(async () => {
    await ensureTestUser();
    adminToken = (await loginAdmin()).token;
  });

  test.afterAll(async () => {
    await cleanupVeselice(adminToken, zaCiscenje);
  });

  test("glavni scenarij: administrator izbriše veselico A, kontrolna veselica C ostane", async ({ page }) => {
    const A = await createVeselica(adminToken, { ime_veselice: uniqueName("Veselica A za brisanje") });
    const C = await createVeselica(adminToken, { ime_veselice: uniqueName("Veselica C kontrolna") });
    zaCiscenje.push(A.id, C.id);

    await test.step("1. Prijava kot admin, na /veselice sta veselici A in C", async () => {
      await loginUi(page, ADMIN.username, ADMIN.password);
      await page.goto("/veselice");
      await expect(page.getByRole("heading", { name: A.ime })).toBeVisible();
      await expect(page.getByRole("heading", { name: C.ime })).toBeVisible();
    });

    await test.step("2. Klik na brisanje pri veselici A (potrditev) pošlje DELETE /veselice/{id}", async () => {
      page.once("dialog", (dialog) => dialog.accept());
      const gumb = page
        .getByRole("heading", { name: A.ime })
        .locator("..")
        .getByTitle("Izbriši veselico");
      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().endsWith(`/veselice/${A.id}`) && r.request().method() === "DELETE"
        ),
        gumb.click(),
      ]);
      expect(res.status()).toBe(200);
    });

    await test.step("3. Obvestilo o uspehu, veselice A ni več, C je še vedno prisotna", async () => {
      await expectToast(page, "Veselica uspešno izbrisana!");
      await expect(page.getByRole("heading", { name: A.ime })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: C.ime })).toBeVisible();
    });

    await test.step("4. GET /veselice/{id_A} vrne zavrnitev (veselica ne obstaja)", async () => {
      const r = await getVeselica(adminToken, A.id);
      expect(r.status).toBe(404);
      expect(r.body.detail).toBe("Veselica ne obstaja");
    });

    await test.step("5. Navaden uporabnik na seznamu veselice A ne vidi, C vidi", async () => {
      const { token } = await loginTestUser();
      const r = await http("GET", `${URLS.user}/veselice`, { token });
      expect(r.status).toBe(200);
      const ids = r.body.map((v: any) => v.id);
      expect(ids).not.toContain(A.id);
      expect(ids).toContain(C.id);
    });

    await test.step("6. Ponovno brisanje A je zavrnjeno brez napake strežnika", async () => {
      const r = await deleteVeselica(adminToken, A.id);
      expect(r.status).toBe(404);
      expect(r.status).toBeLessThan(500);
    });
  });

  test("variacija: brisanje veselice z že prijavljenim udeležencem", async () => {
    const B = await createVeselica(adminToken, { ime_veselice: uniqueName("Veselica z udeležencem") });
    zaCiscenje.push(B.id);
    const { token, user } = await loginTestUser();

    const prijava = await prijavaNaVeselico(token, B.id);
    expect(prijava.status).toBe(200);

    const r = await deleteVeselica(adminToken, B.id);
    expect(r.status).toBe(200);
    expect(r.body.veselica.id).toBe(B.id);
    expect((await getVeselica(adminToken, B.id)).status).toBe(404);

    // Odprto vprašanje iz scenarija: dokumentacija ne opisuje posledic za povezane podatke.
    // Dejansko stanje zabeležimo v poročilo, test ga ne vsiljuje.
    const profil = await http("GET", `${URLS.user}/uporabnik/prijavljen`, { token });
    test.info().annotations.push({
      type: "dejansko stanje",
      description: `id_veselica uporabnika ${user.uporabnisko_ime} po brisanju: ${profil.body?.user?.id_veselica ?? "null"}`,
    });
    expect(profil.status).toBe(200);
  });

  test("negativno: navaden uporabnik ne more izbrisati veselice", async () => {
    const V = await createVeselica(adminToken, { ime_veselice: uniqueName("Veselica zaščitena") });
    zaCiscenje.push(V.id);
    const { token } = await loginTestUser();

    const r = await http("DELETE", `${URLS.user}/veselice/${V.id}`, { token });
    expect(r.status).toBe(403);
    expect((await getVeselica(adminToken, V.id)).status).toBe(200);
  });

  test("negativno: brisanje brez žetona je zavrnjeno", async () => {
    const V = await createVeselica(adminToken, { ime_veselice: uniqueName("Veselica brez žetona") });
    zaCiscenje.push(V.id);

    const r = await http("DELETE", `${URLS.user}/veselice/${V.id}`);
    expect(r.status).toBe(401);
    expect((await getVeselica(adminToken, V.id)).status).toBe(200);
  });
});
