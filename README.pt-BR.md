[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

# GlyphSprout

Crie uma fonte pequena para as palavras e os nomes usados no seu projeto. Imprima um modelo, escreva cada caractere, confira os contornos digitalizados e exporte uma fonte para usar ao digitar.

**Seis letras manuscritas. Uma fonte de 3.4 kB.**

A amostra Paper Bloom incluída exporta um TTF de 3.360 bytes, verificado com Fontconfig e FreeType. Essa medição corresponde a seis letras. [Método e exportação reproduzível](docs/VALIDATION.md).

[Abrir a oficina online](https://Arthur031221.github.io/GlyphSprout/) | [Guia do usuário](docs/USAGE.md) | [![Licença MIT](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

![Oficina real: apagar e corrigir um glifo digitalizado, conferir a prévia e baixar o TTF](assets/demo.gif)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.9.0
```

Você precisa do Node.js 22.12 ou mais recente e do Git. Abra `http://127.0.0.1:4173` quando aparecer a mensagem de que está pronto.

| Ponto de partida | Resultado |
| --- | --- |
| Sua escrita em uma folha impressa | Uma fonte pequena com pixels de origem, contornos e espaçamento editáveis |

## Crie sua primeira fonte

1. Crie um projeto e escolha os caracteres necessários, como `Hello!`. Você pode adicionar conjuntos inteiros, como maiúsculas, dígitos, pontuação, hiragana ou katakana, com um clique.
2. Imprima o modelo no tamanho real em papel A4 ou US Letter e escreva um caractere em cada célula.
3. Adicione uma digitalização com iluminação uniforme e confirme o ID da página. O GlyphSprout procura as quatro cruzes de registro e coloca os cantos sobre elas. Confira cada canto e ajuste os que estiverem fora do lugar.
4. Clique em **Converter digitalizações** e aguarde a conversão terminar.
5. Confira cada glifo. Ajuste a origem, o limite, a suavização do contorno, o corte, o tamanho, os deslocamentos e o espaçamento.
6. Digite seu texto na prévia e baixe o TTF ou WOFF2.

Editar origem carrega os pixels atuais e permite apagar, desenhar e desfazer traços locais. As configurações e a página atribuída são mantidas. Uma origem alterada precisa ser revisada. Desenhar um glifo começa com uma imagem vazia, substitui o glifo e redefine suas configurações. Desenhos sem tinta são rejeitados. Uma edição sem alterações não muda o histórico do projeto.

Amplie para corrigir detalhes. Os tamanhos da caneta e da borracha usam pixels da origem, então o zoom mantém a largura do traço. Mova a imagem com Mover, as barras de rolagem ou as setas. Parar a conversão mantém as digitalizações, os cantos e as confirmações para tentar novamente. Use **Descartar digitalizações pendentes** para removê-las.

Marcar como revisado espera o fim dos ajustes de tinta e recorte. Se uma célula tiver pontos ou contornos demais para exportar, a conversão mantém a imagem e indica o caractere afetado. As outras células são convertidas. Ajuste o filtro de manchas, o recorte ou a imagem e revise o glifo corrigido.

O andamento da revisão aparece ao lado da lista de glifos. **Próximo a revisar** vai para o próximo glifo ainda não conferido, e as setas do teclado se movem entre os glifos. O painel de espaçamento define o espaço entre palavras de toda a fonte e pode copiar o espaçamento lateral latino de um glifo para todas as letras latinas. **Baixar imagem de amostra** salva o texto de pré-visualização como PNG. **Copiar CSS de fonte web** coloca uma regra `@font-face` na área de transferência para usar os arquivos baixados em um site, e **Zoom da pré-visualização** muda o tamanho da amostra ao vivo. O painel **Informações da fonte** grava o projetista, o aviso de direitos autorais e a licença na fonte exportada, e pode preencher a SIL Open Font License com um clique.

O nome da fonte e o texto de caracteres em Characters continuam como rascunhos ao mudar de etapa. Selecione **Project ready** para aplicá-los. Até lá, backups e fontes baixadas mantêm os valores aplicados. Alterações não aplicadas são perdidas ao recarregar a página.

## Um subconjunto pequeno, com limites claros

Escolha até 512 caracteres BMP compatíveis. Cada modelo A4 tem 35 células e um projeto pode usar até 15 páginas. Por padrão, glifos latinos usam espaçamento proporcional. Han e kana usam avanço fixo por célula. A interface oferece nove idiomas, temas claro e escuro e uma organização para telas estreitas.

As digitalizações precisam do modelo impresso, tinta escura, papel plano, iluminação uniforme e as quatro marcas de registro visíveis. A atribuição e a confirmação das páginas são manuais. O GlyphSprout não lê escrita à mão nem detecta células automaticamente.

Os arquivos exportados contêm contornos simples sem hinting. A suavização do contorno transforma os degraus de pixel dos novos traçados em segmentos diagonais retos. Escolha 0 para manter o contorno exato em pixels. Não incluem kerning, ajuste de curvas, composição de escrita conectada nem cobertura completa de idiomas. A amostra de han e kana usa traços sintéticos originais e está identificada como tal.

## Guarde seu trabalho

Os dados do projeto ficam no navegador. O aplicativo não envia projetos nem usa análises remotas. Antes de fechar um trabalho importante, baixe um backup `.glyphsprout.json`. O IndexedDB mantém a revisão salva mais recente e a anterior, verifica os hashes das imagens armazenadas e avisa quando outra aba salva uma revisão mais nova.

O uso offline fica disponível quando o rodapé mostra **Ready for offline use**. O aplicativo completo, o worker e o codificador WOFF2 são armazenados em cache. A primeira visita precisa de conexão. Limpar o armazenamento do navegador pode remover tanto os dados de recuperação quanto o cache.

## Instale a fonte criada

Use TTF para instalar a fonte em um computador. Estas são instruções para cada sistema, sem garantia de suporte em todos os aplicativos. Reinicie os aplicativos quando necessário.

<details>
<summary>macOS</summary>

No Finder, clique duas vezes no TTF baixado e escolha **Instalar** no Catálogo de Fontes. [Guia do Catálogo de Fontes da Apple](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac).

</details>

<details>
<summary>Windows</summary>

Clique com o botão direito no TTF baixado e escolha **Instalar**. Você também pode gerenciar fontes instaladas nas Configurações. [Guia de fontes da Microsoft](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows).

</details>

<details>
<summary>Linux com Fontconfig</summary>

Copie o TTF para o diretório de fontes do usuário e atualize o cache. Em sistemas que usam o diretório de dados XDG habitual:

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

Se o diretório de fontes configurado for diferente, use esse diretório. [Guia de configuração do Fontconfig](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html).

</details>

<details>
<summary>Páginas da web</summary>

Baixe o WOFF2 e carregue-o com `@font-face`. A fonte contém apenas os caracteres exportados:

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## Validação e procedência

O Paper Bloom contém seis recortes de letras de domínio público, retirados do [formulário f1002_33 do NIST SD19](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). O formulário completo não foi incluído. A [página oficial do conjunto de dados](https://www.nist.gov/srd/nist-special-database-19), as coordenadas dos recortes e o checksum fixado da fonte estão documentados no [guia de validação](docs/VALIDATION.md).

A fonte de amostra exportada na versão 1.3.0 foi aberta no LibreOffice e salva como PDF com a fonte incorporada e o texto preservado. A versão 1.3.1 altera apenas os nomes internos da fonte. Os arquivos baixados pelo navegador nos dois formatos foram analisados com FontTools e renderizados com FreeType. Os casos de referência cobrem espaços internos, pontos destacados, uma descendente e traços han em três tamanhos de rasterização. Consulte o guia para o método, as exclusões e os comandos.

## Documentação e desenvolvimento

- [Instalação e opções de comando](docs/INSTALLATION.md)
- [Uso](docs/USAGE.md)
- [Configuração e limites](docs/CONFIGURATION.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Validação](docs/VALIDATION.md)
- [Como contribuir](CONTRIBUTING.md)

O GlyphSprout está disponível sob a [Licença MIT](LICENSE). As dependências incluídas e a procedência da amostra estão listadas em [Avisos de terceiros](THIRD_PARTY_NOTICES.md).

Assisted by Claude/Codex.
