import PerchKit
import SwiftUI

struct SettingsView: View {
    @ObservedObject var settingsStore: SettingsStore
    var onShortcutChanged: (ShortcutSpec) -> Void
    var onDockIconChanged: (Bool) -> Void

    @State private var launchAtLoginFailed = false

    private var settings: Binding<AppSettings> { $settingsStore.settings }

    var body: some View {
        TabView {
            general.tabItem { Label("General", systemImage: "gearshape") }
            character.tabItem { Label("Character", systemImage: "figure.wave") }
            notes.tabItem { Label("Notes", systemImage: "note.text") }
            privacy.tabItem { Label("Privacy", systemImage: "lock") }
        }
        .frame(width: 470, height: 430)
    }

    // MARK: - General

    private var general: some View {
        Form {
            Section {
                Toggle("Launch at login", isOn: Binding(
                    get: { settingsStore.settings.launchAtLogin },
                    set: { wanted in
                        let achieved = LaunchAtLogin.setEnabled(wanted)
                        settingsStore.settings.launchAtLogin = achieved
                        launchAtLoginFailed = wanted && !achieved
                    }
                ))
                .disabled(!LaunchAtLogin.isAvailable)
                if !LaunchAtLogin.isAvailable {
                    Text("Available once Perch Notes is running from an app bundle. See “Build a .app bundle” in the README.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else if launchAtLoginFailed {
                    Text("macOS declined the request. Check Login Items in System Settings.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Picker("New note shortcut", selection: Binding(
                    get: { settingsStore.settings.newNoteShortcut },
                    set: {
                        settingsStore.settings.newNoteShortcut = $0
                        onShortcutChanged($0)
                    }
                )) {
                    ForEach(GlobalShortcutMonitor.presets, id: \.name) { preset in
                        Text(preset.name).tag(preset.spec)
                    }
                }

                Picker("Default note colour", selection: settings.defaultNoteColor) {
                    ForEach(NoteColor.allCases) { color in
                        Text(color.displayName).tag(color)
                    }
                }

                Picker("Appearance", selection: settings.appearance) {
                    ForEach(AppearanceMode.allCases, id: \.self) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
            }

            Section {
                Toggle("New notes stay on top", isOn: settings.defaultAlwaysOnTop)
                Toggle("Reopen notes after relaunch", isOn: settings.restoreOpenNotes)
                Toggle("Show Dock icon", isOn: Binding(
                    get: { settingsStore.settings.showDockIcon },
                    set: {
                        settingsStore.settings.showDockIcon = $0
                        onDockIconChanged($0)
                    }
                ))
            }
        }
        .formStyle(.grouped)
    }

    // MARK: - Character

    private var character: some View {
        Form {
            Section {
                Toggle("Show the character on notes", isOn: settings.character.isEnabled)
                Picker("Animation", selection: settings.character.animationIntensity) {
                    ForEach(AnimationIntensity.allCases, id: \.self) { intensity in
                        Text(intensity.displayName).tag(intensity)
                    }
                }
                Toggle("Quiet mode", isOn: settings.character.quietMode)
                Text("Quiet mode keeps the character still for longer stretches.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section {
                LabeledContent("Falls asleep after") {
                    HStack {
                        Slider(value: settings.character.sleepingDelay, in: 15...600, step: 15)
                        Text(sleepLabel)
                            .font(.system(.body, design: .rounded).monospacedDigit())
                            .frame(width: 62, alignment: .trailing)
                    }
                }
                LabeledContent("Size") {
                    HStack {
                        Slider(value: settings.character.scale, in: 0.7...1.4, step: 0.05)
                        Text("\(Int(settingsStore.settings.character.scale * 100))%")
                            .font(.system(.body, design: .rounded).monospacedDigit())
                            .frame(width: 62, alignment: .trailing)
                    }
                }
            }

            Section {
                Toggle("Glance toward the pointer", isOn: settings.character.followsPointer)
                Toggle("React to completed tasks", isOn: settings.character.celebratesTasks)
                Toggle("Allow clicking and dragging the character",
                       isOn: settings.character.interactionEnabled)
                Toggle("Always reduce motion", isOn: settings.character.reducedMotionOverride)
                Text("Perch Notes already follows the system Reduce Motion setting; this forces it on.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
    }

    private var sleepLabel: String {
        let seconds = Int(settingsStore.settings.character.sleepingDelay)
        return seconds < 60 ? "\(seconds)s" : "\(seconds / 60)m"
    }

    // MARK: - Notes

    private var notes: some View {
        Form {
            Section {
                LabeledContent("Text size") {
                    HStack {
                        Slider(value: settings.defaultFontSize, in: 12...22, step: 1)
                        Text("\(Int(settingsStore.settings.defaultFontSize)) pt")
                            .font(.system(.body, design: .rounded).monospacedDigit())
                            .frame(width: 52, alignment: .trailing)
                    }
                }
                Picker("Default note size", selection: Binding(
                    get: { NoteSizePreset.matching(settingsStore.settings.defaultNoteSize) },
                    set: { settingsStore.settings.defaultNoteSize = $0.frame }
                )) {
                    ForEach(NoteSizePreset.allCases, id: \.self) { preset in
                        Text(preset.displayName).tag(preset)
                    }
                }
            }

            Section {
                Toggle("Check spelling while typing", isOn: settings.spellCheckingEnabled)
                Toggle("Detect links automatically", isOn: settings.smartLinksEnabled)
                Toggle("Ask before deleting a note", isOn: settings.confirmBeforeDeletion)
            }

            Section {
                Text("Press ⌘L in a note to turn the selected lines into a checklist. Return starts the next item; Return on an empty item leaves the list.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
    }

    // MARK: - Privacy

    private var privacy: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Everything stays on this Mac")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                privacyRow("externaldrive", "Notes are stored locally",
                           "Plain JSON files in ~/Library/Application Support/PerchNotes. You can read, back up or delete them yourself.")
                privacyRow("eye.slash", "No screen recording",
                           "The character reacts to typing in its own note and to the pointer inside that window. Nothing outside Perch Notes is observed.")
                privacyRow("network.slash", "Nothing leaves the app",
                           "Perch Notes makes no network requests and has no analytics.")
                privacyRow("person.crop.circle.badge.xmark", "No account",
                           "There is nothing to sign in to, and the app works entirely offline.")
                privacyRow("hand.raised", "No special permissions",
                           "The global shortcut uses the system hot-key API, so Accessibility access is never requested. Notifications are only requested if you set a reminder.")
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func privacyRow(_ symbol: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 13))
                .frame(width: 18)
                .foregroundColor(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 12, weight: .medium))
                Text(detail).font(.system(size: 11)).foregroundColor(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

enum NoteSizePreset: String, CaseIterable {
    case small, medium, large

    var displayName: String {
        switch self {
        case .small: return "Small"
        case .medium: return "Medium"
        case .large: return "Large"
        }
    }

    var frame: StoredFrame {
        switch self {
        case .small: return StoredFrame(x: 0, y: 0, width: 320, height: 380)
        case .medium: return StoredFrame(x: 0, y: 0, width: 380, height: 480)
        case .large: return StoredFrame(x: 0, y: 0, width: 460, height: 600)
        }
    }

    static func matching(_ frame: StoredFrame) -> NoteSizePreset {
        allCases.min(by: { abs($0.frame.width - frame.width) < abs($1.frame.width - frame.width) })
            ?? .medium
    }
}
