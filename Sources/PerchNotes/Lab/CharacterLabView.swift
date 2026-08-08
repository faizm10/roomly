import PerchKit
import SwiftUI

/// Development-only preview surface for the character. It is reachable from
/// the popover's overflow menu and is deliberately absent from the normal
/// product navigation.
struct CharacterLabView: View {
    @State private var state: CharacterState = .hangingIdle
    @State private var noteColor: NoteColor = .cream
    @State private var isDark = false
    @State private var reduceMotion = false
    @State private var slowMotion = false
    @State private var scale: Double = 1.0
    @State private var intensity: AnimationIntensity = .subtle
    @State private var quiet = false
    @State private var noteWidth: CGFloat = 340
    @State private var noteHeight: CGFloat = 360
    @State private var dragVelocity: Double = 0
    @State private var breathing = true
    @State private var blink: Double = 0
    @State private var typingTimer: Timer?
    @State private var showingDirections = false

    private var preferences: CharacterPreferences {
        var prefs = CharacterPreferences()
        prefs.animationIntensity = intensity
        prefs.quietMode = quiet
        prefs.scale = scale
        prefs.reducedMotionOverride = reduceMotion
        return prefs
    }

    private var pose: CharacterPose {
        var pose = CharacterPoseResolver.resolvedPose(for: state, preferences: preferences,
                                                      reduceMotion: reduceMotion)
        pose.bodySway += dragVelocity
        pose.bodyRotation += dragVelocity * 0.22
        return pose
    }

    private var animation: Animation {
        let base = reduceMotion ? Motion.reduced : Motion.settle
        return slowMotion ? base.speed(0.25) : base
    }

    var body: some View {
        HSplitView {
            controls.frame(width: 268)
            stage
        }
        .frame(minWidth: 880, minHeight: 600)
        .sheet(isPresented: $showingDirections) { directionsSheet }
    }

    // MARK: - Stage

