# SmartQuest 教學影片製作 SOP（中文版）

做一課影片的操作次序，寫畀執行的人睇：真人，或者行呢個 skill 的 agent。

`SKILL.md` 講一課 SmartQuest 影片**係乜嘢**，並且收着所有 hard rules；`references/` 收着手藝。
**呢一份講做乜、次序點、喺邊度要停低。** 呢份同 `SOP.md`（英文版）內容相同，**Gate 4 以
Palmier Pro 為預設路線**，講得更詳細。任何時候呢份同 `SKILL.md` 有衝突，以 `SKILL.md` 為準。

開工前讀一次：`SKILL.md`、`references/production-contract.md`、`references/local-toolchain.md`。
其餘的等 run sheet 叫你先至讀。

## 0. 邊啲決定屬於用家

呢條 pipeline 最常見的失敗，係執行者自己決定咗一啲唔屬於佢決定的嘢。以下五樣永遠屬於用家：

| 屬於用家 | 唔可以代佢做 |
|---|---|
| **Gate 1、2、3 的批核** | 冇任何講法可以取消呢三個停頓。沉默唔等於批准 |
| **佢親手揀的 3D camera pose** | 揀咗的數值原封不動入 render。`check_poses.py` 可以**報告**某個 pose 破壞咗幾何保證、差幾多；`snap_poses.py` 只喺佢開口叫嗰次先至跑 |
| **開 master render** | 成本以鐘頭計。只可以喺明確指示之下，而且只可以由佢批核過的 draft 出發 |
| **Palmier 路線的 export** | 你砌 timeline，佢自己 encode。喺佢 export 之前，狀態一律係 `awaiting-user-export` |
| **旁白** | 真人錄。冇合成聲音的後備方案 — 見 `references/sound-and-voice.md` |

其餘全部 — 教學設計、程式、檢查、報告 — 係你的責任，要做足，唔好攞去問。

## 1. 每部機做一次

### 1.1 Render 環境 preflight

```bash
export SKILL=~/.claude/skills/smartquest-video-production   # 全份 SOP 都會用到
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
python3 -c "import manim; print(manim.__version__)"         # 應該係 0.20.1
which latex dvisvgm ffmpeg
```

再跑 `references/local-toolchain.md` 入面的字體同 filter 檢查。**字體唔見咗係唔會報錯的 —
Pango 會靜靜替換。** 唔好因為上一課 render 得好順就跳過：變咗的係部機，唔係嗰一課。

### 1.2 Mac 用戶：裝 Palmier Pro，Gate 4 行 Palmier 路線

**Gate 4 的預設路線係 Palmier Pro，唔係 ffmpeg。** 理由喺下面 Gate 4 講。要用得到，部 Mac 要
有隻 app：

1. **下載 macOS app** — 由 Palmier 官方發佈渠道攞：`https://palmier.io/docs`，安裝檔喺
   `palmier-io/palmier-pro` 的 GitHub releases。（呢兩個位置係喺已安裝的 app 入面讀出嚟的：
   佢的 Sparkle 更新來源就係嗰個 repo 的 `appcast.xml`。）裝好之後係 `/Applications/PalmierPro.app`。
   本文件對照的版本係 **0.8.1**，bundle id `io.palmier.pro`。
2. **開住隻 app。** MCP server 係 **app 自己 host** 的，行喺 `http://127.0.0.1:19789/mcp`。
   App 冇開 = 個 port 冇人聽 = 條路線用唔到。呢點好易中伏：唔係另外有個 server 要你去啟動，
   而係隻 app 本身。
3. **喺 Claude Code 登記個 server**（`~/.claude.json` 的 `mcpServers`）：

   ```json
   "palmier-pro": { "type": "http", "url": "http://127.0.0.1:19789/mcp" }
   ```

4. **驗證通唔通**，唔好靠估：

   ```bash
   lsof -nP -iTCP:19789 -sTCP:LISTEN        # 應該見到 PalmierPro 喺 LISTEN
   ```

   再喺 session 入面叫 `manage_project` 的 `action: "list"`。有答 = 條路線開得。

**如果 MCP server 唔通：唔好叫用家去開，亦唔好等。** 直接行 `SKILL.md` Gate 4 的 ffmpeg 路線，
然後講清楚你行咗邊條。一個開唔到的剪片軟件，唔係一段已經 render 好的畫面停低的理由。

## 2. 每課做一次 — Gate 0，開檔

```bash
P=videos/<subject>/<nn>-<topic>
mkdir -p $P
python3 $SKILL/tools/install.py $P
python3 $P/tools/serve.py 8777 <videos/ 上一層>
```

