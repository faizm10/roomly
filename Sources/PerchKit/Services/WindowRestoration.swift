import Foundation

/// Pure geometry for placing and restoring note windows. Kept free of AppKit
/// so display-arrangement edge cases can be tested directly.
public enum WindowRestoration {
    /// How much of a window must remain on a screen for the position to be
    /// considered usable after a display change.
    public static let minimumVisibleFraction: Double = 0.35
    /// Never let the title area slide under the menu bar or off the top.
    public static let minimumVisibleHeight: Double = 40

    public static func intersectionArea(_ a: StoredFrame, _ b: StoredFrame) -> Double {
        let width = min(a.maxX, b.maxX) - max(a.x, b.x)
        let height = min(a.maxY, b.maxY) - max(a.y, b.y)
        guard width > 0, height > 0 else { return 0 }
        return width * height
    }

    /// The screen that shows most of `frame`, or nil when it is fully offscreen.
    public static func bestScreen(for frame: StoredFrame, screens: [StoredFrame]) -> StoredFrame? {
        var best: (screen: StoredFrame, area: Double)?
        for screen in screens {
            let area = intersectionArea(frame, screen)
            if area > 0, area > (best?.area ?? 0) { best = (screen, area) }
        }
        return best?.screen
    }

    /// Returns a frame guaranteed to be reachable: mostly on some screen, with
    /// its top edge below the top of that screen's visible area.
    public static func restoredFrame(for stored: StoredFrame?,
                                     screens: [StoredFrame],
                                     defaultSize: StoredFrame) -> StoredFrame {
        guard let primary = screens.first else { return defaultSize }
        guard var frame = stored else {
            return centered(size: defaultSize, in: primary)
        }

        // Windows can be restored from a larger display; never exceed the target.
        frame.width = min(frame.width, primary.width)
        frame.height = min(frame.height, primary.height)

        let area = frame.width * frame.height
        let visible = screens.map { intersectionArea(frame, $0) }.max() ?? 0
        if area > 0, visible / area >= minimumVisibleFraction,
           let screen = bestScreen(for: frame, screens: screens) {
            return nudgeFullyOnscreen(frame, screen: screen)
        }

        // Nothing usable is on screen (display unplugged, resolution change).
        return centered(size: frame, in: primary)
    }

    public static func centered(size: StoredFrame, in screen: StoredFrame) -> StoredFrame {
        StoredFrame(
            x: screen.x + (screen.width - size.width) / 2,
            y: screen.y + (screen.height - size.height) / 2,
            width: min(size.width, screen.width),
            height: min(size.height, screen.height)
        )
    }

    /// Slides a frame so it sits inside `screen`, keeping its size.
    public static func nudgeFullyOnscreen(_ frame: StoredFrame, screen: StoredFrame) -> StoredFrame {
        var result = frame
        result.x = min(max(result.x, screen.x), screen.maxX - result.width)
        result.y = min(max(result.y, screen.y), screen.maxY - result.height)
        if result.maxY > screen.maxY { result.y = screen.maxY - result.height }
        if screen.maxY - result.y < minimumVisibleHeight {
            result.y = screen.maxY - minimumVisibleHeight
        }
        return result
    }

    /// New notes appear near the centre of the active display, stepping down
    /// and right when several are created in a row.
    public static func cascadedFrame(size: StoredFrame, on screen: StoredFrame,
                                     existingCount: Int, step: Double = 26) -> StoredFrame {
        let base = centered(size: size, in: screen)
        let ring = existingCount % 6
        var frame = base
        frame.x += Double(ring) * step
        frame.y -= Double(ring) * step
        return nudgeFullyOnscreen(frame, screen: screen)
    }
}

/// Where the character may sit along the top edge of a note.
///
/// The range is asymmetric because the note's controls are: the close button
/// sits on the left and four small controls on the right. Position `0.5` is
/// therefore mapped to the *paper's* centre rather than the middle of the safe
/// range, so a fresh note looks centred while dragging still reaches both ends.
public enum CharacterAnchor {
    /// Width reserved on the left for the close control.
    public static let leadingInset: Double = 46
    /// Width reserved on the right for the note's toolbar buttons.
    public static let trailingInset: Double = 96
    /// Nominal on-screen width of the character at scale 1.
    public static let characterWidth: Double = 96

    /// The horizontal range, in window points, the character's centre may use.
    /// Collapses to a single point when the note is too narrow for both.
    public static func safeRange(windowWidth: Double, scale: Double = 1) -> ClosedRange<Double> {
        let half = characterWidth * scale / 2
        let lower = leadingInset + half
        let upper = windowWidth - trailingInset - half
        guard upper > lower else {
            // Too narrow for the full clearance: stay on the paper at least.
            let bounded = max(half, min(max(windowWidth - half, half), windowWidth / 2))
            return bounded...bounded
        }
        return lower...upper
    }

    /// The resting position: the paper's centre, pulled inside the safe range.
    public static func restingCenterX(windowWidth: Double, scale: Double = 1) -> Double {
        let range = safeRange(windowWidth: windowWidth, scale: scale)
        return min(max(windowWidth / 2, range.lowerBound), range.upperBound)
    }

    /// Converts the stored 0…1 position into a window-space centre X.
    public static func centerX(for position: Double, windowWidth: Double, scale: Double = 1) -> Double {
        let range = safeRange(windowWidth: windowWidth, scale: scale)
        let center = restingCenterX(windowWidth: windowWidth, scale: scale)
        let clamped = min(max(position, 0), 1)
        if clamped <= 0.5 {
            return range.lowerBound + (center - range.lowerBound) * (clamped / 0.5)
        }
        return center + (range.upperBound - center) * ((clamped - 0.5) / 0.5)
    }

    /// Converts a window-space centre X back into the stored 0…1 position.
    public static func position(forCenterX x: Double, windowWidth: Double, scale: Double = 1) -> Double {
        let range = safeRange(windowWidth: windowWidth, scale: scale)
        let center = restingCenterX(windowWidth: windowWidth, scale: scale)
        let clampedX = min(max(x, range.lowerBound), range.upperBound)
        if clampedX <= center {
            let span = center - range.lowerBound
            guard span > 0 else { return 0.5 }
            return (clampedX - range.lowerBound) / span * 0.5
        }
        let span = range.upperBound - center
        guard span > 0 else { return 0.5 }
        return 0.5 + (clampedX - center) / span * 0.5
    }
}
