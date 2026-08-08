import AppKit
import PerchKit
import SwiftUI

/// A note window. Borderless in feel but still a real titled panel, so edge
/// resizing, Spaces behaviour and keyboard handling stay native.
final class FloatingNotePanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

/// The transparent area around the paper must not swallow clicks meant for
/// whatever is behind the note, so hit testing is limited to the paper plus the
/// character's own box.
final class NoteContainerView: NSView {
    /// In view coordinates (top-left origin, matching the SwiftUI layout).
    var interactiveRects: [CGRect] = []

    override func hitTest(_ point: NSPoint) -> NSView? {
        let flipped = CGPoint(x: point.x, y: bounds.height - point.y)
        guard interactiveRects.contains(where: { $0.contains(flipped) }) else { return nil }
        return super.hitTest(point)
    }

    override var isFlipped: Bool { false }
}

@MainActor
final class NoteWindowController: NSObject, NSWindowDelegate {
    let noteID: UUID
    let panel: FloatingNotePanel
    let session: NoteSession
    let character: CharacterController

    private let store: NoteStore
    private weak var manager: NoteWindowManager?
    private let container: NoteContainerView
    private var hostingView: NSHostingView<NoteContentView>!

    private var lastOrigin: NSPoint
    private var lastMoveTime: TimeInterval = 0
    private var dragEndTimer: Timer?
    private var isClosing = false

    private let reminders: ReminderScheduler

