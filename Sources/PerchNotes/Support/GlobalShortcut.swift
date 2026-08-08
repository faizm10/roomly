import AppKit
import Carbon.HIToolbox
import PerchKit

/// Registers a system-wide hot key.
///
/// This uses Carbon's `RegisterEventHotKey`, which needs no Accessibility
/// permission — the app never observes keystrokes, it only asks the system to
/// tell it when one specific combination is pressed.
@MainActor
final class GlobalShortcutMonitor {
    private var hotKeyRef: EventHotKeyRef?
    private var eventHandler: EventHandlerRef?
    private var handler: (() -> Void)?
    private static let signature = OSType(0x50524348) // 'PRCH'

    nonisolated(unsafe) private static var shared: GlobalShortcutMonitor?

    init() {
        GlobalShortcutMonitor.shared = self
    }

    deinit {
        if let hotKeyRef { UnregisterEventHotKey(hotKeyRef) }
        if let eventHandler { RemoveEventHandler(eventHandler) }
    }

    /// Returns false when the combination is already claimed by another app.
    @discardableResult
    func register(_ spec: ShortcutSpec, handler: @escaping () -> Void) -> Bool {
        unregister()
        self.handler = handler

        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                      eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, event, _ -> OSStatus in
            var hotKeyID = EventHotKeyID()
            GetEventParameter(event, EventParamName(kEventParamDirectObject),
                              EventParamType(typeEventHotKeyID), nil,
                              MemoryLayout<EventHotKeyID>.size, nil, &hotKeyID)
            guard hotKeyID.signature == GlobalShortcutMonitor.signature else { return noErr }
            DispatchQueue.main.async {
                MainActor.assumeIsolated { GlobalShortcutMonitor.shared?.handler?() }
            }
            return noErr
        }, 1, &eventType, nil, &eventHandler)

        let hotKeyID = EventHotKeyID(signature: GlobalShortcutMonitor.signature, id: 1)
        let status = RegisterEventHotKey(
            spec.keyCode,
            GlobalShortcutMonitor.carbonModifiers(from: spec.modifiers),
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
        return status == noErr
    }

    func unregister() {
        if let hotKeyRef {
            UnregisterEventHotKey(hotKeyRef)
            self.hotKeyRef = nil
        }
        if let eventHandler {
            RemoveEventHandler(eventHandler)
            self.eventHandler = nil
        }
    }

    static func carbonModifiers(from cocoa: UInt) -> UInt32 {
        let flags = NSEvent.ModifierFlags(rawValue: cocoa)
        var carbon: UInt32 = 0
        if flags.contains(.command) { carbon |= UInt32(cmdKey) }
        if flags.contains(.option) { carbon |= UInt32(optionKey) }
        if flags.contains(.control) { carbon |= UInt32(controlKey) }
        if flags.contains(.shift) { carbon |= UInt32(shiftKey) }
        return carbon
    }

    /// A readable description such as "⌥⌘N" for the settings window.
    static func describe(_ spec: ShortcutSpec) -> String {
        let flags = NSEvent.ModifierFlags(rawValue: spec.modifiers)
        var text = ""
        if flags.contains(.control) { text += "⌃" }
        if flags.contains(.option) { text += "⌥" }
        if flags.contains(.shift) { text += "⇧" }
        if flags.contains(.command) { text += "⌘" }
        return text + (keyName(for: spec.keyCode) ?? "?")
    }

    static func keyName(for keyCode: UInt32) -> String? {
        let names: [UInt32: String] = [
            0: "A", 1: "S", 2: "D", 3: "F", 4: "H", 5: "G", 6: "Z", 7: "X", 8: "C", 9: "V",
            11: "B", 12: "Q", 13: "W", 14: "E", 15: "R", 16: "Y", 17: "T", 31: "O", 32: "U",
            34: "I", 35: "P", 37: "L", 38: "J", 40: "K", 45: "N", 46: "M", 49: "Space"
        ]
        return names[keyCode]
    }

    /// The combinations offered in Settings. Kept to a short, safe list rather
    /// than a full recorder, so users cannot capture a system shortcut.
    static let presets: [(name: String, spec: ShortcutSpec)] = {
        let option = NSEvent.ModifierFlags.option.rawValue
        let command = NSEvent.ModifierFlags.command.rawValue
        let control = NSEvent.ModifierFlags.control.rawValue
        let shift = NSEvent.ModifierFlags.shift.rawValue
        return [
            ("⌥⌘N", ShortcutSpec(keyCode: 45, modifiers: option | command)),
            ("⌃⌘N", ShortcutSpec(keyCode: 45, modifiers: control | command)),
            ("⇧⌘N", ShortcutSpec(keyCode: 45, modifiers: shift | command)),
            ("⌥⌘Space", ShortcutSpec(keyCode: 49, modifiers: option | command)),
            ("⌃⌥P", ShortcutSpec(keyCode: 35, modifiers: control | option))
        ]
    }()
}
