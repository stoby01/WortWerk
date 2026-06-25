# Wortwerk – Statistik und Lernplanung

**Änderungsstand:** 24.06.2026  
**Version:** 0.3.0  
**Baut auf:** `Lernmodus_und_Datenverwaltung_24.06.2026.md`  
**Nächster Stand:** `Lokale_Datensicherheit_24.06.2026.md`

## Ziel dieses Entwicklungsschritts

Version 0.3.0 erweitert Wortwerk um eine verständliche Statistikzentrale und
persönliche Lernplanung. Die Oberfläche soll Daten nicht nur sammeln, sondern
dem Nutzer drei konkrete Fragen beantworten:

1. Was sollte ich heute tun?
2. Wie entwickelt sich mein Lernen?
3. Welche Einstellung passt zu meinem Alltag?

Benachrichtigungen wurden bewusst nicht implementiert.

## Neue Statistikzentrale

Die globale Navigation enthält jetzt den Punkt `Lernstatistik`. Die Ansicht
funktioniert unabhängig vom aktuell ausgewählten Stapel und wertet die gesamte
lokale Sammlung aus.

Die Oberfläche ist in folgende Ebenen gegliedert:

### Heute

Der obere Bereich zeigt:

- die aktuell fällige Kartenanzahl,
- eine geschätzte Lernzeit,
- eine direkte Schaltfläche zur nächsten fälligen Lernrunde.

Die nächste Lernrunde wählt automatisch den Stapel mit den meisten aktuell
fälligen Karten aus.

### Zentrale Kennzahlen

Vier kompakte Karten zeigen:

- tatsächliche Erinnerungsquote,
- Wiederholungen im gewählten Zeitraum,
- aktive Lerntage,
- durchschnittliche Antwortzeit.

Der Zeitraum kann zwischen 7, 30 und 90 Tagen umgeschaltet werden.

### Lernrhythmus

Ein animiertes Balkendiagramm zeigt die Wiederholungen der letzten Tage.
Pausentage bleiben sichtbar, werden aber nicht negativ bewertet.

Die Formulierung lautet bewusst:

```text
Pausen sind Teil des Rhythmus. Entscheidend ist, dass du wiederkommst.
```

### Erinnerungsquote

Die Quote berechnet sich aus den geplanten Lernbewertungen:

```text
Bestanden = Schwer + Richtig + Sofort gewusst
Nicht bestanden = Nicht gewusst

Erinnerungsquote = Bestandene Bewertungen / alle Bewertungen × 100
```

Freie Übungsrunden werden nicht eingerechnet, weil sie keine Bewertung
enthalten und keine Lerntermine verändern.

Wenn noch keine Bewertungen vorliegen, zeigt Wortwerk keinen erfundenen
Prozentwert, sondern einen neutralen leeren Zustand.

### Sieben-Tage-Vorschau

Die Vorschau kombiniert:

- bereits bekannte Wiederholungstermine,
- das persönliche Limit für neue Karten.

Sie ist eine Belastungsorientierung und keine exakte Vorhersage. Neue Karten
erzeugen nach der ersten Bewertung zusätzliche Termine, die vorher noch nicht
vollständig bekannt sind.

### Sammlungsverteilung

Alle Karten werden in drei Gruppen dargestellt:

- Neu
- Im Lernen
- Langzeitlernen

Dadurch ist schnell erkennbar, ob eine Sammlung hauptsächlich aus neuen Karten
oder bereits aufgebautem Lernstoff besteht.

## Persönliche Lernintensität

Der Nutzer kann zwischen drei Modi wählen:

| Modus | Zielwert | Wirkung im einfachen Scheduler |
| --- | ---: | --- |
| Entspannt | 85 % | Intervalle werden ungefähr 25 % länger |
| Ausgewogen | 90 % | bisherige Standardintervalle |
| Intensiv | 93 % | Intervalle werden ungefähr 18 % kürzer |

Die Werte werden als verständliche Lernintensität verwendet. Wortwerk behauptet
noch nicht, damit eine exakte individuelle Erinnerungswahrscheinlichkeit zu
berechnen.

Technisch verwendet `getSchedulePreview()` einen Zielmodifikator:

```javascript
const targetModifier = {
  0.85: 1.25,
  0.9: 1,
  0.93: 0.82
}[state.settings.retentionTarget];
```

Dieser Modifikator wird auf die Intervalle `hard`, `good` und `easy`
angewendet. `again` bleibt bei zehn Minuten, damit eine nicht erinnerte Karte
zeitnah erneut erscheint.

## Neue Karten pro Tag

Das feste Limit von zehn neuen Karten wurde durch eine Einstellung ersetzt.

Mögliche Werte:

```text
5, 10, 20 oder 30 neue Karten pro Tag
```

Fällige Wiederholungen haben weiterhin Vorrang. Erst danach nimmt eine geplante
Lernrunde neue Karten bis zum gewählten Limit auf.

