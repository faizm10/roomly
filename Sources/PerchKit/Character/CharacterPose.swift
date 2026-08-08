import Foundation

/// Every number the renderer needs, in one flat struct. Views interpolate
/// between poses; they never compute personality themselves.
///
/// Units are points in the character's local space (see `CharacterMetrics`),
/// angles are degrees, and everything is relative to the resting hang.
public struct CharacterPose: Equatable, Sendable {
    /// Vertical offset of the whole body. Negative pulls it up toward the edge.
    public var bodyRise: Double = 0
    /// Horizontal lag of the body behind the hands, used while dragging.
    public var bodySway: Double = 0
    /// Rotation of the body around the grip point.
    public var bodyRotation: Double = 0
    /// Squash (<1) / stretch (>1) applied vertically to the torso.
    public var bodyStretch: Double = 1

    public var headTilt: Double = 0
    public var headOffsetX: Double = 0
    public var headOffsetY: Double = 0

    /// -1…1 gaze direction. Positive x looks right, positive y looks down.
    public var gazeX: Double = 0
    public var gazeY: Double = 0
    /// 0 = open, 1 = fully closed.
    public var eyelid: Double = 0
    /// Raises the outer brow line for interest / surprise.
    public var browRaise: Double = 0
    /// 0 = neutral mouth, 1 = happy.
    public var smile: Double = 0

    public var leftArmAngle: Double = 0
    public var rightArmAngle: Double = 0
    /// How far the hands have slid apart, used when adjusting grip.
    public var gripSpread: Double = 0

    public var leftLegAngle: Double = 6
    public var rightLegAngle: Double = -6

    /// 0 = fully above the note edge (hidden), 1 = fully hanging.
    public var descent: Double = 1
    /// Overall opacity, used only for Reduce Motion fades.
    public var opacity: Double = 1
    /// Crest lean, the small nib on the character's head.
    public var crestLean: Double = 0

    public init() {}

    /// Scales every motion value away from rest by `amount`.
    public func amplified(_ amount: Double) -> CharacterPose {
        var pose = self
        pose.bodyRise *= amount
        pose.bodySway *= amount
        pose.bodyRotation *= amount
        pose.bodyStretch = 1 + (bodyStretch - 1) * amount
        pose.headTilt *= amount
        pose.headOffsetX *= amount
        pose.headOffsetY *= amount
        pose.leftArmAngle *= amount
        pose.rightArmAngle *= amount
        pose.gripSpread *= amount
        pose.leftLegAngle = 6 + (leftLegAngle - 6) * amount
        pose.rightLegAngle = -6 + (rightLegAngle + 6) * amount
        pose.crestLean *= amount
        return pose
    }

    public static func lerp(_ a: CharacterPose, _ b: CharacterPose, _ t: Double) -> CharacterPose {
        func mix(_ x: Double, _ y: Double) -> Double { x + (y - x) * t }
        var pose = CharacterPose()
        pose.bodyRise = mix(a.bodyRise, b.bodyRise)
        pose.bodySway = mix(a.bodySway, b.bodySway)
        pose.bodyRotation = mix(a.bodyRotation, b.bodyRotation)
        pose.bodyStretch = mix(a.bodyStretch, b.bodyStretch)
        pose.headTilt = mix(a.headTilt, b.headTilt)
        pose.headOffsetX = mix(a.headOffsetX, b.headOffsetX)
        pose.headOffsetY = mix(a.headOffsetY, b.headOffsetY)
        pose.gazeX = mix(a.gazeX, b.gazeX)
        pose.gazeY = mix(a.gazeY, b.gazeY)
        pose.eyelid = mix(a.eyelid, b.eyelid)
        pose.browRaise = mix(a.browRaise, b.browRaise)
        pose.smile = mix(a.smile, b.smile)
        pose.leftArmAngle = mix(a.leftArmAngle, b.leftArmAngle)
        pose.rightArmAngle = mix(a.rightArmAngle, b.rightArmAngle)
        pose.gripSpread = mix(a.gripSpread, b.gripSpread)
        pose.leftLegAngle = mix(a.leftLegAngle, b.leftLegAngle)
        pose.rightLegAngle = mix(a.rightLegAngle, b.rightLegAngle)
        pose.descent = mix(a.descent, b.descent)
        pose.opacity = mix(a.opacity, b.opacity)
        pose.crestLean = mix(a.crestLean, b.crestLean)
        return pose
    }
}