由**同科最近一課**抄過嚟，唔好由 template 開始：`src/theme_boot.py`、`src/kit.py`、
`make_plan.py`、`check_plan.py`、`make_script.py`。`kit.py` 入面的 layout helpers **原封不動**
carry 過去 — 見 `references/project-scaffold.md`。跟住開 dashboard，成個 build 都唔好閂，
之後每一個 gate 都係喺度俾用家睇。

3D pose 那套工具係 **project 自己擁有、skill 唔會派**的：`install.py` 特登唔碰佢哋，
免得覆蓋咗一課親手揀的 pose。做立體幾何課的話，由最近一課 3D
（`videos/dse-math/13-vector-product/tools/`）抄 `check_poses.py`、`pose_guarantees.py`、
`snap_poses.py`，連埋嗰課的 `camera-poses.json` 做格式參考 — 然後清空 pose，重新揀返呢一課的。

## 3. Run sheet

### Gate 1 — 教學設計、講稿、字幕

1. 先寫 `brief.md`：教學目標、學生的 misconception、個 aha 位、DSE reasons（用 marker 的原文
   措辭）、顏色分配、fact check。喺 code 入面設計的一課，係一課冇得攞出嚟拗的課。
2. 寫 `make_plan.py` — **只 author shot 同 cue 的長度**；所有 timecode 由佢推導。
3. `python3 make_plan.py && python3 check_plan.py` — 改到乾淨為止。
4. `python3 make_script.py` → `講稿.md`。
5. `python3 $SKILL/scripts/build_captions.py --plan video-plan.json --out-dir src`

**Exit criteria：** `check_plan.py` 全綠 · 每句 cue ≤ 4.0 字/秒 · 每個 shot ≥ 25% still ·
shot 1 係 3–4 秒 title card · 畫面 100% 英文 · 每條 example 都帶住條題目。

**然後停低。** 把 plan status 設做 `plan-awaiting-approval`，喺 dashboard 展示 `講稿.md` 同
shot timeline，講明你想佢檢查乜，然後結束呢一 turn。

### Gate 2 — Storyboard

1. 每個 shot 由**真正的 scene** render 一張 Manim 靜態圖。唔准手砌 panel。
2. 砌 sheets。如果經 headless Chrome 光柵化，檢查 `sheetHeight` 令每格的圖片區啱啱好 16:9 —
   數值錯就會靜靜切走每格的頂部。
3. 逐格檢查：每個角弧的兩條臂都係畫面上見到的 mobject；冇 label 壓喺線上；question band
   喺上限之內；section tag 存在而且喺同一節內冇變；每個 scene 的結束狀態等於下一個 scene 的
   開始狀態。

**然後停低。** Status `storyboard-awaiting-approval`，展示 sheets。

### Gate 3 — 無聲 draft

```bash
python3 tools/render.py draft            # 854x480 @15 -> out/draft.mp4
ffprobe -select_streams s -show_streams out/draft.mp4    # soft 字幕軌一定要喺度
python3 tools/check_joins.py
```

喺呢度只判斷節奏同動態，唔判斷解像度。Draft 的 frame-rate 進位會顯示一個喺 60 fps 根本唔存在
的 0.03 秒誤差 — `references/manim-traps.md` #21。

**然後停低。** Status `draft-awaiting-approval`；send `out/draft.mp4`，同時講明字幕軌可能要
自己撳開。

**收到意見之後：** 先改 `video-plan.json`（經 `make_plan.py`），重跑 `check_plan.py`，
**只 re-render 受影響的 scene**（`--scenes S07,S09`），重新 stitch，再俾佢睇。一路 loop 到佢
批核為止。永遠唔好用文字描述「改完會係點」嚟代替真係 render 一次。

### Gate 4 — Picture master（Palmier Pro 路線）

要有明確指示先開始。開始前講清楚你行緊邊條路線 — 兩條路線交出嚟的嘢唔同：一條交
`out/picture-subbed.mp4`，另一條交一個仲可以改的 project。

**點解預設行 Palmier：** ffmpeg 路線出一個扁平檔案，之後任何一個改動 — 重 render 一個 shot、
一句 cue 打錯字、字幕換色 — 都要成條片重新 encode。喺 Palmier 度，每個 scene 係獨立 clip，
重 render 一個 shot 就係一次 `swap_clip_media`，改字幕就係 `update_text`，喺用家 export 之前
乜都唔使重新 encode。老師自己想收短一個 hold、郁一句 cue，都唔使掂 Manim。

