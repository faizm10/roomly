import Foundation
import PerchKit

func runChecklistTests() {
    TinyTest.suite("Checklists") {
        TinyTest.test("recognises checked and unchecked lines") {
            TinyTest.expect(ChecklistParser.isChecklistLine("- [ ] buy milk"), "dash form")
            TinyTest.expect(ChecklistParser.isChecklistLine("- [x] buy milk"), "checked form")
            TinyTest.expect(ChecklistParser.isChecklistLine("[ ] pasted form"), "bare form")
            TinyTest.expect(!ChecklistParser.isChecklistLine("just a sentence"), "plain text")
            TinyTest.expect(!ChecklistParser.isChecklistLine("- a bullet"), "plain bullet")
        }

        TinyTest.test("keeps indentation when re-rendering a line") {
            let parsed = ChecklistParser.parse("    - [x] nested")
            TinyTest.equal(parsed.indent, "    ")
            TinyTest.equal(parsed.text, "nested")
            TinyTest.equal(parsed.rendered(), "    - [x] nested")
        }

        TinyTest.test("extracts items in order with completion state") {
            let id = UUID()
            let body = "Shopping\n- [x] milk\nnot a task\n- [ ] eggs"
            let items = ChecklistParser.items(in: body, noteID: id)
            TinyTest.equal(items.count, 2)
            TinyTest.equal(items[0].text, "milk")
            TinyTest.equal(items[0].isCompleted, true)
            TinyTest.equal(items[0].order, 0)
            TinyTest.equal(items[0].lineIndex, 1)
            TinyTest.equal(items[1].text, "eggs")
            TinyTest.equal(items[1].isCompleted, false)
            TinyTest.equal(items[1].lineIndex, 3)
        }

        TinyTest.test("toggles a single item without disturbing the rest") {
            let body = "- [ ] one\n- [ ] two"
            let toggled = ChecklistParser.togglingItem(at: 1, in: body)
            TinyTest.equal(toggled, "- [ ] one\n- [x] two")
            TinyTest.expect(ChecklistParser.togglingItem(at: 5, in: body) == nil, "out of range is a no-op")
        }

        TinyTest.test("refuses to toggle a non-checklist line") {
            TinyTest.expect(ChecklistParser.togglingItem(at: 0, in: "plain") == nil, "plain line is a no-op")
        }

        TinyTest.test("converts a selection into a checklist and back") {
            let body = "one\ntwo\nthree"
            let listed = ChecklistParser.togglingChecklist(in: body, lineRange: 0...1)
            TinyTest.equal(listed, "- [ ] one\n- [ ] two\nthree")
            let unlisted = ChecklistParser.togglingChecklist(in: listed, lineRange: 0...1)
            TinyTest.equal(unlisted, "one\ntwo\nthree")
        }

        TinyTest.test("adds markers to a mixed selection rather than removing them") {
            let body = "- [x] done\nplain"
            let result = ChecklistParser.togglingChecklist(in: body, lineRange: 0...1)
            TinyTest.equal(result, "- [x] done\n- [ ] plain")
        }

        TinyTest.test("Return continues a list, and a second Return leaves it") {
            TinyTest.equal(ChecklistParser.returnAction(forLine: "- [ ] milk"),
                           .continueChecklist(prefix: "- [ ] "))
            TinyTest.equal(ChecklistParser.returnAction(forLine: "  - [x] milk"),
                           .continueChecklist(prefix: "  - [ ] "))
            TinyTest.equal(ChecklistParser.returnAction(forLine: "- [ ] "),
                           .exitChecklist(replacementLineRange: 0..<6))
            TinyTest.equal(ChecklistParser.returnAction(forLine: "prose"), .insertPlainNewline)
        }

        TinyTest.test("maps offsets to lines and back") {
            let body = "abc\nde\nfghi"
            TinyTest.equal(ChecklistParser.lineIndex(forOffset: 0, in: body), 0)
            TinyTest.equal(ChecklistParser.lineIndex(forOffset: 3, in: body), 0)
            TinyTest.equal(ChecklistParser.lineIndex(forOffset: 4, in: body), 1)
            TinyTest.equal(ChecklistParser.lineIndex(forOffset: 9, in: body), 2)
            TinyTest.equal(ChecklistParser.range(ofLine: 1, in: body), 4..<6)
            TinyTest.equal(ChecklistParser.range(ofLine: 2, in: body), 7..<11)
        }

        TinyTest.test("reports progress across the whole note") {
            let (done, total) = ChecklistParser.progress(in: "- [x] a\n- [x] b\n- [ ] c\nprose")
            TinyTest.equal(done, 2)
            TinyTest.equal(total, 3)
        }
    }
}