    private var stage: some View {
        VStack(spacing: 0) {
            ZStack {
                checkerBackground
                notePreview
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Divider()
            HStack(spacing: 12) {
                Text(state.rawValue)
                    .font(.system(.body, design: .monospaced))
                Text(state.accessibilityDescription)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(Int(noteWidth)) × \(Int(noteHeight))")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(.secondary)
            }
            .padding(10)
        }
    }

    private var checkerBackground: some View {
        Rectangle()
            .fill(isDark ? Color(hex: 0x1B1B1D) : Color(hex: 0xDCD8D2))
            .overlay(
                Rectangle()
                    .fill(.thinMaterial)
                    .opacity(0.25)
            )
    }

    private var theme: NoteTheme { NoteTheme(color: noteColor, isDark: isDark) }

    private var notePreview: some View {
        let characterScale = 0.8 * CGFloat(scale)
        let paperRect = CGRect(x: 0, y: 0, width: noteWidth, height: noteHeight)
        let centerX = CGFloat(CharacterAnchor.centerX(for: 0.5, windowWidth: Double(noteWidth),
                                                      scale: Double(characterScale)))

        return ZStack(alignment: .topLeading) {
            characterLayer(.behindPaper, centerX: centerX, scale: characterScale)
            PaperSurface(theme: theme)
                .overlay(alignment: .topLeading) { sampleText }
                .shadow(color: .black.opacity(0.22), radius: 14, y: 6)
                .frame(width: paperRect.width, height: paperRect.height)
            characterLayer(.inFrontOfPaper, centerX: centerX, scale: characterScale)
        }
        .frame(width: noteWidth, height: noteHeight, alignment: .topLeading)
        .padding(.top, 120)
        .animation(animation, value: pose)
    }

    private func characterLayer(_ layer: CharacterLayer, centerX: CGFloat,
                                scale: CGFloat) -> some View {
        NibCharacterView(pose: pose, layer: layer, paperIsDark: theme.paperIsDark, blink: blink)
            .breathing(isActive: breathing && layer == .inFrontOfPaper && !reduceMotion,
                       inhale: 1.1, rest: quiet ? 16 : 7,
                       anchor: UnitPoint(x: 0.5, y: NibDesign.gripLineY / NibDesign.size.height))
            .scaleEffect(scale, anchor: .topLeading)
            .frame(width: NibDesign.size.width * scale, height: NibDesign.size.height * scale,
                   alignment: .topLeading)
            .offset(x: centerX - NibDesign.size.width * scale / 2,
                    y: -NibDesign.gripLineY * scale)
    }

    private var sampleText: some View {
        VStack(alignment: .leading, spacing: 6) {
            Spacer().frame(height: NibDesign.hangDepth * 0.8 * CGFloat(scale) + 8)
            Text("Sample note")
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundColor(theme.ink)
            Text("The writing area starts below the character band, so text is never covered.")
                .font(.system(size: 13))
                .foregroundColor(theme.ink)
            Text("- [x] first task\n- [ ] second task")
                .font(.system(size: 13, design: .monospaced))
                .foregroundColor(theme.secondaryInk)
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Controls

    private var controls: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                group("States") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 112), spacing: 6)], spacing: 6) {
                        ForEach(CharacterState.allCases, id: \.self) { candidate in
                            Button(candidate.rawValue) {
                                withAnimation(animation) { state = candidate }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                            .tint(candidate == state ? .accentColor : nil)
                        }
                    }
                }

                group("Simulate") {
                    Button("Typing burst") { simulateTyping() }
                        .buttonStyle(.bordered)
                    Button("Complete a checklist item") {
                        withAnimation(animation) { state = .celebrating }
                        after(1.0) { withAnimation(animation) { state = .hangingIdle } }
                    }
                    .buttonStyle(.bordered)
                    LabeledContent("Drag velocity") {
                        Slider(value: $dragVelocity, in: -22...22)
                            .onChange(of: dragVelocity) { _, _ in
                                if state != .noteDragging { state = .noteDragging }
                            }
                    }
                    Button("Release drag") {
                        withAnimation(Motion.swing(reduceMotion: reduceMotion)) {
                            dragVelocity = 0
                            state = .hangingIdle
                        }
                    }
                    .buttonStyle(.bordered)
                    Button("Blink") {
                        withAnimation(.easeIn(duration: 0.07)) { blink = 1 }
                        after(0.12) { withAnimation(.easeOut(duration: 0.13)) { blink = 0 } }
                    }
                    .buttonStyle(.bordered)
                }

                group("Appearance") {
                    Picker("Note colour", selection: $noteColor) {
                        ForEach(NoteColor.allCases) { color in
                            Text(color.displayName).tag(color)
                        }
                    }
                    Toggle("Dark mode", isOn: $isDark)
                }

                group("Motion") {
                    Toggle("Reduce Motion", isOn: $reduceMotion)
                    Toggle("Slow motion (4×)", isOn: $slowMotion)
                    Toggle("Quiet mode", isOn: $quiet)
                    Picker("Intensity", selection: $intensity) {
                        ForEach(AnimationIntensity.allCases, id: \.self) { value in
                            Text(value.displayName).tag(value)
                        }
                    }
                    LabeledContent("Scale") {
                        Slider(value: $scale, in: 0.6...1.6)
                    }
                    Toggle("Breathing", isOn: $breathing)
                }

                group("Window size") {
                    LabeledContent("Width") { Slider(value: $noteWidth, in: 240...620) }
                    LabeledContent("Height") { Slider(value: $noteHeight, in: 220...560) }
                    HStack {
                        Button("Smallest") { noteWidth = 240; noteHeight = 220 }
                        Button("Default") { noteWidth = 352; noteHeight = 368 }
                        Button("Wide") { noteWidth = 600; noteHeight = 400 }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }

                group("Design") {
                    Button("Three explored directions…") { showingDirections = true }
                        .buttonStyle(.bordered)
                }
            }
            .padding(14)
        }
    }

    private func group<Content: View>(_ title: String,
                                      @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.secondary)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var directionsSheet: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Character directions")
                .font(.title3.weight(.semibold))
            Text("Three distinct silhouettes were sketched before committing. Nib was chosen; the other two are kept here so the reasoning stays visible.")
                .font(.callout)
                .foregroundColor(.secondary)
            HStack(alignment: .top, spacing: 16) {
                ForEach(CharacterDirection.allCases) { direction in
                    VStack(alignment: .leading, spacing: 8) {
                        DirectionSketch(direction: direction)
                            .frame(width: 150, height: 190)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color(hex: 0xF6EDDD))
                            )
                        Text(direction.title).font(.headline)
                        Text(direction.pitch).font(.caption)
                        Text(direction.verdict)
                            .font(.caption)
                            .foregroundColor(direction == .nib ? .primary : .secondary)
                    }
                    .frame(width: 190, alignment: .leading)
                }
            }
            Spacer()
            HStack {
                Spacer()
                Button("Done") { showingDirections = false }
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(20)
        .frame(width: 680, height: 460)
    }

    // MARK: - Helpers

    private func simulateTyping() {
        typingTimer?.invalidate()
        withAnimation(animation) { state = .watchingTyping }
        after(1.6) { withAnimation(animation) { state = .thinking } }
        after(4.0) { withAnimation(animation) { state = .hangingIdle } }
    }

    private func after(_ delay: Double, _ work: @escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + (slowMotion ? delay * 4 : delay),
                                      execute: work)
    }
}