代價：**成品唔再由我哋出。Export 係用家親手做的一步**，我哋砌好 timeline 就停。

**步驟**（完整版連數值出處見 `references/palmier-assembly.md`）：

1. **照舊 render scenes** — 同樣 1080p60、同樣 layout tokens。**唔好** concat，**唔好**
   把 `captions.py` render 做 `.mov`：Palmier 直接由 `.srt` 即時畫字幕。
2. **先開 project，先set 60 fps**：
   `manage_project action:"create" fps:60 aspectRatio:"16:9" quality:"1080p"`。
   **fps 一定要喺放任何 clip 之前設定。** 留喺預設 30 fps 的 project 會照收 60p 的 scene，
   然後 export 時掉走一半 frame — 每個鏡頭移動同每個 `Write` 少咗一半動態，而 UI 唔會出聲。
3. **逐個檔 import**：`import_media source:{path:"…/1080p60/S01Hook.mp4"} folder:"Scenes"`。
   **千祈唔好 import 成個 `1080p60` 目錄** — 目錄 import 係遞歸的，Manim 留低的
   `partial_movie_files/` 有幾百個碎片，會即刻淹沒真正有用的二十幾個檔。
4. **clip 一個接一個排喺同一條 track**。長度**由檔案的 frame 數攞，唔好由時間長度攞**：
   `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 <scene>.mp4`。
   Manim 的 scene 長度唔係整數秒，2099 frames 係 34.983 秒，`round(34.983 × 60)` 啱只係好彩。
   累加 `nb_frames` 得出每個起始 frame，成批一次過 `add_clips`，等佢係一個 undo step。
   之後用 `get_timeline` 核對：條 track 唔可以有 `gaps`，`totalFrames` 要等於各 scene frame 之和。
5. **把雙語 `.srt` 拆做兩個檔**（`out/subtitles-zh.srt`、`out/subtitles-en.srt`）。一個 Palmier
   caption clip 成個 clip 只有一個 `fontSize`，所以一條軌做唔到英文係中文的 0.78×，兩條軌先做到。
   每個 cue 的最後一行係英文，上面全部係中文；timecode 原樣照抄，兩條軌就會逐句對齊。
6. **放好兩條 caption track 再落 style**。`add_captions` 用咗 `subtitleMediaRef` 就唔可以帶
   其他參數，所以 styling 一定係第二次 `update_text`；兩條都加完先落 style，而且**用
   `captionGroupId` 而唔係 track index**（index 會郁）。1080p 16:9 的數值：

   | | 中文 | English |
   |---|---|---|
   | Font | `PingFangHK-Semibold` | `PingFangHK-Semibold` |
   | `fontSize` | 48 | 38 |
   | `transform.y` | 0.8633 | 0.9245 |
   | 顏色（light theme） | `#2A241E` | `#2A241E` |
   | 顏色（dark theme） | `#F2F5FC` | `#F2F5FC` |

   呢啲數字唔係揀出嚟的，係由 `scripts/smartquest_theme.py` 計出嚟，令 Palmier 的字幕同 Manim
   render 的字幕一致。**唔係 1080p 16:9 的話要重新計**，唔好照抄（9:16 未驗證過）。
   把三條軌改名：`Scenes`、`Chinese`、`English`。
7. **喺合成畫面上驗證，唔好信 tool 的回覆。** `add_captions` 話 97 個 clip，只代表 97 個 clip
   存在，**唔代表睇得到**：Palmier 預設字幕係白色，SmartQuest light theme 個底係 `#FBFBFD`,
   白對近白 = clip list 有、metadata 有、畫面上完全隱形。用 `inspect_timeline` 至少睇三處：
   早段一句 cue（顏色同位置）、**中英文各自最長嗰句**（爆寬同撞圖）、最尾一句（收尾）。
8. **交收 — export 唔係我哋做。** 先把路線寫入 `video-plan.json`：`assembly.route: "palmier"`、
   `assembly.project` = `.palmier` 路徑、`captions.burnedIn: false`、`captions.track: null`、
   `status: "awaiting-user-export"`。然後一次過話俾用家知：project 路徑、scene clip 係
   **引用**住 render 輸出（檔案唔可以搬）、軌道編排（V1 `Scenes`、V2 `Chinese`、V3 `English`）、
   總長同總 frame 數、你實際檢查過邊幾個 frame、以及個 project 仲喺 session 開住、要喺 app 入面
   儲存。然後停低。

