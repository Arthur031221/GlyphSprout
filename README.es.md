[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

Crea una fuente pequeña para las palabras y los nombres que usa tu proyecto. Imprime una plantilla, escribe cada carácter, revisa los contornos escaneados y exporta una fuente que puedas usar al escribir.

**Seis letras manuscritas. Una fuente de 3.4 kB.**

La muestra incluida de Paper Bloom exporta un TTF de 3.360 bytes, comprobado con Fontconfig y FreeType. Esta medición corresponde a seis letras. [Método y exportación reproducible](docs/VALIDATION.md).

[Abrir el taller en línea](https://Arthur031221.github.io/GlyphSprout/) | [Guía de uso](docs/USAGE.md) | [![Licencia MIT](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

![Taller real: borrar y corregir un glifo escaneado, vista previa y descarga TTF](assets/demo.gif)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.27.0
```

Necesitas Node.js 22.12 o una versión posterior y Git. Abre `http://127.0.0.1:4173` cuando aparezca el mensaje de que está listo.

| Punto de partida | Resultado |
| --- | --- |
| Tu escritura en una plantilla impresa | Una fuente pequeña con píxeles originales, contornos y espaciado editables |

## Crea tu primera fuente

1. Crea un proyecto y elige los caracteres que necesitas, por ejemplo `Hello!`. Puedes añadir conjuntos completos, como mayúsculas, dígitos, puntuación, letras con acento, griego, cirílico, hiragana, katakana o letras hangul, con un clic.
2. Imprime la plantilla a tamaño real en papel A4 o US Letter y escribe un carácter en cada celda. Imprime desde el navegador o elige **Descargar todas las páginas (PDF)** para obtener un solo archivo que puedes imprimir desde cualquier visor de PDF o llevar a una imprenta.
3. Añade un escaneo con luz uniforme eligiendo el archivo, soltándolo en la sección de escaneo o tocando **Hacer una foto** en el móvil, y confirma el ID de página. GlyphSprout busca las cuatro cruces de registro y coloca las esquinas sobre ellas. Revisa cada esquina y corrige las que estén desviadas.
4. Haz clic en **Convertir escaneos** y espera a que termine la conversión. Al terminar se listan las celdas sin tinta, así que una letra omitida o una página equivocada se nota enseguida.
5. Revisa cada glifo. Ajusta la imagen original, el umbral, el grosor del trazo, el suavizado del contorno, el recorte, el tamaño, los desplazamientos y el espaciado. Cada ajuste numérico tiene un control deslizante. Escribe un valor y pulsa Intro, o mueve el control, y el contorno se actualiza al soltarlo. Pulsa Ctrl+Z o Cmd+Z para deshacer un cambio y añade Shift para rehacerlo. Las guías discontinuas de la vista de contorno marcan el borde izquierdo y el ancho de avance, así ves el espaciado de cada glifo mientras lo ajustas.
6. Escribe tu texto en la vista previa y descarga TTF o WOFF2. Cuando todos los glifos están listos, **Descargar fuente (TTF)** en el panel de vista previa guarda la fuente sin bajar hasta el taller. Los caracteres del texto que la fuente aún no tiene aparecen en rojo, y **Añadir estos caracteres** los suma al proyecto para que imprimas sus casillas. Cambiar los caracteres borra las asignaciones de página de los escaneos, así que vuelve a asignarlas. Las comillas y los apóstrofos curvos que escriben los teléfonos y los procesadores de texto usan los glifos de tus `'` y `"` rectos, así que no hace falta escribirlos dos veces.

Editar origen conserva los píxeles actuales y permite borrar, dibujar y deshacer trazos locales. Mantiene los ajustes y la página asignada. Si cambias el origen, debes revisar el glifo. Dibujar un glifo empieza con una imagen vacía, reemplaza el glifo y restablece sus ajustes. Se rechazan los dibujos vacíos. Mientras dibujas, **Usar y dibujar el siguiente** guarda el dibujo y abre un lienzo vacío para el siguiente carácter que aún no tiene glifo, así puedes crear una fuente sin impresora. Una edición del origen sin cambios no modifica el historial del proyecto.

Amplía la imagen para corregir detalles. El tamaño del lápiz y del borrador se mide en píxeles de origen, así que el ancho del trazo se mantiene al cambiar el zoom. Usa Mover, las barras de desplazamiento o las flechas. Detener la conversión conserva los escaneos, las esquinas y las confirmaciones para reintentarlo. Usa **Descartar escaneos pendientes** para eliminarlos.

Marcar como revisado espera a que terminen los ajustes de tinta y recorte. Si una celda tiene demasiados puntos o contornos para exportarla, la conversión conserva su imagen y muestra el carácter afectado. Las demás celdas se convierten. Ajusta el filtro de manchas, el recorte o la imagen y revisa el glifo corregido.

El avance de la revisión aparece junto a la lista de glifos. Cada casilla de la lista dibuja el contorno trazado, así que un glifo diminuto o mal colocado se nota de un vistazo. **Siguiente por revisar** salta al próximo glifo sin comprobar y las teclas de flecha se mueven entre glifos. El panel de espaciado fija el espacio entre palabras de toda la fuente y puede copiar el espaciado lateral latino de un glifo a todas las letras latinas. Una casilla de ese panel hace que las minúsculas que no añadiste usen la forma de sus mayúsculas, así un alfabeto solo de mayúsculas también escribe en minúsculas. **Descargar imagen de muestra** guarda el texto de vista previa como PNG. **Copiar CSS de fuente web** pone una regla `@font-face` en el portapapeles para usar los archivos descargados en un sitio web, y **Zoom de la vista previa** cambia el tamaño de la muestra en vivo. El panel **Información de la fuente** guarda el diseñador, el aviso de copyright y la licencia en la fuente exportada, y puede rellenar la SIL Open Font License con un clic.

El nombre de la fuente y el texto de caracteres en «Characters» se conservan como borradores al cambiar de sección. Pulsa **Project ready** para aplicarlos. Las copias de seguridad y las fuentes descargadas conservan los valores aplicados hasta entonces. Los cambios sin aplicar se pierden al recargar la página.

## Un subconjunto pequeño, con límites claros

Elige hasta 512 caracteres BMP compatibles. Cada plantilla A4 tiene 35 celdas y cada proyecto admite hasta 15 páginas. Los glifos latinos, griegos y cirílicos usan espaciado proporcional de forma predeterminada. Han, kana y hangul usan un avance fijo de celda. La interfaz ofrece nueve idiomas, temas claros y oscuros, y una disposición para pantallas estrechas.

Los escaneos necesitan la plantilla impresa, tinta oscura, papel plano, luz uniforme y las cuatro marcas de registro visibles. La conversión compensa las sombras suaves y la luz tenue en cada celda, pero los reflejos y las sombras marcadas requieren una foto mejor. La asignación y confirmación de páginas son manuales. GlyphSprout no lee la escritura ni detecta las celdas automáticamente.

Las exportaciones contienen contornos sencillos sin hinting. El suavizado del contorno convierte los escalones de píxeles de los trazados nuevos en segmentos diagonales rectos. Elige 0 para conservar el contorno exacto de píxeles. El interletraje se fija par a par, hasta 500 pares, y se exporta como una tabla `kern` sencilla. No incluyen ajuste de curvas, composición de escritura conectada ni cobertura completa de idiomas. La muestra de han y kana usa trazos sintéticos originales y está identificada como tal.

## Conserva tu trabajo

Los datos del proyecto permanecen en el navegador. La aplicación no sube proyectos ni usa analítica remota. Descarga una copia de seguridad `.glyphsprout.json` antes de cerrar un trabajo importante. Para abrir una copia, elige **Abrir proyecto** o suelta el archivo en cualquier parte de la página. IndexedDB conserva la revisión guardada más reciente y la anterior, comprueba los hashes de las imágenes guardadas y avisa si otra pestaña ha guardado una revisión más nueva.

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

La fuente de muestra exportada con la versión 1.3.0 se abrió en LibreOffice y se guardó como PDF con la fuente incrustada y el texto preservado. La versión 1.3.1 solo cambia los nombres internos de la fuente. Los archivos descargados en el navegador en ambos formatos se analizaron con FontTools y se renderizaron con FreeType. Los casos de referencia cubren huecos cerrados, puntos separados, un descendente y trazos han a tres tamaños de rasterización. Consulta la guía para conocer el método, las exclusiones y los comandos.

## Documentación y desarrollo

- [Instalación y opciones de comandos](docs/INSTALLATION.md)
- [Uso](docs/USAGE.md)
- [Configuración y límites](docs/CONFIGURATION.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Validación](docs/VALIDATION.md)
- [Contribuir](CONTRIBUTING.md)

GlyphSprout está disponible bajo la [licencia MIT](LICENSE). Las dependencias incluidas y la procedencia de la muestra figuran en [Avisos de terceros](THIRD_PARTY_NOTICES.md).

Assisted by Claude/Codex.
