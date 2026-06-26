# Wortwerk 0.6.3 - Offline-Mehrbenutzer

**Stand:** 26.06.2026  
**Vorheriger Stand:** `Benutzerkonten_26.06.2026.md`  
**Aenderungsschwerpunkt:** Mehrere lokale Benutzer mit eigener Lernsammlung

## Ziel dieses Entwicklungsschritts

Version `0.6.3` erweitert das einfache Offline-Konto aus Version `0.6.2` zu einem lokalen
Mehrbenutzer-System.

Wortwerk bleibt weiterhin eine Offline-PWA ohne Server. Trotzdem koennen jetzt mehrere lokale
Benutzer auf demselben Geraet angelegt und gewechselt werden.

Der wichtigste Grundsatz lautet:

```text
Jeder Benutzer bekommt seine eigene lokale Lernsammlung.
```

Das bedeutet:

- eigene Stapel,
- eigene Karten,
- eigene Lernstatistik,
- eigener Papierkorb,
- eigene Sicherungsstaende,
- eigenes Passwort.

## Ergebnis fuer Nutzerinnen und Nutzer

Oben in der Leiste wird jetzt angezeigt, wer gerade aktiv ist:

```text
Eingeloggt als Piet
```

Diese Anzeige ist gleichzeitig ein Button. Beim Anklicken erscheint der Benutzerwechsel.

Im Wechsel-Dialog kann man:

- einen vorhandenen lokalen Benutzer auswaehlen,
- das Passwort fuer diesen Benutzer eingeben,
- zu diesem Benutzer wechseln,
- ein neues lokales Konto erstellen.

Beim normalen Neuladen der App muss das Passwort nicht jedes Mal eingegeben werden, solange die
aktuelle Sitzung noch gueltig ist. Beim Wechsel zu einem anderen Benutzer wird aber das Passwort
des Zielbenutzers verlangt.

## Warum echte lokale Profile sinnvoller sind

Eine einfache Variante waere gewesen:

```text
Benutzer A und Benutzer B sehen dieselben Stapel.
```

Das waere technisch einfacher, aber fachlich schwach. Dann waere der Benutzerwechsel fast nur ein
anderer Name oben in der Leiste.

Darum wurde stattdessen diese Struktur gewaehlt:

```text
Benutzer A -> eigene Datenbank
Benutzer B -> eigene Datenbank
Benutzer C -> eigene Datenbank
```

So bleibt der Wechsel logisch: Wer den Benutzer wechselt, wechselt wirklich die Sammlung.

## Speicher-Architektur

Die bisherigen Lern-Daten lagen in:

```text
WortwerkDB
```

Diese Datenbank bleibt erhalten und wird fuer den ersten oder bestehenden Benutzer weiterverwendet.
Das ist wichtig, damit bestehende Daten nicht kopiert oder riskant migriert werden muessen.

Neue Benutzer erhalten eigene Datenbanken:

```text
WortwerkDB_<benutzer-id>
```

Beispiel:

```text
WortwerkDB
WortwerkDB_4f31a9...
WortwerkDB_9bb7c2...
```

Der erste bestehende Benutzer nutzt also weiterhin die alte Datenbank `WortwerkDB`.
Neue Benutzer starten mit einer leeren eigenen Sammlung.

## Aenderungen in `storage.js`

Vorher gab es einen festen Datenbanknamen:

```js
const DB_NAME = "WortwerkDB";
```

Jetzt gibt es einen Standardnamen und einen aktiven Datenbanknamen:

```js
const DEFAULT_DB_NAME = "WortwerkDB";
let activeDatabaseName = DEFAULT_DB_NAME;
```

Neu ist:

```js
function useDatabase(databaseName = DEFAULT_DB_NAME) { ... }
```

Diese Funktion schaltet die Speicherlogik auf eine andere IndexedDB um.
Wenn ein anderer Benutzer aktiv wird, wird die bisherige Datenbankverbindung geschlossen und die
naechste Operation oeffnet die passende Datenbank.

`initialize` akzeptiert jetzt einen dritten Parameter:

```js
initialize(fallbackData, schemaVersion, databaseName)
```

Dadurch kann `app.js` beim Start oder Benutzerwechsel sagen:

```js
Oeffne bitte die Datenbank dieses Benutzers.
```

Die Object Stores bleiben gleich:

```text
decks
cards
reviews
settings
trash
backups
meta
```

Das ist bewusst so. Dadurch musste nicht die komplette Datenstruktur mit `userId`-Feldern umgebaut
werden.

