import PerchKit
import SwiftUI

/// The whole note surface: paper, quiet toolbar, title, writing area, and the
/// character split across the paper's top edge.
struct NoteContentView: View {
    @ObservedObject var session: NoteSession
    @ObservedObject var character: CharacterController
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion

    @State private var showingColorPicker = false
    @State private var dragStartPosition: Double?

    private var reduceMotion: Bool {
        systemReduceMotion || session.settings.character.reducedMotionOverride
    }

    private var characterScale: CGFloat {
        0.8 * CGFloat(session.settings.character.scale)
    }

    private var characterEnabled: Bool { session.settings.character.isEnabled }

    private var bandHeight: CGFloat {
        guard characterEnabled else { return 12 }
        return NibDesign.hangDepth * characterScale + 4
    }

    var body: some View {
        GeometryReader { geometry in
            let paperRect = CGRect(
                x: NoteMetrics.paperInsetSide,
                y: NoteMetrics.paperInsetTop,
                width: max(0, geometry.size.width - NoteMetrics.paperInsetSide * 2),
                height: max(0, geometry.size.height - NoteMetrics.paperInsetTop - NoteMetrics.paperInsetBottom)
            )

            ZStack(alignment: .topLeading) {
                if characterEnabled {
                    characterLayer(.behindPaper, paperRect: paperRect)
                }
                paper(rect: paperRect)
                if characterEnabled {
                    characterLayer(.inFrontOfPaper, paperRect: paperRect)
                }
            }
            .onContinuousHover { phase in
                switch phase {
                case .active(let point):
                    session.isHovering = true
                    reportPointer(point, paperRect: paperRect)
                case .ended:
                    session.isHovering = false
                    character.reportPointer(unitX: 0, unitY: 0, inRange: false)
                }
            }
        }
        .animation(Motion.settle(reduceMotion: reduceMotion), value: character.pose)
        .animation(Motion.glide(reduceMotion: reduceMotion), value: session.characterPosition)
        .background(Color.clear)
    }

    /// Idle motion is limited to the states that should show life at all. A
    /// sleeping or departing character is completely still.
    private var idleMotionActive: Bool {
        characterEnabled && !reduceMotion
            && character.state.wantsIdleMotion
            && character.state != .sleeping
    }

    private var breathRest: Double {
        session.settings.character.quietMode ? 16 : 7
    }

    // MARK: - Paper

    /// The shadow is deliberately attached to the paper *shape* rather than to
    /// the paper plus its contents: shadowing a view that hosts an `NSTextView`
    /// forces the whole note to be re-rendered off-screen on every animation
    /// frame, which is ruinous for an app that runs all day.
    private func paper(rect: CGRect) -> some View {
        let theme = session.theme
        return ZStack(alignment: .topLeading) {
            PaperSurface(theme: theme)
                .shadow(color: .black.opacity(theme.paperIsDark ? 0.55 : 0.20), radius: 14, x: 0, y: 6)
                .shadow(color: .black.opacity(theme.paperIsDark ? 0.35 : 0.10), radius: 2, x: 0, y: 1)
            paperContent(width: rect.width)
        }
        .frame(width: rect.width, height: rect.height)
        .offset(x: rect.minX, y: rect.minY)
    }

