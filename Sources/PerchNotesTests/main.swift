import Foundation
import PerchKit

// The whole suite runs on the main actor because NoteStore and SettingsStore
// are main-actor isolated, exactly as they are in the app.
@MainActor
func runAllTests() {
    runNoteTests()
    runChecklistTests()
    runPersistenceTests()
    runSearchTests()
    runWindowRestorationTests()
    runCharacterTests()
}

MainActor.assumeIsolated {
    runAllTests()
}
TinyTest.finish()
