import AppKit

/// Builds the application menu.
///
/// A menu-bar-only app still needs one: `NSTextView` gets undo, cut, copy,
/// paste, select-all and Find from the menu's key equivalents, so without it
/// the writing experience would quietly lose its keyboard shortcuts.
@MainActor
enum MainMenu {
    static func install(target: AnyObject) {
        let menu = NSMenu()

        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Perch Notes",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())
        add(to: appMenu, title: "Settings…", action: #selector(AppDelegate.openSettings),
            key: ",", target: target)
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Perch Notes",
                        action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Perch Notes",
                        action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        menu.addItem(appItem)

        let noteItem = NSMenuItem()
        let noteMenu = NSMenu(title: "Note")
        add(to: noteMenu, title: "New Note", action: #selector(AppDelegate.newNoteFromMenu),
            key: "n", target: target)
        add(to: noteMenu, title: "Open Notes List", action: #selector(AppDelegate.showPopoverFromMenu),
            key: "l", modifiers: [.command, .shift], target: target)
        noteMenu.addItem(.separator())
        noteMenu.addItem(withTitle: "Toggle Checklist",
                         action: #selector(NoteTextView.toggleChecklistMarker(_:)),
                         keyEquivalent: "l")
        noteMenu.addItem(.separator())
        noteMenu.addItem(withTitle: "Close Note",
                         action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        noteItem.submenu = noteMenu
        menu.addItem(noteItem)

        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")),
                                    keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        let pasteMatch = editMenu.addItem(withTitle: "Paste and Match Style",
                                          action: #selector(NSTextView.pasteAsPlainText(_:)),
                                          keyEquivalent: "v")
        pasteMatch.keyEquivalentModifierMask = [.command, .option, .shift]
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)),
                         keyEquivalent: "a")
        editMenu.addItem(.separator())
        let findItem = NSMenuItem(title: "Find", action: nil, keyEquivalent: "")
        let findMenu = NSMenu(title: "Find")
        let find = findMenu.addItem(withTitle: "Find…",
                                    action: #selector(NSTextView.performFindPanelAction(_:)),
                                    keyEquivalent: "f")
        find.tag = Int(NSTextFinder.Action.showFindInterface.rawValue)
        let findNext = findMenu.addItem(withTitle: "Find Next",
                                        action: #selector(NSTextView.performFindPanelAction(_:)),
                                        keyEquivalent: "g")
        findNext.tag = Int(NSTextFinder.Action.nextMatch.rawValue)
        findItem.submenu = findMenu
        editMenu.addItem(findItem)

        let spelling = NSMenuItem(title: "Spelling", action: nil, keyEquivalent: "")
        let spellingMenu = NSMenu(title: "Spelling")
        spellingMenu.addItem(withTitle: "Show Spelling and Grammar",
                             action: #selector(NSText.showGuessPanel(_:)), keyEquivalent: ":")
        spellingMenu.addItem(withTitle: "Check Document Now",
                             action: #selector(NSText.checkSpelling(_:)), keyEquivalent: ";")
        spelling.submenu = spellingMenu
        editMenu.addItem(spelling)
        editItem.submenu = editMenu
        menu.addItem(editItem)

        let windowItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)),
                           keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Bring All to Front",
                           action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        windowItem.submenu = windowMenu
        menu.addItem(windowItem)

        NSApp.mainMenu = menu
        NSApp.windowsMenu = windowMenu
    }

    @discardableResult
    private static func add(to menu: NSMenu, title: String, action: Selector, key: String,
                            modifiers: NSEvent.ModifierFlags = [.command],
                            target: AnyObject) -> NSMenuItem {
        let item = menu.addItem(withTitle: title, action: action, keyEquivalent: key)
        item.keyEquivalentModifierMask = modifiers
        item.target = target
        return item
    }
}
