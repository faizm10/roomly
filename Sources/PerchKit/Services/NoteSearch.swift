import Foundation

public struct NoteSearchResult: Identifiable, Equatable, Sendable {
    public let note: Note
    /// A short body excerpt around the first match, for the result row.
    public let snippet: String
    public let score: Int

    public var id: UUID { note.id }
}

/// Title- and content-matching search. Deliberately simple: notes are few and
/// local, so a linear scan with sensible ranking beats an index.
public enum NoteSearch {
    public struct Options: Sendable {
        public var includeArchived: Bool
        public var limit: Int

        public init(includeArchived: Bool = true, limit: Int = 50) {
            self.includeArchived = includeArchived
            self.limit = limit
        }
    }

    public static func search(_ rawQuery: String, in notes: [Note],
                              options: Options = Options()) -> [NoteSearchResult] {
        let query = rawQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return [] }
        let terms = query.split(separator: " ").map(String.init)

        var results: [NoteSearchResult] = []
        for note in notes {
            if note.isArchived && !options.includeArchived { continue }
            let title = note.displayTitle.lowercased()
            let body = note.body.lowercased()

            var score = 0
            var matchedAll = true
            for term in terms {
                var termScore = 0
                if title == term { termScore += 120 }
                else if title.hasPrefix(term) { termScore += 80 }
                else if title.contains(term) { termScore += 50 }
                if body.contains(term) { termScore += 20 }
                if termScore == 0 { matchedAll = false; break }
                score += termScore
            }
            guard matchedAll else { continue }
            results.append(
                NoteSearchResult(note: note, snippet: snippet(for: terms[0], in: note), score: score)
            )
        }

        return results
            .sorted {
                // Live notes always outrank archived ones, however good the
                // archived match is.
                if $0.note.isArchived != $1.note.isArchived { return !$0.note.isArchived }
                if $0.score != $1.score { return $0.score > $1.score }
                return $0.note.updatedAt > $1.note.updatedAt
            }
            .prefix(options.limit)
            .map { $0 }
    }

    /// Up to ~90 characters of body text centred on the first match.
    static func snippet(for term: String, in note: Note) -> String {
        let body = note.body.replacingOccurrences(of: "\n", with: " ")
        let flattened = ChecklistParser.lines(of: note.body)
            .map { ChecklistParser.strippingMarker($0) }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespaces)
        let haystack = flattened.isEmpty ? body : flattened
        guard let range = haystack.lowercased().range(of: term) else {
            return String(haystack.prefix(90))
        }
        let start = haystack.index(range.lowerBound,
                                   offsetBy: -35,
                                   limitedBy: haystack.startIndex) ?? haystack.startIndex
        let end = haystack.index(range.upperBound,
                                 offsetBy: 55,
                                 limitedBy: haystack.endIndex) ?? haystack.endIndex
        var snippet = String(haystack[start..<end]).trimmingCharacters(in: .whitespaces)
        if start != haystack.startIndex { snippet = "…" + snippet }
        if end != haystack.endIndex { snippet += "…" }
        return snippet
    }
}
