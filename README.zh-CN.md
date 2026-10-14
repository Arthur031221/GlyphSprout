[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

为项目中实际使用的词语和名称制作小型字体。打印模板，写下字符，检查扫描后的轮廓，再导出可用于输入的字体。

**六个手写字母。一款 3.3 kB 字体。**

随附的 Paper Bloom 示例会导出 3,284 字节的 TTF，并经过 Fontconfig 和 LibreOffice 检查。这项测量仅涵盖六个字母。[测量方法和可复现的导出流程](docs/VALIDATION.md)。

[打开在线工作坊](https://Arthur031221.github.io/GlyphSprout/) | [使用指南](docs/USAGE.md) | [![MIT 许可证](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.3.0
```

需要 Node.js 22.12 或更新版本，以及 Git。命令显示就绪信息后，打开 `http://127.0.0.1:4173`。

| 起点 | 成果 |
| --- | --- |
| 写在打印纸上的个人手写字 | 字源像素、轮廓和间距均可编辑的小型字体 |

![实际工作坊：擦除并修正扫描字形、查看样张并下载 TTF](assets/demo.gif)

## 制作你的第一款字体

1. 新建项目，并选择需要的字符，例如 `Hello!`。
2. 按实际尺寸打印 A4 模板，每格写一个字符。
3. 添加光线均匀的扫描图，确认页面 ID 并对齐四个角。
4. 点击**转换扫描**，等待转换完成。
5. 检查每个字形。调整源图、阈值、裁切、大小、偏移和间距。
6. 在实时样张中输入文本，然后下载 TTF 或 WOFF2。

编辑字源会载入当前像素，可用画笔和橡皮擦进行局部修改，也可撤销笔画。它会保留字形设置和页面分配。修改后的字源需要重新检查。绘制字形从空白图像开始，会替换字形并重置其设置。空白绘图会被拒绝。没有变化的字源编辑不会更改项目历史。

放大可以修正细节。画笔和橡皮擦大小以原图像素为单位，缩放不会改变笔画宽度。可以使用平移工具、滚动条或方向键移动图像。停止扫描转换会保留扫描图像、角点位置和页面确认，方便重试。选择 **丢弃待处理扫描** 才会移除它们。

在 Characters 中输入的字体名称和字符文字会作为草稿保留，切换页面后仍可继续编辑。选择 **Project ready** 后才会应用。在此之前，备份和字体下载仍使用已应用的值。未应用的设置更改会在重新加载页面后丢失。

## 小型字符子集和明确限制

最多可选择 512 个受支持的 BMP 字符。每张 A4 模板有 35 格，一个项目最多使用 15 页。拉丁字形默认使用比例间距。汉字和假名使用固定字格前进量。界面提供九种语言、浅色和深色主题，以及适用于窄屏幕的布局。

扫描需要打印模板、深色墨水、平整纸张、均匀照明，并让四个定位标记都入镜。页面分配和确认需要手动完成。GlyphSprout 不会读取手写文字，也不会自动识别格子。

导出内容是未经微调的简单轮廓，不包含字偶距、曲线简化、连笔文字塑形或完整语言覆盖。汉字和假名示例使用原创合成笔画，并已明确标注。

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