    init(note: Note, store: NoteStore, settings: AppSettings, isDark: Bool,
         frame: NSRect, manager: NoteWindowManager, reminders: ReminderScheduler) {
        self.noteID = note.id
        self.store = store
        self.manager = manager
        self.reminders = reminders

        let controller = CharacterController(
            preferences: settings.character,
            reduceMotion: settings.character.reducedMotionOverride
                || NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        )
        self.character = controller
        self.session = NoteSession(note: note, store: store, settings: settings,
                                   isDark: isDark, character: controller)

        panel = FloatingNotePanel(
            contentRect: frame,
            styleMask: [.titled, .fullSizeContentView, .resizable, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        container = NoteContainerView(frame: NSRect(origin: .zero, size: frame.size))
        lastOrigin = frame.origin

        super.init()

        configurePanel()
        wireSession()
        controller.onExitFinished = { [weak self] in self?.finishClose() }
    }

    // MARK: - Setup

    private func configurePanel() {
        panel.title = session.displayTitle
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.isOpaque = false
        panel.backgroundColor = .clear
        // The paper draws its own shadow; the window's rectangular one would
        // show through the transparent margin.
        panel.hasShadow = false
        panel.isFloatingPanel = false
        panel.hidesOnDeactivate = false
        panel.animationBehavior = .utilityWindow
        panel.minSize = NSSize(
            width: NoteMetrics.minimumWindowSize.width,
            height: NoteMetrics.minimumWindowSize.height
        )
        panel.delegate = self
        for button in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] {
            panel.standardWindowButton(button)?.isHidden = true
        }

        let content = NoteContentView(session: session, character: character)
        hostingView = NSHostingView(rootView: content)
        hostingView.translatesAutoresizingMaskIntoConstraints = false
        container.autoresizingMask = [.width, .height]
        container.addSubview(hostingView)
        NSLayoutConstraint.activate([
            hostingView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            hostingView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            hostingView.topAnchor.constraint(equalTo: container.topAnchor),
            hostingView.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        panel.contentView = container

        applyPinned(session.isPinned)
        updateInteractiveRects()
    }

    private func wireSession() {
        session.onRequestClose = { [weak self] in self?.requestClose() }
        session.onPinChanged = { [weak self] pinned in self?.applyPinned(pinned) }
        session.onRequestArchive = { [weak self] in
            guard let self else { return }
            self.store.setArchived(true, for: self.noteID)
            self.requestClose()
        }
        session.onRequestDelete = { [weak self] in self?.confirmDelete() }
        session.onReminderChanged = { [weak self] _ in self?.reminders.refresh() }
    }

    /// The paper plus the character's box; everything else is click-through.
    private func updateInteractiveRects() {
        let size = container.bounds.size
        let paper = CGRect(
            x: NoteMetrics.paperInsetSide,
            y: NoteMetrics.paperInsetTop,
            width: max(0, size.width - NoteMetrics.paperInsetSide * 2),
            height: max(0, size.height - NoteMetrics.paperInsetTop - NoteMetrics.paperInsetBottom)
        )
        var rects = [paper]

        if session.settings.character.isEnabled {
            let scale = 0.8 * CGFloat(session.settings.character.scale)
            let centerX = paper.minX + CGFloat(
                CharacterAnchor.centerX(for: session.characterPosition,
                                        windowWidth: Double(paper.width),
                                        scale: Double(scale))
            )
            let width = NibDesign.size.width * scale
            rects.append(
                CGRect(x: centerX - width / 2,
                       y: paper.minY - NibDesign.gripLineY * scale,
                       width: width,
                       height: NibDesign.gripLineY * scale + 6)
            )
        }
        container.interactiveRects = rects
    }

    // MARK: - Presenting

    func show(activating: Bool) {
        panel.setFrame(panel.frame, display: true)
        if activating {
            panel.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        } else {
            // Restored notes appear without pulling focus away from the user.
            panel.orderFrontRegardless()
        }
        character.isPaused = false
        character.isWindowActive = activating
        character.send(.noteOpened)
        session.isEditorFocused = activating
        ensureOnscreen()
        // Record the frame straight away: a note that is never moved still has
        // to come back where the user left it.
        persistFrame()
    }

    /// Last line of defence: whatever produced this frame — a restored
    /// position, a cascade, or a display that has since been unplugged — the
    /// window must end up somewhere the user can actually reach it.
    func ensureOnscreen() {
        let screens = NSScreen.screens.map(StoredFrame.init(visibleFrameOf:))
        guard !screens.isEmpty else { return }
        let current = StoredFrame(rect: panel.frame)
        let corrected = WindowRestoration.restoredFrame(for: current, screens: screens,
                                                        defaultSize: current)
        guard corrected != current else { return }
        panel.setFrame(NSRect(x: corrected.x, y: corrected.y,
                              width: corrected.width, height: corrected.height),
                       display: true)
        persistFrame()
    }

    func focus() {
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        session.isEditorFocused = true
    }

    func applySettings(_ settings: AppSettings, isDark: Bool) {
        session.applySettings(settings, isDark: isDark)
        character.reduceMotion = settings.character.reducedMotionOverride
            || NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        updateInteractiveRects()
    }

    private func applyPinned(_ pinned: Bool) {
        panel.level = pinned ? .floating : .normal
        panel.collectionBehavior = pinned
            ? [.canJoinAllSpaces, .fullScreenAuxiliary]
            : [.moveToActiveSpace, .fullScreenAuxiliary]
    }

    // MARK: - Closing

    /// Plays the climb-away animation, then closes. The window never lingers:
    /// the exit timing is short by design.
    func requestClose() {
        guard !isClosing else { return }
        isClosing = true
        persistFrame()
        store.flush()
        guard session.settings.character.isEnabled else {
            finishClose()
            return
        }
        character.send(.noteClosing)
    }

    private func finishClose() {
        guard panel.isVisible else { return }
        panel.orderOut(nil)
        manager?.windowDidClose(noteID: noteID)
    }

    private func confirmDelete() {
        let alert = NSAlert()
        alert.messageText = "Delete “\(session.displayTitle)”?"
        alert.informativeText = "This permanently removes the note from this Mac. It cannot be undone."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Delete")
        alert.addButton(withTitle: "Cancel")
        guard session.settings.confirmBeforeDeletion else {
            performDelete()
            return
        }
        alert.beginSheetModal(for: panel) { [weak self] response in
            guard response == .alertFirstButtonReturn else { return }
            self?.performDelete()
        }
    }

    private func performDelete() {
        store.delete(id: noteID)
        isClosing = true
        panel.orderOut(nil)
        manager?.windowDidClose(noteID: noteID)
    }

    // MARK: - NSWindowDelegate

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        requestClose()
        return false
    }

    func windowDidMove(_ notification: Notification) {
        let origin = panel.frame.origin
        let now = CACurrentMediaTime()
        let elapsed = now - lastMoveTime
        let dx = Double(origin.x - lastOrigin.x)
        lastOrigin = origin
        lastMoveTime = now

        // Only treat this as a user drag when moves arrive in quick succession.
        if elapsed < 0.25 {
            character.send(.dragBegan)
            character.reportDragVelocity(dx: dx)
        }
        scheduleDragEnd()
        persistFrame()
    }

    private func scheduleDragEnd() {
        dragEndTimer?.invalidate()
        let timer = Timer(timeInterval: 0.16, repeats: false) { [weak self] _ in
            Task { @MainActor in self?.character.send(.dragEnded) }
        }
        RunLoop.main.add(timer, forMode: .common)
        dragEndTimer = timer
    }

    func windowWillStartLiveResize(_ notification: Notification) {
        character.send(.resizeBegan)
    }

    func windowDidEndLiveResize(_ notification: Notification) {
        character.send(.resizeEnded)
        persistFrame()
    }

    func windowDidResize(_ notification: Notification) {
        updateInteractiveRects()
    }

    func windowDidChangeOcclusionState(_ notification: Notification) {
        // Stop every timer while the note is not actually on screen.
        character.isPaused = !panel.occlusionState.contains(.visible)
    }

    func windowDidBecomeKey(_ notification: Notification) {
        character.isPaused = false
        character.isWindowActive = true
    }

    func windowDidResignKey(_ notification: Notification) {
        character.isWindowActive = false
    }

    private func persistFrame() {
        let frame = StoredFrame(rect: panel.frame)
        store.update(id: noteID, touch: false) { $0.lastWindowFrame = frame }
    }
}

extension StoredFrame {
    init(rect: NSRect) {
        self.init(x: Double(rect.origin.x), y: Double(rect.origin.y),
                  width: Double(rect.width), height: Double(rect.height))
    }

    init(visibleFrameOf screen: NSScreen) {
        self.init(rect: screen.visibleFrame)
    }
}
