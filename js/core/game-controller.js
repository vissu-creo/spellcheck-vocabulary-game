export class GameController {
    constructor(dictionaryService, audioManager, spellEngine, gameState, uiManager) {
        this.dictionaryService = dictionaryService;
        this.audioManager = audioManager;
        this.spellEngine = spellEngine;
        this.gameState = gameState;
        this.uiManager = uiManager;

        this.currentWord = null;
        this.isRoundActive = false;
        this.isLoading = false;
        this.currentAudio = null; // Track playing audio
        this.sessionService = null;
    }

    setSessionService(sessionService) {
        this.sessionService = sessionService;
    }

    async startRound() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.uiManager.showLoading(true);

        try {
            // Fetch a random word directly from the proxy with the selected level
            const wordData = await this.dictionaryService.fetchRandomWord(this.gameState.level);

            if (!wordData) {
                throw new Error("Failed to fetch word from proxy.");
            }

            this.currentWord = wordData;
            this.isRoundActive = true;

            // Update UI
            this.uiManager.prepareRound();
            this.uiManager.resetHintButton();

            // Speak (Auto-play)
            setTimeout(() => this.playAudio(), 500); // Small delay for UI transition

        } catch (error) {
            console.error("Error starting round:", error);
            this.uiManager.showError("Failed to load word. Please check internet.");
        } finally {
            this.isLoading = false;
            this.uiManager.showLoading(false);
        }
    }

    playAudio() {
        if (this.currentWord) {
            // Stop any ongoing TTS
            this.audioManager.stop();

            // Stop any ongoing API Audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            }

            // Priority: API Audio -> TTS
            if (this.currentWord.audio) {
                this.currentAudio = new Audio(this.currentWord.audio);
                this.currentAudio.play().catch(e => {
                    console.warn("API Audio failed, falling back to TTS", e);
                    this.audioManager.speak(this.currentWord.term);
                });
            } else {
                this.audioManager.speak(this.currentWord.term);
            }
        }
    }

    checkAnswer(input) {
        if (!this.isRoundActive) return;

        // Simple check
        const isCorrect = input.toLowerCase().trim() === this.currentWord.term.toLowerCase();

        const result = { isCorrect, status: isCorrect ? 'correct' : 'incorrect' };

        // Show Results
        this.uiManager.displayResult(result, this.currentWord, isCorrect);

        if (isCorrect) {
            this.gameState.addScore(10);
            this.uiManager.updateStats(this.gameState.getStats());
        }

        // Update Backend Session & Leaderboard
        if (this.sessionService && this.sessionService.isActive()) {
            this.sessionService.submitAnswer(isCorrect).then(data => {
                if (data) {
                    this.sessionService.getLeaderboard().then(lbData => {
                        this.uiManager.updateLeaderboard(lbData);
                    });
                }
            });
        }

        this.isRoundActive = false;
    }

    handleHint() {
        if (this.isRoundActive && this.currentWord) {
            this.uiManager.showHint(this.currentWord);
        }
    }
}