/// Turns a state into the pose the character should settle into.
public enum CharacterPoseResolver {
    public static func basePose(for state: CharacterState) -> CharacterPose {
        var pose = CharacterPose()
        switch state {
        case .hidden:
            pose.descent = 0
            pose.opacity = 0
            pose.eyelid = 1

        case .arriving:
            // The settled end of the arrival; the animation drives descent.
            pose.descent = 1
            pose.browRaise = 0.35
            pose.smile = 0.25

        case .hangingIdle:
            pose.leftLegAngle = 7
            pose.rightLegAngle = -5

        case .watchingTyping:
            pose.bodyRise = -5
            pose.headOffsetY = 1.5
            pose.gazeY = 0.55
            pose.browRaise = 0.3
            pose.smile = 0.18
            pose.leftLegAngle = 3
            pose.rightLegAngle = -2

        case .thinking:
            pose.headTilt = -11
            pose.crestLean = -8
            pose.gazeX = 0.45
            pose.gazeY = -0.4
            pose.browRaise = 0.15
            pose.leftLegAngle = 14
            pose.rightLegAngle = -3

        case .sleeping:
            pose.eyelid = 1
            pose.bodyRise = 5
            pose.headTilt = -14
            pose.headOffsetX = -3
            pose.crestLean = -10
            pose.bodyStretch = 0.97
            pose.leftLegAngle = 3
            pose.rightLegAngle = -3
            pose.leftArmAngle = 4
            pose.rightArmAngle = -2

        case .waking:
            pose.eyelid = 0.35
            pose.browRaise = 0.5
            pose.headTilt = -4

        case .celebrating:
            pose.bodyRise = -14
            pose.bodyStretch = 1.06
            pose.smile = 1
            pose.browRaise = 0.6
            pose.gazeY = -0.2
            pose.leftLegAngle = 26
            pose.rightLegAngle = -18
            pose.crestLean = 4

        case .noteDragging:
            pose.bodySway = 10
            pose.bodyRotation = 5
            pose.leftLegAngle = 20
            pose.rightLegAngle = -14
            pose.browRaise = 0.4
            pose.gripSpread = 1.5

        case .noteResizing:
            pose.gripSpread = 3
            pose.bodyRise = -3
            pose.headTilt = 5
            pose.browRaise = 0.25

        case .climbingAway:
            pose.descent = 0
            // Fading as it rises means the exit never needs more headroom than
            // the note's transparent top margin.
            pose.opacity = 0
            pose.leftArmAngle = -12
            pose.rightArmAngle = 12
            pose.leftLegAngle = 22
            pose.rightLegAngle = -20

        case .menuBarIdle:
            pose.descent = 1
            pose.eyelid = 0.15
        }
        return pose
    }

    /// The pose actually handed to the renderer, after preferences and
    /// Reduce Motion are applied.
    public static func resolvedPose(for state: CharacterState,
                                    preferences: CharacterPreferences,
                                    reduceMotion: Bool) -> CharacterPose {
        var pose = basePose(for: state)
        var amplitude = preferences.animationIntensity.amplitude
        if preferences.quietMode { amplitude *= 0.7 }
        if reduceMotion { amplitude = min(amplitude, 0.35) }
        pose = pose.amplified(amplitude)
        if reduceMotion {
            // Keep readable expression changes, drop travel.
            pose.eyelid = basePose(for: state).eyelid
            pose.smile = basePose(for: state).smile
            pose.gazeX = basePose(for: state).gazeX
            pose.gazeY = basePose(for: state).gazeY
            pose.descent = basePose(for: state).descent
            pose.opacity = basePose(for: state).opacity
        }
        return pose
    }
}
