import AppKit
import PerchKit
import SwiftUI

/// The writing surface. A plain `NSTextView` on purpose: native undo,
/// selection, spell checking, link detection and keyboard navigation all work
/// without reimplementation, and checklists are just styled text.
struct NoteTextEditor: NSViewRepresentable {
    @Binding var text: String
    var theme: NoteTheme
    var fontSize: CGFloat
    var spellChecking: Bool
    var smartLinks: Bool
    var isFocused: Bool
    var onEdit: () -> Void
    /// Fires when an item is ticked; the flag says whether the list is now done.
    var onChecklistCompleted: (Bool) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSScrollView()
        scrollView.borderType = .noBorder
        scrollView.hasVerticalScroller = true
        scrollView.autohidesScrollers = true
        scrollView.drawsBackground = false
        scrollView.scrollerStyle = .overlay

        let textView = NoteTextView()
        textView.delegate = context.coordinator
        textView.coordinator = context.coordinator
        textView.isRichText = false
        textView.allowsUndo = true
        textView.drawsBackground = false
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainerInset = NSSize(width: 2, height: 6)
        textView.textContainer?.widthTracksTextView = true
        textView.usesFindBar = true
        textView.isIncrementalSearchingEnabled = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.setAccessibilityLabel("Note text")

        scrollView.documentView = textView
        context.coordinator.textView = textView
        context.coordinator.apply(text: text, force: true)
        context.coordinator.applyTheme(theme, fontSize: fontSize)
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        context.coordinator.parent = self
        guard let textView = context.coordinator.textView else { return }

        textView.isContinuousSpellCheckingEnabled = spellChecking
        textView.isGrammarCheckingEnabled = spellChecking
        textView.isAutomaticLinkDetectionEnabled = smartLinks
        textView.isEditable = true
        textView.isSelectable = true

        context.coordinator.apply(text: text, force: false)
        context.coordinator.applyTheme(theme, fontSize: fontSize)

