import Combine
import Foundation

/// Persists `AppSettings` as a single JSON document, written immediately on
/// change (settings edits are rare and small).
@MainActor
public final class SettingsStore: ObservableObject {
    @Published public var settings: AppSettings {
        didSet {
            guard settings != oldValue else { return }
            persist()
        }
    }

    private let storage: FileStorage
    private let url: URL

    public init(storage: FileStorage = FileStorage(root: FileStorage.defaultRoot())) {
        self.storage = storage
        self.url = storage.root.appendingPathComponent("settings.json")
        self.settings = storage.read(AppSettings.self, from: url) ?? AppSettings()
    }

    private func persist() {
        try? storage.write(settings, to: url)
    }

    public func reload() {
        settings = storage.read(AppSettings.self, from: url) ?? AppSettings()
    }
}
