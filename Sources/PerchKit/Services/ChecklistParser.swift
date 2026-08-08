import Foundation

/// Parsing and editing for the inline checklist syntax used inside note
/// bodies: an optionally indented `- [ ] ` or `- [x] ` prefix.
///
/// Keeping checklists as text (rather than a separate block model) means
/// native undo, selection, copy and paste all keep working for free.
public enum ChecklistParser {
    public static let uncheckedMarker = "- [ ] "
    public static let checkedMarker = "- [x] "

    /// Splits a line into (indent, marker?, text).
    public struct ParsedLine: Equatable, Sendable {
        public var indent: String
        public var isChecklist: Bool
        public var isCompleted: Bool
        public var text: String

        public var marker: String {
            guard isChecklist else { return "" }
            return isCompleted ? checkedMarker : uncheckedMarker
        }

        public func rendered() -> String { indent + marker + text }
    }

    public static func parse(_ line: String) -> ParsedLine {
        let indentEnd = line.firstIndex(where: { $0 != " " && $0 != "\t" }) ?? line.endIndex
        let indent = String(line[line.startIndex..<indentEnd])
        var rest = String(line[indentEnd...])

        // Accept both "- [ ] " and a bare "[ ] " so pasted lists still work.
        for dash in ["- ", "* ", ""] {
            for (box, done) in [("[ ] ", false), ("[x] ", true), ("[X] ", true)] {
                let prefix = dash + box
                if rest.hasPrefix(prefix) {
                    rest.removeFirst(prefix.count)
                    return ParsedLine(indent: indent, isChecklist: true, isCompleted: done, text: rest)
                }
            }
            // A trailing empty checklist item has no space after the box.
            for (box, done) in [("[ ]", false), ("[x]", true), ("[X]", true)] {
                let prefix = dash + box
                if rest == prefix {
                    return ParsedLine(indent: indent, isChecklist: true, isCompleted: done, text: "")
                }
            }
        }
        return ParsedLine(indent: indent, isChecklist: false, isCompleted: false, text: rest)
    }

    public static func isChecklistLine(_ line: String) -> Bool { parse(line).isChecklist }

    public static func strippingMarker(_ line: String) -> String {
        let parsed = parse(line)
        return parsed.isChecklist ? parsed.indent + parsed.text : line
    }

    public static func lines(of body: String) -> [String] {
        body.components(separatedBy: "\n")
    }

    public static func join(_ lines: [String]) -> String {
        lines.joined(separator: "\n")
    }

    public static func items(in body: String, noteID: UUID,
                             completions: [String: Date] = [:]) -> [ChecklistItem] {
        var result: [ChecklistItem] = []
        for (index, line) in lines(of: body).enumerated() {
            let parsed = parse(line)
            guard parsed.isChecklist else { continue }
            let key = parsed.text.trimmingCharacters(in: .whitespaces)
            result.append(
                ChecklistItem(
                    id: "\(noteID.uuidString)#\(index)",
                    noteID: noteID,
                    text: parsed.text,
                    isCompleted: parsed.isCompleted,
                    order: result.count,
                    lineIndex: index,
                    completedAt: parsed.isCompleted ? completions[key] : nil
                )
            )
        }
        return result
    }

    /// Toggles the checkbox on `lineIndex`. Returns nil when the line is not a
    /// checklist item, so callers can leave the document untouched.
    public static func togglingItem(at lineIndex: Int, in body: String) -> String? {
        var all = lines(of: body)
        guard all.indices.contains(lineIndex) else { return nil }
        var parsed = parse(all[lineIndex])
        guard parsed.isChecklist else { return nil }
        parsed.isCompleted.toggle()
        all[lineIndex] = parsed.rendered()
        return join(all)
    }

    /// Adds or removes the checklist marker on every line the selection
    /// touches. If any touched line lacks a marker, all of them gain one.
    public static func togglingChecklist(in body: String, lineRange: ClosedRange<Int>) -> String {
        var all = lines(of: body)
        let clamped = max(0, lineRange.lowerBound)...min(all.count - 1, lineRange.upperBound)
        guard clamped.lowerBound <= clamped.upperBound else { return body }

        let touched = clamped.map { parse(all[$0]) }
        let shouldAdd = touched.contains { !$0.isChecklist }

        for index in clamped {
            var parsed = parse(all[index])
            if shouldAdd {
                guard !parsed.isChecklist else { continue }
                parsed.isChecklist = true
                parsed.isCompleted = false
            } else {
                parsed.isChecklist = false
                parsed.isCompleted = false
            }
            all[index] = parsed.rendered()
        }
        return join(all)
    }

    // MARK: - Return-key behaviour

    public enum ReturnAction: Equatable, Sendable {
        /// Let the text view insert a plain newline.
        case insertPlainNewline
        /// Insert a newline followed by `prefix` (continuing the list).
        case continueChecklist(prefix: String)
        /// Replace the current (empty) checklist line, leaving list mode.
        case exitChecklist(replacementLineRange: Range<Int>)
    }

    /// Decides what Return should do given the line the caret sits on.
    /// Pressing Return after a checklist item starts another; pressing it on an
    /// empty item leaves checklist mode.
    public static func returnAction(forLine line: String) -> ReturnAction {
        let parsed = parse(line)
        guard parsed.isChecklist else { return .insertPlainNewline }
        if parsed.text.trimmingCharacters(in: .whitespaces).isEmpty {
            return .exitChecklist(replacementLineRange: 0..<line.count)
        }
        return .continueChecklist(prefix: parsed.indent + uncheckedMarker)
    }

    /// Line index containing `offset` (a UTF-16 offset into `body`).
    public static func lineIndex(forOffset offset: Int, in body: String) -> Int {
        var index = 0
        var consumed = 0
        for line in lines(of: body) {
            let end = consumed + line.utf16.count
            if offset <= end { return index }
            consumed = end + 1 // newline
            index += 1
        }
        return max(0, index - 1)
    }

    /// UTF-16 range of `lineIndex` inside `body`.
    public static func range(ofLine lineIndex: Int, in body: String) -> Range<Int>? {
        var consumed = 0
        for (index, line) in lines(of: body).enumerated() {
            let length = line.utf16.count
            if index == lineIndex { return consumed..<(consumed + length) }
            consumed += length + 1
        }
        return nil
    }

    /// Progress across all checklist items in a body.
    public static func progress(in body: String) -> (completed: Int, total: Int) {
        var completed = 0
        var total = 0
        for line in lines(of: body) {
            let parsed = parse(line)
            guard parsed.isChecklist else { continue }
            total += 1
            if parsed.isCompleted { completed += 1 }
        }
        return (completed, total)
    }
}
