# Wortwerk 0.5.1 – Installierbare Offline-Desktop-App

**Stand:** 25.06.2026  
**Vorheriger Stand:** `Lokale_Datensicherheit_24.06.2026.md`

## Ziel dieses Entwicklungsschritts

Wortwerk wurde als installierbare Progressive Web App (PWA) vervollständigt.
Die Anwendung kann dadurch in einem unterstützten Desktop-Browser installiert
und anschließend wie ein eigenes Programm über ein App-Symbol gestartet werden.
Der im Betriebssystem angezeigte App-Name lautet schlicht `Wortwerk`.

Nach dem ersten vollständigen Laden stehen die Oberfläche, Programmlogik,
Schriften und Symbole auch ohne Internetverbindung zur Verfügung. Die
Vokabeldaten bleiben weiterhin lokal auf dem jeweiligen Gerät gespeichert.

Diese Ausbaustufe ist eine Desktop-App auf PWA-Basis. Sie ist noch kein
klassisches Windows-Installationspaket im Format `.exe` oder `.msi`.

## Ergebnis für Nutzerinnen und Nutzer

Nach der Installation besitzt Wortwerk:

- ein eigenes Wortwerk-Symbol,
- einen Eintrag im Windows-Startmenü,
- ein separates App-Fenster ohne normale Browser-Navigation,
- vollständige Offline-Nutzung nach dem ersten Laden,
- lokale Speicherung in IndexedDB,
- sichtbare Hinweise bei Offline- und Online-Wechseln,
- einen abgesicherten Aktualisierungsablauf,
- weiterhin JSON- und CSV-Export sowie lokale Sicherungsstände.

Je nach Browser und gewählter Installationsoption kann zusätzlich automatisch
eine Desktop-Verknüpfung angelegt oder Wortwerk an die Taskleiste angeheftet
werden.

## Technische Umsetzung

### Web-App-Manifest

Die Datei `manifest.webmanifest` beschreibt Wortwerk als eigenständige App:

- App-Name und Kurzname,
- deutsche Sprache,
- Startadresse und Gültigkeitsbereich,
- eigenständige Fensterdarstellung über `display: standalone`,
- Hintergrund- und Designfarbe,
- Kategorien Bildung und Produktivität,
- normale und maskierbare Symbole in 192 und 512 Pixeln.

`index.html` bindet das Manifest jetzt über `rel="manifest"` ein. Zusätzlich
sind Favicon, Apple-Touch-Symbol, Designfarbe und Metadaten für die
App-Darstellung hinterlegt.

### App-Symbole

Folgende lokale Symbole werden verwendet:

```text
icons/
├── favicon-32.png
├── apple-touch-icon.png
├── icon-192.png
├── icon-512.png
├── icon-maskable-192.png
└── icon-maskable-512.png
```

Normale Symbole werden beispielsweise im Startmenü und App-Fenster verwendet.
Maskierbare Symbole erlauben Betriebssystemen, das Symbol sicher in runde,
quadratische oder andere vorgegebene Formen einzupassen.

### Vollständig lokale Schriften

Die vorherige Verbindung zu Google Fonts wurde entfernt. Wortwerk verwendet
jetzt ausschließlich die mitgelieferten Schriftdateien:

```text
fonts/
├── WortwerkSans-Regular.ttf
├── WortwerkSans-Bold.ttf
└── LICENSE-DejaVu.txt
```

Damit hängt das Erscheinungsbild nicht mehr von einer Internetverbindung oder
einem externen Schriftdienst ab.

### Service Worker und Offline-Cache

`service-worker.js` verwaltet den App-Cache `wortwerk-app-0.5.1`.

Beim ersten erfolgreichen Laden werden folgende Bestandteile lokal abgelegt:

- Hauptseite,
- Stylesheet,
- Speicher-, PWA- und App-Logik,
- Manifest,
- CSV-Beispiel,
- lokale Schriften,
- App-Symbole.

Navigationen verwenden eine Network-first-Strategie:

1. Wenn eine Verbindung besteht, wird die aktuelle Hauptseite geladen.
2. Die erfolgreiche Antwort aktualisiert die lokale Kopie.
3. Ohne Verbindung wird die zwischengespeicherte Hauptseite geöffnet.

Statische Dateien verwenden eine Cache-first-Strategie:

1. Eine lokale Kopie wird bevorzugt.
2. Noch nicht gespeicherte Dateien werden aus dem Netz geladen.
3. Erfolgreiche Antworten werden für spätere Aufrufe abgelegt.

