import Foundation
import ServiceManagement

/// Launch-at-login through `SMAppService`, which only works for a properly
/// bundled, signed `.app`. When the app is run straight from SwiftPM there is
/// no bundle to register, so the toggle reports that it is unavailable rather
/// than silently doing nothing.
enum LaunchAtLogin {
    static var isAvailable: Bool {
        Bundle.main.bundleIdentifier != nil && Bundle.main.bundleURL.pathExtension == "app"
    }

    static var isEnabled: Bool {
        guard isAvailable else { return false }
        return SMAppService.mainApp.status == .enabled
    }

    /// Returns the state actually achieved, so settings never show a lie.
    @discardableResult
    static func setEnabled(_ enabled: Bool) -> Bool {
        guard isAvailable else { return false }
        do {
            if enabled {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            NSLog("Perch Notes: could not change launch-at-login: \(error.localizedDescription)")
        }
        return isEnabled
    }
}
