// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PerchNotes",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "PerchNotes", targets: ["PerchNotes"]),
        .executable(name: "PerchNotesTests", targets: ["PerchNotesTests"]),
        .library(name: "PerchKit", targets: ["PerchKit"])
    ],
    targets: [
        // Pure-logic core: models, persistence, search, window geometry,
        // settings and the character state machine. No UI, fully testable.
        .target(name: "PerchKit"),

        // The macOS application: menu bar lifecycle, note windows, character
        // rendering and the development character lab.
        .executableTarget(
            name: "PerchNotes",
            dependencies: ["PerchKit"]
        ),

        // XCTest is unavailable without a full Xcode install, so the test
        // suite ships as a plain executable runner: `swift run PerchNotesTests`.
        .executableTarget(
            name: "PerchNotesTests",
            dependencies: ["PerchKit"]
        )
    ]
)
