# 學術影片 — 標準作業程序（中文版）

由 Paco 的講義製作一部概念影片的操作次序，寫給執行的人：Paco 本人，或執行本 skill 的 agent。
`SKILL.md` 說明一部學術影片**是甚麼**，並收錄所有 hard rules；`references/` 收錄製作手藝。
**本文件說明做甚麼、依甚麼次序、在哪裏停下。** 本文件與 `SOP.md`（英文版）內容相同。本文件與
`SKILL.md` 有衝突時，一律以 `SKILL.md` 為準。

製作第一部影片前讀一次：`SKILL.md`、`references/production-contract.md`、
`references/local-toolchain.md`、`references/palmier-assembly.md`。其餘文件待 run sheet 指示時
才讀。

## 0. 哪些決定屬於 Paco

這條 pipeline 最常見的失敗，是執行者自行決定了一件並非由他決定的事。以下各項永遠屬於 Paco：

| 屬於 Paco | 不可代他決定 |
|---|---|
| **動畫化哪些概念** | 他未指明時，先讀講義，**建議**二至五個概念，每個附一行理由 — 然後由他揀選。不可預設把整課講義做成動畫 |
| **Gate 1、2、3 的批核** | 任何措辭的請求都不能取消這三個停頓。沉默、只回應部分內容，或你自己的信心，都不等於批准 |
| **他親手揀選的 3D camera pose** | 揀選的數值原封不動使用。`check_poses.py` 可以**報告**某個 pose 破壞了哪項幾何保證、相差多少；`snap_poses.py` 只在他明確要求的那一次才執行 |
| **開始 master render** | 這一步耗費真實時間。只可在明確指示下進行，而且只可由已批核的 draft 出發 |
| **Export** | 在 Palmier Pro 內進行，而且只憑他一句話 — 他說「export」／「出片」時才呼叫 `export_project`，或由他在 app 內親手 export。批核 timeline 不等於指示 export。在 export 出來的檔案通過 `verify_master.py` 之前，狀態一律是 `awaiting-export` |
| **人聲或音樂軌** | 預設沒有 — 由雙語字幕承載講解。只有他在該部影片明確要求時才加 — 見 `references/sound-and-voice.md` |

其餘一切 — 閱讀講義、設計、程式、檢查、報告 — 都是你的責任，應當完整做好，不要拿去問。只問
欠缺的資料（SKILL.md「Ask only what is missing」）：講義及頁數範圍、哪些概念、深色或淺色底
（建議深色），以及只在講義以證明為主時才問深度。永遠不要問目標長度，也不要問考試範圍。

## 1. 每部機器做一次

### 1.1 Render 環境 preflight

```bash
export SKILL=~/.claude/skills/academic-video-production   # 設定一次，全份 SOP 通用
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
python3 -c "import manim; print(manim.__version__)"       # 應為 0.20.1
which latex dvisvgm ffmpeg pdftotext pdftoppm
```

然後執行 `references/local-toolchain.md` 內的字體及 filter 檢查，包括兩款字幕字體。**字體缺失
不會報錯 — Pango 會靜默替換。** 不要因為上一部影片 render 得順利就略過：改變了的是機器，不是
影片。

### 1.2 安裝 Palmier Pro — 這是必須的

每一部影片都在 Palmier 內組裝及 export；本 skill **沒有** ffmpeg master 路線。

1. **下載 macOS app** — 由 Palmier 官方發佈渠道取得：`https://palmier.io/docs`，安裝檔發佈在
   `palmier-io/palmier-pro` 的 GitHub releases（app 本身的 Sparkle 更新來源亦指向該 repo 的
   `appcast.xml`）。安裝後位於 `/Applications/PalmierPro.app`。本文件對照的版本為 **0.8.1**，
   bundle id `io.palmier.pro`。
2. **讓 app 保持開啟。** MCP server 由 **app 本身 host**，運行於 `http://127.0.0.1:19789/mcp`。
   App 關閉即等於 port 無人監聽，server 失效。這一點容易出錯：並沒有另一個 server 需要啟動，
   server 就是 app 本身。
3. **在 Claude Code 登記 server**（`~/.claude.json` 的 `mcpServers`）：

   ```json
   "palmier-pro": { "type": "http", "url": "http://127.0.0.1:19789/mcp" }
   ```

