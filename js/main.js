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
    // Set level in game state
    const selectedLevel = uiManager.getSelectedLevel();
    gameState.setLevel(selectedLevel);

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
    }
});

// Robust Hint Mode Logic using state-based sync
let lastHintValue = '';

inputElement.addEventListener('input', (e) => {
    if (!inputElement.classList.contains('hint-mode')) return;

    const term = gameController.currentWord.term;
    const currentVal = inputElement.value;
    const cursor = inputElement.selectionStart;

    // Helper to check if a position is a "revealed" character (fixed)
    const isRevealed = (pos) => {
        if (pos < 0 || pos >= term.length) return true;
        return (pos === 0) ||
            (term.length > 4 && pos === term.length - 1) ||
            (term[pos] === ' ' || term[pos] === '-');
    };

    // Case 1: Length increased (Character added)
    if (currentVal.length > term.length) {
        const addedChar = currentVal[cursor - 1];
        let posToFill = cursor - 1;

        // Find the next available underscore to fill
        // If the user typed at a revealed position, move to the next underscore
        while (posToFill < term.length && isRevealed(posToFill)) {
            posToFill++;
        }

        if (posToFill < term.length) {
            const newVal = lastHintValue.substring(0, posToFill) + addedChar + lastHintValue.substring(posToFill + 1);
            inputElement.value = newVal;
            lastHintValue = newVal;

            // Move cursor to the next available slot
            let nextPos = posToFill + 1;
            while (nextPos < term.length && isRevealed(nextPos)) {
                nextPos++;
            }
            inputElement.setSelectionRange(nextPos, nextPos);
        } else {
            // No more underscores to fill, restore last value
            inputElement.value = lastHintValue;
            inputElement.setSelectionRange(lastHintValue.length, lastHintValue.length);
        }
    }
    // Case 2: Length decreased (Character deleted)
    else if (currentVal.length < term.length) {
        let posToClear = cursor; // The position where the char was removed

        // Find the previous non-revealed position to clear
        while (posToClear >= 0 && isRevealed(posToClear)) {
            posToClear--;
        }

        if (posToClear >= 0) {
            const newVal = lastHintValue.substring(0, posToClear) + '_' + lastHintValue.substring(posToClear + 1);
            inputElement.value = newVal;
            lastHintValue = newVal;
            inputElement.setSelectionRange(posToClear, posToClear);
        } else {
            // Cannot clear revealed chars, restore last value
            inputElement.value = lastHintValue;
            inputElement.setSelectionRange(cursor, cursor);
        }
    }
    // Case 3: Length is same (e.g., replacement or selection change)
    else {
        lastHintValue = currentVal;
    }
});

playAudioBtn.addEventListener('click', () => {
    gameController.playAudio();
});

hintBtn.addEventListener('click', () => {
    gameController.handleHint();
    // Initialize lastHintValue immediately after UI update
    lastHintValue = inputElement.value;
});

// Delegate event for dynamic "Next Word" button
resultsContainer.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'next-word-btn') {
        gameController.startRound();
    }
});

console.log('Lexicon initialized. Waiting for user to start.');
