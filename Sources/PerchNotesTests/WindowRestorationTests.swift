import Foundation
import PerchKit

func runWindowRestorationTests() {
    // A 1920×1080 main display with a second display to its right.
    let main = StoredFrame(x: 0, y: 0, width: 1920, height: 1080)
    let secondary = StoredFrame(x: 1920, y: 200, width: 1440, height: 900)
    let defaultSize = StoredFrame(x: 0, y: 0, width: 380, height: 440)

    TinyTest.suite("Window restoration") {
        TinyTest.test("keeps a frame that is already fully visible") {
            let stored = StoredFrame(x: 300, y: 300, width: 380, height: 440)
            let restored = WindowRestoration.restoredFrame(for: stored, screens: [main],
                                                           defaultSize: defaultSize)
            TinyTest.equal(restored, stored)
        }

        TinyTest.test("restores onto a secondary display when the note lived there") {
            let stored = StoredFrame(x: 2100, y: 400, width: 380, height: 440)
            let restored = WindowRestoration.restoredFrame(for: stored, screens: [main, secondary],
                                                           defaultSize: defaultSize)
            TinyTest.equal(restored, stored)
        }

        TinyTest.test("recentres a note whose display was unplugged") {
            let stored = StoredFrame(x: 2100, y: 400, width: 380, height: 440)
            let restored = WindowRestoration.restoredFrame(for: stored, screens: [main],
                                                           defaultSize: defaultSize)
            TinyTest.close(restored.x, (1920 - 380) / 2, 0.5, "x")
            TinyTest.close(restored.y, (1080 - 440) / 2, 0.5, "y")
        }

        TinyTest.test("pulls a mostly-offscreen note back into view") {
            let stored = StoredFrame(x: 1850, y: 900, width: 380, height: 440)
            let restored = WindowRestoration.restoredFrame(for: stored, screens: [main],
                                                           defaultSize: defaultSize)
            TinyTest.expect(restored.maxX <= main.maxX + 0.001,
                            "right edge \(restored.maxX) should be on screen")
            TinyTest.expect(restored.maxY <= main.maxY + 0.001,
                            "top edge \(restored.maxY) should be on screen")
            TinyTest.expect(restored.x >= main.x, "left edge should be on screen")
        }

        TinyTest.test("never leaves a window with no grabbable area below the top") {
            let stored = StoredFrame(x: 100, y: 1070, width: 380, height: 440)
            let restored = WindowRestoration.restoredFrame(for: stored, screens: [main],
                                                           defaultSize: defaultSize)
            TinyTest.expect(main.maxY - restored.y >= WindowRestoration.minimumVisibleHeight,
                            "expected a grabbable strip, got \(main.maxY - restored.y)")
        }

        TinyTest.test("shrinks a window restored from a larger display") {
            let stored = StoredFrame(x: 0, y: 0, width: 3000, height: 2000)
            let small = StoredFrame(x: 0, y: 0, width: 1280, height: 800)
            let restored = WindowRestoration.restoredFrame(for: stored, screens: [small],
                                                           defaultSize: defaultSize)
            TinyTest.expect(restored.width <= 1280, "width should fit")
            TinyTest.expect(restored.height <= 800, "height should fit")
        }

        TinyTest.test("uses the default size and centres when nothing is stored") {
            let restored = WindowRestoration.restoredFrame(for: nil, screens: [main],
                                                           defaultSize: defaultSize)
            TinyTest.equal(restored.width, 380)
            TinyTest.close(restored.x, (1920 - 380) / 2, 0.5, "x")
        }

        TinyTest.test("cascades new notes and wraps before leaving the screen") {
            let first = WindowRestoration.cascadedFrame(size: defaultSize, on: main, existingCount: 0)
            let second = WindowRestoration.cascadedFrame(size: defaultSize, on: main, existingCount: 1)
            TinyTest.close(second.x - first.x, 26, 0.001, "cascade step x")
            TinyTest.close(first.y - second.y, 26, 0.001, "cascade step y")

            let seventh = WindowRestoration.cascadedFrame(size: defaultSize, on: main, existingCount: 6)
            TinyTest.equal(seventh, first)
        }
    }

    TinyTest.suite("Character anchoring") {
        TinyTest.test("keeps the character clear of the window controls") {
            let range = CharacterAnchor.safeRange(windowWidth: 420)
            TinyTest.expect(range.lowerBound >= CharacterAnchor.leadingInset,
                            "should clear the close button, got \(range.lowerBound)")
            TinyTest.expect(range.upperBound <= 420 - CharacterAnchor.trailingInset,
                            "should clear the toolbar, got \(range.upperBound)")
        }

        TinyTest.test("collapses to a single position on a very narrow note") {
            let range = CharacterAnchor.safeRange(windowWidth: 200)
            TinyTest.equal(range.lowerBound, range.upperBound)
            TinyTest.expect(range.lowerBound >= CharacterAnchor.characterWidth / 2,
                            "the character should not be clipped off the left edge")
        }

        TinyTest.test("maps stored positions to window coordinates and back") {
            let width = 520.0
            for position in [0.0, 0.25, 0.5, 0.75, 1.0] {
                let x = CharacterAnchor.centerX(for: position, windowWidth: width)
                TinyTest.close(CharacterAnchor.position(forCenterX: x, windowWidth: width),
                               position, 0.0001, "round trip \(position)")
            }
            let left = CharacterAnchor.centerX(for: 0, windowWidth: width)
            let right = CharacterAnchor.centerX(for: 1, windowWidth: width)
            TinyTest.expect(left < right, "0 should be left of 1")
            TinyTest.close(CharacterAnchor.position(forCenterX: -500, windowWidth: width), 0, 0.0001)
            TinyTest.close(CharacterAnchor.position(forCenterX: 5000, windowWidth: width), 1, 0.0001)
        }

        TinyTest.test("rests at the paper's centre when there is room for it") {
            for width in [300.0, 380.0, 520.0, 900.0] {
                let x = CharacterAnchor.centerX(for: 0.5, windowWidth: width, scale: 0.8)
                TinyTest.close(x, width / 2, 0.001, "width \(width) should rest centred")
            }
        }

        TinyTest.test("gives way to the controls on a narrow note instead of centring") {
            // Narrow enough that the paper's centre is inside the toolbar.
            let width = 200.0
            let x = CharacterAnchor.centerX(for: 0.5, windowWidth: width, scale: 0.8)
            let range = CharacterAnchor.safeRange(windowWidth: width, scale: 0.8)
            TinyTest.expect(x >= range.lowerBound - 0.001 && x <= range.upperBound + 0.001,
                            "\(x) escaped \(range)")
        }

        TinyTest.test("stays inside the safe range as the note is resized") {
            for width in stride(from: 260.0, through: 900.0, by: 20) {
                let range = CharacterAnchor.safeRange(windowWidth: width)
                let x = CharacterAnchor.centerX(for: 0.9, windowWidth: width)
                TinyTest.expect(x >= range.lowerBound - 0.001 && x <= range.upperBound + 0.001,
                                "width \(width): \(x) escaped \(range)")
                TinyTest.expect(x + CharacterAnchor.characterWidth / 2 <= max(width, CharacterAnchor.characterWidth) + 0.001,
                                "width \(width): character clipped at the right edge")
            }
        }
    }
}
