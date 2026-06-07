# Adult Playable Sprite Probes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate disposable adult-anime gameplay sprite probes for Nova and Vesper, then compare them against the current compact sprites at match scale before replacing any runtime assets.

**Architecture:** Treat generated images as probe artifacts, not production assets. Keep source generations, processed transparent cutouts, and comparison mockups under ignored `work/` paths until the user chooses a direction. Use the existing visual companion server to review probes in context.

**Tech Stack:** Built-in `image_gen` tool, local `view_image`, Python/Pillow image processing through the installed imagegen chroma-key helper, PowerShell checks, static HTML for visual comparison.

---

## Files And Responsibilities

- `docs/superpowers/specs/2026-06-07-adult-playable-sprite-probes-design.md`: Approved design constraints and preservation rules.
- `work/sprite-probes/source/`: Raw generated probe images copied from the image generation output location.
- `work/sprite-probes/processed/`: Transparent, alpha-trimmed PNG probe cutouts used in mockups.
- `work/sprite-probes/trim_alpha.py`: Local disposable alpha-bound trimming helper for probe images.
- `work/.superpowers/brainstorm/wmi-check/content/adult-probe-results.html`: Visual companion comparison page.
- `work/.superpowers/brainstorm/wmi-check/content/*.png`: Preview copies served by the companion.
- `public/assets/*`: Reference images only. Do not modify during this probe.

## Task 1: Prepare Probe Workspace

**Files:**
- Create: `work/sprite-probes/source/`
- Create: `work/sprite-probes/processed/`
- Create: `work/sprite-probes/README.md`

- [ ] **Step 1: Create probe folders**

Run:

```powershell
New-Item -ItemType Directory -Force -Path work\sprite-probes\source,work\sprite-probes\processed | Out-Null
```

Expected: command exits `0`.

- [ ] **Step 2: Create a probe README**

Create `work/sprite-probes/README.md` with this exact content:

```markdown
# Sprite Probe Workspace

Temporary adult-anime playable sprite probes for Gravity Canyon.

Rules:
- Do not copy these files into `public/assets` until the user chooses a direction.
- Keep raw image generation outputs in `source/`.
- Keep transparent, trimmed preview cutouts in `processed/`.
- Use the visual companion page to judge match-scale readability.
```

- [ ] **Step 3: Confirm runtime reference dimensions**

Run:

```powershell
$paths = @(
  'public/assets/nova-character-default.png',
  'public/assets/nova-character-ko.png',
  'public/assets/vesper-character-default.png',
  'public/assets/vesper-character-ko.png',
  'public/assets/nova-vehicle-sprite.png',
  'public/assets/vesper-vehicle-sprite.png'
)
Add-Type -AssemblyName System.Drawing
foreach ($p in $paths) {
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $p))
  [pscustomobject]@{ Path = $p; Width = $img.Width; Height = $img.Height }
  $img.Dispose()
}
```

Expected: the command prints dimensions for all six reference files without errors.

## Task 2: Generate Nova Default Adult-Playable Probe

**Files:**
- Reference: `public/assets/nova-character-default.png`
- Reference: `public/assets/nova-character-ko.png`
- Create: `work/sprite-probes/source/nova-default-adult-playable-source.png`

- [ ] **Step 1: Inspect reference images**

Use `view_image` on:

```text
C:\Users\jflim\Code\gravity-canyon\public\assets\nova-character-default.png
C:\Users\jflim\Code\gravity-canyon\public\assets\nova-character-ko.png
```

Expected: confirm Nova's red hair, high ponytail, goggles, red-and-black pilot outfit, gloves, heavy boots, and adult KO identity are visible.

- [ ] **Step 2: Generate the probe**

Use the built-in `image_gen` tool with this prompt:

