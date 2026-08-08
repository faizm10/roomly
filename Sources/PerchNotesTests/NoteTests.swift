import Foundation
import PerchKit

func runNoteTests() {
    TinyTest.suite("Note model") {
        TinyTest.test("derives its title from the first non-empty line") {
            let note = Note(body: "\n\nGroceries for Sunday\nmilk\neggs")
            TinyTest.equal(note.displayTitle, "Groceries for Sunday")
        }

        TinyTest.test("strips checklist and heading markers from the derived title") {
            TinyTest.equal(Note(body: "- [x] Ship the beta").displayTitle, "Ship the beta")
            TinyTest.equal(Note(body: "## Release plan").displayTitle, "Release plan")
        }

        TinyTest.test("prefers a custom title when one is set") {
            let note = Note(customTitle: "Launch", body: "something else entirely")
            TinyTest.equal(note.displayTitle, "Launch")
        }

        TinyTest.test("falls back to a placeholder for an empty note") {
            TinyTest.equal(Note(body: "   \n\n").displayTitle, "New Note")
        }

        TinyTest.test("truncates very long first lines") {
            let long = String(repeating: "a", count: 200)
            let title = Note(body: long).displayTitle
            TinyTest.expect(title.count <= 61, "title should be clamped, got \(title.count)")
            TinyTest.expect(title.hasSuffix("…"), "clamped title should be elided")
        }

        TinyTest.test("previews the first body line after the title") {
            let note = Note(body: "Title line\n- [ ] first task\nsecond")
            TinyTest.equal(note.preview, "first task")
        }

        TinyTest.test("round-trips through JSON with every field intact") {
            var note = Note(body: "- [x] done\n- [ ] todo", color: .sage)
            note.isPinnedAboveWindows = true
            note.characterPosition = 0.25
            note.lastWindowFrame = StoredFrame(x: 10, y: 20, width: 300, height: 400)
            note.reminderDate = Date(timeIntervalSince1970: 1_700_000_000)

            let data = try FileStorage.encoder.encode(note)
            let decoded = try FileStorage.decoder.decode(Note.self, from: data)
            TinyTest.equal(decoded, note)
        }

        TinyTest.test("decodes a minimal record written by an older version") {
            let json = #"{"id":"\#(UUID().uuidString)"}"#
            let decoded = try FileStorage.decoder.decode(Note.self, from: Data(json.utf8))
            TinyTest.equal(decoded.body, "")
            TinyTest.equal(decoded.color, .cream)
            TinyTest.equal(decoded.isArchived, false)
        }
    }
}
