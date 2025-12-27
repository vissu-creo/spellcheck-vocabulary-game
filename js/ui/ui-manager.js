export class UIManager {
    constructor() {
        this.resultsContainer = document.getElementById('results-container');
        this.scoreElement = document.getElementById('current-score');
        this.inputElement = document.getElementById('word-input');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.hintButton = document.getElementById('hint-btn');
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
                    <h3 class="word-title">
                        ${entry.term}
                        <button class="result-speaker-btn" id="result-play-audio-btn" title="Listen again">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        </button>
                        <span class="part-of-speech">${entry.partOfSpeech || 'word'}</span>
                    </h3>
                    ${entry.phonetic ? `<span class="phonetic">${entry.phonetic}</span>` : ''}
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

    showHint(word) {
        const term = word.term;
        let hint = '';

        // Reveal first letter and last letter if long enough, otherwise just first
        for (let i = 0; i < term.length; i++) {
            if (i === 0 || (term.length > 4 && i === term.length - 1)) {
                hint += term[i];
            } else if (term[i] === ' ' || term[i] === '-') {
                hint += term[i];
            } else {
                hint += '_';
            }
            if (i < term.length - 1) hint += ' ';
        }

        this.inputElement.value = hint;
        this.inputElement.focus();

        // Disable hint button after use for this word
        this.hintButton.disabled = true;
        this.hintButton.style.opacity = '0.5';
    }

    resetHintButton() {
        this.hintButton.disabled = false;
        this.hintButton.style.opacity = '1';
    }

}
