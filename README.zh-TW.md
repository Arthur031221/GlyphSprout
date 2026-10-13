[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

將手寫模板轉成可編輯的拉丁字母、漢字與假名字型子集。

**六個手寫字母。一款 3.3 kB 字型。**

隨附的 Paper Bloom 範例會輸出 3,284 位元組的 TTF，並以 Fontconfig 和 LibreOffice 檢查。這項測量只涵蓋六個字母。[測量方法與可重現的匯出流程](docs/VALIDATION.md)。

[開啟線上工作坊](https://Arthur031221.github.io/GlyphSprout/) | [使用指南](docs/USAGE.md) | [![MIT 授權條款](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

需要 Node.js 22.12 或更新版本，以及 Git。指令顯示就緒訊息後，請開啟 `http://127.0.0.1:4173`。

| 編輯前 | 編輯後 |
| --- | --- |
| 六個手寫字母裁切圖 | 可供打字的字型，含可編輯外框與間距 |

![實際工作坊：手寫預覽、字形比例調整與 TTF 下載](assets/demo.gif)

我為小型專案實際會用到的字元打造了這個工具。

## 製作你的第一款字型

首次造訪時會載入含有六個真實手寫字母的 Paper Bloom。你可以立即編輯字母或下載字型。若要製作自己的字型：

```text
1. 建立名為 Weekend 的新專案，並選擇文字 Hello!。
2. 以實際尺寸列印 A4 模板，每格寫一個字元。
3. 加入平整掃描的 PNG 或 JPEG，並指定列印頁碼。
4. 調整四個角、確認對齊、轉換並檢查字形。
5. 在字體樣張中輸入 Hello!，然後下載 TTF 或 WOFF2。
```

工作坊提供來源與外框檢視、閾值與雜點篩選、裁切、縮放倍率、位移和間距控制。位移與間距以字型單位計。你也可以繪製或擦除字形。即時樣張使用實際產生的字型。繪圖復原和專案復原彼此獨立。

## 小型字元子集與明確限制

最多可選擇 512 個支援的 BMP 字元。每張 A4 紙有 35 格，最多 15 張。拉丁字形預設使用比例間距。漢字與假名使用固定字格前進量。介面提供九種語言、淺色與深色主題，以及適用於窄螢幕的版面。

掃描時需要使用列印模板、深色墨水、平整紙張、均勻照明，並讓四個定位標記都入鏡。頁面指派與確認都需手動完成。本工具不會讀取手寫文字，也不會自動辨識格子。

匯出內容是簡單且未經微調的外框。不支援字偶距、曲線平滑、連筆字塑形或完整語言涵蓋範圍。漢字與假名範例使用原創合成筆畫，並有相應標示。

## 保存你的成果

專案資料留在瀏覽器中。應用程式不會上傳專案，也不會使用遠端分析。關閉重要工作前，請下載 `.glyphsprout.json` 備份。IndexedDB 會保留最新與前一個儲存版本、檢查儲存影像的雜湊值，並在其他分頁儲存了較新版本時發出警告。

頁尾顯示 **Ready for offline use** 後即可離線使用。完整應用程式、工作者與 WOFF2 編碼器都會快取。首次造訪需要網路連線。清除瀏覽器儲存空間可能同時移除復原資料與快取。

## 安裝你製作的字型

在桌面安裝字型時請使用 TTF。以下是各主機的操作說明，不代表每個應用程式都支援此字型。必要時請重新啟動應用程式。

<details>
<summary>macOS</summary>

在 Finder 中按兩下下載的 TTF，然後在字體簿中選擇 **安裝**。[Apple 字體簿指南](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac)。

</details>

<details>
<summary>Windows</summary>

在下載的 TTF 上按右鍵並選擇 **安裝**。也可以在設定中管理已安裝的字型。[Microsoft 字型指南](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows)。

</details>

<details>
<summary>使用 Fontconfig 的 Linux</summary>

將 TTF 複製到使用者的字型目錄並更新快取。在使用一般 XDG 資料目錄的系統上：

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

若你使用不同的字型目錄，請改用該目錄。[Fontconfig 設定指南](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html)。

</details>

<details>
<summary>網頁</summary>

下載 WOFF2，並以 `@font-face` 載入。字型只包含你匯出的字元：

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## 驗證與來源

Paper Bloom 含有取自公有領域 [NIST SD19 表單 f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png) 的六個字母裁切圖。未收錄完整表單。[官方資料集頁面](https://www.nist.gov/srd/nist-special-database-19)、裁切座標與固定的來源校驗碼都記載於[驗證指南](docs/VALIDATION.md)。

範例匯出字型已在 LibreOffice 中開啟，並儲存為嵌入字型且保留文字的 PDF。兩種格式的瀏覽器下載檔都以 FontTools 解析，並以 FreeType 繪製。參考測試涵蓋封閉字腔、分離的小點、下伸筆畫，以及三種點陣尺寸的漢字筆畫。方法、排除項目與指令請見指南。

## 文件與開發

- [安裝與指令選項](docs/INSTALLATION.md)
- [使用方式](docs/USAGE.md)
- [設定與限制](docs/CONFIGURATION.md)
- [架構](docs/ARCHITECTURE.md)
- [驗證](docs/VALIDATION.md)
- [貢獻方式](CONTRIBUTING.md)

GlyphSprout 採用 [MIT 授權條款](LICENSE)。隨附依賴項與範例來源列於[第三方聲明](THIRD_PARTY_NOTICES.md)。

Assisted by Claude/Codex.
