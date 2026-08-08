import AppKit
import Combine
import PerchKit
import UserNotifications

/// Optional note reminders.
///
/// Notifications are only requested when the app is running as a real bundle;
/// `UNUserNotificationCenter` is unavailable to an unbundled binary. Either
/// way the menu-bar character shows a quiet indicator when something is due,
/// so the feature degrades instead of breaking.
@MainActor
final class ReminderScheduler: ObservableObject {
    @Published private(set) var hasDueReminder = false

    private let store: NoteStore
    private var timer: Timer?
    private var notifiedIDs: Set<UUID> = []

    private var notificationsAvailable: Bool {
        Bundle.main.bundleIdentifier != nil && Bundle.main.bundleURL.pathExtension == "app"
    }

    init(store: NoteStore) {
        self.store = store
    }

    deinit { timer?.invalidate() }

    func start() {
        guard notificationsAvailable else {
            scheduleCheck()
            return
        }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        scheduleCheck()
    }

    /// One low-frequency timer for the whole app, and only while a reminder is
    /// actually set on some note.
    private func scheduleCheck() {
        timer?.invalidate()
        timer = nil
        guard store.notes.contains(where: { $0.reminderDate != nil }) else {
            hasDueReminder = false
            return
        }
        let timer = Timer(timeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.checkDueReminders() }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
        checkDueReminders()
    }

    func refresh() { scheduleCheck() }

    func setReminder(_ date: Date?, for noteID: UUID) {
        store.update(id: noteID, touch: false) { $0.reminderDate = date }
        notifiedIDs.remove(noteID)
        scheduleCheck()
    }

    func acknowledgeReminders() {
        hasDueReminder = false
    }

    private func checkDueReminders() {
        let now = Date()
        var due = false
        for note in store.notes {
            guard let reminder = note.reminderDate, reminder <= now, !note.isArchived else { continue }
            due = true
            guard !notifiedIDs.contains(note.id) else { continue }
            notifiedIDs.insert(note.id)
            post(for: note)
        }
        hasDueReminder = due
    }

    private func post(for note: Note) {
        guard notificationsAvailable else { return }
        let content = UNMutableNotificationContent()
        content.title = note.displayTitle
        content.body = note.preview.isEmpty ? "Reminder from Perch Notes" : note.preview
        content.sound = .default
        let request = UNNotificationRequest(identifier: note.id.uuidString,
                                            content: content,
                                            trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }
}