Die Oberfläche beschreibt zusätzlich die mögliche Folgelast:

- 5: ruhiger Einstieg
- 10: ausgewogener Standard
- 20: deutlich mehr folgende Wiederholungen
- 30: intensive Einstellung mit möglicher Wiederholungswelle

## Tägliches Zeitziel

Der Nutzer kann einen sanften Zeitrahmen zwischen 5 und 30 Minuten auswählen.

Das Zeitziel:

- beendet keine Lernrunde automatisch,
- blockiert keine Karten,
- erzeugt keinen negativen Status,
- dient ausschließlich als Orientierung.

Die geschätzte Lernzeit verwendet:

1. die durchschnittliche gemessene Antwortzeit, wenn genügend Werte vorhanden
   sind,
2. andernfalls einen Standardwert von 18 Sekunden pro Karte.

Unrealistisch kurze oder sehr lange Werte werden für die Schätzung auf den
Bereich von 6 bis 90 Sekunden begrenzt.

## Antwortzeit

Neue Wiederholungsprotokolle erhalten:

```json
{
  "responseTimeMs": 12450
}
```

Gemessen wird die Zeit vom Anzeigen einer Karte bis zum Absenden der Bewertung.
Sie enthält damit:

- Nachdenken,
- optionales Öffnen des Hinweises,
- Umdrehen der Karte,
- Selbsteinschätzung.

Die Antwortzeit kann später helfen, Karten zu erkennen, die zwar korrekt, aber
noch nicht flüssig erinnert werden.

## Schwierige Karten

Wortwerk markiert Karten als auffällig, wenn mindestens eine Bedingung erfüllt
ist:

```text
lapseCount mindestens 2
```

oder:

```text
mindestens 3 Bewertungen
und mindestens 40 % davon „Nicht gewusst“
```

Die Statistik zeigt höchstens acht besonders auffällige Karten. Ein Klick
öffnet den zugehörigen Stapel und setzt die Kartensuche auf die betreffende
Vorderseite.

Die Erkennung löscht oder verändert keine Karten. Sie bietet nur einen
schnellen Einstieg zum Prüfen von:

- Tippfehlern,
- zu ähnlichen Karten,
- zu schweren Formulierungen,
- unzureichenden Denkanstößen.

## Letzte Bewertung zurücknehmen

Nach einer geplanten Bewertung speichert die Sitzung vorübergehend:

```javascript
{
  deckId,
  cardId,
  logId,
  previousLearning,
  previousUpdatedAt
}
```

Über `Letzte Bewertung zurücknehmen` werden:

1. der vorherige Lernzustand wiederhergestellt,
2. der neue Protokolleintrag entfernt,
3. die Karte erneut als unbeantwortet markiert,
4. die Lernansicht wieder auf diese Karte gesetzt,
5. der korrigierte Zustand gespeichert.

Die Rückgängig-Information ist aktuell sitzungsgebunden. Nach einem vollständigen
Neuladen steht sie nicht mehr zur Verfügung. Eine spätere Produktversion kann
eine dauerhafte Aktionshistorie ergänzen.

## Scheduler-Labor

Die Statistik enthält einen transparenten Vergleichsbereich:

### Wortwerk Simple

- bleibt der aktive Scheduler,
- verwendet nachvollziehbare Regeln,
- funktioniert vollständig lokal,
- berücksichtigt die Lernintensität.

### FSRS-Schattenmodell

FSRS wird in Version 0.3.0 noch nicht als echter Scheduler ausgeführt.

Gründe:

- Eine vereinfachte Eigeninterpretation würde keine seriöse FSRS-Implementierung
  darstellen.
- Persönliche Parameter profitieren von mehreren hundert echten Bewertungen.
- Ein direkter Produktwechsel benötigt Tests und eine kontrollierte Migration.

Das Labor zeigt deshalb die vorhandene Datenbasis relativ zu einem ersten
Mindestziel von 200 Bewertungen:

```text
Bereitschaft = Anzahl aller Bewertungen / 200 × 100
```

Der Wert wird bei 100 % begrenzt. Auch danach ist eine echte Integration noch
ein eigener Entwicklungsschritt.

Die vorhandenen Protokolle enthalten bereits:

- Bewertung
- alten und neuen Abstand
- alten und neuen Fälligkeitstermin
- Scheduler-Version
- Antwortzeit

Damit ist die technische Grundlage für einen späteren Schattenvergleich
vorhanden.

## Speicherformat Version 3

Der neue Hauptschlüssel lautet:

```text
wortwerk-data-v3
```

Wortwerk sucht beim ersten Start außerdem nach:

```text
wortwerk-data-v2
wortwerk-data-v1
```

Dadurch werden frühere Entwicklungsstände automatisch übernommen.

Das Wurzelobjekt enthält jetzt:

```json
{
  "schemaVersion": 3,
  "decks": [],
  "reviewLog": [],
  "settings": {
    "newCardsPerDay": 10,
    "retentionTarget": 0.9,
    "dailyMinutesGoal": 10
  }
}
```

