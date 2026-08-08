import SwiftUI

/// The three character directions explored before settling on Nib. They are
/// kept as vector sketches in the Character Lab so the decision stays visible
/// and reviewable, rather than being lost in a design file.
enum CharacterDirection: String, CaseIterable, Identifiable {
    case nib
    case sprig
    case blot

    var id: String { rawValue }

    var title: String {
        switch self {
        case .nib: return "Nib"
        case .sprig: return "Sprig"
        case .blot: return "Blot"
        }
    }

    var pitch: String {
        switch self {
        case .nib:
            return "Round-shouldered studio creature with a pen-nib crest and long noodle arms."
        case .sprig:
            return "Tall seed-pod sprite with a single leaf and stilt legs."
        case .blot:
            return "Heavy ink-drop with a flat top, drip tail and hooded eyes."
        }
    }

    var verdict: String {
        switch self {
        case .nib:
            return "Chosen. The crest is a silhouette that survives at 16 pt, it names the creature, it points where the head leans, and the long arms make hanging read instantly."
        case .sprig:
            return "The leaf reads as a plant, not a writing companion, and the thin stalk body disappears at menu-bar size."
        case .blot:
            return "Handsome at large sizes, but the drop shape is close to a generic blob and gives the head nowhere to tilt."
        }
    }
}

/// A flat vector sketch of one direction, drawn at a fixed 120×150 scale.
struct DirectionSketch: View {
    let direction: CharacterDirection

    private let ink = Color(hex: 0x38302A)
    private let shell = Color(hex: 0xF2E6D2)

    var body: some View {
        Canvas { context, size in
            let scale = min(size.width / 120, size.height / 150)
            context.scaleBy(x: scale, y: scale)
            switch direction {
            case .nib: drawNib(&context)
            case .sprig: drawSprig(&context)
            case .blot: drawBlot(&context)
            }
        }
    }

    private func stroke(_ context: inout GraphicsContext, _ path: Path,
                        fill: Color, width: CGFloat = 2.6) {
        context.fill(path, with: .color(fill))
        context.stroke(path, with: .color(ink), lineWidth: width)
    }

    private func drawNib(_ context: inout GraphicsContext) {
        // Arms reaching up to a grip line.
        var arms = Path()
        arms.move(to: CGPoint(x: 30, y: 30))
        arms.addQuadCurve(to: CGPoint(x: 46, y: 74), control: CGPoint(x: 30, y: 56))
        arms.move(to: CGPoint(x: 90, y: 30))
        arms.addQuadCurve(to: CGPoint(x: 74, y: 74), control: CGPoint(x: 90, y: 56))
        context.stroke(arms, with: .color(ink), style: StrokeStyle(lineWidth: 11, lineCap: .round))
        context.stroke(arms, with: .color(shell), style: StrokeStyle(lineWidth: 7.5, lineCap: .round))

        var legs = Path()
        legs.move(to: CGPoint(x: 51, y: 112))
        legs.addLine(to: CGPoint(x: 47, y: 134))
        legs.move(to: CGPoint(x: 69, y: 112))
        legs.addLine(to: CGPoint(x: 74, y: 133))
        context.stroke(legs, with: .color(ink), style: StrokeStyle(lineWidth: 10, lineCap: .round))
        context.stroke(legs, with: .color(shell), style: StrokeStyle(lineWidth: 6.5, lineCap: .round))

        stroke(&context, Path(roundedRect: CGRect(x: 38, y: 74, width: 44, height: 44),
                              cornerRadius: 20), fill: shell)

        var crest = Path()
        crest.move(to: CGPoint(x: 48, y: 46))
        crest.addQuadCurve(to: CGPoint(x: 60, y: 14), control: CGPoint(x: 51, y: 26))
        crest.addQuadCurve(to: CGPoint(x: 72, y: 46), control: CGPoint(x: 69, y: 26))
        crest.closeSubpath()
        stroke(&context, crest, fill: Color(hex: 0x33505F))

        stroke(&context, Path(ellipseIn: CGRect(x: 33, y: 42, width: 54, height: 48)), fill: shell)
        context.fill(Path(ellipseIn: CGRect(x: 46, y: 58, width: 10, height: 13)), with: .color(ink))
        context.fill(Path(ellipseIn: CGRect(x: 64, y: 58, width: 10, height: 13)), with: .color(ink))

        // Hands over the grip line.
        stroke(&context, Path(roundedRect: CGRect(x: 18, y: 20, width: 26, height: 20),
                              cornerRadius: 9), fill: shell)
        stroke(&context, Path(roundedRect: CGRect(x: 76, y: 20, width: 26, height: 20),
                              cornerRadius: 9), fill: shell)
    }