**唔准自己加 transition。** Palmier 冇 transition 原始功能 — cross dissolve 係靠 clip 重疊砌出嚟，
一重疊，join 之後每個 clip 都會前移，而老師要對住錄音的 `.srt` 就會失步。用家要 transition 的話，
把兩個答案的代價擺出嚟俾佢揀：cross dissolve（真重疊，下游全部要重新計時），定係 fade through
background（`fadeOutFrames` / `fadeInFrames`，冇嘢郁，但畫面會經過底色）。

**改動點做：** 重 render 一個 shot → 對嗰個 clip `swap_clip_media`（其他 clip 唔郁）；改一句 cue
→ 改 `video-plan.json`、重跑 `build_captions.py`、重新拆檔、換返嗰個 caption group；字幕顏色或
大細 → `update_text`。唯一會連鎖的情況係**重 render 之後 frame 數變咗** — swap 之前先對
`nb_frames`，唔同的話由嗰個 clip 之後全部重新推算起始 frame，唔好用手推。

### Gate 5 — 旁白、mux、交付

1. 生成 `narration-sheet.md`，連 guide track 一齊交俾老師。老師**讀中文那一行，學科名詞照講英文**。
2. `audio/narration.wav` 返到嚟先 mux。之前唔准，亦唔准喺檔案未存在時講「已加旁白」。
3. 音效係可選、要人開口要、落喺已砌好的 timeline 上，**唔准 bake 入 scene** —
   `references/sound-and-voice.md`。
4. 最後 gate。Palmier 路線要驗**用家 export 出嚟嗰個檔**，唔係 timeline：

```bash
python3 $SKILL/scripts/verify_master.py \
  --plan video-plan.json --master <用家 export 的檔> --require-audio
```

   手動 export 正正係最容易出事的一步（揀錯 preset、30 fps、多咗黑邊、少咗字幕軌）。
5. 寫 `RENDER-REPORT.md`：交付檔案清單、邊個檔係「要睇嗰個」、量到的數字、幾何點樣獨立核對過、
   有咩 bug 搵到同點修。
6. 把 master 抄去交付資料夾，用**課題名**命名，唔用 project 編號。

## 4. 報告 — 講錯一次代價最大嗰條

**用工具自己的 threshold 嚟量，並且把個數字寫出嚟。**

有一課，continuity 檢查被報成「17 個 cut 全部連續」，用的是執行者自己揀的 luma threshold 3.0。
`verify_master.py` 用的是 **0.5**，嚴六倍。實際上有 10 個 cut 掉緊內容，一路去到最後一個 gate
先浮出嚟 —— 當時 1080p60 master、字幕軌同合成全部已經砌好。

所以每一次：

- 報一項檢查之前，grep 個 verifier 攞佢用的常數，引用**佢嗰個**數字。
- 冇 verifier 的話，講明你揀咗咩 threshold、而且係你揀的。
- 報你真係跑過的嘢。冇數字的「已驗證」唔算報告。
- 有嘢未檢查過，就講明未檢查。

## 5. 停手條件

以下情況，停喺最後一個已驗證的產出，並且講清楚欠咩：

- 欠一個決定、素材，或者一項課程事實 — 永遠唔准自己作 DSE reason 或者公式；
- plugin 的輸出無法對住課程驗證（`manim-chemistry` 會把 `Ca(OH)₂` render 成 **CaO**，唔報錯）；
- ManimCE 真係做唔到某個 shot — 講明邊個 shot、點解，等佢答應先掂 ManimGL；
- 一項檢查唔過，而修正會改動用家已經批核咗的嘢。

## 6. 交接 checklist

以下全部成立，先至可以把一課交俾第二個人：

- [ ] `brief.md` 記低咗顏色分配同 camera 決定，唔止教學內容
- [ ] `video-plan.json` 係 `make_plan.py` 生成的，而且 `check_plan.py` 全綠
- [ ] `講稿.md` 可以由 plan 重新生成，唔使手改
- [ ] `src/kit.py` 記低咗 pens，而且 question band 係由 plan 砌出嚟
- [ ] 每個 scene 的結束狀態等於下一個 scene 的開始狀態
- [ ] Palmier 路線：`video-plan.json` 寫咗 `assembly.route: "palmier"`，而且狀態反映用家有冇 export
- [ ] `RENDER-REPORT.md` 存在，入面有量度到的數字
- [ ] 新學到的 trap 寫入咗 `references/manim-traps.md`，唔止寫喺報告 —— 下一課係由一個唔會讀你
      份報告的人做的
