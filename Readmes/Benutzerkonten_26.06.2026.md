# Wortwerk 0.6.2 - Offline-Benutzerkonten

**Stand:** 26.06.2026  
**Vorheriger Stand:** `Erweiterte_Karten_25.06.2026.md`  
**Aenderungsschwerpunkt:** Einfaches lokales Benutzerkonto mit Benutzername und Passwort

## Ziel dieses Entwicklungsschritts

In diesem Entwicklungsschritt wurde Wortwerk um ein einfaches Offline-Benutzerkonto erweitert.
Die App soll weiterhin ohne Server, ohne Datenbank im Internet und ohne Login-Dienst funktionieren.
Trotzdem soll beim Oeffnen der App zuerst ein Benutzername und ein Passwort verlangt werden.

Das Ergebnis ist eine lokale Kontosperre:

- Beim ersten Start wird ein lokales Konto angelegt.
- Danach muss man sich mit dem Passwort anmelden.
- Das Konto gilt nur fuer diesen Browser auf diesem Geraet.
- Die App bleibt nach dem ersten Laden weiterhin offline nutzbar.
- GitHub Pages reicht weiterhin als Hosting aus.

Wichtig: Dieses Konto ist kein echtes Online-Konto. Es gibt keine Registrierung auf einem Server,
keine Cloud-Synchronisierung und keine zentrale Passwort-Wiederherstellung. Das passt bewusst zur
aktuellen Architektur von Wortwerk als lokale Offline-PWA.

## Ergebnis fuer Nutzerinnen und Nutzer

Beim ersten Oeffnen erscheint ein Sperrbildschirm mit:

- Benutzername,
- neuem Passwort,
- Passwort-Wiederholung,
- Hinweis, dass das Konto nur lokal gilt.

Nach dem Anlegen wird die App entsperrt und kann wie gewohnt benutzt werden.

Bei spaeteren Starts erscheint ein Anmeldeformular:

- Der gespeicherte Benutzername ist sichtbar.
- Das Passwort muss eingegeben werden.
- Erst danach wird die Wortwerk-Oberflaeche freigegeben.

In der Ansicht `Datensicherheit` gibt es jetzt zusaetzlich einen Bereich `Lokales Konto`.
Dort kann man:

- sehen, welches lokale Konto aktiv ist,
- erkennen, dass PBKDF2 fuer den Passwort-Hash verwendet wird,
- das Passwort aendern,
- sich abmelden.

## Was genau geaendert wurde

Betroffene Dateien:

```text
index.html
app.js
styles.css
pwa.js
service-worker.js
Readmes/Benutzerkonten_26.06.2026.md
```

Die eigentliche Kontologik befindet sich in `app.js`.
Das neue Aussehen des Sperrbildschirms befindet sich in `styles.css`.
Die Versionsnummern und Cache-Pfade wurden in `index.html`, `pwa.js` und `service-worker.js`
auf `0.6.2` angehoben.

## Warum die Version auf 0.6.2 gesetzt wurde

Wortwerk ist eine PWA. Das bedeutet: Browser und Service Worker duerfen Dateien lokal zwischenspeichern.
Wenn man nur `app.js` aendert, aber die Cache-Version gleich laesst, kann es passieren, dass eine
installierte Offline-App noch eine alte Datei verwendet.

Darum wurden die Dateiverweise von:

```html
styles.css?v=0.6.1
pwa.js?v=0.6.1
app.js?v=0.6.1
```

auf:

```html
styles.css?v=0.6.2
pwa.js?v=0.6.2
app.js?v=0.6.2
```

geaendert.

Auch der Service Worker verwendet jetzt:

```js
const APP_VERSION = "0.6.2";
```

Dadurch entsteht ein neuer Cache-Name:

```text
wortwerk-app-0.6.2
```

Beim Aktivieren der neuen Version kann der alte App-Cache entfernt werden.
Die persoenlichen Vokabeldaten in IndexedDB werden dadurch nicht geloescht.

## Neue Speicher-Schluessel

Die Kontoinformation wird nicht in IndexedDB gespeichert, sondern bewusst klein und getrennt in
`localStorage`.

Neue Schluessel:

```js
const AUTH_STORAGE_KEY = "wortwerk-local-account-v1";
const AUTH_SESSION_KEY = "wortwerk-local-account-session";
```

### `AUTH_STORAGE_KEY`

Dieser Schluessel liegt in `localStorage`.
Er enthaelt den dauerhaften lokalen Kontodatensatz.

Beispielhaft sieht die Struktur so aus:

