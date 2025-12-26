export class SpellEngine {
    constructor(dictionary) {
        this.dictionary = dictionary;
    }

    analyze(input) {
        const normalizedInput = input.toLowerCase().trim();

        // 1. Exact Match Check
        const exactMatch = this.dictionary.find(entry => entry.term.toLowerCase() === normalizedInput);

        if (exactMatch) {
            return {
                status: exactMatch.type === 'idiom' ? 'idiom' : 'correct',
                isCorrect: true,
                isIdiom: exactMatch.type === 'idiom',
                entry: exactMatch,
                level: exactMatch.level
            };
        }

        // 2. Common Misspelling Check
        const misspellingMatch = this.dictionary.find(entry =>
            entry.misspellings && entry.misspellings.includes(normalizedInput)
        );

        if (misspellingMatch) {
            return {
                status: 'incorrect',
                isCorrect: false,
                correction: misspellingMatch.term,
                entry: misspellingMatch,
                message: "Incorrect spelling"
            };
        }

        // 3. Fuzzy Matching (Levenshtein Distance)
        let bestMatch = null;
        let minDistance = Infinity;

        for (const entry of this.dictionary) {
            const distance = this.levenshteinDistance(normalizedInput, entry.term.toLowerCase());

            // Threshold logic: Allow 1 error for short words, 2 for longer
            const threshold = entry.term.length > 5 ? 2 : 1;

            if (distance <= threshold && distance < minDistance) {
                minDistance = distance;
                bestMatch = entry;
            }
        }

        if (bestMatch) {
            return {
                status: 'incorrect',
                isCorrect: false,
                correction: bestMatch.term,
                entry: bestMatch,
                message: "Did you mean...?"
            };
        }

        // 4. Unknown
        return {
            status: 'unknown',
            isCorrect: false,
            message: "Word not found in dictionary"
        };
    }

    levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }
}