4. **驗證是否連通**，不要憑推測：

   ```bash
   lsof -nP -iTCP:19789 -sTCP:LISTEN        # 應見到 PalmierPro 處於 LISTEN
   ```

   再在 session 內呼叫 `manage_project`，`action: "list"`。有回應即代表可用。

**MCP server 沒有回應時，本 skill 沒有後備路線。** 到了 Gate 4 仍無回應，就停下並請 Paco 開啟
Palmier Pro（見第 3 節 Gate 4 及第 5 節）。

## 2. 每部影片做一次 — Gate 0，開檔

```bash
P=~/academic-videos/<COURSE>/<nn>-<slug>     # 除非 Paco 指定其他位置
mkdir -p $P
python3 $SKILL/tools/install.py $P
python3 $P/tools/serve.py 8777 <project 的上一層目錄>
```

把 `install.py` 印出的 dashboard URL 交給 Paco，並在整個製作過程中保持 dashboard 開啟；每一個
gate 都在 dashboard 上展示。

由**同一科目最近的一部影片**複製，不要由 template 開始：`src/theme_boot.py`、`src/kit.py`、
`make_plan.py`、`check_plan.py`、`make_script.py`。`kit.py` 內的 layout helpers **原封不動**沿用，
該科目的顏色分配亦然 — 見 `references/project-scaffold.md`。若是某科目的第一部影片，則由任何
科目最近的一部影片開始，沿用 helpers，但為新科目重新建立顏色分配。

3D pose 工具**屬於 project 本身，並非由 skill 派發** — `install.py` 刻意不碰它們，以免覆蓋某部
影片親手揀選的 pose。遇到 3D 圖形時，由最近一部 3D 影片複製 `check_poses.py`、
`pose_guarantees.py` 及 `snap_poses.py`（第一次則由 SmartQuest repo 的 vector-product project
複製：`~/smartquest/videos/*/13-vector-product/tools/`），連同其 `camera-poses.json` 作格式參考
— 然後清空 pose，重新揀選本片的 pose。

## 3. Run sheet

`video-plan.json` 內的狀態依次為：`plan-awaiting-approval` → `storyboard-awaiting-approval`
→ `draft-awaiting-approval` → `awaiting-export` → `delivered`。狀態不可超越磁碟上實際存在的
產出，亦不可超越 Paco 已批核的階段。

### Gate 1 — 閱讀講義、設計概念、撰寫字幕

1. **先讀講義，然後才做其他事** — 讀完整個相關範圍的每一頁，包括看似無關重要的頁面。PDF：用
   `pdftotext -layout` 取文字，用 `pdftoppm -png` 取頁面圖像，讓圖表是「看見」而不是「猜出」。
   PPTX：抽取文字並把投影片轉成圖像（先匯出為 PDF，再用同樣兩個指令）。掃描版 PDF：閱讀頁面
   圖像。
2. 撰寫 **`notes-map.md`**：依講義次序列出各概念及其頁碼；每個符號及其慣例；定義及定理陳述
   原文照錄，連同其假設；投影片略過了甚麼；任何看似有錯之處 — 標記出來，既不靜默修正，亦不
   靜默照抄。
3. 撰寫 **`brief.md`**，按每個知識點：Paco 看完之後應能**看見**甚麼、先備知識、錯誤或空洞的
   理解、aha（必須是論證，而非插圖）、以動態描述的核心動畫、按角色分類的例子（**先具體**，再按
   需要加入 varied／broken／connected）、原文照錄的正式陳述及其落點 shot、依講義命名的理據、
   section tag、開場、已知限制，以及該科系列的顏色分配。記錄每條公式、每個數值及每個計算結果
   的獨立核對 — 對照講義，並親自計算一次。在 code 內設計的影片，是無從爭辯的影片。
   `references/lesson-patterns.md` 適用，但不包括其 exam-ladder patterns。
4. 撰寫 `make_plan.py` — **只 author shot 及 cue 的長度**；所有 timecode 均由它推導。總長度是
   產出，永遠不是目標。
5. `python3 make_plan.py && python3 check_plan.py` — 修改至完全通過為止。
6. `python3 make_script.py` → `captions.md`。
7. `python3 $SKILL/scripts/build_captions.py --plan video-plan.json --out-dir src`

