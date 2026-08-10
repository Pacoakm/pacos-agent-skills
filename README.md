# Paco Agent Skills

一套可安裝到 Codex、Claude Code 與 Hermes Agent 的 Paco 個人工作流。目前包含兩個並列 Skill：

| Skill | 用途 |
|---|---|
| `paco-video-production` | 從創意方向、逐秒腳本和故事板，到 Animatic、多引擎製作及成片驗證 |
| `paco-interactive-educator` | 以 Puzzle → Explore → Name → Challenge 建立 Codex 原生探索式互動教材 |

Repository 名稱是 `pacos-agent-skills`，`skills/` 是兩個工作流的共同來源。

## 倉庫結構

```text
pacos-agent-skills/
├── README.md
├── install.sh
└── skills/
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

預設把兩個 Skill 安裝到指定 agent：

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
```

預覽安裝動作而不改動檔案：

```bash
./install.sh all --dry-run
./install.sh codex paco-interactive-educator --dry-run
```

安裝器使用 symbolic link，讓多個 agent 共用倉庫內同一份 Skill。它不會覆寫既有檔案；若目的地已存在而且不是同一條連結，會保留原檔並回報衝突。

| Agent | 個人 Skill 位置 | 使用方式 |
|---|---|---|
| Codex | `${CODEX_HOME:-$HOME/.codex}/skills/<skill-name>` | `$paco-video-production` 或 `$paco-interactive-educator` |
| Claude Code | `$HOME/.claude/skills/<skill-name>` | 輸入 Skill 名稱或直接描述任務 |
| Hermes Agent | `$HOME/.hermes/skills/<skill-name>` | 由 Hermes 自動發現，或從 skills 指令列選用 |

## Paco Video Production

影片 Skill 以兩個審批階段管理製作：

1. 鎖定創意方向，完成逐秒 shot plan、素材清單和高清 3×3 review storyboard。
2. 故事板獲批後，根據裝置實際可用能力，選用 Remotion、HyperFrames、video-use、Seedance、Manim 或受控混合流程，最後驗證成片。

核心 Skill 不綁定單一引擎。即使另一部裝置缺少影片工具，仍可完成前期規劃和故事板，並在最後一個已驗證成果停止。

| 工具 | 適合用途 | 必須安裝？ |
|---|---|---|
| Remotion | 精準逐格、品牌模板、字幕、比例及語言變體 | 否；第二階段需要時才安裝 |
| HyperFrames | HTML/CSS/GSAP 動效、動態字體、UI 及 shader 轉場 | 否 |
| video-use | 訪談、talking head、教學、多 take 原始片剪輯 | 否 |
| Seedance prompt skill | 生成式影片鏡頭的中文 prompt packet | 否 |
| Manim | 數學、物理與技術動畫 | 否 |

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
- `paco-interactive-educator` 改編自 [Wamikmk/interactive-educator](https://github.com/Wamikmk/interactive-educator) 的互動教學方法；原作採用 CC BY 4.0，Paco 版本保留來源致謝並改寫為 Codex 原生工作流。
