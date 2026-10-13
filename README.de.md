[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Erstelle aus handschriftlichen Vorlagen bearbeitbare Schriftteilmengen für lateinische Zeichen, Han-Zeichen und Kana.

**Sechs handgeschriebene Buchstaben. Eine Schrift mit 3.3 kB.**

Das enthaltene Paper-Bloom-Beispiel exportiert eine 3.284 Byte große TTF-Datei, geprüft mit Fontconfig und LibreOffice. Diese Messung bezieht sich auf sechs Buchstaben. [Messmethode und reproduzierbarer Export](docs/VALIDATION.md).

[Online-Werkstatt öffnen](https://Arthur031221.github.io/GlyphSprout/) | [Benutzerhandbuch](docs/USAGE.md) | [![MIT-Lizenz](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

Erfordert Node.js 22.12 oder neuer und Git. Öffne `http://127.0.0.1:4173`, sobald der Befehl die Bereitschaftsmeldung ausgibt.

| Vorher | Nachher |
| --- | --- |
| Sechs Ausschnitte handgeschriebener Buchstaben | Eine verwendbare Schrift mit bearbeitbaren Konturen und Abständen |

![Echte Werkstatt: Handschriftvorschau, Glyphenskalierung anpassen und TTF herunterladen](assets/demo.gif)

Ich habe das für die Zeichen entwickelt, die ein kleines Projekt tatsächlich verwendet.

## Deine erste Schrift erstellen

Beim ersten Besuch wird Paper Bloom mit sechs echten handgeschriebenen Buchstaben geladen. Du kannst sofort einen Buchstaben bearbeiten oder die Schrift herunterladen. So erstellst du eine eigene Schrift:

```text
1. Erstelle ein neues Projekt namens Weekend und wähle den Text Hello! aus.
2. Drucke die A4-Vorlage in Originalgröße und schreibe ein Zeichen in jedes Feld.
3. Füge einen flach aufgenommenen PNG- oder JPEG-Scan hinzu und gib die gedruckte Seitennummer an.
4. Passe die vier Ecken an, bestätige die Ausrichtung, wandle um und prüfe die Glyphen.
5. Gib Hello! im Schriftmuster ein und lade TTF oder WOFF2 herunter.
```

Die Werkstatt bietet eine Quell- und Konturansicht, Einstellungen für Schwellenwert und Fleckenfilter sowie Zuschnitt, Skalierungsfaktor, Versatz und Abstand. Versatz und Abstand werden in Schrifteinheiten angegeben. Du kannst Glyphen auch zeichnen oder radieren. Das Live-Muster verwendet die tatsächlich erzeugte Schrift. Zeichnung und Projekt lassen sich getrennt rückgängig machen.

## Eine kleine Teilmenge mit klaren Grenzen

Wähle bis zu 512 unterstützte BMP-Zeichen. Ein A4-Blatt enthält 35 Felder, höchstens 15 Blätter sind möglich. Lateinische Glyphen verwenden standardmäßig proportionale Abstände. Han-Zeichen und Kana haben einen festen Zellenfortschritt. Die Oberfläche bietet neun Sprachen, helle und dunkle Themes sowie ein Layout für schmale Bildschirme.

Scans benötigen die gedruckte Vorlage, dunkle Tinte, flaches Papier, gleichmäßige Beleuchtung und alle vier sichtbaren Passermarken. Seitenzuordnung und Bestätigung erfolgen manuell. Das Tool liest keine Handschrift und erkennt keine Felder automatisch.

Die Exporte enthalten einfache Konturen ohne Hinting. Es gibt kein Kerning, keine Kurvenglättung, keine Formung verbundener Schrift und keine vollständige Sprachabdeckung. Das Han- und Kana-Beispiel verwendet eigens erstellte synthetische Striche und ist entsprechend gekennzeichnet.

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

Die exportierte Beispieldatei wurde in LibreOffice geöffnet und als PDF mit eingebetteter Schrift und erhaltenem Text gespeichert. Browser-Downloads beider Formate wurden mit FontTools geparst und mit FreeType gerendert. Die Referenzfälle decken Innenräume, abgesetzte Punkte, einen Unterlängenbuchstaben und Han-Striche in drei Rastergrößen ab. Methode, Ausschlüsse und Befehle stehen im Handbuch.

## Dokumentation und Entwicklung

- [Installation und Befehlsoptionen](docs/INSTALLATION.md)
- [Nutzung](docs/USAGE.md)
- [Konfiguration und Grenzen](docs/CONFIGURATION.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Validierung](docs/VALIDATION.md)
- [Mitwirken](CONTRIBUTING.md)

GlyphSprout ist unter der [MIT-Lizenz](LICENSE) verfügbar. Enthaltene Abhängigkeiten und die Herkunft des Beispiels sind in den [Hinweisen zu Drittanbietern](THIRD_PARTY_NOTICES.md) aufgeführt.

Assisted by Claude/Codex.
