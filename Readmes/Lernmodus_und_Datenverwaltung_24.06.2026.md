# Wortwerk – Lernmodus und Datenverwaltung

**Änderungsstand:** 24.06.2026  
**Version:** 0.2.0  
**Baut auf:** `Grundkonstrukt_24.06.2026.md`  
**Nächster Stand:** `Statistik_und_Lernplanung_24.06.2026.md`

Diese Datei dokumentiert den zweiten großen Entwicklungsstand von Wortwerk.
Sie enthält weiterhin die vollständigen technischen Details, damit der aktuelle
Stand unabhängig nachvollzogen werden kann.

Wortwerk ist ein moderner, übersichtlicher Vokabeltrainer, der aktuell als
lokale Web-App umgesetzt ist. Die erste Version bildet das Grundgerüst für eine
später erweiterbare Lern-App.

Die Anwendung benötigt momentan weder ein Benutzerkonto noch einen Server oder
eine Datenbank. Stapel und Karten werden direkt im Browser des Nutzers
gespeichert.

## Projektstand

| Angabe | Wert |
| --- | --- |
| Projektname | Wortwerk |
| Version | 0.2.0 – Lernmodus und Datenverwaltung |
| Beginn der Entwicklung | 24.06.2026 |
| Letzte Dokumentationsaktualisierung | 24.06.2026 |
| Entwicklungsstand | Funktionsfähiger lokaler Prototyp |
| Oberfläche | Responsive Web-App |
| Programmiersprachen | HTML, CSS und JavaScript |
| Externe Datenbank | Noch nicht vorhanden |
| Speicherung | Browser-`localStorage` als JSON |

## Ziel des Projekts

Wortwerk verfolgt zwei gleichwertige Ziele:

### Ziel 1 – Ein wirklich nutzbares Produkt

Die App soll nicht nur eine technische Demonstration bleiben. Sie soll Schritt
für Schritt zu einem zuverlässigen Vokabeltrainer ausgebaut werden, der im
Alltag tatsächlich verwendet werden kann.

Dazu gehören langfristig:

- zuverlässige Speicherung ohne Datenverlust
- schnelle und verständliche Bedienung
- gute Nutzbarkeit auf Smartphone und Desktop
- ein sinnvoller Lernalgorithmus
- Import, Export und Datensicherung
- Offline-Verwendung
- geräteübergreifende Synchronisierung
- automatisierte Tests
- barrierearme Bedienung
- nachvollziehbare Versionen und Datenmigrationen

### Ziel 2 – Ein nachvollziehbares Lernprojekt

Jede Funktion soll so implementiert und dokumentiert werden, dass die
Programmierentscheidungen verstanden werden können. Die Dokumentation erklärt
deshalb nicht nur, **was** die App kann, sondern auch:

- warum eine bestimmte technische Lösung gewählt wurde,
- wie die Daten durch die Anwendung fließen,
- welche Funktionen zusammenarbeiten,
- welche Grenzen die aktuelle Lösung besitzt,
- wie eine Funktion sicher erweitert werden kann,
- welche Architektur für spätere Produktversionen sinnvoll ist.

Der aktuelle Prototyp bleibt absichtlich frameworkfrei. Dadurch sind die
Grundlagen von HTML, CSS, JavaScript, DOM-Manipulation, Ereignissen,
Zustandsverwaltung und Browser-Speicherung direkt sichtbar.

## Entwicklungsverlauf

### Grundkonstrukt – 24.06.2026

Am 24.06.2026 wurde die erste funktionsfähige Version der App erstellt.

In diesem Entwicklungsschritt wurden folgende Grundlagen umgesetzt:

- Projektstruktur mit getrennten Dateien für Aufbau, Design und Programmlogik
- modernes und responsives Grunddesign
- Startseite für neue Nutzer
- Navigation für vorhandene Vokabelstapel
- Erstellen neuer Stapel
- Hinzufügen neuer Vokabelkarten
- Entfernen vorhandener Vokabelkarten
- automatische lokale Speicherung
- Wiederherstellung der gespeicherten Daten beim nächsten Öffnen
- Desktop- und Smartphone-Darstellung
- Browser-Test der vollständigen Grundfunktionen

### Lernmodus und Datenverwaltung – 24.06.2026

In Version 0.2.0 wurde Wortwerk vom reinen Kartenverwalter zu einem ersten
echten Lernprodukt erweitert.

Neu umgesetzt wurden:

- animierter Lernmodus mit einzeln dargestellten Karten
- 3D-Drehung zwischen Vorder- und Rückseite
- dezenter optionaler Denkanstoß pro Karte
- vorherige und nächste Karte
- Mischen der noch nicht bearbeiteten Karten
- animierte Fortschrittsanzeige
- tägliche Auswahl fälliger und neuer Karten
- vierstufige Selbsteinschätzung
- einfacher adaptiver Wiederholungsalgorithmus
- individueller Lernzustand pro Karte
- dauerhaftes Wiederholungsprotokoll
- freier Übungsmodus ohne Veränderung der Lerntermine
- animierte Abschlussübersicht
- Bearbeiten und Löschen von Stapeln
- Bearbeiten und Löschen von Karten
- Suche und fünf Sortierungen
- CSV-Export für Tabellenprogramme
- vollständige JSON-Sicherung
- CSV- und JSON-Import
- Duplikaterkennung beim CSV-Import
- automatisches Backup vor dem Wiederherstellen einer JSON-Sicherung
- sichtbare animierte Speicheranzeige
- automatische Migration der Daten aus Version 0.1
- Prüfung der Desktop- und Smartphone-Abläufe im Browser

## Implementierte Funktionen

### 1. Startseite

Wenn noch kein Stapel ausgewählt ist, zeigt Wortwerk eine Einführungsseite an.
Sie erklärt den grundlegenden Ablauf:

1. Stapel anlegen
2. Karten hinzufügen
3. Sammlung verwalten

Über die Schaltflächen „Stapel erstellen“, „Ersten Stapel erstellen“ oder
„Neuer Stapel“ kann ein neuer Stapel angelegt werden.

### 2. Vokabelstapel erstellen

Beim Erstellen eines Stapels öffnet sich ein Dialog mit zwei Eingabefeldern:

- **Name des Stapels:** Pflichtfeld mit maximal 40 Zeichen
- **Beschreibung:** optionales Feld mit maximal 120 Zeichen

Nach dem Speichern passiert Folgendes:

1. Für den Stapel wird eine eindeutige ID erzeugt.
2. Das Erstellungsdatum wird als ISO-Zeitstempel gespeichert.
3. Der Stapel erhält zunächst eine leere Kartenliste.
4. Der neue Stapel wird an den Anfang der Stapelliste gesetzt.
5. Der Stapel wird automatisch geöffnet.
6. Alle Stapel werden im Browser gespeichert.
7. Eine kurze Erfolgsmeldung wird eingeblendet.

### 3. Stapelübersicht und Navigation

Alle erstellten Stapel werden in der linken Seitenleiste angezeigt.

Für jeden Stapel sind dort sichtbar:

- der Stapelname
- die aktuelle Anzahl der Karten
- eine visuelle Markierung, wenn der Stapel gerade ausgewählt ist

Auf einem Smartphone wird die Seitenleiste zu einem ausklappbaren Menü. Dadurch
bleibt auf kleinen Bildschirmen mehr Platz für die Karten.

### 4. Vokabelkarte hinzufügen

In einem ausgewählten Stapel kann über „Karte hinzufügen“ eine neue Karte
erstellt werden.

Eine Karte besteht aktuell aus:

- **Vorderseite:** zum Beispiel das fremdsprachige Wort
- **Rückseite:** zum Beispiel die deutsche Übersetzung

Beide Felder sind Pflichtfelder und auf jeweils 80 Zeichen begrenzt.

Beim Speichern wird:

1. eine eindeutige Karten-ID erzeugt,
2. ein Erstellungszeitpunkt gespeichert,
3. die Karte am Anfang der Kartenliste eingefügt,
4. der vollständige Stapelbestand erneut lokal gespeichert,
5. die Oberfläche sofort aktualisiert.

### 5. Karten anzeigen

Vorhandene Karten werden in einer übersichtlichen Liste dargestellt.

Auf größeren Bildschirmen erscheinen Vorder- und Rückseite nebeneinander. Auf
kleineren Bildschirmen werden sie untereinander angeordnet und zusätzlich mit
„Vorderseite“ und „Rückseite“ beschriftet.

Die Anzahl der Karten wird an mehreren Stellen automatisch aktualisiert:

- in der linken Stapelnavigation
- in der geöffneten Stapelansicht

### 6. Karte entfernen

Jede Kartenzeile besitzt eine Schaltfläche mit Papierkorb-Symbol.

Vor dem Entfernen erscheint eine Sicherheitsabfrage mit dem Namen der
Vokabel. Erst nach der Bestätigung wird die Karte aus dem Stapel gelöscht.
Anschließend wird der neue Datenstand automatisch gespeichert und eine
Erfolgsmeldung angezeigt.