    private func drawSprig(_ context: inout GraphicsContext) {
        var arms = Path()
        arms.move(to: CGPoint(x: 32, y: 30))
        arms.addQuadCurve(to: CGPoint(x: 52, y: 78), control: CGPoint(x: 34, y: 58))
        arms.move(to: CGPoint(x: 88, y: 30))
        arms.addQuadCurve(to: CGPoint(x: 68, y: 78), control: CGPoint(x: 86, y: 58))
        context.stroke(arms, with: .color(ink), style: StrokeStyle(lineWidth: 8, lineCap: .round))
        context.stroke(arms, with: .color(Color(hex: 0xC9D6B4)),
                       style: StrokeStyle(lineWidth: 4.5, lineCap: .round))

        var legs = Path()
        legs.move(to: CGPoint(x: 54, y: 116))
        legs.addLine(to: CGPoint(x: 50, y: 142))
        legs.move(to: CGPoint(x: 66, y: 116))
        legs.addLine(to: CGPoint(x: 71, y: 142))
        context.stroke(legs, with: .color(ink), style: StrokeStyle(lineWidth: 6, lineCap: .round))

        // Seed-pod body.
        var pod = Path()
        pod.move(to: CGPoint(x: 60, y: 36))
        pod.addCurve(to: CGPoint(x: 60, y: 118),
                     control1: CGPoint(x: 92, y: 54), control2: CGPoint(x: 88, y: 118))
        pod.addCurve(to: CGPoint(x: 60, y: 36),
                     control1: CGPoint(x: 32, y: 118), control2: CGPoint(x: 28, y: 54))
        stroke(&context, pod, fill: Color(hex: 0xE7EEDA))

        var leaf = Path()
        leaf.move(to: CGPoint(x: 60, y: 38))
        leaf.addQuadCurve(to: CGPoint(x: 88, y: 12), control: CGPoint(x: 84, y: 34))
        leaf.addQuadCurve(to: CGPoint(x: 60, y: 38), control: CGPoint(x: 70, y: 24))
        stroke(&context, leaf, fill: Color(hex: 0x8FAE74), width: 2.2)

        context.fill(Path(ellipseIn: CGRect(x: 47, y: 66, width: 9, height: 12)), with: .color(ink))
        context.fill(Path(ellipseIn: CGRect(x: 64, y: 66, width: 9, height: 12)), with: .color(ink))
    }

    private func drawBlot(_ context: inout GraphicsContext) {
        var arms = Path()
        arms.move(to: CGPoint(x: 26, y: 30))
        arms.addQuadCurve(to: CGPoint(x: 44, y: 82), control: CGPoint(x: 24, y: 60))
        arms.move(to: CGPoint(x: 94, y: 30))
        arms.addQuadCurve(to: CGPoint(x: 76, y: 82), control: CGPoint(x: 96, y: 60))
        context.stroke(arms, with: .color(Color(hex: 0x2A2740)),
                       style: StrokeStyle(lineWidth: 10, lineCap: .round))

        // Ink drop: flat top, round belly, drip tail.
        var drop = Path()
        drop.move(to: CGPoint(x: 32, y: 40))
        drop.addLine(to: CGPoint(x: 88, y: 40))
        drop.addCurve(to: CGPoint(x: 62, y: 128),
                      control1: CGPoint(x: 96, y: 86), control2: CGPoint(x: 78, y: 112))
        drop.addQuadCurve(to: CGPoint(x: 58, y: 128), control: CGPoint(x: 60, y: 140))
        drop.addCurve(to: CGPoint(x: 32, y: 40),
                      control1: CGPoint(x: 42, y: 112), control2: CGPoint(x: 24, y: 86))
        drop.closeSubpath()
        stroke(&context, drop, fill: Color(hex: 0x4A4668))

        context.fill(Path(ellipseIn: CGRect(x: 42, y: 62, width: 14, height: 16)),
                     with: .color(Color(hex: 0xF4F1E6)))
        context.fill(Path(ellipseIn: CGRect(x: 64, y: 62, width: 14, height: 16)),
                     with: .color(Color(hex: 0xF4F1E6)))
        context.fill(Path(ellipseIn: CGRect(x: 47, y: 68, width: 7, height: 8)), with: .color(ink))
        context.fill(Path(ellipseIn: CGRect(x: 69, y: 68, width: 7, height: 8)), with: .color(ink))

        // Hooded lids.
        var lids = Path()
        lids.addRect(CGRect(x: 40, y: 58, width: 40, height: 8))
        context.fill(lids, with: .color(Color(hex: 0x4A4668)))
    }
}
