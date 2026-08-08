import PerchKit
import SwiftUI

/// Which side of the note's paper a layer is drawn on.
///
/// Splitting the character in two is what makes the grip believable: the back
/// of each hand is drawn *behind* the paper, so only the part above the note's
/// edge is visible, and the fingers are drawn *in front* of it, curling down
/// onto the note. The edge genuinely passes through the hands.
enum CharacterLayer {
    case behindPaper
    case inFrontOfPaper
}

/// The rigged renderer for **Nib**. Every part is positioned from `NibDesign`
/// and moved by a single `CharacterPose`, so animation code never touches
/// geometry and geometry never decides personality.
struct NibCharacterView: View {
    var pose: CharacterPose
    var layer: CharacterLayer
    var paperIsDark: Bool
    /// 0 = eyes open, 1 = mid-blink.
    var blink: Double = 0

    private var palette: NibPalette { NibPalette.resolved(paperIsDark: paperIsDark) }

    /// How far the whole rig sits above its hanging position (arrival, exit).
    private var descentOffset: CGFloat {
        -(1 - CGFloat(pose.descent)) * NibDesign.exitLift
    }

    /// Body motion, applied to everything below the wrists.
    ///
    /// Breathing is deliberately *not* part of this — see `BreathingModifier`,
    /// which applies it as a transform outside the rig so an idle note costs
    /// no CPU at all.
    private var bodyOffset: CGSize {
        CGSize(width: CGFloat(pose.bodySway), height: CGFloat(pose.bodyRise))
    }

    private var headOffset: CGSize {
        CGSize(width: bodyOffset.width + CGFloat(pose.headOffsetX),
               height: bodyOffset.height + CGFloat(pose.headOffsetY))
    }

    private var spread: CGFloat { CGFloat(pose.gripSpread) }

    private var gripUnit: UnitPoint {
        NibDesign.unitPoint(CGPoint(x: NibDesign.size.width / 2, y: NibDesign.gripLineY))
    }

