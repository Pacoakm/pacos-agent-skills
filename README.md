# Paco 影片製作 Skill

一套可安裝到 Codex、Claude Code 與 Hermes Agent 的個人影片製作工作流。它把製作拆成兩個有審批閘門的階段：

1. 先完成創意方向、素材清單、逐秒腳本、鏡頭語言與高清 3×3 九宮格故事板。
2. 故事板獲批後，再按裝置上實際可用的引擎，交由 Remotion、HyperFrames、video-use、Seedance 或混合流程剪輯及驗證輸出。

核心 Skill 不綁定任何單一影片引擎。即使另一部裝置未安裝 Remotion 或 HyperFrames，第一階段仍可產生 `video-plan.json`、SVG/PNG 素材規格與 4K SVG 故事板。

## 倉庫結構

```text
paco-video-production-skill/
├── README.md
├── install.sh
└── skills/
    └── paco-video-production/
        ├── SKILL.md
        ├── agents/openai.yaml
        ├── references/
        └── scripts/
```

這個結構可同時作為 Hermes skill tap，亦方便 Codex 與 Claude Code 從同一份原始檔安裝。

## 取得倉庫

私人 GitHub 倉庫可使用 GitHub CLI：

```bash
mkdir -p "$HOME/.local/share"
gh repo clone Pacoakm/paco-video-production-skill "$HOME/.local/share/paco-video-production-skill"
cd "$HOME/.local/share/paco-video-production-skill"
```

亦可使用已設定好的 SSH key：

```bash
git clone git@github.com:Pacoakm/paco-video-production-skill.git "$HOME/.local/share/paco-video-production-skill"
cd "$HOME/.local/share/paco-video-production-skill"
```

## 一鍵安裝

安裝到單一 agent：

```bash
./install.sh codex
./install.sh claude
./install.sh hermes
```

或同時安裝到三者：

```bash
./install.sh all
```

安裝器使用 symbolic link，讓三個 agent 共用倉庫內同一份 Skill。它不會覆寫既有檔案；若目的地已存在而且不是同一條連結，會停止並提示你先檢查。

安裝位置：

| Agent | 個人 Skill 位置 | 使用方式 |
|---|---|---|
| Codex | `${CODEX_HOME:-$HOME/.codex}/skills/paco-video-production` | 在要求中使用 `$paco-video-production` |
| Claude Code | `$HOME/.claude/skills/paco-video-production` | 輸入 `/paco-video-production`，或直接描述影片任務 |
| Hermes Agent | `$HOME/.hermes/skills/paco-video-production` | 由 Hermes 自動發現，或從 skills 指令列選用 |

只想預覽安裝動作而不改動檔案：

```bash
./install.sh all --dry-run
```

## Hermes 直接從 GitHub 安裝

倉庫若設為公開，可直接安裝指定 Skill：

```bash
hermes skills install Pacoakm/paco-video-production-skill/skills/paco-video-production
```

也可以把整個倉庫加入 tap：

```bash
hermes skills tap add Pacoakm/paco-video-production-skill
hermes skills install Pacoakm/paco-video-production-skill/paco-video-production
```

私人倉庫需要先提供有權讀取該倉庫的 `GITHUB_TOKEN`，或先 clone 再執行 `./install.sh hermes`。不要把 token 寫入此倉庫。

## 選配影片引擎

核心 Skill 會先檢查當前裝置真正可用的工具，再選擇製作路線：

| 工具 | 適合用途 | 必須安裝？ |
|---|---|---|
| Remotion | 精準逐格、品牌模板、字幕、比例及語言變體 | 否；第二階段需要時才安裝 |
| HyperFrames | HTML/CSS/GSAP 動效、動態字體、UI 及 shader 轉場 | 否 |
| video-use | 訪談、talking head、教學、多 take 原始片剪輯 | 否 |
| Seedance prompt skill | 生成式影片鏡頭的中文 prompt packet | 否 |
| Manim | 數學、物理與技術動畫 | 否 |

若所選引擎不存在，Skill 應停在最後一個已驗證的製作成果，清楚列出所欠的安裝或權限，而不會假稱已完成剪輯或渲染。

## 更新

因安裝器使用 symbolic link，只需更新這個倉庫：

```bash
cd "$HOME/.local/share/paco-video-production-skill"
git pull --ff-only
```

更新後 Codex、Claude Code 與 Hermes 會共用最新版本。

## 安全及授權

- 不要 commit API key、GitHub token、語音服務憑證、客戶素材或未獲授權的字體／音樂。
- 從第三方來源安裝任何 Skill 前，先閱讀 `SKILL.md` 和 scripts。
- 此倉庫目前未附開源授權；除非另行加入 LICENSE，版權與再發佈權保留。
