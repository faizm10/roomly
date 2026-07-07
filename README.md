# Playground Chrome Extension

Transform websites into playful, living worlds with animated pets and characters.

## Load Unpacked

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder (`chromy-ext`)

## Supported Sites

| Site | Theme | Characters |
|------|-------|------------|
| LinkedIn | Corporate Park | Business Pigeon, Resume Raccoon, Coffee Hamster |
| GitHub | Bug Forest | Bug Goblin, Sleep Deprived Octopus, Debug Frog |
| YouTube | Brainrot Playground | Hyper Bird, Meme Goblin |

## Usage

1. Visit a supported website
2. Click the Playground extension icon
3. Toggle **ON** and watch animals appear
4. On **LinkedIn feed** (`/feed/`), enable **Swipe Feed** for Tinder-style post cards
5. Use **Spawn More Animals** or **Clear Animals** as needed

### Swipe Feed (LinkedIn)

- Drag cards left (**PASS**) or right (**CONNECT**)
- Or use the ✕ / ♥ buttons, or ← → arrow keys
- **↩ Undo** brings back the last card
- Live posts are reparented into cards so like/comment still work

## Architecture

```
manifest.json       MV3 manifest
background.js       Message relay (popup ↔ content script)
popup.html/css/js   Extension popup UI
content.js          Content script bootstrap
styles.css          Injected playground styles
js/
  themes.js         Site themes (add new sites here)
  animal.js         Animal behavior & animation engine
  playground.js     Playground manager & render loop
  layouts/linkedin-swipe.js  Tinder-style LinkedIn feed
css/linkedin-swipe.css       Swipe deck styles
```

## Extending

- **Custom artwork**: Replace `emoji` fields in `js/themes.js` with `sprite: 'assets/...'` and update `animal.js` to render `<img>` tags
- **New sites**: Add a theme object to `PLAYGROUND_THEMES` in `js/themes.js` and update `manifest.json` host_permissions
- **AI dialogue**: Hook into `_showSpeech()` in `animal.js` with an async dialogue provider
- **Collectibles**: Track spawned animal IDs in `chrome.storage` and gate spawns
- **Pet interactions**: Add proximity checks in `Playground._tick()` and trigger paired animations
