export class DictionaryService {
    constructor() {
        this.proxyUrl = '/api/random-word';
    }

    /**
     * Fetches a single random word with details from the local proxy.
     * @returns {Promise<Object|null>} - Formatted word object or null if failed
     */
    async fetchRandomWord(level = 'easy') {
        try {
            const response = await fetch(`${this.proxyUrl}?level=${level}`);
            if (!response.ok) throw new Error('Proxy API failed');

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            return data;
        } catch (error) {
            console.error('Error fetching random word from proxy:', error);
            return null;
        }
    }

    // Legacy methods kept for compatibility but unused or simplified
    async fetchWordBatch(level) {
        // We don't use batches anymore, but to keep the interface if needed
        return [];
    }

    async fetchWordDetails(word) {
        // The proxy returns full details, so this might not be needed directly
        // unless we want to look up a specific word.
        return null;
    }
}
