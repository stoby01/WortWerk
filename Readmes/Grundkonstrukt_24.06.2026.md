# Wortwerk – Grundkonstrukt

**Änderungsstand:** 24.06.2026  
**Version:** 0.1.0  
**Nächster Stand:** `Lernmodus_und_Datenverwaltung_24.06.2026.md`

## Ziel dieses Entwicklungsschritts

Der erste Entwicklungsschritt legte das funktionsfähige Grundgerüst für einen
modernen Vokabeltrainer an. Die Anwendung wurde bewusst als frameworkfreie
Web-App aus HTML, CSS und JavaScript entwickelt.

Das Grundkonstrukt sollte bereits praktisch testbar sein und gleichzeitig die
zentralen Web-Grundlagen nachvollziehbar zeigen:

- semantisches HTML
- responsives CSS
- JavaScript-Zustand
- DOM-Rendering
- Formulare und Events
- Speicherung im Browser

## Implementierte Funktionen

### Stapel erstellen

Ein neuer Stapel konnte mit folgenden Angaben angelegt werden:

- Name als Pflichtfeld
- optionale Beschreibung
- automatisch erzeugte ID
- automatischer Erstellungszeitpunkt
- zunächst leere Kartenliste

Das ursprüngliche Stapelobjekt hatte diese Form:

```json
{
  "id": "1750752000000-a1b2c3d4",
  "name": "Englisch – Reisen",
  "description": "Wichtige Wörter für den nächsten Urlaub.",
  "cards": [],
  "createdAt": "2026-06-24T08:00:00.000Z"
}
```

### Karten hinzufügen

Jede Karte bestand zunächst ausschließlich aus:

- Vorderseite
- Rückseite
- ID
- Erstellungszeitpunkt

```json
{
  "id": "1750752060000-e5f6a7b8",
  "front": "journey",
  "back": "Reise",
  "createdAt": "2026-06-24T08:01:00.000Z"
}
```

Neue Karten wurden mit `unshift()` am Anfang des Kartenarrays eingefügt.

### Karten entfernen

Karten konnten über eine Papierkorb-Schaltfläche entfernt werden. Vor dem
Löschen erschien eine Bestätigungsabfrage mit dem Inhalt der Vorderseite.

Technisch wurde mit `filter()` ein neues Kartenarray ohne die gewählte ID
erzeugt:

```javascript
activeDeck.cards = activeDeck.cards.filter(
  (card) => card.id !== cardId
);
```

### Navigation

Alle Stapel wurden in einer linken Seitenleiste dargestellt. Angezeigt wurden:

- Stapelname
- Anzahl der enthaltenen Karten
- Markierung des aktuell ausgewählten Stapels

Auf Smartphones ließ sich diese Navigation als seitliches Menü öffnen.

### Responsive Oberfläche

Das Grunddesign enthielt:

- Desktop-Seitenleiste
- mobilen Menümodus
- Startseite für leere oder nicht ausgewählte Sammlungen
- modale Dialoge für Stapel und Karten
- tabellenartige Kartenansicht
- Smartphone-Darstellung mit untereinander angeordneten Kartenseiten
- Statusmeldungen nach erfolgreichen Aktionen

## Ursprüngliche Speicherung

Version 0.1.0 speicherte alle Stapel als einzelnes JSON-Array in
`localStorage`.

Der Speicherschlüssel lautete:

```text
wortwerk-data-v1
```

Gespeichert wurde mit:

```javascript
localStorage.setItem(
  "wortwerk-data-v1",
  JSON.stringify(state.decks)
);
```

Beim Start wurde der JSON-Text wieder eingelesen:

```javascript
const storedData = localStorage.getItem("wortwerk-data-v1");
const decks = storedData ? JSON.parse(storedData) : [];
```

Ein vollständiger Datensatz konnte so aussehen:

```json
[
  {
    "id": "1750752000000-a1b2c3d4",
    "name": "Englisch – Reisen",
    "description": "Wichtige Wörter für den nächsten Urlaub.",
    "cards": [
      {
        "id": "1750752060000-e5f6a7b8",
        "front": "journey",
        "back": "Reise",
        "createdAt": "2026-06-24T08:01:00.000Z"
      }
    ],
    "createdAt": "2026-06-24T08:00:00.000Z"
  }
]
```

