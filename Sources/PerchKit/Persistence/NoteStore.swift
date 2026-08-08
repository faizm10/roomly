import Combine
import Foundation

/// Owns every note. Writes are debounced so a burst of keystrokes produces one
/// disk write, and `flush()` forces everything out before termination.
@MainActor
public final class NoteStore: ObservableObject {
    @Published public private(set) var notes: [Note] = []

    private let storage: FileStorage
    private let notesDirectory: URL
    private let debounceInterval: TimeInterval
    private var pendingSaves: Set<UUID> = []
    private var saveWorkItem: DispatchWorkItem?

    /// Set to false in tests to write synchronously.
    public var debounceEnabled: Bool

    public init(storage: FileStorage = FileStorage(root: FileStorage.defaultRoot()),
                debounceInterval: TimeInterval = 0.6,
                debounceEnabled: Bool = true) {
        self.storage = storage
        self.notesDirectory = storage.directory("Notes")
        self.debounceInterval = debounceInterval
        self.debounceEnabled = debounceEnabled
        load()
    }

    // MARK: - Loading

    public func load() {
        let urls = storage.contents(ofDirectory: notesDirectory, extension: "json")
        notes = urls.compactMap { storage.read(Note.self, from: $0) }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    // MARK: - Queries

    public func note(id: UUID) -> Note? {
        notes.first { $0.id == id }
    }

    public var activeNotes: [Note] {
        notes.filter { !$0.isArchived }.sorted { $0.updatedAt > $1.updatedAt }
    }

    public var archivedNotes: [Note] {
        notes.filter(\.isArchived).sorted { $0.updatedAt > $1.updatedAt }
    }

    public var notesOpenAtTermination: [Note] {
        notes.filter { $0.wasOpenOnTermination && !$0.isArchived }
    }

    // MARK: - Mutation

    @discardableResult
    public func createNote(color: NoteColor, pinned: Bool, body: String = "") -> Note {
        let note = Note(body: body, color: color, isPinnedAboveWindows: pinned)
        notes.insert(note, at: 0)
        save(note.id, immediately: true)
        return note
    }

    /// Applies `changes` to the stored note and schedules a debounced save.
    /// `touch` controls whether `updatedAt` moves — window moves shouldn't
    /// reorder the recents list.
    public func update(id: UUID, touch: Bool = true, immediately: Bool = false,
                       _ changes: (inout Note) -> Void) {
        guard let index = notes.firstIndex(where: { $0.id == id }) else { return }
        var note = notes[index]
        let before = note
        changes(&note)
        guard note != before else { return }
        if touch { note.updatedAt = Date() }
        notes[index] = note
        save(id, immediately: immediately)
    }

    public func setBody(_ body: String, for id: UUID) {
        update(id: id) { note in
            // Record completion timestamps for newly checked items.
            let previous = Set(ChecklistParser.items(in: note.body, noteID: id)
                .filter(\.isCompleted).map { $0.text.trimmingCharacters(in: .whitespaces) })
            note.body = body
            let now = Date()
            for item in ChecklistParser.items(in: body, noteID: id) where item.isCompleted {
                let key = item.text.trimmingCharacters(in: .whitespaces)
                if !previous.contains(key) { note.checklistCompletions[key] = now }
            }
        }
    }

    public func setArchived(_ archived: Bool, for id: UUID) {
        update(id: id, immediately: true) { $0.isArchived = archived }
    }

    public func delete(id: UUID) {
        notes.removeAll { $0.id == id }
        pendingSaves.remove(id)
        storage.remove(url(for: id))
    }

    /// Records which notes were on screen so they can be restored next launch.
    public func recordOpenNotes(_ openIDs: Set<UUID>) {
        for note in notes {
            let shouldBeOpen = openIDs.contains(note.id)
            if note.wasOpenOnTermination != shouldBeOpen {
                update(id: note.id, touch: false) { $0.wasOpenOnTermination = shouldBeOpen }
            }
        }
    }

    // MARK: - Saving

    private func url(for id: UUID) -> URL {
        notesDirectory.appendingPathComponent("\(id.uuidString).json")
    }

    private func save(_ id: UUID, immediately: Bool) {
        pendingSaves.insert(id)
        guard debounceEnabled && !immediately else {
            flush()
            return
        }
        saveWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            MainActor.assumeIsolated { self?.flush() }
        }
        saveWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + debounceInterval, execute: work)
    }

    /// Writes every pending note immediately. Safe to call repeatedly.
    public func flush() {
        saveWorkItem?.cancel()
        saveWorkItem = nil
        let ids = pendingSaves
        pendingSaves.removeAll()
        for id in ids {
            guard let note = note(id: id) else { continue }
            try? storage.write(note, to: url(for: id))
        }
    }

    public var hasPendingWrites: Bool { !pendingSaves.isEmpty }
}
