import AppKit
import PerchKit

/// Draws Nib's silhouette for the menu bar: the crest plus a rounded head with
/// punched-out eyes. As a template image it follows the menu bar's own tint in
/// both appearances and while the bar is highlighted.
enum StatusIcon {
    static let size = NSSize(width: 20, height: 18)

    static func image(for state: MenuBarCharacterState) -> NSImage {
        let image = NSImage(size: size, flipped: false) { rect in
            guard let context = NSGraphicsContext.current?.cgContext else { return true }
            NSColor.black.setFill()

            let centerX = rect.midX
            // Head.
            let head = NSBezierPath(ovalIn: NSRect(x: centerX - 6.4, y: 1.5, width: 12.8, height: 11))
            head.fill()

            // Nib crest.
            let crest = NSBezierPath()
            crest.move(to: NSPoint(x: centerX - 3.6, y: 9.5))
            crest.curve(to: NSPoint(x: centerX, y: 17),
                        controlPoint1: NSPoint(x: centerX - 3.2, y: 13),
                        controlPoint2: NSPoint(x: centerX - 1.6, y: 15.5))
            crest.curve(to: NSPoint(x: centerX + 3.6, y: 9.5),
                        controlPoint1: NSPoint(x: centerX + 1.6, y: 15.5),
                        controlPoint2: NSPoint(x: centerX + 3.2, y: 13))
            crest.close()
            crest.fill()

            // Eyes are punched out so the silhouette stays a single shape.
            context.setBlendMode(.destinationOut)
            switch state {
            case .awake, .alert:
                NSBezierPath(ovalIn: NSRect(x: centerX - 4.2, y: 5.4, width: 2.6, height: 3.2)).fill()
                NSBezierPath(ovalIn: NSRect(x: centerX + 1.6, y: 5.4, width: 2.6, height: 3.2)).fill()
            case .asleep:
                // Closed eyes: two short lashes.
                NSBezierPath(rect: NSRect(x: centerX - 4.4, y: 6.4, width: 3.0, height: 1.2)).fill()
                NSBezierPath(rect: NSRect(x: centerX + 1.4, y: 6.4, width: 3.0, height: 1.2)).fill()
            }
            context.setBlendMode(.normal)

            if state == .alert {
                // A small notch beside the crest marks a due reminder. It is
                // also announced in the button's accessibility label.
                NSColor.black.setFill()
                NSBezierPath(ovalIn: NSRect(x: rect.maxX - 4.6, y: rect.maxY - 5.2,
                                            width: 4, height: 4)).fill()
            }
            return true
        }
        image.isTemplate = true
        image.accessibilityDescription = accessibilityDescription(for: state)
        return image
    }

    static func accessibilityDescription(for state: MenuBarCharacterState) -> String {
        switch state {
        case .awake: return "Perch Notes, notes open"
        case .asleep: return "Perch Notes, no notes open"
        case .alert: return "Perch Notes, reminder due"
        }
    }
}
