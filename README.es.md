[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Crea una fuente pequeña para las palabras y los nombres que usa tu proyecto. Imprime una plantilla, escribe cada carácter, revisa los contornos escaneados y exporta una fuente que puedas usar al escribir.

**Seis letras manuscritas. Una fuente de 3.3 kB.**

La muestra incluida de Paper Bloom exporta un TTF de 3.284 bytes, comprobado con Fontconfig y LibreOffice. Esta medición corresponde a seis letras. [Método y exportación reproducible](docs/VALIDATION.md).

[Abrir el taller en línea](https://Arthur031221.github.io/GlyphSprout/) | [Guía de uso](docs/USAGE.md) | [![Licencia MIT](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.2.0
```

Necesitas Node.js 22.12 o una versión posterior y Git. Abre `http://127.0.0.1:4173` cuando aparezca el mensaje de que está listo.

| Punto de partida | Resultado |
| --- | --- |
| Tu escritura en una plantilla impresa | Una fuente pequeña con píxeles originales, contornos y espaciado editables |

![Taller real: borrar y corregir un glifo escaneado, vista previa y descarga TTF](assets/demo.gif)

## Crea tu primera fuente

1. Crea un proyecto y elige los caracteres que necesitas, por ejemplo `Hello!`.
2. Imprime la plantilla A4 a tamaño real y escribe un carácter en cada celda.
3. Añade un escaneo con luz uniforme, confirma el ID de página y alinea las cuatro esquinas.
4. Haz clic en **Convertir escaneos** y espera a que termine la conversión.
5. Revisa cada glifo. Ajusta la imagen original, el umbral, el recorte, el tamaño, los desplazamientos y el espaciado.
6. Escribe tu texto en la vista previa y descarga TTF o WOFF2.

Editar origen conserva los píxeles actuales y permite borrar, dibujar y deshacer trazos locales. Mantiene los ajustes y la página asignada. Si cambias el origen, debes revisar el glifo. Dibujar un glifo empieza con una imagen vacía, reemplaza el glifo y restablece sus ajustes. Se rechazan los dibujos vacíos. Una edición del origen sin cambios no modifica el historial del proyecto.

## Un subconjunto pequeño, con límites claros

Elige hasta 512 caracteres BMP compatibles. Cada plantilla A4 tiene 35 celdas y cada proyecto admite hasta 15 páginas. Los glifos latinos usan espaciado proporcional de forma predeterminada. Han y kana usan un avance fijo de celda. La interfaz ofrece nueve idiomas, temas claros y oscuros, y una disposición para pantallas estrechas.

Los escaneos necesitan la plantilla impresa, tinta oscura, papel plano, luz uniforme y las cuatro marcas de registro visibles. La asignación y confirmación de páginas son manuales. GlyphSprout no lee la escritura ni detecta las celdas automáticamente.

Las exportaciones contienen contornos sencillos sin hinting. No incluyen kerning, simplificación de curvas, composición de escritura conectada ni cobertura completa de idiomas. La muestra de han y kana usa trazos sintéticos originales y está identificada como tal.

## Conserva tu trabajo

Los datos del proyecto permanecen en el navegador. La aplicación no sube proyectos ni usa analítica remota. Descarga una copia de seguridad `.glyphsprout.json` antes de cerrar un trabajo importante. IndexedDB conserva la revisión guardada más reciente y la anterior, comprueba los hashes de las imágenes guardadas y avisa si otra pestaña ha guardado una revisión más nueva.

Puedes trabajar sin conexión cuando el pie de página muestre **Ready for offline use**. Se guardan en caché la aplicación completa, el worker y el codificador WOFF2. La primera visita requiere conexión. Al borrar el almacenamiento del navegador pueden eliminarse tanto los datos de recuperación como la caché.

## Instala la fuente que creaste

Usa TTF para instalar la fuente en un equipo de escritorio. Estas son instrucciones para cada sistema. No garantizan que todas las aplicaciones admitan la fuente. Reinicia las aplicaciones cuando sea necesario.

<details>
<summary>macOS</summary>

Haz doble clic en el TTF descargado en Finder y elige **Instalar** en Catálogo Tipográfico. [Guía de Catálogo Tipográfico de Apple](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac).

</details>

<details>
<summary>Windows</summary>

Haz clic con el botón derecho en el TTF descargado y elige **Instalar**. También puedes administrar las fuentes instaladas desde Configuración. [Guía de fuentes de Microsoft](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows).

</details>

<details>
<summary>Linux con Fontconfig</summary>

Copia el TTF en el directorio de fuentes de tu usuario y actualiza la caché. En sistemas que usan el directorio de datos XDG habitual:

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

Si tu directorio de fuentes configurado es distinto, usa ese. [Guía de configuración de Fontconfig](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html).

</details>

<details>
<summary>Páginas web</summary>

Descarga WOFF2 y cárgalo con `@font-face`. La fuente solo contiene los caracteres que exportaste:

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## Validación y procedencia

Paper Bloom contiene seis recortes de letras de dominio público tomados del [formulario f1002_33 de NIST SD19](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). Se excluye el formulario completo. La [página oficial del conjunto de datos](https://www.nist.gov/srd/nist-special-database-19), las coordenadas de recorte y la suma de comprobación fijada de la fuente se documentan en la [guía de validación](docs/VALIDATION.md).

La fuente de muestra exportada se abrió en LibreOffice y se guardó como PDF con la fuente incrustada y el texto preservado. Los archivos descargados en el navegador en ambos formatos se analizaron con FontTools y se renderizaron con FreeType. Los casos de referencia cubren huecos cerrados, puntos separados, un descendente y trazos han a tres tamaños de rasterización. Consulta la guía para conocer el método, las exclusiones y los comandos.

## Documentación y desarrollo

- [Instalación y opciones de comandos](docs/INSTALLATION.md)
- [Uso](docs/USAGE.md)
- [Configuración y límites](docs/CONFIGURATION.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Validación](docs/VALIDATION.md)
- [Contribuir](CONTRIBUTING.md)

GlyphSprout está disponible bajo la [licencia MIT](LICENSE). Las dependencias incluidas y la procedencia de la muestra figuran en [Avisos de terceros](THIRD_PARTY_NOTICES.md).

Assisted by Claude/Codex.
