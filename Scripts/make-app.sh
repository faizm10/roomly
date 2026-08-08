#!/bin/bash
# Builds Perch Notes and wraps the executable in a real .app bundle.
#
# A bundle is needed for the things macOS only offers to bundled apps:
# launch-at-login (SMAppService), user notifications, and a proper
# menu-bar-only launch via LSUIElement.
set -euo pipefail

CONFIG="${1:-release}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/build/Perch Notes.app"

cd "$ROOT"
swift build -c "$CONFIG" --product PerchNotes
BINARY="$(swift build -c "$CONFIG" --show-bin-path)/PerchNotes"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BINARY" "$APP/Contents/MacOS/PerchNotes"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>                  <string>Perch Notes</string>
    <key>CFBundleDisplayName</key>           <string>Perch Notes</string>
    <key>CFBundleExecutable</key>            <string>PerchNotes</string>
    <key>CFBundleIdentifier</key>            <string>com.perchnotes.app</string>
    <key>CFBundlePackageType</key>           <string>APPL</string>
    <key>CFBundleShortVersionString</key>    <string>1.0</string>
    <key>CFBundleVersion</key>               <string>1</string>
    <key>LSMinimumSystemVersion</key>        <string>14.0</string>
    <!-- Menu-bar only: no Dock icon unless the user turns one on in Settings. -->
    <key>LSUIElement</key>                   <true/>
    <key>NSHumanReadableCopyright</key>      <string>Local-first notes. Nothing leaves this Mac.</string>
    <key>NSSupportsAutomaticTermination</key><false/>
    <key>NSSupportsSuddenTermination</key>   <false/>
</dict>
</plist>
PLIST

# Ad-hoc signature so macOS treats it as a stable app identity between runs.
codesign --force --sign - --timestamp=none "$APP" >/dev/null 2>&1 || \
    echo "note: ad-hoc signing unavailable; the app still runs locally."

echo "Built: $APP"