**Exit criteria：** `notes-map.md` 涵蓋整個頁數範圍 · `check_plan.py` 通過 · 每句 cue ≤ 4.0
字/秒 · 每個 shot ≥ 25% still · shot 1 是 3–4 秒的 title card，寫着 `COURSE · Lecture N` ·
畫面 100% 英文，並使用講義本身的記號 · 每個知識點都由具體例子開始，永不由定義開始 · 每個屬於
既定題目的例子都帶着題目陳述 · 沒有 exam ladder，沒有 solution page · 每條公式均已核對，並把
核對記錄於 `brief.md`。

**然後停下。** 把 plan status 設為 `plan-awaiting-approval`。在回覆本身展示：概念地圖、完整的
逐 shot 字幕稿表（連字數及兩項 pacing 判定）、每個 shot 的畫面文字、採用的記號及講義中標記的問題、
連總長度的 timeline，以及未決問題；指出 `notes-map.md`、`brief.md` 及 `video-plan.json` 的位置，
在 dashboard 展示 `captions.md` 及 shot timeline，說明你希望他檢查甚麼，然後結束這一 turn。

### Gate 2 — Storyboard

1. 每個 shot 由**真正的 scene** render 一張 Manim 靜態圖
   （`manim -ql -s --format=png -o S01.png src/script.py S01Title`）。不准手工砌 panel。
2. 建立 sheets 並重建 dashboard（`python3 tools/build_dashboard.py`）。若 sheets 經 headless
   Chrome 光柵化，須檢查 `sheetHeight` 使每格圖片區恰為 16:9 — 數值錯誤會靜默裁走每格的頂部。
3. 逐格檢查：每個角弧的兩條臂都是可見的 mobject；沒有 label 壓在線上；question band 在上限
   之內；section tag 存在，且在同一節內不變；`math` panel 上沒有句子，`verbal` panel 上沒有
   displayed equation；每個字串都是英文並使用講義的記號；每個 scene 的結束狀態等於下一個 scene
   的開始狀態。
4. 對於整個重點在於動態的 shot — varied 例子、逐步收窄的極限 — 在 panel 的備註寫明甚麼在動、
   甚麼保持不變。靜態圖只能證明構圖，永遠不能證明動態。

**然後停下。** Status 設為 `storyboard-awaiting-approval`；展示 sheets，並說明 shot 數目、總長度、
哪些 panel 承載 aha，以及任何你沒有把握的構圖。

### Gate 3 — 無聲 draft

```bash
python3 tools/render.py draft            # 854x480 @15 -> out/draft.mp4
ffprobe -select_streams s -show_streams out/draft.mp4    # soft 字幕軌必須存在
python3 tools/check_joins.py
```

此處只判斷節奏及動態，不判斷解像度。Draft 的 frame-rate 進位會顯示一個在 60 fps 並不存在的
0.03 秒誤差 — `references/manim-traps.md` #21。先自己對照 `references/pacing.md` 看一遍：沒有
人聲時，每句字幕都必須能在同時觀看畫面的情況下讀完，每次 reveal 都需要 still beat，varied 例子
的變化必須夠慢，讓人看得出甚麼保持不變。已知有錯的地方，先修正才展示。

**然後停下。** Status 設為 `draft-awaiting-approval`；傳送 `out/draft.mp4`，說明字幕是 soft
track，可能需要手動開啟（`out/subtitles.srt` 在旁），854×480 @15 fps 代表只審閱動態及節奏，並
列出各個 aha 的 timecode。

**收到意見之後：** 先修改 `video-plan.json`（經 `make_plan.py`），重新執行 `check_plan.py`，
**只 re-render 受影響的 scene**（`--scenes S07,S09`），重新 stitch，再展示。反覆進行直至他批核。
永遠不要以文字描述「修改後會怎樣」來代替實際 render。

### Gate 4 — Picture master，在 Palmier Pro 內組裝

只在明確指示下開始，而且只由已批核的 draft 出發。

1. **確認 Palmier Pro 有回應** — `manage_project action:"list"`。**沒有回應就停下，請 Paco 開啟
   Palmier Pro。** 沒有 ffmpeg 後備路線：export 必須由 Palmier 輸出。等候期間可以 render
   scenes；不可以在其他地方組裝。（`tools/render.py master` 是繼承下來的 concat-and-burn 路線，
   本 skill 不使用。）
