# Paco Agent Skills

一套可安裝到 Codex、Claude Code 與 Hermes Agent 的 Paco 個人工作流，以及 `paco-video-production` 直接引用的 companion skills／plugins。

| Skill | 用途 |
|---|---|
| `paco-video-production` | 從創意方向、逐秒腳本和故事板，到 Animatic、多引擎製作及成片驗證 |
| `paco-interactive-educator` | 以 Puzzle → Explore → Name → Challenge 建立 Codex 原生探索式互動教材 |
| `edge-tts` | 旁白試音、語音輸出及字幕時間 |
| `seedance` | Seedance／即夢中文影片 prompt packet；由用戶手動生成影片 |
| `video-use` | 訪談、talking head、tutorial、多 take 原始片剪輯 |
| `manim-video` | 3Blue1Brown 風格的數學、物理與技術概念動畫 |

Repository 名稱是 `pacos-agent-skills`。Remotion 和 HyperFrames 保留為完整、有命名空間的 Codex plugin bundles，避免破壞 `$remotion:…` 及 `$hyperframes:…` 呼叫方式。來源與授權記錄在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 倉庫結構

```text
pacos-agent-skills/
├── README.md
├── install.sh
├── THIRD_PARTY_NOTICES.md
├── plugins/
│   ├── remotion/
│   └── hyperframes/
└── skills/
    ├── edge-tts/
    ├── seedance/
    ├── video-use/
    ├── manim-video/
    ├── paco-video-production/
    │   ├── SKILL.md
    │   ├── agents/openai.yaml
    │   ├── references/
    │   └── scripts/
    └── paco-interactive-educator/
        ├── SKILL.md
        ├── agents/openai.yaml
        ├── references/build-spec.md
        └── scripts/validate_lesson_fragment.py
```

這個結構可同時作為 Hermes skill tap，亦方便 Codex 與 Claude Code 從同一份原始檔安裝。

## 取得倉庫

這是私人 GitHub repository，可使用 GitHub CLI：

```bash
mkdir -p "$HOME/.local/share"
gh repo clone Pacoakm/pacos-agent-skills "$HOME/.local/share/pacos-agent-skills"
cd "$HOME/.local/share/pacos-agent-skills"
```

亦可使用已設定好的 SSH key：

```bash
git clone git@github.com:Pacoakm/pacos-agent-skills.git "$HOME/.local/share/pacos-agent-skills"
cd "$HOME/.local/share/pacos-agent-skills"
```

## 安裝

預設把六個可獨立安裝的 Skill 安裝到指定 agent：

```bash
./install.sh codex
./install.sh claude
./install.sh hermes
./install.sh all
```

只安裝其中一個：

```bash
./install.sh codex paco-interactive-educator
./install.sh codex paco-video-production
./install.sh codex edge-tts
./install.sh codex seedance
./install.sh codex video-use
./install.sh codex manim-video
```

預覽安裝動作而不改動檔案：

```bash
./install.sh all --dry-run
./install.sh codex paco-interactive-educator --dry-run
```

安裝器使用 symbolic link，讓多個 agent 共用倉庫內同一份 Skill。它不會覆寫既有檔案；若目的地已存在而且不是同一條連結，會保留原檔並回報衝突。

| Agent | 個人 Skill 位置 | 使用方式 |
|---|---|---|
| Codex | `${CODEX_HOME:-$HOME/.codex}/skills/<skill-name>` | `$paco-video-production`、`$manim-video`、`$edge-tts` 等 |
| Claude Code | `$HOME/.claude/skills/<skill-name>` | 輸入 Skill 名稱或直接描述任務 |
| Hermes Agent | `$HOME/.hermes/skills/<skill-name>` | 由 Hermes 自動發現，或從 skills 指令列選用 |

## Paco Video Production

影片 Skill 以四個關卡管理製作：

1. 鎖定創意、敘事、聲音及連貫系統。
2. 建立適應式素材網格及高清 3×3 review storyboard。
3. 以實際旁白和主時間線驗證 timed animatic。
4. 根據題材選用 Remotion、Manim、HyperFrames、video-use、Seedance 或受控混合流程，最後驗證成片。