    private func paperContent(width: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            toolbar
                .padding(.horizontal, 10)
                .padding(.top, 8)
            Spacer(minLength: 0)
                .frame(height: max(0, bandHeight - 34))
            titleField
                .padding(.horizontal, 18)
                .padding(.bottom, 2)
            editor
        }
    }

    private var titleField: some View {
        TextField("", text: $session.title, prompt: Text(Note.derivedTitle(from: session.body))
            .foregroundColor(session.theme.secondaryInk))
            .textFieldStyle(.plain)
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundColor(session.theme.ink)
            .onSubmit { session.titleDidChange() }
            .onChange(of: session.title) { _, _ in session.titleDidChange() }
            .accessibilityLabel("Note title")
    }

    private var editor: some View {
        NoteTextEditor(
            text: $session.body,
            theme: session.theme,
            fontSize: CGFloat(session.settings.defaultFontSize),
            spellChecking: session.settings.spellCheckingEnabled,
            smartLinks: session.settings.smartLinksEnabled,
            isFocused: session.isEditorFocused,
            onEdit: { session.bodyDidChange() },
            onChecklistCompleted: { session.checklistCompleted(allDone: $0) }
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }

    // MARK: - Toolbar

    private var toolbarVisible: Bool { session.isHovering || showingColorPicker }

    private var toolbar: some View {
        HStack(spacing: 6) {
            toolbarButton("xmark", label: "Close note") { session.onRequestClose?() }
                .opacity(toolbarVisible ? 1 : 0.35)

            Spacer(minLength: 0)

            if session.checklistProgress.total > 0 {
                Text("\(session.checklistProgress.completed)/\(session.checklistProgress.total)")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundColor(session.theme.secondaryInk)
                    .accessibilityLabel("\(session.checklistProgress.completed) of \(session.checklistProgress.total) items complete")
                    .padding(.trailing, 2)
            }

            toolbarButton("checklist", label: "Toggle checklist") {
                session.toggleChecklistOnSelection()
            }
            toolbarButton("circle.fill", label: "Note colour", tint: Color(hex: session.color.markerHex)) {
                showingColorPicker.toggle()
            }
            .popover(isPresented: $showingColorPicker, arrowEdge: .bottom) {
                ColorPalettePicker(selected: session.color) { session.setColor($0) }
            }
            if session.reminderDate != nil {
                Image(systemName: "bell.fill")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(session.theme.accent)
                    .accessibilityLabel("Reminder set for \(session.reminderSummary ?? "")")
            }
            toolbarButton(session.isPinned ? "pin.fill" : "pin",
                          label: session.isPinned ? "Unpin from top" : "Keep on top") {
                session.togglePinned()
            }
            .opacity(session.isPinned ? 1 : (toolbarVisible ? 1 : 0))

            Menu {
                Menu(session.reminderSummary.map { "Reminder: \($0)" } ?? "Remind Me") {
                    Button("In 1 hour") { session.setReminder(Date().addingTimeInterval(3600)) }
                    Button("This evening") { session.setReminder(Self.nextTime(hour: 18)) }
                    Button("Tomorrow morning") { session.setReminder(Self.nextTime(hour: 9)) }
                    if session.reminderDate != nil {
                        Divider()
                        Button("Clear Reminder") { session.setReminder(nil) }
                    }
                }
                Divider()
                Button("Archive Note") { session.onRequestArchive?() }
                Divider()
                Button("Delete Note…", role: .destructive) { session.onRequestDelete?() }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 11, weight: .semibold))
                    .frame(width: NoteMetrics.controlSize, height: NoteMetrics.controlSize)
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .frame(width: NoteMetrics.controlSize + 6)
            .foregroundColor(session.theme.secondaryInk)
            .accessibilityLabel("More note actions")
        }
        .opacity(toolbarVisible ? 1 : 0.55)
        .animation(.easeOut(duration: 0.16), value: toolbarVisible)
        .frame(height: 22)
    }

    private func toolbarButton(_ symbol: String, label: String, tint: Color? = nil,
                               action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: symbol == "circle.fill" ? 10 : 11, weight: .semibold))
                .foregroundColor(tint ?? session.theme.secondaryInk)
                .frame(width: NoteMetrics.controlSize, height: NoteMetrics.controlSize)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(label)
        .accessibilityLabel(label)
    }

    // MARK: - Character

    private func characterLayer(_ layer: CharacterLayer, paperRect: CGRect) -> some View {
        let scale = characterScale
        let centerX = paperRect.minX + CGFloat(
            CharacterAnchor.centerX(for: session.characterPosition,
                                    windowWidth: Double(paperRect.width),
                                    scale: Double(scale))
        )
        let topY = paperRect.minY - NibDesign.gripLineY * scale

        return NibCharacterView(
            pose: character.pose,
            layer: layer,
            paperIsDark: session.theme.paperIsDark,
            blink: character.blink
        )
        .breathing(isActive: layer == .inFrontOfPaper && idleMotionActive,
                   inhale: 1.1,
                   rest: breathRest,
                   anchor: UnitPoint(x: 0.5, y: NibDesign.gripLineY / NibDesign.size.height))
        .scaleEffect(scale, anchor: .topLeading)
        .frame(width: NibDesign.size.width * scale,
               height: NibDesign.size.height * scale,
               alignment: .topLeading)
        .offset(x: centerX - NibDesign.size.width * scale / 2, y: topY)
        .allowsHitTesting(layer == .inFrontOfPaper && session.settings.character.interactionEnabled)
        .gesture(layer == .inFrontOfPaper ? characterGesture(paperRect: paperRect) : nil)
        .onTapGesture(count: 2) { character.togglePeek() }
        .onTapGesture { character.send(.poked) }
        .accessibilityHidden(true)
    }

    /// Dragging the character slides it along the safe part of the top edge.
    private func characterGesture(paperRect: CGRect) -> some Gesture {
        DragGesture(minimumDistance: 3)
            .onChanged { value in
                if dragStartPosition == nil { dragStartPosition = session.characterPosition }
                let range = CharacterAnchor.safeRange(windowWidth: Double(paperRect.width),
                                                      scale: Double(characterScale))
                let span = range.upperBound - range.lowerBound
                guard span > 0 else { return }
                let delta = Double(value.translation.width) / span
                session.characterPosition = min(max((dragStartPosition ?? 0.5) + delta, 0), 1)
            }
            .onEnded { _ in
                session.setCharacterPosition(session.characterPosition)
                dragStartPosition = nil
            }
    }

    /// The next occurrence of `hour` o'clock, today if it is still ahead.
    static func nextTime(hour: Int) -> Date {
        let calendar = Calendar.current
        let now = Date()
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = hour
        components.minute = 0
        let candidate = calendar.date(from: components) ?? now.addingTimeInterval(3600)
        return candidate > now ? candidate : calendar.date(byAdding: .day, value: 1, to: candidate) ?? candidate
    }

    private func reportPointer(_ point: CGPoint, paperRect: CGRect) {
        guard characterEnabled, session.settings.character.followsPointer else { return }
        let scale = characterScale
        let centerX = paperRect.minX + CGFloat(
            CharacterAnchor.centerX(for: session.characterPosition,
                                    windowWidth: Double(paperRect.width),
                                    scale: Double(scale))
        )
        let centerY = paperRect.minY + NibDesign.headCenter.y * scale - NibDesign.gripLineY * scale
        let dx = Double((point.x - centerX) / 140)
        let dy = Double((point.y - centerY) / 140)
        character.reportPointer(unitX: dx, unitY: dy, inRange: true)
    }
}

/// The note colour palette, shown from the toolbar.
struct ColorPalettePicker: View {
    let selected: NoteColor
    let onSelect: (NoteColor) -> Void

    private let columns = [GridItem(.adaptive(minimum: 30), spacing: 8)]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(NoteColor.allCases) { color in
                Button {
                    onSelect(color)
                } label: {
                    Circle()
                        .fill(Color(hex: color.markerHex))
                        .frame(width: 24, height: 24)
                        .overlay(
                            Circle().strokeBorder(Color.primary.opacity(0.18), lineWidth: 1)
                        )
                        .overlay(
                            Circle()
                                .strokeBorder(Color.accentColor, lineWidth: 2)
                                .padding(-3)
                                .opacity(color == selected ? 1 : 0)
                        )
                }
                .buttonStyle(.plain)
                .help(color.displayName)
                .accessibilityLabel(color.displayName)
                .accessibilityAddTraits(color == selected ? [.isSelected] : [])
            }
        }
        .padding(12)
        .frame(width: 172)
    }
}