## Kontospeicher

Das alte Einzelkonto lag unter:

```js
wortwerk-local-account-v1
```

Dieser Schluessel wird weiterhin gelesen, damit bestehende Installationen automatisch uebernommen
werden koennen.

Das neue Mehrbenutzer-System speichert die Konten unter:

```js
wortwerk-local-accounts-v1
```

Die Struktur ist:

```json
{
  "version": 1,
  "accounts": [
    {
      "id": "default-user",
      "username": "Piet",
      "salt": "...",
      "hash": "...",
      "iterations": 210000,
      "databaseName": "WortwerkDB",
      "createdAt": "2026-06-26T10:00:00.000Z",
      "updatedAt": "2026-06-26T10:00:00.000Z"
    }
  ]
}
```

Das Passwort wird weiterhin nicht im Klartext gespeichert.
Gespeichert werden Salt und PBKDF2-Hash.

## Migration vom Einzelkonto

Wenn beim Start noch kein neuer Mehrbenutzer-Speicher existiert, prueft Wortwerk den alten
Einzelkonto-Schluessel:

```js
const legacyRawRecord = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
```

Wenn dort ein Konto vorhanden ist, wird daraus automatisch der erste Account im neuen Format.

Dieser erste Account bekommt:

```js
id: "default-user"
databaseName: "WortwerkDB"
```

Dadurch bleiben die bisherigen Lern-Daten an Ort und Stelle.

## Aktiven Benutzer merken

Wortwerk merkt sich den zuletzt verwendeten Benutzer in:

```js
wortwerk-local-account-last-user
```

Das ist kein Passwort und kein Sicherheitsmerkmal. Es ist nur Komfort:

```text
Beim naechsten Oeffnen wird derselbe Benutzer vorgeschlagen.
```

In Version `0.6.3` lag die aktive Sitzung noch in `sessionStorage`:

```js
wortwerk-local-account-session
```

Die Sitzungsmarke besteht jetzt aus:

```js
`${record.id}:${record.hash}`
```

Dadurch wird die Sitzung automatisch ungueltig, wenn das Passwort geaendert wird.

## Startablauf

Der neue Startablauf ist:

1. Konten aus `localStorage` lesen.
2. Altes Einzelkonto bei Bedarf in Mehrbenutzer-Struktur uebernehmen.
3. Pruefen, ob eine gueltige Sitzung vorhanden ist.
4. Wenn ja: passenden Benutzer aktivieren und seine Datenbank laden.
5. Wenn nein: Login- oder Konto-Anlegen-Dialog anzeigen.
6. Nach erfolgreicher Anmeldung Daten laden und App anzeigen.

Die zentrale Funktion ist:

```js
initializeAccountGate()
```

Der eigentliche Benutzerwechsel laeuft ueber:

```js
finishAccountActivation(record)
```

Diese Funktion:

- laedt die richtige Datenbank,
- merkt die Sitzung,
- setzt den aktiven Benutzer,
- entfernt den Sperrzustand,
- rendert die App neu.

## Benutzerwechsel

Der Benutzerwechsel wird ueber die neue Topbar-Schaltflaeche gestartet:

```html
<button class="account-switch" id="accountSwitch" type="button">
```

In `app.js` ist sie verdrahtet mit:

```js
elements.accountSwitch.addEventListener("click", openUserSwitch);
```

`openUserSwitch` oeffnet das Auth-Overlay im Login-Modus:

```js
function openUserSwitch() {
  renderAuthOverlay("login", "", state.authUser?.id ?? readLastUserId());
}
```

Im Overlay wird das alte Benutzername-Feld im Login-Modus durch eine Benutzer-Auswahl ersetzt.
Dadurch koennen vorhandene lokale Benutzer gewaehlt werden.

## Neues Konto erstellen

Im Benutzerwechsel-Dialog gibt es jetzt einen Button:

```text
Neues Konto
```

Dieser Button oeffnet den Setup-Modus:

```js
renderAuthOverlay("setup")
```

Beim Erstellen eines neuen Kontos wird geprueft:

- Benutzername muss mindestens 2 Zeichen lang sein,
- Benutzername darf lokal noch nicht existieren,
- Passwort muss mindestens 8 Zeichen lang sein,
- Passwort und Wiederholung muessen gleich sein.

Danach wird ein neuer Account gespeichert und eine neue Datenbank zugeordnet.

## Eigene Datenbank fuer neue Benutzer