```json
{
  "username": "Piet",
  "salt": "zufaelliger-salt-als-base64",
  "hash": "passwort-hash-als-base64",
  "iterations": 210000,
  "createdAt": "2026-06-26T10:00:00.000Z",
  "updatedAt": "2026-06-26T10:00:00.000Z"
}
```

Das Passwort selbst wird nicht gespeichert.
Gespeichert wird nur ein Hash.

### `AUTH_SESSION_KEY`

Dieser Schluessel liegt in `sessionStorage`.
Er merkt sich nur fuer den aktuellen Browser-Tab beziehungsweise die aktuelle Sitzung, dass der Nutzer
bereits angemeldet ist.

Beim Abmelden wird dieser Schluessel entfernt.
Beim neuen Oeffnen der App muss man sich wieder anmelden, wenn keine gueltige Sitzung mehr vorhanden ist.

## Passwortspeicherung: kein Klartext

Eine sehr wichtige Entscheidung ist:

```text
Das Passwort wird nicht im Klartext gespeichert.
```

Stattdessen wird ein Passwort-Hash erzeugt.
Dafuer verwendet Wortwerk die Web-Crypto-API des Browsers:

```js
crypto.subtle
```

Konkret wird PBKDF2 mit SHA-256 verwendet:

```js
{
  name: "PBKDF2",
  salt: base64ToBytes(salt),
  iterations,
  hash: "SHA-256"
}
```

Die Anzahl der Runden lautet:

```js
const PASSWORD_HASH_ITERATIONS = 210000;
```

Das bedeutet: Aus dem Passwort wird nicht einfach einmal schnell ein Hash gebildet.
Stattdessen wird die Ableitung absichtlich viele Male berechnet.
Das macht das Erraten von Passwoertern deutlich langsamer.

## Was ist ein Salt?

Ein Salt ist ein zufaelliger Zusatzwert.
Beim Anlegen eines Kontos erzeugt Wortwerk 16 zufaellige Bytes:

```js
function createPasswordSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}
```

Dieser Salt wird zusammen mit dem Passwort in die Hash-Funktion gegeben.
Dadurch bekommen zwei gleiche Passwoerter nicht automatisch den gleichen gespeicherten Hash,
wenn unterschiedliche Salts verwendet werden.

Das ist wichtig, weil man gespeicherte Passwort-Hashes dadurch schlechter vergleichen oder mit
vorberechneten Tabellen angreifen kann.

## Warum Base64?

Crypto-Funktionen arbeiten oft mit Bytes.
`localStorage` speichert aber nur Text.

Darum gibt es zwei Hilfsfunktionen:

```js
function bytesToBase64(bytes) { ... }
function base64ToBytes(value) { ... }
```

Sie wandeln Byte-Arrays in Text und wieder zurueck.

Verwendet wird das fuer:

- den Salt,
- den Passwort-Hash.

## Passwort pruefen

Beim Login wird das eingegebene Passwort nicht mit einem gespeicherten Passwort verglichen.
Stattdessen passiert Folgendes:

1. Der gespeicherte Kontodatensatz wird gelesen.
2. Der gespeicherte Salt wird genommen.
3. Aus dem eingegebenen Passwort wird mit demselben Salt ein neuer Hash berechnet.
4. Dieser neue Hash wird mit dem gespeicherten Hash verglichen.

Die Pruefung steckt in:

```js
async function verifyPassword(password, record) {
  if (!record) return false;
  const candidateHash = await hashPassword(password, record.salt, record.iterations);
  return constantTimeEqual(candidateHash, record.hash);
}
```

## Warum `constantTimeEqual`?

Normale String-Vergleiche koennen theoretisch minimal unterschiedlich lange dauern,
je nachdem an welcher Stelle zwei Texte verschieden sind.

Fuer diese einfache Offline-App ist das kein grosses Risiko, aber es ist trotzdem eine gute Gewohnheit,
Passwort-Hashes nicht mit einem ganz normalen `===` zu vergleichen.

Darum gibt es:

```js
function constantTimeEqual(first, second) {
  if (typeof first !== "string" || typeof second !== "string" || first.length !== second.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return mismatch === 0;
}
```

Die Funktion laeuft durch den ganzen Text und bricht nicht beim ersten Unterschied ab.

## Startablauf der App

Vorher wurde am Ende von `app.js` direkt gespeichert, gerendert und das Ready-Event gesendet.

Jetzt gibt es dazwischen eine Konto-Sperre:

```js
await initializeAccountGate();
await saveData();
render();
dispatchAppReadyOnce();
```

