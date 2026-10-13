[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Transformez des modèles manuscrits en sous-ensembles de polices modifiables pour les caractères latins, han et kana.

**Six lettres manuscrites. Une police de 3.3 kB.**

L'exemple Paper Bloom fourni exporte un TTF de 3 284 octets, vérifié avec Fontconfig et LibreOffice. Cette mesure porte sur six lettres. [Méthode et export reproductible](docs/VALIDATION.md).

[Ouvrir l'atelier en ligne](https://Arthur031221.github.io/GlyphSprout/) | [Guide d'utilisation](docs/USAGE.md) | [![Licence MIT](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

Node.js 22.12 ou une version ultérieure et Git sont nécessaires. Ouvrez `http://127.0.0.1:4173` lorsque la commande affiche le message indiquant que l'application est prête.

| Avant | Après |
| --- | --- |
| Six découpes de lettres manuscrites | Une police utilisable pour écrire, avec des contours et un espacement modifiables |

![Atelier réel : aperçu manuscrit, réglage de l'échelle du glyphe et téléchargement TTF](assets/demo.gif)

J'ai créé cet outil pour les caractères réellement utilisés par un petit projet.

## Créez votre première police

Lors de la première visite, Paper Bloom s'ouvre avec six lettres manuscrites réelles. Vous pouvez modifier une lettre ou télécharger la police immédiatement. Pour créer la vôtre :

```text
1. Créez un projet nommé Weekend et choisissez le texte Hello!.
2. Imprimez le modèle A4 à sa taille réelle et écrivez un caractère par case.
3. Ajoutez un scan PNG ou JPEG à plat et attribuez-lui le numéro de page imprimé.
4. Réglez les quatre coins, confirmez l'alignement, convertissez et examinez les glyphes.
5. Saisissez Hello! dans l'échantillon et téléchargez le TTF ou le WOFF2.
```

L'atelier propose une vue de la source et des contours, des réglages de seuil et de filtrage des poussières, ainsi que le recadrage, le multiplicateur d'échelle, les décalages et l'espacement. Les décalages et l'espacement utilisent les unités de la police. Vous pouvez aussi dessiner ou effacer un glyphe. L'échantillon en direct utilise la police générée. L'annulation du dessin et celle du projet sont indépendantes.

## Un petit sous-ensemble, avec des limites claires

Choisissez jusqu'à 512 caractères BMP pris en charge, avec 35 cases par feuille A4 et un maximum de 15 feuilles. Par défaut, les glyphes latins ont un espacement proportionnel. Han et kana utilisent une avance de cellule fixe. L'interface propose neuf langues, des thèmes clair et sombre, ainsi qu'une mise en page adaptée aux écrans étroits.

Les scans nécessitent le modèle imprimé, de l'encre foncée, du papier plat, un éclairage uniforme et les quatre repères de position visibles. L'attribution et la confirmation des pages sont manuelles. L'outil ne lit pas le texte manuscrit et ne repère pas automatiquement les cases.

Les exports contiennent des contours simples sans hinting. Ils ne comprennent ni crénage, ni lissage des courbes, ni façonnage des écritures liées, ni couverture complète d'une langue. L'exemple han et kana utilise des traits synthétiques originaux, indiqués comme tels.

## Conservez votre travail

Les données du projet restent dans votre navigateur. L'application n'envoie aucun projet et n'utilise aucune analyse à distance. Téléchargez une sauvegarde `.glyphsprout.json` avant de fermer un travail important. IndexedDB conserve la dernière version enregistrée et la précédente, vérifie les empreintes des images stockées et vous avertit si un autre onglet a enregistré une version plus récente.

Le mode hors ligne est disponible lorsque le pied de page affiche **Ready for offline use**. L'application complète, le worker et l'encodeur WOFF2 sont mis en cache. La première visite nécessite une connexion. Effacer le stockage du navigateur peut supprimer à la fois les données de récupération et le cache.

## Installez la police créée

Utilisez le TTF pour installer la police sur un ordinateur. Ces instructions concernent chaque système et ne garantissent pas que toutes les applications prennent en charge la police. Redémarrez les applications si nécessaire.

<details>
<summary>macOS</summary>

Dans le Finder, double-cliquez sur le TTF téléchargé, puis choisissez **Installer** dans Livre des polices. [Guide Livre des polices d'Apple](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac).

</details>

<details>
<summary>Windows</summary>

Faites un clic droit sur le TTF téléchargé et choisissez **Installer**. Vous pouvez également gérer les polices installées dans les Paramètres. [Guide des polices Microsoft](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows).

</details>

<details>
<summary>Linux avec Fontconfig</summary>

Copiez le TTF dans le répertoire de polices de votre utilisateur et actualisez son cache. Sur les systèmes utilisant le répertoire de données XDG habituel :

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

Si le répertoire de polices configuré est différent, utilisez-le. [Guide de configuration Fontconfig](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html).

</details>

<details>
<summary>Pages Web</summary>

Téléchargez le WOFF2 et chargez-le avec `@font-face`. La police ne contient que les caractères exportés :

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## Validation et provenance

Paper Bloom contient six découpes de lettres issues du domaine public, tirées du [formulaire f1002_33 de NIST SD19](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). Le formulaire complet est exclu. La [page officielle du jeu de données](https://www.nist.gov/srd/nist-special-database-19), les coordonnées de découpe et la somme de contrôle figée de la source sont indiquées dans le [guide de validation](docs/VALIDATION.md).

La police d'exemple exportée a été ouverte dans LibreOffice puis enregistrée en PDF avec la police intégrée et le texte conservé. Les téléchargements du navigateur dans les deux formats ont été analysés avec FontTools et rendus avec FreeType. Les cas de référence couvrent les contreformes, les points détachés, une descendante et des traits han à trois tailles de rasterisation. Consultez le guide pour la méthode, les exclusions et les commandes.

## Documentation et développement

- [Installation et options de commande](docs/INSTALLATION.md)
- [Utilisation](docs/USAGE.md)
- [Configuration et limites](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)
- [Contribution](CONTRIBUTING.md)

GlyphSprout est disponible sous la [licence MIT](LICENSE). Les dépendances incluses et la provenance de l'exemple sont répertoriées dans les [mentions tierces](THIRD_PARTY_NOTICES.md).

Assisted by Claude/Codex.