### Einstellungen

| Feld | Typ | Erlaubte Werte |
| --- | --- | --- |
| `newCardsPerDay` | Number | 5, 10, 20 oder 30 |
| `retentionTarget` | Number | 0.85, 0.9 oder 0.93 |
| `dailyMinutesGoal` | Number | 5 bis 60, UI aktuell bis 30 |

Ungültige oder fehlende Werte werden beim Laden durch sichere Standardwerte
ersetzt.

### Sicherung

Die vollständige JSON-Sicherung enthält jetzt auch `settings`. Beim Import
werden Stapel, Wiederholungsprotokoll und Einstellungen gemeinsam
wiederhergestellt.

## Neue Zustandsfelder

Der sitzungsgebundene Zustand wurde erweitert:

```javascript
const state = {
  decks: loadedData.decks,
  reviewLog: loadedData.reviewLog,
  settings: loadedData.settings,
  activeDeckId: null,
  view: "welcome",
  editingDeckId: null,
  editingCardId: null,
  searchQuery: "",
  sortOrder: "newest",
  statsRange: 30,
  undoReview: null,
  study: null
};
```

`statsRange` steuert den Zeitraum der Statistik. `undoReview` enthält die
temporäre Rückgängig-Information.

## Neue zentrale Funktionen

### `renderStatistics()`

Erzeugt die vollständige Statistikzentrale und alle Einstellungen.

### `calculateStatistics(rangeDays)`

Berechnet die Kennzahlen für den gewählten Zeitraum.

### `buildForecast(allCards)`

Erstellt die Sieben-Tage-Vorschau aus bekannten Terminen und geplanter
Neukartenmenge.

### `getProblemCards(allCards)`

Bewertet Karten anhand von Fehlversuchen und Fehlerquote.

### `updateSetting(name, value)`

Validiert, speichert und rendert eine geänderte Lerneinstellung.

### `undoLastReview()`

Stellt den unmittelbar vorherigen Lernzustand wieder her.

### `localDayKey(value)`

Erzeugt lokale Datumsschlüssel im Format `YYYY-MM-DD`. Dadurch werden
Lerntage nach der lokalen Zeitzone und nicht nach UTC gruppiert.

## Animationen

Neu hinzugefügt wurden:

- sanft einfahrende Statistikansicht,
- nacheinander erscheinende Kennzahlen,
- animierter Erinnerungsring,
- wachsende Aktivitätsbalken,
- wachsende Vorschau- und Verteilungsbalken,
- animierter FSRS-Bereitschaftsbalken.

Die bestehende CSS-Regel für `prefers-reduced-motion` bleibt aktiv. Nutzer mit
reduzierter Bewegung erhalten nahezu sofortige Übergänge.

## Nutzerfreundliche Formulierungen

Die Statistik vermeidet vorwurfsvolle Sprache.

Beispiele:

```text
Pausen sind Teil des Rhythmus.
```

```text
Ein sanfter Rahmen, kein Erfolgszwang.
```

```text
Einige Karten brauchen kürzere Abstände.
```

Eine verpasste Lernserie wird nicht als Verlust oder Scheitern dargestellt.

## Getestete Abläufe am 24.06.2026

- Daten aus dem V2-Speicherformat werden übernommen.
- Statistiknavigation öffnet die globale Ansicht.
- Kennzahlen werden aus dem Wiederholungsprotokoll berechnet.
- 7-, 30- und 90-Tage-Zeiträume können gewählt werden.
- Lernintensität kann auf 85, 90 oder 93 Prozent gesetzt werden.
- Neue-Karten-Limit kann auf 5, 10, 20 oder 30 gesetzt werden.
- tägliches Zeitziel kann verändert und gespeichert werden.
- intensive Lernintensität verkürzt die vorgeschlagenen Intervalle.
- nächste fällige Lernrunde startet aus der Statistik.
- Bewertung erzeugt einen Protokolleintrag mit Antwortzeit.
- letzte Bewertung kann zurückgenommen werden.
- Statistik funktioniert im Desktop-Layout.
- Statistik funktioniert im Smartphone-Layout.
- Browserprüfung protokollierte keine Warnungen oder Fehler.

## Noch offene Punkte

- echte FSRS-Bibliothek integrieren
- FSRS zunächst als nicht aktives Schattenmodell ausführen
- Vorhersage und tatsächliche Erinnerung vergleichen
- dauerhafte Rückgängig-Historie
- detaillierte Statistik pro Stapel
- Karten mit korrekter, aber langsamer Antwort hervorheben
- Datenexport der Statistik als CSV
- automatisierte Tests für alle Statistikberechnungen
- optionale getrennte Lernrichtungen mit eigenem Lernzustand

Benachrichtigungen gehören ausdrücklich nicht zum geplanten Umfang dieses
Entwicklungsschritts.