### 7. Automatische lokale Speicherung

Nach jeder Änderung wird der vollständige Datenbestand automatisch im Browser
gespeichert. Ein zusätzlicher „Speichern“-Button ist deshalb nicht notwendig.

Gespeichert wird nach:

- dem Erstellen eines Stapels
- dem Bearbeiten eines Stapels
- dem Löschen eines Stapels
- dem Hinzufügen einer Karte
- dem Bearbeiten einer Karte
- dem Entfernen einer Karte
- jeder Bewertung im geplanten Lernmodus
- einem CSV- oder JSON-Import

Beim Start der Anwendung werden die Daten automatisch wieder eingelesen.
Eine kleine Statusanzeige im Kopfbereich wechselt animiert zwischen
„Speichert …“, „Lokal gespeichert“ und einer Fehlermeldung.

### 8. Responsive Oberfläche

Die Oberfläche wurde für unterschiedliche Bildschirmgrößen gestaltet.

#### Desktop und Tablet

- dauerhaft sichtbare Seitenleiste
- großzügige Inhaltsdarstellung
- tabellenartige Kartenübersicht
- Dialogfenster für Stapel und Karten

#### Smartphone

- ausklappbares Navigationsmenü
- kompakter Kopfbereich
- platzsparende Aktionsschaltfläche
- untereinander angeordnete Kartenseiten
- angepasste Abstände und Schriftgrößen

### 9. Rückmeldungen und Bedienkomfort

Die App zeigt kurze Statusmeldungen an, wenn Aktionen erfolgreich abgeschlossen
wurden, zum Beispiel:

- „Stapel wurde erstellt“
- „Karte wurde hinzugefügt“
- „Karte wurde entfernt“

Dialoge können über die Schließen-Schaltfläche, „Abbrechen“ oder durch einen
Klick außerhalb des Dialogfensters geschlossen werden.

### 10. Schutz bei Textausgaben

Texte, die Nutzer in Stapel- oder Kartenfelder eingeben, werden vor der Ausgabe
als HTML maskiert. Dadurch werden eingegebene HTML-Tags nicht als echter
Seitencode ausgeführt, sondern nur als Text dargestellt.

### 11. Geplanter Lernmodus

Eine Lernrunde enthält:

1. alle bereits gelernten Karten, deren `dueAt` erreicht ist,
2. anschließend bis zu zehn neue Karten.

Die Reihenfolge wird beim Start gemischt. Über „Rest mischen“ kann nur der noch
nicht bearbeitete Teil erneut gemischt werden. Bereits besuchte Positionen
bleiben stabil, damit die Zurück-Navigation nachvollziehbar bleibt.

Die Karte zeigt zuerst ausschließlich die Vorderseite. Durch Klick oder
Leertaste wird sie mit einer 3D-Animation umgedreht. Erst danach nimmt die App
eine Bewertung an.

### 12. Einfacher adaptiver Scheduler

Der aktuelle Scheduler ist bewusst verständlich gehalten und trägt die Version:

```text
wortwerk-simple-v1
```

Für eine neue Karte gelten folgende ersten Abstände:

| Bewertung | Bedeutung | Nächster Abstand |
| --- | --- | --- |
| Nicht gewusst | Antwort war falsch oder fehlte | 10 Minuten |
| Richtig, aber schwer | korrekt mit deutlicher Mühe | 1 Tag |
| Richtig | korrekt erinnert | 3 Tage |
| Sofort gewusst | sicher und ohne Zögern | 7 Tage |

Bei späteren Wiederholungen:

```text
Nicht gewusst:
  Intervall = 10 Minuten
  Ease = Ease - 0,2
  lapseCount = lapseCount + 1

Schwer:
  Intervall = bisheriges Intervall × 1,2
  Ease = Ease - 0,1

Richtig:
  Intervall = bisheriges Intervall × Ease

Sofort gewusst:
  Intervall = bisheriges Intervall × (Ease + 0,8)
  Ease = Ease + 0,1
```

Der Ease-Faktor wird auf den Bereich von `1.3` bis `3.2` begrenzt. Dadurch
werden Intervalle weder unkontrolliert klein noch durch einzelne Bewertungen
extrem groß.

Dieser Scheduler ist noch kein vollständiger FSRS-Algorithmus. Sein Zweck ist:

- aktives Erinnern und verteilte Wiederholung praktisch nutzbar zu machen,
- alle Berechnungen im Lernprojekt nachvollziehbar zu halten,
- durch das Lernprotokoll Daten für eine spätere Verbesserung zu sammeln.

### 13. Freier Übungsmodus

„Frei üben“ verwendet alle Karten des Stapels und mischt ihre Reihenfolge.
Karten können gedreht sowie vor- und zurückgeschaltet werden.

Dieser Modus verändert bewusst weder `dueAt` noch Intervalle oder Ease. Er ist
für freiwillige Wiederholungen gedacht und soll den geplanten Algorithmus nicht
durch zusätzliche, schwer vergleichbare Bewertungen verfälschen.

### 14. CSV und vollständige Sicherung

CSV dient dem einfachen Austausch mit Tabellenprogrammen. Exportiert werden:

```text
Stapel;Vorderseite;Rückseite;Hinweis
```

Die Datei wird als UTF-8 mit Byte Order Mark und Semikolon erzeugt, damit
Umlaute und deutsche Tabellenprogramme möglichst zuverlässig funktionieren.
Beim Import werden sowohl Semikolon als auch Komma erkannt. Bekannte deutsche
und englische Spaltennamen werden unterstützt. Exakte Duplikate aus Vorder-
und Rückseite werden übersprungen.

CSV enthält bewusst keinen Lernstand und kein Wiederholungsprotokoll. Für eine
vollständige Sicherung wird deshalb JSON verwendet. Eine JSON-Sicherung enthält:

- Schema-Version
- Exportzeitpunkt
- sämtliche Stapel
- sämtliche Karten und Hinweise
- alle aktuellen Lernzustände
- das vollständige Wiederholungsprotokoll

Vor dem Wiederherstellen einer JSON-Sicherung erzeugt Wortwerk automatisch
einen Export des aktuellen Bestands. Danach ersetzt die importierte Sicherung
die lokale Sammlung.

## Speicherung im Detail

### Aktuelles Speicherformat seit Version 0.2.0

Version 0.2.0 verwendet den Schlüssel:

```text
wortwerk-data-v2
```

Unter diesem Schlüssel wird kein loses Stapelarray mehr gespeichert, sondern
ein versioniertes Wurzelobjekt:

```json
{
  "schemaVersion": 2,
  "decks": [],
  "reviewLog": []
}
```

`schemaVersion` beschreibt die Struktur der gespeicherten Daten. `decks`
enthält alle Stapel und Karten. `reviewLog` enthält die dauerhaft
protokollierten Lernbewertungen.

#### Aktuelles Stapelformat

```json
{
  "id": "4f4ffbe2-559d-4c3e-a654-5fc8da44fbda",
  "name": "Englisch – Reisen",
  "description": "Wichtige Wörter für Reisen und Urlaub.",
  "createdAt": "2026-06-24T08:00:00.000Z",
  "updatedAt": "2026-06-24T09:30:00.000Z",
  "cards": []
}
```

`updatedAt` wird verändert, sobald der Stapel oder eine enthaltene Karte
bearbeitet wird.

#### Aktuelles Kartenformat

```json
{
  "id": "ca0e7651-45bf-4dc4-a24f-16e052e7cc09",
  "front": "journey",
  "back": "Reise",
  "hint": "Beginnt mit J …",
  "createdAt": "2026-06-24T08:01:00.000Z",
  "updatedAt": "2026-06-24T09:15:00.000Z",
  "learning": {
    "status": "review",
    "dueAt": "2026-06-27T09:15:00.000Z",
    "intervalDays": 3,
    "ease": 2.5,
    "reviewCount": 1,
    "lapseCount": 0,
    "lastReviewedAt": "2026-06-24T09:15:00.000Z"
  }
}
```

Die Felder unter `learning` haben folgende Bedeutung:

| Feld | Bedeutung |
| --- | --- |
| `status` | `new`, `learning` oder `review` |
| `dueAt` | Zeitpunkt der nächsten geplanten Wiederholung |
| `intervalDays` | aktueller Abstand in Tagen |
| `ease` | persönlicher Intervallfaktor der Karte |
| `reviewCount` | Anzahl geplanter Bewertungen |
| `lapseCount` | Anzahl der Bewertungen „Nicht gewusst“ |
| `lastReviewedAt` | Zeitpunkt der letzten geplanten Bewertung |

#### Wiederholungsprotokoll

Jede Bewertung im geplanten Lernmodus erzeugt einen zusätzlichen
Protokolleintrag:

