import PerchKit
import SwiftUI

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

extension NSColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}

/// Resolved surface tones for one note, in one appearance.
struct NoteTheme: Equatable {
    let color: NoteColor
    let isDark: Bool
    let palette: NotePalette

    init(color: NoteColor, isDark: Bool) {
        self.color = color
        self.isDark = isDark
        self.palette = color.palette(dark: isDark)
    }

    /// True when the paper itself is dark, which the character uses to pick
    /// its shadow strength.
    var paperIsDark: Bool { isDark || color.isAlwaysDark }

    var paper: Color { Color(hex: palette.paper) }
    var paperEdge: Color { Color(hex: palette.paperEdge) }
    var ink: Color { Color(hex: palette.ink) }
    var secondaryInk: Color { Color(hex: palette.secondaryInk) }
    var accent: Color { Color(hex: palette.accent) }

    var nsInk: NSColor { NSColor(hex: palette.ink) }
    var nsAccent: NSColor { NSColor(hex: palette.accent) }
    var nsSecondaryInk: NSColor { NSColor(hex: palette.secondaryInk) }

    /// Faint top-light used to give the paper a little physical depth.
    var paperSheen: LinearGradient {
        LinearGradient(
            colors: [
                Color.white.opacity(paperIsDark ? 0.05 : 0.42),
                Color.white.opacity(0)
            ],
            startPoint: .top,
            endPoint: .init(x: 0.5, y: 0.35)
        )
    }
}

/// Layout constants shared by the note window and the character.
enum NoteMetrics {
    /// Transparent margin around the paper. The top is much larger than the
    /// rest: it is the headroom the character travels through when it arrives
    /// and when it climbs away, and it is click-through.
    static let paperInsetTop: CGFloat = 88
    static let paperInsetSide: CGFloat = 14
    static let paperInsetBottom: CGFloat = 16
    static let cornerRadius: CGFloat = 14
    static let minimumWindowSize = CGSize(width: 300, height: 320)
    static let controlSize: CGFloat = 20
}

/// The note's paper. Shared by the real window, the character lab and the
/// snapshot renderer so all three show the same surface.
///
/// The top edge is deliberately a touch darker than the rest: it is the line
/// the character grips, and without that definition the fingers in front of it
/// stop reading as overlapping.
struct PaperSurface: View {
    let theme: NoteTheme

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: NoteMetrics.cornerRadius, style: .continuous)
        shape
            .fill(theme.paper)
            .overlay(shape.fill(theme.paperSheen))
            .overlay(alignment: .top) {
                LinearGradient(
                    colors: [theme.paperEdge.opacity(theme.paperIsDark ? 0.9 : 0.75),
                             theme.paperEdge.opacity(0)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 5)
            }
            .clipShape(shape)
            .overlay(shape.strokeBorder(theme.paperEdge, lineWidth: 1))
    }
}

/// Idle breathing.
///
/// Deliberately *not* a permanent loop. A continuously running animation keeps
/// the note's transparent window recompositing at display rate, which measured
/// at roughly a quarter of a CPU core — unacceptable for an app that is meant
/// to sit in the menu bar all day. Instead the character takes one slow breath
/// and is then completely still for several seconds, which is also what the
/// character is supposed to do: mostly nothing, with natural pauses.
///
/// The phase only ever feeds animatable modifiers, so Core Animation
/// interpolates the transform without re-evaluating the character's body.
struct BreathingModifier: ViewModifier {
    var isActive: Bool
    /// Length of a single inhale (the exhale mirrors it).
    var inhale: Double
    /// Stillness between breaths.
    var rest: Double
    /// Where the motion pivots from — the note's edge, where the hands grip.
    var anchor: UnitPoint = .top

    @State private var phase: CGFloat = 0
    @State private var timer: Timer?

    func body(content: Content) -> some View {
        content
            .scaleEffect(x: 1, y: 1 + phase * 0.022, anchor: anchor)
            .offset(y: phase * 1.1)
            .onAppear { restart() }
            .onDisappear { cancel() }
            .onChange(of: isActive) { _, _ in restart() }
            .onChange(of: rest) { _, _ in restart() }
    }

    private func restart() {
        cancel()
        guard isActive else {
            withAnimation(.easeOut(duration: 0.25)) { phase = 0 }
            return
        }
        breathe()
    }

    private func cancel() {
        timer?.invalidate()
        timer = nil
    }

    private func breathe() {
        withAnimation(.easeInOut(duration: inhale).repeatCount(2, autoreverses: true)) {
            phase = 1
        }
        let next = Timer(timeInterval: inhale * 2 + rest, repeats: false) { _ in
            Task { @MainActor in
                guard isActive else { return }
                breathe()
            }
        }
        RunLoop.main.add(next, forMode: .common)
        timer = next
    }
}

extension View {
    func breathing(isActive: Bool, inhale: Double, rest: Double,
                   anchor: UnitPoint = .top) -> some View {
        modifier(BreathingModifier(isActive: isActive, inhale: inhale, rest: rest, anchor: anchor))
    }
}

/// One shared spring vocabulary, so every part of the app settles the same way.
enum Motion {
    static let settle = Animation.spring(response: 0.55, dampingFraction: 0.66)
    static let swing = Animation.spring(response: 0.75, dampingFraction: 0.42)
    static let glide = Animation.spring(response: 0.45, dampingFraction: 0.85)
    static let reduced = Animation.easeOut(duration: 0.18)

    static func settle(reduceMotion: Bool) -> Animation { reduceMotion ? reduced : settle }
    static func swing(reduceMotion: Bool) -> Animation { reduceMotion ? reduced : swing }
    static func glide(reduceMotion: Bool) -> Animation { reduceMotion ? reduced : glide }
}
