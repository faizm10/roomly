import AppKit
import Combine
import PerchKit
import SwiftUI

/// Owns the menu-bar item and its popover.
@MainActor
final class StatusItemController: NSObject, NSPopoverDelegate {
    private var statusItem: NSStatusItem!
    private let popover = NSPopover()
    private var currentIconState: MenuBarCharacterState = .asleep
    private var cancellables: Set<AnyCancellable> = []

    var onNewNote: () -> Void = {}
    var onQuit: () -> Void = {}

    func install(content: some View, windows: NoteWindowManager, reminders: ReminderScheduler) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        guard let button = statusItem.button else { return }
        button.image = StatusIcon.image(for: .asleep)
        button.imagePosition = .imageOnly
        button.toolTip = "Perch Notes"
        button.target = self
        button.action = #selector(statusItemClicked)
        button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        button.setAccessibilityLabel(StatusIcon.accessibilityDescription(for: .asleep))

        popover.behavior = .transient
        popover.animates = true
        popover.delegate = self
        popover.contentViewController = NSHostingController(rootView: AnyView(content))

        // The icon is redrawn only when the relevant state changes; it never
        // animates continuously.
        windows.$openNoteIDs
            .map(\.count)
            .removeDuplicates()
            .sink { [weak self, weak reminders] count in
                self?.updateIcon(openCount: count, due: reminders?.hasDueReminder ?? false)
            }
            .store(in: &cancellables)

        reminders.$hasDueReminder
            .removeDuplicates()
            .sink { [weak self, weak windows] due in
                self?.updateIcon(openCount: windows?.openCount ?? 0, due: due)
            }
            .store(in: &cancellables)
    }

    private func updateIcon(openCount: Int, due: Bool) {
        let state = CharacterStateMachine.menuBarState(openNoteCount: openCount, hasDueReminder: due)
        guard state != currentIconState else { return }
        currentIconState = state
        statusItem?.button?.image = StatusIcon.image(for: state)
        statusItem?.button?.setAccessibilityLabel(StatusIcon.accessibilityDescription(for: state))
    }

    /// A single quick nod when a note is created — the only motion the menu
    /// bar ever shows.
    func peek() {
        guard let button = statusItem?.button,
              !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion else { return }
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.12
            button.animator().alphaValue = 0.45
        } completionHandler: {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.22
                button.animator().alphaValue = 1
            }
        }
    }

    /// Opening the list is the acknowledgement: the alert dot clears.
    var onPopoverOpened: () -> Void = {}

    func showPopover() {
        guard let button = statusItem?.button else { return }
        onPopoverOpened()
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        popover.contentViewController?.view.window?.makeKey()
    }

    func closePopover() { popover.performClose(nil) }

    @objc private func statusItemClicked() {
        guard let event = NSApp.currentEvent else { return togglePopover() }
        if event.type == .rightMouseUp || event.modifierFlags.contains(.control) {
            showContextMenu()
        } else {
            togglePopover()
        }
    }

    private func togglePopover() {
        if popover.isShown { closePopover() } else { showPopover() }
    }

    private func showContextMenu() {
        let menu = NSMenu()
        menu.addItem(withTitle: "New Note", action: #selector(newNote), keyEquivalent: "n")
            .target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: "Quit Perch Notes", action: #selector(quit), keyEquivalent: "q")
            .target = self
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        statusItem.menu = nil
    }

    @objc private func newNote() { onNewNote() }
    @objc private func quit() { onQuit() }
}