```json
{
  "id": "f293b539-1552-4d31-89ef-eb785c1e93fc",
  "deckId": "4f4ffbe2-559d-4c3e-a654-5fc8da44fbda",
  "cardId": "ca0e7651-45bf-4dc4-a24f-16e052e7cc09",
  "reviewedAt": "2026-06-24T09:15:00.000Z",
  "rating": "good",
  "previousIntervalDays": 0,
  "newIntervalDays": 3,
  "previousDueAt": "2026-06-24T08:01:00.000Z",
  "newDueAt": "2026-06-27T09:15:00.000Z",
  "schedulerVersion": "wortwerk-simple-v1"
}
```

Das Protokoll wird nicht für die aktuelle Darstellung benötigt. Es wird
bewusst gespeichert, damit später Statistiken, Algorithmusvergleiche,
Fehleranalysen und eine mögliche Migration zu FSRS möglich sind.

#### Migration aus Version 0.1

Beim Start sucht die App zuerst nach `wortwerk-data-v2`. Ist dieser Eintrag
nicht vorhanden, wird automatisch nach dem alten Schlüssel
`wortwerk-data-v1` gesucht.

Alte Stapel und Karten erhalten beim Einlesen automatisch:

- `updatedAt`
- ein leeres Feld `hint`
- den Lernstatus `new`
- einen sofort fälligen Termin
- Intervall `0`
- Ease-Faktor `2.5`
- Zähler für Wiederholungen und Fehlversuche

Anschließend wird der normalisierte Bestand im aktuellen V2-Format gespeichert.
Die ursprünglichen V1-Daten werden nicht aktiv gelöscht und können deshalb
weiterhin als zusätzliche Rückfallmöglichkeit bestehen bleiben.

> Der nachfolgende Abschnitt dokumentiert das ursprüngliche V1-Format. Er
> bleibt als Lern- und Migrationshistorie erhalten, ist aber nicht mehr das
> aktuelle Hauptformat.

### Speicherort

In Version 0.1 wurden die Daten über die Browser-Schnittstelle `localStorage`
unter folgendem Schlüssel gespeichert:

Der verwendete Speicherschlüssel lautet:

```text
wortwerk-data-v1
```

Unter diesem Schlüssel liegt ein einzelner JSON-Text. Dieser JSON-Text enthält
ein Array mit allen Stapeln.

### Datenformat eines Stapels

Jeder Stapel ist ein JavaScript-Objekt mit dieser Struktur:

```json
{
  "id": "1750752000000-a1b2c3d4",
  "name": "Englisch – Reisen",
  "description": "Wichtige Wörter für den nächsten Urlaub.",
  "cards": [],
  "createdAt": "2026-06-24T08:00:00.000Z"
}
```

#### Felder eines Stapels

| Feld | Datentyp | Bedeutung |
| --- | --- | --- |
| `id` | String | Eindeutige interne Kennung des Stapels |
| `name` | String | Sichtbarer Name des Stapels |
| `description` | String | Optionale Beschreibung |
| `cards` | Array | Liste aller Karten dieses Stapels |
| `createdAt` | String | Erstellungszeitpunkt im ISO-8601-Format |

### Datenformat einer Karte

Eine Karte wird innerhalb des Feldes `cards` ihres Stapels gespeichert:

```json
{
  "id": "1750752060000-e5f6a7b8",
  "front": "journey",
  "back": "Reise",
  "createdAt": "2026-06-24T08:01:00.000Z"
}
```

#### Felder einer Karte

| Feld | Datentyp | Bedeutung |
| --- | --- | --- |
| `id` | String | Eindeutige interne Kennung der Karte |
| `front` | String | Inhalt der Vorderseite |
| `back` | String | Inhalt der Rückseite |
| `createdAt` | String | Erstellungszeitpunkt im ISO-8601-Format |

### Vollständiges Speicherbeispiel

So sieht der gespeicherte JSON-Datensatz mit zwei Stapeln und mehreren Karten
beispielsweise aus:

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
      },
      {
        "id": "1750752120000-c9d0e1f2",
        "front": "luggage",
        "back": "Gepäck",
        "createdAt": "2026-06-24T08:02:00.000Z"
      }
    ],
    "createdAt": "2026-06-24T08:00:00.000Z"
  },
  {
    "id": "1750752180000-1122aabb",
    "name": "Spanisch – Grundlagen",
    "description": "",
    "cards": [],
    "createdAt": "2026-06-24T08:03:00.000Z"
  }
]
```

### Technischer Speichervorgang

Intern wird der aktuelle Stapelbestand mit `JSON.stringify` in einen JSON-Text
umgewandelt:

```javascript
localStorage.setItem("wortwerk-data-v1", JSON.stringify(state.decks));
```

Beim Öffnen der App wird der Text wieder gelesen und mit `JSON.parse` in
JavaScript-Objekte zurückverwandelt:

```javascript
const storedData = localStorage.getItem("wortwerk-data-v1");
const decks = storedData ? JSON.parse(storedData) : [];
```

Wenn keine Daten vorhanden sind oder der gespeicherte Inhalt nicht gelesen
werden kann, startet die App sicherheitshalber mit einer leeren Stapelliste.

### Erzeugung der IDs

IDs werden aus zwei Teilen zusammengesetzt:

1. dem aktuellen Unix-Zeitstempel in Millisekunden
2. einem zufälligen hexadezimalen Textabschnitt

Das Ergebnis sieht beispielsweise so aus:

```text
1750752000000-a1b2c3d4
```

Diese IDs werden intern verwendet, damit Stapel und Karten eindeutig gefunden
und bearbeitet werden können.

### Bedeutung des ISO-Zeitstempels

Das Feld `createdAt` wird mit `new Date().toISOString()` erzeugt.

Beispiel:

```text
2026-06-24T08:00:00.000Z
```

Das `Z` bedeutet, dass der Zeitpunkt in UTC gespeichert wird. Die Oberfläche
zeigt diesen Zeitpunkt in Version 0.1.0 noch nicht an. Er ist bereits
vorhanden, damit spätere Funktionen wie Sortierung, Statistik oder
Lernhistorie darauf aufbauen können.

## Lebenszyklus der Daten

Der Datenfluss innerhalb der App ist:

```text
App öffnen
    ↓
localStorage auslesen
    ↓
JSON in JavaScript-Objekte umwandeln
    ↓
Stapel und Karten im Arbeitsspeicher verwalten
    ↓
Nutzer erstellt oder entfernt Inhalte
    ↓
Aktualisierten Bestand in JSON umwandeln
    ↓
JSON wieder in localStorage speichern
    ↓
Oberfläche neu darstellen
```

## Wichtige Hinweise zur lokalen Speicherung

- Die Daten bleiben ausschließlich im verwendeten Browserprofil.
- Die Daten werden nicht an einen Server übertragen.
- Ein anderer Browser sieht die gespeicherten Daten nicht.
- Ein anderes Gerät sieht die gespeicherten Daten nicht.
- Beim Löschen der Browserdaten können auch die Wortwerk-Daten verloren gehen.
- Privater beziehungsweise Inkognito-Modus kann Daten beim Schließen verwerfen.
- Die ZIP-Datei enthält nur die App, nicht die später im Browser angelegten
  persönlichen Stapel.
- Wird die App über unterschiedliche Adressen geöffnet, können getrennte
  Speicherbereiche entstehen. `file://`, `localhost` und eine spätere
  Internetadresse gelten für den Browser als unterschiedliche Ursprünge.

`localStorage` ist für den ersten Entwicklungsschritt bewusst gewählt worden,
weil es ohne Server funktioniert und einen sehr schnellen Test der
Grundfunktionen ermöglicht. Für Benutzerkonten, Synchronisierung oder große
Datenmengen sollte die Speicherung später durch eine Datenbank ergänzt werden.

## Technische Architektur

Die App verwendet aktuell keine Bibliothek und kein Framework. Alle Funktionen
sind mit den Standardmöglichkeiten moderner Browser umgesetzt.

### `index.html`

Enthält die feste Grundstruktur der App:

- Seitenleiste
- Kopfbereich
- Hauptinhaltsbereich
- Dialog zum Erstellen eines Stapels
- Dialog zum Hinzufügen einer Karte
- Bereich für Statusmeldungen
- Verknüpfungen zu Stylesheet und JavaScript

### `styles.css`

Enthält das vollständige Erscheinungsbild:

- Farben und Designvariablen
- Schriftarten und Typografie
- Seitenleiste und Navigation
- Startseite
- Stapel- und Kartenansicht
- Dialogfenster und Formulare
- Schaltflächen und Statusmeldungen
- Smartphone- und Tablet-Anpassungen
- reduzierte Animationen bei entsprechender Systemeinstellung

### `app.js`

Enthält die gesamte Programmlogik:

