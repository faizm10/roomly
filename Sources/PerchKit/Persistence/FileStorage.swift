import Foundation

/// Small JSON-on-disk helper with atomic writes. Everything the app persists
/// goes through here so a crash mid-save can never truncate a note.
public struct FileStorage: Sendable {
    public let root: URL
    private var fileManager: FileManager { FileManager.default }

    public static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        // Dates use the default reference-date encoding: it round-trips a
        // `Date` bit-for-bit, which the "did this note actually change?" checks
        // in NoteStore rely on.
        return encoder
    }()

    public static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    public init(root: URL) {
        self.root = root
        try? fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    }

    /// `~/Library/Application Support/PerchNotes`.
    public static func defaultRoot() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("PerchNotes", isDirectory: true)
    }

    public func directory(_ name: String) -> URL {
        let url = root.appendingPathComponent(name, isDirectory: true)
        try? fileManager.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    public func write<T: Encodable>(_ value: T, to url: URL) throws {
        let data = try Self.encoder.encode(value)
        try fileManager.createDirectory(at: url.deletingLastPathComponent(),
                                        withIntermediateDirectories: true)
        // .atomic writes to a temporary file and renames, so readers only ever
        // see a complete document.
        try data.write(to: url, options: [.atomic])
    }

    public func read<T: Decodable>(_ type: T.Type, from url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? Self.decoder.decode(type, from: data)
    }

    public func remove(_ url: URL) {
        try? fileManager.removeItem(at: url)
    }

    public func contents(ofDirectory url: URL, extension ext: String) -> [URL] {
        let items = (try? fileManager.contentsOfDirectory(at: url,
                                                          includingPropertiesForKeys: nil,
                                                          options: [.skipsHiddenFiles])) ?? []
        return items.filter { $0.pathExtension == ext }
    }
}