2. **Render scenes：**

   ```bash
   export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"   # 若使用 TinyTeX
   manim -r 1920,1080 --fps 60 src/script.py <every scene>
   ```

   在 M 系列 Mac 上 1080p60 約為每秒 39 frames。**Render 進行期間不可修改 `src/`** — Manim 在
   開始時已 import 各 module，之後的改動會靜默地不出現在輸出中。不要 concat，也不要 render
   `captions.py`：Palmier 直接由 `.srt` 即時繪製字幕。影片若有 3D 圖形，先執行
   `references/3d-geometry.md` 的額外 gates。
3. **組裝**，依照 `references/palmier-assembly.md`：
   - 在放置任何 clip 之前，先以 **60 fps**、16:9、1080p 建立 project：
     `manage_project action:"create" fps:60 aspectRatio:"16:9" quality:"1080p"`。
     **fps 必須在放置任何 clip 之前設定。** 維持預設 30 fps 的 project 會照樣接收 60p 的
     scene，然後在 export 時丟棄一半 frame — 每個鏡頭移動及每個 `Write` 都少了一半動態，而 UI
     不會作任何提示。
   - **逐個檔案 import** scene（`import_media source:{path:"…/1080p60/S01Title.mp4"}`）。**切勿
     import 整個 `1080p60` 目錄** — 目錄 import 是遞歸的，Manim 留下的 `partial_movie_files/`
     有數百個碎片，會淹沒真正需要的檔案。
   - 依 plan 次序把 clips 首尾相接放在同一條 track，起始位置**由每個檔案的 `nb_frames` 推算，
     不要由時間長度推算**：
     `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 <scene>.mp4`。
     累加得出每個起始 frame，以一次 `add_clips` 放置全部 clips，然後用 `get_timeline` 核對：track
     不可有 `gaps`，`totalFrames` 必須等於各 scene frame 數之和。
   - 把雙語 `.srt` 拆成 `subtitles-zh.srt` 及 `subtitles-en.srt`（每個 cue 的最後一行是英文，
     其上全是中文；timecode 原樣照抄），兩者都放置為 caption track，並按 theme 的數值設定樣式
     （`CAPTION_INK` 隨 theme 反轉）。`add_captions` 用了 `subtitleMediaRef` 便不能帶其他參數，
     所以樣式一定是第二次 `update_text`；兩條都加入後才設定樣式，並以 `captionGroupId` 而非
     track index 指定。1080p 16:9 的數值：

     | | 中文 | English |
     |---|---|---|
     | Font | `PingFangHK-Semibold` | `PingFangHK-Semibold` |
     | `fontSize` | 48 | 38 |
     | `transform.y` | 0.8633 | 0.9245 |
     | 顏色（dark theme） | `#F2F5FC` | `#F2F5FC` |
     | 顏色（light theme） | `#2A241E` | `#2A241E` |

     這些數字並非揀選出來，而是由 `scripts/academic_theme.py` 計算得出，使 Palmier 的字幕與
     Manim render 的字幕一致；theme 的字幕尺寸或位置若有改動，須按 `references/palmier-assembly.md`
     重新計算。
   - 以 `manage_markers` 為**每個知識點加一個 chapter marker**，以其 section tag 命名。
4. **在合成畫面上驗證** — 用 `inspect_timeline` 檢查一句早段 cue、中文及英文各自最長的 cue、
   最後一句 cue，以及每個 chapter marker 的一個 frame。Tool 回覆說 clips 存在，並不代表它們
   看得見。
5. 在 `video-plan.json` 記錄 `assembly.route: "palmier"` 及 project 路徑，把 status 設為
   `"awaiting-export"`。

**然後停下。** 告訴 Paco project 路徑、track 編排、連 timecode 的 chapter 列表、總長度及總 frame
數，以及你實際檢查過的 frames。

**不准自行加入 transition。** Cross dissolve 會令其後所有內容重新計時，字幕因而失步；若他要求，
把兩種做法的代價列出，由他選擇。**修改方法：** 重新 render 的 shot → 對該 clip 執行
`swap_clip_media`（先核對 `nb_frames` — 若有改變，由該 clip 之後的每個起始 frame 全部重新推算）；
修改 cue → 經 `video-plan.json` 及 `build_captions.py`，然後替換 caption group；字幕顏色或大小
→ `update_text`。

