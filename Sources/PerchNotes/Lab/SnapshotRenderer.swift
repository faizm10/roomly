import AppKit
import PerchKit
import SwiftUI

/// Development-only offline renderer: `PerchNotes --snapshot <directory>`
/// writes a PNG of the note surface for every character state and every note
/// colour. It is how the character is reviewed without driving the UI by hand,
/// and it doubles as a visual regression check.
@MainActor
enum SnapshotRenderer {
    static func runIfRequested() -> Bool {
        let arguments = CommandLine.arguments
        guard let index = arguments.firstIndex(of: "--snapshot") else { return false }
        let directory = arguments.count > index + 1
            ? URL(fileURLWithPath: arguments[index + 1])
            : FileManager.default.temporaryDirectory.appendingPathComponent("perch-snapshots")
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        render(into: directory)
        print("Wrote snapshots to \(directory.path)")
        return true
    }

    private static func render(into directory: URL) {
        // One sheet with every animation state, on light paper.
        write(StateSheet(colorScheme: .light), name: "states-light", into: directory)
        write(StateSheet(colorScheme: .dark), name: "states-dark", into: directory)
        write(PaletteSheet(), name: "palettes", into: directory)
        write(SizeSheet(), name: "window-sizes", into: directory)
        write(DirectionsSheet(), name: "character-directions", into: directory)
    }

    private static func write(_ view: some View, name: String, into directory: URL) {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let image = renderer.nsImage,
              let tiff = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff),
              let png = bitmap.representation(using: .png, properties: [:]) else {
            print("Failed to render \(name)")
            return
        }
        try? png.write(to: directory.appendingPathComponent("\(name).png"))
    }
}

/// A note-shaped preview with the character attached, matching the real
/// window's geometry so snapshots reflect what ships.
struct NoteSnapshot: View {
    var state: CharacterState
    var color: NoteColor = .cream
    var isDark: Bool = false
    var reduceMotion: Bool = false
    var scale: Double = 1
    var size = CGSize(width: 300, height: 210)
    var caption: String?

    private var theme: NoteTheme { NoteTheme(color: color, isDark: isDark) }

    private var pose: CharacterPose {
        CharacterPoseResolver.resolvedPose(for: state,
                                           preferences: CharacterPreferences(),
                                           reduceMotion: reduceMotion)
    }

    var body: some View {
        let characterScale = 0.8 * CGFloat(scale)
        let centerX = CGFloat(CharacterAnchor.centerX(for: 0.5, windowWidth: Double(size.width),
                                                      scale: Double(characterScale)))
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topLeading) {
                layer(.behindPaper, centerX: centerX, scale: characterScale)
                PaperSurface(theme: theme)
                    .overlay(alignment: .topLeading) { sampleContent(scale: characterScale) }
                    .shadow(color: .black.opacity(isDark ? 0.5 : 0.2), radius: 10, y: 5)
                    .frame(width: size.width, height: size.height)
                layer(.inFrontOfPaper, centerX: centerX, scale: characterScale)
            }
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .padding(.top, NibDesign.gripLineY * characterScale + 8)

            Text(caption ?? state.rawValue)
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundColor(isDark ? .white.opacity(0.75) : .black.opacity(0.6))
        }
    }

    private func layer(_ layer: CharacterLayer, centerX: CGFloat, scale: CGFloat) -> some View {
        NibCharacterView(pose: pose, layer: layer, paperIsDark: theme.paperIsDark)
            .scaleEffect(scale, anchor: .topLeading)
            .frame(width: NibDesign.size.width * scale, height: NibDesign.size.height * scale,
                   alignment: .topLeading)
            .offset(x: centerX - NibDesign.size.width * scale / 2, y: -NibDesign.gripLineY * scale)
    }

    private func sampleContent(scale: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .semibold))
                Spacer()
                Image(systemName: "checklist")
                    .font(.system(size: 9, weight: .semibold))
                Circle().fill(Color(hex: color.markerHex)).frame(width: 9, height: 9)
                Image(systemName: "pin")
                    .font(.system(size: 9, weight: .semibold))
                Image(systemName: "ellipsis")
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundColor(theme.secondaryInk)
            .padding(.horizontal, 10)
            .padding(.top, 8)

            Spacer().frame(height: max(0, NibDesign.hangDepth * scale - 34))

            VStack(alignment: .leading, spacing: 3) {
                Text("Sunday reset")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundColor(theme.ink)
                Text("- [x] water the plants")
                    .font(.system(size: 11.5))
                    .foregroundColor(theme.secondaryInk)
                Text("- [ ] finish the type scale")
                    .font(.system(size: 11.5))
                    .foregroundColor(theme.ink)
            }
            .padding(.horizontal, 16)
            Spacer(minLength: 0)
        }
    }
}

