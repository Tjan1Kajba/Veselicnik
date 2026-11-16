# Ekvivalenčni razredi in mejne vrednosti: 3 testni primeri

Dokument opisuje, kaj dejansko testirajo testi v [specs/06-ekvivalencni-razredi-in-mejne-vrednosti.spec.ts](specs/06-ekvivalencni-razredi-in-mejne-vrednosti.spec.ts). Pri vsakem testu so navedeni vhod, pristop in pričakovan izhod.

| Testni primer | Vrsta vhoda | Vhodna polja | Testov |
|---|---|---|:-:|
| **TC-VESELICA-001** Ustvarjanje veselice | **številčni** + besedilni | največ prijavljenih, minimalna starost, ime veselice | 37 |
| **TC-PRIJAVA-001** Prijava | besedilni | uporabniško ime ali e-pošta, geslo | 14 |
| **TC-GLASBA-001** Glasbena želja | besedilni | ime pesmi, izvajalec | 14 |

Oznake: **EC** = ekvivalenčni razred, **MV** = mejna vrednost. Pravilo za vsa polja: napačen vnos se zavrne s statusom 4xx, nikoli 5xx. Pri API-ju je »sprejeto« status 200 (pri srečki 201).

> **Status:** testi so tipsko preverjeni, a še **niso bili zagnani** (ni Dockerja). Pred zagonom je treba zaledje ponovno zgraditi: `docker compose up -d --build`.

---

## 1. TC-VESELICA-001: ustvarjanje veselice (številčni vnos)

Vhod: `POST /veselice` kot admin. Pravila: največ prijavljenih je celo število 0–1000 (0 = brez omejitve), minimalna starost je celo število 0–99 (privzeto 18), ime je 1–100 znakov.

### 1.1 Največ prijavljenih (številčno polje)

| Test | Vhod | Pristop | Pričakovan izhod |
|---|---|---|---|
| EC1 negativno | -5 | EC (neveljaven) | zavrnjeno (4xx) |
| meja pod 0 | -1 | MV | zavrnjeno |
| EC2 / meja 0 | 0 | EC in MV | sprejeto, vrednost 0 (brez omejitve) |
| meja 1 | 1 | MV | sprejeto |
| EC3 tipična vrednost | 100 | EC (veljaven) | sprejeto |
| meja 999 | 999 | MV | sprejeto |
| meja 1000 | 1000 | MV | sprejeto |
| meja 1001 | 1001 | MV | zavrnjeno |
| EC4 nad zgornjo mejo | 5000 | EC (neveljaven) | zavrnjeno |
| EC5 decimalno | 12,5 | EC (neveljaven) | zavrnjeno |
| EC6 neštevilsko | `abc` | EC (neveljaven) | zavrnjeno |
| EC7 izpuščeno polje | (brez vrednosti) | EC (veljaven) | sprejeto, vrednost 0 |
| max = 1 | 1, nato dve prijavi | MV (posledica) | prva prijava 200, druga 400 z besedilom »polna« |
| max = 0 | 0, prijava | MV (posledica) | prijava 200 (neomejeno) |

### 1.2 Minimalna starost (številčno polje)

| Test | Vhod | Pristop | Pričakovan izhod |
|---|---|---|---|
| EC1 negativno | -3 | EC (neveljaven) | zavrnjeno |
| meja pod 0 | -1 | MV | zavrnjeno |
| meja 0 | 0 | MV | sprejeto |
| meja 1 | 1 | MV | sprejeto |
| EC2 mladoletni | 10 | EC (veljaven) | sprejeto |
| meja 17 | 17 | MV | sprejeto |
| EC3 / meja 18 (privzeto) | 18 | EC in MV | sprejeto |
| meja 19 | 19 | MV | sprejeto |
| EC4 | 21 | EC (veljaven) | sprejeto |
| meja 98 | 98 | MV | sprejeto |
| meja 99 | 99 | MV | sprejeto |
| meja 100 | 100 | MV | zavrnjeno |
| EC5 nad zgornjo mejo | 150 | EC (neveljaven) | zavrnjeno |
| EC6 decimalno | 17,5 | EC (neveljaven) | zavrnjeno |
| EC6 neštevilsko | `abc` | EC (neveljaven) | zavrnjeno |
| izpuščeno polje | (brez vrednosti) | EC (veljaven) | sprejeto, vrednost 18 |

### 1.3 Ime veselice (dolžina besedila)

| Test | Vhod | Pristop | Pričakovan izhod |
|---|---|---|---|
| prazno ime | `` | EC (neveljaven) | zavrnjeno |
| samo presledki | `   ` | EC (neveljaven) | zavrnjeno |
| meja 1 znak | `A` | MV | sprejeto |
| meja 100 znakov | 100 × `A` | MV | sprejeto |
| meja 101 znakov | 101 × `A` | MV | zavrnjeno |
| posebni znaki in šumniki | `Čaj & šola <b>` | EC (veljaven) | sprejeto, ime enako vnosu |

### 1.4 UI (brskalnik)

