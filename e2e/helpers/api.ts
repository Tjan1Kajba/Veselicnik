// Pomožne funkcije za neposredne klice API-jev (priprava podatkov, preverjanje stanja, čiščenje).

export const URLS = {
  frontend: process.env.FRONTEND_URL ?? "http://localhost:3000",
  user: process.env.USER_URL ?? "http://localhost:8002",
  food: process.env.FOOD_URL ?? "http://localhost:8001",
  music: process.env.MUSIC_URL ?? "http://localhost:8004",
  srecke: process.env.SRECKE_URL ?? "http://localhost:9001",
  izgubljeni: process.env.IZGUBLJENI_URL ?? "http://localhost:9000",
};

export const ADMIN = {
  username: "admin",
  password: process.env.ADMIN_PASSWORD ?? "admin",
};

export const TESTUSER = {
  username: "testuser1",
  email: "testuser1@test.si",
  password: "Geslo123",
};

export interface ApiResult<T = any> {
  status: number;
  body: T;
}

export async function http<T = any>(
  method: string,
  url: string,
  opts: { token?: string; json?: unknown } = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* odgovor ni JSON */
  }
  return { status: res.status, body: parsed };
}

// ---------- uporabniki ----------

export async function login(username: string, password: string) {
  const r = await http("POST", `${URLS.user}/uporabnik/prijava`, {
    json: { uporabnisko_ime_ali_email: username, geslo: password },
  });
  if (r.status !== 200) {
    throw new Error(`Prijava ${username} ni uspela: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return { token: r.body.access_token as string, user: r.body.user as any };
}

/** Ustvari testnega uporabnika, če še ne obstaja (400 = že obstaja). */
export async function ensureTestUser() {
  const r = await http("POST", `${URLS.user}/uporabnik/registracija`, {
    json: {
      uporabnisko_ime: TESTUSER.username,
      email: TESTUSER.email,
      geslo: TESTUSER.password,
      ime: "Test",
      priimek: "Uporabnik",
    },
  });
  if (r.status !== 200 && r.status !== 400) {
    throw new Error(`Priprava testnega uporabnika ni uspela: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export const loginAdmin = () => login(ADMIN.username, ADMIN.password);
export const loginTestUser = () => login(TESTUSER.username, TESTUSER.password);

// ---------- veselice ----------

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/** Čas v prihodnosti v obliki, ki jo sprejme <input type="datetime-local">. */
export function futureLocal(days = 30) {
  const d = new Date(Date.now() + days * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function createVeselica(
  adminToken: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; ime: string }> {
  const ime = (overrides.ime_veselice as string) ?? uniqueName("Testna veselica");
  const r = await http("POST", `${URLS.user}/veselice`, {
    token: adminToken,
    json: {
      cas: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      lokacija: "Ljubljana",
      ime_veselice: ime,
      max_udelezencev: 0,
      starost_za_vstop: 18,
      opis_dogodka: "Samodejni test",
      ...overrides,
    },
  });
  if (r.status !== 200) {
    throw new Error(`Ustvarjanje veselice ni uspelo: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return { id: r.body.id as string, ime };
}

export const getVeselica = (token: string, id: string) =>
  http("GET", `${URLS.user}/veselice/${id}`, { token });

export const deleteVeselica = (adminToken: string, id: string) =>
  http("DELETE", `${URLS.user}/veselice/${id}`, { token: adminToken });

export const prijavaNaVeselico = (token: string, id: string) =>
  http("POST", `${URLS.user}/veselice/${id}/prijava`, { token });

export const odjavaZVeselice = (token: string, id: string) =>
  http("POST", `${URLS.user}/veselice/${id}/odjava`, { token });

/** Počisti veselice in ne pade, če katera ne obstaja več. */
export async function cleanupVeselice(adminToken: string, ids: string[]) {
  for (const id of ids) {
    await deleteVeselica(adminToken, id).catch(() => undefined);
  }
}
