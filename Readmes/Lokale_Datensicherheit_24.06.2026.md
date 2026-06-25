# Wortwerk – Lokale Datensicherheit

**Änderungsstand:** 24.06.2026  
**Version:** 0.4.0  
**Baut auf:** `Statistik_und_Lernplanung_24.06.2026.md`

## Ziel dieses Entwicklungsschritts

Version 0.4.0 ersetzt den bisherigen Hauptspeicher `localStorage` durch eine
strukturierte IndexedDB-Datenbank und ergänzt mehrere Sicherheitsstufen:

- automatische Migration vorhandener Daten,
- Papierkorb mit Wiederherstellung,
- lokale Sicherungsstände,
- automatische Tagessicherung,
- Sicherung vor riskanten Aktionen,
- Importvorschau mit Spaltenzuordnung,
- Datenprüfung und Reparaturbericht,
- externer JSON-Export als zusätzliche Sicherung.

Der bisherige `localStorage`-Eintrag wird während der Migration nicht gelöscht.
Er bleibt als Rückfallsicherung bestehen.

## IndexedDB als neuer Hauptspeicher

Die Datenbank heißt:

```text
WortwerkDB
```

Die technische IndexedDB-Version lautet:

```text
1
```

Die inhaltliche Wortwerk-Schema-Version lautet:

```text
4
```

IndexedDB speichert strukturierte JavaScript-Objekte. Wortwerk muss deshalb
nicht mehr die gesamte Sammlung als einen einzigen JSON-Text unter einem
localStorage-Schlüssel ablegen.

## Datenbankbereiche

Die Datenbank besteht aus sieben Object Stores:

```text
WortwerkDB
├── decks
├── cards
├── reviews
├── settings
├── trash
├── backups
└── meta
```

### `decks`

Enthält Stapel ohne eingebettetes Kartenarray:

```json
{
  "id": "deck-id",
  "name": "Englisch – Reisen",
  "description": "Wichtige Wörter",
  "createdAt": "2026-06-24T08:00:00.000Z",
  "updatedAt": "2026-06-24T09:00:00.000Z"
}
```

Indizes:

- `updatedAt`
- `name`

### `cards`

Jede Karte wird als einzelner Datensatz gespeichert. Das zusätzliche Feld
`deckId` stellt die Beziehung zum Stapel her:

```json
{
  "id": "card-id",
  "deckId": "deck-id",
  "front": "journey",
  "back": "Reise",
  "hint": "Beginnt mit J …",
  "learning": {
    "status": "review",
    "dueAt": "2026-06-27T09:00:00.000Z",
    "intervalDays": 3,
    "ease": 2.5,
    "reviewCount": 1,
    "lapseCount": 0,
    "lastReviewedAt": "2026-06-24T09:00:00.000Z"
  }
}
```

Indizes:

- `deckId`
- `learning.dueAt`
- `learning.status`
- `updatedAt`

### `reviews`

Enthält jede geplante Lernbewertung als einzelnen Datensatz.

Indizes:

- `cardId`
- `deckId`
- `reviewedAt`

### `settings`

Enthält die Nutzereinstellungen unter dem Schlüssel `user`.

### `trash`

Enthält gelöschte Karten und Stapel einschließlich der zugehörigen
Lernprotokolle.

Indizes:

- `deletedAt`
- `kind`

### `backups`

Enthält vollständige lokale Wiederherstellungspunkte.

Index:

- `createdAt`

### `meta`

Enthält:

- Schema-Version,
- letzten Aktualisierungszeitpunkt,
- Initialisierungsstatus,
- Migrationsbericht.

## Neue Datei `storage.js`

Die IndexedDB-Logik wurde aus `app.js` herausgelöst.

```text
storage.js
```

verantwortet:

- Öffnen und Aktualisieren der Datenbank,
- Anlegen der Object Stores und Indizes,
- Lesen und Zusammensetzen der Daten,
- transaktionales Speichern,
- Verwaltung des Papierkorbs,
- Erstellen und Löschen von Sicherungen,
- automatische Tagessicherung,
- Migrationsmetadaten.

`app.js` bleibt für Anwendungszustand, Lernlogik und Oberfläche zuständig.

## Transaktionales Speichern

Der aktuelle Zustand wird in einer gemeinsamen Schreibtransaktion übergeben:

```text
decks
cards
reviews
settings
meta
```

Bei erfolgreicher Transaktion werden alle Bereiche gemeinsam aktualisiert. Bei
einem Fehler wird die Transaktion abgebrochen.

Dadurch wird vermieden, dass beispielsweise:

- eine Karte aktualisiert wird,
- aber das zugehörige Lernprotokoll nicht gespeichert wird.

Schreibvorgänge werden zusätzlich über eine interne Warteschlange
serialisiert. Schnell aufeinanderfolgende Änderungen überschreiben sich nicht
unkontrolliert.

## Automatische Migration

Beim Start prüft Wortwerk zuerst, ob `WortwerkDB` bereits initialisiert wurde.

