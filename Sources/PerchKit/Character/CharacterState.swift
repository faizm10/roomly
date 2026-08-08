import Foundation

/// Every pose the character can be in. The machine below is the only thing
/// allowed to change it, so animation code never has to guess.
public enum CharacterState: String, CaseIterable, Equatable, Sendable {
    case hidden
    case arriving
    case hangingIdle
    case watchingTyping
    case thinking
    case sleeping
    case waking
    case celebrating
    case noteDragging
    case noteResizing
    case climbingAway
    case menuBarIdle

    /// States that play once and then hand back to idle.
    public var isTransient: Bool {
        switch self {
        case .arriving, .waking, .celebrating, .climbingAway: return true
        default: return false
        }
    }

    /// Whether continuous idle motion (breathing, blinking) should run.
    public var wantsIdleMotion: Bool {
        switch self {
        case .hidden, .climbingAway, .menuBarIdle: return false
        default: return true
        }
    }

    public var accessibilityDescription: String {
        switch self {
        case .hidden: return "Character hidden"
        case .arriving: return "Character arriving"
        case .hangingIdle: return "Character hanging quietly"
        case .watchingTyping: return "Character watching you type"
        case .thinking: return "Character thinking"
        case .sleeping: return "Character sleeping"
        case .waking: return "Character waking up"
        case .celebrating: return "Character celebrating a finished task"
        case .noteDragging: return "Character swinging while the note moves"
        case .noteResizing: return "Character adjusting its grip"
        case .climbingAway: return "Character climbing away"
        case .menuBarIdle: return "Character resting in the menu bar"
        }
    }
}

public enum CharacterEvent: Equatable, Sendable {
    case noteOpened
    case arrivalFinished
    case textChanged
    case typingPauseElapsed
    case thinkingElapsed
    case sleepDelayElapsed
    case checklistItemCompleted(allComplete: Bool)
    case celebrationFinished
    case dragBegan
    case dragEnded
    case resizeBegan
    case resizeEnded
    case noteClosing
    case exitFinished
    case wakeFinished
    /// User poked the character directly.
    case poked
}

/// Timings, in seconds. Reduce Motion shortens the showy ones but never
/// changes which state the machine is in.
public struct CharacterTiming: Equatable, Sendable {
    public var arrival: Double = 1.15
    public var typingPause: Double = 1.4
    public var thinkingHold: Double = 5.0
    public var sleepDelay: Double = 90
    public var celebration: Double = 0.85
    public var fullCelebration: Double = 1.5
    public var wake: Double = 0.9
    public var exit: Double = 0.55
    public var settleAfterDrag: Double = 0.7

    public init() {}

    public static func resolved(preferences: CharacterPreferences, reduceMotion: Bool) -> CharacterTiming {
        var timing = CharacterTiming()
        timing.sleepDelay = max(5, preferences.sleepingDelay)
        if preferences.quietMode {
            timing.typingPause = 1.0
            timing.thinkingHold = 3.0
        }
        if reduceMotion {
            timing.arrival = 0.28
            timing.celebration = 0.3
            timing.fullCelebration = 0.4
            timing.wake = 0.25
            timing.exit = 0.2
            timing.settleAfterDrag = 0.2
        }
        return timing
    }
}

/// An explicit state machine. Transitions are pure and event-driven; the only
/// time-based behaviour is exposed through `pendingTransition`, so the app can
/// schedule exactly one timer instead of polling.
public struct CharacterStateMachine: Equatable, Sendable {
    public private(set) var state: CharacterState
    public private(set) var enteredAt: Date
    /// True while every checklist item is done, which upgrades celebrations.
    public private(set) var lastCelebrationWasFull: Bool = false
    public var timing: CharacterTiming

    /// The state to fall back to when a transient animation completes.
    private var restingState: CharacterState = .hangingIdle

    public init(state: CharacterState = .hidden,
                timing: CharacterTiming = CharacterTiming(),
                now: Date = Date()) {
        self.state = state
        self.timing = timing
        self.enteredAt = now
    }

