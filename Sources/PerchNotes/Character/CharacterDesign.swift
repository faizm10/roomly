import SwiftUI

/// The chosen character: **Nib**.
///
/// A small, round-shouldered studio creature with a pen-nib crest, long noodle
/// arms and wide-set eyes. The crest is the identity: it survives at menu-bar
/// size as a silhouette, it ties the creature to writing, and it gives the head
/// a direction to lean when the character thinks.
///
/// All geometry lives in one fixed design space, so poses are resolution
/// independent and the renderer only has to scale the whole rig to fit.
///
/// The layout is built around `gripLineY`, which is the note's top edge:
/// palms sit across it, fingers hang below it onto the paper, the crest pokes
/// above it, and everything else hangs beneath.
enum NibDesign {
    /// Design-space size. y grows downward.
    static let size = CGSize(width: 110, height: 142)
    /// The y coordinate of the note's top edge — the line the hands grip.
    static let gripLineY: CGFloat = 20
    /// How far the character hangs below the note edge at rest.
    static var hangDepth: CGFloat { size.height - gripLineY }

    // MARK: Hands

    /// Palms straddle the edge; only the part above it is ever visible,
    /// because the paper is drawn over the rest.
    static let palmSize = CGSize(width: 26, height: 17)
    static let leftPalm = CGPoint(x: 24, y: 12.5)
    static let rightPalm = CGPoint(x: 86, y: 12.5)
    /// Finger nubs, drawn in front of the paper so they curl onto the note.
    static let fingerCount = 3
    static let fingerSize = CGSize(width: 6, height: 14)
    static let fingerSpacing: CGFloat = 7.6
    /// Top of the fingers, just below the note edge.
    static let fingerTopY: CGFloat = 16.5

    // MARK: Arms

    static let leftArmTop = CGPoint(x: 24, y: 27)
    static let rightArmTop = CGPoint(x: 86, y: 27)
    static let leftShoulder = CGPoint(x: 34, y: 82)
    static let rightShoulder = CGPoint(x: 76, y: 82)
    static let armWidth: CGFloat = 10

    // MARK: Head

    static let headCenter = CGPoint(x: 55, y: 56)
    static let headRadius = CGSize(width: 23.5, height: 21.5)

    /// The nib crest: base across the top of the head, apex pointing up past
    /// the note edge.
    static let crestApex = CGPoint(x: 55, y: 2)
    static let crestBaseHalfWidth: CGFloat = 11
    static let crestBaseY: CGFloat = 36
    static let crestVent = CGPoint(x: 55, y: 22)
    static let crestVentRadius: CGFloat = 2.7

    static let leftEye = CGPoint(x: 46, y: 58)
    static let rightEye = CGPoint(x: 64, y: 58)
    static let eyeRadius = CGSize(width: 5.6, height: 7.2)
    static let pupilTravel = CGSize(width: 2.0, height: 2.4)

    static let mouth = CGPoint(x: 55, y: 69)
    static let leftBlush = CGPoint(x: 36, y: 65)
    static let rightBlush = CGPoint(x: 74, y: 65)

    // MARK: Body

    static let bodyTop: CGFloat = 68
    static let bodyBottom: CGFloat = 118
    static let bodyTopHalfWidth: CGFloat = 25
    static let bodyBottomHalfWidth: CGFloat = 21

    static let leftHip = CGPoint(x: 47, y: 114)
    static let rightHip = CGPoint(x: 63, y: 114)
    static let legLength: CGFloat = 21
    static let legWidth: CGFloat = 9
    static let footSize = CGSize(width: 14, height: 8.5)

    static let outlineWidth: CGFloat = 2.6

    /// How far the rig travels upward when it arrives or climbs away. It is
    /// deliberately less than the full hang depth: the character fades out as
    /// it goes, so it never needs more headroom than the note's top margin.
    static var exitLift: CGFloat { hangDepth * 0.75 }

    static func unitPoint(_ point: CGPoint) -> UnitPoint {
        UnitPoint(x: point.x / size.width, y: point.y / size.height)
    }
}

/// The character's own palette. It stays constant across note colours so the
/// creature reads as one object that visits different papers, and the dark
/// outline keeps it legible on light and dark paper alike.
struct NibPalette {
    var shell = Color(hex: 0xF2E6D2)
    var shellShade = Color(hex: 0xDCC9AB)
    var outline = Color(hex: 0x38302A)
    var crest = Color(hex: 0x33505F)
    var eye = Color(hex: 0x241F1C)
    var eyeGlint = Color(hex: 0xFFFFFF)
    var blush = Color(hex: 0xD08D77)
    var belly = Color(hex: 0xFBF5EA)

    static let standard = NibPalette()

    /// A slightly cooler, lower-contrast variant for dark paper so the
    /// creature does not glare.
    static let onDarkPaper: NibPalette = {
        var palette = NibPalette()
        palette.shell = Color(hex: 0xE4D8C3)
        palette.shellShade = Color(hex: 0xC9B99C)
        palette.belly = Color(hex: 0xEFE6D5)
        palette.outline = Color(hex: 0x272119)
        return palette
    }()

    static func resolved(paperIsDark: Bool) -> NibPalette {
        paperIsDark ? .onDarkPaper : .standard
    }
}

// MARK: - Shapes
//
// Every shape below draws in absolute design coordinates and is given the full
// character frame, so parts stay registered with each other no matter which
// modifiers are applied.