Beim Aktivieren einer neuen Version werden ältere Wortwerk-App-Caches entfernt.
Die persönlichen Vokabeldaten in IndexedDB werden davon nicht gelöscht.

## Neue PWA-Oberfläche

### Startbildschirm

Beim Öffnen erscheint kurz ein Wortwerk-Startbildschirm. Er bleibt sichtbar,
bis die gespeicherten Daten geladen, normalisiert und erneut sicher gespeichert
wurden. Erst danach sendet die Hauptanwendung das Ereignis
`wortwerk:ready`.

Schlägt die Initialisierung fehl, sendet die Anwendung `wortwerk:error`. Der
Startbildschirm zeigt dann einen verständlichen Fehlerhinweis und die bestehende
Fehleransicht bleibt sichtbar.

### Installationshinweis

Wenn der Browser die direkte PWA-Installation anbietet, zeigt Wortwerk eine
Installationskarte mit der Schaltfläche `Installieren`.

Auf iPhone und iPad wird stattdessen erklärt, wie Wortwerk über das
Safari-Teilen-Menü zum Home-Bildschirm hinzugefügt wird.

Wird Wortwerk über eine unsichere Netzwerkadresse ohne HTTPS geöffnet, erklärt
die Oberfläche, dass Installation und Service Worker dort nicht verfügbar sind.
`localhost` ist für lokale Entwicklung davon ausgenommen.

Ein geschlossener Installationshinweis bleibt für die aktuelle Browser-Sitzung
geschlossen.

### Verbindungsstatus

Beim Wechsel des Netzwerkzustands erscheint kurz:

- `Offline – deine lokalen Daten bleiben verfügbar`
- `Wieder online`

Der Offline-Hinweis bestätigt, dass die lokale Sammlung weiterhin nutzbar ist.

### Sicherer Update-Hinweis

Wenn ein neuer Service Worker bereitsteht, erscheint ein Update-Hinweis.
Die Aktualisierung wird nicht sofort erzwungen.

Beim Klick auf `Sicher aktualisieren` führt Wortwerk diese Schritte aus:

1. aktuellen Anwendungszustand vollständig speichern,
2. in IndexedDB einen Sicherungsstand mit dem Grund
   `Vor App-Aktualisierung` erstellen,
3. den wartenden Service Worker aktivieren,
4. die App nach dem Controllerwechsel neu laden.

Kann die Speicherung oder Sicherung nicht abgeschlossen werden, wird das Update
abgebrochen und die bisherige Version bleibt geöffnet.

Im localStorage-Fallback kann kein IndexedDB-Sicherungsstand angelegt werden.
Dort gilt das erfolgreiche Speichern des aktuellen Zustands als Voraussetzung
für das Update.

## Verbindung zwischen Haupt-App und PWA

`app.js` stellt nach erfolgreicher Initialisierung folgende kleine öffentliche
Schnittstelle bereit:

```javascript
window.WortwerkApp = {
  version: "0.5.1",
  createUpdateBackup()
};
```

Die Schnittstelle ist eingefroren und kann von anderer Seitenlogik nicht
versehentlich verändert werden.

`pwa.js` wird vor `app.js` geladen. Dadurch sind die Ereignisempfänger bereits
aktiv, wenn die Haupt-App `wortwerk:ready` oder `wortwerk:error` sendet.

## Installation auf Windows

### Empfohlener Ablauf mit Microsoft Edge

1. Wortwerk über eine bereitgestellte HTTPS-Adresse oder lokal über
   `http://localhost` öffnen.
2. Warten, bis die Anwendung vollständig geladen ist.
3. In Wortwerk auf `Installieren` klicken.
4. Den Installationsdialog von Edge bestätigen.
5. Falls angeboten, Desktop-Verknüpfung, Startmenü oder Taskleiste auswählen.

Alternativ kann die Installation in Edge über das App-Symbol in der Adressleiste
oder über `Apps > Wortwerk installieren` gestartet werden.

### Google Chrome

Chrome unterstützt denselben PWA-Standard. Die Installation kann über die
Wortwerk-Schaltfläche, das Installationssymbol in der Adressleiste oder das
Browsermenü erfolgen.

## Voraussetzungen und Grenzen

- Eine Installation von einer veröffentlichten Adresse benötigt HTTPS.
- `localhost` darf für Entwicklung und Tests HTTP verwenden.
- Das direkte Öffnen von `index.html` per Doppelklick reicht für die
  PWA-Installation und den Offline-Cache nicht aus.