### Gate 5 — 由 Palmier export 並驗證

1. **只憑 Paco 一句話才 export。** 他說 export 時，呼叫 `export_project`，參數為
   `mode: "video"`、`codec: "H.264"`、`resolution: "1080p"`、
   `outputPath: "<project>/out/final.mp4"`，然後以 `manage_exports list` 輪詢直至完成。若他說
   會親手 export，則等候他提供檔案路徑。
2. **最後 gate**，在 project 根目錄執行，對象是 export 出來的檔案（不是 timeline）：

   ```bash
   python3 $SKILL/scripts/verify_master.py --plan video-plan.json --master out/final.mp4 \
     --scene-dir media/videos/script/1080p60
   ```

   不要加 `--require-audio` — 這些影片是無聲的 — 只有在要求了人聲或音樂軌時才加上。以 30 fps
   手動 export 是這一步專門捕捉的典型缺陷。
3. 親眼確認：每個 aha 都成立，沒有文字被裁切，沒有 label 與圖形相撞，顏色意義從未改變，兩條
   字幕軌都可見，section tag 只在 chapter 邊界轉換。
4. 撰寫 `RENDER-REPORT.md`：交付檔案、哪一個是「要看的那一個」、量度所得的數字連同 verifier
   本身的 threshold、公式及幾何如何獨立核對、發現的任何 bug。
5. 只有在 export 出來的檔案通過驗證後，才把 status 設為 `delivered`。交付檔案的任何副本，以
   科目、講次及概念命名，不以 project 編號命名。

## 4. 報告 — 一旦出錯代價最大的一條

**以工具本身的 threshold 量度，並寫出該數字。**

在某一課 SmartQuest 影片中，continuity 檢查被報告為「17 個 cut 全部連續」，所用的是執行者自選
的 luma threshold 3.0。`verify_master.py` 用的是 **0.5** — 嚴格六倍。實際上有 10 個 cut 正在
丟失內容，直至最後一個 gate 才浮現 — 當時 1080p60 master、字幕軌及合成畫面已全部建好。

所以每一次：

- 報告一項檢查之前，先 grep verifier 找出它使用的常數，引用**它的**數字。
- 若該項沒有 verifier，說明你選了甚麼 threshold，以及那是你自己選的。
- 報告你實際執行過的事。沒有數字的「已驗證」不算報告。
- 有未檢查的項目，就明言未檢查。

## 5. 停手條件

遇到以下情況，停在最後一個已驗證的產出，並清楚說明欠缺甚麼：

- 欠缺講義中的某個決定、素材或事實 — 永遠不可自行編造公式、定義或定理陳述；講義看似有錯，或
  與標準參考資料不同時，畫面上依照講義，並在 `brief.md` 標記；
- plugin 的輸出無法對照講義驗證（`manim-chemistry` 會把 `Ca(OH)₂` render 成 **CaO**，而且不會
  報錯）；
- ManimCE 確實無法製作某個 shot — 指明是哪個 shot、原因為何，等待同意後才動用 ManimGL；
- Palmier Pro 的 MCP server 在 Gate 4 沒有回應 — 請 Paco 開啟 app；
- 某項檢查不通過，而修正會改動 Paco 已批核的內容。

## 6. 交接 checklist

以下全部成立，影片才可交接：

- [ ] `notes-map.md` 記錄了記號，以及針對講義提出的每一項標記
- [ ] `brief.md` 記錄了該科系列的顏色分配及 camera 決定，而不只是教學內容
- [ ] `video-plan.json` 由 `make_plan.py` 生成，且 `check_plan.py` 通過
- [ ] `captions.md` 可由 plan 重新生成，無須手動修改
- [ ] `src/kit.py` 為 pens 命名，並由 plan 建立 question band
- [ ] 每個 scene 的結束狀態等於下一個 scene 的開始狀態
- [ ] `video-plan.json` 記錄了 `assembly.route: "palmier"`、project 路徑，以及能反映 export 檔案
      是否存在並已通過驗證的 status
- [ ] Palmier project 內每個知識點都有一個 chapter marker
- [ ] `RENDER-REPORT.md` 存在，內有量度所得的數字
- [ ] 新發現的 trap 已寫入 `references/manim-traps.md`，而不只寫在報告中 — 下一部影片由一個
      不會讀你報告的人製作