Neue Benutzer bekommen eine Datenbank ueber:

```js
function userDatabaseName(userId) {
  return `WortwerkDB_${String(userId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
```

Damit entstehen sichere Datenbanknamen, auch wenn eine ID Sonderzeichen enthalten sollte.

## Fallback-Speicher bei fehlender IndexedDB

Falls IndexedDB nicht verfuegbar ist, verwendet Wortwerk weiterhin `localStorage` als Fallback.
Damit sich Benutzer auch dort nicht mischen, gibt es jetzt benutzerspezifische Fallback-Schluessel.

Der erste Benutzer verwendet weiter:

```text
wortwerk-data-v4-fallback
```

Weitere Benutzer verwenden:

```text
wortwerk-data-v4-fallback-<benutzer-id>
```

## Topbar-Anzeige

In der Topbar steht jetzt der aktive Benutzer:

```text
Eingeloggt als <Name>
```

Die Anzeige wird durch diese Funktion aktualisiert:

```js
function renderAccountChip() { ... }
```

Sie wird beim Entsperren und beim normalen Rendern der App aufgerufen.

## Geaenderte Dateien

```text
index.html
app.js
storage.js
styles.css
pwa.js
service-worker.js
Readmes/Offline_Mehrbenutzer_26.06.2026.md
```

## PWA-Version

Die App-Version wurde auf `0.6.3` gesetzt.

Aktualisiert wurden:

```text
app.js
pwa.js
service-worker.js
index.html
```

Die Cache-Dateien verwenden jetzt:

```text
styles.css?v=0.6.3
pwa.js?v=0.6.3
app.js?v=0.6.3
```

Der Service Worker verwendet:

```js
const APP_VERSION = "0.6.3";
```

Dadurch entsteht ein neuer PWA-Cache:

```text
wortwerk-app-0.6.3
```

## Sicherheitsgrenzen

Auch diese Version bleibt ein lokales Offline-System.

Das bedeutet:

- keine Serverkonten,
- keine Cloud-Synchronisierung,
- keine zentrale Passwort-Wiederherstellung,
- keine Verschluesselung der kompletten Lern-Daten,
- lokale Daten koennen mit Zugriff auf das Browserprofil weiterhin technisch untersucht werden.

Die Mehrbenutzer-Funktion trennt lokale Sammlungen praktisch und organisatorisch.
Sie ersetzt aber keine echte Betriebssystem- oder Cloud-Sicherheit.

## Zusammenfassung

Version `0.6.3` macht aus dem einfachen lokalen Konto ein lokales Mehrbenutzer-System.
Der aktive Benutzer ist oben sichtbar, neue Benutzer koennen erstellt werden, und beim Wechsel muss
das passende Passwort eingegeben werden.

Die bestehende Sammlung bleibt beim ersten Benutzer erhalten.
Neue Benutzer bekommen eigene, getrennte lokale Datenbanken.

## Nachtrag: Wortwerk 0.6.4 - Angemeldet bleiben

Nach dem ersten Mehrbenutzer-Test wurde die Sitzungslogik angepasst.
In Version `0.6.3` lag die aktive Anmeldung in `sessionStorage`.
Das fuehrte dazu, dass Wortwerk nach dem Schliessen der App oder des Browsers wieder ein Passwort
verlangte.

Ab Version `0.6.4` wird die aktive lokale Sitzung in `localStorage` gespeichert:

```js
localStorage.setItem(AUTH_SESSION_KEY, sessionKeyFor(record));
```

Dadurch bleibt der aktuelle Benutzer angemeldet, bis er sich bewusst abmeldet.

Beim Abmelden wird die Sitzung entfernt:

```js
localStorage.removeItem(AUTH_SESSION_KEY);
sessionStorage.removeItem(AUTH_SESSION_KEY);
```

Beim Passwortwechsel wird eine neue Sitzungsmarke geschrieben, weil sich der gespeicherte
Passwort-Hash aendert.

Die Sicherheitslogik bleibt damit:

- App schliessen und wieder oeffnen: aktueller Benutzer bleibt angemeldet.
- Benutzer wechseln: Passwort des Zielbenutzers wird verlangt.
- Abmelden: danach ist die App wieder gesperrt.
- Passwort aendern: alte Sitzung wird durch neue Sitzung ersetzt.

Fuer die PWA wurde die Version auf `0.6.4` gesetzt:

```text
styles.css?v=0.6.4
pwa.js?v=0.6.4
app.js?v=0.6.4
wortwerk-app-0.6.4
```
