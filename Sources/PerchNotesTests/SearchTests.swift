import Foundation
import PerchKit

func runSearchTests() {
    let groceries = Note(body: "Groceries\n- [ ] oat milk\n- [x] sourdough", color: .sage)
    let launch = Note(customTitle: "Launch plan", body: "ship the beta on Friday", color: .dusty)
    var archived = Note(body: "Old milk receipts", color: .grey)
    archived.isArchived = true
    let all = [groceries, launch, archived]

    TinyTest.suite("Search") {
        TinyTest.test("an empty query returns nothing") {
            TinyTest.equal(NoteSearch.search("   ", in: all).count, 0)
        }

        TinyTest.test("matches titles and ranks them above body-only matches") {
            let results = NoteSearch.search("groceries", in: all)
            TinyTest.equal(results.first?.note.id, groceries.id)
        }

        TinyTest.test("matches body content") {
            let results = NoteSearch.search("friday", in: all)
            TinyTest.equal(results.count, 1)
            TinyTest.equal(results.first?.note.id, launch.id)
        }

        TinyTest.test("matches text inside checklist items") {
            let results = NoteSearch.search("sourdough", in: all)
            TinyTest.equal(results.first?.note.id, groceries.id)
        }

        TinyTest.test("is case-insensitive and requires every term") {
            TinyTest.equal(NoteSearch.search("LAUNCH", in: all).first?.note.id, launch.id)
            TinyTest.equal(NoteSearch.search("launch beta", in: all).count, 1)
            TinyTest.equal(NoteSearch.search("launch groceries", in: all).count, 0)
        }

        TinyTest.test("ranks archived matches below live ones and can exclude them") {
            let included = NoteSearch.search("milk", in: all)
            TinyTest.equal(included.count, 2)
            TinyTest.equal(included.first?.note.id, groceries.id)

            let excluded = NoteSearch.search("milk", in: all,
                                             options: .init(includeArchived: false))
            TinyTest.equal(excluded.count, 1)
            TinyTest.equal(excluded.first?.note.id, groceries.id)
        }

        TinyTest.test("builds a snippet around the match") {
            let long = Note(body: "Title\n" + String(repeating: "padding ", count: 30) + "needle here")
            let result = NoteSearch.search("needle", in: [long]).first
            TinyTest.expect(result != nil, "expected a result")
            TinyTest.expect(result?.snippet.contains("needle") == true,
                            "snippet should contain the term, got \(result?.snippet ?? "")")
            TinyTest.expect((result?.snippet.count ?? 0) <= 100, "snippet should stay short")
        }

        TinyTest.test("respects the result limit") {
            let many = (0..<80).map { Note(body: "note \($0) shared") }
            TinyTest.equal(NoteSearch.search("shared", in: many, options: .init(limit: 10)).count, 10)
        }
    }
}
