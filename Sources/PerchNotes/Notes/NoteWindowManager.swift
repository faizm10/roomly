import AppKit
import Combine
import PerchKit
import SwiftUI

/// Opens, restores, tracks and closes note windows.
@MainActor
final class NoteWindowManager: ObservableObject {
    @Published private(set) var openNoteIDs: Set<UUID> = []

    private var controllers: [UUID: NoteWindowController] = [:]
    private let store: NoteStore
    private let settingsStore: SettingsStore
    private let reminders: ReminderScheduler

    init(store: NoteStore, settingsStore: SettingsStore, reminders: ReminderScheduler) {
        self.store = store
        self.settingsStore = settingsStore
        self.reminders = reminders
        // Plugging or unplugging a display can strand a note off screen.
        NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.recoverOffscreenWindows() }
        }
    }

    /// Pulls every open note back onto a connected display.
    func recoverOffscreenWindows() {
        for controller in controllers.values { controller.ensureOnscreen() }
    }

    var openCount: Int { controllers.count }

    func isOpen(_ id: UUID) -> Bool { controllers[id] != nil }

    // MARK: - Creating and opening

    @discardableResult
    func createNote() -> UUID {
        let settings = settingsStore.settings
        let note = store.createNote(color: settings.defaultNoteColor,
                                    pinned: settings.defaultAlwaysOnTop)
        open(noteID: note.id, activating: true)
        return note.id
    }

    func open(noteID: UUID, activating: Bool) {
        if let existing = controllers[noteID] {
            existing.focus()
            return
        }
        guard var note = store.note(id: noteID) else { return }
        if note.isArchived {
            store.setArchived(false, for: noteID)
            note.isArchived = false
        }

        let settings = settingsStore.settings
        let frame = frameForNote(note, settings: settings)
        let controller = NoteWindowController(
            note: note,
            store: store,
            settings: settings,
            isDark: AppearanceResolver.isDark(settings.appearance),
            frame: frame,
            manager: self,
            reminders: reminders
        )
        controllers[noteID] = controller
        openNoteIDs.insert(noteID)
        controller.show(activating: activating)
        store.update(id: noteID, touch: false) { $0.wasOpenOnTermination = true }
    }

    func close(noteID: UUID) {
        controllers[noteID]?.requestClose()
    }

    func windowDidClose(noteID: UUID) {
        controllers[noteID] = nil
        openNoteIDs.remove(noteID)
        store.update(id: noteID, touch: false) { $0.wasOpenOnTermination = false }
        store.flush()
    }

    /// Restores the notes that were on screen when the app last quit, without
    /// stealing focus from whatever the user is doing.
    func restoreSession() {
        guard settingsStore.settings.restoreOpenNotes else { return }
        for note in store.notesOpenAtTermination {
            open(noteID: note.id, activating: false)
        }
    }

    func applySettingsToAllWindows() {
        let settings = settingsStore.settings
        let isDark = AppearanceResolver.isDark(settings.appearance)
        for controller in controllers.values {
            controller.applySettings(settings, isDark: isDark)
        }
    }

    func recordOpenNotesForTermination() {
        store.recordOpenNotes(openNoteIDs)
        store.flush()
    }

    // MARK: - Placement

    private func frameForNote(_ note: Note, settings: AppSettings) -> NSRect {
        let screens = NSScreen.screens.map(StoredFrame.init(visibleFrameOf:))
        let active = NSScreen.main.map(StoredFrame.init(visibleFrameOf:))
            ?? screens.first ?? StoredFrame(x: 0, y: 0, width: 1440, height: 900)

        let defaultSize = settings.defaultNoteSize
        let stored: StoredFrame
        if let saved = note.lastWindowFrame {
            stored = WindowRestoration.restoredFrame(for: saved, screens: screens,
                                                     defaultSize: defaultSize)
        } else {
            stored = WindowRestoration.cascadedFrame(size: defaultSize, on: active,
                                                     existingCount: controllers.count)
        }
        return NSRect(x: stored.x, y: stored.y, width: stored.width, height: stored.height)
    }
}

/// Resolves the app's light/dark choice against the system appearance.
enum AppearanceResolver {
    static func isDark(_ mode: AppearanceMode) -> Bool {
        switch mode {
        case .light: return false
        case .dark: return true
        case .system:
            return NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
        }
    }
}
