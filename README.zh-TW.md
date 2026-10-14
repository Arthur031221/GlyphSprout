[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

為專案實際使用的詞語與名稱製作小型字型。列印範本、寫下字元、檢查掃描後的外框，再匯出可供輸入的字型。

**六個手寫字母。一款 3.4 kB 字型。**

隨附的 Paper Bloom 範例會輸出 3,360 位元組的 TTF，並以 Fontconfig 和 FreeType 檢查。這項測量只涵蓋六個字母。[測量方法與可重現的匯出流程](docs/VALIDATION.md)。

[開啟線上工作坊](https://Arthur031221.github.io/GlyphSprout/) | [使用指南](docs/USAGE.md) | [![MIT 授權條款](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.5.0
```

需要 Node.js 22.12 或更新版本，以及 Git。指令顯示就緒訊息後，請開啟 `http://127.0.0.1:4173`。

| 起點 | 成果 |
| --- | --- |
| 寫在列印紙上的個人手寫字 | 字源像素、外框與間距皆可編輯的小型字型 |

![實際工作坊：擦除並修正掃描字形、查看樣張並下載 TTF](assets/demo.gif)

## 製作你的第一款字型

1. 建立專案，並選擇需要的字元，例如 `Hello!`。也可以一鍵加入整組字元，例如大寫字母、數字、標點符號、平假名或片假名。
2. 以實際尺寸列印 A4 範本，每格寫一個字元。
3. 加入光線均勻的掃描圖，確認頁面 ID 並對齊四個角。
4. 點擊**轉換掃描**，等待轉換完成。
5. 檢查每個字形。調整來源、閾值、裁切、大小、位移與間距。
6. 在即時樣張輸入文字，然後下載 TTF 或 WOFF2。

編輯字源會載入目前的像素，可用筆刷與橡皮擦局部修改，也可復原筆畫。此功能會保留字形設定與頁面指派。修改後的字源需要重新檢查。繪製字形從空白影像開始，會取代字形並重設設定。空白繪圖會遭到拒絕。沒有變動的字源編輯不會改變專案記錄。

放大可修正細節。筆刷與橡皮擦大小以來源像素為單位，縮放不會改變筆畫寬度。可使用平移工具、捲軸或方向鍵移動影像。停止掃描轉換會保留掃描影像、角點位置與頁面確認，方便重試。選擇 **捨棄待處理掃描** 才會移除它們。

標記已審閱會等待墨跡與裁切調整完成。如果掃描字格的節點或輪廓過多而無法匯出，轉換會保留來源影像並列出受影響的字元，其他字格仍可正常轉換。請調整雜點過濾、裁切或來源影像，再審閱修復後的字形。

審閱進度會顯示在字形清單旁。按下 **下一個待檢視** 會跳到下一個尚未檢查的字形，方向鍵也能在字形之間移動。字型間距面板可設定整個字型的字間空白，也能把一個字形的拉丁字側邊距套用到所有拉丁字母。**下載預覽圖片** 會把預覽文字存成 PNG。**複製網頁字型 CSS** 會把 `@font-face` 規則放到剪貼簿，方便在網站上使用下載的字型檔。**預覽縮放** 可調整即時預覽的大小。

在 Characters 輸入的字型名稱與字元文字會以草稿保留，切換頁面後仍可繼續編輯。選擇 **Project ready** 後才會套用。在此之前，備份與字型下載仍使用已套用的值。未套用的設定變更會在重新載入頁面後消失。

## 小型字元子集與明確限制

最多可選擇 512 個支援的 BMP 字元。每張 A4 範本有 35 格，一個專案最多使用 15 頁。拉丁字形預設使用比例間距。漢字與假名使用固定字格前進量。介面提供九種語言、淺色與深色主題，以及適用於窄螢幕的版面。

掃描需要列印範本、深色墨水、平整紙張、均勻照明，並讓四個定位標記都入鏡。頁面指派與確認都需手動完成。GlyphSprout 不會讀取手寫文字，也不會自動辨識格子。

匯出內容是未經微調的簡單外框，不包含字偶距、曲線簡化、連筆字塑形或完整語言涵蓋範圍。漢字與假名範例使用原創合成筆畫，並有相應標示。

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

1.3.0 版匯出的範例字型已在 LibreOffice 中開啟，並儲存為嵌入字型且保留文字的 PDF。1.3.1 版只更改內部字型名稱。兩種格式的瀏覽器下載檔都以 FontTools 解析，並以 FreeType 繪製。參考測試涵蓋封閉字腔、分離的小點、下伸筆畫，以及三種點陣尺寸的漢字筆畫。方法、排除項目與指令請見指南。

## 文件與開發

- [安裝與指令選項](docs/INSTALLATION.md)
- [使用方式](docs/USAGE.md)
- [設定與限制](docs/CONFIGURATION.md)
- [架構](docs/ARCHITECTURE.md)
- [驗證](docs/VALIDATION.md)
- [貢獻方式](CONTRIBUTING.md)

GlyphSprout 採用 [MIT 授權條款](LICENSE)。隨附依賴項與範例來源列於[第三方聲明](THIRD_PARTY_NOTICES.md)。

Assisted by Claude/Codex.
