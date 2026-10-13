[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Convierte plantillas manuscritas en subconjuntos editables de fuentes para caracteres latinos, han y kana.

**Seis letras manuscritas. Una fuente de 3.3 kB.**

La muestra incluida de Paper Bloom exporta un TTF de 3.284 bytes, comprobado con Fontconfig y LibreOffice. Esta medición corresponde a seis letras. [Método y exportación reproducible](docs/VALIDATION.md).

[Abrir el taller en línea](https://Arthur031221.github.io/GlyphSprout/) | [Guía de uso](docs/USAGE.md) | [![Licencia MIT](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

Necesitas Node.js 22.12 o posterior y Git. Abre `http://127.0.0.1:4173` cuando el comando muestre el mensaje de que está listo.

| Antes | Después |
| --- | --- |
| Seis recortes de letras manuscritas | Una fuente lista para usar al escribir, con contornos y espaciado editables |

![Taller real: vista previa manuscrita, ajuste de escala del glifo y descarga TTF](assets/demo.gif)

Lo hice para los caracteres que un proyecto pequeño usa de verdad.

## Crea tu primera fuente

La primera visita carga Paper Bloom con seis letras manuscritas reales. Puedes editar una letra o descargar la fuente de inmediato. Para crear la tuya:

```text
1. Crea un proyecto llamado Weekend y elige el texto Hello!.
2. Imprime la plantilla A4 a tamaño real y escribe un carácter en cada celda.
3. Añade un escaneo plano en PNG o JPEG y asigna el número de página impreso.
4. Ajusta las cuatro esquinas, confirma la alineación, convierte y revisa los glifos.
5. Escribe Hello! en la muestra y descarga TTF o WOFF2.
```

El taller incluye vistas del original y del contorno, controles de umbral y filtrado de motas, recorte y ajuste del multiplicador de escala, los desplazamientos y el espaciado. Los desplazamientos y el espaciado se expresan en unidades tipográficas. También puedes dibujar o borrar un glifo. La muestra en directo usa la fuente generada. Deshacer un dibujo y deshacer cambios del proyecto son acciones independientes.

## Un subconjunto pequeño, con límites claros

Elige hasta 512 caracteres BMP compatibles, con 35 celdas por hoja A4 y un máximo de 15 hojas. De forma predeterminada, los glifos latinos usan espaciado proporcional. Han y kana usan un avance de celda fijo. La interfaz ofrece nueve idiomas, temas claro y oscuro y un diseño para pantallas estrechas.

Los escaneos necesitan la plantilla impresa, tinta oscura, papel plano, iluminación uniforme y las cuatro marcas de registro visibles. La asignación y confirmación de página son manuales. La herramienta no lee texto manuscrito ni identifica celdas automáticamente.

Las exportaciones contienen contornos simples sin hinting. No incluyen kerning, suavizado de curvas, composición de escritura conectada ni cobertura completa de idiomas. El ejemplo de han y kana usa trazos sintéticos originales y está etiquetado como tal.

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
