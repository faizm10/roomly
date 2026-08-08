import Foundation
import PerchKit

func runCharacterTests() {
    TinyTest.suite("Character state machine") {
        TinyTest.test("arrives when a note opens and settles into idle") {
            var machine = CharacterStateMachine()
            TinyTest.equal(machine.state, .hidden)
            machine.handle(.noteOpened)
            TinyTest.equal(machine.state, .arriving)
            machine.handle(.arrivalFinished)
            TinyTest.equal(machine.state, .hangingIdle)
        }

        TinyTest.test("ignores events that do not apply to the current state") {
            var machine = CharacterStateMachine()
            TinyTest.equal(machine.handle(.textChanged), false)
            TinyTest.equal(machine.state, .hidden)
            TinyTest.equal(machine.handle(.dragBegan), false)
            TinyTest.equal(machine.handle(.arrivalFinished), false)
        }

        TinyTest.test("typing moves through watching and thinking back to idle") {
            var machine = CharacterStateMachine(state: .hangingIdle)
            machine.handle(.textChanged)
            TinyTest.equal(machine.state, .watchingTyping)
            machine.handle(.typingPauseElapsed)
            TinyTest.equal(machine.state, .thinking)
            machine.handle(.thinkingElapsed)
            TinyTest.equal(machine.state, .hangingIdle)
        }

        TinyTest.test("further keystrokes refresh the typing timer without re-entering") {
            var machine = CharacterStateMachine(state: .watchingTyping, now: Date(timeIntervalSince1970: 0))
            let changed = machine.handle(.textChanged, now: Date(timeIntervalSince1970: 5))
            TinyTest.equal(changed, false)
            TinyTest.equal(machine.state, .watchingTyping)
            TinyTest.equal(machine.enteredAt, Date(timeIntervalSince1970: 5))
        }

        TinyTest.test("falls asleep from idle and wakes on the next keystroke") {
            var machine = CharacterStateMachine(state: .hangingIdle)
            machine.handle(.sleepDelayElapsed)
            TinyTest.equal(machine.state, .sleeping)
            machine.handle(.textChanged)
            TinyTest.equal(machine.state, .waking)
            machine.handle(.wakeFinished)
            TinyTest.equal(machine.state, .watchingTyping)
        }

        TinyTest.test("does not fall asleep while dragging or celebrating") {
            for state in [CharacterState.noteDragging, .celebrating, .arriving, .climbingAway] {
                var machine = CharacterStateMachine(state: state)
                machine.handle(.sleepDelayElapsed)
                TinyTest.equal(machine.state, state, "state \(state.rawValue)")
            }
        }

        TinyTest.test("checklist completion celebrates, and a full list celebrates longer") {
            var machine = CharacterStateMachine(state: .hangingIdle)
            machine.handle(.checklistItemCompleted(allComplete: false))
            TinyTest.equal(machine.state, .celebrating)
            let short = machine.pendingTransition?.delay ?? 0

            var full = CharacterStateMachine(state: .hangingIdle)
            full.handle(.checklistItemCompleted(allComplete: true))
            let long = full.pendingTransition?.delay ?? 0
            TinyTest.expect(long > short, "a full list should celebrate longer (\(long) vs \(short))")

            machine.handle(.celebrationFinished)
            TinyTest.equal(machine.state, .hangingIdle)
        }

        TinyTest.test("drag and resize return to idle when the gesture ends") {
            var machine = CharacterStateMachine(state: .watchingTyping)
            machine.handle(.dragBegan)
            TinyTest.equal(machine.state, .noteDragging)
            TinyTest.expect(machine.pendingTransition == nil, "dragging must not time out on its own")
            machine.handle(.dragEnded)
            TinyTest.equal(machine.state, .hangingIdle)

            machine.handle(.resizeBegan)
            TinyTest.equal(machine.state, .noteResizing)
            machine.handle(.resizeEnded)
            TinyTest.equal(machine.state, .hangingIdle)
        }

        TinyTest.test("closing always climbs away before hiding") {
            for state in CharacterState.allCases where state != .hidden {
                var machine = CharacterStateMachine(state: state)
                machine.handle(.noteClosing)
                TinyTest.equal(machine.state, .climbingAway, "from \(state.rawValue)")
                machine.handle(.exitFinished)
                TinyTest.equal(machine.state, .hidden, "from \(state.rawValue)")
            }
        }

        TinyTest.test("poking wakes a sleeping character and delights an awake one") {
            var asleep = CharacterStateMachine(state: .sleeping)
            asleep.handle(.poked)
            TinyTest.equal(asleep.state, .waking)

            var awake = CharacterStateMachine(state: .hangingIdle)
            awake.handle(.poked)
            TinyTest.equal(awake.state, .celebrating)
        }

        TinyTest.test("only idle-like states schedule a sleep timer") {
            TinyTest.equal(CharacterStateMachine(state: .hangingIdle).pendingTransition?.event,
                           .sleepDelayElapsed)
            TinyTest.expect(CharacterStateMachine(state: .sleeping).pendingTransition == nil,
                            "sleeping is a resting state")
            TinyTest.expect(CharacterStateMachine(state: .hidden).pendingTransition == nil,
                            "hidden needs no timer")
        }

        TinyTest.test("the sleep delay follows the user's preference") {
            var prefs = CharacterPreferences()
            prefs.sleepingDelay = 25
            let timing = CharacterTiming.resolved(preferences: prefs, reduceMotion: false)
            TinyTest.close(timing.sleepDelay, 25)

            prefs.sleepingDelay = 1
            TinyTest.close(CharacterTiming.resolved(preferences: prefs, reduceMotion: false).sleepDelay, 5,
                           0.0001, "very small delays are clamped")
        }

        TinyTest.test("Reduce Motion shortens transitions but keeps the sleep delay") {
            var prefs = CharacterPreferences()
            prefs.sleepingDelay = 60
            let normal = CharacterTiming.resolved(preferences: prefs, reduceMotion: false)
            let reduced = CharacterTiming.resolved(preferences: prefs, reduceMotion: true)
            TinyTest.expect(reduced.arrival < normal.arrival, "arrival should be shorter")
            TinyTest.expect(reduced.exit < normal.exit, "exit should be shorter")
            TinyTest.close(reduced.sleepDelay, 60, 0.0001, "sleep delay is a user preference")
        }

        TinyTest.test("the menu-bar icon reflects open notes and reminders") {
            TinyTest.equal(CharacterStateMachine.menuBarState(openNoteCount: 0, hasDueReminder: false), .asleep)
            TinyTest.equal(CharacterStateMachine.menuBarState(openNoteCount: 2, hasDueReminder: false), .awake)
            TinyTest.equal(CharacterStateMachine.menuBarState(openNoteCount: 0, hasDueReminder: true), .alert)
        }
    }

    TinyTest.suite("Character poses") {
        TinyTest.test("every state resolves to a pose") {
            for state in CharacterState.allCases {
                let pose = CharacterPoseResolver.basePose(for: state)
                TinyTest.expect(pose.opacity >= 0 && pose.opacity <= 1,
                                "\(state.rawValue) opacity out of range")
            }
        }

        TinyTest.test("sleeping closes the eyes and watching opens them") {
            TinyTest.close(CharacterPoseResolver.basePose(for: .sleeping).eyelid, 1)
            TinyTest.close(CharacterPoseResolver.basePose(for: .watchingTyping).eyelid, 0)
        }

        TinyTest.test("hidden and climbing-away poses sit above the note edge") {
            TinyTest.close(CharacterPoseResolver.basePose(for: .hidden).descent, 0)
            TinyTest.close(CharacterPoseResolver.basePose(for: .climbingAway).descent, 0)
            TinyTest.close(CharacterPoseResolver.basePose(for: .hangingIdle).descent, 1)
        }

        TinyTest.test("animation intensity scales travel but not expression") {
            var lively = CharacterPreferences()
            lively.animationIntensity = .lively
            var minimal = CharacterPreferences()
            minimal.animationIntensity = .minimal

            let big = CharacterPoseResolver.resolvedPose(for: .celebrating, preferences: lively,
                                                          reduceMotion: false)
            let small = CharacterPoseResolver.resolvedPose(for: .celebrating, preferences: minimal,
                                                            reduceMotion: false)
            TinyTest.expect(abs(big.bodyRise) > abs(small.bodyRise),
                            "lively should travel further (\(big.bodyRise) vs \(small.bodyRise))")
            TinyTest.close(big.smile, small.smile, 0.0001, "expression is not scaled")
        }

        TinyTest.test("Reduce Motion removes travel while keeping the pose readable") {
            let prefs = CharacterPreferences()
            let normal = CharacterPoseResolver.resolvedPose(for: .celebrating, preferences: prefs,
                                                             reduceMotion: false)
            let reduced = CharacterPoseResolver.resolvedPose(for: .celebrating, preferences: prefs,
                                                              reduceMotion: true)
            TinyTest.expect(abs(reduced.bodyRise) < abs(normal.bodyRise),
                            "reduced motion should travel less")
            TinyTest.close(reduced.smile, normal.smile, 0.0001, "the smile still reads")

            let sleeping = CharacterPoseResolver.resolvedPose(for: .sleeping, preferences: prefs,
                                                               reduceMotion: true)
            TinyTest.close(sleeping.eyelid, 1, 0.0001, "closed eyes still communicate sleep")
        }

        TinyTest.test("quiet mode damps motion further") {
            var quiet = CharacterPreferences()
            quiet.quietMode = true
            let loud = CharacterPoseResolver.resolvedPose(for: .noteDragging,
                                                           preferences: CharacterPreferences(),
                                                           reduceMotion: false)
            let hushed = CharacterPoseResolver.resolvedPose(for: .noteDragging, preferences: quiet,
                                                             reduceMotion: false)
            TinyTest.expect(abs(hushed.bodySway) < abs(loud.bodySway), "quiet mode should sway less")
        }

        TinyTest.test("interpolates between two poses") {
            let a = CharacterPoseResolver.basePose(for: .hangingIdle)
            let b = CharacterPoseResolver.basePose(for: .celebrating)
            let mid = CharacterPose.lerp(a, b, 0.5)
            TinyTest.close(mid.bodyRise, (a.bodyRise + b.bodyRise) / 2)
            TinyTest.close(CharacterPose.lerp(a, b, 0).bodyRise, a.bodyRise)
            TinyTest.close(CharacterPose.lerp(a, b, 1).smile, b.smile)
        }
    }
}
