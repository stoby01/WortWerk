# Wortwerk 0.6.1 – Erweiterte Karten

**Stand:** 25.06.2026  
**Vorheriger Stand:** `Desktop_PWA_25.06.2026.md`

## Ziel dieser Entwicklungsstufe

Wortwerk unterstützt jetzt strukturiertere und visuellere Lernkarten. Ergänzt
wurden:

- Duplikatprüfung beim Erstellen, Bearbeiten und CSV-Import,
- Tags für Karten,
- persönliche Markierungen,
- manuelle und automatisch berechnete Schwierigkeit,
- Bilder auf der Vorderseite,
- Suche, Sortierung und Filter für die neuen Eigenschaften,
- vollständige Übernahme in Lernmodus, Sicherungen und Datenprüfung.

Bestehende Karten werden beim Laden automatisch normalisiert. Ihre bisherigen
Lernstände und Wiederholungstermine bleiben erhalten.

## Neues Kartendatenmodell

Eine Karte besitzt zusätzlich folgende Felder:

```javascript
{
  tags: ["Reisen", "B2"],
  marked: true,
  difficulty: "auto",
  image: {
    dataUrl: "data:image/webp;base64,...",
    mimeType: "image/webp",
    width: 1200,
    height: 800,
    originalName: "bahnhof.jpg",
    alt: "Ein Bahnsteig mit einem wartenden Zug"
  }
}
```

`image` ist optional und hat ohne Bild den Wert `null`.

Die Schema-Version wurde von 4 auf 5 erhöht. Die App- und Cache-Version lautet
`0.6.1`.

### Korrektur in Version 0.6.1

Der Karteneditor besitzt nur noch einen einzigen Scrollbereich. Zuvor konnten
das native Dialogfenster und das Formular gleichzeitig scrollen. In schmalen
Fenstern entstanden dadurch zwei Scrollleisten und eine optisch abgetrennte
graue Fläche am unteren Rand. Der äußere Dialog ist jetzt geschlossen und
vollständig weiß; ausschließlich der zusammenhängende Formularinhalt scrollt.

## Duplikatprüfung

### Normalisierung

Vor dem Vergleich werden Texte vereinheitlicht:

- Groß- und Kleinschreibung werden ignoriert,
- führende und abschließende Leerzeichen werden entfernt,
- mehrere Leerzeichen werden zusammengefasst,
- Akzente und kombinierende Zeichen werden vereinheitlicht,
- Satz- und Sonderzeichen werden beim Vergleich ignoriert.

Dadurch werden beispielsweise folgende Schreibweisen als gleich erkannt:

```text
Journey
 journey
JOURNEY!!
```

### Erkannte Fälle

Wortwerk unterscheidet:

- **exaktes Duplikat:** Vorder- und Rückseite stimmen überein,
- **umgekehrtes Duplikat:** Vorder- und Rückseite sind vertauscht,
- **gleiche Vorderseite:** dieselbe Frage besitzt eine andere Antwort,
- **gleiche Bildkarte:** Bild und Rückseite stimmen überein.

Beim manuellen Erstellen oder Bearbeiten erscheint bereits während der Eingabe
eine sichtbare Warnung. Beim Speichern kann der Nutzer die Karte trotzdem
bewusst übernehmen. Das ist wichtig, weil gleiche Wörter in unterschiedlichen
Zusammenhängen verschiedene Bedeutungen haben können.

Beim CSV-Import werden exakte und umgekehrte Duplikate automatisch
übersprungen. Karten mit gleicher Vorderseite, aber anderer Rückseite bleiben
erhalten.

Bei einer JSON-Wiederherstellung werden Duplikate als Warnung im Prüfbericht
angezeigt. Eine vollständige Sicherung wird nicht automatisch verändert.

## Tags

Tags werden im Karteneditor durch Kommas getrennt eingegeben:

```text
Reisen, B2, Verb
```

Die Normalisierung:

- entfernt leere Einträge,
- bereinigt überflüssige Leerzeichen,
- verhindert doppelte Tags unabhängig von Groß-/Kleinschreibung,
- begrenzt einen Tag auf 40 Zeichen,
- begrenzt eine Karte auf 20 Tags.

Tags erscheinen:

- in der Kartenübersicht,
- in der Lernansicht,
- in der Kartensuche,
- als eigener Filter in der Kartenverwaltung.