Ist die Datenbank leer, sucht die App nacheinander nach:

```text
wortwerk-data-v3
wortwerk-data-v2
wortwerk-data-v1
wortwerk-data-v4-fallback
```

Gefundene Daten werden:

1. als JSON gelesen,
2. normalisiert,
3. in getrennte Stapel-, Karten-, Review- und Einstellungsdatensätze zerlegt,
4. transaktional in IndexedDB geschrieben,
5. in einem Migrationsbericht zusammengefasst.

Der Bericht enthält:

- Quelle,
- Anzahl der Stapel,
- Anzahl der Karten,
- Anzahl der Lernprotokolle,
- Zeitpunkt der Migration.

Die alte localStorage-Quelle wird nicht gelöscht.

## Fallback-Modus

Falls IndexedDB in einem Browser nicht verfügbar ist oder nicht geöffnet
werden kann, verwendet Wortwerk:

```text
wortwerk-data-v4-fallback
```

als localStorage-Rückfall.

Im Fallback-Modus funktionieren die Grundfunktionen weiterhin. Papierkorb und
lokale Sicherungsstände benötigen jedoch IndexedDB und sind eingeschränkt.
Die Sicherheitsoberfläche zeigt diesen Zustand deutlich an.

## Papierkorb

### Karte löschen

Beim Löschen einer Karte:

1. wird automatisch ein Sicherungsstand erstellt,
2. werden Karte und zugehörige Lernprotokolle in `trash` gespeichert,
3. werden Karte und Protokolle aus der aktiven Sammlung entfernt,
4. wird der neue Zustand transaktional gespeichert.

Ein Papierkorbeintrag enthält:

```json
{
  "id": "trash-id",
  "kind": "card",
  "label": "journey",
  "deletedAt": "2026-06-24T18:00:00.000Z",
  "deckId": "deck-id",
  "deckName": "Englisch – Reisen",
  "payload": {
    "card": {},
    "reviews": []
  }
}
```

### Stapel löschen

Der Papierkorb speichert:

- vollständigen Stapel,
- alle Karten,
- alle Lernprotokolle dieses Stapels.

### Wiederherstellen

Beim Wiederherstellen werden:

- ID-Kollisionen erkannt,
- nötigenfalls neue IDs erzeugt,
- Beziehungen der Lernprotokolle angepasst,
- ein fehlender Zielstapel für eine einzelne Karte neu angelegt,
- der Papierkorbeintrag entfernt,
- der aktive Datenbestand gespeichert.

### Endgültiges Löschen

Ein einzelner Papierkorbeintrag oder der gesamte Papierkorb kann nach einer
Bestätigung endgültig gelöscht werden.

## Lokale Sicherungsstände

Eine Sicherung enthält:

```json
{
  "id": "backup-id",
  "createdAt": "2026-06-24T18:00:00.000Z",
  "reason": "Automatische Tagessicherung",
  "kind": "automatic",
  "schemaVersion": 4,
  "summary": {
    "decks": 3,
    "cards": 120,
    "reviews": 850
  },
  "data": {
    "decks": [],
    "reviewLog": [],
    "settings": {}
  }
}
```

Wortwerk behält maximal zwölf lokale Sicherungen. Die ältesten Einträge werden
automatisch entfernt.

### Automatische Tagessicherung

Beim ersten Start eines Tages wird höchstens eine automatische Sicherung
erstellt, sofern Lern- oder Sammlungsdaten vorhanden sind.

### Sicherung vor riskanten Aktionen

Automatische Sicherheitsstände entstehen vor:

- Löschen einer Karte,
- Löschen eines Stapels,
- JSON-Wiederherstellung,
- CSV-Import,
- automatischer Datenreparatur,
- Wiederherstellung eines älteren Sicherungsstands.

### Manuelle Sicherung

Über die Sicherheitszentrale kann jederzeit ein zusätzlicher lokaler
Wiederherstellungspunkt erstellt werden.

### Sicherung wiederherstellen

Vor dem Wiederherstellen einer Sicherung wird der aktuelle Zustand noch einmal
gesichert. Danach werden Stapel, Karten, Protokolle und Einstellungen aus dem
gewählten Stand übernommen.

Lokale IndexedDB-Sicherungen ersetzen nicht den externen JSON-Export. Werden
sämtliche Browserdaten gelöscht, gehen auch die lokalen Wiederherstellungspunkte
verloren.

## Datenprüfung

Die Sicherheitszentrale prüft:

- eindeutige Stapel-IDs,
- eindeutige Karten-IDs,
- Stapelnamen,
- Vorder- und Rückseiten,
- gültige Fälligkeitstermine,
- Lernprotokolle ohne vorhandene Karte.

Der Bericht zeigt:

- gültige Stapel,
- gültige Karten,
- Lernprotokolle,
- Fehler,
- Warnungen.

## Automatische Reparatur

Wenn Probleme erkannt werden, kann `Sicher reparieren` ausgeführt werden.

