---
name: music-video-production
description: Make a code-rendered music video (MV) for a song — every frame drawn by TypeScript/three.js/GLSL as a pure function of song time, lyrics synced word by word, cuts and hits locked to the beat, film-grade post (bloom, grain, motion blur) — by forking mexicat/pdoom-video ("I'm Upping My P(doom)") and giving it a new song, usually one the user generated in Suno. Covers writing lyrics for Suno and its settings, stem separation and word/beat analysis, a style-bible treatment, scene-by-scene authoring by parallel or sequential agents that check their own stills, lead review, and the 1080p60/4K export. Use it whenever the user wants a music video, MV, lyric video, karaoke/kinetic-typography video, a video "like the P(doom) video", a video for a Suno/Udio song, or asks how that video was made or to reproduce its pipeline — even if they never say "skill". Not for AI-generated live-action video (Sora/Veo/Seedance), Manim lessons (smartquest/academic-video-production) or editing filmed footage (video-use).
---

# Music Video Production (code-rendered, P(doom) pipeline)

A music video where **nothing is generated footage**: a web app renders every frame from the song's
timing data, so the preview in the browser and the 60 fps export are identical, every word lights on
its sung syllable, and every cut lands on a downbeat. The reference is mexicat/pdoom-video (MIT,
made with Claude in Claude Code). This skill turns it into a repeatable pipeline for **any song**.

It was built and tested on an original Suno song ("11:59", CUHK deadline humour): first a 16.5 s
chorus clip (about an hour; a from-scratch rerun of the scripts reproduced the same frames, SSIM
0.995–1.000), then the **whole song — 114 s, 20 plates, half of them 3D, one built on real campus terrain
and roads** (~3.5 h of agent work at 4 in parallel, 40 min render). `examples/1159/` holds its treatment,
timeline, all 38 scene files and stills — **study it before writing a scene; it is the quality bar.**
For a whole song read `references/full-song.md`; for a real place, `references/geo.md`.

## The roles

- **User = producer/director.** Owns the song, the concept approval and every taste call ("too eerie",
  "not punchy enough"). Ask before: the song's language, which section to render, the concept.
- **You = lead.** Setup, analysis, treatment, timeline, briefs, review, integration, render. You do not
  hand the user unreviewed work.
- **Scene authors = agents (or you, one plate at a time).** One plate each, only their own files,
  and they must look at their own renders before reporting.

## Workflow

| # | Phase | Output | Gate |
|---|---|---|---|
| 0 | Song | the audio (+ lyrics text) | user has the file |
| 1 | Setup | project with the multi-song patch | smoke still renders |
| 2 | Analysis | `data/<id>/lyrics.json`, `audio.json`, QA plot | **you looked at the QA plot** |
| 3 | Treatment | `docs/TREATMENT-<id>.md`, `app/src/timeline-<id>.ts` | **user approves the concept** |
| 4 | Scenes | `app/src/scenes/<id>/<plate>.ts` | each author did ≥ 3 look-and-fix rounds |
| 5 | Review | approved plates, cut sheet | you looked at every contact sheet + the cuts |
| 6 | Render | `out/<id>.mp4` + share copy | you pulled frames from the MP4 |

### 0 · The song — `references/suno.md`
If the user has no song, write original lyrics that are **built to be drawn** (concrete nouns, jokes
that become images, a short punchy hook) and give them Suno settings. English aligns best; warn that
Suno's Cantonese is unreliable. Prefer a clear solo lead with few backing vocals. Download as **m4a**:
Suno embeds timed lyric lines in it. Note Suno's free plan is non-commercial.

### 1 · Setup — `references/setup.md`
```bash
<skill>/scripts/setup_project.sh ~/workspace/<project> [--fork]
```
Clones upstream (or forks), applies `multi-song.patch` (adds `?song=<id>` / `--song <id>`, song data in
`data/<id>/`, audio in `audio/<id>.wav`, edit in `app/src/timeline-<id>.ts`), installs deps, finds a
browser, renders one smoke still. Never put the project in Google Drive/iCloud/Dropbox. On a machine
without Google Chrome every `render.ts` command needs `CHROME_PATH=<chromium binary>`.

