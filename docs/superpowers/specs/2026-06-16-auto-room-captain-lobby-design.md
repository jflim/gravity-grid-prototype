# Auto-Room Captain Lobby Design

Status: approved design  
Date: 2026-06-16  
Scope authority: `docs/PRODUCTION_PLAN.md`

## Purpose

The current `npm run playtest` flow prints a public URL, but that URL only hosts the app. It does not represent a specific room, and the visible Phaser battlefield is still local browser authority. This makes friend testing confusing because a remote player can load the same page without clearly joining the same session or controlling an obvious unit.

This design defines the next smallest online playtest slice: the generated playtest URL behaves like one shared playtest room. Players do not create or paste room codes yet. Everyone who opens the playtest URL joins the same auto-room lobby, picks identity for their side, readies, and can start a simple server-owned online session.

## Player Promise

When the host runs `npm run playtest`, the printed URL should be enough for a friend test.

Expected tester flow:

1. Host runs `npm run playtest`.
2. Host opens the printed URL.
3. Friend opens the same printed URL.
4. Both land in the same lobby.
5. Each player sees which side they control.
6. Each player chooses characters for their controlled slot or slots.
7. Each player readies.
8. The game starts a shared online session when the ready rules pass.

There is no room-code copy step in this slice.

## Scope

In scope:

- Auto-join one shared room for playtest mode.
- Two human online captains.
- First connected player controls red captain.
- Second connected player controls blue captain.
- 1v1 and 2v2 mode toggle.
- In 1v1 mode, each captain controls one unit.
- In 2v2 mode, each captain controls both units on their team.
- Display name editing.
- Character selection per owned unit slot.
- Ready state per captain.
- Clear lobby status showing who controls each team and which characters are selected.
- Extra connections become passive spectators with no gameplay control.
- Keep the existing local map demo separate until the online match bridge is implemented.

Out of scope for this slice:

- General private-room creation.
- Join-by-room-code.
- Share links with `?room=`.
- True four-human seat ownership.
- Accounts or persistent identity.
- Public room list or matchmaking.
- Full server-authoritative Phaser combat.
- Complete map/settings UI.
- Free-text chat.

## Lobby Model

The room has two captain assignments:

- `redCaptainSessionId`
- `blueCaptainSessionId`

Assignment rules:

- The first connected player becomes red captain.
- The second connected player becomes blue captain.
- If a captain leaves before match start, the earliest connected spectator is promoted into the vacant captain role.
- If a captain leaves after match start, this slice can stop or return to the lobby rather than trying to preserve the match.
- Red captain owns the mode toggle before match start.

Mode choices:

- `1v1`: active slots are `red-1` and `blue-1`.
- `2v2`: active slots are `red-1`, `red-2`, `blue-1`, and `blue-2`.

Control rules:

- Red captain owns every red active slot.
- Blue captain owns every blue active slot.
- A captain readies once for their whole side.

## Character Selection

The lobby exposes the locked v1 roster:

- Nova.
- Vesper.
- Kaelii.
- Perlah.

Default selections can be simple and readable:

- Red 1: Nova.
- Red 2: Kaelii.
- Blue 1: Vesper.
- Blue 2: Perlah.

Players may choose the same character in multiple slots unless a later balance rule changes this. This matches the current v1 tolerance for duplicate characters and keeps the lobby implementation simple.

## Ready And Start Rules

Ready requirements:

- In 1v1 mode, red captain and blue captain must both be connected and ready.
- In 2v2 mode, red captain and blue captain must both be connected and ready.
- Active slots must all have valid character selections.

Start behavior:

- The first slice auto-starts when both captains are ready.
- The UI should make blocked start reasons visible, such as "Waiting for blue captain" or "Waiting for red ready."

## Online Match Bridge

This design does not require full Phaser combat to become server-authoritative in the same step.

The first implementation starts an online server-owned demo state that proves:

- Both captains see the same match participants.
- Both captains see the same mode and character assignments.
- Active turn ownership is obvious.
- Only the captain who owns the active unit can submit the current server test action.

After that, movement, aim, firing, terrain, damage, Void Dropped resolution, and round/match scoring can be wired into server authority one system at a time.

## UI Requirements

The playtest-mode lobby should replace the current create/join emphasis.

Required visible information:

- Connection status.
- Local role: Red captain, Blue captain, Spectator, or Waiting.
- Display name.
- Mode toggle: `1v1` / `2v2`.
- Team/slot rows.
- Character pick controls for owned slots.
- Ready button.
- Ready state for each captain.
- Clear blocked-start/status text.

The UI should not imply that the large local battlefield is already the online truth. If the local demo remains visible behind the panel, the lobby text should still make the shared online state the primary focus.

## Server Data Shape

The existing Colyseus room can evolve from the current two-player combat preview.

Required room state additions:

- `mode: "1v1" | "2v2"`
- `redCaptainSessionId: string`
- `blueCaptainSessionId: string`
- `spectatorSessionIds`
- `slots`
- `selectedCharacterId` per slot
- `ownerSessionId` per active slot
- `ready` per captain/player

Required messages:

- `setDisplayName`
- `setMode`
- `selectCharacter`
- `setReady`
- Existing server-test action messages can remain temporary while combat is still a preview.

## Error Handling

The server should reject or ignore invalid actions:

- Spectator changing mode or character selections.
- Red captain editing blue slots.
- Blue captain editing red slots.
- Readying without a captain role.
- Selecting an unknown character.
- Starting before both captains are ready.
- Non-active captain submitting the current online action.

The client should show short status text for user-correctable states instead of failing silently.

## Testing

Unit and integration coverage should prove:

- First player becomes red captain.
- Second player becomes blue captain.
- Extra players do not control a side.
- 1v1 mode activates one slot per team.
- 2v2 mode activates two slots per team.
- Captains can edit only their owned slots.
- Ready rules require both captains.
- Server start state includes the selected mode, slots, owners, and characters.
- Remote clients resolve the public playtest URL to the same Colyseus origin.

Manual playtest check:

1. Run `npm run playtest`.
2. Open the printed URL in one browser.
3. Open the same URL from another connection or browser context.
4. Confirm both clients show the same lobby.
5. Set 1v1, choose characters, ready both sides, and start/auto-start.
6. Reset or restart the room.
7. Set 2v2, choose two characters per side, ready both sides, and start/auto-start.

## Follow-Up Boundary

This slice treats extra connections as passive spectators because that is more useful for debugging a hosted test. Spectator camera controls, spectator chat, and spectator interaction are future scope.