- Einlesen und Speichern der Daten
- Erzeugen eindeutiger IDs
- Maskieren eingegebener Texte
- Darstellen der Startseite
- Darstellen der Stapelnavigation
- Darstellen eines ausgewählten Stapels
- Darstellen der Kartenliste
- Öffnen und Schließen der Dialoge
- Erstellen neuer Stapel
- Hinzufügen neuer Karten
- Entfernen von Karten
- Aktualisieren der Oberfläche
- Steuerung der mobilen Navigation
- Anzeigen von Statusmeldungen

### `Readmes/`

Enthält pro größerem Entwicklungsschritt eine eigene datierte
Dokumentationsdatei. Dadurch bleibt nachvollziehbar, welche Funktionen und
Datenformate zu welchem Stand gehörten.

## Interner Anwendungszustand

Während die App geöffnet ist, verwaltet JavaScript einen kleinen
Anwendungszustand:

```javascript
const state = {
  decks: loadedData.decks,
  reviewLog: loadedData.reviewLog,
  activeDeckId: null,
  view: "welcome",
  editingDeckId: null,
  editingCardId: null,
  searchQuery: "",
  sortOrder: "newest",
  study: null
};
```

`decks` und `reviewLog` sind die dauerhaft gespeicherten Bestandteile.
`activeDeckId`, `view`, Filter, Bearbeitungs-IDs und `study` beschreiben nur die
aktuelle Sitzung. Nach einem vollständigen Neuladen erscheint deshalb zunächst
die Startseite, während Stapel, Karten, Lernstände und Protokolle erhalten
bleiben.

## Programmierdetails für das Lernprojekt

Dieser Abschnitt erklärt die Implementierung bewusst ausführlich. Er dient als
technischer Einstiegspunkt für jede weitere Entwicklungsstufe.

### Grundprinzip der aktuellen Architektur

Die App folgt in vereinfachter Form einem unidirektionalen Datenfluss:

```text
Gespeicherte Daten
      ↓
JavaScript-Zustand
      ↓
Rendering
      ↓
Sichtbare Oberfläche
      ↓
Benutzeraktion
      ↓
Ereignisbehandlung
      ↓
Zustand verändern
      ↓
Speichern und erneut rendern
```

Die sichtbare Oberfläche ist nicht die eigentliche Datenquelle. Die
entscheidenden Daten liegen im Objekt `state`. HTML-Elemente werden aus diesem
Zustand erzeugt.

Das ist eine wichtige Architekturregel:

> Erst die Daten verändern, danach die Oberfläche aus den Daten neu erzeugen.

Dadurch müssen Kartenanzahl, Seitenleiste und Stapelansicht nicht unabhängig
voneinander manuell aktualisiert werden. Ein erneutes `render()` bringt alle
Bereiche auf denselben Stand.

### Startreihenfolge der Anwendung

Wenn der Browser `index.html` öffnet, läuft vereinfacht diese Reihenfolge ab:

1. Der Browser liest das HTML.
2. `styles.css` wird geladen und auf das HTML angewendet.
3. Am Ende des Dokuments wird `app.js` geladen.
4. Die Konstante `STORAGE_KEY` wird angelegt.
5. `loadData()` liest das aktuelle oder alte Speicherformat.
6. Normalisierungsfunktionen ergänzen fehlende V2-Felder.
7. `state` übernimmt Stapel und Wiederholungsprotokoll.
8. Referenzen auf häufig benötigte HTML-Elemente werden gesammelt.
9. Ereignisbehandlungen werden registriert.
10. `saveData()` schreibt den normalisierten V2-Stand.
11. Der erste Aufruf von `render()` erzeugt die Start- oder Stapelansicht.

Das JavaScript wird am Ende des `<body>` eingebunden. Deshalb sind die festen
HTML-Elemente bereits vorhanden, wenn `document.querySelector()` ausgeführt
wird.

### Warum die App noch kein Framework verwendet

Für den ersten Schritt wurden bewusst keine Werkzeuge wie React, Vue oder
Angular eingesetzt.

Vorteile für dieses Lernstadium:

- DOM und Browser-APIs bleiben direkt sichtbar.
- Es ist kein Build-Prozess notwendig.
- Die App lässt sich durch Öffnen von `index.html` starten.
- Zustandsänderungen und Rendering können ohne Abstraktionsschicht gelernt
  werden.
- Das Projekt besitzt nur sehr wenige Abhängigkeiten.

Nachteile, die bei wachsendem Produkt relevant werden:

- HTML-Vorlagen in JavaScript werden schnell umfangreich.
- Einzelne Bereiche lassen sich schwerer als unabhängige Komponenten testen.
- Manuelles Rendering kann bei großen Datenmengen ineffizient werden.
- Zustandslogik, Speicherung und Darstellung liegen aktuell in derselben Datei.

Ein späterer Wechsel zu Modulen oder einem Framework sollte erfolgen, wenn die
Komplexität dies rechtfertigt, nicht nur weil ein Framework verfügbar ist.

## JavaScript-Implementierung im Detail

### `STORAGE_KEY`

```javascript
const STORAGE_KEY = "wortwerk-data-v2";
const LEGACY_STORAGE_KEY = "wortwerk-data-v1";
```

Diese Konstante definiert den Namen des Eintrags im Browserspeicher.

Das Suffix `v2` ist eine einfache Form der Schema-Versionierung. Der zusätzliche
Legacy-Schlüssel ermöglicht die automatische Übernahme des ersten
Speicherformats.

Der Schlüssel darf nicht ohne geplante Migration geändert werden. Andernfalls
würde die App die vorhandenen Daten unter dem alten Schlüssel nicht mehr
finden.

### `state`

```javascript
const state = {
  decks: loadedData.decks,
  reviewLog: loadedData.reviewLog,
  activeDeckId: null,
  view: "welcome",
  editingDeckId: null,
  editingCardId: null,
  searchQuery: "",
  sortOrder: "newest",
  study: null
};
```

Das Objekt speichert den aktuellen Arbeitszustand der App:

- `decks` ist die vollständige Liste aller Stapel.
- `reviewLog` enthält alle geplanten Lernbewertungen.
- `activeDeckId` bestimmt, welcher Stapel gerade geöffnet ist.
- `view` unterscheidet Startseite, Stapelansicht und Lernmodus.
- `editingDeckId` und `editingCardId` steuern die Bearbeitungsdialoge.
- `searchQuery` und `sortOrder` steuern die Kartenverwaltung.
- `study` enthält die nur vorübergehend benötigte Lernsession.

`activeDeckId` enthält nur eine ID und keine Kopie des Stapelobjekts. Der
aktuelle Stapel wird bei Bedarf mit `find()` aus `state.decks` gesucht. So gibt
es nur eine maßgebliche Version jedes Stapels.

### `elements`

Das Objekt `elements` speichert Referenzen auf häufig verwendete DOM-Elemente:

```javascript
const elements = {
  deckList: document.querySelector("#deckList"),
  contentArea: document.querySelector("#contentArea"),
  deckModal: document.querySelector("#deckModal")
};
```

Ohne dieses Objekt müsste dasselbe Element bei jeder Aktion erneut mit
`document.querySelector()` gesucht werden.

Vorteile:

- weniger wiederholter Code
- klarere Funktionsaufrufe
- zentrale Übersicht der festen Bedienelemente
- DOM-Suchen werden nur einmal beim Start ausgeführt

Nur Elemente, die bereits im festen HTML vorhanden sind, können hier direkt
gespeichert werden. Dynamisch gerenderte Elemente wie „Erste Karte hinzufügen“
existieren erst nach einem Rendering und werden deshalb später abgefragt oder
über Event Delegation behandelt.

### `loadData()` und Normalisierung

Aufgabe: Aktuelle oder alte Daten beim Start einlesen und in das V2-Schema
überführen.

```javascript
function loadData() {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return normalizeData(JSON.parse(current));

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) return normalizeData(JSON.parse(legacy));

  return { decks: [], reviewLog: [] };
}
```

`normalizeData()`, `normalizeDeck()` und `normalizeCard()` ergänzen fehlende
Felder und ersetzen ungültige Einzelwerte durch sichere Standardwerte.

Ablauf:

1. aktuellen V2-Schlüssel suchen,
2. andernfalls alten V1-Schlüssel suchen,
3. JSON in JavaScript-Werte umwandeln,
4. Wurzelstruktur erkennen,
5. jeden Stapel normalisieren,
6. jede Karte normalisieren,
7. Lernfelder mit Standardwerten ergänzen,
8. Wiederholungsprotokoll übernehmen oder leer beginnen.

Der `try/catch` verhindert weiterhin einen vollständigen App-Absturz bei
beschädigtem JSON. Eine spätere Version soll zusätzlich einen sichtbaren
Reparaturbericht anbieten.

### `saveData()`

Aufgabe: Den vollständigen aktuellen Produktzustand dauerhaft speichern.

```javascript
localStorage.setItem(
  STORAGE_KEY,
  JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    decks: state.decks,
    reviewLog: state.reviewLog
  })
);
```

`localStorage` kann nur Strings speichern. Deshalb wird das versionierte Objekt
mit `JSON.stringify()` serialisiert.

