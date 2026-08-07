# Perch Notes Character Prototype

A local interactive prototype for the main character of a macOS menu-bar notes
app. It focuses on character exploration, physical note attachment, animation
states, light/dark mode, quiet mode, reduced motion, and a compact menu-bar
silhouette.

## Native macOS menu-bar app

This repo now includes a small AppKit prototype that runs as a real macOS
menu-bar app with no Dock icon.

Run it with:

```sh
swift run PerchNotes
```

What it does:

- Adds a Perch icon to the macOS menu bar.
- Opens a floating always-on-top note window.
- Lets the character hang from the note edge.
- Right-click or Control-click the menu-bar icon for actions.
- Includes Perch and Chiikawa study modes.
- Includes quiet mode and reduced motion.

Quit from the menu-bar menu with `Quit Perch Notes`.

## Browser prototype

Open `index.html` directly, or serve the folder locally with:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
http://localhost:4173/?skin=chiikawa
```
