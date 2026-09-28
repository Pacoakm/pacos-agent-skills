# Assets and licensing — finding, fetching, logging

## 1. What is already in `~/PeerPath/reel-assets/`

Referenced in place by `alex.palmier` and `antony.palmier` — never move or rename anything here.

| Folder | Contents | Fits |
|---|---|---|
| `Brand/` | `peerpath-logo.jpg` (circular badge on black), old-palette crops of PeerPath posts | the logo badge; the crops carry the retired navy/gold |
| `Stills/`, `Stills2/` | Pexels originals: lecture hall, students' notes, doctor & patient, doctor documents, hospital corridor, writing notes, mock interview, students talking, UK campus, lab, blood sample, panel interview, stethoscope, hospital team | medicine / interviews / study |
| `Cards/`, `Cards2/` | 3:2 crops of the stills (480×320), `card-logo` | Alex's cards |
| `Cards3/` | Antony: `card-lse-logo.jpg`, authored `card-research.jpg` / `card-ps-anchor.jpg`, `broll-books-3x2.mp4`, `broll-campus-3x2.mp4` | LSE, personal statements |
| `Broll/` | Pexels 7969425 (students on steps, 1440×2560), 6207886 (students with books) | study / peers |
| `Full/`, `Full2/`, `Strips/` | full-screen and strip crops from retired layouts | nothing now |
| `Panels/` | `panel-list.png` 900×408, `panel-list3.png` 900×368 | list backing |
| `Music/`, `Music-audition/` | the measured Mixkit beds (`sound.md`) | |
| `SFX/`, `SFX-audition/` | the Mixkit palette (`sound.md`) | |
| `Voice/` | processed stems | |

Medicine imagery is for medicine reels only; the campus photo reads as Oxbridge gothic — not LSE.

## 2. Fetching

**Pexels photos** — search with WebFetch on `https://www.pexels.com/search/<query>/` asking for photo
ids (curl gets no image URLs from search pages), then:
```bash
curl -sSL -A "Mozilla/5.0" -o img-<name>.jpg "https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=1600"
```
**Pexels video** — WebFetch the video page and read the file URL from it (it looks like
`https://videos.pexels.com/video-files/<id>/<id>-uhd_1440_2560_30fps.mp4`); download with curl + UA.

**Mixkit music** — WebFetch can't see the links (they load by JS); curl the listing page:
```bash
curl -sSL -A "Mozilla/5.0" https://mixkit.co/free-stock-music/tag/chill/ \
  | grep -oE 'data-audio-player-preview-url-value="[^"]+music/[0-9]+/[0-9]+\.mp3' | grep -oE '[0-9]+\.mp3' | sort -u
curl -sSL -o bgm-<name>.mp3 https://assets.mixkit.co/music/<id>/<id>.mp3
```
Titles, artists and durations are in the same HTML (`item-grid-card__title`, `__author`,
`data-test-id="duration"`). Keep only tracks longer than the reel.

**Mixkit SFX** — `https://mixkit.co/free-sound-effects/<category>/` lists preview mp3s; take the id and
download `https://assets.mixkit.co/active_storage/sfx/<id>/<id>.wav` (the `.mp3` form returns 403).

**Wikimedia Commons** — read the licence on the `File:` page; get the real URL from the API (a guessed
thumb path returns an HTML page):
```
https://commons.wikimedia.org/w/api.php?action=query&titles=File:<name>&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1400&format=json
```
Use `thumburl` — it is also how an SVG logo becomes a PNG here (no rsvg/ImageMagick installed).
Send a **generic** User-Agent (`PeerPathReelBot/1.0`): a past session put the user's email in the UA
header that went to Wikimedia. Never put personal data in requests.

**Reference reels** (Instagram) — `uvx yt-dlp --no-warnings -f "bv*+ba/b" --merge-output-format mp4
-o "%(uploader_id)s-%(id)s.%(ext)s" <url>`; curl only gets a login page. They are often VP9, which
Palmier can't open — transcode to H.264 to study them in a separate project. **Study only**: no frame,
sound, font, colour or copy from a reference reel goes into a deliverable.

**Other** — HEIC → PNG: `sips -s format png in.heic --out out.png`. Pixabay returned 403 to automated
download; that is a refusal, not a puzzle — don't work around it.

Then cut everything to its slot with `make_card.py` (see `style-system.md`), under a new file name.

## 3. Licences

| Source | Licence | Obligations |
|---|---|---|
| Pexels | Pexels Licence | free commercial use and modification; must not imply the people endorse or work for PeerPath — stock people are illustrative only |
| Mixkit SFX / music | Mixkit Sound Effects / Music Free License | commercial use, no attribution; no redistribution as standalone audio |
| Wikimedia, CC0 | public domain | none (credit anyway in the ledger) |
| Wikimedia, CC BY-SA 4.0 | attribution + share-alike | share-alike arguably reaches the reel as a derivative; avoided on principle unless the user decides otherwise |
| An institution's logo | copyright licence **and** trademark | a licence to copy the file is not permission to use the mark: reproduce it with clear space on a light plaque, beside a true statement, and flag it to the user |
| PeerPath's own creative | owned | fine as brand material; older pieces carry the retired navy/gold palette |
| Remotion-hosted SFX | unresolved for commercial use | dropped |
| Palmier AI generation | — | unavailable (`canGenerate: false`); none has been used — if it ever is, log it |

The LSE logo on Antony is CC BY-SA 4.0 and tagged trademarked on Commons; it was used at the user's
explicit request, over a CC0 Houghton Street photo, and both obligations were written to the plan.

## 4. Sensitive sources — ask first

`~/PeerPath/offer letter/`, `Econ and Law offers/` and `Medicine offer post/` hold real offer letters
(LSE Economics, LSE Law, UK medicine). They are the strongest proof material PeerPath has, and they carry
applicants' details. The sandbox refused to crop one as a sensitive source. Use them only when the user
says yes for that reel, with every identifier redacted — the published carousels show how.

## 5. The ledger

Every asset on the timeline gets a row in `~/PeerPath/.video-edit-staging/sources.md`, under a heading
for the session:

| File | Source page | Creator | Licence | Used at |
|---|---|---|---|---|
| `Cards3/broll-campus-3x2.mp4` | https://www.pexels.com/video/7969425/ | George Pak | Pexels — no endorsement implied | f990–1105 |

Record derived files against their originals (a crop needs no new licence, but it needs a line), and
mark superseded assets with the reason instead of deleting the row.
