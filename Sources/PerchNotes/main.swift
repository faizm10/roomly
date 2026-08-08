import AppKit

// Perch Notes runs on the AppKit lifecycle rather than `MenuBarExtra` so it can
// control panel level, Spaces behaviour, transparency and hit testing directly
// — all of which the hanging character depends on.
let application = NSApplication.shared
MainActor.assumeIsolated {
    // Development-only: render the character sheets and exit.
    if SnapshotRenderer.runIfRequested() { exit(0) }

    let delegate = AppDelegate()
    application.delegate = delegate
    // The delegate must outlive this scope; NSApplication holds it weakly.
    objc_setAssociatedObject(application, "PerchNotesDelegate", delegate, .OBJC_ASSOCIATION_RETAIN)
}
application.run()