Vor der Reparatur wird ein Sicherungsstand erstellt.

Die Reparatur:

- normalisiert Stapel und Karten,
- erzeugt fehlende oder doppelte IDs neu,
- passt bekannte Beziehungen an,
- entfernt verwaiste Lernprotokolle,
- normalisiert Einstellungen,
- speichert einen sichtbaren Reparaturbericht.

Der Bericht enthält:

- Anzahl der Korrekturen,
- Anzahl entfernter verwaister Protokolle,
- Zeitpunkt,
- Hinweis auf die vorherige Sicherung.

## Importvorschau

Dateien werden nicht mehr sofort importiert.

### JSON

Die Vorschau zeigt:

- Dateiname,
- Anzahl Stapel,
- Anzahl Karten,
- Anzahl Lernprotokolle,
- Fehler und Warnungen,
- Hinweis, dass die aktuelle Sammlung ersetzt wird.

Bei strukturellen Fehlern bleibt die Bestätigung deaktiviert.

### CSV

Die Vorschau zeigt:

- erkannte Zeilen,
- die ersten fünf Datenzeilen,
- Zuordnung der Spalten.

Der Nutzer ordnet zu:

- Vorderseite,
- Rückseite,
- Stapel,
- Hinweis.

Vorder- und Rückseite sind Pflichtzuordnungen. Stapel und Hinweis können
ausgelassen werden.

Beim Import:

- werden leere Pflichtfelder übersprungen,
- werden exakte Duplikate übersprungen,
- wird vorher ein Sicherungsstand erstellt,
- wird anschließend eine Datenprüfung vorbereitet.

## Sicherheitsoberfläche

Die neue Hauptnavigation `Datensicherheit` zeigt:

- aktiven Speichermodus,
- Anzahl der Stapel,
- Anzahl der Karten,
- Anzahl der Lernprotokolle,
- Anzahl Papierkorbeinträge,
- Anzahl Sicherungen,
- Migrationsbericht,
- Datenprüfbericht,
- Papierkorb,
- lokale Sicherungen,
- Datenbankstruktur.

Die Ansicht ist für Desktop und Smartphone responsiv.

## Dateien in Version 0.4.0

```text
Wortwerk/
├── index.html
├── styles.css
├── app.js
├── storage.js
├── CSV-BEISPIEL.csv
└── Readmes/
    ├── Grundkonstrukt_24.06.2026.md
    ├── Lernmodus_und_Datenverwaltung_24.06.2026.md
    ├── Statistik_und_Lernplanung_24.06.2026.md
    └── Lokale_Datensicherheit_24.06.2026.md
```

## Getestete Abläufe am 24.06.2026

- vorhandene V3-Daten werden nach IndexedDB migriert,
- Migrationsquelle bleibt im localStorage erhalten,
- Stapel, Karten und Lernprotokolle werden korrekt übernommen,
- automatische Tagessicherung wird erzeugt,
- manuelle Sicherung wird erzeugt,
- Sicherheitszentrale zeigt IndexedDB als aktiv,
- Datenprüfung erkennt einen konsistenten Bestand,
- Karte wird mit Lernprotokoll in den Papierkorb verschoben,
- vor dem Löschen entsteht eine automatische Sicherung,
- Karte und Lernprotokoll werden wiederhergestellt,
- Papierkorb ist danach wieder leer,
- wiederhergestellte Daten bleiben nach einem Neuladen erhalten,
- Sicherheitsoberfläche reagiert auf Smartphone-Breakpoints,
- JavaScript-Dateien bestehen die Syntaxprüfung,
- Browserprüfung protokollierte keine Fehler oder Warnungen.

Die Importvorschau wurde strukturell und über die Programmlogik geprüft. Eine
automatisierte Auswahl lokaler Dateien war in der Browser-Testumgebung nicht
verfügbar; der reale Dateiauswahldialog bleibt deshalb zusätzlich ein sinnvoller
manueller Test im Zielbrowser.

## Grenzen

- IndexedDB ist weiterhin geräte- und browserabhängig.
- Lokale Sicherungen werden nicht zwischen Geräten synchronisiert.
- Löschen aller Browserdaten entfernt auch IndexedDB und Sicherungen.
- Die App verwendet aktuell beim Speichern weiterhin einen vollständigen,
  transaktionalen Zustandssnapshot; spätere Versionen können einzelne
  Datensätze gezielter aktualisieren.
- Der Papierkorb leert sich nicht automatisch nach einer festen Anzahl Tage.
- Sicherungen sind noch nicht verschlüsselt.

## Sinnvolle nächste Schritte

- gezielte Einzeloperationen statt vollständigem Snapshot,
- optionales automatisches Leeren des Papierkorbs nach 30 oder 90 Tagen,
- Sicherungen nach Wichtigkeit schützen,
- Speicherverbrauch anzeigen,
- automatisierte Tests mit einer echten IndexedDB-Testumgebung,
- installierbare Progressive Web App,
- später eine zentrale Synchronisierung zwischen Geräten.
