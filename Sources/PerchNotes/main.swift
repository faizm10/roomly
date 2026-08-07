import AppKit
import QuartzCore

enum CharacterSkin {
    case perch
    case chiikawa
}

final class FloatingNotePanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var noteController: NoteWindowController!
    private var rightClickMenu: NSMenu?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        noteController = NoteWindowController()
        setupStatusItem()
        noteController.show()
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        guard let button = statusItem.button else { return }

        button.image = StatusIcon.image(sleeping: false)
        button.imagePosition = .imageOnly
        button.toolTip = "Perch Notes"
        button.target = self
        button.action = #selector(statusItemClicked)
        button.sendAction(on: [.leftMouseUp, .rightMouseUp])
    }

    @objc private func statusItemClicked() {
        guard let event = NSApp.currentEvent else {
            noteController.toggle()
            return
        }

        if event.type == .rightMouseUp || event.modifierFlags.contains(.control) {
            showMenu()
        } else {
            noteController.toggle()
        }
    }

    private func showMenu() {
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Open Floating Note", action: #selector(openNote), keyEquivalent: "o"))
        menu.addItem(NSMenuItem(title: "Arrival", action: #selector(arrival), keyEquivalent: "1"))
        menu.addItem(NSMenuItem(title: "Checklist Bounce", action: #selector(complete), keyEquivalent: "2"))
        menu.addItem(NSMenuItem.separator())

        let chiikawa = NSMenuItem(title: "Use Chiikawa Study", action: #selector(toggleChiikawa), keyEquivalent: "")
        chiikawa.state = noteController.skin == .chiikawa ? .on : .off
        menu.addItem(chiikawa)

        let quiet = NSMenuItem(title: "Quiet Mode", action: #selector(toggleQuiet), keyEquivalent: "")
        quiet.state = noteController.quietMode ? .on : .off
        menu.addItem(quiet)

        let reducedMotion = NSMenuItem(title: "Reduce Motion", action: #selector(toggleReducedMotion), keyEquivalent: "")
        reducedMotion.state = noteController.reduceMotion ? .on : .off
        menu.addItem(reducedMotion)

        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit Perch Notes", action: #selector(quit), keyEquivalent: "q"))

        rightClickMenu = menu
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        statusItem.menu = nil
    }

    @objc private func openNote() {
        noteController.show()
    }

    @objc private func arrival() {
        noteController.show()
        noteController.arrival()
    }

    @objc private func complete() {
        noteController.show()
        noteController.completeChecklist()
    }

    @objc private func toggleChiikawa() {
        noteController.skin = noteController.skin == .chiikawa ? .perch : .chiikawa
    }

    @objc private func toggleQuiet() {
        noteController.quietMode.toggle()
    }

    @objc private func toggleReducedMotion() {
        noteController.reduceMotion.toggle()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}

final class NoteWindowController: NSObject, NSWindowDelegate, NSTextViewDelegate {
    let panel: FloatingNotePanel
    private let rootView: NoteRootView
    private var typingTimer: Timer?
    private var sleepTimer: Timer?

    var skin: CharacterSkin {
        get { rootView.characterView.skin }
        set {
            rootView.characterView.skin = newValue
            rootView.characterView.arrival(reduceMotion: reduceMotion)
        }
    }

    var quietMode = false {
        didSet {
            rootView.characterView.quietMode = quietMode
        }
    }

    var reduceMotion = false {
        didSet {
            rootView.characterView.reduceMotion = reduceMotion
        }
    }

    override init() {
        rootView = NoteRootView(frame: NSRect(x: 0, y: 0, width: 620, height: 540))
        panel = FloatingNotePanel(
            contentRect: NSRect(x: 0, y: 0, width: 620, height: 540),
            styleMask: [.titled, .closable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        super.init()

        panel.title = "Perch Notes"
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.minSize = NSSize(width: 440, height: 420)
        panel.contentView = rootView
        panel.delegate = self
        rootView.textView.delegate = self
        scheduleSleep()
    }

    func show() {
        positionIfNeeded()
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        rootView.characterView.arrival(reduceMotion: reduceMotion)
    }

    func toggle() {
        if panel.isVisible {
            rootView.characterView.climbAway(reduceMotion: reduceMotion) { [weak self] in
                self?.panel.orderOut(nil)
            }
        } else {
            show()
        }
    }

    func arrival() {
        rootView.characterView.arrival(reduceMotion: reduceMotion)
    }

    func completeChecklist() {
        rootView.toggleNextChecklistLine()
        rootView.characterView.complete(reduceMotion: reduceMotion)
    }

    func textDidChange(_ notification: Notification) {
        typingTimer?.invalidate()
        rootView.characterView.typing(reduceMotion: reduceMotion)
        typingTimer = Timer.scheduledTimer(withTimeInterval: 1.6, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.rootView.characterView.thinking(reduceMotion: self.reduceMotion)
            self.scheduleSleep()
        }
    }

    func windowDidMove(_ notification: Notification) {
        rootView.characterView.dragReaction(reduceMotion: reduceMotion)
    }

    func windowDidResize(_ notification: Notification) {
        rootView.characterView.resizeReaction(reduceMotion: reduceMotion)
    }

    private func scheduleSleep() {
        sleepTimer?.invalidate()
        sleepTimer = Timer.scheduledTimer(withTimeInterval: 12.0, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.rootView.characterView.sleep(reduceMotion: self.reduceMotion)
        }
    }

    private func positionIfNeeded() {
        guard let screenFrame = NSScreen.main?.visibleFrame else { return }
        let size = panel.frame.size
        let origin = NSPoint(
            x: screenFrame.midX - size.width / 2,
            y: screenFrame.midY - size.height / 2
        )
        panel.setFrameOrigin(origin)
    }
}

final class NoteRootView: NSView {
    let characterView = CharacterView(frame: NSRect(x: 254, y: 368, width: 112, height: 156))
    let textView = NSTextView()

    private let toolbarView = NoteToolbarView()
    private let scrollView = NSScrollView()
    private var checklistIndex = 0

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.cornerRadius = 12
        layer?.masksToBounds = false

        addSubview(toolbarView)
        setupTextView()
        addSubview(scrollView)
        addSubview(characterView)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layout() {
        super.layout()
        toolbarView.frame = NSRect(x: 0, y: bounds.height - 58, width: bounds.width, height: 58)
        scrollView.frame = NSRect(x: 44, y: 34, width: bounds.width - 88, height: bounds.height - 184)
        characterView.frame.origin = NSPoint(x: bounds.midX - 56, y: bounds.height - 172)
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        let rounded = NSBezierPath(roundedRect: bounds.insetBy(dx: 0.5, dy: 0.5), xRadius: 12, yRadius: 12)
        NSColor(calibratedRed: 1.0, green: 0.97, blue: 0.88, alpha: 1.0).setFill()
        rounded.fill()

        NSColor(calibratedRed: 0.74, green: 0.66, blue: 0.49, alpha: 0.34).setStroke()
        rounded.lineWidth = 1
        rounded.stroke()
    }

    func toggleNextChecklistLine() {
        let storage = textView.textStorage ?? NSTextStorage()
        let original = storage.string
        let targets = ["[ ] Hands appear", "[ ] Typing makes", "[ ] Checklist completion"]
        let replacements = ["[x] Hands appear", "[x] Typing makes", "[x] Checklist completion"]
        let index = checklistIndex % targets.count

        if let range = original.range(of: targets[index]) {
            let nsRange = NSRange(range, in: original)
            storage.replaceCharacters(in: nsRange, with: replacements[index])
        }

        checklistIndex += 1
    }

    private func setupTextView() {
        scrollView.borderType = .noBorder
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false

        textView.string = """
        Keep the writing surface calm. The character should behave like it lives on the note, not beside it.

        Prototype beats:

        [ ] Hands appear first, then the body swings down.
        [ ] Typing makes Perch look toward the active line with a delay.
        [ ] Checklist completion earns one small positive bounce.

        The main note should always win. Quiet mode trims idle loops, and Reduce Motion removes bigger transitions.
        """
        textView.font = NSFont.systemFont(ofSize: 18, weight: .regular)
        textView.textColor = NSColor(calibratedWhite: 0.13, alpha: 1)
        textView.backgroundColor = .clear
        textView.drawsBackground = false
        textView.insertionPointColor = NSColor(calibratedRed: 0.39, green: 0.48, blue: 0.29, alpha: 1)
        textView.textContainerInset = NSSize(width: 0, height: 18)
        textView.isRichText = false
        textView.allowsUndo = true

        scrollView.documentView = textView
    }
}

final class NoteToolbarView: NSView {
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        NSColor(calibratedRed: 0.93, green: 0.86, blue: 0.72, alpha: 1.0).setFill()
        bounds.fill()

        NSColor(calibratedRed: 0.52, green: 0.29, blue: 0.23, alpha: 1.0).setFill()
        NSBezierPath(ovalIn: NSRect(x: 22, y: 20, width: 13, height: 13)).fill()

        let title = "Launch thoughts" as NSString
        title.draw(
            at: NSPoint(x: 44, y: 17),
            withAttributes: [
                .font: NSFont.systemFont(ofSize: 17, weight: .semibold),
                .foregroundColor: NSColor(calibratedWhite: 0.12, alpha: 1)
            ]
        )

        NSColor(calibratedWhite: 0.55, alpha: 0.32).setFill()
        NSBezierPath(roundedRect: NSRect(x: bounds.width - 72, y: 24, width: 24, height: 7), xRadius: 3.5, yRadius: 3.5).fill()
        NSBezierPath(roundedRect: NSRect(x: bounds.width - 40, y: 24, width: 24, height: 7), xRadius: 3.5, yRadius: 3.5).fill()
    }
}

final class CharacterView: NSView {
    var skin: CharacterSkin = .perch {
        didSet {
            needsDisplay = true
        }
    }

    var quietMode = false {
        didSet {
            startIdle()
        }
    }

    var reduceMotion = false {
        didSet {
            layer?.removeAllAnimations()
            if !reduceMotion {
                startIdle()
            }
        }
    }

    private let chiikawaImage: NSImage? = {
        guard let url = Bundle.module.url(forResource: "chiikawa", withExtension: "jpeg") else {
            return nil
        }
        return NSImage(contentsOf: url)
    }()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.anchorPoint = CGPoint(x: 0.5, y: 1)
        startIdle()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        drawArmsAndGrips()
        switch skin {
        case .perch:
            drawPerch()
        case .chiikawa:
            drawChiikawaStudy()
        }
    }

    func arrival(reduceMotion: Bool) {
        guard !reduceMotion else {
            alphaValue = 1
            return
        }
        alphaValue = 1
        animateKeyPath("transform.translation.y", values: [130, 42, -10, 4, 0], duration: 1.25)
        animateKeyPath("transform.rotation.z", values: [0, -0.08, 0.12, -0.04, 0], duration: 1.25)
        startIdle(delay: 1.3)
    }

    func typing(reduceMotion: Bool) {
        guard !reduceMotion else { return }
        animateKeyPath("transform.translation.y", values: [0, 0, 12, 2, 0], duration: 1.8)
    }

    func thinking(reduceMotion: Bool) {
        guard !reduceMotion else { return }
        animateKeyPath("transform.rotation.z", values: [0, -0.08, 0.04, 0], duration: 1.6)
    }

    func sleep(reduceMotion: Bool) {
        guard !reduceMotion else { return }
        animateKeyPath("transform.translation.y", values: [0, -4, -2, -4], duration: 4.0, repeats: .infinity)
    }

    func complete(reduceMotion: Bool) {
        guard !reduceMotion else { return }
        animateKeyPath("transform.translation.y", values: [0, 22, -6, 0], duration: 0.72)
        animateKeyPath("transform.scale", values: [1.0, 1.06, 0.98, 1.0], duration: 0.72)
        startIdle(delay: 0.8)
    }

    func dragReaction(reduceMotion: Bool) {
        guard !reduceMotion else { return }
        animateKeyPath("transform.rotation.z", values: [0, -0.18, 0.12, 0], duration: 0.8)
    }

    func resizeReaction(reduceMotion: Bool) {
        guard !reduceMotion else { return }
        animateKeyPath("transform.rotation.z", values: [0, 0.16, -0.1, 0], duration: 0.9)
        animateKeyPath("transform.translation.x", values: [0, 26, 14, 0], duration: 0.9)
    }

    func climbAway(reduceMotion: Bool, completion: @escaping () -> Void) {
        guard !reduceMotion else {
            completion()
            return
        }

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.75
            context.timingFunction = CAMediaTimingFunction(name: .easeIn)
            animator().frame.origin.y += 150
            animator().alphaValue = 0
        } completionHandler: { [weak self] in
            self?.frame.origin.y -= 150
            self?.alphaValue = 1
            completion()
        }
    }

    private func startIdle(delay: TimeInterval = 0) {
        guard !reduceMotion else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self else { return }
            let duration = self.quietMode ? 7.5 : 4.8
            self.animateKeyPath("transform.translation.y", values: [0, -4, 0, -2, 0], duration: duration, repeats: .infinity)
        }
    }

    private func animateKeyPath(_ keyPath: String, values: [CGFloat], duration: TimeInterval, repeats: Float = 1) {
        layer?.removeAnimation(forKey: keyPath)
        let animation = CAKeyframeAnimation(keyPath: keyPath)
        animation.values = values
        animation.duration = duration
        animation.repeatCount = repeats
        animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        animation.isRemovedOnCompletion = true
        layer?.add(animation, forKey: keyPath)
    }

    private func drawArmsAndGrips() {
        let line = skin == .chiikawa
            ? NSColor(calibratedRed: 0.19, green: 0.10, blue: 0.10, alpha: 1)
            : NSColor(calibratedRed: 0.38, green: 0.46, blue: 0.27, alpha: 1)
        let fill = skin == .chiikawa
            ? NSColor(calibratedWhite: 1.0, alpha: 1)
            : NSColor(calibratedRed: 0.55, green: 0.64, blue: 0.41, alpha: 1)

        fill.setFill()
        line.setStroke()

        drawRoundedRect(NSRect(x: 24, y: 76, width: 15, height: 62), radius: 8)
        drawRoundedRect(NSRect(x: 74, y: 76, width: 15, height: 62), radius: 8)
        drawRoundedRect(NSRect(x: 17, y: 130, width: 27, height: 21), radius: 10)
        drawRoundedRect(NSRect(x: 69, y: 130, width: 27, height: 21), radius: 10)
    }

    private func drawPerch() {
        NSColor(calibratedRed: 0.56, green: 0.66, blue: 0.42, alpha: 1).setFill()
        let body = NSBezierPath(roundedRect: NSRect(x: 29, y: 26, width: 56, height: 72), xRadius: 27, yRadius: 32)
        body.fill()

        NSColor(calibratedRed: 0.75, green: 0.82, blue: 0.55, alpha: 1).setFill()
        NSBezierPath(ovalIn: NSRect(x: 46, y: 77, width: 26, height: 19)).fill()

        NSColor(calibratedWhite: 0.08, alpha: 1).setFill()
        NSBezierPath(ovalIn: NSRect(x: 48, y: 58, width: 6, height: 11)).fill()
        NSBezierPath(ovalIn: NSRect(x: 64, y: 58, width: 6, height: 11)).fill()

        NSColor(calibratedRed: 0.75, green: 0.45, blue: 0.36, alpha: 0.42).setFill()
        NSBezierPath(ovalIn: NSRect(x: 40, y: 49, width: 9, height: 5)).fill()
        NSBezierPath(ovalIn: NSRect(x: 69, y: 49, width: 9, height: 5)).fill()

        NSColor(calibratedRed: 0.38, green: 0.46, blue: 0.27, alpha: 1).setFill()
        drawRoundedRect(NSRect(x: 43, y: 6, width: 13, height: 27), radius: 7)
        drawRoundedRect(NSRect(x: 62, y: 6, width: 13, height: 27), radius: 7)
    }

    private func drawChiikawaStudy() {
        guard let image = chiikawaImage else { return }
        let path = NSBezierPath(roundedRect: NSRect(x: 22, y: 13, width: 70, height: 84), xRadius: 32, yRadius: 32)
        NSGraphicsContext.saveGraphicsState()
        path.addClip()
        image.draw(in: NSRect(x: 12, y: 6, width: 94, height: 104), from: .zero, operation: .sourceOver, fraction: 1.0)
        NSGraphicsContext.restoreGraphicsState()
    }

    private func drawRoundedRect(_ rect: NSRect, radius: CGFloat) {
        let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
        path.fill()
        if skin == .chiikawa {
            path.lineWidth = 3
            path.stroke()
        }
    }
}

enum StatusIcon {
    static func image(sleeping: Bool) -> NSImage {
        let image = NSImage(size: NSSize(width: 22, height: 18))
        image.lockFocus()
        NSColor.clear.setFill()
        NSRect(x: 0, y: 0, width: 22, height: 18).fill()

        NSColor(calibratedRed: 0.45, green: 0.53, blue: 0.31, alpha: 1).setFill()
        NSBezierPath(ovalIn: NSRect(x: 4, y: sleeping ? 2 : 3, width: 14, height: 12)).fill()
        NSBezierPath(ovalIn: NSRect(x: 1, y: 6, width: 8, height: 8)).fill()
        NSBezierPath(ovalIn: NSRect(x: 13, y: 6, width: 8, height: 8)).fill()

        image.unlockFocus()
        image.isTemplate = false
        return image
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
