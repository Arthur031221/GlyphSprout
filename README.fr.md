[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Créez une petite police pour les mots et les noms utilisés dans votre projet. Imprimez un modèle, écrivez chaque caractère, vérifiez les contours numérisés et exportez une police avec laquelle vous pourrez saisir du texte.

**Six lettres manuscrites. Une police de 3.4 kB.**

L'exemple Paper Bloom fourni exporte un TTF de 3 360 octets, vérifié avec Fontconfig et FreeType. Cette mesure porte sur six lettres. [Méthode et export reproductible](docs/VALIDATION.md).

[Ouvrir l'atelier en ligne](https://Arthur031221.github.io/GlyphSprout/) | [Guide d'utilisation](docs/USAGE.md) | [![Licence MIT](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

![Atelier réel : effacer et corriger un glyphe numérisé, aperçu et téléchargement TTF](assets/demo.gif)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.7.0
```

Node.js 22.12 ou une version ultérieure et Git sont nécessaires. Ouvrez `http://127.0.0.1:4173` lorsque le message de disponibilité s'affiche.

| Point de départ | Résultat |
| --- | --- |
| Votre écriture sur une feuille imprimée | Une petite police avec pixels source, contours et espacement modifiables |

## Créez votre première police

1. Créez un projet et choisissez les caractères nécessaires, par exemple `Hello!`. Vous pouvez ajouter des jeux entiers, comme les majuscules, les chiffres, la ponctuation, les hiragana ou les katakana, en un clic.
2. Imprimez le modèle A4 à taille réelle et écrivez un caractère dans chaque case.
3. Ajoutez un scan éclairé uniformément et confirmez son identifiant de page. GlyphSprout cherche les quatre croix de repère et y place les coins. Vérifiez chaque coin et corrigez ceux qui sont décalés.
4. Cliquez sur **Convertir les scans** et attendez la fin de la conversion.
5. Vérifiez chaque glyphe. Réglez la source, le seuil, le lissage du contour, le recadrage, la taille, les décalages et l'espacement.
6. Saisissez votre texte dans l'aperçu et téléchargez le TTF ou le WOFF2.

Modifier la source conserve les pixels actuels et permet d'effacer, de dessiner et d'annuler des traits locaux. Les réglages et l'affectation de page sont conservés. Toute source modifiée doit être vérifiée. Dessiner un glyphe commence avec une image vierge, remplace le glyphe et réinitialise ses réglages. Les dessins vides sont refusés. Une modification de source sans changement ne modifie pas l'historique du projet.

Agrandissez l'image pour corriger les détails. La taille du stylo et de la gomme se mesure en pixels source, donc le zoom ne change pas la largeur du trait. Déplacez l'image avec l'outil Déplacer, les barres de défilement ou les flèches. Arrêter la conversion conserve les scans, les coins et les confirmations pour réessayer. Choisissez **Supprimer les scans en attente** pour les retirer.

Marquer comme vérifié attend la fin des réglages d'encre et de recadrage. Si une case contient trop de points ou de contours pour être exportée, la conversion conserve son image et indique le caractère concerné. Les autres cases sont converties. Ajustez le filtre des taches, le recadrage ou l'image, puis vérifiez le glyphe corrigé.

La progression de la vérification s'affiche à côté de la liste des glyphes. **Prochain à vérifier** passe au glyphe suivant non vérifié, et les touches fléchées permettent de passer d'un glyphe à l'autre. Le panneau d'espacement règle l'espace entre les mots pour toute la police et peut copier l'approche latérale latine d'un glyphe vers toutes les lettres latines. **Télécharger l'image d'exemple** enregistre le texte d'aperçu au format PNG. **Copier le CSS de police web** place une règle `@font-face` dans le presse-papiers pour utiliser les fichiers téléchargés sur un site web, et **Zoom de l'aperçu** redimensionne l'échantillon en direct.

Le nom de la police et le texte des caractères dans « Characters » restent des brouillons lorsque vous changez de section. Choisissez **Project ready** pour les appliquer. Les sauvegardes et les polices téléchargées conservent jusque-là les valeurs appliquées. Les changements non appliqués sont perdus au rechargement.

## Un petit sous-ensemble avec des limites claires

Choisissez jusqu'à 512 caractères BMP pris en charge. Chaque modèle A4 comporte 35 cases et un projet peut utiliser jusqu'à 15 pages. Les glyphes latins utilisent un espacement proportionnel par défaut. Han et kana utilisent un avancement fixe par case. L'interface propose neuf langues, des thèmes clair et sombre, et une mise en page pour les petits écrans.

Les scans nécessitent le modèle imprimé, de l'encre foncée, du papier plat, une lumière uniforme et les quatre repères visibles. L'affectation et la confirmation des pages sont manuelles. GlyphSprout ne lit pas l'écriture manuscrite et ne détecte pas les cases automatiquement.

Les exports contiennent des contours simples sans hinting. Le lissage du contour transforme les marches de pixels des nouveaux tracés en segments diagonaux droits. Choisissez 0 pour conserver le contour exact en pixels. Ils n'incluent ni crénage, ni ajustement des courbes, ni façonnage de l'écriture liée, ni couverture complète des langues. L'exemple Han et kana utilise des traits synthétiques originaux, signalés comme tels.

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

La police d'exemple exportée avec la version 1.3.0 a été ouverte dans LibreOffice puis enregistrée en PDF avec la police intégrée et le texte conservé. La version 1.3.1 ne modifie que les noms internes de la police. Les téléchargements du navigateur dans les deux formats ont été analysés avec FontTools et rendus avec FreeType. Les cas de référence couvrent les contreformes, les points détachés, une descendante et des traits han à trois tailles de rasterisation. Consultez le guide pour la méthode, les exclusions et les commandes.

## Documentation et développement

- [Installation et options de commande](docs/INSTALLATION.md)
- [Utilisation](docs/USAGE.md)
- [Configuration et limites](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)
- [Contribution](CONTRIBUTING.md)

GlyphSprout est disponible sous la [licence MIT](LICENSE). Les dépendances incluses et la provenance de l'exemple sont répertoriées dans les [mentions tierces](THIRD_PARTY_NOTICES.md).

Assisted by Claude/Codex.