Die Suche berücksichtigt Vorderseite, Rückseite, Hinweis, Bildbeschreibung und
Tags.

## Persönliche Markierung

Eine Karte kann unabhängig von ihrem Lernstand mit einem Stern markiert werden.
Die Markierung bedeutet:

> Diese Karte möchte ich später gezielt wiederfinden oder üben.

Markierungen können gesetzt oder entfernt werden:

- im Karteneditor,
- direkt in der Kartenübersicht,
- während einer Lernrunde.

Die Kartenverwaltung besitzt den Filter `Nur markierte`.

## Schwierigkeit

### Manuelle Schwierigkeit

Im Karteneditor stehen vier Einstellungen zur Verfügung:

- automatisch bestimmen,
- leicht – grün,
- mittel – gelb,
- schwer – rot.

Die Kartenübersicht zeigt eine farbige Linie am linken Rand sowie ein
beschriftetes Statusfeld. Die Lernansicht zeigt denselben Status.

### Automatische Schwierigkeit

Bei `Automatisch bestimmen` wertet Wortwerk den Lernverlauf aus. Berücksichtigt
werden:

- Anteil der Antworten `Nicht gewusst`,
- Anteil der Antworten `Richtig, aber schwer`,
- durchschnittliche Antwortzeit,
- Anzahl früherer Fehlversuche.

Vor zwei echten Bewertungen bleibt die Schwierigkeit `Noch offen`. Dadurch
werden neue Karten nicht vorschnell eingestuft.

Die automatische Einordnung wird beim Anzeigen aus den aktuellen
Lernprotokollen berechnet. Sie muss deshalb nicht als zweiter, möglicherweise
veralteter Wert gespeichert werden.

### Filter und Sortierung

Die Kartenverwaltung kann anzeigen:

- alle Karten,
- nur markierte Karten,
- leichte Karten,
- mittlere Karten,
- schwere Karten,
- Karten mit Bild.

Zusätzlich kann nach `Schwierige zuerst` sortiert werden.

## Bilder auf Karten

### Kartenaufbau

Die Vorderseite kann enthalten:

- nur Text,
- nur ein Bild,
- Bild und ergänzenden Text.

Die Rückseite bleibt eine textliche Antwort oder Erklärung. Sie darf bis zu
300 Zeichen enthalten.

Für jedes Bild kann eine Beschreibung hinterlegt werden. Sie verbessert die
Barrierefreiheit, dient als Ersatztext und wird in der Kartensuche
berücksichtigt.

### Unterstützte Eingabeformate

Der Karteneditor akzeptiert:

- JPEG und JPG,
- PNG,
- WebP,
- GIF.

Die maximale Eingabedatei beträgt 5 MB.

GIF-Dateien werden wie andere Bilder verarbeitet. Dabei wird ein statisches
Bild gespeichert; eine GIF-Animation bleibt nicht erhalten.

Nicht unterstützt werden derzeit:

- SVG,
- HEIC und HEIF,
- TIFF,
- PDF,
- Videoformate.

SVG wurde bewusst ausgeschlossen, weil fremde SVG-Dateien aktive oder
unerwünschte Inhalte enthalten können. HEIC und TIFF werden in Browsern nicht
zuverlässig genug unterstützt.

### Automatische Optimierung

Vor dem Speichern:

1. prüft Wortwerk Dateityp und Größe,
2. lädt das Bild ausschließlich lokal im Browser,
3. begrenzt die längste Bildkante auf 1600 Pixel,
4. erhält das Seitenverhältnis,
5. wandelt das Ergebnis bevorzugt in WebP um,
6. verwendet JPEG als technischen Rückfall,
7. zeigt eine Vorschau mit den gespeicherten Abmessungen.

Das Originalbild wird nicht an einen Server gesendet.

### Lokale Speicherung

Das optimierte Bild wird als Data-URL innerhalb des Kartendatensatzes in
IndexedDB gespeichert. Dadurch:

- bleibt die Bildkarte offline verfügbar,
- wird sie von lokalen Sicherungsständen erfasst,
- wird sie mit einer JSON-Sicherung exportiert,
- kann sie durch JSON-Wiederherstellung übertragen werden.