核心 Skill 不綁定單一引擎。即使另一部裝置缺少影片工具，仍可完成前期規劃和故事板，並在最後一個已驗證成果停止。

| 工具 | 適合用途 | 必須安裝？ |
|---|---|---|
| Remotion plugin | 精準逐格、品牌模板、字幕、比例及語言變體 | Bundle 已保存在 `plugins/remotion/`；Remotion runtime 另行安裝 |
| HyperFrames plugin | HTML/CSS/GSAP 動效、動態字體、UI 及 shader 轉場 | Bundle 已保存在 `plugins/hyperframes/`；CLI 另行安裝 |
| `video-use` | 訪談、talking head、教學、多 take 原始片剪輯 | 已包含，可由 `install.sh` 安裝 |
| `seedance` | 生成式影片鏡頭的中文 prompt packet | 已包含；只寫 prompt，不會代替用戶提交生成 |
| `manim-video` + Manim | 3Blue1Brown 風格的數學、物理、科學與技術概念動畫 | Skill 已包含；Manim、LaTeX、FFmpeg runtime 另行安裝 |
| `edge-tts` | 粵語／多語旁白試音、音訊及字幕 | Skill 已包含；`uvx edge-tts` 使用網上服務 |

數學或物理題材不會因科目名稱而一律使用 Manim。以 slides、知識重溫、talking head、實驗錄影或軟件操作為主的影片仍會選用 Remotion 或 video-use；只有當程式化動畫能明顯改善概念理解時，才載入 `manim-video`。Manim 可製作完整的圖像主片，亦可輸出精確片段交由 Remotion／FFmpeg 加字幕、品牌、音樂及比例變體。這類可確定生成的教學畫面不使用 Seedance。

## Paco Interactive Educator

互動教學 Skill 由 `/aha [topic]`、`/3b1b [topic]`、`$paco-interactive-educator` 或明確的互動教材要求觸發。它會：

1. 分辨提示者與目標學生，不會把專業教師的程度誤當成學生程度。
2. 收集學生先備知識、現有心智模型、真實情境和視覺方向。
3. 先鎖定一個可以透過操作發現的 aha moment。
4. 建立固定四階段 Puzzle → Explore → Name → Challenge。
5. 預設使用 Codex 原生 inline visualization，並以隨附 script 驗證結構、互動、安全及 accessibility 基線。

它不會因普通「解釋某概念」而自動製作互動教材，也不以選擇題或 “Correct!” banner 代替可觀察的理解。

## Hermes 從 GitHub 安裝

私人 repository 需要先提供有權讀取的 `GITHUB_TOKEN`，或先 clone 再執行 `./install.sh hermes`。若日後設為公開，可直接指定其中一個 Skill：

```bash
hermes skills install Pacoakm/pacos-agent-skills/skills/paco-video-production
hermes skills install Pacoakm/pacos-agent-skills/skills/paco-interactive-educator
```

不要把 token 寫入 repository。

## 更新

因安裝器使用 symbolic link，只需更新這個 repository：

```bash
cd "$HOME/.local/share/pacos-agent-skills"
git pull --ff-only
```

更新後，各 agent 會共用最新版本。

## 安全、授權與致謝

- 不要 commit API key、GitHub token、語音服務憑證、客戶素材或未獲授權的字體／音樂。
- 從第三方來源安裝任何 Skill 前，先閱讀 `SKILL.md` 和 scripts。
- 此 repository 目前未附開源授權；除非另行加入 LICENSE，版權與再發佈權保留。
- Vendored companion skills／plugins 各自沿用其上游授權；詳見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 及各自目錄內的 LICENSE／plugin metadata。
- `paco-interactive-educator` 改編自 [Wamikmk/interactive-educator](https://github.com/Wamikmk/interactive-educator) 的互動教學方法；原作採用 CC BY 4.0，Paco 版本保留來源致謝並改寫為 Codex 原生工作流。