        if isFocused, textView.window?.firstResponder !== textView {
            DispatchQueue.main.async {
                textView.window?.makeFirstResponder(textView)
            }
        }
    }

    @MainActor
    final class Coordinator: NSObject, NSTextViewDelegate {
        var parent: NoteTextEditor
        weak var textView: NoteTextView?
        private var lastAppliedText: String?
        private var lastTheme: NoteTheme?
        private var lastFontSize: CGFloat = 0

        init(_ parent: NoteTextEditor) {
            self.parent = parent
        }

        func apply(text: String, force: Bool) {
            guard let textView else { return }
            guard force || textView.string != text else { return }
            guard force || lastAppliedText != text else { return }
            let selection = textView.selectedRange()
            textView.string = text
            lastAppliedText = text
            restyle()
            let clamped = NSRange(location: min(selection.location, text.utf16.count), length: 0)
            textView.setSelectedRange(clamped)
        }

        func applyTheme(_ theme: NoteTheme, fontSize: CGFloat) {
            guard let textView else { return }
            guard lastTheme != theme || lastFontSize != fontSize else { return }
            lastTheme = theme
            lastFontSize = fontSize
            textView.insertionPointColor = theme.nsAccent
            textView.selectedTextAttributes = [
                .backgroundColor: theme.nsAccent.withAlphaComponent(0.26)
            ]
            textView.linkTextAttributes = [
                .foregroundColor: theme.nsAccent,
                .underlineStyle: NSUnderlineStyle.single.rawValue,
                .cursor: NSCursor.pointingHand
            ]
            restyle()
        }

        /// Repaints checklist markers and dims completed items. Notes are short,
        /// so restyling the whole document on change stays cheap.
        func restyle() {
            guard let textView, let storage = textView.textStorage,
                  let theme = lastTheme else { return }
            let size = lastFontSize > 0 ? lastFontSize : 15
            let body = textView.string

            let paragraph = NSMutableParagraphStyle()
            paragraph.lineSpacing = size * 0.32
            paragraph.paragraphSpacing = size * 0.34
            paragraph.lineBreakMode = .byWordWrapping

            storage.beginEditing()
            let full = NSRange(location: 0, length: storage.length)
            storage.setAttributes([
                .font: NSFont.systemFont(ofSize: size, weight: .regular),
                .foregroundColor: theme.nsInk,
                .paragraphStyle: paragraph
            ], range: full)

            var offset = 0
            for line in ChecklistParser.lines(of: body) {
                let length = (line as NSString).length
                let parsed = ChecklistParser.parse(line)
                if parsed.isChecklist {
                    let markerLength = (parsed.indent + parsed.marker as NSString).length
                    let markerRange = NSRange(location: offset, length: min(markerLength, length))
                    storage.addAttributes([
                        .font: NSFont.monospacedSystemFont(ofSize: size * 0.92, weight: .medium),
                        .foregroundColor: parsed.isCompleted
                            ? theme.nsAccent
                            : theme.nsSecondaryInk.withAlphaComponent(0.85)
                    ], range: markerRange)

                    if parsed.isCompleted {
                        let textRange = NSRange(location: offset + markerLength,
                                                length: max(0, length - markerLength))
                        // Dim rather than strike through: completed items must
                        // stay comfortably readable.
                        storage.addAttributes([
                            .foregroundColor: theme.nsSecondaryInk
                        ], range: textRange)
                    }
                }
                offset += length + 1
            }
            storage.endEditing()
        }

        // MARK: - Delegate

        func textDidChange(_ notification: Notification) {
            guard let textView else { return }
            let previous = lastAppliedText ?? ""
            let updated = textView.string
            lastAppliedText = updated
            restyle()
            parent.text = updated
            parent.onEdit()
            reportChecklistProgress(from: previous, to: updated)
        }

        private func reportChecklistProgress(from old: String, to new: String) {
            let before = ChecklistParser.progress(in: old)
            let after = ChecklistParser.progress(in: new)
            guard after.completed > before.completed, after.total > 0 else { return }
            parent.onChecklistCompleted(after.completed == after.total)
        }

        /// Return continues a checklist, and a second Return on an empty item
        /// leaves list mode.
        func handleReturn(in textView: NoteTextView) -> Bool {
            let body = textView.string
            let caret = textView.selectedRange().location
            let lineIndex = ChecklistParser.lineIndex(forOffset: caret, in: body)
            let lines = ChecklistParser.lines(of: body)
            guard lines.indices.contains(lineIndex) else { return false }

            switch ChecklistParser.returnAction(forLine: lines[lineIndex]) {
            case .insertPlainNewline:
                return false

            case .continueChecklist(let prefix):
                textView.insertText("\n" + prefix, replacementRange: textView.selectedRange())
                return true

            case .exitChecklist:
                guard let range = ChecklistParser.range(ofLine: lineIndex, in: body) else { return false }
                let nsRange = NSRange(location: range.lowerBound, length: range.count)
                if textView.shouldChangeText(in: nsRange, replacementString: "") {
                    textView.textStorage?.replaceCharacters(in: nsRange, with: "")
                    textView.didChangeText()
                }
                return true
            }
        }

        /// Toggles the item on the clicked line when the click lands on its
        /// marker, so the marker behaves like a checkbox.
        func handleClick(at characterIndex: Int, in textView: NoteTextView) -> Bool {
            let body = textView.string
            let lineIndex = ChecklistParser.lineIndex(forOffset: characterIndex, in: body)
            let lines = ChecklistParser.lines(of: body)
            guard lines.indices.contains(lineIndex) else { return false }
            let parsed = ChecklistParser.parse(lines[lineIndex])
            guard parsed.isChecklist,
                  let lineRange = ChecklistParser.range(ofLine: lineIndex, in: body) else { return false }

            let markerLength = (parsed.indent + parsed.marker as NSString).length
            guard characterIndex >= lineRange.lowerBound,
                  characterIndex < lineRange.lowerBound + markerLength else { return false }

            guard let updated = ChecklistParser.togglingItem(at: lineIndex, in: body) else { return false }
            let full = NSRange(location: 0, length: (body as NSString).length)
            let selection = textView.selectedRange()
            if textView.shouldChangeText(in: full, replacementString: updated) {
                textView.textStorage?.replaceCharacters(in: full, with: updated)
                textView.didChangeText()
                textView.setSelectedRange(NSRange(location: min(selection.location, updated.utf16.count),
                                                  length: 0))
            }
            return true
        }
    }
}

/// `NSTextView` with checklist-aware Return and click handling.
final class NoteTextView: NSTextView {
    weak var coordinator: NoteTextEditor.Coordinator?

    override func insertNewline(_ sender: Any?) {
        if let coordinator, MainActor.assumeIsolated({ coordinator.handleReturn(in: self) }) { return }
        super.insertNewline(sender)
    }

    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        let index = characterIndexForInsertion(at: point)
        if let coordinator, MainActor.assumeIsolated({ coordinator.handleClick(at: index, in: self) }) {
            return
        }
        super.mouseDown(with: event)
    }

    /// Cmd-L toggles the checklist marker on the selected lines.
    @objc func toggleChecklistMarker(_ sender: Any?) {
        let body = string
        let selection = selectedRange()
        let first = ChecklistParser.lineIndex(forOffset: selection.location, in: body)
        let last = ChecklistParser.lineIndex(forOffset: selection.location + selection.length, in: body)
        let updated = ChecklistParser.togglingChecklist(in: body, lineRange: first...last)
        guard updated != body else { return }
        let full = NSRange(location: 0, length: (body as NSString).length)
        guard shouldChangeText(in: full, replacementString: updated) else { return }
        textStorage?.replaceCharacters(in: full, with: updated)
        didChangeText()
        let delta = (updated as NSString).length - full.length
        setSelectedRange(NSRange(location: max(0, min(selection.location + delta, (updated as NSString).length)),
                                 length: 0))
    }
}