| Vhod | Pristop | Pričakovan izhod |
|---|---|---|
| prazno ime, klik **Ustvari veselico** | EC (neveljaven) | zahteva se ne pošlje (`valueMissing`) |
| največ prijavljenih = -1 | MV | zahteva se ne pošlje (`rangeUnderflow`) |
| največ prijavljenih = 0 | MV | odgovor 200, obvestilo »Veselica uspešno ustvarjena!«, vrednost 0 |

---

## 2. TC-PRIJAVA-001: prijava

Vhod: `POST /uporabnik/prijava` z `{uporabnisko_ime_ali_email, geslo}`. Pravilni podatki so `testuser1` / `Geslo123`. Brez številčnega vnosa je mejna vrednost dolžina gesla.

| Test | Uporabniško ime | Geslo | Pristop | Pričakovan izhod |
|---|---|---|---|---|
| EC1 uporabniško ime + pravilno geslo | `testuser1` | `Geslo123` | EC (veljaven) | 200, `access_token` |
| EC2 e-pošta + pravilno geslo | `testuser1@test.si` | `Geslo123` | EC (veljaven) | 200, `access_token` |
| EC3 napačno geslo | `testuser1` | `Napacno1` | EC (neveljaven) | 401, brez žetona |
| EC4 neobstoječ uporabnik | `ni_takega_uporabnika` | `Geslo123` | EC (neveljaven) | 401 |
| EC5 prazno uporabniško ime | (prazno) | `Geslo123` | EC (neveljaven) | 401 |
| EC6 prazno geslo | `testuser1` | (prazno) | EC (neveljaven) | 401 |
| EC7 obe polji prazni | (prazno) | (prazno) | EC (neveljaven) | 401 |
| EC8 drugačna velikost črk | `TESTUSER1` | `Geslo123` | EC (neveljaven) | 401 |
| geslo 1 znak | `testuser1` | `G` | MV (spodnja) | 401 |
| geslo 200 znakov | `testuser1` | 200 × `g` | MV (zgornja) | 401, brez napake strežnika |
| presledek na koncu gesla | `testuser1` | `Geslo123 ` | EC (neveljaven) | 401 |
| SQL niz | `' OR '1'='1` | `' OR '1'='1` | EC (neveljaven) | 401 |
| NoSQL objekt namesto niza | `{"$ne": null}` | `{"$ne": null}` | EC (neveljaven) | 422, brez žetona |
| UI: prazni polji | klik **Prijava** brez vnosa | | EC (neveljaven) | zahteva se ne pošlje, ostane na `/login` |

---

## 3. TC-GLASBA-001: glasbena želja

Vhod: `POST /ticketsAndMusicRequest` z `{veselica_id, songName, artist}` kot `testuser1`. Vmesnik glasbeno željo odda samo ob nakupu srečke. Pravila: ime pesmi in izvajalec sta obvezna, dolga 1–100 znakov, samo presledki niso veljavni.

| Test | Ime pesmi | Izvajalec | Pristop | Pričakovan izhod |
|---|---|---|---|---|
| EC1 običajna vrednost | `Bela Ciganka` | `Ansambel Lojzeta Slaka` | EC (veljaven) | 201, ustvarjeni srečka in želja |
| EC2 prazna pesem | (prazno) | `Queen` | EC (neveljaven) | 400 |
| EC3 prazen izvajalec | `Bohemian Rhapsody` | (prazno) | EC (neveljaven) | 400 |
| EC4 obe polji prazni | (prazno) | (prazno) | EC (neveljaven) | 400 |
| EC5 samo presledki | `   ` | `   ` | EC (neveljaven) | 400 |
| EC6 posebni znaki in šumniki | `Čebelica & Šmarnice` | `Ž.Š.` | EC (veljaven) | 201 |
| EC7 samo številke | `99` | `1234` | EC (veljaven) | 201 |
| meja 1 znak | `A` | `B` | MV (spodnja) | 201 |
| meja 100 znakov | 100 × `A` | 100 × `B` | MV (zgornja) | 201 |
| meja 101 znakov (pesem) | 101 × `A` | `Queen` | MV (zgornja) | 400 |
| meja 101 znakov (izvajalec) | `Pesem` | 101 × `A` | MV (zgornja) | 400 |
| zavrnitev ne ustvari srečke | (prazno) | (prazno) | EC (neveljaven) | 400, število srečk (`GET /tickets`) ostane enako |
| dvakrat ista pesem | `Podvojena pesem …` | `Izvajalec` | EC (veljaven) | oba klica 201, število želj z isto pesmijo se zapiše kot opomba |
| UI: gumb **Kupi srečko** | prazno / `Bohemian Rhapsody` / prazno / `   ` | prazno / prazno / `Queen` / `   ` | EC2–EC5 | gumb neaktiven |
| UI: gumb **Kupi srečko** | `A` | `B` | MV | gumb aktiven |

Dolžina 0 znakov nima ločenega mejnega testa, ker jo pokrivajo EC2–EC4.

---

## 4. Zagon

```
cd e2e
npx playwright test specs/06-ekvivalencni-razredi-in-mejne-vrednosti.spec.ts
npx playwright show-report
```
