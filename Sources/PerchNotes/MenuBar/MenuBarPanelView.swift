import PerchKit
import SwiftUI

/// The menu-bar popover: a compact list of notes with search, not a dashboard.
struct MenuBarPanelView: View {
    @ObservedObject var store: NoteStore
    @ObservedObject var settingsStore: SettingsStore
    @ObservedObject var windows: NoteWindowManager

    var onNewNote: () -> Void
    var onOpenNote: (UUID) -> Void
    var onCloseNote: (UUID) -> Void
    var onOpenSettings: () -> Void
    var onOpenCharacterLab: () -> Void
    var onQuit: () -> Void

    @State private var query: String = ""
    @State private var showArchive = false
    @State private var pendingDeletion: Note?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var searchResults: [NoteSearchResult] {
        NoteSearch.search(query, in: store.notes)
    }

    private var openNotes: [Note] {
        store.notes.filter { windows.isOpen($0.id) }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    private var recentNotes: [Note] {
        store.activeNotes.filter { !windows.isOpen($0.id) }.prefix(8).map { $0 }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().opacity(0.5)
            searchField
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    if !query.isEmpty {
                        resultsSection
                    } else {
                        if !openNotes.isEmpty {
                            section("Open") {
                                ForEach(openNotes) { note in
                                    noteRow(note, isOpen: true)
                                }
                            }
                        }
                        section(openNotes.isEmpty ? "Notes" : "Recent") {
                            if recentNotes.isEmpty {
                                emptyHint
                            } else {
                                ForEach(recentNotes) { note in
                                    noteRow(note, isOpen: false)
                                }
                            }
                        }
                        archiveSection
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
            }
            .frame(maxHeight: 300)
            Divider().opacity(0.5)
            footer
        }
        .frame(width: 320)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: query.isEmpty)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: showArchive)
        .alert(item: $pendingDeletion) { note in
            Alert(
                title: Text("Delete “\(note.displayTitle)”?"),
                message: Text("This permanently removes the note from this Mac."),
                primaryButton: .destructive(Text("Delete")) { store.delete(id: note.id) },
                secondaryButton: .cancel()
            )
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 10) {
            NibPortrait(state: windows.openCount > 0 ? .awake : .asleep)
                .frame(width: 34, height: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text("Perch Notes")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                Text(statusLine)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            Spacer()
            Button(action: onNewNote) {
                Label("New", systemImage: "plus")
                    .font(.system(size: 12, weight: .medium))
                    .labelStyle(.titleAndIcon)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
            .keyboardShortcut("n", modifiers: [.command])
            .help("New note (⌥⌘N globally)")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }

    private var statusLine: String {
        let open = windows.openCount
        let total = store.activeNotes.count
        if open == 0 { return total == 0 ? "No notes yet" : "\(total) notes, none open" }
        return "\(open) open · \(total) total"
    }

    private var searchField: some View {
        HStack(spacing: 6) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.secondary)
            TextField("Search notes", text: $query)
                .textFieldStyle(.plain)
                .font(.system(size: 12))
                .accessibilityLabel("Search notes")
            if !query.isEmpty {
                Button {
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    // MARK: - Sections

    private func section<Content: View>(_ title: String,
                                        @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
                .padding(.top, 6)
                .padding(.bottom, 2)
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }

    private var resultsSection: some View {
        section("\(searchResults.count) result\(searchResults.count == 1 ? "" : "s")") {
            if searchResults.isEmpty {
                Text("No notes match “\(query)”.")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 8)
            } else {
                ForEach(searchResults) { result in
                    noteRow(result.note, isOpen: windows.isOpen(result.note.id),
                            snippet: result.snippet)
                }
            }
        }
    }

    private var archiveSection: some View {
        VStack(alignment: .leading, spacing: 2) {
            if !store.archivedNotes.isEmpty {
                Button {
                    showArchive.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: showArchive ? "chevron.down" : "chevron.right")
                            .font(.system(size: 9, weight: .bold))
                        Text("ARCHIVED (\(store.archivedNotes.count))")
                            .font(.system(size: 10, weight: .semibold))
                        Spacer()
                    }
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.top, 8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if showArchive {
                    ForEach(store.archivedNotes) { note in
                        noteRow(note, isOpen: false, archived: true)
                    }
                }
            }
        }
    }

    private var emptyHint: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Nothing here yet.")
                .font(.system(size: 12, weight: .medium))
            Text("Press ⌥⌘N anywhere to drop a note on screen.")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 10)
    }

    // MARK: - Rows

    private func noteRow(_ note: Note, isOpen: Bool, snippet: String? = nil,
                         archived: Bool = false) -> some View {
        Button {
            onOpenNote(note.id)
        } label: {
            HStack(alignment: .top, spacing: 9) {
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(Color(hex: note.color.markerHex))
                    .frame(width: 4, height: 30)
                    .overlay(
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .strokeBorder(Color.primary.opacity(0.12), lineWidth: 0.5)
                    )

                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 5) {
                        Text(note.displayTitle)
                            .font(.system(size: 12, weight: .medium))
                            .lineLimit(1)
                        if isOpen {
                            // Non-colour indicator: a dot plus the label below.
                            Circle()
                                .fill(Color.accentColor)
                                .frame(width: 5, height: 5)
                        }
                        if note.isPinnedAboveWindows {
                            Image(systemName: "pin.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.secondary)
                        }
                        Spacer(minLength: 0)
                        Text(Self.relativeDate(note.updatedAt))
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                    let preview = snippet ?? note.preview
                    if !preview.isEmpty {
                        Text(preview)
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(HoverRowStyle())
        .accessibilityLabel("\(note.displayTitle), edited \(Self.relativeDate(note.updatedAt))\(isOpen ? ", open" : "")\(archived ? ", archived" : "")")
        .contextMenu {
            Button(isOpen ? "Focus Note" : "Open Note") { onOpenNote(note.id) }
            if isOpen {
                Button("Close Note") { onCloseNote(note.id) }
            }
            Divider()
            if archived {
                Button("Unarchive") { store.setArchived(false, for: note.id) }
            } else {
                Button("Archive") {
                    if isOpen { onCloseNote(note.id) }
                    store.setArchived(true, for: note.id)
                }
            }
            Button("Delete…", role: .destructive) {
                if settingsStore.settings.confirmBeforeDeletion {
                    pendingDeletion = note
                } else {
                    store.delete(id: note.id)
                }
            }
        }
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 10) {
            Toggle("Quiet", isOn: Binding(
                get: { settingsStore.settings.character.quietMode },
                set: { settingsStore.settings.character.quietMode = $0 }
            ))
            .toggleStyle(.switch)
            .controlSize(.mini)
            .font(.system(size: 11))
            .help("Quiet mode keeps the character still")

            Spacer()

            Button(action: onOpenSettings) {
                Image(systemName: "gearshape")
            }
            .buttonStyle(.plain)
            .help("Settings")
            .accessibilityLabel("Settings")

            Menu {
                Button("Character Lab…") { onOpenCharacterLab() }
                Divider()
                Button("Quit Perch Notes") { onQuit() }
                    .keyboardShortcut("q", modifiers: [.command])
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .frame(width: 24)
            .accessibilityLabel("More")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    static func relativeDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "now" }
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

/// A quiet row highlight that only appears on hover.
private struct HoverRowStyle: ButtonStyle {
    @State private var hovering = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(Color.primary.opacity(configuration.isPressed ? 0.12 : (hovering ? 0.07 : 0)))
            )
            .onHover { hovering = $0 }
    }
}

/// A small static portrait of Nib used in the popover header.
struct NibPortrait: View {
    var state: MenuBarCharacterState

    private var pose: CharacterPose {
        var pose = CharacterPoseResolver.basePose(for: state == .asleep ? .sleeping : .hangingIdle)
        pose.smile = state == .asleep ? 0 : 0.3
        return pose
    }

    var body: some View {
        GeometryReader { geometry in
            let scale = min(geometry.size.width / 70, geometry.size.height / 70)

            NibCharacterView(pose: pose, layer: .inFrontOfPaper, paperIsDark: false)
                .scaleEffect(scale, anchor: .topLeading)
                .offset(x: (geometry.size.width - NibDesign.size.width * scale) / 2,
                        y: -NibDesign.gripLineY * scale + 2)
                .frame(width: geometry.size.width, height: geometry.size.height, alignment: .topLeading)
                .clipped()
        }
        .accessibilityHidden(true)
    }
}
