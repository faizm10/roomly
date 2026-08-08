// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PerchNotes",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "PerchNotes", targets: ["PerchNotes"])
    ],
    targets: [
        .executableTarget(
            name: "PerchNotes",
            resources: [
                .copy("Resources/chiikawa.jpeg"),
                .copy("Resources/svg-asset-character.png")
            ]
        )
    ]
)