Das bedeutet:

1. Die App laedt zuerst Daten und Logik wie bisher.
2. Dann wird geprueft, ob ein Konto existiert.
3. Wenn kein Konto existiert, erscheint der Setup-Bildschirm.
4. Wenn ein Konto existiert, erscheint der Login-Bildschirm.
5. Erst nach erfolgreicher Anmeldung wird die eigentliche App sichtbar.

## Warum `auth-pending` im `body`?

In `index.html` steht jetzt:

```html
<body class="auth-pending">
```

Diese Klasse sorgt dafuer, dass die normale App-Oberflaeche zuerst versteckt ist.

In `styles.css`:

```css
body.auth-pending .app-shell {
  visibility: hidden;
  pointer-events: none;
}
```

Dadurch kann man die App nicht schon bedienen, bevor die Anmeldung abgeschlossen ist.
Der Sperrbildschirm liegt sichtbar darueber.

Wenn die Anmeldung erfolgreich ist, entfernt `unlockApp` diese Klasse:

```js
function unlockApp(record) {
  state.authUser = {
    username: record.username,
    createdAt: record.createdAt,
  };
  document.body.classList.remove("auth-pending");
  document.body.classList.add("auth-ready");
  document.querySelector("#authOverlay")?.remove();
}
```

## Das Konto-Overlay

Das Login, das Konto-Anlegen und das Passwort-Aendern verwenden dieselbe Render-Funktion:

```js
function renderAuthOverlay(mode = "login", message = "") { ... }
```

Der Parameter `mode` entscheidet, welches Formular angezeigt wird.

Moegliche Modi:

```text
setup
login
change
```

### `setup`

Wird verwendet, wenn noch kein Konto existiert.

Das Formular enthaelt:

- Benutzername,
- neues Passwort,
- Passwort wiederholen.

Beim Absenden wird:

1. der Benutzername geprueft,
2. das Passwort geprueft,
3. ein Salt erzeugt,
4. der Passwort-Hash erzeugt,
5. der Kontodatensatz gespeichert,
6. die App entsperrt.

### `login`

Wird verwendet, wenn bereits ein lokales Konto existiert.

Das Formular enthaelt:

- Benutzername als sichtbares, schreibgeschuetztes Feld,
- Passwort.

Beim Absenden wird der Hash des eingegebenen Passworts berechnet und mit dem gespeicherten Hash
verglichen.

### `change`

Wird verwendet, wenn in `Datensicherheit` das Passwort geaendert wird.

Das Formular enthaelt:

- aktuelles Passwort,
- neues Passwort,
- neues Passwort wiederholen.

Nur wenn das aktuelle Passwort korrekt ist, wird ein neuer Kontodatensatz geschrieben.

## Formularverarbeitung

Alle drei Modi laufen ueber:

```js
async function handleAuthSubmit(event) { ... }
```

Diese Funktion:

- verhindert das normale HTML-Formular-Absenden,
- liest die Eingaben mit `FormData`,
- deaktiviert kurz den Submit-Button,
- zeigt Statusmeldungen an,
- fuehrt je nach Modus die richtige Aktion aus,
- aktiviert den Button am Ende wieder.

Der zentrale Aufbau:

```js
const mode = form.dataset.authMode;
```

Dadurch weiss die Funktion, ob gerade ein Konto angelegt, ein Login versucht oder ein Passwort
geaendert wird.

## Passwortregeln

Fuer neue Passwoerter gilt:

```text
mindestens 8 Zeichen
beide Passwortfelder muessen gleich sein
```

Die Pruefung liegt in:

```js
function validateNewPassword(password, confirmPassword) {
  if (password.length < 8) {
    throw new Error("Das Passwort muss mindestens 8 Zeichen lang sein.");
  }
  if (password !== confirmPassword) {
    throw new Error("Die beiden Passwoerter stimmen nicht ueberein.");
  }
}
```

Fuer den normalen Login ist die Mindestlaenge im Formular auf `1` gesetzt, damit auch alte oder
kuerzere Passwoerter technisch geprueft werden koennten. Beim aktuellen Setup werden aber neue
Passwoerter mit mindestens 8 Zeichen verlangt.

## Sitzungslogik

Nach erfolgreicher Anmeldung wird eine Sitzungsmarke in `sessionStorage` geschrieben:

```js
function rememberAuthSession(record) {
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, sessionKeyFor(record));
  } catch {
    // Ohne Session-Speicher muss beim Neuladen erneut angemeldet werden.
  }
}
```