```text
Use case: stylized-concept
Asset type: disposable adult-anime gameplay sprite probe for Gravity Canyon
Primary request: Create a brand-new original 2D cel-shaded adult-anime gameplay character sprite on a perfectly flat solid #00ff00 chroma-key background.

Input images: Use the current Nova default sprite as the identity reference for hair, goggles, outfit, gloves, boots, compact pilot silhouette, and arcade game rendering. Use the current Nova KO sprite only as the adult-anime maturity/style reference; do not copy its KO pose for this default pose.

Subject: Nova, an adult anime arcade combat pilot with red hair, high ponytail, goggles, red-and-black armored arcade pilot outfit, gloves, and heavy boots.

Pose: compact seated/ready gameplay pose that can sit beside or on a sci-fi artillery vehicle. She should look alert, confident, and ready to aim/fire, with hands positioned as if holding compact vehicle controls. Keep the full body readable.

Style/medium: mainstream adult anime game sprite, clean cel shading, crisp face details, thick dark outline, simplified costume details for gameplay readability. Tasteful adult-anime fan-service cues are allowed through mature proportions, confident styling, fitted arcade pilot outfit details, legs/boots/silhouette, and expressive face language, while staying stream-safe and readable.

Composition/framing: centered with generous padding, full-body readable silhouette, but designed to export as a compact battlefield sprite around 120-155 px display height.

Constraints: flat uniform #00ff00 background with no shadows, gradients, texture, floor plane, or lighting variation. Character only. No vehicle. No text. No watermark. No blood. No injury. No nudity. No explicit exposure. Do not use #00ff00 anywhere in the character.
```

Expected: one generated image that clearly reads as adult-anime Nova in a compact playable default pose.

- [ ] **Step 3: Save the selected raw output**

Copy the selected generated image returned by `image_gen` to:

```text
work/sprite-probes/source/nova-default-adult-playable-source.png
```

Expected: the file exists and has a flat green background.

## Task 3: Generate Nova KO Playable-Pass Probe

**Files:**
- Reference: `public/assets/nova-character-ko.png`
- Create: `work/sprite-probes/source/nova-ko-adult-playable-source.png`

- [ ] **Step 1: Inspect the locked KO reference**

Use `view_image` on:

```text
C:\Users\jflim\Code\gravity-canyon\public\assets\nova-character-ko.png
```

Expected: confirm the prone pose and crossed rolled-up pupil expression are visible. Treat this as the pose/expression anchor.

- [ ] **Step 2: Generate the playable-pass probe**

Use the built-in `image_gen` tool with this prompt:

```text
Use case: stylized-concept
Asset type: disposable adult-anime gameplay KO sprite probe for Gravity Canyon
Primary request: Create a gameplay-readable adult-anime KO status sprite variant on a perfectly flat solid #00ff00 chroma-key background.

Input images: Use the current Nova KO sprite as the primary pose and expression reference. Preserve the pose and eye mechanic closely. This is a playable export pass, not a redesign.

Subject: Nova, an adult anime arcade combat pilot with red hair, high ponytail, goggles, red-and-black armored arcade pilot outfit, gloves, and heavy boots.

Pose preservation: Full-body sprawled face-down on the floor, head low, arms slack, legs awkwardly collapsed, posture clearly knocked out and overwhelmed. Gear loosened from impact, straps slightly displaced, buckles dangling, goggles hanging low from the head without covering the eyes, hair messy and fallen across the forehead.

Face preservation: Heavy sleepy eyelids, dazed blush, open mouth with a small tongue blep. Eyes are thin slit-shaped white KO eyes, vertically compressed on the Y-axis. Add visible small oval pupils inside both white slit eyes. Both pupils are rolled upward toward the forehead and crossed inward, clearly inside the eye whites. Expression reads knocked out senseless, dazed, and comically defeated.

Gameplay pass adjustments: Keep the core pose, face, and adult-anime identity, but simplify tiny costume details, strengthen the outer silhouette, thicken dark outline edges, reduce excess illustration density, and make the face readable at match scale. Keep the attractive adult-anime character styling, but do not eroticize the vulnerable KO state. Do not change the pose into a different KO.

Style/medium: mainstream adult anime game sprite, clean cel shading, crisp face details, thick dark outline.

Composition/framing: centered with generous padding, full-body wide prone silhouette, intended to export as a wide KO gameplay sprite that fits inside the active unit frame.

Constraints: flat uniform #00ff00 background with no shadows, gradients, texture, floor plane, or lighting variation. Character only. No vehicle. No text. No watermark. No blood. No visible injury. No nudity. Do not use #00ff00 anywhere in the character.
```