Die Funktion speichert immer den vollständigen Bestand. Das ist für kleine
lokale Datensätze einfach und zuverlässig. Bei sehr großen Sammlungen wäre eine
Datenbank wie IndexedDB effizienter, weil nicht nach jeder Änderung alles neu
geschrieben werden müsste.

`localStorage` arbeitet synchron. Während des Schreibens ist der
JavaScript-Hauptthread kurz blockiert. Bei der aktuellen Datenmenge ist das
praktisch nicht spürbar. Für Audio, Bilder oder viele Tausend Karten wäre diese
Speichertechnik nicht mehr geeignet.

### `createId()`

```javascript
function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
```

Moderne Browser verwenden `crypto.randomUUID()`. Nur wenn diese Schnittstelle
nicht vorhanden ist, kombiniert die Funktion als Rückfall:

- `Date.now()` als Millisekunden seit dem 01.01.1970
- einen zufälligen Textanteil

Das reicht für den lokalen Prototyp, ist aber keine mathematisch garantierte
globale Eindeutigkeit.

Für die spätere Synchronisierung zwischen mehreren Geräten sollte
`crypto.randomUUID()` oder eine serverseitig vergebene ID verwendet werden:

```javascript
const id = crypto.randomUUID();
```

### `escapeHtml(value)`

```javascript
function escapeHtml(value) {
  const temp = document.createElement("div");
  temp.textContent = value;
  return temp.innerHTML;
}
```

Die App baut Teile der Oberfläche mit Template-Strings und `innerHTML` auf.
Direkt eingefügte Nutzereingaben könnten dadurch als HTML interpretiert werden.

`escapeHtml()` nutzt `textContent`, um Sonderzeichen sicher umzuwandeln:

```text
<script> wird zu &lt;script&gt;
```

Dadurch wird der Text sichtbar dargestellt, aber nicht als HTML ausgeführt.
Das reduziert das Risiko von Cross-Site-Scripting innerhalb der lokalen App.

Langfristig sollte dynamischer Text bevorzugt über `textContent` in gezielt
erzeugte DOM-Elemente eingesetzt werden. Das ist sicherer als umfangreiche
HTML-Strings.

### `cardIcon()`

Diese Hilfsfunktion liefert das mehrfach verwendete SVG-Symbol als
HTML-String. Dadurch muss der SVG-Code nicht an mehreren Stellen vollständig
wiederholt werden.

Bei einer größeren App sollte ein zentraler Icon-Mechanismus oder eine
Komponentenstruktur verwendet werden.

### `render()`

`render()` ist der zentrale Verteiler für die Darstellung:

```javascript
function render() {
  renderDeckNavigation();

  const activeDeck = state.decks.find(
    (deck) => deck.id === state.activeDeckId
  );

  if (activeDeck) {
    renderDeck(activeDeck);
  } else {
    renderWelcome();
  }
}
```

Die Funktion erledigt zwei Dinge:

1. Sie aktualisiert immer die Stapelnavigation.
2. Sie entscheidet, ob die Startseite oder ein Stapel angezeigt wird.

Die Suche mit `find()` läuft im ungünstigsten Fall durch alle Stapel. Die
Laufzeit ist damit `O(n)`. Für die erwartete Anzahl lokaler Stapel ist das
unproblematisch.

### `renderDeckNavigation()`

Diese Funktion erzeugt die Seitenleiste aus `state.decks`.

Für jeden Stapel wird eine Schaltfläche mit folgenden Daten erzeugt:

- `data-deck-id` für die spätere Auswahl
- Stapelname
- Anzahl der Karten
- CSS-Klasse `active`, wenn die ID der `activeDeckId` entspricht

`Array.map()` wandelt jedes Stapelobjekt in einen HTML-String um. `join("")`
verbindet alle Einträge ohne zusätzliches Trennzeichen.

### `renderWelcome()`

Die Funktion:

- setzt den Seitentitel,
- passt die Hauptaktion auf „Stapel erstellen“ an,
- schreibt die Einführungsansicht in den Inhaltsbereich,
- registriert den Klick auf „Ersten Stapel erstellen“.

Der Listener muss nach `innerHTML` registriert werden, weil die Schaltfläche vor
diesem Rendering noch nicht existiert.

### `renderDeck(deck)`

Die Funktion erhält das bereits gefundene Stapelobjekt als Parameter.

Sie entscheidet zwischen zwei Zuständen:

- Stapel ohne Karten: Empty State mit einer klaren nächsten Aktion
- Stapel mit Karten: Aufruf von `renderCardTable(deck)`

Die Beschreibung wird vor dem Einfügen mit `escapeHtml()` maskiert. Ist keine
Beschreibung vorhanden, wird ein verständlicher Ersatztext angezeigt.

### `renderCardTable(deck)`

`renderCardTable()` erzeugt den HTML-String für die Kartenliste.

Jede Kartenzeile enthält:

- Vorderseite
- Rückseite
- Löschschaltfläche
- `data-card-id` als Verbindung zwischen DOM und Datenmodell

Die Funktion verändert keine Daten. Sie ist ausschließlich für Darstellung
zuständig. Diese Trennung ist wichtig: Renderfunktionen sollten möglichst keine
Geschäftslogik ausführen.

### Dialogfunktionen

`openDeckModal()` und `openCardModal()`:

- setzen vorhandene Formularwerte zurück,
- öffnen das native HTML-`dialog`-Element,
- setzen den Fokus auf das erste Eingabefeld.

`requestAnimationFrame()` verschiebt das Fokussieren auf den nächsten
Darstellungszyklus. Dadurch ist der Dialog bereits sichtbar, wenn `focus()`
ausgeführt wird.

`closeDialog(dialog)` prüft zuerst `dialog.open`. Das verhindert unnötige oder
ungültige Schließversuche.

### `showToast(message)`

Die Funktion zeigt eine zeitlich begrenzte Statusmeldung:

1. Ein eventuell laufender Timer wird beendet.
2. Der neue Text wird gesetzt.
3. Die CSS-Klasse `visible` wird hinzugefügt.
4. Nach 2,3 Sekunden wird sie wieder entfernt.

Durch `clearTimeout()` überschreiben schnelle aufeinanderfolgende Aktionen
einander kontrolliert, statt mehrere konkurrierende Timer zu erzeugen.

### `addDeck(event)`

Diese Funktion verarbeitet das Absenden des Stapelformulars.

```text
Formular absenden
    ↓
Standard-Neuladen verhindern
    ↓
Werte lesen und Leerzeichen entfernen
    ↓
neues Stapelobjekt erstellen
    ↓
mit unshift() vorne einfügen
    ↓
neuen Stapel aktiv setzen
    ↓
speichern
    ↓
Dialog schließen
    ↓
rendern
    ↓
Statusmeldung zeigen
```

`event.preventDefault()` verhindert das normale Verhalten eines
HTML-Formulars, bei dem die Seite neu geladen oder an eine Serveradresse
gesendet würde.

`trim()` entfernt Leerzeichen am Anfang und Ende. Eine Eingabe, die nur aus
Leerzeichen besteht, wird dadurch zu einem leeren String und nicht gespeichert.

`unshift()` setzt den neuen Stapel an den Anfang des Arrays. Dadurch erscheinen
neu erstellte Stapel oben in der Navigation.

### `addCard(event)`

Die Funktion folgt demselben Muster wie `addDeck()`:

1. Formularverhalten stoppen
2. Vorder- und Rückseite lesen
3. aktiven Stapel mit `find()` bestimmen
4. Eingaben prüfen
5. Kartenobjekt erzeugen
6. Karte mit `unshift()` vorne einfügen
7. speichern und neu rendern

Die Karte wird nicht in einer globalen Kartenliste gespeichert. Sie liegt
verschachtelt im Array `cards` des zugehörigen Stapels. Dadurch ist die
Zugehörigkeit eindeutig.

### `removeCard(cardId)`

Diese Funktion entfernt eine Karte über ihre ID:

1. aktiven Stapel suchen
2. betroffene Karte suchen
3. Sicherheitsabfrage anzeigen
4. bei Abbruch nichts verändern
5. mit `filter()` ein neues Kartenarray ohne diese ID erzeugen
6. speichern und neu rendern

`filter()` verändert das vorhandene Array nicht direkt, sondern erstellt ein
neues Array. Alle Karten, deren ID nicht der zu löschenden ID entspricht,
bleiben enthalten.

### Event Listener

Event Listener verbinden Benutzeraktionen mit Funktionen.

Beispiele:

```javascript
elements.deckForm.addEventListener("submit", addDeck);
elements.cardForm.addEventListener("submit", addCard);
```

Die Formulare werden über das `submit`-Ereignis und nicht nur über den Klick
auf den Button verarbeitet. Dadurch funktioniert das Absenden auch mit der
Enter-Taste.

## Event Delegation im Detail

