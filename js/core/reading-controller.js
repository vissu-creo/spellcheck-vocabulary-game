export class ReadingController {
    constructor(readingService, uiManager) {
        this.readingService = readingService;
        this.uiManager = uiManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const fetchBtn = document.getElementById('fetch-article-btn');
        const randomBtn = document.getElementById('random-article-btn');
        const urlInput = document.getElementById('article-url');

        if (fetchBtn) {
            fetchBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (url) {
                    this.startAnalysis(url);
                }
            });
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                this.startRandomAnalysis();
            });
        }
    }

    async startRandomAnalysis() {
        try {
            this.uiManager.showLoading(true);
            const article = await this.readingService.fetchRandomArticle();
            this.displayArticle(article);

            const quiz = this.readingService.generateQuiz(article.content);
            this.displayQuiz(quiz);

            this.uiManager.showLoading(false);
        } catch (error) {
            this.uiManager.showLoading(false);
            alert('Failed to fetch random article. Please try again.');
        }
    }

    async startAnalysis(url) {
        try {
            this.uiManager.showLoading(true);
            const article = await this.readingService.fetchArticle(url);
            this.displayArticle(article);

            const quiz = this.readingService.generateQuiz(article.content);
            this.displayQuiz(quiz);

            this.uiManager.showLoading(false);
        } catch (error) {
            this.uiManager.showLoading(false);
            alert('Failed to analyze article. Please check the URL and try again.');
        }
    }

    displayArticle(article) {
        const contentArea = document.getElementById('reading-content');
        contentArea.classList.remove('hidden');

        contentArea.innerHTML = `
            <div class="article-view">
                <h2 class="article-title">${article.title}</h2>
                <div class="article-body">${article.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
            </div>
            <div id="quiz-area" class="quiz-area">
                <!-- Quiz will be injected here -->
            </div>
        `;
    }

    async displayQuiz(quiz) {
        const quizArea = document.getElementById('quiz-area');
        quizArea.innerHTML = `<h3>Reading Assessment</h3><div id="quiz-loading">Generating questions...</div>`;

        // Fetch details for complex words
        const wordDetails = await Promise.all(
            quiz.words.map(w => this.readingService.getWordDetails(w))
        );

        const filteredDetails = wordDetails.filter(d => d && d.term);

        if (filteredDetails.length === 0) {
            quizArea.innerHTML = `
                <div class="quiz-section">
                    <h4>Vocabulary Check</h4>
                    <p>No complex words were identified for a vocabulary check in this short text.</p>
                </div>
            `;
            return;
        }

        let quizHtml = `
            <div class="quiz-section">
                <h4>Vocabulary Check</h4>
                <p>Can you identify the meaning of these words from the text?</p>
                <div class="vocab-questions">
                    ${filteredDetails.map((detail, index) => `
                        <div class="quiz-item" data-word="${detail.term}">
                            <p class="question"><strong>${index + 1}. What does "${detail.term}" mean?</strong></p>
                            <div class="options">
                                ${this.generateOptions(detail).map((opt, i) => `
                                    <button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        quizArea.innerHTML = quizHtml;
        this.setupQuizListeners();
    }

    generateOptions(detail) {
        const options = [
            { text: detail.definition, correct: true }
        ];

        // Add some dummy options (in a real app, these would be from other words)
        options.push({ text: "To move quickly and suddenly.", correct: false });
        options.push({ text: "A state of complete silence.", correct: false });
        options.push({ text: "To repeat something multiple times.", correct: false });

        return options.sort(() => 0.5 - Math.random());
    }

    setupQuizListeners() {
        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isCorrect = btn.dataset.correct === 'true';
                const parent = btn.closest('.options');

                // Disable all buttons in this question
                parent.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

                if (isCorrect) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('incorrect');
                    // Show correct answer
                    parent.querySelector('[data-correct="true"]').classList.add('correct');
                }
            });
        });
    }
}