Expected: one generated image that preserves Nova's KO pose/eyes while reducing visual density for gameplay.

- [ ] **Step 3: Save the selected raw output**

Copy the selected generated image returned by `image_gen` to:

```text
work/sprite-probes/source/nova-ko-adult-playable-source.png
```

Expected: the file exists and has a flat green background.

## Task 4: Generate Vesper KO Adult-Playable Probe

**Files:**
- Reference: `public/assets/vesper-character-default.png`
- Create: `work/sprite-probes/source/vesper-ko-adult-playable-source.png`

- [ ] **Step 1: Inspect the Vesper reference**

Use `view_image` on:

```text
C:\Users\jflim\Code\gravity-canyon\public\assets\vesper-character-default.png
```

Expected: confirm cyan-blue hair, short braid accents, headset, blue-and-black hoodie outfit, gloves, chunky sneakers, and compact pilot silhouette are visible.

- [ ] **Step 2: Generate the Vesper KO probe**

Use the built-in `image_gen` tool with this prompt:

```text
Use case: stylized-concept
Asset type: disposable adult-anime gameplay KO sprite probe for Gravity Canyon
Primary request: Create a brand-new original 2D cel-shaded adult-anime game character KO status sprite on a perfectly flat solid #00ff00 chroma-key background.

Input images: Use the current Vesper default sprite as the identity and style reference. Preserve the cyan-blue hair, short twin-braid accents, blue headset, blue-and-black tech hoodie outfit, gloves, chunky blue-white sneakers, compact sci-fi arcade pilot silhouette, thick dark outline, and polished anime game sprite rendering.

Subject: Vesper, an adult anime arcade combat pilot.

Pose: goofy glitch-overloaded collapse unique to Vesper. Limbs loose, headset slightly crooked, hair messy, and small harmless blue pixel-glitch sparks around her gear. The pose should feel silly, defeated, and instantly readable as a combat loss status sprite. Do not copy Nova's face-down prone pose.

Face: Heavy sleepy eyelids, open mouth with a small tongue blep. Eyes are thin slit-shaped white KO eyes, vertically compressed on the Y-axis. Add visible small oval pupils inside both white slit eyes. Both pupils are rolled upward toward the forehead and crossed inward, clearly inside the eye whites. Expression reads knocked out senseless, dazed, and comically defeated.

Gameplay pass adjustments: Adult-anime proportions, compact battlefield silhouette, thick dark outline, simplified gear detail, crisp face readability, no high-detail collection-art density. Tasteful adult-anime fan-service cues are allowed in silhouette and styling, but the KO state should read goofy and defeated rather than eroticized.

Style/medium: mainstream adult anime game sprite, clean cel shading, crisp face details, thick dark outline.

Composition/framing: centered with generous padding, full-body readable silhouette, intended to export as a compact KO gameplay sprite that fits inside the active unit frame.

Constraints: flat uniform #00ff00 background with no shadows, gradients, texture, floor plane, or lighting variation. Character only. No vehicle. No text. No watermark. No blood. No visible injury. No nudity. No explicit exposure. Do not use #00ff00 anywhere in the character.
```

Expected: one generated image that reads as Vesper in a distinct glitch-collapse KO pose.

- [ ] **Step 3: Save the selected raw output**

Copy the selected generated image returned by `image_gen` to:

```text
work/sprite-probes/source/vesper-ko-adult-playable-source.png
```

Expected: the file exists and has a flat green background.

## Task 5: Remove Chroma Key And Trim Transparent Bounds

**Files:**
- Create: `work/sprite-probes/trim_alpha.py`
- Create: `work/sprite-probes/processed/nova-default-adult-playable.png`
- Create: `work/sprite-probes/processed/nova-ko-adult-playable.png`
- Create: `work/sprite-probes/processed/vesper-ko-adult-playable.png`

- [ ] **Step 1: Remove chroma key from all probes**

Run:

```powershell
python C:\Users\jflim\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input work\sprite-probes\source\nova-default-adult-playable-source.png --out work\sprite-probes\processed\nova-default-adult-playable-uncropped.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force
python C:\Users\jflim\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input work\sprite-probes\source\nova-ko-adult-playable-source.png --out work\sprite-probes\processed\nova-ko-adult-playable-uncropped.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force
python C:\Users\jflim\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input work\sprite-probes\source\vesper-ko-adult-playable-source.png --out work\sprite-probes\processed\vesper-ko-adult-playable-uncropped.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force
```

Expected: three `*-uncropped.png` files exist in `work/sprite-probes/processed/`.

- [ ] **Step 2: Create alpha trimming helper**

Create `work/sprite-probes/trim_alpha.py` with this exact content:

```python
from __future__ import annotations

from pathlib import Path
import sys

from PIL import Image


PADDING = 8


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: trim_alpha.py <input.png> <output.png>", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    image = Image.open(src).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        print(f"No opaque pixels found in {src}", file=sys.stderr)
        return 1

    left, top, right, bottom = bbox
    left = max(0, left - PADDING)
    top = max(0, top - PADDING)
    right = min(image.width, right + PADDING)
    bottom = min(image.height, bottom + PADDING)

    out.parent.mkdir(parents=True, exist_ok=True)
    image.crop((left, top, right, bottom)).save(out)
    print(f"{src} -> {out} ({right - left}x{bottom - top})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 3: Trim transparent bounds**

Run:

```powershell
python work\sprite-probes\trim_alpha.py work\sprite-probes\processed\nova-default-adult-playable-uncropped.png work\sprite-probes\processed\nova-default-adult-playable.png
python work\sprite-probes\trim_alpha.py work\sprite-probes\processed\nova-ko-adult-playable-uncropped.png work\sprite-probes\processed\nova-ko-adult-playable.png
python work\sprite-probes\trim_alpha.py work\sprite-probes\processed\vesper-ko-adult-playable-uncropped.png work\sprite-probes\processed\vesper-ko-adult-playable.png
```

Expected: command output prints dimensions for all three final processed files.

- [ ] **Step 4: Validate transparency and dimensions**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
$paths = @(
  'work/sprite-probes/processed/nova-default-adult-playable.png',
  'work/sprite-probes/processed/nova-ko-adult-playable.png',
  'work/sprite-probes/processed/vesper-ko-adult-playable.png'
)
foreach ($p in $paths) {
  $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p))
  $corner = $img.GetPixel(0, 0)
  [pscustomobject]@{ Path = $p; Width = $img.Width; Height = $img.Height; CornerAlpha = $corner.A }
  $img.Dispose()
}
```

Expected: `CornerAlpha` is `0` for each processed probe.

## Task 6: Build Match-Scale Probe Comparison Screen

**Files:**
- Create: `work/.superpowers/brainstorm/wmi-check/content/adult-probe-results.html`
- Copy: `work/.superpowers/brainstorm/wmi-check/content/nova-default-adult-playable.png`
- Copy: `work/.superpowers/brainstorm/wmi-check/content/nova-ko-adult-playable.png`
- Copy: `work/.superpowers/brainstorm/wmi-check/content/vesper-ko-adult-playable.png`

- [ ] **Step 1: Copy processed probes into companion content folder**

Run:

```powershell
Copy-Item work\sprite-probes\processed\nova-default-adult-playable.png work\.superpowers\brainstorm\wmi-check\content\nova-default-adult-playable.png -Force
Copy-Item work\sprite-probes\processed\nova-ko-adult-playable.png work\.superpowers\brainstorm\wmi-check\content\nova-ko-adult-playable.png -Force
Copy-Item work\sprite-probes\processed\vesper-ko-adult-playable.png work\.superpowers\brainstorm\wmi-check\content\vesper-ko-adult-playable.png -Force
```

Expected: three probe files exist in the companion content folder.

- [ ] **Step 2: Create the comparison screen**

Create `work/.superpowers/brainstorm/wmi-check/content/adult-probe-results.html` with a split comparison:

```html
<h2>Adult-Anime Playable Probe Results</h2>
<p class="subtitle">Judge these at match scale beside the vehicle, not as standalone illustrations.</p>

<div class="cards">
  <div class="card" data-choice="nova-default" onclick="toggleSelect(this)">
    <div class="card-image" style="height:260px;display:flex;align-items:end;justify-content:center;background:#101827">
      <img src="/files/nova-vehicle-sprite.png" style="position:absolute;width:250px;transform:translateY(18px)" />
      <img src="/files/nova-default-adult-playable.png" style="position:relative;width:138px;z-index:2" />
    </div>
    <div class="card-body">
      <h3>Nova Adult Default Probe</h3>
      <p>Check whether adult proportions still feel playable and readable.</p>
    </div>
  </div>

  <div class="card" data-choice="nova-ko" onclick="toggleSelect(this)">
    <div class="card-image" style="height:260px;display:flex;align-items:center;justify-content:center;background:#101827">
      <img src="/files/nova-ko-adult-playable.png" style="max-width:270px;max-height:150px" />
    </div>
    <div class="card-body">
      <h3>Nova KO Playable Pass</h3>
      <p>Check whether the preserved pose and eyes survive gameplay simplification.</p>
    </div>
  </div>

  <div class="card" data-choice="vesper-ko" onclick="toggleSelect(this)">
    <div class="card-image" style="height:260px;display:flex;align-items:center;justify-content:center;background:#101827">
      <img src="/files/vesper-ko-adult-playable.png" style="max-width:210px;max-height:160px" />
    </div>
    <div class="card-body">
      <h3>Vesper KO Probe</h3>
      <p>Check whether glitch-collapse reads distinctly from Nova.</p>
    </div>
  </div>
</div>

<h3>Decision</h3>
<div class="options">
  <div class="option" data-choice="compact" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content"><h3>Stay Compact</h3><p>Adult-anime probes lose too much readability.</p></div>
  </div>
  <div class="option" data-choice="adult" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content"><h3>Commit Adult Playable</h3><p>The probes work; define a formal export pipeline.</p></div>
  </div>
  <div class="option" data-choice="hybrid" onclick="toggleSelect(this)">
    <div class="letter">C</div>
    <div class="content"><h3>Use Hybrid Rule</h3><p>Adult identity with compact simplification and larger face cues.</p></div>
  </div>
</div>
```

- [ ] **Step 3: Verify companion serves the results screen**

Run:

```powershell
$resp = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:56074/ -TimeoutSec 3
[pscustomobject]@{
  StatusCode = $resp.StatusCode
  HasTitle = $resp.Content.Contains('Adult-Anime Playable Probe Results')
  HasDecision = $resp.Content.Contains('Use Hybrid Rule')
}
```

Expected: `StatusCode` is `200`, `HasTitle` is `True`, and `HasDecision` is `True`.

## Task 7: User Review And Decision

**Files:**
- Read: `work/.superpowers/brainstorm/wmi-check/state/events`

- [ ] **Step 1: Ask the user to review the companion**

Tell the user:

```text
The adult-playable probe comparison is live at http://127.0.0.1:56074. Please judge the sprites at match scale and pick Stay Compact, Commit Adult Playable, or Use Hybrid Rule.
```

- [ ] **Step 2: Read the companion click events**

Run:

```powershell
if (Test-Path work\.superpowers\brainstorm\wmi-check\state\events) {
  Get-Content -Raw work\.superpowers\brainstorm\wmi-check\state\events
} else {
  'NO_EVENTS_FILE'
}
```

Expected: the output either shows the user's clicked choice or `NO_EVENTS_FILE`, in which case use the user's terminal response.

- [ ] **Step 3: Record the decision before touching runtime assets**

If the user chooses `adult` or `hybrid`, create a follow-up implementation plan for production asset pipeline and runtime alias changes.

If the user chooses `compact`, create a follow-up plan for compact KO regeneration only.

Expected: no runtime asset file in `public/assets` has changed during this probe plan.

## Verification Checklist

- [ ] `git status --short` shows no tracked runtime asset changes from this probe.
- [ ] All generated probe files are under `work/`.
- [ ] The visual companion returns HTTP `200`.
- [ ] The user has seen the probes at match scale before any runtime replacement.