### 2 · Analysis — `references/analysis.md`
```bash
cd <project>/analysis
uv run python song_analysis.py --song <id> --audio <song.m4a> [--lyrics lyrics.txt] --prompt "<jargon in the song>"
```
Demucs stems → Whisper words on the vocal → line windows (Suno's, checked against the vocal) → words
snapped to vocal onsets → constant-tempo beat grid, per-beat kicks, bar phase from the drum
re-entries, sections, envelopes. **Open `analysis/work/<id>/qa.png` and check** that word lines sit on
vocal onsets and orange downbeats sit on the big drum hits. The first drum hit after a drum-less
stretch is bar 1 — if the orange line isn't there, the bar phase is wrong.

### 3 · Treatment and timeline — `references/treatment.md`
```bash
python3 <project>/analysis/scaffold_song.py --song <id> --section chorus1     # or --from 29.3 --to 45.8, or --full
```
Writes the timeline (one plate per lyric line, cut on the beat before the line's first word) and a
treatment skeleton that already holds every timing an author needs. You write the creative part:
**one concept for the whole video**, a running motif, a restricted palette, type roles, a not-slop
list, and per plate one concrete visual pun (not a literal illustration), how every word becomes part
of the image, what hits on the drop/downbeats/kicks, the camera, one deadpan detail, the hand-off.
Alternate dark and light plates. Show the user a short plate-by-plate summary and **wait for approval**.

### 4 · Scenes — `references/scene-brief.md`
Brief one author per plate with the template (it is self-contained, so any agent — Claude Code,
Codex, Hermes, or you sequentially — can follow it). Authors read `docs/ENGINE.md`, the treatment and
the example scenes, write only `app/src/scenes/<id>/<plate>*.ts`, render stills and contact sheets,
**look at the PNGs**, fix, repeat ≥ 3 times, then report beat by beat with still paths and weaknesses.
Run authors in parallel when you can spawn agents (each renders with `--only <plate> --url http://localhost:1`
so they never share a dev server); otherwise do the plates one by one yourself with the same loop.

### 5 · Review — `references/review.md`
For each report: open its contact sheet and 1–3 stills yourself. Check readability of every word,
sync, hits on the drop, composition, typographic craft, palette discipline, originality, continuity
with the neighbours (a clock must not run backwards across a cut). Send back only concrete fixes.
Then render the cut sheet (`render.ts sheet --song <id> --cuts`) and check every boundary.

### 6 · Render and deliver — `references/render.md`
```bash
CHROME_PATH=... <skill>/scripts/render_clip.sh <project> <id> <from> <to>            # 1080p60, adaptive motion blur
```
Pull frames from the MP4 at the drop and the whips, check the audio track, send the user the share
copy, and list what you'd change in a next revision. Commit/push only when asked; if the fork is
public, don't push the song audio or its data unless the user owns the rights.

## Non-negotiables

- **Deterministic**: a scene's output depends only on `f.t` (seeded randomness, `frameIdx(t)` for per-frame jitter). The export averages sub-frames out of order.
- **Look up timing by content** (`lyrics.get('first words')`, `audio.beats`), never hard-code seconds in scenes.
- **Karaoke**: a word lights exactly at its start, never early; unsung words dimmed; words are part of the image.
- **Originality**: no logos, no imitation of real product UIs, no copyrighted characters, no reproduction of anyone else's lyrics in docs or on screen beyond the song being used.
- **Look before you claim**: every "done" is backed by a PNG or MP4 frame someone actually opened.
- **Continuity across cuts** is the lead's job: pass exact positions, numbers and times to the next author.

## Files

- `scripts/setup_project.sh` · `scripts/multi-song.patch` · `scripts/song_analysis.py` · `scripts/scaffold_song.py` · `scripts/render_clip.sh` · `scripts/geo/` (DTM crop, contours, OSM roads/buildings, drawn-route matching)
- `references/` — `suno.md`, `setup.md`, `analysis.md`, `treatment.md`, `scene-brief.md`, `review.md`, `render.md`, `full-song.md`, `geo.md`, `case-1159.md` (what happened on the clip and the full MV, and why)
- `examples/1159/` — the full-song treatment and timeline, all 20 plates' scene code (38 files), stills of every plate and 20 frames of the final MP4