Ein Teil der Oberfläche wird bei jedem `render()` neu erzeugt. Direkt an diesen
Elementen registrierte Listener würden beim Ersetzen von `innerHTML` entfernt.

Deshalb verwendet die App an wichtigen Stellen Event Delegation:

```javascript
elements.contentArea.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-card-id]");

  if (deleteButton) {
    removeCard(deleteButton.dataset.cardId);
  }
});
```

Der Listener befindet sich auf dem dauerhaft vorhandenen Elternbereich. Ein
Klick auf ein Kind-Element steigt als Ereignis nach oben. Mit `closest()` wird
geprüft, ob der Klick innerhalb einer Löschschaltfläche stattgefunden hat.

Vorteile:

- ein Listener reicht für alle Karten,
- neu gerenderte Karten funktionieren sofort,
- weniger Listener benötigen weniger Verwaltung,
- die Logik bleibt unabhängig von der Kartenanzahl.

Dasselbe Prinzip wird für die Auswahl eines Stapels in `deckList` verwendet.

## DOM-Rendering und seine Grenzen

Die aktuelle App ersetzt größere Bereiche mit:

```javascript
elements.contentArea.innerHTML = `...`;
```

Das ist für einen kleinen Prototyp übersichtlich. Es hat jedoch Grenzen:

- Der gesamte Inhaltsbereich wird nach jeder Änderung neu erstellt.
- Fokus oder Scrollposition können bei komplexeren Ansichten verloren gehen.
- Große Listen erzeugen unnötige DOM-Arbeit.
- HTML und JavaScript vermischen sich zunehmend.

Mögliche spätere Verbesserungen:

1. kleine Renderfunktionen pro Komponente
2. gezieltes Aktualisieren einzelner DOM-Bereiche
3. HTML-`template`-Elemente
4. ES-Module mit getrennten Verantwortlichkeiten
5. bei weiter wachsender Komplexität ein UI-Framework

## HTML-Implementierung im Detail

### Semantische Grundstruktur

Die Oberfläche verwendet semantische Elemente:

- `<aside>` für die Stapelnavigation
- `<nav>` für die Liste der Stapel
- `<main>` für den Hauptinhalt
- `<header>` für den Kopfbereich
- `<section>` und `<article>` für Inhaltsgruppen
- `<dialog>` für modale Eingaben
- `<form>` für strukturierte Dateneingabe
- `<button>` für ausführbare Aktionen

Semantisches HTML hilft Browsern, Suchmaschinen und assistiven Technologien,
die Bedeutung der Oberfläche zu verstehen.

### Formulare und Browser-Validierung

Pflichtfelder besitzen das Attribut `required`. Zeichenbegrenzungen werden mit
`maxlength` definiert.

Beispiel:

```html
<input
  id="cardFront"
  maxlength="80"
  required
/>
```

Der Browser verhindert dadurch das Absenden leerer Pflichtfelder und begrenzt
die Eingabelänge bereits auf der Oberfläche. JavaScript prüft die wichtigsten
Werte zusätzlich.

### `aria`-Attribute

Die App enthält erste Hilfen für Barrierefreiheit:

- `aria-label` für reine Icon-Schaltflächen
- `aria-live="polite"` für dynamische Inhaltsänderungen
- `role="status"` für Statusmeldungen
- `aria-hidden="true"` für rein dekorative Symbole

Für Produktreife sind noch systematische Tastatur-, Screenreader- und
Kontrasttests erforderlich.

## CSS-Implementierung im Detail

### Designvariablen

Farben, Abstände und Radien werden als CSS Custom Properties definiert:

```css
:root {
  --bg: #f5f6f2;
  --surface: #ffffff;
  --primary: #315c4b;
  --radius-lg: 24px;
}
```

Vorteile:

- zentrale Änderungen
- konsistentes Design
- leichtere Einführung eines Dark Mode
- weniger wiederholte Farbwerte

### Layout

Die Desktop-Oberfläche verwendet CSS Grid:

```css
.app-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
}
```

Die Seitenleiste hat eine feste Breite. Der Hauptbereich verwendet den
restlichen Platz. `minmax(0, 1fr)` verhindert, dass lange Inhalte das Grid
ungewollt verbreitern.

Innerhalb einzelner Komponenten wird zusätzlich Flexbox verwendet, wenn eine
eindimensionale Ausrichtung ausreicht.

### Responsive Breakpoints

Bei maximal 900 Pixeln:

- wird die feste Seitenleiste ausgeblendet,
- kann sie als mobiles Menü eingeschoben werden,
- wird das Startseiten-Layout einspaltig.

Bei maximal 620 Pixeln:

- werden Abstände reduziert,
- wird die Hauptaktion kompakter,
- werden Karten untereinander dargestellt,
- werden Formulardialoge an kleine Displays angepasst.

Die Breakpoints orientieren sich an der benötigten Inhaltsbreite und nicht an
einem bestimmten Gerätemodell.

### Animationen

Übergänge werden für Hover-Zustände, Dialoge, Navigation und Statusmeldungen
verwendet. Gleichzeitig berücksichtigt die App die Systemeinstellung
`prefers-reduced-motion`.

Menschen, die reduzierte Bewegung eingestellt haben, erhalten nahezu sofortige
Übergänge. Das ist ein wichtiger Baustein barrierearmer Oberflächen.

## Beispiel eines vollständigen Programmablaufs

### Nutzer erstellt eine Karte

```text
1. Nutzer klickt auf „Karte hinzufügen“
2. click-Listener ruft openCardModal() auf
3. Formular wird zurückgesetzt
4. Dialog wird geöffnet
5. Nutzer gibt Vorder- und Rückseite ein
6. Nutzer sendet das Formular ab
7. submit-Listener ruft addCard(event) auf
8. event.preventDefault() verhindert das Neuladen
9. Eingaben werden gelesen und mit trim() bereinigt
10. Aktiver Stapel wird über activeDeckId gesucht
11. Neues Kartenobjekt wird erzeugt
12. Karte wird in activeDeck.cards eingefügt
13. saveData() serialisiert Schema-Version, Stapel und Lernprotokoll als JSON
14. localStorage speichert den JSON-Text
15. Dialog wird geschlossen
16. render() baut Navigation und Stapelansicht neu auf
17. showToast() bestätigt die Aktion
```

Dieser Ablauf zeigt das zentrale Muster der gesamten App:

```text
Ereignis → prüfen → Zustand ändern → speichern → rendern → Rückmeldung
```

## Fehlerbehandlung

Die aktuelle Version besitzt bereits grundlegende defensive Prüfungen:

- beschädigter Speicherinhalt führt zu einer leeren Liste statt zu einem
  vollständigen Absturz,
- ein fehlender aktiver Stapel verhindert das Hinzufügen einer Karte,
- leere Eingaben werden nicht verarbeitet,
- eine unbekannte Karten-ID wird nicht gelöscht,
- Dialoge werden nur geschlossen, wenn sie geöffnet sind.

Für Produktreife fehlen noch:

- sichtbare Meldung bei Speicherfehlern
- Behandlung eines vollen Browserspeichers
- vollständige Schema-Validierung
- Fehlerprotokollierung
- Wiederherstellung beschädigter Datensätze
- automatisierte Tests für Fehlerfälle

## Datenvalidierung für eine Produktversion

Die aktuelle Prüfung:

```javascript
Array.isArray(parsedData)
```

reicht für einen Prototyp, aber nicht für langfristige Produktdaten.

Eine spätere Validierung sollte für jeden Stapel prüfen:

```text
id             muss ein nicht leerer String sein
name           muss ein nicht leerer String sein
description    muss ein String sein
cards          muss ein Array sein
createdAt      muss ein gültiger Zeitstempel sein
```

Für jede Karte sollte geprüft werden:

```text
id             muss ein nicht leerer String sein
front          muss ein nicht leerer String sein
back           muss ein nicht leerer String sein
createdAt      muss ein gültiger Zeitstempel sein
```

Ungültige Datensätze sollten nicht kommentarlos die gesamte Sammlung
unbrauchbar machen. Sinnvoll wären:

- gültige Einträge behalten,
- ungültige Einträge separat protokollieren,
- Nutzer über die Reparatur informieren,
- vor einer Migration ein Backup erzeugen.

## Datenmigration und Schema-Versionen

Sobald echte Nutzer die App regelmäßig verwenden, dürfen Datenstrukturen nicht
beliebig geändert werden.

Angenommen, Karten erhalten später neue Felder:

```json
{
  "id": "...",
  "front": "journey",
  "back": "Reise",
  "createdAt": "...",
  "difficulty": 0,
  "lastReviewedAt": null
}
```

Alte Karten besitzen diese Felder noch nicht. Eine Migrationsfunktion könnte
beim Laden Standardwerte ergänzen:

```javascript
function migrateCard(card) {
  return {
    ...card,
    difficulty: card.difficulty ?? 0,
    lastReviewedAt: card.lastReviewedAt ?? null
  };
}
```

