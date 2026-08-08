import Foundation

/// The restrained note palette. Each case carries paper, ink, edge and accent
/// tones for both appearances so the note surface never has to guess.
public enum NoteColor: String, CaseIterable, Codable, Sendable, Identifiable {
    case cream
    case yellow
    case pink
    case sage
    case dusty
    case grey
    case charcoal

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .cream: return "Warm Cream"
        case .yellow: return "Soft Yellow"
        case .pink: return "Muted Pink"
        case .sage: return "Sage"
        case .dusty: return "Dusty Blue"
        case .grey: return "Neutral Grey"
        case .charcoal: return "Dark Charcoal"
        }
    }

    /// A colour is "inherently dark" when its paper is dark in every
    /// appearance. Charcoal is the only one, and it forces light ink.
    public var isAlwaysDark: Bool { self == .charcoal }

    public var lightPalette: NotePalette {
        switch self {
        case .cream:
            return NotePalette(paper: 0xF6EDDD, paperEdge: 0xEADCC4, ink: 0x2C2620,
                               secondaryInk: 0x7A6C59, accent: 0xB07C4A, rule: 0xD9C7A9)
        case .yellow:
            return NotePalette(paper: 0xF7EDBF, paperEdge: 0xEDDF9F, ink: 0x33301F,
                               secondaryInk: 0x7C7350, accent: 0xA98B2E, rule: 0xE0CE8E)
        case .pink:
            return NotePalette(paper: 0xF3DFDD, paperEdge: 0xE7CBC8, ink: 0x312423,
                               secondaryInk: 0x7E6663, accent: 0xA96A66, rule: 0xDFC0BC)
        case .sage:
            return NotePalette(paper: 0xE2E7D8, paperEdge: 0xCFD7C1, ink: 0x262B22,
                               secondaryInk: 0x64705C, accent: 0x6C8459, rule: 0xC5D0B4)
        case .dusty:
            return NotePalette(paper: 0xDDE5EB, paperEdge: 0xC7D3DC, ink: 0x212831,
                               secondaryInk: 0x5F6C79, accent: 0x5A7C97, rule: 0xBFCCD7)
        case .grey:
            return NotePalette(paper: 0xE8E6E2, paperEdge: 0xD6D3CD, ink: 0x272624,
                               secondaryInk: 0x6C6A65, accent: 0x77736C, rule: 0xCDC9C2)
        case .charcoal:
            return NotePalette(paper: 0x2A2A2C, paperEdge: 0x1F1F21, ink: 0xEDE8E0,
                               secondaryInk: 0x9C968C, accent: 0xC7A97B, rule: 0x3C3C3F)
        }
    }

    public var darkPalette: NotePalette {
        switch self {
        case .cream:
            return NotePalette(paper: 0x3A332A, paperEdge: 0x2A251E, ink: 0xF1E8D8,
                               secondaryInk: 0xB0A390, accent: 0xD3A768, rule: 0x4A4237)
        case .yellow:
            return NotePalette(paper: 0x3B3722, paperEdge: 0x2B2818, ink: 0xF4EBC7,
                               secondaryInk: 0xB4AB86, accent: 0xD8BC5C, rule: 0x4B462C)
        case .pink:
            return NotePalette(paper: 0x3A2C2B, paperEdge: 0x2A1F1F, ink: 0xF2E1DF,
                               secondaryInk: 0xB59B99, accent: 0xD08E8A, rule: 0x4A3937)
        case .sage:
            return NotePalette(paper: 0x2C332A, paperEdge: 0x1F251E, ink: 0xE4EBDD,
                               secondaryInk: 0x9BA793, accent: 0x8FB077, rule: 0x3A4237)
        case .dusty:
            return NotePalette(paper: 0x28303A, paperEdge: 0x1C222A, ink: 0xE0E8F0,
                               secondaryInk: 0x93A2B0, accent: 0x82AACB, rule: 0x353F4A)
        case .grey:
            return NotePalette(paper: 0x313030, paperEdge: 0x232222, ink: 0xE9E7E3,
                               secondaryInk: 0xA5A29C, accent: 0xA8A49C, rule: 0x3E3D3C)
        case .charcoal:
            return NotePalette(paper: 0x232325, paperEdge: 0x161617, ink: 0xEDE8E0,
                               secondaryInk: 0x9C968C, accent: 0xC7A97B, rule: 0x343437)
        }
    }

    public func palette(dark: Bool) -> NotePalette {
        if isAlwaysDark { return lightPalette }
        return dark ? darkPalette : lightPalette
    }

    /// A single swatch tone used for menu-bar rows and colour pickers.
    public var markerHex: UInt32 {
        switch self {
        case .cream: return 0xE9D3A9
        case .yellow: return 0xE9D680
        case .pink: return 0xE0B4B0
        case .sage: return 0xAFC098
        case .dusty: return 0x9CB7CC
        case .grey: return 0xC4C0B9
        case .charcoal: return 0x4A4A4E
        }
    }
}

/// Resolved tones for one note surface in one appearance.
public struct NotePalette: Equatable, Sendable {
    public let paper: UInt32
    public let paperEdge: UInt32
    public let ink: UInt32
    public let secondaryInk: UInt32
    public let accent: UInt32
    public let rule: UInt32

    public init(paper: UInt32, paperEdge: UInt32, ink: UInt32,
                secondaryInk: UInt32, accent: UInt32, rule: UInt32) {
        self.paper = paper
        self.paperEdge = paperEdge
        self.ink = ink
        self.secondaryInk = secondaryInk
        self.accent = accent
        self.rule = rule
    }
}

/// How the app resolves light and dark appearance.
public enum AppearanceMode: String, CaseIterable, Codable, Sendable {
    case system
    case light
    case dark

    public var displayName: String {
        switch self {
        case .system: return "Follow System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}
