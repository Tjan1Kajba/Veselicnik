# Veseličnik – dokumentacija avtomatiziranih testov

Dokument opisuje avtomatizirane teste v mapi `e2e/` (Playwright, TypeScript): kaj pokrivajo, kako se zaženejo, katere vrednosti vnašajo in kaj pričakujejo. Posebej so opisani ekvivalenčni razredi in mejne vrednosti vhodnih podatkov.

## Kazalo

1. [Pregled](#1-pregled)
2. [Zagon in poročilo](#2-zagon-in-poročilo)
3. [Struktura projekta](#3-struktura-projekta)
4. [Glavni scenariji (datoteke 01–05)](#4-glavni-scenariji-datoteke-0105)
5. [Pravila vnosa](#5-pravila-vnosa)
6. [Ekvivalenčni razredi](#6-ekvivalenčni-razredi)
7. [Mejne vrednosti](#7-mejne-vrednosti)
8. [Sledljivost](#8-sledljivost)
9. [Podatki in čiščenje](#9-podatki-in-čiščenje)
10. [Znane omejitve testov](#10-znane-omejitve-testov)

---

## 1. Pregled

| Podatek | Vrednost |
|---|---|
| Orodje | Playwright (`@playwright/test`), brskalnik Chromium |
| Jezik | TypeScript |
| Vrsta testov | funkcionalni, črna škatla; kombinacija UI (brskalnik) in neposrednih klicev API |
| Število testov | 91 v 6 datotekah (po izpisu `npx playwright test --list`) |
| Izvajanje | zaporedno, en delavec (testi si delijo bazo) |
| Preizkušani sistem | frontend `http://localhost:3000` in storitve na vratih 8001, 8002, 8004, 9000, 9001 |

Testi izhajajo iz dokumenta *Testni primeri (glavni scenariji)* in iz `dokumentacija.md`.

## 2. Zagon in poročilo

Predpogoj: sistem je zagnan in zgrajen s trenutno kodo.

```bash
# v korenu projekta
docker compose up -d --build

# v mapi e2e
cd e2e
npm install
npx playwright install chromium
npm test                                           # vsi testi
npx playwright test specs/06-ekvivalencni-razredi-in-mejne-vrednosti.spec.ts   # ena datoteka
npm run test:headed                                # z vidnim brskalnikom
npm run report                                     # odpre HTML poročilo
```

**Poročilo:** med izvajanjem se v terminalu izpisuje seznam testov (`list`). Po koncu nastane HTML poročilo v `e2e/playwright-report/`. Vsebuje rezultate, trajanje, korake (`test.step`), pri neuspešnih testih posnetek zaslona in sled (trace) ter oznake (annotations) z dejanskim stanjem.

**Neobvezne spremenljivke okolja:** `FRONTEND_URL` (3000), `USER_URL` (8002), `FOOD_URL` (8001), `MUSIC_URL` (8004), `SRECKE_URL` (9001), `IZGUBLJENI_URL` (9000), `ADMIN_PASSWORD` (privzeto `admin`).

**Testni računi:** administrator `admin` / `admin`, navaden uporabnik `testuser1` / `Geslo123` (ustvari se ob prvem zagonu), `testuser2` / `Geslo123` (samo za negativne teste).

## 3. Struktura projekta

| Pot | Vsebina |
|---|---|
| `playwright.config.ts` | nastavitve: 1 delavec, časovna omejitev 60 s, poročevalca `list` in `html`, posnetek zaslona in sled ob neuspehu |
| `helpers/api.ts` | naslovi storitev, testni računi, `http()`, prijava, ustvarjanje in brisanje veselic, prijava na veselico, čiščenje |
| `helpers/ui.ts` | prijava prek obrazca, iskanje polj po oznaki, preverjanje obvestil (Toastify), odpiranje veselice |
| `specs/01-prijava.spec.ts` | TC-PRIJAVA-001 |
| `specs/02-ustvarjanje-veselice.spec.ts` | TC-VESELICA-001 |
| `specs/03-glasbena-zelja.spec.ts` | TC-GLASBA-001 |
| `specs/04-brisanje-veselice.spec.ts` | TC-VESELICA-101 |
| `specs/05-narocanje-hrane.spec.ts` | TC-HRANA-001 |
| `specs/06-ekvivalencni-razredi-in-mejne-vrednosti.spec.ts` | ekvivalenčni razredi in mejne vrednosti za TC-VESELICA-001, TC-PRIJAVA-001 in TC-GLASBA-001 |

## 4. Glavni scenariji (datoteke 01–05)

Vsak scenarij ima glavni test po korakih iz PDF-ja ter variacije in negativne teste.

| Datoteka | Scenarij | Glavni tok | Variacije in negativni testi |
|---|---|---|---|
| 01 | TC-PRIJAVA-001 Prijava | odpri `/`, preusmeritev na `/login`, vnos `testuser1` / `Geslo123`, **Prijava**, odgovor z žetonoma brez gesla, piškotek `session_token` (HttpOnly, ~24 ur), obvestilo, samo uporabniške povezave, osvežitev | prijava z e-pošto, prijava administratorja, napačno geslo, neobstoječ uporabnik, API prijava |
| 02 | TC-VESELICA-001 Ustvarjanje veselice | admin, **Upravljanje**, **Nova veselica**, privzeta starost 18, izpolnitev obrazca (TEST, 20. 12. 2026 20:00, Gasilski dom Maribor, 100, 18), **Ustvari veselico**, preverba podrobnosti, navaden uporabnik jo vidi, `/veselice` mu ni dostopna | največ 0 = brez omejitve, privzeta starost, navaden uporabnik (403), brez žetona (401) |
| 03 | TC-GLASBA-001 Glasbena želja | prijava na veselico, **Kupi srečko**, vnos pesmi `Bela Ciganka` in izvajalca `Ansambel Lojzeta Slaka`, potrditev, želja je vidna na strani in prek API-ja, za drugo veselico je ni | `POST /music/requests`, brez žetona, manjkajoče ime (422), več želj |
| 04 | TC-VESELICA-101 Brisanje veselice | admin izbriše veselico A (smetnjak, potrditev), C ostane, osvežitev, `GET` vrne 404, navaden uporabnik A ne vidi, ponovno brisanje je 404 (ne 500) | brisanje z udeležencem (zabeleži se dejansko stanje), navaden uporabnik (403), brez žetona (401) |
| 05 | TC-HRANA-001 Naročevanje hrane | prijava, **Vse veselice**, veselica, **+** pri jedi, **Oddaj naročilo**, naročilo na `/narocila`, `GET /orders/user/{id}` s ceno, izračunano na strežniku | več jedi, količina 3, uporabnik brez prijave na veselico (400), brez žetona, neobstoječa jed (404) |

**Odstopanje od PDF-ja:** UI ne pozna gumba **Dodaj** za samostojno glasbeno željo. Želja se v vmesniku odda samo ob nakupu srečke (`POST /ticketsAndMusicRequest`), `POST /music/requests` je zato testiran prek API-ja.

## 5. Pravila vnosa

Iz dokumentacije izhajata samo dve pravili: pri največjem številu prijavljenih **0 pomeni brez omejitve** in **privzeta starostna omejitev je 18**. Ostale meje so dogovorjene in uveljavljene v zaledju:

| Polje | Pravilo | Kje uveljavljeno |
|---|---|---|
| Največ prijavljenih | celo število 0–1000, 0 = brez omejitve, privzeto 0 | `storitev_uporabniskega_sistema.py` (model `UstvariVeselico`) |
| Minimalna starost | celo število 0–99, privzeto 18 | isto |
| Ime veselice, lokacija | 1–100 znakov, presledki na robovih se odstranijo, samo presledki niso veljavni | isto |
| Ime pesmi | obvezno, 1–100 znakov, samo presledki niso veljavni | `Storitev_glasbenih_zelj/models.py`, `srecke/webserver/controllers/tickets.js` |
| Izvajalec | pri srečki obvezen, največ 100 znakov | `tickets.js`, `models.py` (neobvezen pri samostojni želji) |

Napačni vnosi se morajo zavrniti s statusom 4xx, nikoli z napako strežnika (5xx).

V brskalniku brskalnik sam zavrne prazna obvezna polja in vrednosti pod minimumom (`min="0"` pri številskih poljih). Gumb **Kupi srečko** je neaktiven, dokler nista izpolnjeni obe polji.

## 6. Ekvivalenčni razredi

Pri vsakem razredu je naveden en predstavnik. Pri klicih API-jev »sprejeto« pomeni status 200 (pri srečki 201), »zavrnjeno« pa 4xx.

### 6.1 TC-VESELICA-001: ustvarjanje veselice

**Največ prijavljenih**

| Razred | Veljavnost | Predstavnik | Pričakovanje |
|---|---|---|---|
| negativno celo število | neveljaven | -5 | zavrnjeno |
| posebna vrednost 0 | veljaven | 0 | sprejeto, brez omejitve |
| celo število 1–1000 | veljaven | 100 | sprejeto |
| nad 1000 | neveljaven | 5000 | zavrnjeno |
| decimalno število | neveljaven | 12,5 | zavrnjeno |
| neštevilski znaki | neveljaven | `abc` | zavrnjeno |
| izpuščeno polje | veljaven | (brez vrednosti) | sprejeto, vrednost 0 |

**Minimalna starost**

| Razred | Veljavnost | Predstavnik | Pričakovanje |
|---|---|---|---|
| negativno | neveljaven | -3 | zavrnjeno |
| 0–17 (mladoletni) | veljaven | 10 | sprejeto |
| 18 (privzeto) | veljaven | 18 | sprejeto |
| 19–99 | veljaven | 21 | sprejeto |
| nad 99 | neveljaven | 150 | zavrnjeno |
| decimalno | neveljaven | 17,5 | zavrnjeno |
| neštevilsko | neveljaven | `abc` | zavrnjeno |
| izpuščeno polje | veljaven | (brez vrednosti) | sprejeto, vrednost 18 |

**Ime veselice**

| Razred | Veljavnost | Predstavnik | Pričakovanje |
|---|---|---|---|
| prazno | neveljaven | `` | zavrnjeno |
| samo presledki | neveljaven | `   ` | zavrnjeno |
| običajno besedilo s posebnimi znaki | veljaven | `Čaj & šola <b>` | sprejeto, ime enako vnosu |

**V brskalniku:** prazno ime in klik **Ustvari veselico** → zahteva se ne pošlje.

### 6.2 TC-PRIJAVA-001: prijava (pravilni podatki `testuser1` / `Geslo123`)

| Razred | Veljavnost | Vnos | Pričakovanje |
|---|---|---|---|
| obstoječe uporabniško ime + pravilno geslo | veljaven | `testuser1` / `Geslo123` | 200, žeton |
| obstoječa e-pošta + pravilno geslo | veljaven | `testuser1@test.si` / `Geslo123` | 200, žeton |
| napačno geslo | neveljaven | `testuser1` / `Napacno1` | 401 |
| neobstoječ uporabnik | neveljaven | `ni_takega_uporabnika` / `Geslo123` | 401 |
| prazno uporabniško ime | neveljaven | prazno / `Geslo123` | 401 |
| prazno geslo | neveljaven | `testuser1` / prazno | 401 |
| obe polji prazni | neveljaven | prazno / prazno | 401 |
| drugačna velikost črk | neveljaven | `TESTUSER1` / `Geslo123` | 401 |
| presledek na koncu gesla | neveljaven | `testuser1` / `Geslo123 ` | 401 |
| SQL niz | neveljaven | `' OR '1'='1` / `' OR '1'='1` | 401 |
| NoSQL objekt namesto niza | neveljaven | `{"$ne": null}` | 422, brez žetona |
| prazna polja v brskalniku | neveljaven | klik **Prijava** brez vnosa | zahteva se ne pošlje |

Pri vseh zavrnitvah odgovor ne vsebuje `access_token`.

### 6.3 TC-GLASBA-001: srečka z glasbeno željo

| Razred | Veljavnost | Pesem / izvajalec | Pričakovanje |
|---|---|---|---|
| običajne vrednosti | veljaven | `Bela Ciganka` / `Ansambel Lojzeta Slaka` | 201 |
| posebni znaki in šumniki | veljaven | `Čebelica & Šmarnice` / `Ž.Š.` | 201 |
| samo številke | veljaven | `99` / `1234` | 201 |
| prazna pesem | neveljaven | prazno / `Queen` | 400 |
| prazen izvajalec | neveljaven | `Bohemian Rhapsody` / prazno | 400 |
| obe polji prazni | neveljaven | prazno / prazno | 400 |
| samo presledki | neveljaven | `   ` / `   ` | 400 |

Dodatno: zavrnjena zahteva ne ustvari srečke (število srečk ostane enako). Dvakrat ista pesem da dva uspeha (201), število podvojenih želj se zapiše kot »dejansko stanje«.

V brskalniku je gumb **Kupi srečko** neaktiven pri: obe prazni, prazen izvajalec, prazna pesem, samo presledki. Aktiven je pri `A` / `B`.

## 7. Mejne vrednosti

### 7.1 TC-VESELICA-001

**Največ prijavljenih**

| Meja | Vrednosti | Pričakovanje |
|---|---|---|
| spodnja (0) | **-1**, **0**, **1** | zavrnjeno, sprejeto (brez omejitve), sprejeto |
| zgornja (1000) | **999**, **1000**, **1001** | sprejeto, sprejeto, zavrnjeno |

Posledica meje 1: prva prijava uspe, druga prijava drugega uporabnika vrne 400 (»polna«). Pri meji 0 so prijave neomejene.

V brskalniku: vrednost `-1` zahteve ne pošlje (pod minimumom), vrednost `0` je sprejeta in prikaže **»Veselica uspešno ustvarjena!«**.

**Minimalna starost**

| Meja | Vrednosti | Pričakovanje |
|---|---|---|
| spodnja (0) | **-1**, **0**, **1** | zavrnjeno, sprejeto, sprejeto |
| okoli privzete (18) | **17**, **18**, **19** | vse sprejeto |
| zgornja (99) | **98**, **99**, **100** | sprejeto, sprejeto, zavrnjeno |

**Ime veselice (dolžina)**

| Meja | Vrednosti | Pričakovanje |
|---|---|---|
| spodnja | 0 znakov (prazno), **1 znak** (`A`) | zavrnjeno, sprejeto |
| zgornja | **100 znakov**, **101 znakov** | sprejeto, zavrnjeno |

### 7.2 TC-PRIJAVA-001 (dolžina gesla pri `testuser1`)

| Dolžina gesla | Vrednost | Pričakovanje |
|---|---|---|
| 0 znakov | prazno | 401 (v brskalniku se zahteva ne pošlje) |
| 1 znak | `G` | 401 |
| pravilno geslo (8 znakov) | `Geslo123` | 200 |
| 200 znakov | `ggg…` | 401, brez napake strežnika |

### 7.3 TC-GLASBA-001 (dolžina besedila)

| Meja | Vrednosti | Pričakovanje |
|---|---|---|
| spodnja | 0 znakov (prazno), **1 znak** (`A` / `B`) | 400, 201 |
| zgornja pri pesmi | **100 znakov**, **101 znakov** (izvajalec `Queen`) | 201, 400 |
| zgornja pri izvajalcu | **100 znakov**, **101 znakov** (pesem `Pesem`) | 201, 400 |

### 7.4 Število vrednosti po tehniki

| Polje | Ekvivalenčni razredi | Mejne vrednosti |
|---|:-:|:-:|
| Največ prijavljenih | 7 | 6 |
| Minimalna starost | 8 | 9 |
| Ime veselice | 3 | 4 |
| Prijava | 12 | 4 |
| Glasbena želja | 7 | 6 |

## 8. Sledljivost

| Funkcionalnost (`dokumentacija.md`) | Testni primer | Datoteka | Razdelek tega dokumenta |
|---|---|---|---|
| Prijava (razdelek 4) | TC-PRIJAVA-001 | 01, 06 | 4, 6.2, 7.2 |
| Upravljanje veselic: ustvarjanje (razdelek 11) | TC-VESELICA-001 | 02, 06 | 4, 6.1, 7.1 |
| Glasbene želje in srečke (razdelka 7.8, 7.9) | TC-GLASBA-001 | 03, 06 | 4, 6.3, 7.3 |
| Upravljanje veselic: brisanje (razdelek 11.3) | TC-VESELICA-101 | 04 | 4 |
| Naročila hrane (razdelka 7.6, 8) | TC-HRANA-001 | 05 | 4 |

## 9. Podatki in čiščenje

- Veselice, glasbene želje, srečke, naročila in jedi imajo unikatna imena (predpona + časovni žig) in se po testih izbrišejo prek API-ja.
- Testi nikoli ne kličejo `DELETE /music/requests`, ki izbriše vse želje.
- Račun `testuser1` se ustvari ob prvem zagonu. `testuser2` nastane v negativnih testih.
- Če test nepričakovano ustvari veselico (na primer ko zaledje ne zavrne neveljavne vrednosti), jo čiščenje vseeno izbriše.

## 10. Znane omejitve testov

- **Testi še niso bili zagnani** v okolju, v katerem so nastali (ni Dockerja). Preverjeni so tipi (`tsc`) in seznam testov.
- **Selektorji v brskalniku** so napisani po kodi frontenda, ne po zagnani strani. Najbolj tvegana so mesta: povezava **Upravljanje** v levem meniju, kartica jedi z gumbom **+**, polja v obrazcu veselice po oznaki in kartica veselice na seznamu (klik na kartico, ob neuspehu se uporabi neposredna pot).
- **Zaledje je treba po spremembi meja ponovno zgraditi**, sicer testi preverjajo staro kodo.
- **Brisanje veselice z udeležencem:** test samo zabeleži dejansko stanje (odprto vprašanje iz scenarija), ne pa pravilnosti.
- **Obrezovanje presledkov:** ime in lokacija veselice se shranita obrezana. Test z imenom `Čaj & šola <b>` ni odvisen od tega.
- **Statistika** (`statistika_service`) ni del testov in ni v `docker-compose.yml`.