Für eine robuste Produktversion sollte das gespeicherte Wurzelobjekt eine
explizite Schema-Version besitzen:

```json
{
  "schemaVersion": 1,
  "decks": []
}
```

Dann kann der Startvorgang abhängig von `schemaVersion` die notwendigen
Migrationen in der richtigen Reihenfolge ausführen.

## Datenschutz und Sicherheit

### Aktueller Stand

- Daten werden nur lokal gespeichert.
- Es gibt keine Anmeldung.
- Es werden keine Vokabeln an einen eigenen Server gesendet.
- Nutzereingaben werden vor der HTML-Ausgabe maskiert.

### Externe Schriftarten

Die aktuelle HTML-Datei lädt Schriftarten von Google Fonts. Dadurch findet beim
Öffnen mit Internetverbindung eine Anfrage an einen externen Dienst statt.

Für eine vollständig offlinefähige und datenschutzfreundlichere Produktversion
sollten die Schriftdateien lokal eingebunden oder Systemschriftarten verwendet
werden.

### Spätere Konten und Cloud-Speicherung

Sobald Konten oder Synchronisierung ergänzt werden, müssen unter anderem
beachtet werden:

- sichere Passwortbehandlung oder etablierter Anmeldedienst
- verschlüsselte HTTPS-Verbindungen
- Zugriffskontrolle pro Nutzer
- Schutz vor unberechtigtem Lesen und Schreiben
- Datenschutzerklärung
- Löschung und Export persönlicher Daten
- Backups
- sichere Server- und Datenbankkonfiguration

## Performance-Betrachtung

Für kleine und mittlere Stapel ist die aktuelle Implementierung ausreichend.

Ungefähre Eigenschaften:

- Stapelsuche mit `find()`: `O(n)`
- Kartensuche mit `find()`: `O(m)`
- Kartenentfernung mit `filter()`: `O(m)`
- vollständiges Rendering der Kartenliste: `O(m)`
- vollständiges Serialisieren aller Daten: abhängig von der Gesamtgröße

`n` steht für die Anzahl der Stapel, `m` für die Anzahl der Karten im aktiven
Stapel.

Bei Tausenden Karten könnten folgende Maßnahmen sinnvoll werden:

- IndexedDB statt `localStorage`
- nur veränderte Datensätze speichern
- paginierte oder virtualisierte Kartenlisten
- Suchindizes
- Komponenten gezielt statt vollständig neu rendern
- schwere Berechnungen außerhalb des direkten UI-Ablaufs

## Teststrategie für die weitere Entwicklung

### Bereits durchgeführte manuelle Integrationstests

Die aktuelle Version wurde als vollständiger Benutzerablauf im Browser geprüft:

```text
Start → Stapel erstellen → Karte hinzufügen → Anzeige prüfen
→ Karte entfernen → mobile Ansicht prüfen
```

### Empfohlene automatisierte Unit-Tests

Kleine Funktionen sollten isoliert geprüft werden:

- `createId()` liefert einen String und möglichst unterschiedliche Werte.
- `escapeHtml()` maskiert HTML-Sonderzeichen.
- Datenvalidatoren akzeptieren gültige und verwerfen ungültige Daten.
- Migrationen erzeugen das erwartete neue Schema.
- Lernalgorithmen berechnen korrekte Wiederholungszeitpunkte.

### Empfohlene Integrationstests

- Stapel wird nach dem Absenden im Zustand und Speicher angelegt.
- Karte wird dem richtigen Stapel zugeordnet.
- Entfernte Karte verschwindet aus Zustand, Speicher und Oberfläche.
- Ein beschädigter Speicherinhalt verhindert nicht den App-Start.
- Daten bleiben nach einem Neuladen erhalten.

### Empfohlene End-to-End-Tests

- vollständiger Lernablauf auf Desktop
- vollständiger Lernablauf auf Smartphone
- Tastaturbedienung ohne Maus
- Import und Export
- Offline-Start
- Datenmigration von einer alten Version

### Definition of Done für neue Funktionen

Eine Funktion gilt künftig erst als fertig, wenn:

- das gewünschte Verhalten implementiert ist,
- Eingaben und Fehlerfälle behandelt werden,
- Smartphone und Desktop berücksichtigt sind,
- Tastaturbedienung geprüft ist,
- Datenformat dokumentiert ist,
- notwendige Migrationen vorhanden sind,
- passende Tests ergänzt wurden,
- die passende datierte Dokumentation und Versionshistorie aktualisiert sind.

## Empfohlene Architektur bei wachsendem Projekt

Die aktuelle einzelne JavaScript-Datei ist für Version 0.1.0 passend. Mit neuen
Funktionen sollte das Projekt schrittweise aufgeteilt werden:

```text
src/
├── app.js
├── state/
│   └── store.js
├── storage/
│   ├── storage.js
│   └── migrations.js
├── models/
│   ├── deck.js
│   └── card.js
├── views/
│   ├── welcomeView.js
│   ├── deckView.js
│   └── studyView.js
├── components/
│   ├── modal.js
│   └── toast.js
├── services/
│   └── spacedRepetition.js
└── utils/
    ├── ids.js
    └── validation.js
```

Mögliche Verantwortlichkeiten:

| Bereich | Verantwortung |
| --- | --- |
| `state` | aktueller Anwendungszustand und Zustandsänderungen |
| `storage` | Laden, Speichern, Import, Export und Migration |
| `models` | gültige Struktur von Stapeln und Karten |
| `views` | Darstellung vollständiger Ansichten |
| `components` | wiederverwendbare UI-Bausteine |
| `services` | fachliche Logik wie Wiederholungsalgorithmen |
| `utils` | kleine allgemeine Hilfsfunktionen |

Diese Aufteilung sollte schrittweise erfolgen. Eine zu frühe Aufteilung in sehr
viele Dateien kann ein kleines Projekt unnötig kompliziert machen.

## Vorgehen beim Implementieren einer neuen Funktion

Als Lern- und Qualitätsprozess sollte jede neue Funktion in dieser Reihenfolge
entwickelt werden:

### 1. Nutzerproblem beschreiben

Beispiel:

```text
Als Lernender möchte ich eine Karte bearbeiten,
damit ich Tippfehler korrigieren kann.
```

### 2. Datenänderung bestimmen

Für „Karte bearbeiten“ muss geklärt werden:

- Welche ID identifiziert die Karte?
- Welche Felder dürfen geändert werden?
- Wird ein `updatedAt`-Feld benötigt?
- Bleibt das bestehende Speicherformat kompatibel?

### 3. Zustandsfunktion implementieren

Zuerst sollte die eigentliche Datenänderung klar sein:

```text
Stapel finden → Karte finden → Werte validieren
→ Karte aktualisieren → speichern
```

### 4. Oberfläche ergänzen

Danach folgen:

- Bearbeiten-Schaltfläche
- Dialog
- vorausgefüllte Werte
- Fehlermeldungen
- Erfolgsbestätigung

### 5. Sonderfälle prüfen

- Stapel existiert nicht
- Karte existiert nicht
- Felder sind leer
- Werte sind zu lang
- Speicher schlägt fehl
- Nutzer bricht ab

### 6. Tests und Dokumentation ergänzen

Erst danach wird die Funktion in der Versionshistorie als abgeschlossen
markiert.

## Produkt-Roadmap mit technischen Meilensteinen

### Meilenstein A – Solide lokale App

- Stapel bearbeiten und löschen
- Karten bearbeiten
- Export und Import als JSON
- automatische Backups vor Importen
- Datenvalidierung
- Schema-Version im gespeicherten Wurzelobjekt
- automatisierte Basistests

Dieser Meilenstein macht die App lokal deutlich zuverlässiger.

### Meilenstein B – Echter Lernmodus

- Lernsession aus einem Stapel erzeugen
- Reihenfolge mischen
- Karte umdrehen
- Antworten bewerten
- Sitzungsfortschritt speichern
- erste Lernstatistik

### Meilenstein C – Spaced Repetition

Jede Karte benötigt zusätzliche Lerndaten, beispielsweise:

```json
{
  "review": {
    "repetitions": 0,
    "easeFactor": 2.5,
    "intervalDays": 0,
    "dueAt": null,
    "lastReviewedAt": null
  }
}
```

Der Algorithmus sollte als unabhängiger Service implementiert und mit Unit-Tests
abgesichert werden. UI und Algorithmus dürfen nicht unnötig miteinander
vermischt werden.

### Meilenstein D – Installierbare Offline-App

- Web-App-Manifest
- Service Worker
- lokales App-Symbol
- offline verfügbare Schriften und Assets
- Update-Strategie für gecachte Dateien
- Installation als Progressive Web App

### Meilenstein E – Konten und Synchronisierung

- Backend-API
- Datenbank
- Authentifizierung
- Synchronisationsmodell
- Konfliktlösung bei Änderungen auf mehreren Geräten
- sichere Datenmigration
- Backup- und Wiederherstellungsprozess