## Interner Zustand

Der erste Anwendungszustand war bewusst klein:

```javascript
const state = {
  decks: loadDecks(),
  activeDeckId: null
};
```

- `decks` enthielt alle Stapel.
- `activeDeckId` bestimmte den sichtbaren Stapel.

Nach jeder Änderung wurde zuerst der Zustand verändert, anschließend
gespeichert und danach die Oberfläche mit `render()` neu aufgebaut:

```text
Benutzeraktion
    ↓
Zustand verändern
    ↓
localStorage aktualisieren
    ↓
Oberfläche neu rendern
```

## Zentrale JavaScript-Funktionen

### `loadDecks()`

Las gespeicherte JSON-Daten ein und lieferte bei fehlenden oder beschädigten
Daten ein leeres Array.

### `saveDecks()`

Serialisierte den vollständigen Stapelbestand und schrieb ihn in
`localStorage`.

### `createId()`

Kombinierte einen Zeitstempel mit einem zufälligen Textanteil.

### `escapeHtml()`

Maskierte Nutzereingaben vor dem Einsetzen in HTML-Templates.

### `render()`

Aktualisierte die Navigation und entschied zwischen Startseite und
Stapelansicht.

### `renderDeckNavigation()`

Erzeugte die Seitenleiste aus dem Stapelarray.

### `renderWelcome()`

Zeigte die Einführung und den Einstieg zum ersten Stapel.

### `renderDeck()` und `renderCardTable()`

Erzeugten die ausgewählte Stapelansicht und die Kartenliste.

### `addDeck()`, `addCard()` und `removeCard()`

Verarbeiteten die grundlegenden Änderungen an der Sammlung.

## Event Delegation

Da Karten und Stapel dynamisch gerendert wurden, verwendete die App Event
Delegation. Ein dauerhaft vorhandener Elternbereich fing Klicks ab und suchte
mit `closest()` nach dem tatsächlich geklickten Bedienelement.

```javascript
elements.contentArea.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-card-id]");
  if (deleteButton) {
    removeCard(deleteButton.dataset.cardId);
  }
});
```

Dadurch benötigte nicht jede neu erzeugte Karte einen eigenen dauerhaft
verwalteten Listener.

## Dateien des Grundkonstrukts

```text
Wortwerk/
├── index.html
├── styles.css
├── app.js
└── README.md
```

### `index.html`

Enthielt Seitenleiste, Kopfbereich, Inhaltsbereich, Formulare, Dialoge und
Statusmeldung.

### `styles.css`

Enthielt Designvariablen, Layout, Komponenten, Dialoge und responsive
Breakpoints.

### `app.js`

Enthielt Zustand, Speicherung, Rendering und alle Benutzeraktionen.

## Am 24.06.2026 getestete Abläufe

- Startseite lädt.
- Stapeldialog öffnet sich.
- Stapel kann gespeichert werden.
- Stapel erscheint in der Navigation.
- Kartendialog öffnet sich.
- Karte kann gespeichert werden.
- Kartenanzahl wird aktualisiert.
- Karte kann nach Bestätigung entfernt werden.
- Smartphone-Layout funktioniert.
- mobiles Navigationsmenü funktioniert.
- während der Prüfung wurden keine Browserfehler protokolliert.

## Grenzen von Version 0.1.0

Noch nicht vorhanden waren:

- Lernmodus
- Wiederholungsplanung
- Kartenflip
- Lernfortschritt
- Bearbeiten von Stapeln und Karten
- Löschen vollständiger Stapel
- Suche und Sortierung
- Import und Export
- Lernprotokoll
- versioniertes Wurzelobjekt
- automatische Datenmigration

Diese Punkte wurden teilweise oder vollständig im nächsten Entwicklungsstand
`Lernmodus_und_Datenverwaltung_24.06.2026.md` umgesetzt.
