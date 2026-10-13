[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

# GlyphSprout

손글씨 템플릿을 편집 가능한 라틴 문자, 한자, 가나 글꼴 부분집합으로 만듭니다.

**손글씨 여섯 글자. 3.3 kB 글꼴.**

포함된 Paper Bloom 샘플은 3,284바이트 TTF를 내보내며 Fontconfig와 LibreOffice로 확인했습니다. 이 측정은 여섯 글자에 해당합니다. [측정 방법과 재현 가능한 내보내기](docs/VALIDATION.md).

[온라인 작업실 열기](https://Arthur031221.github.io/GlyphSprout/) | [사용자 안내서](docs/USAGE.md) | [![MIT 라이선스](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

Node.js 22.12 이상과 Git이 필요합니다. 명령에 준비 완료 메시지가 표시되면 `http://127.0.0.1:4173`을 여세요.

| 편집 전 | 편집 후 |
| --- | --- |
| 손글씨 여섯 글자 이미지 조각 | 편집 가능한 윤곽과 간격을 갖춰 입력에 쓸 수 있는 글꼴 |

![실제 작업실: 손글씨 미리보기, 글리프 배율 조정, TTF 다운로드](assets/demo.gif)

작은 프로젝트에서 실제로 사용하는 글자를 위해 만들었습니다.

## 첫 글꼴 만들기

처음 방문하면 실제 손글씨 여섯 글자가 담긴 Paper Bloom이 열립니다. 바로 글자를 편집하거나 글꼴을 다운로드할 수 있습니다. 직접 만들려면 다음 단계를 따르세요.

```text
1. Weekend라는 새 프로젝트를 만들고 텍스트로 Hello!를 선택합니다.
2. A4 템플릿을 실제 크기로 인쇄하고 각 칸에 한 글자씩 씁니다.
3. 평평하게 스캔한 PNG 또는 JPEG를 추가하고 인쇄된 페이지 번호를 지정합니다.
4. 네 모서리를 조정해 정렬을 확인하고 변환한 뒤 글리프를 검토합니다.
5. 글꼴 견본에 Hello!를 입력하고 TTF 또는 WOFF2를 다운로드합니다.
```

작업실에서는 원본과 윤곽 보기, 임계값 및 잡점 필터, 자르기, 배율, 오프셋, 간격을 조정할 수 있습니다. 오프셋과 간격은 글꼴 단위를 사용합니다. 글리프를 직접 그리거나 지울 수도 있습니다. 실시간 견본에는 실제로 생성된 글꼴이 사용됩니다. 그리기 실행 취소와 프로젝트 실행 취소는 별도로 동작합니다.

## 작은 부분집합과 명확한 한계

지원되는 BMP 문자 중 최대 512개를 선택할 수 있습니다. A4 한 장에는 35칸이 있고 최대 15장까지 사용할 수 있습니다. 라틴 글리프는 기본적으로 비례 간격을 사용합니다. 한자와 가나는 고정된 셀 전진 폭을 사용합니다. 인터페이스는 9개 언어, 밝은 테마와 어두운 테마, 좁은 화면용 레이아웃을 제공합니다.

스캔에는 인쇄된 템플릿, 진한 잉크, 평평한 종이, 고른 조명이 필요하며 네 개의 정렬 표식이 모두 보여야 합니다. 페이지 지정과 확인은 수동입니다. 손글씨를 읽거나 칸을 자동으로 식별하지 않습니다.

내보내기에는 힌팅이 없는 단순 윤곽이 들어갑니다. 커닝, 곡선 부드럽게 하기, 연결 문자의 셰이핑, 전체 언어 범위는 지원하지 않습니다. 한자와 가나 예제는 직접 만든 합성 획을 사용하며 그렇게 표시되어 있습니다.

## 작업 보관하기

프로젝트 데이터는 브라우저에 저장됩니다. 앱은 프로젝트를 업로드하거나 원격 분석을 하지 않습니다. 중요한 작업을 닫기 전에 `.glyphsprout.json` 백업을 다운로드하세요. IndexedDB는 최신 저장본과 그 이전 저장본을 보관하고 저장된 이미지의 해시를 확인하며, 다른 탭에서 더 최신 버전을 저장하면 경고합니다.

바닥글에 **Ready for offline use**가 표시되면 오프라인으로 사용할 수 있습니다. 앱 전체, 워커, WOFF2 인코더가 캐시됩니다. 첫 방문에는 네트워크 연결이 필요합니다. 브라우저 저장 공간을 지우면 복구 데이터와 캐시가 모두 삭제될 수 있습니다.

## 만든 글꼴 설치하기

데스크톱에 글꼴을 설치할 때는 TTF를 사용하세요. 아래는 호스트별 안내이며 모든 애플리케이션이 글꼴을 지원한다는 보장은 아닙니다. 필요하면 애플리케이션을 다시 시작하세요.

<details>
<summary>macOS</summary>

Finder에서 다운로드한 TTF를 두 번 클릭한 다음 서체 관리자에서 **설치**를 선택하세요. [Apple 서체 관리자 안내](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac).

</details>

<details>
<summary>Windows</summary>

다운로드한 TTF를 마우스 오른쪽 버튼으로 클릭하고 **설치**를 선택하세요. 설정에서 설치된 글꼴을 관리할 수도 있습니다. [Microsoft 글꼴 안내](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows).

</details>

<details>
<summary>Fontconfig를 사용하는 Linux</summary>

TTF를 사용자 글꼴 디렉터리에 복사하고 캐시를 새로 고치세요. 일반적인 XDG 데이터 디렉터리를 사용하는 시스템에서는 다음과 같이 합니다.

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

설정된 글꼴 디렉터리가 다르면 해당 디렉터리를 사용하세요. [Fontconfig 설정 안내](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html).

</details>

<details>
<summary>웹 페이지</summary>

WOFF2를 다운로드하고 `@font-face`로 불러오세요. 글꼴에는 내보낸 문자만 포함됩니다.

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## 검증과 출처

Paper Bloom에는 퍼블릭 도메인 [NIST SD19 양식 f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png)에서 잘라낸 여섯 글자가 들어 있습니다. 전체 양식은 포함하지 않았습니다. [공식 데이터셋 페이지](https://www.nist.gov/srd/nist-special-database-19), 자르기 좌표, 고정된 출처 체크섬은 [검증 안내서](docs/VALIDATION.md)에 기록되어 있습니다.

샘플 내보내기 글꼴을 LibreOffice에서 열어 글꼴을 포함하고 텍스트를 보존한 PDF로 저장했습니다. 두 형식의 브라우저 다운로드 파일을 FontTools로 분석하고 FreeType으로 렌더링했습니다. 기준 픽스처는 내부 공간, 떨어진 점, 아래로 뻗는 획, 세 가지 래스터 크기의 한자 획을 다룹니다. 방법, 제외 사항, 명령은 안내서를 참조하세요.

## 문서와 개발

- [설치 및 명령 옵션](docs/INSTALLATION.md)
- [사용법](docs/USAGE.md)
- [구성 및 한계](docs/CONFIGURATION.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [검증](docs/VALIDATION.md)
- [기여하기](CONTRIBUTING.md)

GlyphSprout은 [MIT 라이선스](LICENSE)로 제공됩니다. 포함된 의존성과 샘플 출처는 [제3자 고지](THIRD_PARTY_NOTICES.md)에 나와 있습니다.

Assisted by Claude/Codex.