    /// Applies an event. Returns true when the state actually changed.
    @discardableResult
    public mutating func handle(_ event: CharacterEvent, now: Date = Date()) -> Bool {
        let next = destination(for: event)
        guard let next, next != state else {
            // Re-entering watchingTyping on every keystroke should refresh the
            // timer without counting as a change.
            if next == state, state == .watchingTyping, event == .textChanged {
                enteredAt = now
            }
            return false
        }
        if next == .celebrating, case let .checklistItemCompleted(all) = event {
            lastCelebrationWasFull = all
        }
        state = next
        enteredAt = now
        return true
    }

    private func destination(for event: CharacterEvent) -> CharacterState? {
        switch event {
        case .noteOpened:
            return state == .hidden || state == .climbingAway ? .arriving : nil

        case .arrivalFinished:
            return state == .arriving ? .hangingIdle : nil

        case .textChanged:
            switch state {
            case .hidden, .arriving, .climbingAway, .menuBarIdle:
                return nil
            case .sleeping:
                return .waking
            default:
                return .watchingTyping
            }

        case .typingPauseElapsed:
            return state == .watchingTyping ? .thinking : nil

        case .thinkingElapsed:
            return state == .thinking ? .hangingIdle : nil

        case .sleepDelayElapsed:
            switch state {
            case .hangingIdle, .thinking, .watchingTyping:
                return .sleeping
            default:
                return nil
            }

        case .checklistItemCompleted:
            switch state {
            case .hidden, .arriving, .climbingAway, .menuBarIdle:
                return nil
            default:
                return .celebrating
            }

        case .celebrationFinished:
            return state == .celebrating ? .hangingIdle : nil

        case .wakeFinished:
            return state == .waking ? .watchingTyping : nil

        case .dragBegan:
            switch state {
            case .hidden, .arriving, .climbingAway, .menuBarIdle:
                return nil
            default:
                return .noteDragging
            }

        case .dragEnded:
            return state == .noteDragging ? .hangingIdle : nil

        case .resizeBegan:
            switch state {
            case .hidden, .arriving, .climbingAway, .menuBarIdle:
                return nil
            default:
                return .noteResizing
            }

        case .resizeEnded:
            return state == .noteResizing ? .hangingIdle : nil

        case .noteClosing:
            return state == .hidden ? nil : .climbingAway

        case .exitFinished:
            return state == .climbingAway ? .hidden : nil

        case .poked:
            switch state {
            case .sleeping: return .waking
            case .hangingIdle, .thinking, .watchingTyping: return .celebrating
            default: return nil
            }
        }
    }

    /// The next automatic transition, if any: when it should fire and what to
    /// send. Callers schedule a single timer for this and nothing else.
    public var pendingTransition: (delay: Double, event: CharacterEvent)? {
        switch state {
        case .arriving: return (timing.arrival, .arrivalFinished)
        case .watchingTyping: return (timing.typingPause, .typingPauseElapsed)
        case .thinking: return (timing.thinkingHold, .thinkingElapsed)
        case .hangingIdle: return (timing.sleepDelay, .sleepDelayElapsed)
        case .celebrating:
            return (lastCelebrationWasFull ? timing.fullCelebration : timing.celebration, .celebrationFinished)
        case .waking: return (timing.wake, .wakeFinished)
        case .climbingAway: return (timing.exit, .exitFinished)
        case .noteDragging, .noteResizing, .sleeping, .hidden, .menuBarIdle:
            return nil
        }
    }

    /// Convenience for the menu-bar icon: the icon sleeps when nothing is open.
    public static func menuBarState(openNoteCount: Int, hasDueReminder: Bool) -> MenuBarCharacterState {
        if hasDueReminder { return .alert }
        return openNoteCount > 0 ? .awake : .asleep
    }
}

public enum MenuBarCharacterState: String, Equatable, Sendable {
    case awake
    case asleep
    case alert
}