    private var headUnit: UnitPoint {
        NibDesign.unitPoint(CGPoint(x: NibDesign.headCenter.x, y: NibDesign.headCenter.y + 16))
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            switch layer {
            case .behindPaper:
                palms
            case .inFrontOfPaper:
                contactShadow
                arms
                legs
                torso
                crest
                head
                face
                fingers
            }
        }
        .frame(width: NibDesign.size.width, height: NibDesign.size.height, alignment: .topLeading)
        .offset(y: descentOffset)
        .opacity(pose.opacity)
        // Rasterising the rig is what makes idle cost nothing: the breathing
        // transform is then applied to a cached texture instead of re-drawing
        // roughly thirty stroked vector shapes on every frame.
        .drawingGroup()
    }

    // MARK: - Hands
    //
    // Palms live behind the paper and fingers in front of it, at exactly the
    // same coordinates, so the two halves always line up.

    private var palms: some View {
        ZStack(alignment: .topLeading) {
            filled(PalmShape(center: NibDesign.leftPalm, spread: -spread))
            filled(PalmShape(center: NibDesign.rightPalm, spread: spread))
            // Knuckle creases, so the palm reads as gripping rather than resting.
            knuckles(at: NibDesign.leftPalm, spread: -spread)
            knuckles(at: NibDesign.rightPalm, spread: spread)
        }
    }

    private func knuckles(at point: CGPoint, spread: CGFloat) -> some View {
        Capsule()
            .fill(palette.outline.opacity(0.28))
            .frame(width: NibDesign.palmSize.width * 0.52, height: 1.5)
            .position(x: point.x + spread, y: point.y - 2.5)
    }

    private var fingers: some View {
        ZStack(alignment: .topLeading) {
            // A whisper of shadow under the fingers sells the contact.
            FingersShape(center: NibDesign.leftPalm, spread: -spread)
                .fill(Color.black.opacity(paperIsDark ? 0.42 : 0.26))
                .blur(radius: 3)
                .offset(x: 1.5, y: 3)
            FingersShape(center: NibDesign.rightPalm, spread: spread)
                .fill(Color.black.opacity(paperIsDark ? 0.42 : 0.26))
                .blur(radius: 3)
                .offset(x: 1.5, y: 3)
            filled(FingersShape(center: NibDesign.leftPalm, spread: -spread))
            filled(FingersShape(center: NibDesign.rightPalm, spread: spread))
        }
    }

    // MARK: - Body

    /// A very soft shadow cast onto the paper. Most of what makes the character
    /// feel attached rather than pasted on comes from this one shape.
    private var contactShadow: some View {
        Ellipse()
            .fill(Color.black.opacity(paperIsDark ? 0.22 : 0.14))
            .frame(width: 58, height: 74)
            .blur(radius: 12)
            .offset(x: 5 + bodyOffset.width * 0.5, y: 8 + bodyOffset.height * 0.35)
            .position(x: NibDesign.size.width / 2, y: 88)
            .allowsHitTesting(false)
    }

    private var arms: some View {
        ZStack(alignment: .topLeading) {
            arm(top: NibDesign.leftArmTop, shoulder: NibDesign.leftShoulder,
                spread: -spread, bow: -9, angle: pose.leftArmAngle)
            arm(top: NibDesign.rightArmTop, shoulder: NibDesign.rightShoulder,
                spread: spread, bow: 9, angle: pose.rightArmAngle)
        }
    }

    private func arm(top: CGPoint, shoulder: CGPoint, spread: CGFloat, bow: CGFloat,
                     angle: Double) -> some View {
        let start = CGPoint(x: top.x + spread, y: top.y)
        let end = CGPoint(x: shoulder.x + bodyOffset.width, y: shoulder.y + bodyOffset.height)
        // The arm bows away from the direction of travel, which is what makes
        // the body look like it is trailing the hands.
        let shape = LimbShape(from: start, to: end, bow: bow - CGFloat(pose.bodySway) * 0.35)
        return ZStack(alignment: .topLeading) {
            shape.stroke(palette.outline,
                         style: StrokeStyle(lineWidth: NibDesign.armWidth + NibDesign.outlineWidth,
                                            lineCap: .round))
            shape.stroke(palette.shell,
                         style: StrokeStyle(lineWidth: NibDesign.armWidth, lineCap: .round))
        }
        .rotationEffect(.degrees(angle * 0.4), anchor: NibDesign.unitPoint(start))
    }

    private var legs: some View {
        ZStack(alignment: .topLeading) {
            leg(hip: NibDesign.leftHip, angle: pose.leftLegAngle, bow: -2)
            leg(hip: NibDesign.rightHip, angle: pose.rightLegAngle, bow: 2)
        }
        .offset(bodyOffset)
        .rotationEffect(.degrees(pose.bodyRotation), anchor: gripUnit)
    }

    private func leg(hip: CGPoint, angle: Double, bow: CGFloat) -> some View {
        let radians = CGFloat(angle) * .pi / 180
        let foot = CGPoint(x: hip.x + sin(radians) * NibDesign.legLength,
                           y: hip.y + cos(radians) * NibDesign.legLength)
        let shape = LimbShape(from: hip, to: foot, bow: bow)
        return ZStack(alignment: .topLeading) {
            shape.stroke(palette.outline,
                         style: StrokeStyle(lineWidth: NibDesign.legWidth + NibDesign.outlineWidth,
                                            lineCap: .round))
            shape.stroke(palette.shell,
                         style: StrokeStyle(lineWidth: NibDesign.legWidth, lineCap: .round))
            Ellipse()
                .fill(palette.shellShade)
                .overlay(Ellipse().strokeBorder(palette.outline, lineWidth: NibDesign.outlineWidth))
                .frame(width: NibDesign.footSize.width, height: NibDesign.footSize.height)
                .rotationEffect(.degrees(angle * 0.55))
                .position(x: foot.x + sin(radians) * 2.5, y: foot.y + 2)
        }
    }

    private var torso: some View {
        ZStack(alignment: .topLeading) {
            TorsoShape()
                .fill(
                    LinearGradient(colors: [palette.belly, palette.shell],
                                   startPoint: .top, endPoint: .bottom)
                )
            TorsoShape().stroke(palette.outline, lineWidth: NibDesign.outlineWidth)
        }
        .scaleEffect(x: 1 / CGFloat(pose.bodyStretch).squareRootSafe,
                     y: CGFloat(pose.bodyStretch),
                     anchor: UnitPoint(x: 0.5, y: NibDesign.bodyTop / NibDesign.size.height))
        .offset(bodyOffset)
        .rotationEffect(.degrees(pose.bodyRotation), anchor: gripUnit)
    }

    private var crest: some View {
        ZStack(alignment: .topLeading) {
            CrestShape(lean: CGFloat(pose.crestLean))
                .fill(palette.crest)
                .overlay(
                    CrestShape(lean: CGFloat(pose.crestLean))
                        .stroke(palette.outline, lineWidth: NibDesign.outlineWidth)
                )
            // The nib's slit and vent hole: the detail that names the creature.
            Path { path in
                path.move(to: CGPoint(x: NibDesign.crestApex.x + CGFloat(pose.crestLean) * 0.75,
                                      y: NibDesign.crestApex.y + 6))
                path.addLine(to: NibDesign.crestVent)
            }
            .stroke(palette.shell.opacity(0.85), lineWidth: 1.7)
            Circle()
                .fill(palette.shell.opacity(0.85))
                .frame(width: NibDesign.crestVentRadius * 2, height: NibDesign.crestVentRadius * 2)
                .position(NibDesign.crestVent)
        }
        .rotationEffect(.degrees(pose.headTilt), anchor: headUnit)
        .offset(headOffset)
        .rotationEffect(.degrees(pose.bodyRotation), anchor: gripUnit)
    }

    private var head: some View {
        Ellipse()
            .fill(palette.shell)
            .overlay(Ellipse().strokeBorder(palette.outline, lineWidth: NibDesign.outlineWidth))
            .frame(width: NibDesign.headRadius.width * 2, height: NibDesign.headRadius.height * 2)
            .position(NibDesign.headCenter)
            .rotationEffect(.degrees(pose.headTilt), anchor: headUnit)
            .offset(headOffset)
            .rotationEffect(.degrees(pose.bodyRotation), anchor: gripUnit)
    }

    // MARK: - Face

    private var face: some View {
        ZStack(alignment: .topLeading) {
            blush(at: NibDesign.leftBlush)
            blush(at: NibDesign.rightBlush)
            eye(at: NibDesign.leftEye)
            eye(at: NibDesign.rightEye)
            MouthShape(smile: CGFloat(pose.smile))
                .stroke(palette.outline, style: StrokeStyle(lineWidth: 1.9, lineCap: .round))
                .frame(width: 20, height: 12)
                .position(x: NibDesign.mouth.x, y: NibDesign.mouth.y + CGFloat(pose.gazeY) * 0.9)
            brow(at: NibDesign.leftEye, flip: false)
            brow(at: NibDesign.rightEye, flip: true)
        }
        .rotationEffect(.degrees(pose.headTilt), anchor: headUnit)
        .offset(headOffset)
        .rotationEffect(.degrees(pose.bodyRotation), anchor: gripUnit)
    }

    private var closedAmount: CGFloat { min(1, max(CGFloat(pose.eyelid), CGFloat(blink))) }

    private func eye(at center: CGPoint) -> some View {
        let width = NibDesign.eyeRadius.width * 2
        let height = NibDesign.eyeRadius.height * 2
        let open = 1 - closedAmount
        return ZStack {
            // The eye is masked by its own outline shape, so a half-closed lid
            // reads as a lid rather than a floating rectangle.
            Ellipse()
                .fill(palette.eye)
                .frame(width: width, height: height * open)
                .offset(y: height * (1 - open) / 2)
            Circle()
                .fill(palette.eyeGlint.opacity(0.92))
                .frame(width: 2.5, height: 2.5)
                .offset(x: -1.5 + CGFloat(pose.gazeX) * NibDesign.pupilTravel.width,
                        y: -1.8 + CGFloat(pose.gazeY) * NibDesign.pupilTravel.height)
                .opacity(open > 0.55 ? 1 : 0)
            // A closed eye keeps a lash line so the expression still reads.
            Capsule()
                .fill(palette.outline)
                .frame(width: width * 0.92, height: 1.8)
                .opacity(closedAmount > 0.6 ? 1 : 0)
        }
        .frame(width: width, height: height)
        .offset(x: CGFloat(pose.gazeX) * NibDesign.pupilTravel.width * 0.55,
                y: CGFloat(pose.gazeY) * NibDesign.pupilTravel.height * 0.55)
        .position(center)
    }

    private func brow(at eye: CGPoint, flip: Bool) -> some View {
        Capsule()
            .fill(palette.outline.opacity(0.65))
            .frame(width: 8, height: 1.9)
            .rotationEffect(.degrees(flip ? 10 : -10))
            .position(x: eye.x, y: eye.y - 11 - CGFloat(pose.browRaise) * 2)
            .opacity(min(1, pose.browRaise * 1.5))
    }

    private func blush(at point: CGPoint) -> some View {
        Ellipse()
            .fill(palette.blush.opacity(0.30 + pose.smile * 0.22))
            .frame(width: 10, height: 5)
            .position(point)
    }

    // MARK: - Helpers

    /// Fills a shape in shell colour with the character's outline weight.
    private func filled(_ shape: some Shape) -> some View {
        ZStack(alignment: .topLeading) {
            shape.fill(palette.shell)
            shape.stroke(palette.outline, lineWidth: NibDesign.outlineWidth)
        }
    }
}

private extension CGFloat {
    /// Square root that tolerates the tiny negative values a spring can
    /// overshoot into, used to keep squash-and-stretch volume-preserving.
    var squareRootSafe: CGFloat { self > 0.01 ? sqrt(self) : 1 }
}
