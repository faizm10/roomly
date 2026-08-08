import Foundation

/// A minimal test harness.
///
/// XCTest is not available on machines with only the Command Line Tools
/// installed, so the suite ships as a normal executable. Run it with
/// `swift run PerchNotesTests`; a non-zero exit code means something failed.
enum TinyTest {
    nonisolated(unsafe) private static var failures: [String] = []
    nonisolated(unsafe) private static var currentSuite = ""
    nonisolated(unsafe) private static var currentTest = ""
    nonisolated(unsafe) private static var passed = 0

    static func suite(_ name: String, _ body: () -> Void) {
        currentSuite = name
        print("\n\u{001B}[1m\(name)\u{001B}[0m")
        body()
    }

    static func test(_ name: String, _ body: () throws -> Void) {
        currentTest = name
        let before = failures.count
        do {
            try body()
        } catch {
            failures.append("\(currentSuite) › \(name): threw \(error)")
        }
        if failures.count == before {
            passed += 1
            print("  ✓ \(name)")
        } else {
            print("  ✗ \(name)")
            for failure in failures[before...] { print("      \(failure)") }
        }
    }

    static func expect(_ condition: Bool, _ message: @autoclosure () -> String,
                       file: StaticString = #file, line: UInt = #line) {
        guard !condition else { return }
        failures.append("\(message()) (line \(line))")
    }

    static func equal<T: Equatable>(_ actual: T, _ expected: T, _ label: String = "",
                                    file: StaticString = #file, line: UInt = #line) {
        guard actual != expected else { return }
        let prefix = label.isEmpty ? "" : "\(label): "
        failures.append("\(prefix)expected \(expected) but got \(actual) (line \(line))")
    }

    static func close(_ actual: Double, _ expected: Double, _ tolerance: Double = 0.0001,
                      _ label: String = "", line: UInt = #line) {
        guard abs(actual - expected) > tolerance else { return }
        let prefix = label.isEmpty ? "" : "\(label): "
        failures.append("\(prefix)expected ~\(expected) but got \(actual) (line \(line))")
    }

    static func finish() -> Never {
        print("\n\(passed) passed, \(failures.count) failed")
        if !failures.isEmpty {
            print("\n\u{001B}[31mFailures:\u{001B}[0m")
            for failure in failures { print("  • \(failure)") }
            exit(1)
        }
        print("\u{001B}[32mAll tests passed.\u{001B}[0m")
        exit(0)
    }

    /// A scratch directory that is removed when `body` returns.
    static func withTemporaryDirectory(_ body: (URL) throws -> Void) rethrows {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("perchnotes-tests-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: url) }
        try body(url)
    }
}
