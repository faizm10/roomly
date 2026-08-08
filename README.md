# Perch Notes

A native macOS menu-bar notes app where a small character — **Nib** — hangs from
the top edge of every note and watches you write. Local-first: no account, no
network, no screen recording, no permissions requested.

## Run

```bash
./Scripts/make-app.sh release && open "build/Perch Notes.app"
```

`swift run PerchNotes` for quick iteration. No `.xcodeproj` — open
`Package.swift` if you have Xcode.

```bash
swift run PerchNotesTests            # 70 tests (XCTest needs Xcode; this doesn't)
swift run PerchNotes --snapshot ./s  # render every state/colour/size to PNG
```

Character lab: menu-bar icon → **⋯** → **Character Lab**.

## Features

Multiple floating notes · inline checklists (⌘L, Return continues, click to
tick) · debounced autosave · search, archive, delete · seven-colour palette ·
always-on-top · window restoration across display changes · global ⌥⌘N ·
light/dark/system · Reduce Motion · VoiceOver · optional reminders.

Twelve character states driven by a pure state machine, reacting to real
typing, real drag velocity, live resize and checklist completion.

## Layout

```
PerchKit/        models, persistence, search, window geometry, state machine (no UI)
PerchNotes/      App · MenuBar · Notes · Character · Settings · Lab · Support
PerchNotesTests/ executable test suite
```

Start with `PerchKit/Character/CharacterState.swift` (all behaviour; one timer
at a time, never polling) and `PerchNotes/Character/NibCharacterView.swift`.

**The grip:** palms are drawn *behind* the paper so only the part above the
note's edge shows; fingers are drawn *in front*, curling onto the note. Same
coordinates, so the edge genuinely passes through the hands.

**Data:** `~/Library/Application Support/PerchNotes/` — one atomic JSON file
per note, plus `settings.json`.

**Idle cost:** ~0.07% CPU with three notes open. Idle motion is discrete (one
slow breath, then stillness) because a continuous SwiftUI animation in a
transparent window measured at ~25% of a core.

## Limitations

- Launch-at-login needs the `.app` bundle; the toggle disables itself otherwise.
- The hidden title bar leaves an invisible ~28 pt drag strip above the paper.
- Reminders fire only while the app runs; a missed one fires at next launch.
- Plain text only — no rich text.
- `swift test` needs Xcode; use `swift run PerchNotesTests`.

## Legacy

`index.html`, `script.js`, `styles.css`, `Assets/*.svg`, `chiikawa.jpeg` and
`public/` are the old browser prototype. The app uses none of them — Nib is an
original SwiftUI design. Those studies were traced from copyrighted artwork and
should be deleted before publishing.