Die CSV-Datei enthält aus Größen- und Formatgründen nicht die Bilddaten. In der
Spalte `Bild` wird lediglich vermerkt, dass das Bild in der JSON-Sicherung
enthalten ist.

Für Bildsammlungen ist deshalb die vollständige JSON-Sicherung wichtiger als
ein reiner CSV-Export.

## CSV-Import und -Export

Der CSV-Export enthält jetzt:

```text
Stapel
Vorderseite
Rückseite
Hinweis
Tags
Markiert
Schwierigkeit
Bild
```

Beim Import können zusätzlich zu den bisherigen Feldern zugeordnet werden:

- Tags,
- Markiert,
- Schwierigkeit.

Akzeptierte Werte für `Markiert` sind unter anderem:

```text
Ja
Yes
True
1
Markiert
Favorit
```

Akzeptierte Schwierigkeitswerte:

```text
leicht / easy
mittel / medium
schwer / hard
automatisch / auto
```

## Datensicherheit und Migration

Bestehende Karten ohne neue Felder erhalten automatisch:

```javascript
{
  tags: [],
  marked: false,
  difficulty: "auto",
  image: null
}
```

Die Datenprüfung kontrolliert zusätzlich:

- gültige Tag-Listen,
- gültige Schwierigkeitswerte,
- Vorderseitentext oder vorhandenes Bild,
- weiterhin eine nicht leere Rückseite,
- gültige Fälligkeit und eindeutige IDs.

Papierkorb, lokale Sicherungen und JSON-Sicherungen übernehmen die vollständigen
Kartendaten einschließlich Bildern.

## Getestete Abläufe am 25.06.2026

- bestehende V4-Karten werden mit Standardwerten geladen,
- neue Felder erscheinen im Karteneditor,
- Tags werden gespeichert und doppelte Eingaben entfernt,
- Tags erscheinen in Übersicht und Lernmodus,
- Suche und Tag-Filter berücksichtigen Tags,
- markierte Karten können direkt gefiltert werden,
- Markierung kann in Übersicht und Lernmodus umgeschaltet werden,
- manuelle Schwierigkeit erscheint mit korrekter Beschriftung,
- Schwierigkeit kann als Filter und Sortierung verwendet werden,
- Duplikate werden trotz abweichender Großschreibung, Satzzeichen und
  Leerzeichen erkannt,
- bewusste manuelle Duplikate bleiben nach Bestätigung möglich,
- der Lernmodus übernimmt Tags, Markierung und Schwierigkeit,
- die Smartphone-Darstellung erzeugt keinen horizontalen Überlauf,
- die JavaScript-Dateien bestehen die Syntaxprüfung,
- der Browser protokollierte während der geprüften Abläufe keine Fehler oder
  Warnungen.

Die native Dateiauswahl für Bilder kann von der automatisierten
Browser-Testumgebung nicht befüllt werden. Dateitypprüfung, Größenprüfung,
Canvas-Skalierung, WebP-/JPEG-Ausgabe und Vorschau wurden strukturell und über
die Programmlogik geprüft. Ein realer Bildimport bleibt zusätzlich auf dem
Zielgerät manuell zu testen.

## Grenzen

- Viele oder sehr große Bilder erhöhen den lokalen Speicherverbrauch.
- JSON-Sicherungen mit Bildern können deutlich größer werden.
- Browser und Betriebssystem können bei knappem Speicher lokale App-Daten
  entfernen.
- CSV kann Bilddaten nicht vollständig transportieren.
- Die automatische Schwierigkeit ist eine praktische Heuristik und noch kein
  wissenschaftliches Lernmodell.
- Tags besitzen noch keine eigene zentrale Verwaltungsansicht.
- Individuelle Übungsrunden auf Basis mehrerer kombinierter Filter sind noch
  nicht umgesetzt.

## Sinnvolle nächste Schritte

- individuelle Übungsrunden aus Tags, Markierung und Schwierigkeit,
- Sammelbearbeitung mehrerer Karten,
- zentrale Tag-Verwaltung mit Umbenennen und Zusammenführen,
- Speicherverbrauch von Bildern anzeigen,
- eigenes komprimiertes `.wortwerk`-Sicherungsformat,
- Bilder beim Export optional verkleinern,
- automatisierte Tests mit echten Bilddateien,
- Prüfungsmodus und Texteingabe-Antworten.
