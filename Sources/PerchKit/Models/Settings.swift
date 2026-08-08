import Foundation

public enum AnimationIntensity: String, CaseIterable, Codable, Sendable {
    case minimal
    case subtle
    case lively

    public var displayName: String {
        switch self {
        case .minimal: return "Minimal"
        case .subtle: return "Subtle"
        case .lively: return "Lively"
        }
    }

    /// Multiplier applied to every offset, rotation and swing.
    public var amplitude: Double {
        switch self {
        case .minimal: return 0.45
        case .subtle: return 1.0
        case .lively: return 1.45
        }
    }
}

public struct CharacterPreferences: Codable, Equatable, Sendable {
    public var isEnabled: Bool
    public var animationIntensity: AnimationIntensity
    /// Quiet mode keeps the character still far more of the time.
    public var quietMode: Bool
    /// Seconds of inactivity before the character falls asleep.
    public var sleepingDelay: Double
    public var followsPointer: Bool
    public var celebratesTasks: Bool
    public var interactionEnabled: Bool
    /// When true the app behaves as if Reduce Motion were on, regardless of
    /// the system setting.
    public var reducedMotionOverride: Bool
    public var scale: Double

    public init(
        isEnabled: Bool = true,
        animationIntensity: AnimationIntensity = .subtle,
        quietMode: Bool = false,
        sleepingDelay: Double = 90,
        followsPointer: Bool = true,
        celebratesTasks: Bool = true,
        interactionEnabled: Bool = true,
        reducedMotionOverride: Bool = false,
        scale: Double = 1.0
    ) {
        self.isEnabled = isEnabled
        self.animationIntensity = animationIntensity
        self.quietMode = quietMode
        self.sleepingDelay = sleepingDelay
        self.followsPointer = followsPointer
        self.celebratesTasks = celebratesTasks
        self.interactionEnabled = interactionEnabled
        self.reducedMotionOverride = reducedMotionOverride
        self.scale = scale
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = CharacterPreferences()
        isEnabled = try c.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? d.isEnabled
        animationIntensity = try c.decodeIfPresent(AnimationIntensity.self, forKey: .animationIntensity) ?? d.animationIntensity
        quietMode = try c.decodeIfPresent(Bool.self, forKey: .quietMode) ?? d.quietMode
        sleepingDelay = try c.decodeIfPresent(Double.self, forKey: .sleepingDelay) ?? d.sleepingDelay
        followsPointer = try c.decodeIfPresent(Bool.self, forKey: .followsPointer) ?? d.followsPointer
        celebratesTasks = try c.decodeIfPresent(Bool.self, forKey: .celebratesTasks) ?? d.celebratesTasks
        interactionEnabled = try c.decodeIfPresent(Bool.self, forKey: .interactionEnabled) ?? d.interactionEnabled
        reducedMotionOverride = try c.decodeIfPresent(Bool.self, forKey: .reducedMotionOverride) ?? d.reducedMotionOverride
        scale = try c.decodeIfPresent(Double.self, forKey: .scale) ?? d.scale
    }
}

/// A global keyboard shortcut, stored as a Carbon-compatible key code plus
/// Cocoa modifier flags.
public struct ShortcutSpec: Codable, Hashable, Sendable {
    public var keyCode: UInt32
    /// Raw value of `NSEvent.ModifierFlags`.
    public var modifiers: UInt

    public init(keyCode: UInt32, modifiers: UInt) {
        self.keyCode = keyCode
        self.modifiers = modifiers
    }

    /// Option + Command + N.
    public static let defaultNewNote = ShortcutSpec(keyCode: 45, modifiers: 0x00080000 | 0x00100000)
}

public struct AppSettings: Codable, Equatable, Sendable {
    // General
    public var launchAtLogin: Bool
    public var newNoteShortcut: ShortcutSpec
    public var defaultNoteColor: NoteColor
    public var defaultAlwaysOnTop: Bool
    public var restoreOpenNotes: Bool
    public var showDockIcon: Bool
    public var appearance: AppearanceMode

    // Notes
    public var defaultFontSize: Double
    public var defaultNoteSize: StoredFrame
    public var spellCheckingEnabled: Bool
    public var smartLinksEnabled: Bool
    public var confirmBeforeDeletion: Bool

    // Character
    public var character: CharacterPreferences

    public init(
        launchAtLogin: Bool = false,
        newNoteShortcut: ShortcutSpec = .defaultNewNote,
        defaultNoteColor: NoteColor = .cream,
        defaultAlwaysOnTop: Bool = false,
        restoreOpenNotes: Bool = true,
        showDockIcon: Bool = false,
        appearance: AppearanceMode = .system,
        defaultFontSize: Double = 15,
        defaultNoteSize: StoredFrame = StoredFrame(x: 0, y: 0, width: 380, height: 480),
        spellCheckingEnabled: Bool = true,
        smartLinksEnabled: Bool = true,
        confirmBeforeDeletion: Bool = true,
        character: CharacterPreferences = CharacterPreferences()
    ) {
        self.launchAtLogin = launchAtLogin
        self.newNoteShortcut = newNoteShortcut
        self.defaultNoteColor = defaultNoteColor
        self.defaultAlwaysOnTop = defaultAlwaysOnTop
        self.restoreOpenNotes = restoreOpenNotes
        self.showDockIcon = showDockIcon
        self.appearance = appearance
        self.defaultFontSize = defaultFontSize
        self.defaultNoteSize = defaultNoteSize
        self.spellCheckingEnabled = spellCheckingEnabled
        self.smartLinksEnabled = smartLinksEnabled
        self.confirmBeforeDeletion = confirmBeforeDeletion
        self.character = character
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = AppSettings()
        launchAtLogin = try c.decodeIfPresent(Bool.self, forKey: .launchAtLogin) ?? d.launchAtLogin
        newNoteShortcut = try c.decodeIfPresent(ShortcutSpec.self, forKey: .newNoteShortcut) ?? d.newNoteShortcut
        defaultNoteColor = try c.decodeIfPresent(NoteColor.self, forKey: .defaultNoteColor) ?? d.defaultNoteColor
        defaultAlwaysOnTop = try c.decodeIfPresent(Bool.self, forKey: .defaultAlwaysOnTop) ?? d.defaultAlwaysOnTop
        restoreOpenNotes = try c.decodeIfPresent(Bool.self, forKey: .restoreOpenNotes) ?? d.restoreOpenNotes
        showDockIcon = try c.decodeIfPresent(Bool.self, forKey: .showDockIcon) ?? d.showDockIcon
        appearance = try c.decodeIfPresent(AppearanceMode.self, forKey: .appearance) ?? d.appearance
        defaultFontSize = try c.decodeIfPresent(Double.self, forKey: .defaultFontSize) ?? d.defaultFontSize
        defaultNoteSize = try c.decodeIfPresent(StoredFrame.self, forKey: .defaultNoteSize) ?? d.defaultNoteSize
        spellCheckingEnabled = try c.decodeIfPresent(Bool.self, forKey: .spellCheckingEnabled) ?? d.spellCheckingEnabled
        smartLinksEnabled = try c.decodeIfPresent(Bool.self, forKey: .smartLinksEnabled) ?? d.smartLinksEnabled
        confirmBeforeDeletion = try c.decodeIfPresent(Bool.self, forKey: .confirmBeforeDeletion) ?? d.confirmBeforeDeletion
        character = try c.decodeIfPresent(CharacterPreferences.self, forKey: .character) ?? d.character
    }
}