### Meilenstein F – Produktbetrieb

- Fehlerüberwachung
- Datenschutz und rechtliche Dokumente
- automatisierte Bereitstellung
- Versions- und Releaseprozess
- Wiederherstellungstests für Backups
- Nutzerfeedback und messbare Produktziele

## Lernziele nach Entwicklungsstufe

| Entwicklungsstufe | Zentrale Lerninhalte |
| --- | --- |
| Grundkonstrukt | HTML, CSS, JavaScript, DOM, Events, `localStorage` |
| Verwaltung | Formulare, Validierung, CRUD, Datenmodelle |
| Import/Export | Dateien, JSON, Fehlerbehandlung, Migration |
| Lernmodus | Zustandsautomaten, Sitzungslogik, UI-Komponenten |
| Lernalgorithmus | Algorithmen, Datum/Zeit, Unit-Tests |
| PWA | Caching, Offline-Strategien, Installierbarkeit |
| Cloud | APIs, Authentifizierung, Datenbanken, Sicherheit |
| Produktbetrieb | Releases, Monitoring, Backups, Datenschutz |

## Darstellung der Oberfläche

Die Oberfläche wird abhängig vom aktuellen Zustand neu aufgebaut:

- Kein aktiver Stapel: Startseite wird angezeigt.
- Aktiver Stapel ohne Karten: Leere Stapelansicht mit Aufforderung zum
  Hinzufügen der ersten Karte.
- Aktiver Stapel mit Karten: Kartenliste mit Vorderseite, Rückseite und
  Löschfunktion.

Nach jeder Datenänderung wird die zentrale Darstellungsfunktion erneut
ausgeführt. Dadurch bleiben Navigation, Kartenanzahl und Hauptansicht
automatisch synchron.

## Projektdateien

```text
Wortwerk/
├── index.html
├── styles.css
├── app.js
├── CSV-BEISPIEL.csv
└── Readmes/
    ├── Grundkonstrukt_24.06.2026.md
    └── Lernmodus_und_Datenverwaltung_24.06.2026.md
```

`CSV-BEISPIEL.csv` ist eine direkt bearbeitbare Vorlage für den Tabellenimport.
Der Ordner `Readmes` bildet den dokumentierten Änderungsverlauf.

## App starten

### Einfacher Test

1. ZIP-Datei entpacken.
2. Den entpackten Ordner öffnen.
3. `index.html` doppelt anklicken.
4. Einen Stapel erstellen.
5. Karten hinzufügen und entfernen.

Es ist keine Installation notwendig.

### Optional über einen lokalen Webserver

Für eine spätere Entwicklung empfiehlt es sich, den Ordner über einen lokalen
Webserver zu öffnen. Dadurch verhält sich die App näher an einer späteren
veröffentlichten Web-App.

## Getestete Abläufe

Am 24.06.2026 wurden folgende Abläufe im Browser geprüft:

- automatische Migration eines vorhandenen V1-Stapels
- Startseite wird korrekt geladen.
- Dialog zum Erstellen eines Stapels öffnet sich.
- Stapel kann mit Name und Beschreibung gespeichert werden.
- Neuer Stapel erscheint in der Navigation.
- Leerer Stapel zeigt die passende Hinweisseite.
- Dialog zum Hinzufügen einer Karte öffnet sich.
- Karte mit Vorder- und Rückseite kann gespeichert werden.
- Kartenanzahl wird korrekt aktualisiert.
- Karte wird korrekt in der Übersicht angezeigt.
- Löschabfrage erscheint beim Entfernen.
- Bestätigte Karte wird entfernt.
- Karte kann mit optionalem Denkanstoß angelegt werden.
- Karte kann nachträglich bearbeitet werden.
- Stapel kann nachträglich bearbeitet werden.
- Kartensuche filtert die sichtbare Liste.
- Sortierung A–Z verändert die Reihenfolge korrekt.
- Geplante Lernrunde wählt fällige und neue Karten aus.
- Denkanstoß kann ein- und ausgeblendet werden.
- Karte dreht sich zwischen Vorder- und Rückseite.
- Bewertung „Richtig“ plant eine Wiederholung in drei Tagen.
- Bewertung „Nicht gewusst“ plant eine Wiederholung in zehn Minuten.
- Fortschrittsanzeige wird nach jeder Bewertung aktualisiert.
- Abschlussansicht zeigt die Bewertungsverteilung.
- Lernstatus und nächster Termin erscheinen in der Kartenverwaltung.
- Freier Übungsmodus verändert keine Lerntermine.
- CSV-Export bestätigt die erfolgreiche Erstellung.
- Smartphone-Layout wird korrekt dargestellt.
- Smartphone-Lernmodus mit Kartennavigation wird korrekt dargestellt.
- Mobiles Navigationsmenü kann geöffnet werden.
- Während des Tests wurden keine Browserfehler protokolliert.

## Aktuelle Einschränkungen

Version 0.2.0 ist ein nutzbarer lokaler Prototyp. Noch nicht enthalten sind:

- wissenschaftlich optimierter FSRS-Scheduler
- Lernstatistiken über längere Zeiträume
- Benutzerkonten
- Synchronisierung zwischen Geräten
- Cloud-Datenbank
- Audio und Aussprache
- Bilder auf Karten
- Kategorien oder Tags
- Dunkler Modus
- Installation als native Smartphone-App
- Papierkorb und Rückgängig-Funktion
- Importvorschau mit frei zuweisbaren Spalten
- automatisierte Unit- und End-to-End-Tests im Projekt
- vollständig lokale Schriftdateien
- verschlüsselte Cloud-Backups

## Sinnvolle nächste Entwicklungsschritte

### Schritt 4 – Lernsystem vertiefen

- Lernstatistik
- persönliche Ziel-Erinnerungsquote
- Vergleich des einfachen Schedulers mit FSRS
- Auswertung des vorhandenen Wiederholungsprotokolls
- Begrenzung neuer Karten als Nutzereinstellung
- getrennte Lernrichtungen als spätere Option

### Schritt 4.5 – Verwaltung absichern

- Papierkorb statt endgültigem Sofortlöschen
- Rückgängig-Funktion
- Importvorschau
- frei zuweisbare CSV-Spalten
- automatische Sicherungshistorie
- Datenvalidator mit sichtbarem Reparaturbericht
- Tags und automatische Filter für schwierige Karten

### Schritt 5 – Benutzer und Synchronisierung

- Benutzerkonten
- Datenbank
- Anmeldung
- geräteübergreifende Synchronisierung
- Sicherung und Wiederherstellung

### Schritt 6 – Installierbare App

- Progressive Web App oder native App-Verpackung
- App-Symbol
- Offline-Modus
- Installation auf Smartphone und Desktop
- Veröffentlichung über geeignete App-Plattformen

## Versionshistorie

### Version 0.2.0 – 24.06.2026

Lernmodus und erweiterte Verwaltung:

- animierte Einzelkarten mit Vorder- und Rückseite
- optionaler dezenter Denkanstoß
- Navigation, Mischen und Fortschrittsanzeige
- vier Bewertungen mit adaptiven Intervallen
- tägliche fällige Lernrunde
- freier Übungsmodus
- individuelles Lernmodell pro Karte
- dauerhaftes Wiederholungsprotokoll
- Abschlussübersicht
- Stapel und Karten bearbeiten
- Stapel und Karten löschen
- Suche und Sortierung
- CSV-Export und CSV-Import
- vollständige JSON-Sicherung und Wiederherstellung
- automatische V1-zu-V2-Migration
- animierte lokale Speicheranzeige
- Desktop- und Smartphone-Test ohne protokollierte Browserfehler

### Version 0.1.0 – 24.06.2026

Erste funktionsfähige Version:

- modernes Grunddesign
- responsive Darstellung
- Stapel erstellen
- Karten hinzufügen
- Karten entfernen
- lokale JSON-Speicherung
- Sicherheitsabfrage vor dem Entfernen
- Statusmeldungen
- Browser- und Smartphone-Test

### Dokumentationserweiterung – 24.06.2026

Das Projekt wurde ausdrücklich als Kombination aus nutzbarem Produkt und
Lernprojekt definiert. Die Dokumentation wurde deshalb um folgende technische
Inhalte erweitert:

- vollständiger Programm- und Datenfluss
- Erklärung aller zentralen JavaScript-Funktionen
- Event Delegation und DOM-Rendering
- HTML- und CSS-Architektur
- Fehlerbehandlung und Datenvalidierung
- Schema-Versionierung und Datenmigration
- Sicherheits-, Datenschutz- und Performance-Betrachtung
- Teststrategie und Definition of Done
- empfohlene Modularchitektur für spätere Versionen
- Produkt-Roadmap mit technischen Meilensteinen
- Lernziele für jede Entwicklungsstufe

---

Wortwerk befindet sich in aktiver Entwicklung. Diese Dokumentation beschreibt
den Stand vom 24.06.2026.
