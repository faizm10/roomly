import Foundation
import PerchKit

@MainActor
func runPersistenceTests() {
    TinyTest.suite("Persistence") {
        TinyTest.test("creates a note and writes it to disk immediately") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let note = store.createNote(color: .sage, pinned: true)
                TinyTest.equal(store.notes.count, 1)

                let reloaded = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                TinyTest.equal(reloaded.notes.count, 1)
                TinyTest.equal(reloaded.note(id: note.id)?.color, .sage)
                TinyTest.equal(reloaded.note(id: note.id)?.isPinnedAboveWindows, true)
            }
        }

        TinyTest.test("autosaves edited content and survives a reload") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let note = store.createNote(color: .cream, pinned: false)
                store.setBody("Recipe\n- [ ] flour", for: note.id)

                let reloaded = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                TinyTest.equal(reloaded.note(id: note.id)?.body, "Recipe\n- [ ] flour")
                TinyTest.equal(reloaded.note(id: note.id)?.displayTitle, "Recipe")
            }
        }

        TinyTest.test("debounced writes are flushed on demand") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceInterval: 60)
                let note = store.createNote(color: .cream, pinned: false)
                store.setBody("typed but not yet written", for: note.id)
                TinyTest.expect(store.hasPendingWrites, "edit should be pending")

                store.flush()
                TinyTest.expect(!store.hasPendingWrites, "flush should drain the queue")
                let reloaded = NoteStore(storage: FileStorage(root: root))
                TinyTest.equal(reloaded.note(id: note.id)?.body, "typed but not yet written")
            }
        }

        TinyTest.test("persists checklist state and completion timestamps") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let note = store.createNote(color: .cream, pinned: false)
                store.setBody("- [ ] tidy\n- [ ] write", for: note.id)
                store.setBody("- [x] tidy\n- [ ] write", for: note.id)

                let reloaded = NoteStore(storage: FileStorage(root: root))
                let items = reloaded.note(id: note.id)?.checklistItems ?? []
                TinyTest.equal(items.count, 2)
                TinyTest.equal(items[0].isCompleted, true)
                TinyTest.equal(items[1].isCompleted, false)
                TinyTest.expect(items[0].completedAt != nil, "completion time should be recorded")
            }
        }

        TinyTest.test("archives without deleting, and deletes permanently on request") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let keep = store.createNote(color: .cream, pinned: false)
                let toss = store.createNote(color: .cream, pinned: false)

                store.setArchived(true, for: keep.id)
                TinyTest.equal(store.archivedNotes.count, 1)
                TinyTest.equal(store.activeNotes.count, 1)

                store.delete(id: toss.id)
                let reloaded = NoteStore(storage: FileStorage(root: root))
                TinyTest.equal(reloaded.notes.count, 1)
                TinyTest.equal(reloaded.notes.first?.id, keep.id)
                TinyTest.equal(reloaded.archivedNotes.count, 1)
            }
        }

        TinyTest.test("multiple notes stay independent") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let a = store.createNote(color: .pink, pinned: false)
                let b = store.createNote(color: .dusty, pinned: false)
                store.setBody("first", for: a.id)
                store.setBody("second", for: b.id)
                store.update(id: b.id) { $0.isPinnedAboveWindows = true }

                let reloaded = NoteStore(storage: FileStorage(root: root))
                TinyTest.equal(reloaded.note(id: a.id)?.body, "first")
                TinyTest.equal(reloaded.note(id: b.id)?.body, "second")
                TinyTest.equal(reloaded.note(id: a.id)?.isPinnedAboveWindows, false)
                TinyTest.equal(reloaded.note(id: b.id)?.isPinnedAboveWindows, true)
                TinyTest.equal(reloaded.note(id: a.id)?.color, .pink)
                TinyTest.equal(reloaded.note(id: b.id)?.color, .dusty)
            }
        }

        TinyTest.test("remembers which notes were open so they can be restored") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let open = store.createNote(color: .cream, pinned: false)
                let closed = store.createNote(color: .cream, pinned: false)
                store.recordOpenNotes([open.id])
                store.flush()

                let reloaded = NoteStore(storage: FileStorage(root: root))
                TinyTest.equal(reloaded.notesOpenAtTermination.map(\.id), [open.id])
                TinyTest.equal(reloaded.note(id: closed.id)?.wasOpenOnTermination, false)
            }
        }

        TinyTest.test("window frames survive a relaunch without reordering recents") {
            TinyTest.withTemporaryDirectory { root in
                let store = NoteStore(storage: FileStorage(root: root), debounceEnabled: false)
                let note = store.createNote(color: .cream, pinned: false)
                let stamp = store.note(id: note.id)!.updatedAt
                store.update(id: note.id, touch: false) {
                    $0.lastWindowFrame = StoredFrame(x: 120, y: 240, width: 400, height: 520)
                }

                let reloaded = NoteStore(storage: FileStorage(root: root))
                TinyTest.equal(reloaded.note(id: note.id)?.lastWindowFrame,
                               StoredFrame(x: 120, y: 240, width: 400, height: 520))
                TinyTest.equal(reloaded.note(id: note.id)?.updatedAt, stamp)
            }
        }

        TinyTest.test("settings persist and unknown fields fall back to defaults") {
            TinyTest.withTemporaryDirectory { root in
                let storage = FileStorage(root: root)
                let store = SettingsStore(storage: storage)
                store.settings.defaultNoteColor = .dusty
                store.settings.character.sleepingDelay = 42
                store.settings.character.quietMode = true

                let reloaded = SettingsStore(storage: storage)
                TinyTest.equal(reloaded.settings.defaultNoteColor, .dusty)
                TinyTest.close(reloaded.settings.character.sleepingDelay, 42)
                TinyTest.equal(reloaded.settings.character.quietMode, true)
                TinyTest.equal(reloaded.settings.restoreOpenNotes, true)

                try? Data("{}".utf8).write(to: root.appendingPathComponent("settings.json"))
                let empty = SettingsStore(storage: storage)
                TinyTest.equal(empty.settings, AppSettings())
            }
        }
    }
}
