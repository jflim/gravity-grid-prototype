# Lobby Seat Card Unit Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the playtest lobby's repeated Pilot/Vehicle panels with the approved compact unit-summary seat card.

**Architecture:** This is a client presentation change only. `src/onlineLobbyMarkup.ts` will keep rendering one combined unit image per seat, then render compact unit chips from the existing `LobbyCharacterCard` data. `src/styles.css` will tighten the seat card dimensions so team columns scan better in 1v1 and 2v2.

**Tech Stack:** TypeScript, HTML string rendering, CSS, Node built-in test runner via `tsx`.

---

## File Structure

- Modify `src/onlineLobbyMarkup.test.ts`: assert the seat rows render compact unit chips and no longer render big Pilot/Vehicle loadout panels.
- Modify `src/onlineLobbyMarkup.ts`: replace `renderLoadoutPart(...)` usage with compact unit chip markup.
- Modify `src/styles.css`: replace slot loadout panel styles with compact chip styles and reduce seat card image/card heights.
- Modify `docs/VERSION_LOG.md`: add a short playable checkpoint note for the lobby presentation change.

---

### Task 1: Lock The Markup Contract With A Failing Test

**Files:**
- Modify: `src/onlineLobbyMarkup.test.ts`
- Test: `src/onlineLobbyMarkup.test.ts`

- [ ] **Step 1: Update the grouped-seat test expectations**

In `renderSlotRows groups visible seats by team`, keep the existing team, host, action, and unit image assertions. Replace the old Vehicle-image assertion with compact unit chip assertions:

```ts
  assertIncludesAll(html, [
    /online-team-column online-team-column--red/,
    /online-team-column online-team-column--blue/,
    /Red Team/,
    /Blue Team/,
    /Red is ready/,
    /Open blue seat/,
    /online-seat__host-badge/,
    /HOST/,
    /data-seat-action="pick"/,
    /data-seat-action="claim"/,
    /src="\/assets\/nova-unit-default.webp"/,
    /class="online-seat__unit-chips"/,
    /data-unit-chip="pilot"[^>]*>Nova<\/span>/,
    /data-unit-chip="vehicle"[^>]*>Bunger Rig<\/span>/,
  ]);
  assertExcludesAll(html, [/online-seat__part/, />Pilot</, />Vehicle</, /src="\/assets\/nova-vehicle-sprite.webp"/, /<select/]);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd --test src\onlineLobbyMarkup.test.ts
```

Expected: failure because `online-seat__unit-chips` and `data-unit-chip` do not exist yet, while `online-seat__part` still exists.

---

### Task 2: Render Compact Unit Chips

**Files:**
- Modify: `src/onlineLobbyMarkup.ts`
- Test: `src/onlineLobbyMarkup.test.ts`

- [ ] **Step 1: Replace the loadout block in `renderSlotRow`**

Change:

```ts
        <div class="online-seat__loadout">
          ${renderLoadoutPart("Pilot", state.card.name, state.card.pilotImage, state.card.needsLobbyArt)}
          ${renderLoadoutPart("Vehicle", state.card.vehicleName, state.card.vehicleImage, false)}
        </div>
```

To:

```ts
        ${renderUnitChips(state.card)}
```

- [ ] **Step 2: Add `renderUnitChips` and remove `renderLoadoutPart`**

Add this helper near the old loadout helper location:

```ts
function renderUnitChips(card: LobbyCharacterCard): string {
  return `
    <div class="online-seat__unit-chips" aria-label="${escapeHtml(`${card.name} with ${card.vehicleName}`)}">
      <span class="online-seat__unit-chip" data-unit-chip="pilot" title="${escapeHtml(`Pilot: ${card.name}`)}">${escapeHtml(card.name)}</span>
      <span class="online-seat__unit-chip" data-unit-chip="vehicle" title="${escapeHtml(`Vehicle: ${card.vehicleName}`)}">${escapeHtml(card.vehicleName)}</span>
    </div>
  `;
}
```

Remove the now-unused `renderLoadoutPart(...)` function entirely.

- [ ] **Step 3: Run the focused test and verify it passes**

Run:

```powershell
node_modules\.bin\tsx.cmd --test src\onlineLobbyMarkup.test.ts
```

Expected: all `onlineLobbyMarkup` tests pass.

---

### Task 3: Match The Approved Compact Visual Direction

**Files:**
- Modify: `src/styles.css`
- Test: browser/manual visual review after build or live reload

- [ ] **Step 1: Tighten the slot card layout**

In the `.online-slot` block, change the grid and height values to match the mock's shorter unit summary:

```css
.online-slot {
  display: grid;
  grid-template-columns: minmax(96px, 116px) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  min-height: 124px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.07);
  border-left: 4px solid #ff727e;
  border-radius: 8px;
}
```

- [ ] **Step 2: Tighten the combined unit image box**

Replace the `.online-seat__unit` and `.online-seat__unit img` dimensions:

```css
.online-seat__unit {
  display: grid;
  place-items: end center;
  min-width: 0;
  min-height: 112px;
  overflow: hidden;
}

.online-seat__unit img {
  display: block;
  width: 100%;
  height: 104px;
  object-fit: contain;
  object-position: center bottom;
}
```

- [ ] **Step 3: Replace loadout panel styles with chip styles**

Remove `.online-seat__loadout`, `.online-seat__part`, `.online-seat__part img`, and the `.online-seat__part figcaption...` rules. Add:

```css
.online-seat__unit-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: start;
  min-width: 0;
}

.online-seat__unit-chip {
  display: block;
  max-width: 100%;
  overflow: hidden;
  padding: 5px 7px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 850;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

```

- [ ] **Step 4: Keep mobile layout stable**

In the `@media (max-width: 680px)` rule where `.online-slot` switches to one column, add a compact mobile override:

```css
  .online-seat__unit img {
    height: 118px;
  }
```

Expected: single-column mobile seats still show readable unit art without overlapping text or buttons.

---

### Task 4: Document The Playable Checkpoint

**Files:**
- Modify: `docs/VERSION_LOG.md`
- Generated by command: `docs/VERSION_LOG.html`

- [ ] **Step 1: Add a concise version log bullet**

Add a bullet to the latest unreleased/checkpoint section:

```md
- Tightened the playtest lobby seat cards around the combined unit identity: the main slot now shows the mounted unit once, with compact Pilot/Vehicle chips instead of repeated Pilot and Vehicle panels.
```

- [ ] **Step 2: Regenerate docs HTML**

Run:

```powershell
npm run docs:html
```

Expected: command exits 0 and regenerates HTML reading copies.

---

### Task 5: Verification

**Files:**
- Test: `src/onlineLobbyMarkup.test.ts`
- Test: full project gates

- [ ] **Step 1: Run focused lobby tests**

Run:

```powershell
node_modules\.bin\tsx.cmd --test src\onlineLobbyMarkup.test.ts src\onlineLobbyView.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: build exits 0. Existing bundle-size warnings are acceptable if unchanged.

- [ ] **Step 4: Run changed-code audit**

Run:

```powershell
npm run audit:fallow:changed
```

Expected: exits 0, or any introduced finding is fixed before completion.

- [ ] **Step 5: Refresh the code graph**

Run:

```powershell
npm run graphify:update
```

Expected: exits 0.

- [ ] **Step 6: Review the live lobby**

Open or refresh:

```text
http://127.0.0.1:2567/?onlinePanel=1
```

Expected: each seat matches the approved B mock direction: one combined unit visual, compact Pilot/Vehicle chips, shorter card, host badge still visible, and existing actions still usable.