Die Sitzungsmarke besteht aus:

```js
function sessionKeyFor(record) {
  return `${record.username}:${record.hash}`;
}
```

Das bedeutet:

- Wenn das Passwort geaendert wird, aendert sich der Hash.
- Dadurch wird auch die Sitzungsmarke ungueltig.
- Nach dem Passwortwechsel wird eine neue gueltige Sitzung gespeichert.

## Abmelden

In der Datensicherheit gibt es jetzt einen Button:

```html
data-action="logout"
```

Die Aktion ist in `handleAction` verdrahtet:

```js
logout: lockApp,
```

`lockApp` macht Folgendes:

```js
function lockApp() {
  clearAuthSession();
  state.study = null;
  closeDialog(elements.deckModal);
  closeDialog(elements.cardModal);
  closeDialog(elements.importPreviewModal);
  document.body.classList.add("auth-pending");
  document.body.classList.remove("auth-ready");
  renderAuthOverlay("login");
}
```

Damit wird:

- die Sitzung geloescht,
- ein eventuell laufender Lernmodus beendet,
- offene Dialoge werden geschlossen,
- die App wird wieder gesperrt,
- das Login-Formular wird angezeigt.

## Neuer Bereich in `Datensicherheit`

Die Ansicht `Datensicherheit` wurde erweitert.
In `renderSecurity` wird jetzt der Kontodatensatz gelesen:

```js
const account = readAuthRecord();
```

Danach wird in der Zusammenfassung eine Konto-Kachel angezeigt:

```js
${securitySummaryCard("Konto", account?.username ?? "Lokal", "user")}
```

Ausserdem wird ein neues Panel gerendert:

```js
${renderAccountPanel(account)}
```

Dieses Panel zeigt:

- Benutzername,
- Hinweis auf lokale Speicherung,
- Erstelldatum,
- PBKDF2-Information,
- Button `Passwort aendern`,
- Button `Abmelden`.

## Neue Icons

In der zentralen Icon-Funktion wurden neue Symbole ergaenzt:

```text
key
lock
logout
user
```

Diese Icons werden fuer Login, Passwortwechsel, Kontoanzeige und Abmelden verwendet.

## Neues CSS fuer den Sperrbildschirm

Der Sperrbildschirm besteht aus:

```css
.auth-overlay
.auth-card
.auth-brand
.auth-brand-mark
.auth-copy
.auth-note
.auth-status
.auth-actions
```

Die wichtigsten Aufgaben:

- Overlay ueber die ganze App legen,
- Formular mittig anzeigen,
- Wortwerk-Designfarben verwenden,
- Fehlermeldungen sichtbar machen,
- auf kleinen Bildschirmen gut bedienbar bleiben.

Auf kleinen Bildschirmen wird das Formular etwas kompakter:

```css
@media (max-width: 620px) {
  .auth-overlay {
    align-items: start;
    padding: 16px;
  }

  .auth-card {
    margin-top: 8px;
    padding: 22px;
  }

  .auth-actions {
    flex-direction: column-reverse;
  }

  .auth-actions .button {
    width: 100%;
  }
}
```

So passen die Buttons auch auf Smartphones sauber in die Breite.

## Neues CSS fuer den Kontobereich

Fuer das Panel in `Datensicherheit` wurden ergaenzt:

```css
.account-panel
.account-meta
.account-actions
```

Damit werden die Konto-Metadaten als kleine Chips dargestellt und die Aktionen koennen umbrechen,
wenn der Bildschirm schmal ist.

## Was bewusst nicht gemacht wurde

Diese Version baut kein echtes Online-Benutzerkonto.

Nicht enthalten sind:

- keine Registrierung auf einem Server,
- keine Anmeldung ueber E-Mail,
- keine Passwort-Zuruecksetzen-Funktion,
- keine Synchronisierung zwischen Geraeten,
- keine getrennten Cloud-Profile,
- keine serverseitige Berechtigungspruefung.

Der Grund ist die aktuelle Plattform:

```text
GitHub Pages liefert nur statische Dateien aus.
```

GitHub Pages kann keine privaten Benutzer pruefen, keine Passwoerter serverseitig validieren und keine
persoenlichen Daten pro Konto speichern.

Fuer echte Online-Konten braeuchte Wortwerk spaeter zusaetzlich ein Backend, zum Beispiel:

- Supabase,
- Firebase,
- eigener Server,
- Auth-Dienst plus Datenbank.

Diese Version bleibt bewusst einfach und offline.

## Wichtige Sicherheitsgrenzen

