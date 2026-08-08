import Combine
import PerchKit
import SwiftUI

/// Drives one character instance: it owns the state machine, schedules exactly
/// one timer at a time for the next automatic transition, and exposes the pose
/// the renderer should settle into.
@MainActor
final class CharacterController: ObservableObject {
    @Published private(set) var state: CharacterState = .hidden
    @Published private(set) var pose: CharacterPose = CharacterPoseResolver.basePose(for: .hidden)
    @Published var blink: Double = 0
    /// True while this note's window is the key window. Idle motion is
    /// suspended otherwise, so background notes cost nothing.
    @Published var isWindowActive: Bool = false
    /// Extra sway fed by real window movement, in design points.
    @Published private(set) var dragImpulse: Double = 0

    var preferences: CharacterPreferences {
        didSet {
            guard preferences != oldValue else { return }
            machine.timing = CharacterTiming.resolved(preferences: preferences,
                                                      reduceMotion: reduceMotion)
            refreshPose()
            rescheduleTransition()
            restartBlinking()
        }
    }

    var reduceMotion: Bool {
        didSet {
            guard reduceMotion != oldValue else { return }
            machine.timing = CharacterTiming.resolved(preferences: preferences,
                                                      reduceMotion: reduceMotion)
            refreshPose()
            rescheduleTransition()
        }
    }

    /// Suspends every timer while the note's window is hidden or occluded.
    var isPaused: Bool = false {
        didSet {
            guard isPaused != oldValue else { return }
            if isPaused {
                transitionTimer?.invalidate()
                transitionTimer = nil
                blinkTimer?.invalidate()
                blinkTimer = nil
            } else {
                rescheduleTransition()
                restartBlinking()
            }
        }
    }

    /// Called when the character finishes climbing away, so the window can close.
    var onExitFinished: (() -> Void)?

    /// Toggles between hanging and peeking over the note edge.
    func togglePeek() {
        guard preferences.isEnabled, preferences.interactionEnabled else { return }
        isPeeking.toggle()
        refreshPose()
    }

    private var isPeeking = false
    /// True during the first beat of an arrival, when only the hands and the
    /// top of the head have cleared the note's edge.
    private var isArrivalPeek = false

    /// Arrival is staged rather than a single slide: hands and crest appear
    /// over the edge first, then the body drops and swings into place.
    private func beginArrival() {
        guard !reduceMotion else { return }
        isArrivalPeek = true
        let timer = Timer(timeInterval: machine.timing.arrival * 0.3, repeats: false) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.isArrivalPeek = false
                self.refreshPose()
            }
        }
        RunLoop.main.add(timer, forMode: .common)
    }

    private var machine: CharacterStateMachine
    private var transitionTimer: Timer?
    private var blinkTimer: Timer?
    private var dragDecayTimer: Timer?
    private var pointerGaze: CGVector = .zero

    init(preferences: CharacterPreferences, reduceMotion: Bool) {
        self.preferences = preferences
        self.reduceMotion = reduceMotion
        self.machine = CharacterStateMachine(
            timing: CharacterTiming.resolved(preferences: preferences, reduceMotion: reduceMotion)
        )
        refreshPose()
    }

    deinit {
        transitionTimer?.invalidate()
        blinkTimer?.invalidate()
        dragDecayTimer?.invalidate()
    }

    // MARK: - Events

    func send(_ event: CharacterEvent) {
        guard preferences.isEnabled || event == .noteClosing else { return }
        let changed = machine.handle(event)
        state = machine.state
        if changed {
            if machine.state == .arriving { beginArrival() }
            refreshPose()
            restartBlinking()
            if machine.state == .hidden { onExitFinished?() }
        }
        rescheduleTransition()
    }

    /// Reports real window movement so the body trails behind actual motion
    /// rather than playing a canned loop.
    func reportDragVelocity(dx: Double) {
        guard preferences.isEnabled, !reduceMotion else { return }
        let clamped = max(-26, min(26, dx))
        dragImpulse = -clamped * 0.55 * preferences.animationIntensity.amplitude
        scheduleDragDecay()
    }

    func reportPointer(unitX: Double, unitY: Double, inRange: Bool) {
        guard preferences.isEnabled, preferences.followsPointer, !reduceMotion else {
            pointerGaze = .zero
            return
        }
        pointerGaze = inRange
            ? CGVector(dx: max(-1, min(1, unitX)), dy: max(-1, min(1, unitY)))
            : .zero
        refreshPose()
    }

    // MARK: - Pose

    private func refreshPose() {
        var resolved = CharacterPoseResolver.resolvedPose(
            for: machine.state,
            preferences: preferences,
            reduceMotion: reduceMotion
        )
        resolved.bodySway += dragImpulse
        resolved.bodyRotation += dragImpulse * 0.22
        if isArrivalPeek {
            resolved.descent = 0.30
            resolved.browRaise = 0.7
            resolved.gazeY = 0.3
        }
        if isPeeking, machine.state.wantsIdleMotion {
            // Peeking pulls the whole rig up so only the head clears the edge.
            resolved.descent = min(resolved.descent, 0.26)
            resolved.browRaise = max(resolved.browRaise, 0.5)
        }

        // Gaze is additive so pointer-following never fights the base pose.
        if machine.state != .sleeping {
            resolved.gazeX = max(-1, min(1, resolved.gazeX + pointerGaze.dx * 0.8))
            resolved.gazeY = max(-1, min(1, resolved.gazeY + pointerGaze.dy * 0.7))
        }
        pose = resolved
    }

    private func rescheduleTransition() {
        transitionTimer?.invalidate()
        transitionTimer = nil
        guard !isPaused, preferences.isEnabled,
              let pending = machine.pendingTransition else { return }
        let timer = Timer(timeInterval: pending.delay, repeats: false) { [weak self] _ in
            Task { @MainActor in self?.send(pending.event) }
        }
        // Common modes keeps the timer alive while the user drags or scrolls.
        RunLoop.main.add(timer, forMode: .common)
        transitionTimer = timer
    }

    // MARK: - Idle life

    /// Blinking is a scheduled one-shot rather than a running animation loop,
    /// so an idle note costs essentially nothing.
    private func restartBlinking() {
        blinkTimer?.invalidate()
        blinkTimer = nil
        blink = 0
        guard !isPaused, isWindowActive, preferences.isEnabled, !reduceMotion,
              machine.state.wantsIdleMotion, machine.state != .sleeping else { return }

        let base: Double = preferences.quietMode ? 8.5 : 4.5
        let delay = base + Double.random(in: 0...3.5)
        let timer = Timer(timeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor in self?.performBlink() }
        }
        RunLoop.main.add(timer, forMode: .common)
        blinkTimer = timer
    }

    private func performBlink() {
        withAnimation(.easeIn(duration: 0.07)) { blink = 1 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            withAnimation(.easeOut(duration: 0.13)) { self?.blink = 0 }
            self?.restartBlinking()
        }
    }

    private func scheduleDragDecay() {
        dragDecayTimer?.invalidate()
        refreshPose()
        let timer = Timer(timeInterval: 0.12, repeats: false) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.dragImpulse = 0
                self.refreshPose()
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        dragDecayTimer = timer
    }

    var accessibilityDescription: String { state.accessibilityDescription }
}
