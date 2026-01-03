export class UIManager {
    constructor() {
        this.resultsContainer = document.getElementById('results-container');
        this.scoreElement = document.getElementById('current-score');
        this.inputElement = document.getElementById('word-input');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.hintButton = document.getElementById('hint-btn');
        this.levelButtons = document.querySelectorAll('.level-btn');
        this.usernameModal = document.getElementById('username-modal');
        this.startScreen = document.getElementById('start-screen');
        this.gameArea = document.getElementById('game-area');
        this.leaderboardPanel = document.getElementById('leaderboard-panel');
        this.top10List = document.getElementById('top10-list');
        this.yourRankDisplay = document.getElementById('your-rank-display');
        this.levelBadge = document.getElementById('leaderboard-level-badge');

        this.initLevelSelection();
    }

    initLevelSelection() {
        this.levelButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.levelButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    getSelectedLevel() {
        const activeBtn = document.querySelector('.level-btn.active');
        return activeBtn ? activeBtn.dataset.level : 'easy';
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
        if (this.scoreElement) {
            this.scoreElement.textContent = stats.score;
        }
    }

    prepareRound() {
        this.resultsContainer.classList.add('hidden');
        this.resultsContainer.innerHTML = '';
        this.inputElement.value = '';
        this.inputElement.disabled = false;
        this.inputElement.classList.remove('shake');
        this.inputElement.classList.remove('hint-mode');
        this.inputElement.focus();
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

        // Disable input and hint button once result is shown
        this.inputElement.disabled = true;
        this.disableHintButton();
    }

    disableHintButton() {
        this.hintButton.disabled = true;
        this.hintButton.style.opacity = '0.5';
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
        }

        this.inputElement.value = hint;
        this.inputElement.classList.add('hint-mode');
        this.inputElement.focus();

        // Disable hint button after use for this word
        this.hintButton.disabled = true;
        this.hintButton.style.opacity = '0.5';
    }

    resetHintButton() {
        this.hintButton.disabled = false;
        this.hintButton.style.opacity = '1';
    }

    showUsernameModal() {
        this.usernameModal.classList.remove('hidden');
    }

    hideUsernameModal() {
        this.usernameModal.classList.add('hidden');
    }

    showStartScreen(show) {
        if (show) this.startScreen.classList.remove('hidden');
        else this.startScreen.classList.add('hidden');
    }

    showGameArea(show) {
        if (show) this.gameArea.classList.remove('hidden');
        else this.gameArea.classList.add('hidden');
    }

    showUsernameError(message) {
        const err = document.getElementById('username-error');
        if (err) {
            err.textContent = message;
            err.classList.remove('hidden');
        }
    }

    updateLeaderboard(data) {
        if (!data) return;

        // Ensure we show the target level data
        console.log(`Updating UI for ${data.level} leaderboard`);

        // Update Top 10
        if (data.top10) {
            if (data.top10.length === 0) {
                this.top10List.innerHTML = '<div class="loading-placeholder">No scores yet. Be the first!</div>';
            } else {
                this.top10List.innerHTML = data.top10.map(entry => `
                    <div class="rank-entry">
                        <span class="rank-position">#${entry.rank}</span>
                        <span class="rank-username">${entry.username}</span>
                        <span class="rank-score">${entry.score} pts</span>
                    </div>
                `).join('');
            }
        }

        // Update Current User
        if (data.currentUser) {
            const user = data.currentUser;
            const trendIcon = user.trend === 'up' ? '↑' : (user.trend === 'down' ? '↓' : '→');
            const trendClass = user.trend === 'up' ? 'up' : (user.trend === 'down' ? 'down' : '');

            if (this.yourRankDisplay) {
                this.yourRankDisplay.innerHTML = `
                    <span class="rank-position">#${user.rank}</span>
                    <span class="rank-username">${user.username}</span>
                    <span class="rank-score">${user.score} pts</span>
                    <span class="rank-trend ${trendClass}">${trendIcon}</span>
                `;
            }
        } else if (this.yourRankDisplay) {
            this.yourRankDisplay.innerHTML = `
                <div class="loading-placeholder">No active session for this level</div>
            `;
        }
    }
}