Die lokale Kontosperre schuetzt vor einfachem Oeffnen der App im gleichen Browser.
Sie ist aber keine vollstaendige Datenverschluesselung.

Das bedeutet:

- Die Vokabeldaten bleiben weiterhin lokal in IndexedDB.
- Der Kontodatensatz liegt in `localStorage`.
- Wer Zugriff auf das Browserprofil und Entwicklerwerkzeuge hat, kann lokale Daten untersuchen.
- Wer Browserdaten loescht, kann auch das lokale Konto entfernen.

Fuer eine echte Verschluesselung muessten die Lern-Daten selbst mit einem Schluessel aus dem Passwort
verschluesselt werden. Das wurde in diesem Schritt nicht umgesetzt, weil es deutlich mehr Risiko fuer
Datenverlust bringt, wenn ein Passwort vergessen wird.

## Warum diese einfache Loesung trotzdem sinnvoll ist

Fuer die aktuelle Wortwerk-App ist diese Loesung passend, weil:

- sie offline funktioniert,
- sie ohne Server auskommt,
- sie GitHub Pages kompatibel bleibt,
- sie leicht zu verstehen ist,
- sie den Einstieg in die App schuetzt,
- sie keine bestehenden Lern-Daten verschiebt,
- sie die bestehende IndexedDB-Struktur nicht zerlegt.

Damit ist sie ein guter Zwischenschritt zwischen gar keiner Sperre und einem spaeter moeglichen echten
Online-Kontosystem.

## Lernnotizen zum Code

### 1. UI-Zustand ueber Klassen steuern

Statt viele einzelne Elemente mit JavaScript zu verstecken, setzt Wortwerk eine Klasse auf `body`:

```js
document.body.classList.add("auth-pending");
```

CSS entscheidet dann, wie die App aussieht:

```css
body.auth-pending .app-shell {
  visibility: hidden;
  pointer-events: none;
}
```

Das ist sauber, weil JavaScript nur den Zustand setzt und CSS fuer die Darstellung zustaendig bleibt.

### 2. Ein Formular fuer mehrere Modi

`renderAuthOverlay` erzeugt je nach `mode` unterschiedliche Felder.
Das spart Wiederholung.

Gleichzeitig bleibt die Logik uebersichtlich:

```text
setup  -> Konto anlegen
login  -> anmelden
change -> Passwort aendern
```

### 3. Keine Passwort-Klartexte speichern

Ein Passwort gehoert nie direkt in `localStorage`, IndexedDB oder eine normale JSON-Datei.
Selbst in einer Offline-App ist ein Hash deutlich besser.

### 4. Web Crypto statt eigener Kryptografie

Wortwerk verwendet die Browser-API:

```js
crypto.subtle
```

Das ist besser als eine selbst geschriebene Hash-Funktion.
Kryptografie sollte man nicht selbst erfinden.

### 5. Kleine lokale Features getrennt speichern

Die Lern-Daten liegen weiterhin in IndexedDB.
Das Konto liegt in `localStorage`.
Die Sitzung liegt in `sessionStorage`.

Diese Trennung macht die Aufgabe klar:

```text
IndexedDB      -> Lern-Daten
localStorage   -> dauerhaftes lokales Konto
sessionStorage -> aktuelle Anmeldung
```

## Testnotizen

Nach der Umsetzung wurde der lokale Testserver gestartet.
Folgende Dateien wurden erfolgreich per HTTP ausgeliefert:

```text
http://127.0.0.1:4173/index.html
http://127.0.0.1:4173/app.js?v=0.6.2
http://127.0.0.1:4173/styles.css?v=0.6.2
http://127.0.0.1:4173/service-worker.js
```

Alle Antworten kamen mit HTTP-Status `200`.

Ein vollstaendiger Browser-Klicktest konnte in dieser Umgebung nicht ausgefuehrt werden, weil kein
eingebetteter Browser fuer die Sitzung verfuegbar war und `node` im Terminal nicht installiert ist.

## Zusammenfassung

Wortwerk besitzt ab Version `0.6.2` eine einfache lokale Kontosperre.
Sie ergaenzt die bestehende Offline-App, ohne die Grundidee zu veraendern:

```text
Wortwerk bleibt lokal.
Wortwerk bleibt offline nutzbar.
Wortwerk braucht weiterhin keinen Server.
```

Das neue Konto schuetzt den Einstieg in die App auf einfache Weise und bereitet gleichzeitig eine klare
Struktur vor, falls spaeter echte Online-Konten oder verschluesselte lokale Profile entwickelt werden.
