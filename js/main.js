import { dictionary } from './data/dictionary-data.js?v=2';
import { SpellEngine } from './core/spell-engine.js?v=2';
import { GameState } from './core/game-state.js?v=2';
import { UIManager } from './ui/ui-manager.js?v=2';
import { AudioManager } from './core/audio-manager.js?v=2';
import { GameController } from './core/game-controller.js?v=2';
import { DictionaryService } from './services/dictionary-service.js?v=2';

// Initialize Components
const dictionaryService = new DictionaryService(dictionary);
const spellEngine = new SpellEngine(dictionary);
const gameState = new GameState();
const uiManager = new UIManager();
const audioManager = new AudioManager();
const gameController = new GameController(dictionaryService, audioManager, spellEngine, gameState, uiManager);

// DOM Elements
const inputElement = document.getElementById('word-input');
const playAudioBtn = document.getElementById('play-audio-btn');
const hintBtn = document.getElementById('hint-btn');
const resultsContainer = document.getElementById('results-container');
const startScreen = document.getElementById('start-screen');
const gameArea = document.getElementById('game-area');
const startBtn = document.getElementById('start-game-btn');

// Start Game Flow
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameArea.classList.remove('hidden');
    gameController.startRound();
    inputElement.focus();
});

// Event Listeners
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = inputElement.value.trim();
        if (input) {
            gameController.checkAnswer(input);
        }
        return;
    }

    // Hint Mode Type-over Logic
    if (inputElement.classList.contains('hint-mode')) {
        const term = gameController.currentWord.term;
        const cursorPosition = inputElement.selectionStart;

        // Helper to check if a position is a "revealed" character (fixed)
        const isRevealed = (pos) => {
            if (pos < 0 || pos >= term.length) return true;
            return (pos === 0) ||
                (term.length > 4 && pos === term.length - 1) ||
                (term[pos] === ' ' || term[pos] === '-');
        };

        if (e.key === 'Backspace') {
            e.preventDefault();
            // Find the previous non-revealed position to clear
            let posToClear = cursorPosition - 1;
            while (posToClear >= 0 && isRevealed(posToClear)) {
                posToClear--;
            }

            if (posToClear >= 0) {
                const val = inputElement.value;
                inputElement.value = val.substring(0, posToClear) + '_' + val.substring(posToClear + 1);
                inputElement.setSelectionRange(posToClear, posToClear);
            }
            return;
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            // Find the next non-revealed position to fill
            let posToFill = cursorPosition;
            while (posToFill < term.length && isRevealed(posToFill)) {
                posToFill++;
            }

            if (posToFill < term.length) {
                const val = inputElement.value;
                inputElement.value = val.substring(0, posToFill) + e.key + val.substring(posToFill + 1);

                // Move cursor to the next available slot
                let nextPos = posToFill + 1;
                while (nextPos < term.length && isRevealed(nextPos)) {
                    nextPos++;
                }
                inputElement.setSelectionRange(nextPos, nextPos);
            }
        }

        // Allow navigation but keep it simple
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
            // Standard behavior
        } else if (e.key !== 'Enter') {
            // e.preventDefault();
        }
    }
});

playAudioBtn.addEventListener('click', () => {
    gameController.playAudio();
});

hintBtn.addEventListener('click', () => {
    gameController.handleHint();
});

// Delegate event for dynamic "Next Word" button
resultsContainer.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'next-word-btn') {
        gameController.startRound();
    }
});

console.log('Lexicon initialized. Waiting for user to start.');
