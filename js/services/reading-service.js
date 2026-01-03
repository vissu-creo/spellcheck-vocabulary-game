export class ReadingService {
    constructor(dictionaryService) {
        this.dictionaryService = dictionaryService;
        this.currentArticle = null;
    }

    async fetchArticle(url) {
        try {
            const response = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Failed to fetch article');

            this.currentArticle = await response.json();
            return this.currentArticle;
        } catch (error) {
            console.error('ReadingService Error:', error);
            throw error;
        }
    }

    async fetchRandomArticle() {
        try {
            const response = await fetch('/api/random-article');
            if (!response.ok) throw new Error('Failed to fetch random article');

            this.currentArticle = await response.json();
            return this.currentArticle;
        } catch (error) {
            console.error('ReadingService Error:', error);
            throw error;
        }
    }

    generateQuiz(articleText) {
        // 1. Limit analysis to first 1000 words
        const wordsInText = articleText.split(/\s+/);
        const limitedText = wordsInText.slice(0, 1000).join(' ');

        // 2. Identify complex words (longer than 8 chars for better quality)
        const words = limitedText.match(/\b[a-zA-Z]{8,}\b/g) || [];
        const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];

        // 3. Pick 5 random words
        const selectedWords = uniqueWords
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        // 4. Create comprehension questions
        const questions = [
            {
                type: 'comprehension',
                question: 'What is the primary focus of this article?',
                options: [
                    'A detailed technical analysis',
                    'A general overview of the topic',
                    'A personal opinion piece',
                    'A news report'
                ],
                answer: 1
            }
        ];

        return {
            words: selectedWords,
            questions: questions
        };
    }

    async getWordDetails(word) {
        return await this.dictionaryService.getWord(word);
    }
}