private struct StateSheet: View {
    var colorScheme: ColorScheme

    private var isDark: Bool { colorScheme == .dark }

    private let columns = [GridItem(.fixed(316)), GridItem(.fixed(316)), GridItem(.fixed(316)),
                           GridItem(.fixed(316))]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(isDark ? "Nib — every state, dark" : "Nib — every state, light")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(isDark ? .white : .black)
            LazyVGrid(columns: columns, alignment: .leading, spacing: 18) {
                ForEach(CharacterState.allCases, id: \.self) { state in
                    NoteSnapshot(state: state, color: isDark ? .charcoal : .cream, isDark: isDark)
                }
                NoteSnapshot(state: .celebrating, color: isDark ? .charcoal : .cream,
                             isDark: isDark, reduceMotion: true,
                             caption: "celebrating · reduce motion")
                NoteSnapshot(state: .hangingIdle, color: isDark ? .charcoal : .cream,
                             isDark: isDark, scale: 1.4, caption: "hangingIdle · scale 140%")
            }
        }
        .padding(28)
        .background(isDark ? Color(hex: 0x161618) : Color(hex: 0xE6E2DC))
        .environment(\.colorScheme, colorScheme)
    }
}

private struct PaletteSheet: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Note palette")
                .font(.system(size: 20, weight: .bold, design: .rounded))
            ForEach([false, true], id: \.self) { dark in
                Text(dark ? "Dark appearance" : "Light appearance")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.secondary)
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(272)), count: 4),
                          alignment: .leading, spacing: 16) {
                    ForEach(NoteColor.allCases) { color in
                        NoteSnapshot(state: .hangingIdle, color: color, isDark: dark,
                                     size: CGSize(width: 256, height: 190),
                                     caption: color.displayName)
                    }
                }
            }
        }
        .padding(28)
        .background(Color(hex: 0xE6E2DC))
    }
}

private struct SizeSheet: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Window sizes — the character stays clear of the controls")
                .font(.system(size: 20, weight: .bold, design: .rounded))
            HStack(alignment: .top, spacing: 20) {
                NoteSnapshot(state: .hangingIdle, size: CGSize(width: 272, height: 288),
                             caption: "minimum 300×320 window")
                NoteSnapshot(state: .watchingTyping, size: CGSize(width: 352, height: 368),
                             caption: "default")
                NoteSnapshot(state: .noteDragging, size: CGSize(width: 560, height: 300),
                             caption: "wide")
                NoteSnapshot(state: .thinking, size: CGSize(width: 232, height: 240),
                             caption: "very narrow")
            }
        }
        .padding(28)
        .background(Color(hex: 0xE6E2DC))
    }
}

private struct DirectionsSheet: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Three explored directions")
                .font(.system(size: 20, weight: .bold, design: .rounded))
            HStack(alignment: .top, spacing: 20) {
                ForEach(CharacterDirection.allCases) { direction in
                    VStack(alignment: .leading, spacing: 8) {
                        DirectionSketch(direction: direction)
                            .frame(width: 180, height: 225)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color(hex: 0xF6EDDD)))
                        Text(direction.title).font(.system(size: 15, weight: .bold))
                        Text(direction.verdict).font(.system(size: 11)).frame(width: 200,
                                                                             alignment: .leading)
                    }
                    .frame(width: 200, alignment: .leading)
                }
            }
        }
        .padding(28)
        .background(Color(hex: 0xE6E2DC))
    }
}
