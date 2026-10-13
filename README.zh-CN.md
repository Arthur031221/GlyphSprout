[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

将手写模板转换为可编辑的拉丁字母、汉字和假名字体子集。

**六个手写字母。一款 3.3 kB 字体。**

随附的 Paper Bloom 示例会导出 3,284 字节的 TTF，并经过 Fontconfig 和 LibreOffice 检查。这项测量仅涵盖六个字母。[测量方法和可复现的导出流程](docs/VALIDATION.md)。

[打开在线工作坊](https://Arthur031221.github.io/GlyphSprout/) | [使用指南](docs/USAGE.md) | [![MIT 许可证](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

需要 Node.js 22.12 或更新版本，以及 Git。命令显示就绪信息后，打开 `http://127.0.0.1:4173`。

| 编辑前 | 编辑后 |
| --- | --- |
| 六个手写字母裁切图 | 可供打字的字体，带可编辑轮廓和间距 |

![真实工作坊：手写预览、字形比例调整和 TTF 下载](assets/demo.gif)

我为小型项目实际会用到的字符制作了这个工具。

## 制作你的第一款字体

首次访问时会加载包含六个真实手写字母的 Paper Bloom。你可以立即编辑字母或下载字体。要制作自己的字体：

```text
1. 新建名为 Weekend 的项目，并选择文本 Hello!。
2. 按实际尺寸打印 A4 模板，每格写一个字符。
3. 添加平整扫描的 PNG 或 JPEG，并指定打印页码。
4. 调整四个角，确认对齐，转换并检查字形。
5. 在字体样张中输入 Hello!，然后下载 TTF 或 WOFF2。
```

工作坊提供源图和轮廓视图、阈值和杂点过滤、裁切、缩放倍率、偏移和间距控制。偏移和间距以字体单位计。你也可以绘制或擦除字形。实时样张使用实际生成的字体。绘图撤销和项目撤销彼此独立。

## 小型字符子集和明确限制

最多可选择 512 个受支持的 BMP 字符。每张 A4 纸有 35 格，最多 15 张。拉丁字形默认使用比例间距。汉字和假名使用固定字格前进量。界面提供九种语言、浅色和深色主题，以及适用于窄屏幕的布局。

扫描需要使用打印模板、深色墨水、平整纸张、均匀照明，并让四个定位标记都入镜。页面分配和确认都需要手动完成。本工具不会读取手写文字，也不会自动识别格子。

导出内容是简单且未经微调的轮廓。不支持字偶距、曲线平滑、连笔文字塑形或完整语言覆盖。汉字和假名示例使用原创合成笔画，并已明确标注。

## 保存你的成果

项目数据保留在浏览器中。应用不会上传项目，也不会使用远程分析。关闭重要工作前，请下载 `.glyphsprout.json` 备份。IndexedDB 会保留最新和前一个保存版本、检查所存图像的哈希值，并在其他标签页保存了更新版本时发出警告。

页脚显示 **Ready for offline use** 后即可离线使用。完整应用、工作线程和 WOFF2 编码器都会缓存。首次访问需要网络连接。清除浏览器存储可能同时删除恢复数据和缓存。

## 安装你制作的字体

在桌面安装字体时请使用 TTF。以下是各主机的操作说明，并不保证每个应用都支持该字体。必要时请重启应用。

<details>
<summary>macOS</summary>

在 Finder 中双击下载的 TTF，然后在字体册中选择 **安装**。[Apple 字体册指南](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac)。

</details>

<details>
<summary>Windows</summary>

右键点击下载的 TTF 并选择 **安装**。也可以在设置中管理已安装的字体。[Microsoft 字体指南](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows)。

</details>

<details>
<summary>使用 Fontconfig 的 Linux</summary>

将 TTF 复制到用户字体目录并刷新缓存。在使用常见 XDG 数据目录的系统上：

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

如果你的字体目录不同，请使用配置的目录。[Fontconfig 配置指南](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html)。

</details>

<details>
<summary>网页</summary>

下载 WOFF2，并使用 `@font-face` 加载。字体只包含你导出的字符：

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## 验证与来源

Paper Bloom 包含取自公有领域 [NIST SD19 表单 f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png) 的六个字母裁切图。完整表单未包含在内。[官方数据集页面](https://www.nist.gov/srd/nist-special-database-19)、裁切坐标和固定的来源校验和记载于[验证指南](docs/VALIDATION.md)。

示例导出字体已在 LibreOffice 中打开，并保存为嵌入字体且保留文本的 PDF。两种格式的浏览器下载文件都用 FontTools 解析，并用 FreeType 渲染。参考测试涵盖封闭字腔、分离的小点、下伸笔画，以及三种栅格尺寸的汉字笔画。方法、排除项和命令请见指南。

## 文档与开发

- [安装和命令选项](docs/INSTALLATION.md)
- [使用方法](docs/USAGE.md)
- [配置和限制](docs/CONFIGURATION.md)
- [架构](docs/ARCHITECTURE.md)
- [验证](docs/VALIDATION.md)
- [参与贡献](CONTRIBUTING.md)

GlyphSprout 使用 [MIT 许可证](LICENSE)。随附依赖项和示例来源列于[第三方声明](THIRD_PARTY_NOTICES.md)。

Assisted by Claude/Codex.
