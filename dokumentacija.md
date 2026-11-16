# Veseličnik – dokumentacija

Veseličnik je spletna aplikacija za organizacijo veselic (gasilske veselice, zabave, dogodki). Uporabniki se prijavijo na veselico, naročajo hrano, oddajo glasbeno željo, kupijo srečko za nagradno žrebanje in prijavijo izgubljene ali najdene predmete. Administrator upravlja veselice, meni, glasbene želje, nagrade in žrebanja.

Dokument je razdeljen na dva dela:

- **Del A – Uporabniški priročnik:** kaj aplikacija omogoča in kje je kateri gumb ali vnosno polje.
- **Del B – Tehnični opis:** arhitektura, storitve, končne točke API-jev, podatki in znane omejitve.

Vsebina je napisana po dejanski kodi projekta (frontend `Frontend/frontend_user`, storitve v ostalih mapah).

---

## Kazalo

**Del A – Uporabniški priročnik**

1. [Osnovni pojmi in vloge](#1-osnovni-pojmi-in-vloge)
2. [Splošna postavitev vmesnika](#2-splošna-postavitev-vmesnika)
3. [Registracija](#3-registracija)
4. [Prijava in odjava](#4-prijava-in-odjava)
5. [Uporabniški profil](#5-uporabniški-profil)
6. [Vse veselice (pregled)](#6-vse-veselice-pregled)
7. [Stran veselice](#7-stran-veselice)
8. [Naročila](#8-naročila)
9. [Izgubljeno & najdeno](#9-izgubljeno--najdeno)
10. [Moje nagrade](#10-moje-nagrade)
11. [Administrator: Upravljanje veselic](#11-administrator-upravljanje-veselic)
12. [Administrator: Upravljanje menija](#12-administrator-upravljanje-menija)
13. [Administrator: Glasba](#13-administrator-glasba)
14. [Administrator: Upravljanje nagrad](#14-administrator-upravljanje-nagrad)
15. [Administrator: Upravljanje žrebanj](#15-administrator-upravljanje-žrebanj)
16. [Obvestila (Toastify)](#16-obvestila-toastify)

**Del B – Tehnični opis**

17. [Arhitektura](#17-arhitektura)
18. [Zagon sistema](#18-zagon-sistema)
19. [Avtentikacija in seje](#19-avtentikacija-in-seje)
20. [API: uporabniška storitev (8002)](#20-api-uporabniška-storitev-8002)
21. [API: storitev za hrano (8001)](#21-api-storitev-za-hrano-8001)
22. [API: storitev glasbenih želja (8004)](#22-api-storitev-glasbenih-želja-8004)
23. [API: srečke, nagrade in žrebanja (9001)](#23-api-srečke-nagrade-in-žrebanja-9001)
24. [API: izgubljeni predmeti (9000)](#24-api-izgubljeni-predmeti-9000)
25. [Sestavljeni klici med storitvami](#25-sestavljeni-klici-med-storitvami)
26. [Samodejni testi (Playwright)](#26-samodejni-testi-playwright)
27. [Znane omejitve in opažanja](#27-znane-omejitve-in-opažanja)

---

# Del A – Uporabniški priročnik

## 1. Osnovni pojmi in vloge

| Pojem | Pomen |
|---|---|
| **Veselica** | Dogodek z imenom, datumom in uro, lokacijo, opisom, najvišjim številom udeležencev in starostno omejitvijo. |
| **Prijava na veselico** | Uporabnik se vpiše med udeležence veselice. Brez tega ne more naročati hrane in kupovati srečk. |
| **Meni** | Seznam jedi, ki jih administrator doda. Jed je lahko vezana na eno veselico ali na vse. |
| **Glasbena želja** | Predlog pesmi za določeno veselico. Drugi uporabniki zanjo glasujejo. |
| **Srečka** | Vstopnica za nagradno žrebanje. Pri nakupu uporabnik hkrati odda glasbeno željo. |
| **Nagrada** | Nagrada na veselici z verjetnostjo zadetka med 0,01 in 1,0. |
| **Žrebanje** | Administrator izvede žrebanje za veselico. Zmagovalci se pokažejo v razdelku Moje nagrade. |

**Vloge**

| Vloga | Kaj vidi | Kako jo prepoznamo |
|---|---|---|
| **Navaden uporabnik** (`normal`) | Uporabniški profil, Vse veselice, Naročila, Izgubljeno, Moje nagrade | Po prijavi so v levem meniju samo te povezave. |
| **Administrator** (`admin`) | Vse zgoraj (razen Moje nagrade) ter Upravljanje, Upravljanje menija, Glasba, Upravljanje nagrad, Upravljanje žrebanj | Na kartici s podatki piše vloga, v meniju so vidne dodatne povezave. |

Če navaden uporabnik odpre administratorsko stran (na primer `/veselice`), se prikaže obvestilo **»Nimate dostopa do te strani.«** in vmesnik ga preusmeri na `/uporabnik`.

Privzeti administrator: uporabniško ime `admin`, geslo `admin`, če ga niste spremenili.

---

## 2. Splošna postavitev vmesnika

Po prijavi so vse strani (razen prijave in registracije) sestavljene enako:

```
┌───────────────┬──────────────────────────────────────────────┐
│ LEVI MENI     │  GLAVA STRANI  (naslov strani + značka)      │
│ (sidebar)     │──────────────────────────────────────────────│
│               │                                              │
│ ime uporabnika│  VSEBINA (kartice, obrazci, seznami)         │
│ e-pošta       │                                              │
│               │                                              │
│ povezave      │                                              │
│ ...           │                                              │
│ [Odjava]      │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

**Levi meni (sidebar)**

- **Na vrhu:** ikona uporabnika, uporabniško ime in e-poštni naslov.
- **Na sredini:** navigacijske povezave. Aktivna je obarvana.
- **Čisto spodaj:** gumb **Odjava** (ikona izhoda).

Povezave v levem meniju:

| Besedilo povezave | Naslov | Navaden uporabnik | Administrator |
|---|---|:-:|:-:|
| Uporabniški profil | `/uporabnik` | da | da |
| Vse veselice | `/veselice-pregled` | da | da |
| Upravljanje | `/veselice` | – | da |
| Upravljanje menija | `/menu` | – | da |
| Naročila | `/narocila` | da | da |
| Glasba | `/glasba` | – | da |
| Izgubljeno | `/izgubljeni-najdeni` | da | da |
| Upravljanje nagrad | `/prizes` | – | da |
| Upravljanje žrebanj | `/draws` | – | da |
| Moje nagrade | `/moje-nagrade` | da | – |

> Povezava do `/veselice-pregled` se v meniju imenuje **Vse veselice** (v stranskem meniju). Na strani posamezne veselice se v primeru napake prikaže poenostavljen meni s povezavo »Veselice«.

**Glava strani:** velik naslov na levi (na primer »Vse veselice«) in značka na desni (na primer »Račun je zavarovan«, »Administrator«).

**Obrazci in seznami na administratorskih straneh** imajo skupen vzorec:

- Kartica **»Seznam …«** s sivo značko **»Admin panel«** in gumbom **»Nova …«** zgoraj desno.
- Klik na gumb **»Nova …«** nad seznamom odpre kartico z obrazcem. Obrazec zapreš s križcem (**Zapri**) zgoraj desno na kartici ali z gumbom **Prekliči** spodaj.
- Gumb za brisanje je ikona smetnjaka na vsaki kartici (z opisom, ki se pokaže ob premiku miške).

---

## 3. Registracija

**Naslov:** `/register` (povezava **Registracija** pod prijavnim obrazcem).

Stran je razdeljena na dva dela. Levo je okrasna plošča s štirimi ikonami funkcij (hrana, glasba, srečelov, izgubljeno in najdeno). Desno je obrazec.

| Element | Vrsta | Opis |
|---|---|---|
| **Uporabniško ime** | vnosno polje (besedilo) | Edinstveno ime. |
| **E-naslov** | vnosno polje (e-pošta) | Edinstven naslov. |
| **Geslo** | vnosno polje (geslo) | Znaki so skriti. |
| **Potrdi geslo** | vnosno polje (geslo) | Mora biti enako geslu. |
| **Registriraj se** | gumb (pošlji) | Med pošiljanjem piše »Registriram...«. |
| **Prijava** (povezava pod obrazcem) | povezava | Vrne na prijavo. |

Postopek:

1. Izpolni vsa štiri polja.
2. Klikni **Registriraj se**.
3. Ob uspehu se prikaže obvestilo **»Registracija uspešna. Preusmerjam na prijavo ...«** in odpre se `/login`.
4. Ob napaki (na primer ime ali e-pošta že obstaja, gesli se ne ujemata) se pojavi rdeče obvestilo.

Novi uporabnik je vedno navaden uporabnik. Administrator se ustvari ločeno (ob zagonu storitve).

---

## 4. Prijava in odjava

### Prijava

**Naslov:** `/login`. Pot `/` neprijavljenega uporabnika samodejno preusmeri sem.

| Element | Vrsta | Opis |
|---|---|---|
| **E-naslov ali uporabniško ime** (`id="usernameOrEmail"`) | vnosno polje (besedilo) | Prijava je mogoča z enim ali drugim. |
| **Geslo** (`id="password"`) | vnosno polje (geslo) | Znaki so skriti. |
| Rdeče sporočilo pod poljema | prikaz napake | Na primer »Napačno uporabniško ime/email ali geslo«. |
| **Prijava** | gumb (pošlji) | Med preverjanjem piše »Preverjam podatke...«. |
| **Registracija** (povezava pod obrazcem) | povezava | Odpre `/register`. |

Postopek:

1. Vpiši uporabniško ime ali e-pošto in geslo.
2. Klikni **Prijava**.
3. Prikaže se obvestilo **»Prijava uspešna. Preusmerjam ...«** in odpre se `/uporabnik`.

Ob napačnem geslu ali neobstoječem uporabniku ostaneš na `/login`, piškotek seje se ne ustvari.

### Odjava

Klikni gumb **Odjava** čisto spodaj v levem meniju. Prikaže se obvestilo **»Uspešno ste se odjavili.«** in odpre se začetna stran (prijava).

---

## 5. Uporabniški profil

**Naslov:** `/uporabnik` (povezava **Uporabniški profil**). Naslov strani: **Uporabniški profil**, značka **»Račun je zavarovan«**.

Strani od zgoraj navzdol:

### 5.1 Kartica »Osebni podatki« (samo za ogled)

Mreža polj, ki jih ni mogoče urejati: uporabniško ime, e-pošta, ime, priimek, vloga in podobno. Vsako polje ima oznako (zgoraj levo), tip podatka (zgoraj desno) in vrednost.

### 5.2 Trije zložljivi razdelki (klik na glavo razdelka ga odpre ali zapre)

**Posodobi podatke** (ikona svinčnika, značka »Uredi informacije«)

| Element | Vrsta |
|---|---|
| Uporabniško ime (`id="update-username"`, ograda: »Vnesite novo uporabniško ime«) | vnosno polje |
| E-pošta (`id="update-email"`, ograda: »Vnesite nov e-poštni naslov«) | vnosno polje |
| **Posodobi podatke** | gumb (neaktiven, dokler sta obe polji prazni) |

Izpolniš lahko eno ali obe polji. Ob uspehu: obvestilo **»Podatki so bili uspešno posodobljeni.«** in zelena kartica »Podatki uspešno posodobljeni«.

**Sprememba gesla** (ikona ključa, značka »Varnost«)

| Element | Vrsta |
|---|---|
| Novo geslo (`id="new-password"`, ograda: »Vsaj 4 znake«) | vnosno polje (geslo) |
| Potrdi novo geslo (`id="confirm-password"`, ograda: »Ponovite geslo«) | vnosno polje (geslo) |
| **Spremeni geslo** | gumb |

Najmanj 4 znake, obe polji morata biti enaki. Ob uspehu: **»Geslo je bilo uspešno spremenjeno.«**

**Izbriši račun** (ikona smetnjaka, rdeča značka »Nepovratno«)

1. Razdelek pokaže opozorilo: »Opozorilo: To dejanje je nepovratno«.
2. Klikni rdeči gumb **Izbriši račun** pod opozorilom.
3. Odpre se okno **»Potrditev brisanja računa«** s poljem **»Vnesite IZBRIŠI«**.
4. Vpiši besedo `IZBRIŠI` (z veliko, natanko tako) in klikni rdeči gumb **Izbriši račun** v nogi okna. Gumb **Prekliči** okno zapre.
5. Če besede ne vpišeš pravilno, se prikaže napaka **»Prosimo, vnesite 'IZBRIŠI' za potrditev.«**

Po uspešnem brisanju se prikaže obvestilo in odpre se začetna stran.

### 5.3 Blok »Statistika API klicev«

Čisto spodaj na strani: zadnji klican endpoint, najpogosteje klican endpoint in število klicev po endpointih. Podatke dobi iz statistične storitve. Če ta ni zagnana, blok pokaže napako.

---

## 6. Vse veselice (pregled)

**Naslov:** `/veselice-pregled` (povezava **Vse veselice**). Naslov strani: **Vse veselice**.

- Kartica **»Seznam veselic«** (značka »Pregled«) vsebuje mrežo kartic.
- Vsaka **kartica veselice** ima sliko, ime (naslov čez sliko), **datum in uro** ter **lokacijo**.
- Če si na veselico že prijavljen, je na sliki zgoraj desno zelena značka **»Prijavljen«**.
- **Klik na kartico** odpre stran veselice (`/veselice/[id]`).
- Če ni nobene veselice, piše »Trenutno ni na voljo nobene veselice.«

Na tej strani ni gumbov za urejanje ali brisanje (to je v razdelku Upravljanje).

---

## 7. Stran veselice

**Naslov:** `/veselice/[id]` (klik na kartico veselice). Stran je dolga in vsebuje več razdelkov. Spodaj so po vrsti od zgoraj navzdol.

### 7.1 Vrstica na vrhu

- Gumb **← Nazaj na seznam** (zgoraj levo v glavi) vrne na `/veselice-pregled`.

### 7.2 Velika slika z imenom

- Slika veselice čez celotno širino, spodaj na njej je ime veselice (velik beli naslov).
- Zgoraj desno na sliki: značka **»Prijavljen«**, če si na veselico že prijavljen.

### 7.3 Kartice s podatki

| Kartica | Vsebina |
|---|---|
| **Datum in ura** | Čas veselice (oblika dd. mm. llll, hh:mm). |
| **Lokacija** | Kraj veselice. |
| **Prijavljeni** | Število prijavljenih, ob omejitvi tudi »N / največ«. Če je veselica polna, piše **(Polno)**. |
| **Minimalna starost** | Na primer »18+ let«. |

### 7.4 Opis dogodka

Kartica **»Opis dogodka«** z besedilom opisa (če je opis vnesen).

### 7.5 Prijavljeni uporabniki

Če je vsaj en prijavljen, se pod opisom pokaže kartica **»Prijavljeni uporabniki (N)«** z mrežo kartic (ikona, oznaka »Uporabnik« in uporabniško ime).

### 7.6 Naroči hrano (samo če si prijavljen na veselico)

Kartica **»Naroči hrano«**. Brez prijave na veselico ta razdelek ni viden.

- **Kartica jedi** (ena na jed): ime jedi (naslov), opis, cena (v evrih, levo spodaj) in na desni trojica **[−]  število  [+]**.
  - Gumb **+** doda enoto jedi v naročilo.
  - Gumb **−** odvzame enoto (neaktiven pri količini 0).
  - Število med gumboma je trenutna količina.
- Če jedi ni, piše »Trenutno ni jedi na voljo za naročilo.«
- Takoj ko je izbrana vsaj ena jed, se pod kartice jedi doda kartica **»Povzetek naročila«** s seznamom (»jed × količina« in cena vrstice) ter **Skupaj**.
- Pod povzetkom sta dva gumba (desno poravnana):
  - **Prekliči** (sivi) izprazni košarico.
  - **Oddaj naročilo (€ …)** (obarvani glavni gumb) odda naročilo. Med pošiljanjem piše »Ustvarjam naročilo...«.
- Ob uspehu: **»Naročilo uspešno ustvarjeno!«** in vmesnik odpre `/narocila`.

Cena naročila se izračuna na strežniku iz cen v meniju. Cena na zaslonu je samo informativna.

### 7.7 Nagrade za to veselico

Kartica **»Nagrade za to veselico«** (vidna vsem). Prikaže vsako nagrado z imenom in verjetnostjo (»Verjetnost: …%«). Brez nagrad piše »Za to veselico še ni nagrad.«

### 7.8 Moje srečke (samo če si prijavljen)

Kartica **»Moje srečke (N)«** s seznamom tvojih srečk za to veselico (»Srečka #…« in datum nakupa). Če jih nimaš, piše »Še nimate srečk za to veselico.«

Pod seznamom je razdelek **»Kupi novo srečko«**:

1. Klikni gumb **Kupi srečko**. Odpre se okvir **»Glasbena želja«** z razlago (z vsako srečko dobiš glasbeno željo).
2. V okvirju sta dve vnosni polji, eno ob drugem:
   - **Ime pesmi** (ograda »Ime pesmi«, levo),
   - **Izvajalec** (ograda »Izvajalec«, desno).
3. Spodaj desno sta gumba **Prekliči** (zapre okvir in pobriše polji) in **Kupi srečko** (potrdi nakup). Gumb **Kupi srečko** je neaktiven, dokler nista izpolnjeni obe polji. Med pošiljanjem piše »Kupujem...«.
4. Ob uspehu: **»Srečka in glasbena želja uspešno ustvarjeni!«**. Srečka se pojavi na seznamu, glasbena želja pa med glasbenimi željami.

> Vmesnik pozna tudi funkcijo za samostojno oddajo glasbene želje brez srečke (`POST /music/requests`), vendar zanjo na strani ni gumba. Glasbeno željo je zato v vmesniku mogoče oddati samo ob nakupu srečke.

### 7.9 Glasbene želje (samo če si prijavljen)

Kartica **»Glasbene želje (N)«**. Vsaka želja je vrstica z imenom pesmi, izvajalcem in številom glasov (**»N glasov«**).

- Gumb **Glasuj** pri vrstici odda tvoj glas (med pošiljanjem piše »Glasujem...«). Ob uspehu: **»Glas uspešno oddan!«**.
- **Samo administrator** vidi pri vsaki želji še dve ikoni:
  - **Ponastavi glasove** (puščica v krogu): po potrditvi postavi glasove na 0.
  - **Izbriši željo** (smetnjak): po potrditvi izbriše željo.
- Brez želj piše »Še ni glasbenih želja. Bodite prvi, ki dodate pesem!«

### 7.10 Prijava in odjava z veselice

Čisto spodaj na strani je velik gumb:

- Če **nisi prijavljen:** gumb **Prijavi se na veselico**. Med pošiljanjem »Prijavljam...«. Če je veselica polna, je gumb neaktiven z besedilom **Veselica je polna**. Ob uspehu: **»Uspešno ste se prijavili na veselico!«**. Po prijavi se na strani pojavijo razdelki 7.6, 7.8 in 7.9.
- Če **si prijavljen:** gumb **Odjavi se z veselice**. Najprej se prikaže potrditveno okno (»Ali ste prepričani, da se želite odjaviti z veselice …?«). Ob uspehu: **»Uspešno ste se odjavili z veselice!«**.

---

## 8. Naročila

**Naslov:** `/narocila` (povezava **Naročila**). Naslov strani: **Moja naročila** (administrator: **Vsa naročila**). Na desni v glavi je značka s številom naročil.

- Brez naročil: sporočilo **»Nimate še nobenega naročila«**.
- Sicer kartica **»Seznam naročil«** z mrežo kartic naročil. Vsaka kartica vsebuje:
  - naslov **»Naročilo #«** z zadnjimi 8 znaki ID-ja (administrator vidi še **»Uporabnik: …«**),
  - barvno značko stanja (Ustvarjeno, V čakanju, Potrjeno, Pripravlja se, Pripravljeno, Dokončano, Preklicano, Darilo) in ikono plačila (zelena kljukica ali rdeč križec),
  - seznam **»Artikli:«** (ime jedi in **× količina**),
  - **Skupaj: € …** in napis **Plačano** ali **Ni plačano**,
  - gumbe na dnu kartice.

**Gumbi na kartici naročila**

| Gumb | Kdo ga vidi | Kaj naredi |
|---|---|---|
| **Plačaj** (zeleni, ikona kartice) | navaden uporabnik, če naročilo še ni plačano | Označi naročilo kot plačano (plačilo je simulirano). Ob uspehu **»Naročilo uspešno plačano!«**. |
| **Izbriši** (rdeči, smetnjak) | vsi | Po potrditvi izbriše naročilo. Neaktiven pri plačanem naročilu. Ob uspehu **»Naročilo uspešno izbrisano!«**. |
| **Spustni seznam stanja** (levo od gumbov) | samo administrator | Spremeni stanje naročila (Ustvarjeno … Darilo). Ob uspehu **»Status naročila uspešno posodobljen!«**. |

---

## 9. Izgubljeno & najdeno

**Naslov:** `/izgubljeni-najdeni` (povezava **Izgubljeno**). Naslov strani: **Izgubljeno & najdeno**. Stran zahteva prijavo. Neprijavljen uporabnik vidi »Ni prijave« in gumb **Prijava**.

### 9.1 Zgornji gumbi

V kartici **»Seznam predmetov«** sta zgoraj na desni dva gumba:

- **Prijava izgube**: odpre obrazec za izgubljen predmet.
- **Prijava najdbe**: odpre obrazec za najden predmet.

Obrazec se odpre kot kartica **nad seznamom**. Zapreš ga s križcem (**Zapri**) ali z gumbom **Prekliči**.

### 9.2 Obrazec za izgubljen predmet

| Element | Vrsta | Obvezno |
|---|---|:-:|
| **Ime predmeta** (ograda »npr. Denarnica«) | vnosno polje | da |
| **Na kateri veselici je bil predmet najden** | spustni seznam (»Izberi veselico...«) | da |
| **Opis predmeta** (ograda »Dodajte opis predmeta...«) | večvrstično polje | ne |
| **Dodaj predmet** | gumb | – |
| **Prekliči** | gumb | – |

Ob uspehu: **»Predmet dodan«**.

### 9.3 Obrazec za najden predmet

Enak kot zgoraj, z dvema dodatnima poljema (spustna seznama):

| Element | Pomen |
|---|---|
| **Veselica za nagrado (meni)** (»Izberi veselico za nagrado...«) | Veselica, katere meni se uporabi za nagrado. |
| **Izberi hrano** (»Izberi hrano...«) | Jed iz menija (ob imenu je cena in opis), ki jo uporabnik dobi kot nagrado. Seznam se napolni po izbiri veselice za nagrado. |

Ob oddaji vmesnik pokliče `POST /foundAndOrderFood` (glej razdelek 25). Najdenemu predmetu se doda brezplačno naročilo izbrane jedi s stanjem **Darilo**.

- Uspeh: **»Najden predmet uspešno oddan! Preverite naročila za vaše darilo.«**
- Predmet shranjen, nagrade pa ni bilo mogoče ustvariti: **»Najden predmet uspešno oddan! (Darilo ni bilo mogoče obdelati)«**.

### 9.4 Seznam predmetov

- Seznam kartic predmetov z značko **IZGUBLJEN** ali **NAJDEN** (barvna oznaka).
- Pri vsaki kartici sta ikoni **Uredi** (svinčnik, odpre isti obrazec s predizpolnjenimi podatki, gumb se imenuje **Posodobi predmet**) in **Izbriši** (smetnjak, ob uspehu **»Predmet izbrisan«**).
- Brez predmetov: »Ni predmetov. Dodajte prvi predmet!«

---

## 10. Moje nagrade

**Naslov:** `/moje-nagrade` (povezava **Moje nagrade**, samo za navadne uporabnike). Naslov strani: **Moje nagrade**.

- Če nisi zmagal: sporočilo **»Še niste zmagali nobene nagrade«** s tolažbo »Sreče pri naslednjem žrebanju!«.
- Sicer kartica **»Vaše nagrade«**. Vsaka kartica ima oznako **NAGRADA**, ime nagrade, **verjetnost**, **zmagovalno srečko**, **veselico**, **datum žrebanja** in **datum ustvarjanja**.

Stran je samo za branje (nima gumbov za dejanja).

---

## 11. Administrator: Upravljanje veselic

**Naslov:** `/veselice` (povezava **Upravljanje**). Naslov strani: **Upravljanje veselic**, značka **Administrator**.

### 11.1 Seznam veselic

Kartica **»Seznam veselic«** s značko »Admin panel«.

- **Nova veselica**: gumb zgoraj desno v kartici. Odpre obrazec nad seznamom.
- Vsaka **kartica veselice**: slika, ime (naslov), **Datum in ura**, **Lokacija**, ... in **smetnjak** (opis **»Izbriši veselico«**).
- Če ni veselic: »Ni veselic. Ustvarite prvo veselico!«

### 11.2 Obrazec »Ustvari novo veselico«

Kartica se odpre nad seznamom. Zgoraj desno je križec **Zapri**.

| Element | Vrsta | Obvezno | Opomba |
|---|---|:-:|---|
| **Ime veselice \*** (ograda »npr. Novoletska zabava 2025«) | besedilo | da | |
| **Datum in ura \*** | izbirnik datuma in časa | da | Vnos v lokalnem času. |
| **Lokacija \*** (ograda »npr. Ljubljana, Kongresni trg 1«) | besedilo | da | |
| **Maksimalno število prijavljenih** (ograda »0 = brez omejitve«) | število | ne | 0 pomeni brez omejitve. |
| **Minimalna starost za vstop** | število | ne | Privzeto 18. |
| **Opis dogodka** (ograda »Dodajte opis dogodka, temo, posebnosti...«) | večvrstično polje | ne | |
| **Ustvari veselico** | gumb (pošlji) | – | Med pošiljanjem »Ustvarjam...«. |
| **Prekliči** | gumb | – | Zapre obrazec. |

Ob uspehu: **»Veselica uspešno ustvarjena!«** in nova kartica na seznamu.

### 11.3 Brisanje

1. Klikni **smetnjak** (»Izbriši veselico«) na kartici veselice.
2. Potrdi v potrditvenem oknu brskalnika (»Ali ste prepričani, da želite izbrisati veselico …?«).
3. Ob uspehu: **»Veselica uspešno izbrisana!«** in kartica izgine.

Brisanje je trajno. Aplikacija **ne ureja** obstoječe veselice (urejanja ni). Napako popraviš z brisanjem in ponovnim ustvarjanjem. Kaj se zgodi s povezanimi podatki (naročila, srečke, želje, prijave), aplikacija ne opisuje in ne čisti.

---

## 12. Administrator: Upravljanje menija

**Naslov:** `/menu` (povezava **Upravljanje menija**). Naslov strani: **Upravljanje menija**.

- **Nova jed**: gumb zgoraj desno v kartici **»Seznam jedi«**.
- Kartica vsake jedi ima ime, opis, ceno in smetnjak (opis **»Izbriši jed«**). Brez jedi: »Ni jedi v meniju. Dodajte prvo jed!«

**Obrazec »Dodaj novo jed«** (križec **Zapri** zgoraj desno)

| Element | Vrsta | Obvezno | Opomba |
|---|---|:-:|---|
| **Ime jedi \*** (ograda »npr. Pizza Margherita«) | besedilo | da | |
| **Cena (€) \*** (ograda »0.00«) | število | da | |
| **Na voljo** | potrditveno polje (»Jed je na voljo za naročilo«) | ne | Samo jedi z oznako »Na voljo« se pokažejo uporabnikom. |
| **Opis jedi** (ograda »Dodajte opis jedi...«) | večvrstično polje | ne | |
| **Dodaj jed** | gumb (pošlji) | – | Med pošiljanjem »Dodajam...«. |
| **Prekliči** | gumb | – | |

Ob uspehu: **»Jedi uspešno dodana!«**. Brisanje (smetnjak, po potrditvi): **»Jedi uspešno izbrisana!«**.

> Naročilo se poveže z jedjo po **imenu**, zato naj bodo imena jedi unikatna.

---

## 13. Administrator: Glasba

**Naslov:** `/glasba` (povezava **Glasba**). Naslov strani: **Upravljanje glasbenih želja**. Zgoraj levo je gumb **Nazaj na profil**.

- Kartica **»Najbolj priljubljene pesmi«** (značka »Top glasbene želje«): lestvica pesmi po glasovih, gumb **Nova pesem** zgoraj desno. Brez želj: »Še ni glasbenih želja.«
- Kartica **»Vse glasbene želje po veselici«**: želje, združene po veselicah.
- Pri vsaki želji sta ikoni **Ponastavi glasove** (po potrditvi: **»Glasovi uspešno ponastavljeni!«**) in **Izbriši željo** (po potrditvi: **»Glasbena želja uspešno izbrisana!«**).

**Obrazec »Dodaj novo pesem«** (križec **Zapri**)

| Element | Vrsta | Obvezno |
|---|---|:-:|
| **Ime pesmi \*** (ograda »npr. Bohemian Rhapsody«) | besedilo | da |
| **Na kateri veselici \*** | spustni seznam (»Izberite veselico...«) | da |
| **Izvajalec** (ograda »npr. Queen«) | besedilo | ne |
| **Dodaj pesem** | gumb (med pošiljanjem »Dodajam...«) | – |
| **Prekliči** | gumb | – |

Ob uspehu: **»Glasbena želja uspešno ustvarjena!«**. Napake: »Vnesite ime pesmi.«, »Izberite veselico.«

---

## 14. Administrator: Upravljanje nagrad

**Naslov:** `/prizes` (povezava **Upravljanje nagrad**). Naslov strani: **Upravljanje nagrad**. Zgoraj levo je **Nazaj na profil**.

- Kartica **»Seznam nagrad«** (značka »Admin panel«) z gumbom **Nova nagrada** zgoraj desno. Brez nagrad: »Ni nagrad. Dodajte prvo nagrado!«
- Na kartici nagrade sta ikoni **Uredi** (svinčnik) in **Izbriši** (smetnjak; po potrditvi: **»Nagrada uspešno izbrisana!«**).

**Obrazec »Dodaj novo nagrado«** (križec **Zapri**)

| Element | Vrsta | Obvezno | Opomba |
|---|---|:-:|---|
| **Ime nagrade \*** (ograda »npr. Velika nagrada«) | besedilo | da | |
| **Verjetnost (0.01 - 1.0) \*** (ograda »0.10«) | število | da | Mora biti med 0 in 1, sicer **»Verjetnost mora biti med 0 in 1.«** |
| **Veselica \*** | spustni seznam (»Izberite veselico«) | da | |
| **Dodaj nagrado** | gumb (med pošiljanjem »Dodajam...«) | – | |
| **Prekliči** | gumb | – | |

Ob uspehu: **»Nagrada uspešno ustvarjena!«**.

**Urejanje:** klik na **Uredi** na kartici nagrade odpre kartico **»Uredi nagrado«** s poljema **Ime nagrade \*** in **Verjetnost (0.01 - 1.0) \***. Gumb **Posodobi** shrani (**»Nagrada uspešno posodobljena!«**), **Prekliči** zavrže spremembe.

---

## 15. Administrator: Upravljanje žrebanj

**Naslov:** `/draws` (povezava **Upravljanje žrebanj**). Naslov strani: **Upravljanje žrebanj**. Zgoraj levo je **Nazaj na profil**.

- Kartica **»Seznam žrebanj«** z gumbom **Novo žrebanje** zgoraj desno. Brez žrebanj: »Ni žrebanj. Ustvarite prvo žrebanje!«
- Pri vsaki kartici žrebanja sta ikoni **Prikaži zmagovalce** (odpre seznam zmagovalcev; če še ni nobenega, piše »Ni zmagovalcev – Žrebanje še ni bilo izvedeno ali ni bilo srečk.«) in **Izbriši** (po potrditvi: **»Žrebanje uspešno izbrisano!«**).

**Obrazec »Ustvari novo žrebanje«** (križec **Zapri**)

| Element | Vrsta | Obvezno |
|---|---|:-:|
| **Veselica \*** (»Izberite veselico za žrebanje«) | spustni seznam (»Izberite veselico«) | da |
| **Ustvari žrebanje** | gumb (med pošiljanjem »Ustvarjam...«) | – |
| **Prekliči** | gumb | – |

Ob uspehu: **»Žrebanje uspešno ustvarjeno!«**. Ob ustvarjanju se žrebanje izvede takoj. Žrebanje lahko ustvari samo administrator.

---

## 16. Obvestila (Toastify)

Rezultat vsakega dejanja se prikaže kot pojavno obvestilo (Toastify). Zeleno je uspeh, rdeče napaka. Obvestilo izgine samo. Pomembnejša obvestila so navedena pri posameznih funkcijah zgoraj, dodatna:

| Obvestilo | Kdaj |
|---|---|
| Nimate dostopa do te strani. | Navaden uporabnik odpre administratorsko stran. |
| Neuspešno pridobivanje podatkov o uporabniku. | Seja je potekla ali je ni. Vmesnik odpre `/login`. |
| Izberite vsaj eno jed za naročilo. | Oddaja naročila s prazno košarico. |
| Vnesite ime pesmi. / Vnesite izvajalca. | Nakup srečke z nepopolno glasbeno željo. |

---

# Del B – Tehnični opis

## 17. Arhitektura

Aplikacija je sestavljena iz mikrostoritev. Frontend jih kliče neposredno (CORS) prek `fetch` z `credentials: "include"`.

| Storitev | Mapa | Tehnologija | Vrata | Baza |
|---|---|---|:-:|---|
| Frontend | `Frontend/frontend_user` | Next.js 16, React | 3000 | – |
| Uporabniška storitev | `Storitev_uporabniskega_sistema` | FastAPI | 8002 | MongoDB (`user-mongo`) |
| Storitev za hrano | `Soritev_narocanja_hrane` | FastAPI | 8001 | MongoDB (`food-mongo`) |
| Storitev glasbenih želja | `Storitev_glasbenih_zelj` | FastAPI | 8004 | MongoDB (`music-mongo`) |
| Srečke, nagrade, žrebanja | `srecke/webserver` | Express, Mongoose | 9001 | MongoDB (`srecke_mongo`) |
| Izgubljeni predmeti | `izgubljeni_predmeti/webserver` | Express | 9000 | MongoDB (`izgubljeni_predmeti_mongo`) |
| Dnevniška storitev | `logging_service` | FastAPI | 8005 | MongoDB (`logging-mongo`), RabbitMQ |
| Statistika | `statistika_service` | PostgreSQL | – | Ni v `docker-compose.yml` |
| RabbitMQ | – | RabbitMQ | 5672, 15672 | – |

Dnevniki: vsaka storitev pošlje zapis v RabbitMQ. `logging_service` ga prebere in shrani v MongoDB. Vsak zahtevek nosi glavo **`X-Correlation-ID`**, po kateri je mogoče slediti klicu čez več storitev.

## 18. Zagon sistema

```bash
# v korenu projekta (potrebna datoteka .env)
docker compose up -d --build
```

Nato:

| Naslov | Namen |
|---|---|
| http://localhost:3000 | Frontend |
| http://localhost:8002/docs | Swagger uporabniške storitve |
| http://localhost:8001/docs | Swagger storitve za hrano |
| http://localhost:8004/docs | Swagger storitve glasbenih želja |
| http://localhost:15672 | Upravljalnik RabbitMQ |

Podrobna navodila so v dokumentu `Navodila_za_vzpostavitev.docx`.

## 19. Avtentikacija in seje

- Prijava (`POST /uporabnik/prijava`) vrne **dostopni žeton** (JWT, HS256, velja 30 minut), **osveževalni žeton** (7 dni) in podatke uporabnika. Odgovor nikoli ne vsebuje gesla.
- Strežnik postavi tudi **piškotek `session_token`** (HttpOnly, približno 24 ur). Frontend po piškotku pridobi podatke o uporabniku prek `GET /uporabnik/prijavljen`.
- Gesla so zgoščena z Argon2.
- Ostale storitve prejmejo dostopni žeton v glavi `Authorization: Bearer <žeton>` in ga same preverijo.
- Odjava (`POST /uporabnik/odjava`) izbriše sejo in žeton doda na črni seznam.
- Pot `/` v frontendu preusmeri na `/login`, če v `localStorage` ni ključa `authToken`.

## 20. API: uporabniška storitev (8002)

| Metoda | Pot | Opis | Dostop |
|---|---|---|---|
| POST | `/uporabnik/registracija` | Registracija (`uporabnisko_ime`, `email`, `geslo`, neobvezno `ime`, `priimek`). 400 pri podvojenem imenu ali e-pošti. | javno |
| POST | `/uporabnik/prijava` | Prijava (`uporabnisko_ime_ali_email`, `geslo`). 401 pri napačnih podatkih. | javno |
| POST | `/auth/refresh` | Nov dostopni žeton iz osveževalnega. | javno |
| POST | `/auth/verify-token` | Preveri žeton. | javno |
| POST | `/uporabnik/odjava` | Odjava, izbris seje. | prijavljen |
| GET | `/uporabnik/prijavljen` | Podatki prijavljenega uporabnika. | prijavljen |
| GET | `/uporabniki` | Seznam uporabnikov. | prijavljen |
| PUT | `/uporabnik/posodobi-uporabnika` | Sprememba uporabniškega imena ali e-pošte. | prijavljen |
| DELETE | `/uporabnik/izbrisi-racun` | Brisanje lastnega računa. | prijavljen |
| DELETE | `/uporabnik/izbrisi-racun/{uporabnisko_ime}` | Brisanje tujega računa. | administrator |
| POST | `/veselice` | Ustvari veselico (`cas`, `lokacija`, `ime_veselice`, `max_udelezencev`, `starost_za_vstop`, `opis_dogodka`). | administrator (403 sicer) |
| GET | `/veselice` | Seznam veselic. | prijavljen |
| GET | `/veselice/{id}` | Podrobnosti (404 »Veselica ne obstaja«). | prijavljen |
| POST | `/veselice/{id}/prijava` | Prijava na veselico (400 pri že prijavljenem ali polni veselici). | prijavljen |
| POST | `/veselice/{id}/odjava` | Odjava z veselice. | prijavljen |
| DELETE | `/veselice/{id}` | Trajno brisanje (404 pri neobstoječi, 403 pri navadnem uporabniku). | administrator |

Starostna omejitev je privzeto 18. `max_udelezencev = 0` pomeni brez omejitve. `PUT /veselice/{id}` **ni implementiran**.

## 21. API: storitev za hrano (8001)

| Metoda | Pot | Opis |
|---|---|---|
| GET | `/menu` | Meni. Neobvezni parameter `veselica_id` vrne jedi te veselice in splošne jedi. |
| POST | `/menu` | Doda jed (`name`, `description`, `price`, `available`, `veselica_id`). |
| DELETE | `/menu/{id}` | Izbriše jed. |
| POST | `/orders` | Ustvari naročilo. |
| GET | `/orders` | Vsa naročila. |
| GET | `/orders/user/{user_id}` | Naročila uporabnika (po uporabniškem imenu). |
| GET | `/orders/user/{user_id}/paid` | Ali ima uporabnik plačana naročila. |
| POST | `/orders/{id}/status` | Spremeni stanje naročila. |
| POST | `/orders/{id}/pay` | Plačilo (znesek ne sme biti manjši od cene). |
| DELETE | `/orders/{id}` | Izbriše naročilo. |

**Pravila za `POST /orders`:**

- Zahteva žeton. Uporabnik se vzame iz žetona (vrednost `user_id` v telesu se prepiše).
- Uporabnik mora biti prijavljen na veselico, sicer **400** »User is not registered to any veselica«. Veselica se vzame iz uporabnikovih podatkov.
- Vsaka postavka `item_id` je **ime jedi**. Neobstoječa jed vrne **404**.
- Skupna cena se izračuna na strežniku iz cen v meniju.
- Odgovor: `id`, `total_price`, `user_id`, `id_veselica`.

## 22. API: storitev glasbenih želja (8004)

| Metoda | Pot | Opis | Dostop |
|---|---|---|---|
| GET | `/music/requests/veselica/{id_veselica}` | Želje veselice | javno |
| GET | `/music/requests` | Vse želje | – |
| GET | `/music/requests/top` | Najbolj priljubljene | – |
| POST | `/music/requests` | Nova želja (`song_name`, `artist`, `id_veselica`). 422 pri manjkajočem `song_name`. | žeton |
| POST | `/music/requests/{id}/vote` | Glas za željo | žeton |
| PUT | `/music/requests/{id}` | Urejanje želje | – |
| PUT | `/music/requests/{id}/reset_votes` | Ponastavi glasove | – |
| DELETE | `/music/requests/{id}` | Izbriše željo | – |
| DELETE | `/music/requests` | **Izbriše vse želje.** Previdno! | – |

## 23. API: srečke, nagrade in žrebanja (9001)

| Metoda | Pot | Opis | Dostop |
|---|---|---|---|
| POST | `/tickets` | Kupi srečko (`veselica_id`) | žeton |
| POST | `/ticketsAndMusicRequest` | Kupi srečko in odda glasbeno željo (`veselica_id`, `songName`, `artist`) | žeton |
| GET | `/tickets` | Vse srečke | žeton |
| PUT | `/tickets/{id}` | Spremeni srečko | žeton |
| DELETE | `/tickets/{id}` | Izbriše srečko | žeton |
| GET | `/prizes` | Vse nagrade | javno |
| GET | `/prizes/{id}` | Nagrade veselice | javno |
| POST | `/prizes` | Nova nagrada | žeton |
| PUT | `/prizes/{id}` | Posodobi nagrado | žeton |
| DELETE | `/prizes/{id}` | Izbriše nagrado | žeton |
| GET | `/draws` | Vsa žrebanja | javno |
| POST | `/draws/{id_veselica}` | Ustvari in izvede žrebanje | administrator |
| GET | `/draws/{id}/winners` | Zmagovalci | žeton |
| DELETE | `/draws/{id}` | Izbriše žrebanje | žeton |

## 24. API: izgubljeni predmeti (9000)

| Metoda | Pot | Opis |
|---|---|---|
| POST | `/lost` | Prijava izgubljenega predmeta |
| GET | `/lost`, `/lost/{id}` | Seznam in podrobnosti |
| PUT | `/lost/{id}` | Posodobi |
| DELETE | `/lost/{id}` | Izbriše (le lastnik) |
| POST | `/found` | Prijava najdenega predmeta (`name`, `description`, `veselica_id`). Odgovor 201 z `foundItem`. |
| GET | `/found`, `/found/{id}` | Seznam in podrobnosti |
| PUT | `/found/{id}` | Posodobi |
| DELETE | `/found/{id}` | Izbriše (tuj uporabnik dobi 403) |
| POST | `/foundAndOrderFood` | Najdba in brezplačno naročilo jedi (glej spodaj) |

Vsi klici zahtevajo žeton. Brez njega vrne strežnik 401.

## 25. Sestavljeni klici med storitvami

**`POST /ticketsAndMusicRequest`** (srecke_web)

1. Ustvari srečko v bazi srečk.
2. Pokliče `POST /music/requests` v storitvi glasbenih želj.
3. Vrne `ticket` in `musicRequestResponse`.

**`POST /foundAndOrderFood`** (izgubljeni_predmeti_web)

1. Shrani najden predmet.
2. Pokliče storitev za hrano, ki ustvari naročilo izbrane jedi s stanjem **Darilo**, plačano.
3. Odgovor 201 vsebuje `foundItem` in `foodOrderResponse`. Če naročila ni mogoče ustvariti (na primer neobstoječa jed), je predmet vseeno shranjen, `foodOrderResponse` pa je `null`.

## 26. Samodejni testi (Playwright)

Mapa `e2e/` vsebuje teste za pet glavnih scenarijev:

| Datoteka | Scenarij |
|---|---|
| `specs/01-prijava.spec.ts` | TC-PRIJAVA-001 Prijava uporabnika |
| `specs/02-ustvarjanje-veselice.spec.ts` | TC-VESELICA-001 Ustvarjanje veselice |
| `specs/03-glasbena-zelja.spec.ts` | TC-GLASBA-001 Oddaja glasbene želje |
| `specs/04-brisanje-veselice.spec.ts` | TC-VESELICA-101 Brisanje veselice |
| `specs/05-narocanje-hrane.spec.ts` | TC-HRANA-001 Naročevanje hrane |

Zagon:

```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

Podrobnosti so v `e2e/README.md`.

## 27. Znane omejitve in opažanja

- **Ni urejanja veselice.** `PUT /veselice/{id}` ni implementiran.
- **Brisanje veselice ne čisti povezanih podatkov** (naročila, srečke, želje, prijave). Dejansko stanje po brisanju ni dokumentirano.
- **Glasbena želja brez srečke** v vmesniku ni mogoča: funkcija v kodi obstaja, a nima gumba.
- **Odjava v vmesniku ne razveljavi dostopnega žetona** (žeton ostane veljaven do poteka).
- **Nekateri klici nimajo preverjanja vloge** (na primer brisanje in posodabljanje nagrad, brisanje glasbenih želj), kar pomeni, da jih lahko pokliče vsak prijavljen uporabnik prek API-ja.
- **Verjetnost nagrad pri žrebanju** ne vpliva na izid na način, ki bi ga vmesnik obljubljal (glej kodo žrebanja).
- **`statistika_service` ni v `docker-compose.yml`.** Blok »Statistika API klicev« na profilu brez nje pokaže napako.
- **Povezava med naročilom in jedjo je po imenu**, zato dve jedi z enakim imenom povzročita nedoločeno obnašanje.
- **Ena prijava na veselico na uporabnika v podatkih naročila:** naročilo se poveže z veselico, ki je zapisana pri uporabniku.
