# Avtomatizirani testi Veseličnik (Playwright)

Testne skripte za pet glavnih scenarijev iz dokumenta *Testni primeri (glavni scenariji)*.
Skripte kombinirajo teste v brskalniku (UI) in neposredne klice API-jev.

| Datoteka | Scenarij |
|---|---|
| `specs/01-prijava.spec.ts` | TC-PRIJAVA-001 Prijava uporabnika |
| `specs/02-ustvarjanje-veselice.spec.ts` | TC-VESELICA-001 Ustvarjanje veselice |
| `specs/03-glasbena-zelja.spec.ts` | TC-GLASBA-001 Oddaja glasbene želje |
| `specs/04-brisanje-veselice.spec.ts` | TC-VESELICA-101 Brisanje veselice |
| `specs/05-najden-predmet.spec.ts` | TC-NAJDENO-001 Dodajanje najdenega predmeta |

## Zagon

1. V korenu projekta zaženite sistem: `docker compose up -d --build`.
2. V mapi `e2e`:

```bash
npm install
npx playwright install chromium
npm test                 # vsi testi
npx playwright test specs/01-prijava.spec.ts   # en scenarij
npm run test:headed      # z vidnim brskalnikom
npm run report           # HTML poročilo
```

## Nastavitve (neobvezne spremenljivke okolja)

`FRONTEND_URL` (3000), `USER_URL` (8002), `FOOD_URL` (8001), `MUSIC_URL` (8004),
`SRECKE_URL` (9001), `IZGUBLJENI_URL` (9000), `ADMIN_PASSWORD` (privzeto `admin`).

## Podatki in čiščenje

- Testni uporabnik `testuser1` / `Geslo123` (in `testuser2` v scenariju 5) se ustvari ob prvem zagonu.
- Veselice, glasbene želje, najdeni predmeti in jedi imajo unikatna imena in se po testih izbrišejo prek API-ja.
  Skripte nikoli ne kličejo `DELETE /music/requests`, ki izbriše vse želje.
- Testi tečejo zaporedno (en delavec), ker si delijo bazo.

## Opombe

- Vmesnik glasbeno željo odda samo ob nakupu srečke (`POST /ticketsAndMusicRequest`), ki nato pokliče
  `POST /music/requests`. Scenarij 3 zato uporablja ta tok, `POST /music/requests` pa preverja posebej prek API-ja.
- Obrazec za najdeni predmet v vmesniku vedno pokliče `POST /foundAndOrderFood`. Glavni klic `POST /found`
  iz scenarija 5 je zato izveden prek API-ja, sestavljeni klic pa prek vmesnika kot variacija.
- Po brisanju veselice z udeležencem skripta samo zabeleži dejansko stanje (odprto vprašanje iz scenarija).