/// The nib crest, drawn as a symmetric quill point with a vent hole. This is
/// the silhouette that has to survive at 16 points in the menu bar.
struct CrestShape: Shape {
    var lean: CGFloat = 0

    var animatableData: CGFloat {
        get { lean }
        set { lean = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let center = NibDesign.crestApex.x
        let apex = CGPoint(x: center + lean, y: NibDesign.crestApex.y)
        let baseY = NibDesign.crestBaseY
        let half = NibDesign.crestBaseHalfWidth

        var path = Path()
        path.move(to: CGPoint(x: center - half, y: baseY))
        path.addQuadCurve(to: apex,
                          control: CGPoint(x: center - half * 0.85 + lean * 0.4, y: baseY - 20))
        path.addQuadCurve(to: CGPoint(x: center + half, y: baseY),
                          control: CGPoint(x: center + half * 0.85 + lean * 0.4, y: baseY - 20))
        path.closeSubpath()
        return path
    }
}

/// The torso: a soft, slightly tapered capsule with rounded shoulders.
struct TorsoShape: Shape {
    func path(in rect: CGRect) -> Path {
        let top = NibDesign.bodyTop
        let bottom = NibDesign.bodyBottom
        let topHalf = NibDesign.bodyTopHalfWidth
        let bottomHalf = NibDesign.bodyBottomHalfWidth
        let center = NibDesign.size.width / 2

        var path = Path()
        path.move(to: CGPoint(x: center - topHalf, y: top + 8))
        path.addQuadCurve(to: CGPoint(x: center + topHalf, y: top + 8),
                          control: CGPoint(x: center, y: top - 12))
        path.addCurve(to: CGPoint(x: center + bottomHalf, y: bottom - 8),
                      control1: CGPoint(x: center + topHalf + 2, y: top + 24),
                      control2: CGPoint(x: center + bottomHalf + 2, y: bottom - 22))
        path.addQuadCurve(to: CGPoint(x: center - bottomHalf, y: bottom - 8),
                          control: CGPoint(x: center, y: bottom + 12))
        path.addCurve(to: CGPoint(x: center - topHalf, y: top + 8),
                      control1: CGPoint(x: center - bottomHalf - 2, y: bottom - 22),
                      control2: CGPoint(x: center - topHalf - 2, y: top + 24))
        path.closeSubpath()
        return path
    }
}

/// A limb drawn as a rounded stroke from `from` to `to` with a gentle bow, so
/// arms and legs read as drawn rather than assembled from rectangles.
struct LimbShape: Shape {
    var from: CGPoint
    var to: CGPoint
    /// Sideways bow of the limb, in design points.
    var bow: CGFloat = 0

    var animatableData: AnimatablePair<AnimatablePair<CGFloat, CGFloat>, CGFloat> {
        get { AnimatablePair(AnimatablePair(to.x, to.y), bow) }
        set {
            to.x = newValue.first.first
            to.y = newValue.first.second
            bow = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        let mid = CGPoint(x: (from.x + to.x) / 2 + bow, y: (from.y + to.y) / 2)
        var path = Path()
        path.move(to: from)
        path.addQuadCurve(to: to, control: mid)
        return path
    }
}

/// The back of a hand, straddling the note edge.
struct PalmShape: Shape {
    var center: CGPoint
    var spread: CGFloat = 0

    var animatableData: CGFloat {
        get { spread }
        set { spread = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let size = NibDesign.palmSize
        let origin = CGPoint(x: center.x + spread - size.width / 2, y: center.y - size.height / 2)
        return Path(roundedRect: CGRect(origin: origin, size: size), cornerRadius: size.height / 2.4)
    }
}

/// Fingers curling down over the front of the paper.
struct FingersShape: Shape {
    var center: CGPoint
    var spread: CGFloat = 0
    /// 0 = straight, 1 = fully curled.
    var curl: CGFloat = 1

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(spread, curl) }
        set {
            spread = newValue.first
            curl = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let total = CGFloat(NibDesign.fingerCount - 1) * NibDesign.fingerSpacing
        let startX = center.x + spread - total / 2
        for index in 0..<NibDesign.fingerCount {
            // The middle finger reaches slightly further, as a real grip does.
            let lift = index == 1 ? CGFloat(1.6) : 0
            let height = NibDesign.fingerSize.height * (0.7 + 0.3 * curl) + lift
            let rect = CGRect(
                x: startX + CGFloat(index) * NibDesign.fingerSpacing - NibDesign.fingerSize.width / 2,
                y: NibDesign.fingerTopY,
                width: NibDesign.fingerSize.width,
                height: height
            )
            path.addRoundedRect(in: rect,
                                cornerSize: CGSize(width: NibDesign.fingerSize.width / 2,
                                                   height: NibDesign.fingerSize.width / 2))
        }
        return path
    }
}

/// The mouth: a flat line that curves into a smile.
struct MouthShape: Shape {
    var smile: CGFloat = 0

    var animatableData: CGFloat {
        get { smile }
        set { smile = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let width: CGFloat = 8 + 3.5 * smile
        let center = CGPoint(x: rect.midX, y: rect.midY)
        var path = Path()
        path.move(to: CGPoint(x: center.x - width / 2, y: center.y))
        path.addQuadCurve(to: CGPoint(x: center.x + width / 2, y: center.y),
                          control: CGPoint(x: center.x, y: center.y + 1.2 + 5.5 * smile))
        return path
    }
}
