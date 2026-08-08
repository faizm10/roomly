import AppKit
import PerchKit
import SwiftUI

/// The view-model for one open note window. It keeps editing state, forwards
/// changes to the store, and translates user activity into character events.
@MainActor
final class NoteSession: ObservableObject {
    let id: UUID
    @Published var body: String
    @Published var title: String
    @Published private(set) var color: NoteColor
    @Published private(set) var isPinned: Bool
    @Published var characterPosition: Double
    @Published var isDark: Bool
    @Published var settings: AppSettings
    @Published var reminderDate: Date?
    /// True while the pointer is over the window, used to reveal the toolbar.
    @Published var isHovering: Bool = false
    @Published var isEditorFocused: Bool = true

    let character: CharacterController

    private let store: NoteStore

    /// Window-level actions, wired up by the window controller.
    var onRequestClose: (() -> Void)?
    var onRequestArchive: (() -> Void)?
    var onRequestDelete: (() -> Void)?
    var onPinChanged: ((Bool) -> Void)?
    /// Set by the window controller so the scheduler can pick the change up.
    var onReminderChanged: ((Date?) -> Void)?

    init(note: Note, store: NoteStore, settings: AppSettings, isDark: Bool,
         character: CharacterController) {
        self.id = note.id
        self.body = note.body
        self.title = note.customTitle ?? ""
        self.color = note.color
        self.isPinned = note.isPinnedAboveWindows
        self.characterPosition = note.characterPosition
        self.reminderDate = note.reminderDate
        self.store = store
        self.settings = settings
        self.isDark = isDark
        self.character = character
    }

    var theme: NoteTheme { NoteTheme(color: color, isDark: isDark) }

    var displayTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? Note.derivedTitle(from: body) : trimmed
    }

    var checklistProgress: (completed: Int, total: Int) {
        ChecklistParser.progress(in: body)
    }

    // MARK: - Editing

    func bodyDidChange() {
        store.setBody(body, for: id)
        character.send(.textChanged)
    }

    func titleDidChange() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        store.update(id: id) { $0.customTitle = trimmed.isEmpty ? nil : trimmed }
    }

    func checklistCompleted(allDone: Bool) {
        guard settings.character.celebratesTasks else { return }
        character.send(.checklistItemCompleted(allComplete: allDone))
    }

    func setReminder(_ date: Date?) {
        reminderDate = date
        store.update(id: id, touch: false) { $0.reminderDate = date }
        onReminderChanged?(date)
    }

    /// Human-readable summary for the toolbar menu.
    var reminderSummary: String? {
        guard let reminderDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: reminderDate)
    }

    func setColor(_ newColor: NoteColor) {
        guard newColor != color else { return }
        color = newColor
        store.update(id: id) { $0.color = newColor }
    }

    func togglePinned() {
        isPinned.toggle()
        store.update(id: id, touch: false) { [isPinned] in $0.isPinnedAboveWindows = isPinned }
        onPinChanged?(isPinned)
    }

    func setCharacterPosition(_ position: Double) {
        let clamped = min(max(position, 0), 1)
        characterPosition = clamped
        store.update(id: id, touch: false) { $0.characterPosition = clamped }
    }

    func applySettings(_ newSettings: AppSettings, isDark: Bool) {
        settings = newSettings
        self.isDark = isDark
        character.preferences = newSettings.character
    }

    /// Inserts or removes checklist markers on the current selection.
    func toggleChecklistOnSelection() {
        NSApp.sendAction(#selector(NoteTextView.toggleChecklistMarker(_:)), to: nil, from: nil)
    }
}
