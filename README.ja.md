[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

手書きテンプレートから、編集可能なラテン文字・漢字・かなのサブセットフォントを作成します。

**手書きの 6 文字。3.3 kB のフォント。**

同梱の Paper Bloom サンプルは 3,284 バイトの TTF を出力し、Fontconfig と LibreOffice で確認しています。この測定対象は 6 文字です。[測定方法と再現可能な書き出し手順](docs/VALIDATION.md)。

[オンライン作業場を開く](https://Arthur031221.github.io/GlyphSprout/) | [ユーザーガイド](docs/USAGE.md) | [![MIT ライセンス](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

Node.js 22.12 以降と Git が必要です。コマンドに準備完了のメッセージが表示されたら `http://127.0.0.1:4173` を開いてください。

| 編集前 | 編集後 |
| --- | --- |
| 手書き文字 6 個の切り抜き | 編集可能な輪郭と字間を備え、入力に使えるフォント |

![実際の作業画面：手書きのプレビュー、字形の倍率調整、TTF のダウンロード](assets/demo.gif)

小さなプロジェクトで実際に使う文字のために作りました。

## 最初のフォントを作る

初回アクセス時に、手書きの実文字 6 個を含む Paper Bloom が読み込まれます。すぐに文字を編集したり、フォントをダウンロードしたりできます。自分のフォントを作る手順は次のとおりです。

```text
1. Weekend という名前の新しいプロジェクトを作り、テキストに Hello! を選ぶ。
2. A4 テンプレートを実寸で印刷し、各マスに 1 文字ずつ書く。
3. 傾きのない PNG または JPEG スキャンを追加し、印刷されたページ番号を割り当てる。
4. 四隅を調整して位置合わせを確認し、変換して字形を確認する。
5. 文字見本に Hello! と入力し、TTF または WOFF2 をダウンロードする。
```

作業場には元画像と輪郭の表示、しきい値と点ノイズのフィルター、切り抜き、倍率、オフセット、字間の調整機能があります。オフセットと字間の単位はフォントユニットです。字形を描いたり消したりすることもできます。ライブ見本には実際に生成されたフォントを使います。描画の取り消しとプロジェクトの取り消しは別々です。

## 小さなサブセットと明確な制限

対応する BMP 文字を最大 512 個選択できます。A4 用紙 1 枚につき 35 マスで、最大 15 枚です。ラテン文字の字形は初期設定でプロポーショナルな字間を使います。漢字とかなは固定のセル幅を使います。画面は 9 言語、ライト・ダークのテーマ、狭い画面向けのレイアウトに対応しています。

スキャンには印刷テンプレート、濃いインク、平らな紙、均一な照明が必要で、4 つの位置合わせマークすべてが写っている必要があります。ページの割り当てと確認は手動です。手書き文字を読み取ったり、マスを自動で識別したりはしません。

書き出すのはヒンティングのないシンプルな輪郭です。カーニング、曲線の平滑化、連続筆記体のシェーピング、言語全体を網羅する文字セットには対応していません。漢字とかなの例には独自に作成した合成ストロークを使い、その旨を表示しています。

## 作業を保存する

プロジェクトデータはブラウザー内に保存されます。アプリがプロジェクトをアップロードしたり、リモート分析を行ったりすることはありません。大切な作業を閉じる前に `.glyphsprout.json` のバックアップをダウンロードしてください。IndexedDB は最新とその前の保存版を保持し、保存画像のハッシュを確認します。別のタブで新しい版が保存されている場合は警告します。

フッターに **Ready for offline use** と表示された後はオフラインで使えます。アプリ本体、ワーカー、WOFF2 エンコーダーがキャッシュされます。初回アクセスにはネット接続が必要です。ブラウザーのストレージを消去すると、復元データとキャッシュの両方が削除されることがあります。

## 作成したフォントをインストールする

デスクトップにインストールする場合は TTF を使ってください。以下は各環境での手順で、すべてのアプリがこのフォントに対応するという保証ではありません。必要に応じてアプリを再起動してください。

<details>
<summary>macOS</summary>

Finder でダウンロードした TTF をダブルクリックし、Font Book で **インストール** を選びます。[Apple の Font Book ガイド](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac)。

</details>

<details>
<summary>Windows</summary>

ダウンロードした TTF を右クリックして **インストール** を選びます。設定からインストール済みフォントを管理することもできます。[Microsoft のフォントガイド](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows)。

</details>

<details>
<summary>Fontconfig を使う Linux</summary>

TTF をユーザーのフォントディレクトリにコピーし、キャッシュを更新します。一般的な XDG データディレクトリを使うシステムでは、次のようにします。

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

異なるフォントディレクトリを設定している場合は、そのディレクトリを使ってください。[Fontconfig 設定ガイド](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html)。

</details>

<details>
<summary>Web ページ</summary>

WOFF2 をダウンロードし、`@font-face` で読み込みます。フォントに含まれるのは書き出した文字だけです。

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## 検証と出典

Paper Bloom には、パブリックドメインの [NIST SD19 フォーム f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png) から切り抜いた 6 文字が含まれています。フォーム全体は含めていません。[公式データセットページ](https://www.nist.gov/srd/nist-special-database-19)、切り抜き座標、固定した出典チェックサムは[検証ガイド](docs/VALIDATION.md)に記載しています。

サンプルの書き出しフォントを LibreOffice で開き、フォントを埋め込み、テキストを保持した PDF として保存しました。ブラウザーからダウンロードした両形式のファイルを FontTools で解析し、FreeType で描画しました。参照用フィクスチャでは、カウンター、離れた点、ディセンダー、3 種類のラスタサイズでの漢字ストロークを確認します。手順、除外項目、コマンドはガイドを参照してください。

## ドキュメントと開発

- [インストールとコマンドオプション](docs/INSTALLATION.md)
- [使い方](docs/USAGE.md)
- [設定と制限](docs/CONFIGURATION.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)
- [検証](docs/VALIDATION.md)
- [コントリビューション](CONTRIBUTING.md)

GlyphSprout は [MIT ライセンス](LICENSE)で利用できます。同梱の依存関係とサンプルの出典は[サードパーティ通知](THIRD_PARTY_NOTICES.md)に記載しています。

Assisted by Claude/Codex.
