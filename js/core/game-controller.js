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
    }

    async startRound() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.uiManager.showLoading(true);

        try {
            // Fetch a random word directly from the proxy
            const wordData = await this.dictionaryService.fetchRandomWord();

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
            this.gameState.updateScore(10);
            this.uiManager.updateStats(this.gameState.getStats());
        }

        this.isRoundActive = false;
    }

    handleHint() {
        if (this.isRoundActive && this.currentWord) {
            this.uiManager.showHint(this.currentWord);
        }
    }
}