- Die Daten sind an das jeweilige Gerät und das jeweilige Browserprofil
  gebunden.
- Es gibt noch keine Synchronisierung zwischen mehreren Geräten.
- Das Löschen sämtlicher App- oder Browserdaten kann auch IndexedDB und lokale
  Sicherungsstände entfernen.
- Regelmäßige JSON-Exporte bleiben deshalb empfehlenswert.
- Diese Version enthält keinen eigenständigen `.exe`- oder `.msi`-Installer.

## Lokaler Entwicklungstest

Im Projekt liegt `.pwa-test-server.ps1`. Er stellt Wortwerk nur auf dem lokalen
Computer unter `http://localhost:4173` bereit.

Start in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\.pwa-test-server.ps1
```

Danach wird Wortwerk im Browser über folgende Adresse geöffnet:

```text
http://localhost:4173
```

Das Serverfenster muss während des Tests geöffnet bleiben. Beendet wird es mit
`Strg + C`.

## Dateien in Version 0.5.1

```text
Wortwerk/
├── index.html
├── styles.css
├── storage.js
├── app.js
├── pwa.js
├── service-worker.js
├── manifest.webmanifest
├── .pwa-test-server.ps1
├── CSV-BEISPIEL.csv
├── fonts/
├── icons/
└── Readmes/
    └── Desktop_PWA_25.06.2026.md
```

## Getestete Abläufe am 25.06.2026

- alle JavaScript-Dateien bestehen die Syntaxprüfung,
- Manifest und sämtliche darin referenzierten Symbole sind vorhanden,
- alle Dateien des App-Shell-Caches sind vorhanden,
- die App lädt `storage.js`, `pwa.js` und `app.js` in der vorgesehenen Reihenfolge,
- die Haupt-App startet ohne Warnungen oder Fehler im Browser,
- der Startbildschirm wird nach erfolgreicher Initialisierung entfernt,
- Wortwerk verwendet die lokale Schrift `Wortwerk Sans`,
- die Seite besitzt keine Verbindung mehr zu externen Schrift- oder
  Asset-Diensten,
- der Service Worker übernimmt die Anwendung nach dem ersten Laden,
- Wortwerk startet nach Beenden des lokalen Servers über eine zuvor nicht
  aufgerufene URL mit neuem Query-Parameter vollständig aus dem Offline-Cache,
- der Offline-Start erzeugt keine protokollierten Browserfehler,
- die schmale Darstellung wurde mit einer mobilen Fensterbreite geprüft,
- die mobile Navigation bleibt verfügbar,
- die PWA-Hinweise sind in der mobilen Oberfläche vorhanden,
- es entsteht kein horizontaler Seitenüberlauf,
- alle HTML-IDs sind eindeutig.

Der native Installationsdialog selbst wird vom verwendeten Browser und
Betriebssystem bereitgestellt. Die abschließende Bestätigung dieses
Systemdialogs und die automatisch erzeugte Windows-Desktop-Verknüpfung müssen
deshalb zusätzlich auf dem Zielgerät manuell geprüft werden.

## Prüfpunkte für Veröffentlichung

Vor einer öffentlichen Bereitstellung sollten zusätzlich geprüft werden:

- Installation über die endgültige HTTPS-Adresse,
- Start über Desktop-Symbol und Windows-Startmenü,
- vollständiger Offline-Start nach einem Computerneustart,
- Aktualisierung von Version 0.5.1 auf eine Test-Folgeversion,
- Erhalt aller Stapel, Karten, Lernstände und Statistiken beim Update,
- JSON-Export und Wiederherstellung,
- Verhalten bei knappem Gerätespeicher,
- Installation in den vorgesehenen Edge- und Chrome-Versionen.

## Sinnvolle nächste Entwicklungsstufen

### Klassischer Windows-Installer

Falls Wortwerk später völlig unabhängig von einer Browserinstallation verteilt
werden soll, kann die bestehende PWA beispielsweise mit Tauri oder Electron als
Windows-Anwendung verpackt werden. Dann wären `.exe`- oder `.msi`-Pakete,
eigene Installationsdialoge und definierte Installationsverzeichnisse möglich.

### Geräteübergreifende Synchronisierung

Für dieselben Lernstände auf mehreren Geräten wären Benutzerkonten, eine
Server-Datenbank, verschlüsselte Übertragung und eine Konfliktlösung notwendig.
Diese Funktionen gehören nicht zu Version 0.5.1.
