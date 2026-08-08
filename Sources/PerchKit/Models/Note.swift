import Foundation

/// A rectangle stored independently of AppKit so the core stays testable.
public struct StoredFrame: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double

    public init(x: Double, y: Double, width: Double, height: Double) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }

    public var maxX: Double { x + width }
    public var maxY: Double { y + height }
}

/// The persistent note record. `body` is the single source of truth for
/// content: checklist lines are encoded inline as `- [ ] ` / `- [x] ` so that
/// native undo, copy and paste keep working without a block editor.
public struct Note: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    /// A user-set title. When nil the title is derived from the first line.
    public var customTitle: String?
    public var body: String
    public var color: NoteColor
    public var createdAt: Date
    public var updatedAt: Date
    public var isArchived: Bool
    public var isPinnedAboveWindows: Bool
    public var lastWindowFrame: StoredFrame?
    /// 0…1 position of the character along the safe part of the top edge.
    public var characterPosition: Double
    public var wasOpenOnTermination: Bool
    public var reminderDate: Date?
    /// Timestamps for checklist lines that have been completed, keyed by the
    /// item's trimmed text. Purely informational; `body` remains authoritative.
    public var checklistCompletions: [String: Date]

    public init(
        id: UUID = UUID(),
        customTitle: String? = nil,
        body: String = "",
        color: NoteColor = .cream,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        isArchived: Bool = false,
        isPinnedAboveWindows: Bool = false,
        lastWindowFrame: StoredFrame? = nil,
        characterPosition: Double = 0.5,
        wasOpenOnTermination: Bool = false,
        reminderDate: Date? = nil,
        checklistCompletions: [String: Date] = [:]
    ) {
        self.id = id
        self.customTitle = customTitle
        self.body = body
        self.color = color
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.isArchived = isArchived
        self.isPinnedAboveWindows = isPinnedAboveWindows
        self.lastWindowFrame = lastWindowFrame
        self.characterPosition = characterPosition
        self.wasOpenOnTermination = wasOpenOnTermination
        self.reminderDate = reminderDate
        self.checklistCompletions = checklistCompletions
    }

    /// Older records may lack fields added later; decode defensively so an
    /// upgrade never drops a user's note.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        customTitle = try c.decodeIfPresent(String.self, forKey: .customTitle)
        body = try c.decodeIfPresent(String.self, forKey: .body) ?? ""
        color = try c.decodeIfPresent(NoteColor.self, forKey: .color) ?? .cream
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        updatedAt = try c.decodeIfPresent(Date.self, forKey: .updatedAt) ?? createdAt
        isArchived = try c.decodeIfPresent(Bool.self, forKey: .isArchived) ?? false
        isPinnedAboveWindows = try c.decodeIfPresent(Bool.self, forKey: .isPinnedAboveWindows) ?? false
        lastWindowFrame = try c.decodeIfPresent(StoredFrame.self, forKey: .lastWindowFrame)
        characterPosition = try c.decodeIfPresent(Double.self, forKey: .characterPosition) ?? 0.5
        wasOpenOnTermination = try c.decodeIfPresent(Bool.self, forKey: .wasOpenOnTermination) ?? false
        reminderDate = try c.decodeIfPresent(Date.self, forKey: .reminderDate)
        checklistCompletions = try c.decodeIfPresent([String: Date].self, forKey: .checklistCompletions) ?? [:]
    }

    /// The title shown in window chrome and the menu-bar list.
    public var displayTitle: String {
        if let custom = customTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !custom.isEmpty {
            return custom
        }
        return Note.derivedTitle(from: body)
    }

    /// One short line of body text for menu-bar rows, skipping the title line.
    public var preview: String {
        let lines = body.split(separator: "\n", omittingEmptySubsequences: false)
        let skipFirst = customTitle == nil && !lines.isEmpty
        let rest = lines.dropFirst(skipFirst ? 1 : 0)
        for line in rest {
            let cleaned = ChecklistParser.strippingMarker(String(line))
                .trimmingCharacters(in: .whitespacesAndNewlines)
            if !cleaned.isEmpty { return cleaned }
        }
        return ""
    }

    public var checklistItems: [ChecklistItem] {
        ChecklistParser.items(in: body, noteID: id, completions: checklistCompletions)
    }

    /// Derives a title from the first non-empty line, trimming checklist and
    /// Markdown-heading markers and clamping length.
    public static func derivedTitle(from body: String) -> String {
        for rawLine in body.split(separator: "\n", omittingEmptySubsequences: false) {
            var line = ChecklistParser.strippingMarker(String(rawLine))
            while line.hasPrefix("#") { line.removeFirst() }
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            if trimmed.count <= 60 { return trimmed }
            let cut = trimmed.prefix(60)
            return String(cut).trimmingCharacters(in: .whitespaces) + "…"
        }
        return "New Note"
    }
}

/// A checklist line, derived from `Note.body`.
public struct ChecklistItem: Identifiable, Equatable, Sendable {
    public let id: String
    public let noteID: UUID
    public var text: String
    public var isCompleted: Bool
    public var order: Int
    public var createdAt: Date?
    public var completedAt: Date?
    /// Line index inside the note body, used to toggle the item.
    public let lineIndex: Int

    public init(id: String, noteID: UUID, text: String, isCompleted: Bool,
                order: Int, lineIndex: Int, createdAt: Date? = nil, completedAt: Date? = nil) {
        self.id = id
        self.noteID = noteID
        self.text = text
        self.isCompleted = isCompleted
        self.order = order
        self.lineIndex = lineIndex
        self.createdAt = createdAt
        self.completedAt = completedAt
    }
}
