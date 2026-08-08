import AppKit
import Combine
import PerchKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let storage = FileStorage(root: FileStorage.defaultRoot())
    private var noteStore: NoteStore!
    private var settingsStore: SettingsStore!
    private var windows: NoteWindowManager!
    private var reminders: ReminderScheduler!
    private let statusItem = StatusItemController()
    private let shortcut = GlobalShortcutMonitor()

    private var settingsWindow: NSWindow?
    private var labWindow: NSWindow?
    private var cancellables: Set<AnyCancellable> = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        noteStore = NoteStore(storage: storage)
        settingsStore = SettingsStore(storage: storage)
        reminders = ReminderScheduler(store: noteStore)
        windows = NoteWindowManager(store: noteStore, settingsStore: settingsStore,
                                    reminders: reminders)

        applyActivationPolicy(showDock: settingsStore.settings.showDockIcon)
        MainMenu.install(target: self)
        installStatusItem()
        registerShortcut(settingsStore.settings.newNoteShortcut)
        observeSettings()
        observeAppearance()

        reminders.start()
        windows.restoreSession()

        // First run: leave a note explaining the app instead of an empty state.
        if noteStore.notes.isEmpty {
            seedWelcomeNote()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        // The app lives in the menu bar and keeps running with no notes open.
        false
    }

    func applicationWillTerminate(_ notification: Notification) {
        windows.recordOpenNotesForTermination()
        noteStore.flush()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { statusItem.showPopover() }
        return true
    }

    // MARK: - Wiring

    private func installStatusItem() {
        let panel = MenuBarPanelView(
            store: noteStore,
            settingsStore: settingsStore,
            windows: windows,
            onNewNote: { [weak self] in
                self?.statusItem.closePopover()
                self?.newNote()
            },
            onOpenNote: { [weak self] id in
                self?.statusItem.closePopover()
                self?.windows.open(noteID: id, activating: true)
            },
            onCloseNote: { [weak self] id in self?.windows.close(noteID: id) },
            onOpenSettings: { [weak self] in
                self?.statusItem.closePopover()
                self?.openSettings()
            },
            onOpenCharacterLab: { [weak self] in
                self?.statusItem.closePopover()
                self?.openCharacterLab()
            },
            onQuit: { NSApp.terminate(nil) }
        )
        statusItem.onNewNote = { [weak self] in self?.newNote() }
        statusItem.onQuit = { NSApp.terminate(nil) }
        statusItem.onPopoverOpened = { [weak self] in self?.reminders.acknowledgeReminders() }
        statusItem.install(content: panel, windows: windows, reminders: reminders)
    }

    private func observeSettings() {
        settingsStore.$settings
            .removeDuplicates()
            .dropFirst()
            .sink { [weak self] settings in
                guard let self else { return }
                self.windows.applySettingsToAllWindows()
                self.applyActivationPolicy(showDock: settings.showDockIcon)
            }
            .store(in: &cancellables)
    }

    /// Notes follow the system appearance when the user has not overridden it.
    private func observeAppearance() {
        DistributedNotificationCenter.default().addObserver(
            forName: Notification.Name("AppleInterfaceThemeChangedNotification"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.windows.applySettingsToAllWindows() }
        }
    }

    private func applyActivationPolicy(showDock: Bool) {
        NSApp.setActivationPolicy(showDock ? .regular : .accessory)
    }

    private func registerShortcut(_ spec: ShortcutSpec) {
        let registered = shortcut.register(spec) { [weak self] in
            Task { @MainActor in self?.newNote() }
        }
        if !registered {
            NSLog("Perch Notes: the global shortcut \(GlobalShortcutMonitor.describe(spec)) is already in use.")
        }
    }

    private func seedWelcomeNote() {
        let body = """
        Welcome to Perch Notes

        Nib hangs from the top edge and watches you write. It looks toward the \
        line you are typing, thinks when you pause, and dozes off when you leave.

        - [ ] Press ⌘L to turn a line into a checklist item
        - [ ] Tick this box and watch Nib react
        - [ ] Press ⌥⌘N anywhere to make a new note

        Everything is saved locally as you type. Click the menu-bar icon for \
        search, recents and settings.
        """
        let note = noteStore.createNote(color: settingsStore.settings.defaultNoteColor,
                                        pinned: false, body: body)
        windows.open(noteID: note.id, activating: true)
    }

    // MARK: - Actions

    @objc func newNoteFromMenu() { newNote() }

    @objc func showPopoverFromMenu() { statusItem.showPopover() }

    private func newNote() {
        windows.createNote()
        statusItem.peek()
    }

    @objc func openSettings() {
        if let window = settingsWindow {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        let view = SettingsView(
            settingsStore: settingsStore,
            onShortcutChanged: { [weak self] spec in self?.registerShortcut(spec) },
            onDockIconChanged: { [weak self] show in self?.applyActivationPolicy(showDock: show) }
        )
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 470, height: 430),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Perch Notes Settings"
        window.contentView = NSHostingView(rootView: view)
        window.isReleasedWhenClosed = false
        window.center()
        settingsWindow = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func openCharacterLab() {
        if let window = labWindow {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 960, height: 640),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Character Lab (development)"
        window.contentView = NSHostingView(rootView: CharacterLabView())
        window.isReleasedWhenClosed = false
        window.center()
        labWindow = window
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
