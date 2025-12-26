export class UIManager {
    constructor() {
        this.resultsContainer = document.getElementById('results-container');
        this.scoreElement = document.getElementById('current-score');
        this.inputElement = document.getElementById('word-input');
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    showLoading(isLoading) {
        if (isLoading) {
            this.loadingOverlay.classList.remove('hidden');
            this.inputElement.disabled = true;
        } else {
            this.loadingOverlay.classList.add('hidden');
            this.inputElement.disabled = false;
            this.inputElement.focus();
        }
    }

    updateStats(stats) {
        this.scoreElement.textContent = stats.score;
    }

    prepareRound() {
        this.resultsContainer.classList.add('hidden');
        this.resultsContainer.innerHTML = '';
        this.inputElement.value = '';
        this.inputElement.focus();
        this.inputElement.classList.remove('shake');
    }

    displayResult(result, targetWord, isCorrect) {
        this.resultsContainer.classList.remove('hidden');
        this.resultsContainer.innerHTML = ''; // Clear previous

        let statusClass = isCorrect ? 'status-correct' : 'status-incorrect';
        let statusIcon = isCorrect ? 'Correct' : 'Incorrect';
        let statusText = isCorrect ? 'Well done!' : `Spelling: ${targetWord.term}`;

        const entry = targetWord;

        const contentHtml = `
            <div class="result-card">
                <div class="result-header ${statusClass}">
                    <span>${statusIcon === 'Correct' ? '✓' : '✕'}</span>
                    <span>${statusText}</span>
                </div>
                
                <div class="word-details">
                    <h3 class="word-title">${entry.term} <span class="part-of-speech">${entry.partOfSpeech || 'word'}</span></h3>
                    <p class="definition">${entry.definition}</p>
                    
                    <div class="meta-info">
                        ${entry.synonyms && entry.synonyms.length > 0 ? `<div class="meta-item"><strong>Synonyms:</strong> ${entry.synonyms.join(', ')}</div>` : ''}
                        ${entry.explanation ? `<div class="meta-item"><strong>Note:</strong> ${entry.explanation}</div>` : ''}
                        <div class="meta-item"><strong>Example:</strong> "${entry.example}"</div>
                    </div>
                </div>
                
                <button id="next-word-btn" class="next-btn">Next Word</button>
            </div>
        `;

        this.resultsContainer.innerHTML = contentHtml;

        // Shake input if incorrect
        if (!isCorrect) {
            this.inputElement.classList.remove('shake');
            void this.inputElement.offsetWidth;
            this.inputElement.classList.add('shake');
        } else {
            this.inputElement.classList.remove('shake');
        }
    }

}
