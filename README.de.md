[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Erstelle eine kleine Schrift für die Wörter und Namen deines Projekts. Drucke eine Vorlage, schreibe die gewünschten Zeichen hinein, prüfe die gescannten Konturen und exportiere eine Schrift zum Tippen.

**Sechs handgeschriebene Buchstaben. Eine Schrift mit 3.4 kB.**

Das enthaltene Paper-Bloom-Beispiel exportiert eine 3.360 Byte große TTF-Datei, geprüft mit Fontconfig und FreeType. Diese Messung bezieht sich auf sechs Buchstaben. [Messmethode und reproduzierbarer Export](docs/VALIDATION.md).

[Online-Werkstatt öffnen](https://Arthur031221.github.io/GlyphSprout/) | [Benutzerhandbuch](docs/USAGE.md) | [![MIT-Lizenz](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

![Echte Werkstatt: ein gescanntes Zeichen radieren und korrigieren, die Vorschau und TTF-Download](assets/demo.gif)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.9.0
```

Du brauchst Node.js 22.12 oder neuer und Git. Öffne `http://127.0.0.1:4173`, sobald der Bereitschaftshinweis erscheint.

| Ausgangspunkt | Ergebnis |
| --- | --- |
| Deine Handschrift auf einer gedruckten Vorlage | Eine kleine Schrift mit bearbeitbaren Quellpixeln, Konturen und Abständen |

## Deine erste Schrift erstellen

1. Erstelle ein Projekt und wähle die benötigten Zeichen, zum Beispiel `Hello!`. Ganze Sätze wie Großbuchstaben, Ziffern, Satzzeichen, Hiragana oder Katakana lassen sich mit einem Klick hinzufügen.
2. Drucke die Vorlage in Originalgröße auf A4- oder US-Letter-Papier und schreibe ein Zeichen in jedes Feld.
3. Füge einen gleichmäßig beleuchteten Scan hinzu und bestätige die Seiten-ID. GlyphSprout sucht die vier Passerkreuze und setzt die Ecken darauf. Prüfe jede Ecke und korrigiere abweichende.
4. Klicke auf **Scans umwandeln** und warte, bis die Umwandlung abgeschlossen ist.
5. Prüfe jedes Zeichen. Passe Quelle, Schwellenwert, Konturglättung, Ausschnitt, Größe, Versatz und Abstand an.
6. Gib deinen Text in die Vorschau ein und lade TTF oder WOFF2 herunter.

Mit der Aktion Quelle bearbeiten bleiben die aktuellen Pixel erhalten. Du kannst lokal radieren, zeichnen und rückgängig machen. Einstellungen und Seitenzuordnung bleiben erhalten. Eine geänderte Quelle muss geprüft werden. Die Aktion Glyph zeichnen beginnt mit einem leeren Bild, ersetzt das Glyph und setzt seine Einstellungen zurück. Leere Zeichnungen werden abgelehnt. Eine unveränderte Quellenbearbeitung lässt den Projektverlauf unverändert.

Vergrößere das Bild, um Details zu korrigieren. Stift und Radierer werden in Quellpixeln bemessen, daher bleibt die Strichbreite beim Zoomen gleich. Bewege das Bild mit Verschieben, den Scrollleisten oder Pfeiltasten. Beim Stoppen der Umwandlung bleiben Scans, Eckpunkte und Seitenbestätigungen für einen neuen Versuch erhalten. Mit **Vorgemerkte Scans verwerfen** entfernst du sie.

Als geprüft markieren wartet, bis die Anpassungen an Tinte und Zuschnitt abgeschlossen sind. Hat eine Zelle zu viele Punkte oder Konturen für den Export, bleibt ihr Quellbild erhalten und das betroffene Zeichen wird angezeigt. Die anderen Zellen werden umgewandelt. Passe den Fleckenfilter, den Zuschnitt oder das Quellbild an und prüfe die korrigierte Glyphe.

Der Prüffortschritt steht neben der Zeichenliste. **Nächste Prüfung** springt zum nächsten ungeprüften Zeichen, und die Pfeiltasten wechseln zwischen den Zeichen. Im Bereich für Schriftabstände legst du den Wortabstand für die ganze Schrift fest und kannst den lateinischen Seitenabstand eines Zeichens auf alle lateinischen Buchstaben übertragen. **Beispieltext als Bild herunterladen** speichert den Vorschautext als PNG. **Web-Font-CSS kopieren** legt eine `@font-face`-Regel in die Zwischenablage, damit du die heruntergeladenen Dateien auf einer Website nutzen kannst, und **Vorschau-Zoom** ändert die Größe der Live-Vorschau. Das Feld **Schriftinformationen** schreibt Gestalter, Copyright-Vermerk und Lizenz in die exportierte Schrift und kann die SIL Open Font License mit einem Klick eintragen.

Schriftname und Zeichentext im Bereich Characters bleiben beim Wechsel zwischen den Bereichen als Entwürfe erhalten. Mit **Project ready** übernimmst du die Änderungen. Sicherungen und Schriftdateien verwenden bis dahin die übernommenen Werte. Nicht übernommene Änderungen gehen beim Neuladen verloren.

## Eine kleine Teilmenge mit klaren Grenzen

Wähle bis zu 512 unterstützte BMP-Zeichen. Jede A4-Vorlage hat 35 Felder und ein Projekt kann bis zu 15 Seiten umfassen. Lateinische Glyphen verwenden standardmäßig proportionale Abstände. Han-Zeichen und Kana haben einen festen Zellenfortschritt. Die Oberfläche bietet neun Sprachen, helle und dunkle Themes sowie ein Layout für schmale Bildschirme.

Scans benötigen die gedruckte Vorlage, dunkle Tinte, flaches Papier, gleichmäßiges Licht und alle vier sichtbaren Passermarken. Seitenzuordnung und Bestätigung erfolgen manuell. GlyphSprout liest keine Handschrift und erkennt keine Felder automatisch.

Die Exporte enthalten einfache Konturen ohne Hinting. Die Konturglättung rundet die Pixelstufen neuer Nachzeichnungen zu geraden Diagonalen. Mit 0 bleibt die exakte Pixelkontur erhalten. Es gibt kein Kerning, keine Kurvenanpassung, keine Formung verbundener Schrift und keine vollständige Sprachabdeckung. Das Han- und Kana-Beispiel verwendet eigens erstellte synthetische Striche und ist entsprechend gekennzeichnet.

## Arbeit sichern

Projektdaten bleiben im Browser. Die App lädt keine Projekte hoch und verwendet keine Remote-Analyse. Lade vor dem Schließen wichtiger Arbeit eine Sicherung als `.glyphsprout.json` herunter. IndexedDB speichert die aktuelle und die vorherige gespeicherte Version, prüft die Hashes gespeicherter Bilder und warnt, wenn ein anderer Tab eine neuere Version gespeichert hat.

Offline kannst du arbeiten, sobald die Fußzeile **Ready for offline use** anzeigt. Die vollständige App, der Worker und der WOFF2-Encoder werden zwischengespeichert. Beim ersten Besuch ist eine Internetverbindung nötig. Beim Löschen des Browserspeichers können Wiederherstellungsdaten und Cache verloren gehen.

## Deine Schrift installieren

Verwende TTF, um die Schrift auf einem Desktop zu installieren. Die folgenden Anleitungen beziehen sich auf die jeweiligen Systeme und garantieren nicht, dass jede Anwendung die Schrift unterstützt. Starte Anwendungen bei Bedarf neu.

<details>
<summary>macOS</summary>

Doppelklicke im Finder auf die heruntergeladene TTF-Datei und wähle in der Schriftsammlung **Installieren**. [Apple-Anleitung zur Schriftsammlung](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac).

</details>

<details>
<summary>Windows</summary>

Klicke mit der rechten Maustaste auf die heruntergeladene TTF-Datei und wähle **Installieren**. Installierte Schriftarten kannst du auch in den Einstellungen verwalten. [Microsoft-Anleitung zu Schriftarten](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows).

</details>

<details>
<summary>Linux mit Fontconfig</summary>

Kopiere die TTF-Datei in dein Benutzerverzeichnis für Schriften und aktualisiere den Cache. Auf Systemen mit dem üblichen XDG-Datenverzeichnis:

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

Wenn dein konfiguriertes Schriftverzeichnis davon abweicht, verwende dieses. [Fontconfig-Konfigurationshandbuch](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html).

</details>

<details>
<summary>Webseiten</summary>

Lade WOFF2 herunter und binde die Datei mit `@font-face` ein. Die Schrift enthält nur die von dir exportierten Zeichen:

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## Prüfung und Herkunft

Paper Bloom enthält sechs Buchstabenausschnitte aus dem gemeinfreien [NIST-SD19-Formular f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). Das vollständige Formular ist ausgeschlossen. Die [offizielle Datensatzseite](https://www.nist.gov/srd/nist-special-database-19), Ausschnittkoordinaten und die festgelegte Quell-Prüfsumme sind im [Prüfhandbuch](docs/VALIDATION.md) dokumentiert.

Die Beispieldatei aus Version 1.3.0 wurde in LibreOffice geöffnet und als PDF mit eingebetteter Schrift und erhaltenem Text gespeichert. Version 1.3.1 ändert nur die internen Schriftnamen. Browser-Downloads beider Formate wurden mit FontTools geparst und mit FreeType gerendert. Die Referenzfälle decken Innenräume, abgesetzte Punkte, einen Unterlängenbuchstaben und Han-Striche in drei Rastergrößen ab. Methode, Ausschlüsse und Befehle stehen im Handbuch.

## Dokumentation und Entwicklung

- [Installation und Befehlsoptionen](docs/INSTALLATION.md)
- [Nutzung](docs/USAGE.md)
- [Konfiguration und Grenzen](docs/CONFIGURATION.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Validierung](docs/VALIDATION.md)
- [Mitwirken](CONTRIBUTING.md)

GlyphSprout ist unter der [MIT-Lizenz](LICENSE) verfügbar. Enthaltene Abhängigkeiten und die Herkunft des Beispiels sind in den [Hinweisen zu Drittanbietern](THIRD_PARTY_NOTICES.md) aufgeführt.

Assisted by Claude/Codex.
